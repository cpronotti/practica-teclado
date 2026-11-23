/* Práctica de teclado — Club Encuentro.
   Todo corre en el navegador. No se envía ni se guarda nada afuera:
   solo el progreso queda en localStorage de esta persona. */
(function () {
  'use strict';

  // ---------- Teclas / botonera (un solo lugar para ajustar) ----------
  // Si cambian las etiquetas físicas de la botonera, se cambian acá.
  var BOTONES = {
    tab:      { color: '#1f7a3a', nombre: 'verde' },
    shiftTab: { color: '#f2c200', nombre: 'amarillo' },
    enter:    { color: '#1d4ed8', nombre: 'azul de Enter' },
    space:    { color: '#1d4ed8', nombre: 'azul de Espacio' },
    esc:      { color: '#c62828', nombre: 'rojo' },
    back:     { color: '#ffffff', nombre: 'blanco' }
  };
  var FRASE_TECLADO = {
    tab: 'Tab', shiftTab: 'Shift + Tab', enter: 'Enter',
    space: 'la barra Espacio', esc: 'Esc', back: 'Alt + flecha izquierda'
  };
  var DIBUJO_TECLADO = {
    tab: 'Tab', shiftTab: 'Shift + Tab', enter: 'Enter',
    space: 'Espacio', esc: 'Esc', back: 'Alt + ←'
  };
  var FUNCION = {
    tab: 'siguiente', shiftTab: 'anterior', enter: 'aceptar',
    space: 'marcar', esc: 'salir', back: 'volver'
  };
  var ORDEN = ['tab', 'shiftTab', 'enter', 'space', 'esc', 'back'];
  var COINCIDE = {
    tab:      function (e) { return e.key === 'Tab' && !e.shiftKey; },
    shiftTab: function (e) { return e.key === 'Tab' && e.shiftKey; },
    enter:    function (e) { return e.key === 'Enter'; },
    space:    function (e) { return e.key === ' '; },
    esc:      function (e) { return e.key === 'Escape'; },
    back:     function (e) { return e.altKey && e.key === 'ArrowLeft'; }
  };

  // ---------- Estado guardado ----------
  var store = {
    get: function (k, def) {
      try {
        var v = localStorage.getItem('practica.' + k);
        return v === null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set: function (k, v) {
      try { localStorage.setItem('practica.' + k, JSON.stringify(v)); } catch (e) { /* sin guardado */ }
    }
  };
  var modo = store.get('modo', 'teclado');
  if (modo !== 'botonera' && modo !== 'teclado') modo = 'teclado';
  var dibujo = store.get('dibujo', true) === true;
  var progreso = store.get('progreso', {});
  var tabs = store.get('tabs', 0);

  function frase(id) {
    return modo === 'botonera' ? 'el botón ' + BOTONES[id].nombre : FRASE_TECLADO[id];
  }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  // ---------- Misiones ----------
  var MISIONES = [
    { id: 'tab', t: function () { return 'Apretá ' + frase('tab') + ' tres veces. Mirá cómo se mueve el recuadro.'; } },
    { id: 'shift', t: function () { return 'Apretá ' + frase('shiftTab') + ' una vez para volver al lugar anterior.'; } },
    { id: 'saltar', t: function () { return 'Volvé al principio de la página con ' + frase('shiftTab') + ' hasta llegar a «Saltar al contenido». Después apretá ' + frase('enter') + '.'; } },
    { id: 'detalle', t: function () { return 'Buscá un botón «Ver más sobre…» en Actividades y apretá ' + frase('enter') + ' para abrirlo.'; } },
    { id: 'casilla', t: function () { return 'En «Anotate», llegá a una actividad y marcala con ' + frase('space') + '.'; } },
    { id: 'enlace', t: function () { return 'Buscá el enlace «Ver horarios de todas las actividades» y apretá ' + frase('enter') + '.'; } },
    { id: 'volver', t: function () { return 'Volvé a la página anterior (la de inicio) con ' + frase('back') + '.'; } },
    { id: 'formulario', t: function () { return 'Completá «Anotate»: escribí tu nombre, marcá una actividad y apretá ' + frase('enter') + ' en «Anotarme».'; } }
  ];

  function misionActual() {
    for (var i = 0; i < MISIONES.length; i++) {
      if (!progreso[MISIONES[i].id]) return i;
    }
    return -1;
  }

  // ---------- Panel de ayuda (se crea con JS: no es contenido del sitio) ----------
  function el(tag, attrs, texto) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (texto) n.textContent = texto;
    return n;
  }

  var ayuda = el('section', { id: 'ayuda', 'aria-label': 'Ayuda para practicar' });
  var pMision = el('p', { 'class': 'ayuda-mision' });
  var pAviso = el('p', { 'class': 'ayuda-aviso', role: 'status' });
  var detalle = el('div', { id: 'ayuda-detalle' });
  var pDonde = el('p');
  var ulLista = el('ul');
  var divTeclas = el('div', { 'class': 'teclas', 'aria-hidden': 'true' });
  var botones = el('div', { 'class': 'ayuda-botones' });
  var btnEscuchar = el('button', { type: 'button', 'class': 'boton sec' }, 'Escuchar la ayuda');
  var btnOcultar = el('button', { type: 'button', 'class': 'boton sec', 'aria-expanded': 'true', 'aria-controls': 'ayuda-detalle' }, 'Ocultar ayuda');
  detalle.appendChild(pDonde);
  detalle.appendChild(ulLista);
  botones.appendChild(btnEscuchar);
  botones.appendChild(btnOcultar);
  ayuda.appendChild(pMision);
  ayuda.appendChild(pAviso);
  ayuda.appendChild(detalle);
  ayuda.appendChild(divTeclas);
  ayuda.appendChild(botones);
  var saltarLink = document.querySelector('a.saltar');
  // La ayuda va al final del DOM: está fija abajo en pantalla, pero con
  // Tab se llega a ella después de todo el contenido, no antes.
  document.body.appendChild(ayuda);

  var hayVoz = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  if (!hayVoz) btnEscuchar.hidden = true;

  function ajustarAlto() {
    document.documentElement.style.setProperty('--ayuda-alto', ayuda.offsetHeight + 'px');
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(ajustarAlto).observe(ayuda);
  window.addEventListener('resize', ajustarAlto);

  // ---------- Dibujo de teclas ----------
  var teclasEls = {};
  function dibujarTeclas() {
    divTeclas.textContent = '';
    teclasEls = {};
    divTeclas.hidden = !dibujo;
    ORDEN.forEach(function (id) {
      var t = el('span', { 'class': 'tecla' });
      t.style.borderTopColor = modo === 'botonera' ? BOTONES[id].color : '#111';
      var arriba = el('strong', null, modo === 'botonera' ? cap(BOTONES[id].nombre) : DIBUJO_TECLADO[id]);
      var abajo = el('span', null, modo === 'botonera' ? DIBUJO_TECLADO[id] : FUNCION[id]);
      t.appendChild(arriba);
      t.appendChild(abajo);
      divTeclas.appendChild(t);
      teclasEls[id] = t;
    });
  }

  // ---------- Qué decir según el elemento con foco ----------
  function nombreDe(n) {
    var aria = n.getAttribute('aria-label');
    if (aria) return aria;
    if (n.labels && n.labels.length) return n.labels[0].textContent.trim();
    return (n.textContent || '').trim().replace(/\s+/g, ' ');
  }
  function tipoDe(n) {
    if (n.matches && n.matches('a.saltar')) return 'saltar';
    if (n.tagName === 'A') return 'enlace';
    if (n.tagName === 'INPUT') {
      if (n.type === 'checkbox') return 'casilla';
      if (n.type === 'submit') return 'enviar';
      return 'texto';
    }
    if (n.tagName === 'BUTTON') return n.type === 'submit' ? 'enviar' : 'boton';
    if (n.tagName === 'MAIN') return 'main';
    return 'otro';
  }
  var NOMBRE_TIPO = {
    saltar: 'un enlace especial', enlace: 'un enlace', boton: 'un botón',
    casilla: 'una casilla', texto: 'un campo para escribir', enviar: 'el botón de enviar',
    main: 'el contenido principal', otro: 'un elemento'
  };
  function zonaDe(n) {
    if (n.closest('nav')) return 'el menú';
    if (n.closest('aside')) return 'el panel de práctica';
    if (n.closest('header')) return 'el encabezado';
    if (n.closest('footer')) return 'el pie de la página';
    if (n.closest('main')) return 'el contenido principal';
    return 'el principio de la página';
  }
  function lineasDe(tipo) {
    switch (tipo) {
      case 'saltar': return ['Es un enlace especial: te lleva directo a lo importante, sin pasar por el menú.', 'Apretá ' + frase('enter') + ' para saltar.'];
      case 'enlace': return ['Un enlace te lleva a otra página.', 'Apretá ' + frase('enter') + ' para abrirlo.', 'Para volver a la página anterior: ' + frase('back') + '.'];
      case 'boton': return ['Un botón hace algo en esta misma página.', 'Apretá ' + frase('enter') + ' o ' + frase('space') + '.'];
      case 'casilla': return ['Una casilla sirve para elegir.', 'Apretá ' + frase('space') + ' para marcarla o desmarcarla.'];
      case 'texto': return ['Acá se escribe. Escribí tu nombre.', 'Si no podés usar el teclado, abrí el teclado en pantalla de Windows con Windows + Control + O.', 'Cuando termines, apretá ' + frase('tab') + ' para seguir.'];
      case 'enviar': return ['Este botón envía el formulario.', 'Apretá ' + frase('enter') + '.'];
      case 'main': return ['Acá empieza lo importante de la página.'];
      default: return [];
    }
  }

  var textoVoz = '';
  function explicar(n) {
    var enAyuda = ayuda.contains(n);
    var tipo = tipoDe(n);
    var lineas = lineasDe(tipo);
    var zona = zonaDe(n);
    if (enAyuda) {
      zona = 'la ayuda';
      lineas = n === btnEscuchar
        ? ['Te lee en voz alta la ayuda del último lugar donde estuviste.', 'Apretá ' + frase('enter') + '.']
        : ['Esconde o muestra el texto de esta ayuda.', 'Apretá ' + frase('enter') + '.'];
    }
    var donde = tipo === 'main'
      ? 'Estás al principio del contenido principal.'
      : 'Estás en «' + nombreDe(n) + '»: ' + NOMBRE_TIPO[tipo] + ', en ' + zona + '.';
    var comunes = cap(frase('tab')) + ' va al siguiente. ' + cap(frase('shiftTab')) + ' vuelve al anterior.';
    pDonde.textContent = donde;
    ulLista.textContent = '';
    lineas.concat([comunes]).forEach(function (l) { ulLista.appendChild(el('li', null, l)); });
    // La voz lee siempre la ayuda del último lugar de la página, no la de sus propios botones.
    if (!enAyuda) textoVoz = [pMision.textContent, donde].concat(lineas, [comunes]).join(' ');
  }

  function textoInicial() {
    pDonde.textContent = 'Todavía no estás en ningún lugar. Apretá ' + frase('tab') + ' para empezar a recorrer la página.';
    ulLista.textContent = '';
    textoVoz = pMision.textContent + ' ' + pDonde.textContent;
  }

  // ---------- Misiones: mostrar y marcar ----------
  function mostrarMision() {
    var i = misionActual();
    if (i < 0) {
      pMision.textContent = '¡Completaste todas las misiones! Ya sabés recorrer una página con el teclado.';
    } else {
      pMision.textContent = 'Misión ' + (i + 1) + ' de ' + MISIONES.length + ': ' + MISIONES[i].t();
    }
    var lista = document.getElementById('lista-misiones');
    if (lista) {
      lista.textContent = '';
      MISIONES.forEach(function (m) {
        var li = el('li', progreso[m.id] ? { 'class': 'hecha' } : null);
        li.appendChild(el('span', { 'class': 'estado' }, progreso[m.id] ? 'Hecha' : 'Falta'));
        li.appendChild(document.createTextNode(' ' + m.t()));
        lista.appendChild(li);
      });
    }
  }

  function marcar(id) {
    if (progreso[id]) return;
    progreso[id] = true;
    store.set('progreso', progreso);
    pAviso.textContent = '¡Muy bien! Misión cumplida.';
    mostrarMision();
  }

  // ---------- Voz (solo si la persona aprieta el botón) ----------
  btnEscuchar.addEventListener('click', function () {
    if (!hayVoz) return;
    window.speechSynthesis.cancel();
    var u = new window.SpeechSynthesisUtterance(textoVoz);
    u.lang = 'es-AR';
    u.rate = 0.9;
    var voces = window.speechSynthesis.getVoices();
    for (var i = 0; i < voces.length; i++) {
      if (voces[i].lang && voces[i].lang.indexOf('es') === 0) { u.voice = voces[i]; break; }
    }
    window.speechSynthesis.speak(u);
  });

  btnOcultar.addEventListener('click', function () {
    var abierto = btnOcultar.getAttribute('aria-expanded') === 'true';
    detalle.hidden = abierto;
    divTeclas.hidden = abierto || !dibujo;
    btnOcultar.setAttribute('aria-expanded', abierto ? 'false' : 'true');
    btnOcultar.textContent = abierto ? 'Mostrar ayuda' : 'Ocultar ayuda';
  });

  // ---------- Teclado global ----------
  var apagar = {};
  document.addEventListener('keydown', function (e) {
    if (!e.repeat && e.key === 'Tab') {
      if (e.shiftKey) {
        marcar('shift');
      } else {
        tabs += 1;
        store.set('tabs', tabs);
        if (tabs >= 3) marcar('tab');
      }
    }
    ORDEN.forEach(function (id) {
      if (COINCIDE[id](e) && teclasEls[id]) {
        teclasEls[id].classList.add('on');
        clearTimeout(apagar[id]);
        apagar[id] = setTimeout(function () { teclasEls[id].classList.remove('on'); }, 800);
      }
    });
  }, true);

  document.addEventListener('keyup', function (e) {
    var t = e.target;
    if (e.key === ' ' && t && t.type === 'checkbox') marcar('casilla');
  }, true);

  document.addEventListener('focusin', function (e) {
    var n = e.target;
    if (!n || n === document) return;
    pAviso.classList.remove('error');
    pAviso.textContent = '';
    explicar(n);
  });

  // ---------- Saltar al contenido ----------
  if (saltarLink) {
    saltarLink.addEventListener('click', function (e) {
      e.preventDefault();
      var main = document.getElementById('contenido');
      if (main) main.focus();
      marcar('saltar');
    });
  }

  // ---------- Ajustes (solo en la página de inicio) ----------
  function sincronizarAjustes() {
    document.querySelectorAll('[data-modo]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-modo') === modo ? 'true' : 'false');
    });
    var bd = document.querySelector('[data-dibujo]');
    if (bd) bd.setAttribute('aria-pressed', dibujo ? 'true' : 'false');
  }
  document.querySelectorAll('[data-modo]').forEach(function (b) {
    b.addEventListener('click', function () {
      modo = b.getAttribute('data-modo');
      store.set('modo', modo);
      sincronizarAjustes();
      dibujarTeclas();
      mostrarMision();
      textoInicial();
    });
  });
  var botonDibujo = document.querySelector('[data-dibujo]');
  if (botonDibujo) botonDibujo.addEventListener('click', function () {
    dibujo = !dibujo;
    store.set('dibujo', dibujo);
    sincronizarAjustes();
    divTeclas.hidden = !dibujo;
  });
  var botonReiniciar = document.querySelector('[data-reiniciar]');
  if (botonReiniciar) botonReiniciar.addEventListener('click', function () {
    progreso = {};
    tabs = 0;
    store.set('progreso', progreso);
    store.set('tabs', tabs);
    pAviso.textContent = 'Empezaste de nuevo.';
    mostrarMision();
  });

  // ---------- Página de inicio: actividades y formulario ----------
  document.querySelectorAll('[data-detalle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var abierto = b.getAttribute('aria-expanded') === 'true';
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      b.setAttribute('aria-expanded', abierto ? 'false' : 'true');
      if (panel) panel.hidden = abierto;
      if (!abierto) marcar('detalle');
    });
  });

  var form = document.getElementById('form-anotate');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nombre = document.getElementById('nombre');
      var errNombre = document.getElementById('error-nombre');
      var errAct = document.getElementById('error-actividades');
      var msg = document.getElementById('mensaje-form');
      var elegidas = [];
      form.querySelectorAll('input[name="actividad"]:checked').forEach(function (c) { elegidas.push(c.value); });
      var valor = nombre.value.trim();

      errNombre.textContent = valor ? '' : 'Falta tu nombre. Escribilo en el campo «Tu nombre».';
      if (valor) nombre.removeAttribute('aria-invalid'); else nombre.setAttribute('aria-invalid', 'true');
      errAct.textContent = elegidas.length ? '' : 'Falta elegir una actividad. Marcá al menos una casilla.';
      msg.textContent = '';
      if (!valor || !elegidas.length) {
        // También se avisa en la ayuda de abajo, que siempre está a la vista.
        var faltas = [];
        if (!valor) faltas.push('Falta tu nombre.');
        if (!elegidas.length) faltas.push('Falta marcar una actividad.');
        pAviso.classList.add('error');
        pAviso.textContent = 'Todavía no se pudo anotar. ' + faltas.join(' ');
        return;
      }

      pAviso.classList.remove('error');
      pAviso.textContent = '';
      marcar('formulario');
      var listo = '¡Listo, ' + valor + '! Te anotaste en: ' + elegidas.join(', ') + '. (Es una práctica: no se guardó nada.)';
      msg.textContent = listo;
      pAviso.textContent = listo + (pAviso.textContent ? ' ' + pAviso.textContent : '');
    });
  }

  // ---------- Página de horarios / volver ----------
  if (document.body.getAttribute('data-pagina') === 'horarios') marcar('enlace');

  function revisarVolver() {
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    var volvio = nav && nav.type === 'back_forward';
    if (document.body.getAttribute('data-pagina') === 'inicio' && progreso.enlace && volvio) marcar('volver');
  }
  window.addEventListener('pageshow', function (e) {
    progreso = store.get('progreso', progreso);
    tabs = store.get('tabs', tabs);
    if (e.persisted && document.body.getAttribute('data-pagina') === 'inicio' && progreso.enlace) marcar('volver');
    else revisarVolver();
    mostrarMision();
  });

  // ---------- Arranque ----------
  sincronizarAjustes();
  dibujarTeclas();
  mostrarMision();
  textoInicial();
  ajustarAlto();
})();
