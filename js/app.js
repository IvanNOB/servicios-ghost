/* =====================================================================
   Servicios Ghost — Lógica de la aplicación (vanilla JS)
   Depende de las constantes definidas en js/data.js:
     WHATSAPP, NOMBRE_NEGOCIO, RESTAURANTES

   Diseño robusto para móvil:
   - DELEGACIÓN DE EVENTOS: un único listener de clic en el documento
     interpreta los atributos data-* de lo que se tocó. Así los botones
     siguen funcionando aunque el HTML se repinte, y nunca quedan "muertos".
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------- Utilidades --------------------------- */

  // Formatea pesos colombianos sin decimales: 12000 -> "$12.000"
  var pesos;
  try {
    pesos = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
  } catch (e) {
    pesos = null;
  }
  function money(n) {
    if (pesos) return pesos.format(n);
    // Respaldo por si Intl falla: "$12.000"
    return "$" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  // Precio para mostrar: si el restaurante aún no lo ha definido (0), no
  // decimos "$0" (parece gratis) sino que se confirma por WhatsApp.
  function precioTxt(n) {
    return n > 0 ? money(n) : "Precio a confirmar";
  }

  // Escapa texto para evitar inyección de HTML.
  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Iniciales del nombre de un restaurante (máx. 2 letras).
  function iniciales(nombre) {
    return String(nombre)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (w) { return w[0]; })
      .join("")
      .toUpperCase();
  }

  // Fondo (degradado del color del negocio) para cuando no hay foto de perfil.
  // Las fotos se pintan con LogoGhost (js/logo.js).
  function coverStyle(r) {
    var c = esc(r.color || "#3b82f6");
    return "background-image:linear-gradient(135deg, " + c + ", " + c + "99)";
  }

  // Promoción propia del negocio (vigente hoy).
  function promoVigente(r) { var p = r && r.promo; return !!(p && p.texto && (!p.hasta || p.hasta >= hoyISO())); }

  // Busca un restaurante por id (incluye el que se está viendo en vista previa).
  function findRest(id) {
    for (var i = 0; i < DATA.length; i++) {
      if (DATA[i].id === id) return DATA[i];
    }
    if (PREVIA && PREVIA.id === id) return PREVIA;
    return null;
  }

  // Solo se muestran en la tienda los negocios publicados (visible !== false).
  // Los ocultos están organizando su carta: se pueden ver con su enlace de vista previa.
  var TODOS = [];
  var PREVIA = null;
  // Vista previa abierta desde el panel ("👁 Ver cómo se ve"): el negocio ve su
  // carta como la ve el cliente, pero "volver" lo lleva a SU panel, no a la tienda.
  var MODO_PANEL = /[#&]previa=1/.test(location.hash) || (function () {
    try { return sessionStorage.getItem("ghost_modo_panel") === "1"; } catch (e) { return false; }
  })();
  if (MODO_PANEL) {
    try { sessionStorage.setItem("ghost_modo_panel", "1"); } catch (e) { /* sin almacenamiento */ }
    document.documentElement.classList.add("modo-panel");
  }
  function volverAlPanel() {
    try { sessionStorage.removeItem("ghost_modo_panel"); } catch (e) { /* nada */ }
    // Si la vista previa se abrió en otra pestaña desde el panel, la cerramos.
    if (window.opener && !window.opener.closed) { try { window.close(); } catch (e) { /* nada */ } }
    location.href = location.pathname.replace(/[^/]*$/, "") + "admin.html";
  }
  function cargarRestaurantes(lista) {
    TODOS = lista.slice();
    DATA = TODOS.filter(function (r) { return r.visible !== false; });
    if (PREVIA) PREVIA = TODOS.filter(function (r) { return r.id === PREVIA.id; })[0] || null;
  }

  /* --------------------------- Horarios --------------------------- */
  // Siempre con la hora de Colombia (aunque el celular tenga otra zona).

  var CLAVES_DIA = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"]; // índice = getDay()
  var NOMBRE_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  function dos(n) { return (n < 10 ? "0" : "") + n; }

  // { dia: 0-6 (0 = domingo), min: minutos desde medianoche, fecha: "YYYY-MM-DD" }
  function ahoraColombia() {
    try {
      var partes = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Bogota", weekday: "short", year: "numeric", month: "2-digit",
        day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).formatToParts(new Date());
      var v = {};
      partes.forEach(function (p) { v[p.type] = p.value; });
      var dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v.weekday);
      var hora = Number(v.hour) % 24;
      if (dia >= 0) return { dia: dia, min: hora * 60 + Number(v.minute), fecha: v.year + "-" + v.month + "-" + v.day };
    } catch (e) { /* navegador viejo: usamos la hora local */ }
    var d = new Date();
    return { dia: d.getDay(), min: d.getHours() * 60 + d.getMinutes(),
      fecha: d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate()) };
  }

  // Fecha de hoy en Colombia (YYYY-MM-DD).
  function hoyISO() { return ahoraColombia().fecha; }

  function aMin(hhmm) { var p = String(hhmm).split(":"); return Number(p[0]) * 60 + Number(p[1]); }
  function horaBonita(min) {
    min = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), m = min % 60;
    return (h % 12 || 12) + (m ? ":" + dos(m) : "") + (h < 12 ? " am" : " pm");
  }
  function tieneHorario(r) {
    var h = r && r.horario;
    if (!h) return false;
    for (var i = 0; i < CLAVES_DIA.length; i++) if (h[CLAVES_DIA[i]]) return true;
    return false;
  }

  // Estado de apertura de un restaurante en este momento:
  // { abierto: bool, texto: "Abierto" | "Cerrado", detalle: "Cierra 10 pm" ... }
  // - "abierto: false" en el panel = cerrado sin importar el horario.
  // - Sin horario configurado = abierto/cerrado según el interruptor.
  function estadoApertura(r) {
    if (!r) return { abierto: false, texto: "Cerrado", detalle: "" };
    if (!r.abierto) return { abierto: false, texto: "Cerrado", detalle: tieneHorario(r) ? "Temporalmente" : "" };
    if (!tieneHorario(r)) return { abierto: true, texto: "Abierto", detalle: "" };

    var h = r.horario, ahora = ahoraColombia(), t = ahora.min;
    var hoy = h[CLAVES_DIA[ahora.dia]];
    var ayer = h[CLAVES_DIA[(ahora.dia + 6) % 7]];

    // ¿Sigue abierto un horario de ayer que pasa la medianoche? (ej. 6 pm – 2 am)
    if (ayer && aMin(ayer.cierra) <= aMin(ayer.abre) && t < aMin(ayer.cierra)) {
      return abiertoHasta(aMin(ayer.cierra), t);
    }
    if (hoy) {
      var a = aMin(hoy.abre), c = aMin(hoy.cierra);
      if (c > a && t >= a && t < c) return abiertoHasta(c, t);
      if (c <= a && t >= a) return abiertoHasta(c + 1440, t);
      if (t < a) return { abierto: false, texto: "Cerrado", detalle: "Abre hoy " + horaBonita(a) };
    }
    for (var k = 1; k <= 7; k++) {
      var d = (ahora.dia + k) % 7, x = h[CLAVES_DIA[d]];
      if (x) {
        return { abierto: false, texto: "Cerrado",
          detalle: "Abre " + (k === 1 ? "mañana" : "el " + NOMBRE_DIA[d]) + " " + horaBonita(aMin(x.abre)) };
      }
    }
    return { abierto: false, texto: "Cerrado", detalle: "" };
  }
  function abiertoHasta(cierre, t) {
    var faltan = cierre - t;
    return { abierto: true, texto: faltan <= 30 ? "Cierra pronto" : "Abierto",
      detalle: "Hasta las " + horaBonita(cierre), pronto: faltan <= 30 };
  }
  function abiertoAhora(r) { return estadoApertura(r).abierto; }

  // Menús del día: el desayuno y el almuerzo funcionan igual (se publican a
  // diario desde el panel → pestaña "Menú del día" y se ocultan solos al día siguiente).
  var MENUS = {
    desayuno: { campo: "desayuno", titulo: "Desayuno del día", emoji: "🍳", nombre: "desayuno", plural: "Desayunos" },
    almuerzo: { campo: "almuerzo", titulo: "Almuerzo del día", emoji: "🍲", nombre: "almuerzo", plural: "Almuerzos" },
  };
  var TIPOS_MENU = ["desayuno", "almuerzo"];

  // ¿El restaurante tiene ese menú publicado para HOY?
  // Si no tiene "fecha" (datos antiguos), se considera permanente.
  function menuVigente(r, tipo) {
    var a = r && r[MENUS[tipo].campo];
    if (!a || !a.activo) return false;
    if (a.fecha && a.fecha !== hoyISO()) return false;
    return true;
  }
  function almuerzoVigente(r) { return menuVigente(r, "almuerzo"); }

  // Registro de almuerzos armados por el cliente (items dinámicos que no
  // están en la carta fija). Clave = id del item de almuerzo.
  var almuerzosArmados = {};

  // Bandera: la hoja está mostrando la pantalla de "¡Pedido enviado!".
  var _mostrandoConfirmacion = false;

  // Busca un plato dentro de un restaurante (o un almuerzo armado).
  function findItem(restId, itemId) {
    // Primero en los almuerzos armados dinámicamente.
    if (almuerzosArmados[itemId] && almuerzosArmados[itemId].restId === restId) {
      return almuerzosArmados[itemId].item;
    }
    var r = findRest(restId);
    if (!r) return null;
    for (var s = 0; s < r.carta.length; s++) {
      var items = r.carta[s].items;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === itemId) return items[i];
      }
    }
    return null;
  }

  /* ------------------------- Estado global ------------------------ */

  var LS_KEY = "ghost_cart_v1";
  // Notas del cliente para el restaurante, por producto del pedido ("sin cebolla").
  var LS_NOTAS = "ghost_notas_v1";
  var notasCart = (function () { try { return JSON.parse(localStorage.getItem(LS_NOTAS) || "{}") || {}; } catch (e) { return {}; } })();
  function notaDe(key) { return String(notasCart[key] || "").trim(); }
  function guardarNotas() {
    for (var k in notasCart) if (!cart[k] || !String(notasCart[k] || "").trim()) delete notasCart[k];
    try { localStorage.setItem(LS_NOTAS, JSON.stringify(notasCart)); } catch (e) { /* sin almacenamiento */ }
  }
  var LS_ARMADOS = "ghost_armados_v1";
  var cart = loadCart();          // { "restId::itemId": qty }
  almuerzosArmados = loadArmados();
  var filtroCategoria = "todos";
  var termino = "";
  var vistaActual = null;         // null = inicio, o id de restaurante

  // Lista de restaurantes en memoria. Se llena desde el Store al arrancar
  // (Supabase si está configurado, o data.js como respaldo).
  var DATA = [];
  cargarRestaurantes(typeof RESTAURANTES !== "undefined" ? RESTAURANTES : []);

  // Ajustes del negocio (domicilios, promociones, lo más pedido). Se llenan desde la nube.
  var AJUSTES = {};

  function loadCart() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return {};
      var data = JSON.parse(raw);
      return data && typeof data === "object" ? data : {};
    } catch (e) {
      return {};
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cart));
      guardarNotas();
      // Las combinaciones (salsa, tamaño, almuerzo armado) se guardan aparte:
      // sin ellas, al recargar la página el carrito no sabría qué eran.
      var usados = {};
      for (var k in cart) {
        var id = parseKey(k).itemId;
        if (almuerzosArmados[id]) usados[id] = almuerzosArmados[id];
      }
      localStorage.setItem(LS_ARMADOS, JSON.stringify(usados));
    } catch (e) { /* modo privado / cuota: no rompemos la app */ }
  }

  function loadArmados() {
    try {
      var data = JSON.parse(localStorage.getItem(LS_ARMADOS) || "{}");
      return data && typeof data === "object" ? data : {};
    } catch (e) {
      return {};
    }
  }

  // Quita del carrito lo que ya no existe (plato borrado de la carta, etc.)
  // para que el contador y el total nunca muestren productos "fantasma".
  function limpiarHuerfanos() {
    var cambio = false;
    for (var k in cart) {
      var p = parseKey(k);
      var r = findRest(p.restId);
      var arm = almuerzosArmados[p.itemId] && almuerzosArmados[p.itemId].item;
      var vencido = !!(arm && arm._almuerzo && !menuVigente(r, arm._menu || "almuerzo"));  // menú de otro día
      if (r && arm && arm._base) {
        // Combo (salsa, tamaño…): se rehace con los precios y agotados de HOY.
        var base = findItem(r.id, arm._base);
        var nuevo = base && !base.agotado && armable(r, base) ? armarCombo(r, base, arm._elec || [], arm._adic || []) : null;
        if (!nuevo) vencido = true;
        else if (nuevo.p !== arm.p || nuevo.n !== arm.n) { almuerzosArmados[p.itemId].item = nuevo; cambio = true; }
      }
      var plano = !arm && r ? findItem(r.id, p.itemId) : null;
      if (plano && plano.agotado) vencido = true;
      if (!r || !findItem(p.restId, p.itemId) || vencido) {
        delete cart[k];
        delete almuerzosArmados[p.itemId];
        cambio = true;
      }
    }
    if (cambio) saveCart();
  }

  function cartKey(restId, itemId) { return restId + "::" + itemId; }
  function parseKey(key) {
    var i = key.indexOf("::");
    return { restId: key.slice(0, i), itemId: key.slice(i + 2) };
  }
  function getQty(restId, itemId) { return cart[cartKey(restId, itemId)] || 0; }
  function setQty(restId, itemId, qty) {
    var key = cartKey(restId, itemId);
    if (qty <= 0) delete cart[key];
    else cart[key] = qty;
    saveCart();
  }

  // Vacía el carrito por completo (tras enviar un pedido).
  function vaciarCarrito() {
    cart = {};
    notasCart = {};
    almuerzosArmados = {};
    saveCart();
  }

  function totalProductos() {
    var t = 0;
    for (var k in cart) t += cart[k];
    return t;
  }

  function totalPesos() {
    var total = 0;
    for (var key in cart) {
      var p = parseKey(key);
      var it = findItem(p.restId, p.itemId);
      if (it) total += it.p * cart[key];
    }
    return total;
  }

  // ¿Hay en el carrito algún producto sin precio definido?
  function hayPorConfirmar() {
    for (var key in cart) {
      var p = parseKey(key);
      var it = findItem(p.restId, p.itemId);
      if (it && !(it.p > 0)) return true;
    }
    return false;
  }

  // Agrupa el carrito por restaurante (ignorando entradas huérfanas).
  function groupedCart() {
    var groups = [];
    for (var key in cart) {
      var p = parseKey(key);
      var r = findRest(p.restId);
      var it = findItem(p.restId, p.itemId);
      if (!r || !it) continue;
      var g = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].rest.id === p.restId) { g = groups[i]; break; }
      }
      if (!g) { g = { rest: r, items: [], subtotal: 0 }; groups.push(g); }
      var qty = cart[key];
      g.items.push({ item: it, qty: qty });
      g.subtotal += it.p * qty;
    }
    return groups;
  }

  /* --------------------------- Referencias ------------------------ */

  function $(sel) { return document.querySelector(sel); }

  var elChips = $("#chips");
  var elGrid = $("#gridRestaurantes");
  var elSinResultados = $("#sinResultados");
  var elBuscador = $("#buscador");
  var elVistaInicio = $("#vistaInicio");
  var elVistaCarta = $("#vistaCarta");

  var elCartBar = $("#cartBar");
  var elCartBarCount = $("#cartBarCount");
  var elCartBarProductos = $("#cartBarProductos");
  var elCartBarTotal = $("#cartBarTotal");

  var elSheet = $("#sheet");
  var elSheetBody = $("#sheetBody");

  /* ---------------------- Categorías y búsqueda ---------------------- */
  // Las categorías que escribe cada negocio son muy variadas ("Comida rápida y
  // pescados", "Café y Repostería"...). Las agrupamos en pocas y claras.
  // cat = se busca en la categoría; sec = en los nombres de las secciones de la carta.
  var GRUPOS = [
    { k: "rapida", t: "🍔 Comida rápida", cat: /rapida|hamburgues|burger/, sec: /hamburgues|perro|salchipap|burger/ },
    { k: "pizza", t: "🍕 Pizza", cat: /pizza/, sec: /pizza/ },
    { k: "parrilla", t: "🥩 Parrilla", cat: /parrill|asad/, sec: /parrill|picada|al barril/ },
    { k: "mar", t: "🐟 Pescados y mar", cat: /pescad|marisc/, sec: /pescad|marisc|camaron|de mar/ },
    { k: "china", t: "🥡 China", cat: /china|chino/, sec: /arroz chino/ },
    { k: "mexicana", t: "🌮 Mexicana", cat: /mexican/, sec: /taco|birria|quesadill|enchilad|burrito/ },
    { k: "helados", t: "🍦 Helados y postres", cat: /helad|postre|reposter/, sec: /helad|oblea|copas?$/ },
    { k: "cafe", t: "☕ Café", cat: /caf[e]|panader/, sec: /^cafes?$|capuchin|capuccin/ },
  ];
  var ESPECIALES = {
    todos: "Todos",
    abiertos: "🟢 Abiertos ahora",
    promos: "🔥 Promos",
    desayuno: "🍳 Desayunos",
    almuerzo: "🍲 Almuerzos",
  };

  function norm(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // Grupos a los que pertenece un restaurante (se calcula una vez).
  function gruposDe(r) {
    if (r._grupos) return r._grupos;
    var cat = norm(r.cat), secs = (r.carta || []).map(function (s) { return norm(s.sec); });
    r._grupos = GRUPOS.filter(function (g) {
      return g.cat.test(cat) || secs.some(function (x) { return g.sec.test(x); });
    }).map(function (g) { return g.k; });
    return r._grupos;
  }

  function cumpleFiltro(r, f) {
    if (!f || f === "todos") return true;
    if (f === "abiertos") return abiertoAhora(r);
    if (f === "promos") return promoVigente(r);
    if (f === "desayuno") return menuVigente(r, "desayuno");
    if (f === "almuerzo") return almuerzoVigente(r);
    return gruposDe(r).indexOf(f) !== -1;
  }

  function etiquetaFiltro(f) {
    if (ESPECIALES[f]) return ESPECIALES[f];
    var g = GRUPOS.filter(function (x) { return x.k === f; })[0];
    return g ? g.t : "Todos";
  }

  function categorias() {
    var cats = ["todos"];
    var abiertos = DATA.filter(abiertoAhora).length;
    if (abiertos && abiertos < DATA.length) cats.push("abiertos");
    if (DATA.some(promoVigente)) cats.push("promos");
    if (DATA.some(function (r) { return menuVigente(r, "desayuno"); })) cats.push("desayuno");
    if (DATA.some(almuerzoVigente)) cats.push("almuerzo");
    GRUPOS.forEach(function (g) {
      if (DATA.some(function (r) { return gruposDe(r).indexOf(g.k) !== -1; })) cats.push(g.k);
    });
    return cats;
  }

  function renderChips() {
    var cats = categorias();
    if (cats.indexOf(filtroCategoria) === -1) filtroCategoria = "todos";
    elChips.innerHTML = cats.map(function (k) {
      var n = k === "todos" ? 0 : DATA.filter(function (r) { return cumpleFiltro(r, k); }).length;
      return '<button type="button" class="chip" data-chip="' + esc(k) + '" aria-pressed="' + (k === filtroCategoria) + '">' +
        esc(etiquetaFiltro(k)) + (n ? ' <span class="chip__n">' + n + "</span>" : "") + "</button>";
    }).join("");
    var activo = elChips.querySelector('[aria-pressed="true"]');
    if (activo && activo.scrollIntoView && filtroCategoria !== "todos") {
      var izq = activo.offsetLeft - (elChips.clientWidth - activo.offsetWidth) / 2;
      elChips.scrollTo({ left: Math.max(0, izq), behavior: "smooth" });
    }
  }

  /* --------------------- Lista de restaurantes -------------------- */

  function matchBusqueda(r, q) {
    if (!q) return true;
    if (norm(r.nombre).indexOf(q) !== -1 || norm(r.cat).indexOf(q) !== -1) return true;
    for (var s = 0; s < r.carta.length; s++) {
      if (norm(r.carta[s].sec).indexOf(q) !== -1) return true;
      var items = r.carta[s].items;
      for (var i = 0; i < items.length; i++) {
        if (norm(items[i].n).indexOf(q) !== -1) return true;
      }
    }
    return false;
  }

  function restaurantesFiltrados() {
    var q = norm(termino.trim());
    return DATA.filter(function (r) { return cumpleFiltro(r, filtroCategoria) && matchBusqueda(r, q); });
  }

  // Platos de TODOS los restaurantes que coinciden con lo que se escribe.
  function platosQueCoinciden(q, max) {
    var out = [];
    DATA.forEach(function (r) {
      if (!cumpleFiltro(r, filtroCategoria)) return;
      (r.carta || []).forEach(function (s) {
        (s.items || []).forEach(function (it) {
          var n = norm(it.n), d = norm(it.d), sec = norm(s.sec);
          var peso = n.indexOf(q) === 0 ? 0 : n.indexOf(q) !== -1 ? 1 : sec.indexOf(q) !== -1 ? 2 : d.indexOf(q) !== -1 ? 3 : -1;
          if (peso < 0) return;
          out.push({ r: r, it: it, peso: peso + (abiertoAhora(r) ? 0 : 10) + (it.agotado ? 20 : 0) });
        });
      });
    });
    out.sort(function (a, b) { return a.peso - b.peso || (a.it.p || 0) - (b.it.p || 0); });
    return { lista: out.slice(0, max), total: out.length };
  }

  function resaltar(texto, q) {
    var t = String(texto || ""), i = norm(t).indexOf(q);
    if (!q || i < 0) return esc(t);
    return esc(t.slice(0, i)) + "<mark>" + esc(t.slice(i, i + q.length)) + "</mark>" + esc(t.slice(i + q.length));
  }

  function renderResultadosPlatos() {
    var sec = document.getElementById("resultados");
    var cont = document.getElementById("resultadosPlatos");
    if (!sec || !cont) return;
    var q = norm(termino.trim());
    if (q.length < 2) { sec.hidden = true; cont.innerHTML = ""; return; }
    var res = platosQueCoinciden(q, 24);
    sec.hidden = !res.total;
    document.getElementById("resultadosTitulo").textContent =
      "🍽️ " + res.total + (res.total === 1 ? " plato" : " platos") + " con “" + termino.trim() + "”";
    cont.innerHTML = res.lista.map(function (x) {
      var img = x.it.foto
        ? '<img class="res__img" src="' + esc(x.it.foto) + '" alt="" loading="lazy" decoding="async" />'
        : '<span class="res__img res__img--ini" style="' + coverStyle({ color: x.r.color }) + '">' + esc(iniciales(x.r.nombre)) + "</span>";
      var precio = x.it.p > 0 ? (tieneOpciones(x.it) ? "desde " : "") + money(x.it.p) : precioTxt(0);
      return '<button type="button" class="res' + (x.it.agotado || !abiertoAhora(x.r) ? " res--off" : "") + '" data-ir-rest="' + esc(x.r.id) + '" data-ir-item="' + esc(x.it.id) + '">' +
          img +
          '<span class="res__info"><span class="res__plato">' + resaltar(x.it.n, q) + "</span>" +
            '<span class="res__rest">' + esc(x.r.nombre) + (x.it.agotado ? " · Agotado" : !abiertoAhora(x.r) ? " · Cerrado" : "") + "</span></span>" +
          '<span class="res__precio">' + esc(precio) + "</span>" +
        "</button>";
    }).join("") +
      (res.total > res.lista.length ? '<p class="muted res__mas">Y ' + (res.total - res.lista.length) + " más. Escribe algo más específico para encontrarlo.</p>" : "");
  }

  // ¿El cliente está buscando o filtrando? Entonces mostramos solo resultados.
  function enModoFiltro() { return !!termino.trim() || filtroCategoria !== "todos"; }

  function actualizarVista() {
    var filtrando = enModoFiltro();
    var esMenu = filtroCategoria === "desayuno" || filtroCategoria === "almuerzo";
    // Las secciones de portada se ocultan al buscar/filtrar; al volver, cada
    // una decide si se muestra (renderPromos, renderRecomendado, renderPopulares).
    if (filtrando) document.querySelectorAll("[data-portada]").forEach(function (el) { el.hidden = true; });
    var menu = document.getElementById("almuerzos");
    // En la portada, si hoy nadie publicó desayuno ni almuerzo, no ocupa espacio.
    var sinMenus = !menusDeHoy("desayuno").length && !menusDeHoy("almuerzo").length;
    if (menu) menu.hidden = esMenu ? false : (filtrando || sinMenus);
    if (esMenu && tipoMenuDia !== filtroCategoria) { tipoMenuDia = filtroCategoria; renderMenuDia(); }
    if (!filtrando) { renderPromos(); renderRecomendado(); renderPopulares(); }
    renderChips();
    renderResultadosPlatos();
    renderGrid();
    var titulo = document.getElementById("tituloRestaurantes");
    var n = restaurantesFiltrados().length;
    if (titulo) {
      titulo.textContent = !filtrando ? "Restaurantes" :
        (termino.trim() ? n + (n === 1 ? " restaurante" : " restaurantes") + " con “" + termino.trim() + "”"
                        : etiquetaFiltro(filtroCategoria) + " · " + n);
    }
    var quitar = document.getElementById("btnQuitarFiltros");
    if (quitar) quitar.hidden = !filtrando;
    renderResumen();
  }

  function aplicarFiltro(k) {
    filtroCategoria = filtroCategoria === k && k !== "todos" ? "todos" : k;
    if (vistaActual) irAInicio();
    actualizarVista();
    if (enModoFiltro()) irAResultados();
  }
  function limpiarFiltros() {
    filtroCategoria = "todos";
    termino = "";
    elBuscador.value = "";
    var l = document.getElementById("buscadorLimpiar");
    if (l) l.hidden = true;
    actualizarVista();
  }
  // Lleva la vista a los resultados, dejando visible el buscador fijo.
  function irAResultados() {
    var destino = document.getElementById(
      termino.trim().length >= 2 && !document.getElementById("resultados").hidden ? "resultados" :
      (filtroCategoria === "desayuno" || filtroCategoria === "almuerzo") ? "almuerzos" : "restaurantes");
    var fijo = document.getElementById("buscadorFijo");
    var alto = (document.querySelector(".header") || {}).offsetHeight || 0;
    alto += fijo ? fijo.offsetHeight : 0;
    if (destino) window.scrollTo({ top: destino.getBoundingClientRect().top + window.scrollY - alto - 8, behavior: "smooth" });
  }

  // "🟢 12 de 20 abiertos ahora"
  function renderResumen() {
    var el = document.getElementById("resumenAbiertos");
    if (!el) return;
    var abiertos = DATA.filter(abiertoAhora).length;
    el.innerHTML = '<span class="resumen__dot"></span>' + abiertos + " de " + DATA.length +
      " restaurantes abiertos ahora · Cartagena del Chairá";
  }

  // Altura del encabezado (para que el buscador quede fijo justo debajo).
  function medirEncabezado() {
    var h = document.querySelector(".header");
    if (h) document.documentElement.style.setProperty("--alto-header", h.offsetHeight + "px");
  }
  window.addEventListener("resize", medirEncabezado);
  medirEncabezado();

  // Etiqueta "Abierto · Hasta las 10 pm" / "Cerrado · Abre mañana 11 am".
  function estadoHTML(r) {
    var e = estadoApertura(r);
    var clase = e.abierto ? (e.pronto ? "state--soon" : "state--open") : "state--closed";
    return '<span class="state ' + clase + '"><span class="state__dot"></span>' + esc(e.texto) +
      (e.detalle ? '<span class="state__det"> · ' + esc(e.detalle) + "</span>" : "") + "</span>";
  }

  function renderGrid() {
    // Los abiertos primero (sin cambiar el orden entre ellos).
    var lista = restaurantesFiltrados()
      .map(function (r, i) { return { r: r, i: i, a: abiertoAhora(r) ? 0 : 1 }; })
      .sort(function (x, y) { return x.a - y.a || x.i - y.i; })
      .map(function (x) { return x.r; });
    if (lista.length === 0) {
      elGrid.innerHTML = "";
      elSinResultados.hidden = false;
      return;
    }
    elSinResultados.hidden = true;

    var html = "";
    for (var i = 0; i < lista.length; i++) {
      var r = lista[i];
      // Foto de perfil tal como la acomodó el negocio (ver js/logo.js).
      var cover = r.logo
        ? LogoGhost.recuadro(r, "card__cover", { mosaico: true })
        : '<div class="card__cover">' +
          '<span class="card__initials">' + esc(iniciales(r.nombre)) + "</span></div>";

      // Mosaico compacto: logo + nombre + estado, para ver todos de un vistazo.
      var menuHoy = almuerzoVigente(r) ? "🍲" : menuVigente(r, "desayuno") ? "🍳" : "";
      html +=
        '<button type="button" class="card' + (abiertoAhora(r) ? "" : " card--cerrado") + '" data-rest="' + esc(r.id) +
        '" title="' + esc(r.nombre + " · " + r.cat + " · " + r.tiempo) + '"' +
        ' aria-label="Ver la carta de ' + esc(r.nombre) + " (" + esc(r.cat) + ')">' +
          cover +
          (promoVigente(r) ? '<span class="card__promo">🔥 ' + esc(r.promo.texto) + "</span>" : "") +
          (menuHoy ? '<span class="card__menu" aria-hidden="true">' + menuHoy + "</span>" : "") +
          '<div class="card__body">' +
            '<div class="card__name">' + esc(r.nombre) + "</div>" +
            '<div class="card__info">' + esc(r.cat) + " · " + esc(r.tiempo) + "</div>" +
            '<div class="card__meta">' + estadoHTML(r) + "</div>" +
          "</div>" +
        "</button>";
    }
    elGrid.innerHTML = html;
  }

  /* ----------------------- Carta del restaurante ------------------ */

  function abrirCarta(restId) {
    var r = findRest(restId);
    if (!r) return;
    vistaActual = restId;

    var cover = r.logo
      ? LogoGhost.recuadro(r, "rest-head__cover", { sinLazy: true })
      : '<div class="rest-head__cover" style="' + coverStyle(r) + '">' +
        '<span class="card__initials">' + esc(iniciales(r.nombre)) + "</span></div>";

    // Desayuno y almuerzo del día (si el restaurante los publicó hoy)
    var almuerzoBloque = menuHTML(r, "desayuno") + menuHTML(r, "almuerzo");

    var secciones = "", indice = "", totalPlatos = 0;
    for (var s = 0; s < r.carta.length; s++) {
      var sec = r.carta[s];
      var platos = "";
      for (var i = 0; i < sec.items.length; i++) {
        platos += dishHTML(r, sec.items[i]);
      }
      totalPlatos += sec.items.length;
      secciones +=
        '<section class="section" id="sec-' + s + '" data-sec="' + s + '">' +
          '<h3 class="section__title">' + esc(sec.sec) + ' <span class="section__n">' + sec.items.length + "</span></h3>" +
          '<div class="dishes">' + platos + "</div>" +
        "</section>";
      indice += '<button type="button" class="carta-nav__chip" data-ir-sec="' + s + '">' + esc(sec.sec) + "</button>";
    }
    // Índice fijo (secciones + buscador) solo si la carta es larga.
    var conIndice = r.carta.length > 1 || totalPlatos > 8;
    if (_buscaCarta.rest !== r.id) _buscaCarta = { rest: r.id, q: "" };
    var navCarta = !conIndice ? "" :
      '<div class="carta-nav" id="cartaNav">' +
        '<div class="carta-nav__buscar">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
          '<input type="search" id="buscaCarta" placeholder="Buscar en la carta de ' + esc(r.nombre) + '…" aria-label="Buscar en la carta" autocomplete="off" enterkeyhint="search" value="' + esc(_buscaCarta.q) + '" />' +
        "</div>" +
        (r.carta.length > 1 ? '<nav class="carta-nav__chips" id="cartaChips" aria-label="Secciones de la carta">' + indice + "</nav>" : "") +
      "</div>";
    secciones = navCarta + secciones +
      '<p class="empty" id="cartaVacia" hidden>No encontramos ese plato aquí. <button type="button" class="btn-link" data-limpiar-carta>Ver toda la carta</button></p>';

    elVistaCarta.innerHTML =
      (r.visible === false && !MODO_PANEL
        ? '<div class="previa-aviso">👁️ <strong>Vista previa.</strong> Este negocio aún no está publicado: los clientes no lo ven en la tienda. Se publica desde el panel.</div>'
        : "") +
      (MODO_PANEL
        ? '<div class="panel-aviso"><span>👁️ <strong>Vista previa de tu negocio.</strong> ' +
            (r.visible === false ? "Aún no está publicado: tus clientes todavía no lo ven. Se publica desde tu panel." : "Así lo ven tus clientes.") + "</span>" +
            '<button type="button" class="btn-primary-sm" data-volver-panel>← Volver a mi panel</button></div>'
        : '<div class="rest-nav"><button type="button" class="back-btn" data-back>← Todos los restaurantes</button>' +
          (r.visible === false ? "" : '<button type="button" class="btn-link" data-compartir="' + esc(r.id) + '">🔗 Compartir</button>') + "</div>") +
      '<div class="rest-head">' + cover +
        "<div>" +
          '<h1 class="rest-head__name">' + esc(r.nombre) + "</h1>" +
          '<p class="rest-head__desc">' + esc(r.desc) + "</p>" +
          '<div class="rest-head__meta"><span>⏱ ' + esc(r.tiempo) + "</span>" +
            estadoHTML(r) + "</div>" +
        "</div>" +
      "</div>" +
      (promoVigente(r) ? '<div class="promo-carta">🔥 <strong>' + esc(r.promo.texto) + "</strong>" + (r.promo.hasta ? ' <span class="muted">· hasta el ' + esc(r.promo.hasta.slice(8, 10) + "/" + r.promo.hasta.slice(5, 7)) + "</span>" : "") + "</div>" : "") +
      almuerzoBloque + secciones;

    elVistaInicio.hidden = true;
    elVistaCarta.hidden = false;
    window.scrollTo(0, 0);
    if (_buscaCarta.q) filtrarCarta(_buscaCarta.q);
    vigilarSecciones();
  }

  /* ---------------- Carta: buscador e índice de secciones ---------------- */
  var _buscaCarta = { rest: null, q: "" }, _obsSecciones = null;

  function filtrarCarta(q) {
    _buscaCarta.q = q;
    var t = norm(q.trim()), visibles = 0;
    elVistaCarta.querySelectorAll(".section[data-sec]").forEach(function (sec) {
      var n = 0;
      // Si escribe el nombre de la sección ("perros"), se ve toda la sección.
      var tit = sec.querySelector(".section__title");
      var todaSec = t && tit && norm(tit.firstChild ? tit.firstChild.textContent : "").indexOf(t) !== -1;
      sec.querySelectorAll("[data-dish]").forEach(function (d) {
        var nom = d.querySelector(".dish__name"), des = d.querySelector(".dish__desc");
        var ok = !t || todaSec || norm((nom ? nom.textContent : "") + " " + (des ? des.textContent : "")).indexOf(t) !== -1;
        d.hidden = !ok;
        if (ok) n++;
      });
      sec.hidden = n === 0;
      visibles += n;
    });
    var vacia = document.getElementById("cartaVacia");
    if (vacia) vacia.hidden = visibles > 0;
    var chips = document.getElementById("cartaChips");
    if (chips) chips.querySelectorAll("[data-ir-sec]").forEach(function (c) {
      var sec = document.getElementById("sec-" + c.getAttribute("data-ir-sec"));
      c.hidden = !sec || sec.hidden;
    });
  }

  function marcarSeccion(i) {
    var chips = document.getElementById("cartaChips");
    if (!chips) return;
    var activo = null;
    chips.querySelectorAll("[data-ir-sec]").forEach(function (c) {
      var on = c.getAttribute("data-ir-sec") === String(i);
      c.classList.toggle("carta-nav__chip--on", on);
      if (on) activo = c;
    });
    // Mueve la fila de secciones (solo de lado) para que se vea la actual.
    if (activo) {
      var izq = activo.offsetLeft - (chips.clientWidth - activo.offsetWidth) / 2;
      chips.scrollTo ? chips.scrollTo({ left: Math.max(0, izq), behavior: "smooth" }) : (chips.scrollLeft = izq);
    }
  }

  // Resalta en el índice la sección que el cliente está viendo.
  function vigilarSecciones() {
    if (_obsSecciones) { _obsSecciones.disconnect(); _obsSecciones = null; }
    var secs = elVistaCarta.querySelectorAll(".section[data-sec]");
    if (!secs.length || !document.getElementById("cartaChips") || !("IntersectionObserver" in window)) return;
    var arriba = (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--alto-header"), 10) || 64) + 110;
    _obsSecciones = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { if (e.isIntersecting) marcarSeccion(e.target.getAttribute("data-sec")); });
    }, { rootMargin: "-" + arriba + "px 0px -60% 0px" });
    secs.forEach(function (s) { _obsSecciones.observe(s); });
    marcarSeccion(secs[0].getAttribute("data-sec"));
  }

  function irASeccion(i) {
    var sec = document.getElementById("sec-" + i);
    if (!sec) return;
    var nav = document.getElementById("cartaNav");
    var alto = (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--alto-header"), 10) || 64) + (nav ? nav.offsetHeight : 0) + 8;
    window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - alto, behavior: "smooth" });
    marcarSeccion(i);
  }

  function dishHTML(r, it) {
    var qty = getQty(r.id, it.id);
    var agotadoClase = it.agotado ? " dish--agotado" : "";
    var etiqueta = it.agotado ? ' <span class="agotado-tag">Agotado</span>' : "";
    // Plato con opciones a elegir (ej. salsa de las alitas) o con adiciones.
    if (armable(r, it) && !it.agotado && abiertoAhora(r)) {
      // "desde $X" si algún grupo cambia el precio (hay tamaños/variantes).
      var variaPrecio = (it.opciones || []).some(grupoTienePrecios);
      var precioMostrar = it.p > 0 ? (variaPrecio ? "desde " : "") + money(it.p) : precioTxt(0);
      return (
        '<div class="dish dish--opciones' + (it.foto ? ' dish--foto' : '') + '" data-dish data-rest="' + esc(r.id) + '" data-item="' + esc(it.id) + '">' +
          fotoHTML(it) +
          '<div class="dish__info">' +
            msgHTML(it) +
            '<div class="dish__name">' + esc(it.n) + "</div>" +
            (it.d ? '<div class="dish__desc">' + esc(it.d) + "</div>" : "") +
            '<div class="dish__price">' + esc(precioMostrar) + "</div>" +
          "</div>" +
          opcionesPlatoHTML(r, it) +
        "</div>"
      );
    }
    return (
      '<div class="dish' + agotadoClase + (it.foto ? ' dish--foto' : '') + '" data-dish data-rest="' + esc(r.id) + '" data-item="' + esc(it.id) + '">' +
        fotoHTML(it) +
        '<div class="dish__info">' +
          msgHTML(it) +
          '<div class="dish__name">' + esc(it.n) + etiqueta + "</div>" +
          (it.d ? '<div class="dish__desc">' + esc(it.d) + "</div>" : "") +
        "</div>" +
        '<div class="dish__pie">' +
          '<div class="dish__price' + (it.p > 0 ? "" : " dish__price--confirmar") + '">' + esc((it.p > 0 && tieneOpciones(it) ? "desde " : "") + precioTxt(it.p)) + "</div>" +
          '<div class="dish__action">' + controlHTML(r, it, qty) + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  // Mensaje del negocio en el producto (solo si decidió mostrarlo).
  function msgHTML(it) {
    var m = it && it.msg;
    if (!m || m.mostrar === false || !String(m.texto || "").trim()) return "";
    return '<span class="dish__msg">' + esc(String(m.texto).trim()) + "</span>";
  }

  // Foto del plato (si la subieron en el panel). Carga diferida: no gasta datos
  // hasta que el cliente baja hasta ese plato.
  function fotoHTML(it) {
    if (!it.foto) return "";
    return '<img class="dish__foto" src="' + esc(it.foto) + '" alt="' + esc(it.n) + '" loading="lazy" decoding="async" width="96" height="96" data-foto-ver title="Ver foto" />';
  }

  // ¿El plato ofrece opciones a elegir (grupos tipo salsa)?
  function tieneOpciones(it) {
    return Array.isArray(it.opciones) && it.opciones.length > 0;
  }

  // Adiciones de la sección donde está el plato (queso extra, tocineta…).
  function adicionesDe(r, it, conAgotadas) {
    var carta = (r && r.carta) || [];
    for (var s = 0; s < carta.length; s++) {
      var items = carta[s].items || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === it.id) {
          return (carta[s].adiciones || []).filter(function (a) { return a && a.n && (conAgotadas || !a.agotado); });
        }
      }
    }
    return [];
  }
  // ¿El cliente arma el plato antes de agregarlo (opciones o adiciones)?
  function armable(r, it) { return tieneOpciones(it) || adicionesDe(r, it).length > 0; }

  // ¿Alguna opción de este grupo cambia el precio del plato?
  function grupoTienePrecios(g) {
    return (g.opciones || []).some(function (op) { return Number(op.precio) > 0; });
  }

  // Selector de opciones + botón "Agregar" para un plato (ej. salsa o tamaño).
  function opcionesPlatoHTML(r, it) {
    var html = '<div class="dish-opc" data-rest="' + esc(r.id) + '" data-item="' + esc(it.id) + '">';
    var gruposOpc = it.opciones || [];
    for (var gi = 0; gi < gruposOpc.length; gi++) {
      var g = gruposOpc[gi];
      var ops = Array.isArray(g.opciones) ? g.opciones : [];
      // Si el grupo cambia el precio, mostramos el PRECIO TOTAL de cada opción
      // (base + extra); si no, solo el nombre (ej. salsa, proteína).
      var conPrecio = grupoTienePrecios(g);
      html += '<label class="dish-opc__label">' + esc(g.nombre || "Opción") + "</label>" +
              '<select class="dish-opc__select" data-opc="' + gi + '">';
      for (var oi = 0; oi < ops.length; oi++) {
        var op = ops[oi];
        if (op.agotado) continue;
        var etq = conPrecio ? " — " + money(it.p + (Number(op.precio) || 0)) : "";
        html += '<option value="' + esc(op.n) + '">' + esc(op.n) + etq + "</option>";
      }
      html += "</select>";
    }
    // Adiciones (opcionales, se pueden marcar varias): cada una suma su precio.
    var adic = adicionesDe(r, it);
    if (adic.length) {
      html += '<details class="dish-adic" data-adic-box>' +
        '<summary>➕ Agregar adiciones <span class="dish-adic__n" data-adic-n></span></summary>' +
        '<div class="dish-adic__lista">' +
        adic.map(function (a) {
          return '<label class="dish-adic__op"><input type="checkbox" data-adic value="' + esc(a.n) + '" data-precio="' + (Number(a.precio) || 0) + '" />' +
            "<span>" + esc(a.n) + "</span>" +
            '<span class="dish-adic__precio">' + (a.precio > 0 ? "+ " + esc(money(a.precio)) : "Gratis") + "</span></label>";
        }).join("") +
        "</div></details>";
    }
    html += '<button type="button" class="add-btn dish-opc__add" data-opc-add ' +
      'data-rest="' + esc(r.id) + '" data-item="' + esc(it.id) + '">Agregar</button>';
    return html + "</div>";
  }

  // Construye la línea "plato + opciones elegidas" con el precio ACTUAL.
  // elecciones = valor elegido por cada grupo (en orden). Devuelve null si
  // alguna opción ya no existe o está agotada (ej. al repetir un pedido viejo).
  function armarCombo(r, it, elecciones, adiciones) {
    var extra = 0, valores = [], grupos = it.opciones || [];
    for (var gi = 0; gi < grupos.length; gi++) {
      var g = grupos[gi] || {}, val = elecciones[gi];
      var op = (g.opciones || []).filter(function (o) { return o.n === val && !o.agotado; })[0];
      if (!op) return null;
      extra += Number(op.precio) || 0;
      valores.push(val);
    }
    // Adiciones elegidas (con el precio de HOY; si alguna ya no está, no se arma).
    var disponibles = adicionesDe(r, it), elegidas = [];
    var pedidas = Array.isArray(adiciones) ? adiciones : [];
    for (var ai = 0; ai < pedidas.length; ai++) {
      var ad = disponibles.filter(function (a) { return a.n === pedidas[ai]; })[0];
      if (!ad) return null;
      extra += Number(ad.precio) || 0;
      elegidas.push(ad.n);
    }
    var sufijo = valores.join(", ");
    var conAdic = elegidas.length ? " + " + elegidas.join(" + ") : "";
    // id único por combinación: así "4 alitas BBQ" y "4 alitas Maracuyá" no se mezclan.
    return {
      id: it.id + "--" + slug(sufijo + (elegidas.length ? " mas " + elegidas.join(" ") : "")),
      n: it.n + (sufijo ? " (" + sufijo + ")" : "") + conAdic,
      d: it.d || "",
      p: it.p + extra,
      _combo: true,
      _base: it.id,
      _elec: valores,
      _adic: elegidas,
    };
  }

  // Lee las opciones elegidas de un plato y lo agrega al carrito como línea única.
  function agregarPlatoConOpciones(restId, itemId) {
    var r = findRest(restId);
    var it = r ? findItem(restId, itemId) : null;
    if (!r || !it || !armable(r, it)) return;
    var cont = elVistaCarta.querySelector('.dish-opc[data-item="' + cssId(itemId) + '"]');
    if (!cont) return;

    var elecciones = [];
    cont.querySelectorAll("[data-opc]").forEach(function (sel) {
      elecciones[Number(sel.getAttribute("data-opc"))] = sel.value;
    });
    var adic = [].map.call(cont.querySelectorAll("[data-adic]:checked"), function (c) { return c.value; });
    if (!tieneOpciones(it) && !adic.length) {
      // Sin opciones ni adiciones marcadas: el plato tal cual.
      setQty(r.id, it.id, getQty(r.id, it.id) + 1);
    } else {
      var combo = armarCombo(r, it, elecciones, adic);
      if (!combo) return;
      almuerzosArmados[combo.id] = { restId: r.id, item: combo };
      setQty(r.id, combo.id, getQty(r.id, combo.id) + 1);
    }
    refreshCart();
    repintarPlato(r.id, it.id);
    // Listo para el siguiente: sin adiciones marcadas.
    cont.querySelectorAll("[data-adic]:checked").forEach(function (c) { c.checked = false; });
    var caja = cont.querySelector("[data-adic-box]");
    if (caja) caja.open = false;
    actualizarTotalPlato(cont);

    // Feedback breve en el botón.
    var btn = cont.querySelector("[data-opc-add]");
    if (btn) {
      var antes = btn.textContent;
      btn.textContent = "¡Agregado! ✓";
      btn.classList.add("add-btn--ok");
      setTimeout(function () { btn.textContent = antes; btn.classList.remove("add-btn--ok"); }, 1200);
    }
  }

  // Muestra en el botón el total con las adiciones marcadas ("Agregar · $14.000").
  function actualizarTotalPlato(cont) {
    if (!cont) return;
    var r = findRest(cont.getAttribute("data-rest"));
    var it = r ? findItem(r.id, cont.getAttribute("data-item")) : null;
    var btn = cont.querySelector("[data-opc-add]");
    if (!it || !btn) return;
    var marcadas = cont.querySelectorAll("[data-adic]:checked");
    var n = cont.querySelector("[data-adic-n]");
    if (n) n.textContent = marcadas.length ? "(" + marcadas.length + ")" : "";
    if (!marcadas.length) { btn.textContent = "Agregar"; return; }
    var total = it.p;
    cont.querySelectorAll("[data-opc]").forEach(function (sel) {
      var g = (it.opciones || [])[Number(sel.getAttribute("data-opc"))] || {};
      var op = (g.opciones || []).filter(function (o) { return o.n === sel.value; })[0];
      total += op ? Number(op.precio) || 0 : 0;
    });
    marcadas.forEach(function (c) { total += Number(c.getAttribute("data-precio")) || 0; });
    btn.textContent = "Agregar · " + money(total);
  }
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.hasAttribute("data-adic") || t.hasAttribute("data-opc")) actualizarTotalPlato(t.closest(".dish-opc"));
  });

  // slug sencillo para construir ids de combinación.
  function slug(txt) {
    return String(txt).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x";
  }

  // Los botones llevan data-* con el restaurante y el plato, para que la
  // delegación de eventos sepa a qué actuar sin necesidad de re-enganchar.
  function controlHTML(r, it, qty) {
    if (!abiertoAhora(r)) {
      return '<button type="button" class="add-btn" disabled>Agregar</button>';
    }
    if (it.agotado) {
      return '<button type="button" class="add-btn" disabled>Agotado</button>';
    }
    if (qty <= 0) {
      return '<button type="button" class="add-btn" data-add data-rest="' + esc(r.id) +
             '" data-item="' + esc(it.id) + '" aria-label="Agregar ' + esc(it.n) + '">Agregar</button>';
    }
    return stepperHTML(r.id, it, qty);
  }

  function stepperHTML(restId, it, qty) {
    return (
      '<div class="stepper">' +
        '<button type="button" class="stepper__btn" data-dec data-rest="' + esc(restId) +
          '" data-item="' + esc(it.id) + '" aria-label="Quitar uno de ' + esc(it.n) + '">−</button>' +
        '<span class="stepper__qty">' + qty + "</span>" +
        '<button type="button" class="stepper__btn" data-inc data-rest="' + esc(restId) +
          '" data-item="' + esc(it.id) + '" aria-label="Agregar uno de ' + esc(it.n) + '">+</button>' +
      "</div>"
    );
  }

  /* ------------------ Menú del día (desayuno / almuerzo) ------------------ */
  // El mismo armador sirve en la carta del restaurante y en la ventana que se
  // abre desde "Menú del día" del inicio. Todo se lee desde la caja
  // [data-menu-box] (restaurante + tipo), así pueden convivir varias.

  var _cajaN = 0;

  function menuHTML(r, tipo, enVentana) {
    if (!menuVigente(r, tipo)) return "";
    var M = MENUS[tipo], a = r[M.campo];
    var caja = "m" + (++_cajaN);
    // Puede no tener grupos: un menú fijo ("lo que hay hoy") con su precio.
    var grupos = Array.isArray(a.grupos) ? a.grupos : [];

    var gruposHTML = "";
    for (var gi = 0; gi < grupos.length; gi++) {
      var g = grupos[gi];
      var ops = Array.isArray(g.opciones) ? g.opciones : [];
      var multiple = g.tipo === "multiple";
      var obligatorio = grupoMenuObligatorio(g);
      var opsHTML = "";
      for (var oi = 0; oi < ops.length; oi++) {
        var op = ops[oi];
        var agot = !!op.agotado;
        var etqPrecio = (typeof op.precio === "number" && op.precio > 0)
          ? ' <span class="alm-op__precio">' + esc(money(op.precio)) + "</span>" : "";
        opsHTML +=
          '<label class="alm-op' + (agot ? " alm-op--agotado" : "") + '">' +
            '<input type="' + (multiple ? "checkbox" : "radio") + '" name="' + caja + "-g" + gi + '" ' +
              'value="' + esc(op.n) + '"' + (agot ? " disabled" : "") + " />" +
            "<span>" + esc(op.n) + (agot ? " (agotado)" : "") + etqPrecio + "</span>" +
          "</label>";
      }
      // Visibilidad condicional: el grupo puede depender de otra elección.
      var condAttr = "", ocultoInicial = "";
      if (g.mostrarSi && g.mostrarSi.grupo && g.mostrarSi.valor) {
        condAttr = ' data-mostrar-si-grupo="' + esc(g.mostrarSi.grupo) + '"' +
          ' data-mostrar-si-valor="' + esc(g.mostrarSi.valor) + '"';
        ocultoInicial = " hidden";
      }
      gruposHTML +=
        '<div class="alm-grupo" data-alm-grupo="' + gi + '" data-tipo="' + (multiple ? "multiple" : "unico") + '"' +
          condAttr + ocultoInicial + ">" +
          '<div class="alm-grupo__nombre">' + esc(g.nombre) +
            (obligatorio ? ' <span class="muted">(elige 1)</span>'
              : ' <span class="muted">(' + (multiple ? "los que quieras" : "elige 1") + " o ninguno)</span>") +
          "</div>" +
          '<div class="alm-ops">' + opsHTML + "</div>" +
        "</div>";
    }

    var abierto = abiertoAhora(r);
    return (
      '<div class="almuerzo' + (enVentana ? " almuerzo--ventana" : "") + '" data-menu-box data-rest="' + esc(r.id) + '" data-tipo="' + tipo + '">' +
        (a.foto ? '<img class="almuerzo__foto" src="' + esc(a.foto) + '" alt="' + esc(a.titulo || M.titulo) + '" loading="lazy" decoding="async" data-foto-ver data-foto-titulo="' + esc(a.titulo || M.titulo) + '" />' : "") +
        '<div class="almuerzo__head">' +
          '<h3 class="section__title">' + M.emoji + " " + esc(a.titulo || M.titulo) + "</h3>" +
          (a.precio ? '<span class="almuerzo__precio">' + esc(money(a.precio)) + "</span>" : "") +
        "</div>" +
        (enVentana ? '<p class="muted almuerzo__rest">' + esc(r.nombre) + " · " + estadoHTML(r) + "</p>" : "") +
        (a.desc ? '<p class="almuerzo__desc">' + esc(a.desc) + "</p>" : "") +
        (grupos.some(function (g) { return !grupoMenuObligatorio(g); })
          ? '<p class="almuerzo__nota">💡 ¿No quieres algo? Déjalo sin marcar y no te lo llevamos.</p>' : "") +
        gruposHTML +
        '<button type="button" class="add-btn almuerzo__btn" data-menu-add' + (abierto ? "" : " disabled") + ">" +
          (abierto ? "Agregar " + M.nombre : "Cerrado") +
        "</button>" +
        '<p class="almuerzo__error" data-menu-msg role="alert"></p>' +
      "</div>"
    );
  }

  // ¿Hay que escoger sí o sí en este grupo? Solo si define el precio, o si el
  // restaurante lo marcó como obligatorio. Lo demás el cliente lo puede dejar.
  function grupoMenuObligatorio(g) {
    if (!g) return false;
    if (g.obligatorio) return true;
    return (g.opciones || []).some(function (o) { return typeof o.precio === "number" && o.precio > 0; });
  }

  // Muestra/oculta los grupos condicionales según lo elegido.
  // Ej: el grupo "Sopa" solo se ve si en "Opción" se eligió "Completo (con sopa)".
  function actualizarVisibilidadMenu(box) {
    if (!box) return;
    var r = findRest(box.getAttribute("data-rest"));
    var a = r && r[MENUS[box.getAttribute("data-tipo")].campo];
    var grupos = a && a.grupos ? a.grupos : [];
    var valoresPorGrupo = {};
    box.querySelectorAll("[data-alm-grupo]").forEach(function (gEl) {
      var def = grupos[Number(gEl.getAttribute("data-alm-grupo"))] || {};
      var marcado = gEl.querySelector("input:checked");
      if (marcado) valoresPorGrupo[def.nombre] = marcado.value;
    });
    box.querySelectorAll("[data-mostrar-si-grupo]").forEach(function (gEl) {
      var cumple = valoresPorGrupo[gEl.getAttribute("data-mostrar-si-grupo")] === gEl.getAttribute("data-mostrar-si-valor");
      gEl.hidden = !cumple;
      // Si se oculta, desmarcamos sus opciones para no arrastrar elecciones viejas.
      if (!cumple) gEl.querySelectorAll("input:checked").forEach(function (c) { c.checked = false; });
    });
  }

  // Lee lo escogido y agrega el desayuno/almuerzo armado al carrito.
  function agregarMenu(box) {
    if (!box) return false;
    var tipo = box.getAttribute("data-tipo"), M = MENUS[tipo];
    var r = findRest(box.getAttribute("data-rest"));
    if (!r || !menuVigente(r, tipo) || !abiertoAhora(r)) return false;
    var a = r[M.campo];
    var err = box.querySelector("[data-menu-msg]");
    var grupos = a.grupos || [];
    var elecciones = [], faltan = [];
    var precioOpcion = null; // si alguna opción define precio, manda sobre el base

    var gruposEl = box.querySelectorAll("[data-alm-grupo]");
    for (var i = 0; i < gruposEl.length; i++) {
      var gEl = gruposEl[i];
      if (gEl.hidden) continue; // grupo condicional que no aplica
      var def = grupos[Number(gEl.getAttribute("data-alm-grupo"))] || {};
      var defOps = Array.isArray(def.opciones) ? def.opciones : [];
      var marcados = gEl.querySelectorAll("input:checked");
      if (!marcados.length) {
        // Lo que el cliente deja sin marcar NO se le lleva ("Sin principio").
        // Solo es obligatorio lo que define el precio (ej. Menú o Especial).
        if (grupoMenuObligatorio(def)) faltan.push(def.nombre || "una opción");
        else elecciones.push({ grupo: def.nombre, valores: [], sin: true });
        continue;
      }
      var vals = [];
      for (var m = 0; m < marcados.length; m++) {
        var val = marcados[m].value;
        vals.push(val);
        for (var d = 0; d < defOps.length; d++) {
          if (defOps[d].n === val && typeof defOps[d].precio === "number" && defOps[d].precio > 0) precioOpcion = defOps[d].precio;
        }
      }
      elecciones.push({ grupo: def.nombre, valores: vals });
    }

    if (faltan.length) {
      if (err) { err.classList.remove("almuerzo__error--ok"); err.textContent = "Falta escoger: " + faltan.join(", ") + "."; }
      return false;
    }
    if (err) err.textContent = "";

    var resumen = elecciones.map(function (e) {
      return e.sin ? "Sin " + String(e.grupo || "").toLowerCase() : e.valores.join(", ");
    }).join(" · ");
    var item = {
      id: tipo + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      n: (a.titulo || M.titulo) + (resumen ? " (" + resumen + ")" : ""),
      d: "",
      p: precioOpcion != null ? precioOpcion : (a.precio || 0),
      _almuerzo: true,   // "menú del día": vence al terminar el día
      _menu: tipo,
    };
    almuerzosArmados[item.id] = { restId: r.id, item: item };
    setQty(r.id, item.id, 1);
    refreshCart();

    if (err) { err.textContent = "¡" + M.nombre.charAt(0).toUpperCase() + M.nombre.slice(1) + " agregado! ✓"; err.classList.add("almuerzo__error--ok"); }
    box.querySelectorAll("input:checked").forEach(function (c) { c.checked = false; });
    actualizarVisibilidadMenu(box);
    return true;
  }

  /* ---------- Ventana para armar el menú desde el inicio ---------- */
  var elMenuSheet = document.getElementById("menuSheet");
  var elMenuBody = document.getElementById("menuBody");

  function abrirMenuVentana(restId, tipo) {
    var r = findRest(restId);
    if (!r || !elMenuSheet || !menuVigente(r, tipo)) { if (r) abrirCarta(restId); return; }
    var M = MENUS[tipo];
    document.getElementById("menuTitle").textContent = M.emoji + " Arma tu " + M.nombre;
    elMenuBody.innerHTML = menuHTML(r, tipo, true) +
      '<button type="button" class="btn-link menu-ver-carta" data-menu-carta="' + esc(r.id) + '">Ver la carta completa de ' + esc(r.nombre) + " →</button>";
    elMenuSheet.hidden = false;
    document.body.classList.add("no-scroll");
    elMenuBody.scrollTop = 0;
  }
  function cerrarMenuVentana() {
    if (!elMenuSheet || elMenuSheet.hidden) return;
    elMenuSheet.hidden = true;
    elMenuBody.innerHTML = "";
    if (elSheet.hidden && (!elTrack || elTrack.hidden)) document.body.classList.remove("no-scroll");
  }

  function irAInicio() {
    vistaActual = null;
    PREVIA = null;
    if (_obsSecciones) { _obsSecciones.disconnect(); _obsSecciones = null; }
    if (/^#r=/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
    elVistaCarta.hidden = true;
    elVistaCarta.innerHTML = "";
    elVistaInicio.hidden = false;
    window.scrollTo(0, 0);
  }

  /* --------------------------- Barra carrito ---------------------- */

  function refreshCart() {
    var n = totalProductos();
    if (n <= 0) {
      elCartBar.hidden = true;
    } else {
      elCartBar.hidden = false;
      elCartBarCount.textContent = String(n);
      elCartBarProductos.textContent = n === 1 ? "1 producto" : n + " productos";
      elCartBarTotal.textContent = money(totalPesos());
    }
    actualizarFab();
    // No repintar si la hoja está mostrando la confirmación de envío.
    if (!elSheet.hidden && !_mostrandoConfirmacion) renderSheet();
  }

  // Tras cambiar una cantidad, repinta SOLO el control del plato afectado,
  // tanto en la carta como en la lista del carrito. Como usamos delegación,
  // no hay que re-enganchar eventos: basta con cambiar el HTML.
  function repintarPlato(restId, itemId) {
    var r = findRest(restId);
    var it = findItem(restId, itemId);
    if (!r || !it) return;
    var qty = getQty(restId, itemId);

    // En la carta
    var nodo = elVistaCarta.querySelector('[data-dish][data-item="' + cssId(itemId) + '"]');
    if (nodo) {
      var slot = nodo.querySelector(".dish__action");
      if (slot) slot.innerHTML = controlHTML(r, it, qty);
      // Platos con opciones no tienen stepper propio; su selector no se toca.
    }
  }

  // Escapa un id para usarlo dentro de un selector CSS (sin depender de CSS.escape).
  function cssId(id) {
    return String(id).replace(/["\\]/g, "\\$&");
  }

  /* ----------------------- Hoja inferior (sheet) ------------------ */

  function openSheet() {
    if (totalProductos() <= 0) return;
    try { renderSheet(); } catch (e) {
      elSheetBody.innerHTML =
        '<p class="cart-empty">Hubo un problema al mostrar el pedido. Toca la X para cerrar.</p>';
    }
    elSheet.hidden = false;
    document.body.classList.add("no-scroll");
  }

  function closeSheet() {
    elSheet.hidden = true;
    document.body.classList.remove("no-scroll");
    _mostrandoConfirmacion = false;
  }

  /* ---------------------- Datos guardados del cliente ------------------- */
  var LS_CLIENTE = "ghost_cliente_v1";     // nombre, teléfono, dirección, barrio
  var LS_ULTIMO = "ghost_ultimo_v1";       // último pedido (para "repetir")
  var LS_MIS_PEDIDOS = "ghost_mis_pedidos_v1"; // códigos recientes (seguimiento)

  function leerLS(clave, defecto) {
    try { var v = JSON.parse(localStorage.getItem(clave)); return v == null ? defecto : v; }
    catch (e) { return defecto; }
  }
  function escribirLS(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin espacio */ }
  }

  /* ------------------------ Domicilio por barrio ------------------------ */
  // Lista configurada en el panel (Ajustes → Domicilios). Vacía = el
  // domicilio se confirma por WhatsApp, como siempre.
  function barriosDomicilio() {
    var d = AJUSTES.domicilios;
    return d && Array.isArray(d.barrios) ? d.barrios.filter(function (b) { return b && b.n; }) : [];
  }
  var BARRIO_OTRO = "__otro__";
  function tarifaBarrio(nombre) {
    var lista = barriosDomicilio();
    for (var i = 0; i < lista.length; i++) if (lista[i].n === nombre) return Number(lista[i].p) || 0;
    return null; // no está en la lista: se confirma
  }

  // Código del pedido que se está armando (el mismo para copiar y enviar).
  var codigoActual = null;
  function codigoPedido() {
    if (!codigoActual) {
      codigoActual = window.Store && window.Store.nuevoCodigo
        ? window.Store.nuevoCodigo()
        : "GH-" + Date.now().toString(36).toUpperCase().slice(-6);
    }
    return codigoActual;
  }
  function urlSeguimiento(codigo) {
    return location.origin + location.pathname + "#pedido=" + encodeURIComponent(codigo);
  }

  // Pantalla de confirmación tras enviar el pedido (dentro de la hoja).
  function mostrarConfirmacion(destinos, codigo) {
    _mostrandoConfirmacion = true;
    if (typeof destinos === "string") destinos = [{ url: destinos, nombre: NOMBRE_NEGOCIO, esGhost: true }];
    var varios = destinos.length > 1;
    var nombreUno = destinos[0].esGhost ? "nosotros" : destinos[0].nombre;
    var botones = destinos.map(function (d, i) {
      return '<a class="btn-whatsapp' + (i === 0 ? " btn-whatsapp--enviado" : "") + '" href="' + esc(d.url) + '" target="_blank" rel="noopener" data-wa-destino>' +
        (varios ? (i + 1) + ". " : "") + "Enviar a " + esc(d.esGhost ? NOMBRE_NEGOCIO : d.nombre) +
        '<span class="btn-whatsapp__ok" aria-hidden="true">' + (i === 0 ? " ✓" : "") + "</span></a>";
    }).join("");
    elSheetBody.innerHTML =
      '<div class="confirm">' +
        '<div class="confirm__ico" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>' +
        "</div>" +
        '<h3 class="confirm__title">¡Pedido enviado!</h3>' +
        (varios
          ? '<p class="confirm__text">Tu pedido es de varios lugares: <strong>envía un mensaje a cada uno</strong>. ' +
              "Ya abrimos el primero; cuando lo envíes, vuelve aquí y toca el siguiente.</p>"
          : '<p class="confirm__text">Abrimos WhatsApp para que confirmes tu pedido con ' + esc(nombreUno) + ". " +
              "Si no se abrió, toca el botón de abajo.</p>") +
        '<div class="confirm__codigo">Tu código: <strong>' + esc(codigo) + "</strong></div>" +
        '<div class="confirm__wa">' + botones + "</div>" +
        '<button type="button" class="btn-copy" data-track-open="' + esc(codigo) + '">📦 Seguir mi pedido</button>' +
        '<button type="button" class="btn-link" data-sheet-close>Seguir viendo</button>' +
      "</div>";
  }

  function avisosCerrados(groups) {
    var cerrados = groups.filter(function (g) { return !abiertoAhora(g.rest); });
    if (!cerrados.length) return "";
    return '<p class="cart-warn">⏰ ' + esc(cerrados.map(function (g) { return g.rest.nombre; }).join(", ")) +
      (cerrados.length === 1 ? " está cerrado" : " están cerrados") +
      " en este momento. Puedes enviar el pedido y te confirmamos por WhatsApp.</p>";
  }

  function campoBarrioHTML(guardado) {
    var lista = barriosDomicilio();
    if (!lista.length) {
      return '<div class="field">' +
          '<label class="field__label" for="fBarrio">Barrio / zona (opcional)</label>' +
          '<input class="field__input" id="fBarrio" name="barrio" type="text" placeholder="Ej: Centro, El Progreso…" value="' + esc(guardado || "") + '" />' +
        "</div>";
    }
    var opciones = '<option value="">Elige tu barrio…</option>';
    var encontrado = false;
    lista.forEach(function (b) {
      var sel = b.n === guardado; if (sel) encontrado = true;
      opciones += '<option value="' + esc(b.n) + '"' + (sel ? " selected" : "") + ">" + esc(b.n) +
        " — " + esc(Number(b.p) > 0 ? money(Number(b.p)) : "gratis") + "</option>";
    });
    var otro = guardado && !encontrado;
    opciones += '<option value="' + BARRIO_OTRO + '"' + (otro ? " selected" : "") + ">Otro barrio / vereda (se confirma)</option>";
    return '<div class="field">' +
        '<label class="field__label" for="fBarrio">Barrio</label>' +
        '<select class="field__input field__select" id="fBarrio" name="barrio">' + opciones + "</select>" +
        '<input class="field__input" id="fBarrioOtro" name="barrio_otro" type="text" placeholder="Escribe tu barrio o vereda"' +
          (otro ? ' value="' + esc(guardado) + '"' : " hidden") + " />" +
      "</div>";
  }

  // Lee el formulario en un objeto (lo usan el envío, el copiado y la nube).
  function leerFormulario(form) {
    var data = new FormData(form);
    function v(k) { return (data.get(k) || "").toString().trim(); }
    var barrio = v("barrio");
    if (barrio === BARRIO_OTRO) barrio = v("barrio_otro");
    var tarifa = barrio ? tarifaBarrio(barrio) : null;
    return {
      nombre: v("nombre"), telefono: v("telefono"), direccion: v("direccion"), barrio: barrio,
      pago: v("pago") || "Efectivo", notas: v("notas"),
      domicilio: tarifa, // número, o null si se confirma por WhatsApp
    };
  }

  function resumenTotalesHTML(datos) {
    var productos = totalPesos();
    var html = '<div class="cart-total"><span>Productos</span><span>' + esc(money(productos)) + "</span></div>";
    if (!barriosDomicilio().length) {
      return html + '<p class="cart-note">Domicilio: se confirma por WhatsApp.</p>';
    }
    if (datos && datos.domicilio != null) {
      html += '<div class="cart-total cart-total--sub"><span>Domicilio (' + esc(datos.barrio) + ")</span><span>" +
        esc(datos.domicilio > 0 ? money(datos.domicilio) : "Gratis") + "</span></div>" +
        '<div class="cart-total cart-total--grande"><span>Total a pagar</span><span>' +
        esc(money(productos + datos.domicilio) + (hayPorConfirmar() ? " + por confirmar" : "")) + "</span></div>";
      if (groupedCart().length > 1) html += '<p class="cart-note">Pides de varios restaurantes: el domicilio puede variar, te confirmamos por WhatsApp.</p>';
    } else {
      html += '<p class="cart-note">' + (datos && datos.barrio
        ? "Domicilio a " + esc(datos.barrio) + ": se confirma por WhatsApp."
        : "Elige tu barrio para ver el valor del domicilio.") + "</p>";
    }
    return html;
  }

  function renderSheet() {
    var groups = groupedCart();

    if (groups.length === 0) {
      elSheetBody.innerHTML = '<p class="cart-empty">Tu pedido está vacío.</p>' + repetirHTML();
      return;
    }

    var gruposHTML = "";
    for (var gi = 0; gi < groups.length; gi++) {
      var g = groups[gi];
      var lineas = "";
      for (var i = 0; i < g.items.length; i++) {
        var item = g.items[i].item;
        var qty = g.items[i].qty;
        var kNota = cartKey(g.rest.id, item.id), nota = notaDe(kNota);
        lineas +=
          '<div class="cart-line">' +
            '<div class="cart-line__info">' +
              '<div class="cart-line__name">' + esc(item.n) + "</div>" +
              '<div class="cart-line__price">' + esc(item.p > 0 ? money(item.p) + " c/u" : precioTxt(0)) + "</div>" +
            "</div>" +
            '<div class="cart-line__right">' +
              stepperHTML(g.rest.id, item, qty) +
              '<span class="cart-line__sub">' + esc(item.p > 0 ? money(item.p * qty) : "—") + "</span>" +
            "</div>" +
            // Nota para el restaurante (opcional)
            '<div class="cart-nota' + (nota ? " cart-nota--abierta" : "") + '">' +
              '<button type="button" class="cart-nota__btn" data-nota-abrir' + (nota ? " hidden" : "") + ">✏️ Pedir algo especial (ej. sin cebolla)</button>" +
              '<label class="cart-nota__campo"' + (nota ? "" : " hidden") + ">" +
                '<span>✏️ Nota para ' + esc(g.rest.nombre) + "</span>" +
                '<input class="field__input" data-nota="' + esc(kNota) + '" maxlength="120" value="' + esc(nota) + '" placeholder="Ej: sin cebolla, la carne bien asada, salsa aparte" enterkeyhint="done" />' +
              "</label>" +
            "</div>" +
          "</div>";
      }
      var directo = window.Store && Store.normalizarWhatsapp && Store.normalizarWhatsapp(g.rest.whatsapp);
      gruposHTML +=
        '<div class="cart-group"><div class="cart-group__name">' +
        esc(g.rest.nombre) + (directo ? ' <span class="cart-group__directo">📲 Le llega directo al restaurante</span>' : "") +
        "</div>" + lineas + "</div>";
    }

    var c = leerLS(LS_CLIENTE, {});
    var datosPrevios = { barrio: c.barrio || "", domicilio: c.barrio ? tarifaBarrio(c.barrio) : null };

    elSheetBody.innerHTML =
      gruposHTML +
      avisosCerrados(groups) +
      '<div id="resumenTotales">' + resumenTotalesHTML(datosPrevios) + "</div>" +
      (hayPorConfirmar()
        ? '<p class="cart-note">Algunos productos tienen precio a confirmar: te lo decimos por WhatsApp.</p>' : "") +
      '<h3 class="form__heading">Tus datos de entrega</h3>' +
      (c.nombre ? '<p class="form__hint form__hint--ok">✓ Usamos tus datos del último pedido. Revísalos.</p>' : "") +
      '<form class="form" id="pedidoForm" novalidate>' +
        '<div class="field">' +
          '<label class="field__label" for="fNombre">Nombre *</label>' +
          '<input class="field__input" id="fNombre" name="nombre" type="text" placeholder="¿A nombre de quién?" autocomplete="name" required value="' + esc(c.nombre || "") + '" />' +
        "</div>" +
        '<div class="field">' +
          '<label class="field__label" for="fTelefono">Teléfono (WhatsApp) *</label>' +
          '<input class="field__input" id="fTelefono" name="telefono" type="tel" inputmode="numeric" placeholder="Ej: 300 123 4567" autocomplete="tel" required value="' + esc(c.telefono || "") + '" />' +
        "</div>" +
        campoBarrioHTML(c.barrio) +
        '<div class="field">' +
          '<label class="field__label" for="fDireccion">Dirección de entrega (opcional)</label>' +
          '<input class="field__input" id="fDireccion" name="direccion" type="text" placeholder="Calle, número y referencias" autocomplete="street-address" value="' + esc(c.direccion || "") + '" />' +
        "</div>" +
        '<div class="field">' +
          '<span class="field__label">Forma de pago</span>' +
          '<div class="pay">' +
            '<label class="pay__option"><input type="radio" name="pago" value="Efectivo"' + (c.pago !== "Transferencia" ? " checked" : "") + ' /> 💵 Efectivo</label>' +
            '<label class="pay__option"><input type="radio" name="pago" value="Transferencia"' + (c.pago === "Transferencia" ? " checked" : "") + ' /> 📲 Transferencia</label>' +
          "</div>" +
        "</div>" +
        '<div class="field">' +
          '<label class="field__label" for="fNotas">Notas (opcional)</label>' +
          '<textarea class="field__textarea" id="fNotas" name="notas" placeholder="Ej: sin cebolla, timbre dañado, etc."></textarea>' +
        "</div>" +
        '<div class="actions">' +
          '<button type="submit" class="btn-whatsapp" id="btnWhatsapp" disabled><span aria-hidden="true">🟢</span> Enviar pedido por WhatsApp</button>' +
          '<button type="button" class="btn-copy" data-copy>Copiar el pedido</button>' +
          '<p class="copy-msg" id="copyMsg" role="status" aria-live="polite"></p>' +
        "</div>" +
      "</form>";

    enlazarFormulario();
  }

  // El formulario necesita listeners propios (input/submit); se vuelven a
  // crear limpiamente en cada render de la hoja.
  function enlazarFormulario() {
    var form = $("#pedidoForm");
    var btnWa = $("#btnWhatsapp");
    var fNombre = $("#fNombre");
    var fTelefono = $("#fTelefono");
    var fBarrio = $("#fBarrio");
    var fOtro = $("#fBarrioOtro");
    if (!form || !btnWa || !fNombre || !fTelefono) return;

    function validar() {
      // Solo nombre y teléfono son obligatorios (dirección y barrio, opcionales).
      btnWa.disabled = !(fNombre.value.trim() && fTelefono.value.trim());
    }
    function actualizarTotales() {
      if (fOtro && fBarrio) {
        var esOtro = fBarrio.value === BARRIO_OTRO;
        fOtro.hidden = !esOtro;
        if (esOtro && document.activeElement === fBarrio) fOtro.focus();
      }
      var cont = $("#resumenTotales");
      if (cont) cont.innerHTML = resumenTotalesHTML(leerFormulario(form));
    }
    form.addEventListener("input", function () { validar(); actualizarTotales(); });
    form.addEventListener("change", actualizarTotales);
    validar();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (btnWa.disabled) return;
      var datos = leerFormulario(form);
      var codigo = codigoPedido();

      // Guardar en la nube ANTES de abrir WhatsApp (si falla, el pedido va igual por WA).
      guardarPedidoEnNube(datos, codigo);
      recordarPedido(datos, codigo);

      var destinos = destinosDelPedido(datos, codigo);
      var url = destinos[0].url;
      mostrarConfirmacion(destinos, codigo);

      // Vaciar el carrito (la hoja sigue abierta mostrando la confirmación).
      vaciarCarrito();
      codigoActual = null;
      refreshCart();
      renderRepetir();
      if (vistaActual) {
        var y = window.scrollY;
        abrirCarta(vistaActual);
        window.scrollTo(0, y);
      }

      // Navegar directo es lo más fiable en móvil (evita el bloqueo de pop-ups).
      try {
        var win = window.open(url, "_blank");
        if (!win) window.location.href = url;
      } catch (err) {
        window.location.href = url;
      }
    });
  }

  // Líneas del carrito listas para guardar (precio del momento, congelado).
  function lineasDelCarrito() {
    var items = [];
    groupedCart().forEach(function (g) {
      g.items.forEach(function (x) {
        items.push({
          restaurante_id: g.rest.id,
          restaurante: g.rest.nombre,
          plato_id: x.item.id,
          plato: x.item.n,
          precio_unit: x.item.p,
          cantidad: x.qty,
          subtotal: x.item.p * x.qty,
          nota: notaDe(cartKey(g.rest.id, x.item.id)) || undefined,
        });
      });
    });
    return items;
  }

  // Guarda en el teléfono: datos del cliente, último pedido y su código.
  function recordarPedido(datos, codigo) {
    escribirLS(LS_CLIENTE, { nombre: datos.nombre, telefono: datos.telefono,
      direccion: datos.direccion, barrio: datos.barrio, pago: datos.pago });
    var lineas = [];
    for (var key in cart) {
      var p = parseKey(key);
      var arm = almuerzosArmados[p.itemId];
      if (arm && arm.item && arm.item._almuerzo) continue; // el almuerzo cambia cada día
      lineas.push({ restId: p.restId, itemId: p.itemId, qty: cart[key], armado: arm ? arm.item : null });
    }
    if (lineas.length) escribirLS(LS_ULTIMO, { fecha: new Date().toISOString(), lineas: lineas });
    var mis = leerLS(LS_MIS_PEDIDOS, []).filter(function (x) { return x.codigo !== codigo; });
    mis.unshift({ codigo: codigo, fecha: new Date().toISOString(), total: totalPesos() });
    escribirLS(LS_MIS_PEDIDOS, mis.slice(0, 5));
  }

  // Guarda el pedido en Supabase. Silencioso: si falla, va igual por WhatsApp.
  function guardarPedidoEnNube(datos, codigo) {
    if (!window.Store || typeof window.Store.crearPedido !== "function") return;
    if (!window.Store.supabaseDisponible || !window.Store.supabaseDisponible()) return;
    window.Store.crearPedido({
      codigo: codigo,
      cliente: {
        nombre: datos.nombre, telefono: datos.telefono, direccion: datos.direccion,
        barrio: datos.barrio, pago: datos.pago, notas: datos.notas,
        domicilio: datos.domicilio, // null = se confirma por WhatsApp
      },
      items: lineasDelCarrito(),
      total: totalPesos(),
    }).catch(function (e) { console.warn("No se pudo guardar el pedido en la nube:", e && e.message); });
  }

  function construirMensaje(datos, codigo, soloGrupos) {
    var todos = groupedCart();
    var groups = soloGrupos || todos;
    var parcial = soloGrupos && soloGrupos.length < todos.length;
    var lines = [];
    lines.push("NUEVO PEDIDO - " + NOMBRE_NEGOCIO);
    lines.push("Codigo: " + codigo);
    lines.push("--------------------------------");
    lines.push("");

    for (var gi = 0; gi < groups.length; gi++) {
      var g = groups[gi];
      lines.push(g.rest.nombre);
      for (var i = 0; i < g.items.length; i++) {
        var item = g.items[i].item;
        var qty = g.items[i].qty;
        lines.push("- " + qty + " x " + item.n + " = " +
          (item.p > 0 ? money(item.p * qty) : "precio a confirmar"));
        var notaLinea = notaDe(cartKey(g.rest.id, item.id));
        if (notaLinea) lines.push("   > Nota: " + notaLinea);
      }
      lines.push("Subtotal: " + money(g.subtotal));
      lines.push("");
    }

    var productos = parcial ? groups.reduce(function (n, g) { return n + g.subtotal; }, 0) : totalPesos();
    var porConfirmar = groups.some(function (g) { return g.items.some(function (x) { return !(x.item.p > 0); }); });
    lines.push("--------------------------------");
    lines.push("Total productos: " + money(productos) +
      (porConfirmar ? " + productos con precio a confirmar" : ""));
    if (parcial) {
      // El pedido se repartió entre varios restaurantes: el domicilio se coordina.
      lines.push("(el cliente pidio tambien en otros restaurantes; el domicilio se coordina)");
    } else if (datos.domicilio != null) {
      lines.push("Domicilio (" + datos.barrio + "): " + (datos.domicilio > 0 ? money(datos.domicilio) : "gratis"));
      lines.push("TOTAL A PAGAR: " + money(productos + datos.domicilio) + (porConfirmar ? " + productos con precio a confirmar" : ""));
    } else {
      lines.push("(el domicilio se confirma segun el barrio)");
    }
    lines.push("");
    lines.push("DATOS DE ENTREGA");
    lines.push("Nombre: " + datos.nombre);
    lines.push("Telefono: " + datos.telefono);
    if (datos.barrio) lines.push("Barrio: " + datos.barrio);
    if (datos.direccion) lines.push("Direccion: " + datos.direccion);
    lines.push("Pago: " + datos.pago);
    if (datos.notas) lines.push("Nota: " + datos.notas);
    lines.push("");
    lines.push("Sigue tu pedido: " + urlSeguimiento(codigo));

    return lines.join("\n");
  }

  // ¿A qué WhatsApp va cada parte del pedido? Al del restaurante si lo puso;
  // si no, al de Servicios Ghost (todo lo que no tenga número, en un solo mensaje).
  function destinosDelPedido(datos, codigo) {
    var porNumero = {}, orden = [];
    groupedCart().forEach(function (g) {
      var num = (window.Store && Store.normalizarWhatsapp ? Store.normalizarWhatsapp(g.rest.whatsapp) : "") || WHATSAPP;
      if (!porNumero[num]) { porNumero[num] = { numero: num, grupos: [], esGhost: num === WHATSAPP }; orden.push(num); }
      porNumero[num].grupos.push(g);
    });
    return orden.map(function (num) {
      var d = porNumero[num];
      d.nombre = d.esGhost ? NOMBRE_NEGOCIO : d.grupos.map(function (g) { return g.rest.nombre; }).join(", ");
      d.url = "https://wa.me/" + num + "?text=" + encodeURIComponent(construirMensaje(datos, codigo, d.grupos));
      return d;
    });
  }

  async function copiarPedido() {
    var form = $("#pedidoForm");
    var copyMsg = $("#copyMsg");
    if (!form) return;
    var texto = construirMensaje(leerFormulario(form), codigoPedido());
    try {
      await navigator.clipboard.writeText(texto);
      if (copyMsg) {
        copyMsg.textContent = "¡Pedido copiado! 📋";
        copyMsg.classList.remove("copy-msg--error");
      }
    } catch (err) {
      if (copyMsg) {
        copyMsg.textContent = "No se pudo copiar. Selecciona el texto y cópialo manualmente.";
        copyMsg.classList.add("copy-msg--error");
      }
    }
  }

  /* ==================================================================
     DELEGACIÓN DE EVENTOS
     Un único manejador de clic en todo el documento. Mira qué se tocó
     (vía closest + data-*) y actúa. Esto es lo que hace la página
     robusta en móvil: los botones nunca quedan "muertos" tras repintar.
     ================================================================== */

  function onClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;

    // --- Cerrar la hoja (X o fondo oscuro) ---
    // --- Seguimiento de pedido ---
    var trOpen = t.closest("[data-track-open]");
    if (trOpen) { e.preventDefault(); if (!elSheet.hidden) closeSheet(); abrirSeguimiento(trOpen.getAttribute("data-track-open") || ""); return; }
    if (t.closest("[data-track-close]")) { e.preventDefault(); cerrarSeguimiento(); return; }
    var trCod = t.closest("[data-track-codigo]");
    if (trCod) { consultarSeguimiento(trCod.getAttribute("data-track-codigo")); return; }

    // --- Repetir último pedido ---
    if (t.closest("[data-repetir]")) { repetirPedido(); return; }

    // --- Instalar la app ---
    if (t.closest("#btnInstalar")) { instalarApp(); return; }

    // --- Lo más pedido / promoción: abre la carta (y resalta el plato) ---
    var pop = t.closest("[data-ir-rest]");
    if (pop) { irAPlato(pop.getAttribute("data-ir-rest"), pop.getAttribute("data-ir-item")); return; }

    if (t.closest("[data-sheet-close]")) { e.preventDefault(); closeSheet(); return; }
    if (t.hasAttribute && t.hasAttribute("data-sheet-backdrop")) { e.preventDefault(); closeSheet(); return; }

    // --- Abrir la hoja ---
    if (t.closest("#cartBar")) { openSheet(); return; }
    if (t.closest("#cartBtnTop")) { openSheet(); return; }

    // --- Logo: volver al inicio ---
    if (t.closest("[data-volver-panel]") || (MODO_PANEL && t.closest("#logoHome"))) { e.preventDefault(); volverAlPanel(); return; }
    if (t.closest("#logoHome")) { e.preventDefault(); if (!elSheet.hidden) closeSheet(); if (vistaActual) conTransicion(irAInicio); else irAInicio(); return; }

    // --- Chips de categoría ---
    if (t.closest("[data-limpiar-filtros]")) { limpiarFiltros(); return; }
    var chip = t.closest("[data-chip]");
    if (chip) { aplicarFiltro(chip.getAttribute("data-chip")); return; }

    // --- Volver desde la carta ---
    if (t.closest("[data-back]")) { if (MODO_PANEL) volverAlPanel(); else conTransicion(irAInicio); return; }
    var comp = t.closest("[data-compartir]");
    if (comp) { compartirNegocio(comp.getAttribute("data-compartir")); return; }

    // --- Copiar pedido ---
    if (t.closest("[data-copy]")) { copiarPedido(); return; }

    // --- Agregar / sumar / restar ---
    var btn = t.closest("[data-add],[data-inc],[data-dec]");
    if (btn) {
      var restId = btn.getAttribute("data-rest");
      var itemId = btn.getAttribute("data-item");
      if (!restId || !itemId) return;
      var actual = getQty(restId, itemId);
      if (btn.hasAttribute("data-add")) setQty(restId, itemId, 1);
      else if (btn.hasAttribute("data-inc")) setQty(restId, itemId, actual + 1);
      else if (btn.hasAttribute("data-dec")) setQty(restId, itemId, actual - 1);
      repintarPlato(restId, itemId);
      refreshCart();
      return;
    }

    // --- Agregar plato con opciones (ej. alitas + salsa) ---
    var opcAdd = t.closest("[data-opc-add]");
    if (opcAdd) {
      agregarPlatoConOpciones(opcAdd.getAttribute("data-rest"), opcAdd.getAttribute("data-item"));
      return;
    }

    // --- Agregar desayuno / almuerzo armado ---
    var menuAdd = t.closest("[data-menu-add]");
    if (menuAdd) {
      var caja = menuAdd.closest("[data-menu-box]");
      var ok = agregarMenu(caja);
      // Desde la ventana del inicio: cerramos y avisamos.
      if (ok && caja.closest("#menuSheet")) {
        cerrarMenuVentana();
        toast(MENUS[caja.getAttribute("data-tipo")].emoji + " Agregado a tu pedido ✓");
      }
      return;
    }

    // --- Menú del día del inicio: pestañas y "Armar" ---
    var menuTab = t.closest("[data-menu-tab]");
    if (menuTab) { tipoMenuDia = menuTab.getAttribute("data-menu-tab"); renderMenuDia(); return; }
    var menuIr = t.closest("[data-menu-ir]");
    if (menuIr) {
      e.preventDefault();
      tipoMenuDia = menuIr.getAttribute("data-menu-ir");
      if (vistaActual) irAInicio();
      renderMenuDia();
      var sec = document.getElementById("almuerzos");
      if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    var menuAbrir = t.closest("[data-menu-abrir]");
    if (menuAbrir) { abrirMenuVentana(menuAbrir.getAttribute("data-menu-abrir"), menuAbrir.getAttribute("data-tipo")); return; }
    if (t.closest("[data-menu-close]")) { cerrarMenuVentana(); return; }
    var menuCarta = t.closest("[data-menu-carta]");
    if (menuCarta) {
      cerrarMenuVentana();
      var idMc = menuCarta.getAttribute("data-menu-carta");
      conTransicion(function () { abrirCarta(idMc); }, findRest(idMc));
      return;
    }

    // --- Carta: índice de secciones y buscador ---
    var irSec = t.closest("[data-ir-sec]");
    if (irSec) { irASeccion(irSec.getAttribute("data-ir-sec")); return; }
    if (t.closest("[data-limpiar-carta]")) {
      var bc = document.getElementById("buscaCarta");
      if (bc) { bc.value = ""; bc.focus(); }
      filtrarCarta("");
      return;
    }

    // --- Recomendado y fotos ampliadas ---
    if (t.closest("[data-reco-otro]")) { renderRecomendado(true); return; }
    var fotoVer = t.closest("[data-foto-ver]");
    if (fotoVer) { verFoto(fotoVer.getAttribute("src"), fotoVer.getAttribute("data-foto-titulo") || fotoVer.getAttribute("alt") || ""); return; }
    if (t.closest("[data-visor-close]")) { cerrarFoto(); return; }


    // --- Abrir carta tocando una tarjeta ---
    var card = t.closest("[data-rest]");
    if (card && card.classList.contains("card")) {
      var idCard = card.getAttribute("data-rest");
      conTransicion(function () { abrirCarta(idCard); }, findRest(idCard));
      return;
    }
  }

  // Un solo listener para toda la app (incluye lo que se repinta).
  document.addEventListener("click", onClick);

  // Marca como enviado el WhatsApp que el cliente ya abrió.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-wa-destino]");
    if (!a) return;
    a.classList.add("btn-whatsapp--enviado");
    var ok = a.querySelector(".btn-whatsapp__ok");
    if (ok) ok.textContent = " ✓";
  });

  // Nota del cliente en un producto del pedido
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-nota-abrir]");
    if (!b) return;
    var box = b.closest(".cart-nota");
    b.hidden = true;
    var campo = box.querySelector(".cart-nota__campo");
    campo.hidden = false;
    box.classList.add("cart-nota--abierta");
    var inp = campo.querySelector("input");
    if (inp) inp.focus();
  });
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (!t || !t.hasAttribute || !t.hasAttribute("data-nota")) return;
    notasCart[t.getAttribute("data-nota")] = t.value.slice(0, 120);
    guardarNotas();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target && e.target.hasAttribute && e.target.hasAttribute("data-nota")) { e.preventDefault(); e.target.blur(); }
  });

  // Cuando cambia una opción del almuerzo, actualizamos los grupos condicionales
  // (ej: mostrar/ocultar "Sopa" según se elija "Completo" o "Sin sopa").
  document.addEventListener("change", function (e) {
    var caja = e.target && e.target.closest && e.target.closest("[data-menu-box]");
    if (caja) actualizarVisibilidadMenu(caja);
  });

  // En los grupos de "elige 1", tocar otra vez la opción marcada la quita
  // (un botón de radio normal no se puede desmarcar).
  var _radioYaMarcado = null;
  function radioDeMenu(t) {
    var op = t && t.closest && t.closest("[data-menu-box] .alm-op");
    var i = op && op.querySelector('input[type="radio"]');
    return i && !i.disabled ? i : null;
  }
  // Antes del clic: ¿la opción ya estaba marcada?
  ["pointerdown", "keydown"].forEach(function (tipo) {
    document.addEventListener(tipo, function (e) {
      if (tipo === "keydown" && e.key !== " " && e.key !== "Enter") return;
      var i = radioDeMenu(e.target);
      _radioYaMarcado = i && i.checked ? i : null;
    }, true);
  });
  document.addEventListener("click", function (e) {
    var i = e.target;
    if (!i || i.type !== "radio" || !i.closest || !i.closest("[data-menu-box]")) return;
    if (_radioYaMarcado === i) {
      i.checked = false;
      i.dispatchEvent(new Event("change", { bubbles: true }));
    }
    _radioYaMarcado = null;
  });

  // Buscador dentro de la carta de un restaurante
  var _cartaTimer = null;
  document.addEventListener("input", function (e) {
    if (!e.target || e.target.id !== "buscaCarta") return;
    var v = e.target.value;
    clearTimeout(_cartaTimer);
    _cartaTimer = setTimeout(function () {
      filtrarCarta(v);
      var nav = document.getElementById("cartaNav");
      // Que los resultados queden justo debajo del buscador.
      if (v && nav && nav.getBoundingClientRect().top > (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--alto-header"), 10) || 64) + 2) {
        window.scrollTo({ top: nav.getBoundingClientRect().top + window.scrollY - ((parseInt(getComputedStyle(document.documentElement).getPropertyValue("--alto-header"), 10) || 64)), behavior: "smooth" });
      }
    }, 100);
  });

  // Buscador
  var _busqTimer = null;
  elBuscador.addEventListener("input", function (e) {
    termino = e.target.value;
    var limpiar = document.getElementById("buscadorLimpiar");
    if (limpiar) limpiar.hidden = !termino;
    if (vistaActual) irAInicio();
    clearTimeout(_busqTimer);
    _busqTimer = setTimeout(actualizarVista, 120);
  });
  elBuscador.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); elBuscador.blur(); irAResultados(); }
  });
  var _limpiarBtn = document.getElementById("buscadorLimpiar");
  if (_limpiarBtn) _limpiarBtn.addEventListener("click", function () {
    elBuscador.value = ""; termino = ""; _limpiarBtn.hidden = true; actualizarVista(); elBuscador.focus();
  });

  // Cerrar con Escape (teclado)
  document.addEventListener("keydown", function (e) {
    var visor = document.getElementById("fotoVisor");
    if (e.key === "Escape" && visor && !visor.hidden) { cerrarFoto(); return; }
    if (e.key === "Escape" && elMenuSheet && !elMenuSheet.hidden) { cerrarMenuVentana(); return; }
    if (e.key === "Escape" && elTrack && !elTrack.hidden) { cerrarSeguimiento(); return; }
    if (e.key === "Escape" && !elSheet.hidden) closeSheet();
  });

  /* ------------------------- Menú del día (inicio) ------------------------- */
  // Pestañas "Desayunos / Almuerzos". Por defecto: desayunos antes de las
  // 11 am (hora de Colombia) si hay; si no, almuerzos.
  var tipoMenuDia = null;

  function menusDeHoy(tipo) { return DATA.filter(function (r) { return menuVigente(r, tipo); }); }

  function renderMenuDia() {
    var cont = document.getElementById("gridAlmuerzos");
    var vacio = document.getElementById("almuerzosVacio");
    var tabs = document.getElementById("menuTabs");
    if (!cont) return;
    var hay = { desayuno: menusDeHoy("desayuno"), almuerzo: menusDeHoy("almuerzo") };
    if (!tipoMenuDia) {
      var temprano = ahoraColombia().min < 11 * 60;
      tipoMenuDia = (temprano && hay.desayuno.length) || !hay.almuerzo.length && hay.desayuno.length ? "desayuno" : "almuerzo";
    }
    if (tabs) {
      tabs.innerHTML = TIPOS_MENU.map(function (t) {
        var M = MENUS[t], n = hay[t].length;
        return '<button type="button" class="menu-tab' + (t === tipoMenuDia ? " menu-tab--on" : "") + '" data-menu-tab="' + t + '" aria-pressed="' + (t === tipoMenuDia) + '">' +
          M.emoji + " " + M.plural + (n ? ' <span class="menu-tab__n">' + n + "</span>" : "") + "</button>";
      }).join("");
    }
    var M = MENUS[tipoMenuDia];
    // Abiertos primero.
    var lista = hay[tipoMenuDia].slice().sort(function (a, b) { return (abiertoAhora(a) ? 0 : 1) - (abiertoAhora(b) ? 0 : 1); });
    if (!lista.length) {
      cont.innerHTML = "";
      if (vacio) {
        vacio.hidden = false;
        var otro = tipoMenuDia === "desayuno" ? "almuerzo" : "desayuno";
        vacio.innerHTML = "Hoy todavía no hay " + M.plural.toLowerCase() + " publicados." +
          (hay[otro].length ? ' <button type="button" class="btn-link" data-menu-tab="' + otro + '">Ver ' + MENUS[otro].plural.toLowerCase() + " →</button>" : " Vuelve más tarde o escríbenos por WhatsApp.");
      }
      return;
    }
    if (vacio) vacio.hidden = true;

    cont.innerHTML = lista.map(function (r) {
      var a = r[M.campo];
      var resumen = "";
      var grupos = Array.isArray(a.grupos) ? a.grupos : [];
      for (var g = 0; g < grupos.length && g < 4; g++) {
        var ops = (grupos[g].opciones || []).filter(function (o) { return !o.agotado; }).map(function (o) { return o.n; });
        if (ops.length) resumen += "<li><strong>" + esc(grupos[g].nombre) + ":</strong> " + esc(ops.join(", ")) + "</li>";
      }
      var abierto = abiertoAhora(r);
      return '<article class="alm-card' + (a.foto ? " alm-card--foto" : "") + (abierto ? "" : " alm-card--cerrado") + '">' +
          (a.foto ? '<img class="alm-card__foto" src="' + esc(a.foto) + '" alt="' + esc(a.titulo || M.titulo) + '" loading="lazy" decoding="async" />' : "") +
          '<div class="alm-card__head">' +
            '<span class="alm-card__rest">' + esc(r.nombre) + "</span>" +
            (a.precio ? '<span class="alm-card__precio">' + esc(money(a.precio)) + "</span>" : "") +
          "</div>" +
          '<div class="alm-card__titulo">' + M.emoji + " " + esc(a.titulo || M.titulo) + "</div>" +
          (a.desc ? '<p class="alm-card__desc">' + esc(a.desc) + "</p>" : "") +
          (resumen ? '<ul class="alm-card__ops">' + resumen + "</ul>" : "") +
          '<div class="alm-card__foot">' + estadoHTML(r) +
            '<button type="button" class="add-btn" data-menu-abrir="' + esc(r.id) + '" data-tipo="' + tipoMenuDia + '"' + (abierto ? "" : " disabled") + ">" +
              (abierto ? "Armar mi " + M.nombre + " →" : "Cerrado") + "</button>" +
          "</div>" +
        "</article>";
    }).join("");
  }

  /* ----------------------- Recomendado (al azar) ----------------------- */
  // Un solo plato con foto, a pantalla completa en su sección. Se elige al
  // azar (sin repetir el anterior) y cambia solo cada 9 segundos.
  var _recoActual = null, _recoTimer = null;

  function candidatosReco() {
    var out = [];
    DATA.forEach(function (r) {
      (r.carta || []).forEach(function (s) {
        (s.items || []).forEach(function (it) {
          if (it.foto && !it.agotado) out.push({ r: r, it: it, clave: r.id + "::" + it.id });
        });
      });
      TIPOS_MENU.forEach(function (t) {
        var a = r[MENUS[t].campo];
        if (a && a.foto && menuVigente(r, t)) out.push({ r: r, menu: t, a: a, clave: r.id + "::menu-" + t });
      });
    });
    // Si aún no hay fotos de platos, recomendamos platos con la foto de portada
    // del restaurante (uno al azar de cada restaurante con portada).
    if (!out.length) {
      DATA.forEach(function (r) {
        if (!r.logo) return;
        var platos = [];
        (r.carta || []).forEach(function (s) { (s.items || []).forEach(function (it) { if (!it.agotado && it.p > 0) platos.push(it); }); });
        if (!platos.length) return;
        var it = platos[Math.floor(Math.random() * platos.length)];
        out.push({ r: r, it: it, fotoRest: r.logo, clave: r.id + "::" + it.id });
      });
    }
    // Si hay de restaurantes abiertos, solo esos.
    var abiertos = out.filter(function (x) { return abiertoAhora(x.r); });
    return abiertos.length ? abiertos : out;
  }

  function renderRecomendado(forzar) {
    var sec = document.getElementById("recomendado");
    var card = document.getElementById("recoCard");
    if (!sec || !card) return;
    if (enModoFiltro()) { sec.hidden = true; return; }
    var lista = candidatosReco();
    if (!lista.length) { sec.hidden = true; return; }
    sec.hidden = false;
    var otroBtn = sec.querySelector("[data-reco-otro]");
    if (otroBtn) otroBtn.hidden = lista.length < 2;
    var opciones = lista.length > 1 && _recoActual ? lista.filter(function (x) { return x.clave !== _recoActual; }) : lista;
    var x = opciones[Math.floor(Math.random() * opciones.length)];
    _recoActual = x.clave;

    var foto, titulo, precio, accion;
    if (x.menu) {
      var M = MENUS[x.menu];
      foto = x.a.foto; titulo = M.emoji + " " + (x.a.titulo || M.titulo);
      precio = x.a.precio ? money(x.a.precio) : "";
      accion = 'data-menu-abrir="' + esc(x.r.id) + '" data-tipo="' + x.menu + '"';
    } else {
      foto = x.it.foto || x.fotoRest; titulo = x.it.n;
      precio = x.it.p > 0 ? (tieneOpciones(x.it) ? "desde " : "") + money(x.it.p) : "";
      accion = 'data-ir-rest="' + esc(x.r.id) + '" data-ir-item="' + esc(x.it.id) + '"';
    }
    var html =
      '<button type="button" class="reco" ' + accion + ' aria-label="Ver ' + esc(titulo) + " de " + esc(x.r.nombre) + '">' +
        '<img class="reco__img" src="' + esc(foto) + '" alt="' + esc(titulo) + '" decoding="async" />' +
        '<span class="reco__capa">' +
          '<span class="reco__etq">⭐ Recomendado</span>' +
          '<span class="reco__plato">' + esc(titulo) + "</span>" +
          '<span class="reco__rest">' + esc(x.r.nombre) + "</span>" +
          '<span class="reco__pie">' +
            (precio ? '<span class="reco__precio">' + esc(precio) + "</span>" : "<span></span>") +
            '<span class="reco__cta">' + (x.menu ? "Armar →" : "Pedir →") + "</span>" +
          "</span>" +
        "</span>" +
      "</button>";
    // Cargamos la foto antes de mostrarla, para que no parpadee.
    var pre = new Image();
    pre.onload = pre.onerror = function () {
      if (_recoActual !== x.clave) return;
      card.classList.add("reco-wrap--cambio");
      setTimeout(function () { card.innerHTML = html; card.classList.remove("reco-wrap--cambio"); }, card.innerHTML ? 220 : 0);
    };
    pre.src = foto;
    iniciarRotacionReco(lista.length > 1);
  }

  function iniciarRotacionReco(activa) {
    if (_recoTimer) { clearInterval(_recoTimer); _recoTimer = null; }
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!activa || reduce) return;
    _recoTimer = setInterval(function () {
      var card = document.getElementById("recoCard");
      if (elVistaInicio.hidden || document.hidden || (card && card.matches(":hover"))) return;
      renderRecomendado();
    }, 9000);
  }

  /* --------------------- Ver una foto en grande --------------------- */
  function verFoto(src, titulo) {
    if (!src) return;
    var v = document.getElementById("fotoVisor");
    if (!v) {
      v = document.createElement("div");
      v.id = "fotoVisor";
      v.className = "visor";
      v.setAttribute("role", "dialog");
      v.setAttribute("aria-modal", "true");
      document.body.appendChild(v);
    }
    v.innerHTML = '<div class="visor__fondo" data-visor-close></div>' +
      '<figure class="visor__fig"><img src="' + esc(src) + '" alt="' + esc(titulo) + '" />' +
      (titulo ? "<figcaption>" + esc(titulo) + "</figcaption>" : "") + "</figure>" +
      '<button type="button" class="visor__x icon-btn" data-visor-close aria-label="Cerrar foto">✕</button>';
    v.hidden = false;
  }
  function cerrarFoto() {
    var v = document.getElementById("fotoVisor");
    if (v) { v.hidden = true; v.innerHTML = ""; }
  }

  /* -------------------------- Promociones ------------------------- */
  // Las del panel (Ajustes → Promociones) mandan; si no hay, las de data.js.
  function listaPromos() {
    if (Array.isArray(AJUSTES.promos)) return AJUSTES.promos.filter(function (p) { return p && p.activo !== false && (p.titulo || p.texto); });
    return (typeof PROMOCIONES !== "undefined" && Array.isArray(PROMOCIONES)) ? PROMOCIONES : [];
  }
  function renderPromos() {
    var cont = document.getElementById("promos");
    if (!cont) return;
    if (enModoFiltro()) { cont.hidden = true; return; }
    var lista = listaPromos();
    if (!lista.length) { cont.innerHTML = ""; cont.hidden = true; return; }
    cont.hidden = false;
    var html = "";
    for (var i = 0; i < lista.length; i++) {
      var p = lista[i];
      var destino = p.rest && findRest(p.rest);
      var interior =
        '<span class="promo__emoji" aria-hidden="true">' + esc(p.emoji || "✨") + "</span>" +
        '<div class="promo__text">' +
          '<div class="promo__title">' + esc(p.titulo || "") + "</div>" +
          '<div class="promo__sub">' + esc(p.texto || "") + "</div>" +
          (destino ? '<div class="promo__cta">Ver en ' + esc(destino.nombre) + " →</div>" : "") +
        "</div>";
      html += destino
        ? '<button type="button" class="promo promo--link" data-ir-rest="' + esc(destino.id) + '">' + interior + "</button>"
        : '<div class="promo">' + interior + "</div>";
    }
    cont.innerHTML = html;
  }

  /* ------------------------- Lo más pedido ------------------------ */
  // El panel calcula los platos más vendidos y los publica en Ajustes.
  function renderPopulares() {
    var sec = document.getElementById("populares");
    var cont = document.getElementById("gridPopulares");
    if (!sec || !cont) return;
    if (enModoFiltro()) { sec.hidden = true; return; }
    var lista = (Array.isArray(AJUSTES.populares) ? AJUSTES.populares : [])
      .map(function (p) {
        var r = findRest(p.rest);
        var it = r ? findItem(r.id, p.item) : null;
        return r && it && !it.agotado ? { rest: r, item: it, veces: p.veces } : null;
      })
      .filter(Boolean).slice(0, 8);
    if (lista.length < 3) { sec.hidden = true; cont.innerHTML = ""; return; }
    sec.hidden = false;
    cont.innerHTML = lista.map(function (x, i) {
      var img = x.item.foto
        ? '<img class="pop__img" src="' + esc(x.item.foto) + '" alt="" loading="lazy" decoding="async" />'
        : '<span class="pop__img pop__img--ini" style="' + coverStyle({ color: x.rest.color }) + '">' + esc(iniciales(x.rest.nombre)) + "</span>";
      return '<button type="button" class="pop" data-ir-rest="' + esc(x.rest.id) + '" data-ir-item="' + esc(x.item.id) + '">' +
          '<span class="pop__rank">#' + (i + 1) + "</span>" + img +
          '<span class="pop__info">' +
            '<span class="pop__plato">' + esc(x.item.n) + "</span>" +
            '<span class="pop__rest">' + esc(x.rest.nombre) + "</span>" +
            '<span class="pop__precio">' + esc(x.item.p > 0 ? (tieneOpciones(x.item) ? "desde " : "") + money(x.item.p) : precioTxt(0)) + "</span>" +
          "</span>" +
        "</button>";
    }).join("");
  }

  /* ------------- Transición con el fantasma al entrar/salir de una carta -------------
     Rápida (~0,4 s): aparece el logo, se cambia la vista por detrás y se va. */
  var _transOcupada = false, elTrans = null;
  function conTransicion(cambio, rest) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || _transOcupada) { cambio(); return; }
    _transOcupada = true;
    if (!elTrans) {
      elTrans = document.createElement("div");
      elTrans.className = "trans";
      elTrans.setAttribute("aria-hidden", "true");
      elTrans.innerHTML =
        '<div class="trans__centro">' +
          '<span class="trans__logo"><img src="assets/logo-sm.png" alt="" width="96" height="96" /></span>' +
          '<span class="trans__txt"></span>' +
        "</div>";
      document.body.appendChild(elTrans);
    }
    elTrans.querySelector(".trans__txt").textContent = rest ? rest.nombre : "Servicios Ghost";
    elTrans.classList.remove("trans--sale");
    void elTrans.offsetWidth; // reinicia la animación
    elTrans.classList.add("trans--entra");
    setTimeout(function () {
      try { cambio(); } finally {
        setTimeout(function () {
          elTrans.classList.remove("trans--entra");
          elTrans.classList.add("trans--sale");
          setTimeout(function () { elTrans.classList.remove("trans--sale"); _transOcupada = false; }, 220);
        }, 140);
      }
    }, 150);
  }

  // Abre la carta de un restaurante y, si se indica, resalta un plato.
  function irAPlato(restId, itemId) {
    if (!findRest(restId)) return;
    conTransicion(function () { abrirCarta(restId); resaltarPlato(itemId); }, findRest(restId));
  }
  function resaltarPlato(itemId) {
    if (!itemId) return;
    var nodo = elVistaCarta.querySelector('[data-dish][data-item="' + cssId(itemId) + '"]');
    if (!nodo) return;
    setTimeout(function () {
      if (nodo.scrollIntoView) nodo.scrollIntoView({ behavior: "smooth", block: "center" });
      nodo.classList.add("dish--destacado");
      setTimeout(function () { nodo.classList.remove("dish--destacado"); }, 2200);
    }, 340);
  }

  /* ----------------------- Repetir último pedido ------------------ */
  function ultimoPedido() {
    var u = leerLS(LS_ULTIMO, null);
    return u && Array.isArray(u.lineas) && u.lineas.length ? u : null;
  }
  function fechaRelativa(iso) {
    var d = new Date(iso), dias = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (dias <= 0) return "hoy";
    if (dias === 1) return "ayer";
    if (dias < 7) return "hace " + dias + " días";
    try { return "el " + d.toLocaleDateString("es-CO", { day: "numeric", month: "short" }); } catch (e) { return ""; }
  }
  function repetirHTML() {
    var u = ultimoPedido();
    if (!u) return "";
    var n = u.lineas.reduce(function (s, l) { return s + (l.qty || 0); }, 0);
    return '<div class="repetir">' +
        '<div class="repetir__txt"><strong>¿Lo mismo de la última vez?</strong>' +
          "<span>" + n + (n === 1 ? " producto" : " productos") + " · " + esc(fechaRelativa(u.fecha)) + "</span></div>" +
        '<button type="button" class="btn-copy" data-repetir>🔁 Repetir pedido</button>' +
      "</div>";
  }
  function renderRepetir() {
    var box = document.getElementById("repetirBox");
    if (!box) return;
    var html = repetirHTML();
    box.innerHTML = html;
    box.hidden = !html;
  }

  // Vuelve a poner en el carrito lo del último pedido, con los precios DE HOY.
  function repetirPedido() {
    var u = ultimoPedido();
    if (!u) return;
    var agregados = 0, faltan = 0, cerrados = {};
    u.lineas.forEach(function (l) {
      var r = findRest(l.restId);
      if (!r) { faltan++; return; }
      if (!abiertoAhora(r)) { cerrados[r.nombre] = true; return; }
      if (l.armado) {
        var base = l.armado._base ? findItem(r.id, l.armado._base) : null;
        var combo = base && !base.agotado && armable(r, base) ? armarCombo(r, base, l.armado._elec || [], l.armado._adic || []) : null;
        if (!combo) { faltan++; return; }
        almuerzosArmados[combo.id] = { restId: r.id, item: combo };
        setQty(r.id, combo.id, getQty(r.id, combo.id) + l.qty);
        agregados += l.qty;
        return;
      }
      var it = findItem(r.id, l.itemId);
      if (!it || it.agotado || tieneOpciones(it)) { faltan++; return; }
      setQty(r.id, it.id, getQty(r.id, it.id) + l.qty);
      agregados += l.qty;
    });
    refreshCart();
    if (vistaActual) { var y = window.scrollY; abrirCarta(vistaActual); window.scrollTo(0, y); }
    var nombresCerrados = Object.keys(cerrados);
    var txtCerrados = nombresCerrados.length ? nombresCerrados.join(", ") + (nombresCerrados.length === 1 ? " está cerrado" : " están cerrados") + " ahora" : "";
    if (!agregados) { toast(txtCerrados ? txtCerrados + ". Intenta más tarde ⏰" : "Esos productos ya no están disponibles 😕", 4500); return; }
    toast("Agregamos " + agregados + (agregados === 1 ? " producto" : " productos") +
      (faltan ? " (" + faltan + " ya no está disponible)" : "") + " ✓" + (txtCerrados ? " · " + txtCerrados : ""), txtCerrados ? 4500 : 2800);
    openSheet();
  }

  /* ---------------------- Seguimiento del pedido ------------------- */
  var elTrack = document.getElementById("trackSheet");
  var elTrackBody = document.getElementById("trackBody");
  var _trackTimer = null, _trackCodigo = "";
  var PASOS = [
    { e: "recibido", t: "Recibido", d: "Tenemos tu pedido." },
    { e: "preparando", t: "Preparando", d: "El restaurante lo está preparando." },
    { e: "listo", t: "Listo", d: "Listo para salir." },
    { e: "en-camino", t: "En camino", d: "El domiciliario va hacia ti." },
    { e: "entregado", t: "Entregado", d: "¡Buen provecho!" },
  ];

  function abrirSeguimiento(codigo) {
    if (!elTrack) return;
    elTrack.hidden = false;
    document.body.classList.add("no-scroll");
    var mis = leerLS(LS_MIS_PEDIDOS, []);
    if (!codigo && mis.length) codigo = mis[0].codigo;
    pintarFormSeguimiento(codigo);
    if (codigo) consultarSeguimiento(codigo);
  }
  function cerrarSeguimiento() {
    if (!elTrack) return;
    elTrack.hidden = true;
    document.body.classList.remove("no-scroll");
    if (_trackTimer) { clearInterval(_trackTimer); _trackTimer = null; }
    if (/^#pedido=/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
  }
  function pintarFormSeguimiento(codigo) {
    var mis = leerLS(LS_MIS_PEDIDOS, []);
    elTrackBody.innerHTML =
      '<form class="track-form" id="trackForm">' +
        '<label class="field__label" for="trackCodigo">Código de tu pedido</label>' +
        '<div class="track-form__row">' +
          '<input class="field__input" id="trackCodigo" placeholder="GH-XXXXXX" autocomplete="off" autocapitalize="characters" value="' + esc(codigo || "") + '" />' +
          '<button type="submit" class="btn-primary-sm">Buscar</button>' +
        "</div>" +
        (mis.length ? '<div class="track-mis"><span class="muted">Tus pedidos recientes:</span>' +
          mis.map(function (m) {
            return '<button type="button" class="chip chip--sm" data-track-codigo="' + esc(m.codigo) + '">' + esc(m.codigo) + "</button>";
          }).join("") + "</div>" : "") +
      "</form>" +
      '<div id="trackResultado" aria-live="polite"></div>';
    var f = document.getElementById("trackForm");
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      consultarSeguimiento(document.getElementById("trackCodigo").value);
    });
  }

  async function consultarSeguimiento(codigo) {
    codigo = String(codigo || "").trim().toUpperCase();
    var out = document.getElementById("trackResultado");
    var inp = document.getElementById("trackCodigo");
    if (inp) inp.value = codigo;
    if (!out) return;
    if (!/^GH-[A-Z0-9]{5,}$/.test(codigo)) {
      out.innerHTML = '<p class="track-msg">Escribe el código tal como te llegó, por ejemplo <strong>GH-7K3QPA</strong>.</p>';
      return;
    }
    _trackCodigo = codigo;
    if (!out.innerHTML) out.innerHTML = '<p class="track-msg muted">Buscando tu pedido…</p>';
    var waAyuda = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent("Hola, ¿cómo va mi pedido " + codigo + "?");
    try {
      var p = await window.Store.estadoPedido(codigo);
      if (codigo !== _trackCodigo) return; // llegó la respuesta de una búsqueda anterior
      if (!p) {
        out.innerHTML = '<p class="track-msg">No encontramos el pedido <strong>' + esc(codigo) + "</strong>. " +
          "Si lo acabas de enviar, espera unos segundos e intenta de nuevo.</p>" +
          '<a class="btn-whatsapp" href="' + esc(waAyuda) + '" target="_blank" rel="noopener">Preguntar por WhatsApp</a>';
        return;
      }
      out.innerHTML = lineaDeTiempo(p) +
        '<a class="btn-copy track-wa" href="' + esc(waAyuda) + '" target="_blank" rel="noopener">💬 Escribirnos por este pedido</a>';
      // Actualiza solo mientras el pedido sigue en curso.
      if (_trackTimer) clearInterval(_trackTimer);
      if (p.estado !== "entregado" && p.estado !== "cancelado") {
        _trackTimer = setInterval(function () {
          if (elTrack.hidden) { clearInterval(_trackTimer); _trackTimer = null; return; }
          consultarSeguimiento(_trackCodigo);
        }, 30000);
      }
    } catch (e) {
      out.innerHTML = '<p class="track-msg">' + (e && e.code === "SIN_SQL"
        ? "El seguimiento en línea se está activando. Mientras tanto, pregúntanos por WhatsApp."
        : "No pudimos consultar ahora mismo. Revisa tu conexión e intenta de nuevo.") + "</p>" +
        '<a class="btn-whatsapp" href="' + esc(waAyuda) + '" target="_blank" rel="noopener">Preguntar por WhatsApp</a>';
    }
  }

  function horaCorta(iso) {
    try { return new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }); }
    catch (e) { return ""; }
  }

  function lineaDeTiempo(p) {
    var cancelado = p.estado === "cancelado";
    var idx = -1;
    for (var i = 0; i < PASOS.length; i++) if (PASOS[i].e === p.estado) idx = i;
    var items = Array.isArray(p.items) ? p.items : [];
    var pasos = PASOS.map(function (s, i) {
      var clase = cancelado ? "tpaso--off" : i < idx ? "tpaso--hecho" : i === idx ? "tpaso--actual" : "tpaso--off";
      return '<li class="tpaso ' + clase + '"><span class="tpaso__punto"></span><div><strong>' + esc(s.t) +
        "</strong>" + (i === idx && !cancelado ? "<span>" + esc(s.d) + "</span>" : "") + "</div></li>";
    }).join("");
    return '<div class="track-card">' +
        '<div class="track-card__head"><span class="track-card__codigo">' + esc(p.codigo) + "</span>" +
          '<span class="estado-pill estado-pill--' + esc(p.estado) + '">' +
            esc(cancelado ? "Cancelado" : (PASOS[idx] || { t: p.estado }).t) + "</span></div>" +
        '<p class="muted track-card__fecha">Pedido ' + esc(horaCorta(p.creado_en)) +
          (p.actualizado && p.actualizado !== p.creado_en ? " · actualizado " + esc(horaCorta(p.actualizado)) : "") + "</p>" +
        (cancelado
          ? '<p class="track-cancel">Este pedido fue cancelado' + (p.incidencia ? ": " + esc(p.incidencia) : ".") + "</p>"
          : '<ol class="tpasos">' + pasos + "</ol>") +
        (items.length ? '<details class="track-items"><summary>Ver productos (' + items.length + ")</summary><ul>" +
          items.map(function (x) {
            return "<li>" + esc(x.cantidad) + " × " + esc(x.plato) + ' <span class="muted">· ' + esc(x.restaurante) + "</span>" +
              (x.nota ? '<br><span class="muted">✏️ ' + esc(x.nota) + "</span>" : "") + "</li>";
          }).join("") + "</ul>" +
          (p.total ? '<p class="track-total">Productos: <strong>' + esc(money(p.total)) + "</strong></p>" : "") +
          "</details>" : "") +
      "</div>";
  }

  // Enlace directo: .../servicios-ghost/#pedido=GH-XXXXXX
  function revisarHash() {
    // "#pedido=" vacío (atajo de la app instalada) abre con el último pedido.
    var m = location.hash.match(/^#pedido=([A-Za-z0-9-]*)/);
    if (m) { abrirSeguimiento(decodeURIComponent(m[1])); return; }
    // Enlace propio de cada negocio: .../#r=atemporal
    var mr = location.hash.match(/^#r=([a-z0-9-]+)(&previa=1)?/i);
    if (mr) {
      var id = mr[1].toLowerCase();
      var oculto = TODOS.filter(function (r) { return r.id === id && r.visible === false; })[0];
      PREVIA = oculto && mr[2] ? oculto : null;
      if (findRest(id)) { if (vistaActual !== id) abrirCarta(id); }
    }
  }
  function enlaceNegocio(id) { return location.origin + location.pathname + "#r=" + encodeURIComponent(id); }
  async function compartirNegocio(id) {
    var r = findRest(id);
    if (!r) return;
    var url = enlaceNegocio(id);
    var datos = { title: r.nombre + " · Servicios Ghost", text: "Mira la carta de " + r.nombre + " y pide a domicilio 🛵", url: url };
    try {
      if (navigator.share) { await navigator.share(datos); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); toast("Enlace copiado ✓ Pégalo en WhatsApp"); }
    catch (e) { prompt("Copia este enlace:", url); }
  }
  window.addEventListener("hashchange", revisarHash);

  // Repinta la hoja del pedido sin perder lo que el cliente ya escribió.
  function repintarHojaConservando() {
    var form = $("#pedidoForm");
    var valores = {};
    if (form) {
      [].forEach.call(form.elements, function (el) {
        if (!el.name) return;
        if (el.type === "radio") { if (el.checked) valores[el.name] = el.value; }
        else valores[el.name] = el.value;
      });
    }
    renderSheet();
    form = $("#pedidoForm");
    if (!form) return;
    [].forEach.call(form.elements, function (el) {
      if (!el.name || !(el.name in valores)) return;
      if (el.type === "radio") el.checked = el.value === valores[el.name];
      else if (el.tagName === "SELECT") {
        // El barrio escrito a mano pasa a la lista si ahora existe ahí.
        var opt = [].filter.call(el.options, function (o) { return o.value === valores[el.name]; })[0];
        if (opt) el.value = valores[el.name];
      } else el.value = valores[el.name];
    });
    if (!$("#fBarrio") || $("#fBarrio").tagName !== "SELECT" || !valores.barrio) {
      // nada más que hacer
    } else if ($("#fBarrio").value !== valores.barrio && valores.barrio) {
      $("#fBarrio").value = BARRIO_OTRO;
      var otro = $("#fBarrioOtro"); if (otro) { otro.hidden = false; otro.value = valores.barrio; }
    }
    form.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /* --------------------------- Avisos (toast) --------------------- */
  function toast(msg, ms) {
    var t = document.createElement("div");
    t.className = "toast-app";
    t.setAttribute("role", "status");
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("toast-app--ver"); });
    setTimeout(function () {
      t.classList.remove("toast-app--ver");
      setTimeout(function () { t.remove(); }, 300);
    }, ms || 2800);
  }

  /* --------------------------- Instalar app ----------------------- */
  var _promptInstalar = null;
  var elInstalar = document.getElementById("btnInstalar");
  var esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var yaInstalada = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    _promptInstalar = e;
    if (elInstalar) elInstalar.hidden = false;
  });
  window.addEventListener("appinstalled", function () {
    if (elInstalar) elInstalar.hidden = true;
    toast("¡Listo! Servicios Ghost quedó instalada 👻");
  });
  if (elInstalar && esIOS && !yaInstalada) elInstalar.hidden = false;
  function instalarApp() {
    if (_promptInstalar) {
      _promptInstalar.prompt();
      _promptInstalar.userChoice.finally(function () { _promptInstalar = null; });
      return;
    }
    if (esIOS) toast("En iPhone: toca el botón Compartir y luego “Agregar a inicio”.", 6000);
  }
  /* ---------- Fantasma flotante: menú con todo lo que se puede hacer ---------- */
  var elFab = document.getElementById("fab");
  var elFabBtn = document.getElementById("fabBtn");
  var elFabMenu = document.getElementById("fabMenu");
  var LS_FAB_VISTO = "ghost_fab_visto_v1";

  function fabOpcion(ico, titulo, sub, attrs, clase) {
    return '<button type="button" role="menuitem" class="fab__op' + (clase ? " " + clase : "") + '" ' + attrs + ">" +
      '<span class="fab__ico" aria-hidden="true">' + ico + "</span>" +
      '<span class="fab__txt"><strong>' + titulo + "</strong>" + (sub ? "<small>" + sub + "</small>" : "") + "</span></button>";
  }

  function fabOpcionesHTML() {
    var html = "", n = totalProductos();
    var r = vistaActual ? findRest(vistaActual) : null;
    var cuenta = function (f) { return DATA.filter(function (x) { return cumpleFiltro(x, f); }).length; };

    // Lo más importante primero: su pedido.
    if (n > 0) html += fabOpcion("🛒", "Ver mi pedido", (n === 1 ? "1 producto" : n + " productos") + " · " + money(totalPesos()), 'data-fab="pedido"', "fab__op--dorado");
    else if (ultimoPedido()) html += fabOpcion("🔁", "Repetir mi último pedido", "Lo mismo de la vez pasada", "data-repetir");

    if (r) html += fabOpcion("🍽️", "Ver todos los restaurantes", "Salir de " + esc(r.nombre), 'data-fab="restaurantes"');
    html += fabOpcion("🔍", "Buscar un plato", "En todos los restaurantes", 'data-fab="buscar"');

    var abiertos = cuenta("abiertos");
    if (abiertos && abiertos < DATA.length) html += fabOpcion("🟢", "Abiertos ahora", abiertos + " de " + DATA.length + " restaurantes", 'data-fab="filtro" data-f="abiertos"');
    else if (!r) html += fabOpcion("🍽️", "Ver los restaurantes", abiertos ? "Todos abiertos ahora" : "Ahora están cerrados", 'data-fab="restaurantes"');
    var alm = cuenta("almuerzo"), des = cuenta("desayuno");
    if (alm) html += fabOpcion("🍲", "Almuerzos de hoy", alm + (alm === 1 ? " restaurante" : " restaurantes"), 'data-fab="filtro" data-f="almuerzo"');
    if (des) html += fabOpcion("🍳", "Desayunos de hoy", des + (des === 1 ? " restaurante" : " restaurantes"), 'data-fab="filtro" data-f="desayuno"');
    var pro = cuenta("promos");
    if (pro) html += fabOpcion("🔥", "Promociones", pro + (pro === 1 ? " restaurante" : " restaurantes"), 'data-fab="filtro" data-f="promos"');

    html += fabOpcion("📦", "Seguir mi pedido", "¿Cómo va lo que pedí?", 'data-track-open=""');
    html += '<a role="menuitem" class="fab__op" data-fab="wa" target="_blank" rel="noopener" href="https://wa.me/' + WHATSAPP + "?text=" +
      encodeURIComponent("Hola " + NOMBRE_NEGOCIO + (r ? ", tengo una pregunta sobre " + r.nombre + "." : ", quiero hacer un pedido.")) + '">' +
      '<span class="fab__ico" aria-hidden="true">💬</span><span class="fab__txt"><strong>Escribirnos por WhatsApp</strong><small>Te ayudamos con tu pedido</small></span></a>';
    if (r && r.visible !== false) html += fabOpcion("🔗", "Compartir este restaurante", "Envíale la carta a alguien", 'data-compartir="' + esc(r.id) + '"');
    if ((_promptInstalar || esIOS) && !yaInstalada) html += fabOpcion("📲", "Instalar la app", "Pide más rápido desde tu pantalla", 'data-fab="instalar"');
    if (!r) html += fabOpcion("❓", "¿Cómo funciona?", "Pedir en 3 pasos", 'data-fab="como"');
    if (window.scrollY > 600) html += fabOpcion("⬆️", "Volver arriba", "", 'data-fab="arriba"');
    return '<div class="fab__cab">👻 ¿Qué quieres hacer?</div>' + html;
  }

  function abrirFab() {
    if (!elFab) return;
    elFabMenu.innerHTML = fabOpcionesHTML();
    elFabMenu.hidden = false;
    elFab.querySelector(".fab__fondo").hidden = false;
    elFab.classList.add("fab--abierto");
    elFabBtn.setAttribute("aria-expanded", "true");
    ocultarPistaFab();
    var primero = elFabMenu.querySelector(".fab__op");
    if (primero && primero.focus) primero.focus({ preventScroll: true });
  }
  function cerrarFab(devolverFoco) {
    if (!elFab || elFabMenu.hidden) return;
    elFabMenu.hidden = true;
    elFab.querySelector(".fab__fondo").hidden = true;
    elFab.classList.remove("fab--abierto");
    elFabBtn.setAttribute("aria-expanded", "false");
    if (devolverFoco) elFabBtn.focus({ preventScroll: true });
  }
  function irASeccionInicio(id) {
    if (vistaActual) irAInicio();
    var el = document.getElementById(id);
    var alto = (document.querySelector(".header") || {}).offsetHeight || 0;
    if (el) setTimeout(function () { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - alto - 8, behavior: "smooth" }); }, 30);
  }
  function accionFab(op) {
    var a = op.getAttribute("data-fab");
    if (a === "pedido") openSheet();
    else if (a === "restaurantes") {
      var ir = function () { irAInicio(); limpiarFiltros(); irASeccionInicio("restaurantes"); };
      if (vistaActual) conTransicion(ir); else ir();
    }
    else if (a === "buscar") {
      if (vistaActual) irAInicio();
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(function () { elBuscador.focus(); }, 250);
    } else if (a === "filtro") {
      var f = op.getAttribute("data-f");
      if (filtroCategoria !== f) aplicarFiltro(f);
      else { if (vistaActual) irAInicio(); irAResultados(); }
    } else if (a === "instalar") instalarApp();
    else if (a === "como") irASeccionInicio("como-funciona");
    else if (a === "arriba") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function mostrarPistaFab() {
    var p = document.getElementById("fabPista");
    try { if (!p || localStorage.getItem(LS_FAB_VISTO)) return; } catch (e) { return; }
    p.hidden = false;
    setTimeout(ocultarPistaFab, 7000);
  }
  function ocultarPistaFab() {
    var p = document.getElementById("fabPista");
    if (p && !p.hidden) { p.hidden = true; try { localStorage.setItem(LS_FAB_VISTO, "1"); } catch (e) { /* sin almacenamiento */ } }
  }

  // Número de productos del pedido sobre el fantasma.
  function actualizarFab() {
    var b = document.getElementById("fabBadge");
    if (!b) return;
    var n = totalProductos();
    b.hidden = n <= 0;
    b.textContent = n > 99 ? "99+" : String(n);
  }

  if (elFab) {
    elFabBtn.addEventListener("click", function () { if (elFabMenu.hidden) abrirFab(); else cerrarFab(); });
    elFab.addEventListener("click", function (e) {
      if (e.target.closest("[data-fab-cerrar]")) { cerrarFab(); return; }
      var op = e.target.closest(".fab__op");
      if (!op) return;
      // Las opciones con data-repetir, data-track-open o data-compartir las
      // atiende el manejador general; aquí solo cerramos el menú.
      if (op.hasAttribute("data-fab") && op.getAttribute("data-fab") !== "wa") accionFab(op);
      cerrarFab();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarFab(true); });

    // Se esconde al bajar (para no tapar la carta) y vuelve al subir.
    var _yFab = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (Math.abs(y - _yFab) < 12) return;
      if (elFabMenu.hidden) elFab.classList.toggle("fab--escondido", y > _yFab && y > 240);
      _yFab = y;
    }, { passive: true });

    actualizarFab();
    setTimeout(mostrarPistaFab, 2500);
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* sin app offline */ });
    });
  }

  // Enlaces de WhatsApp del hero y el llamado final (si existen).
  function conectarEnlacesWa() {
    var url = "https://wa.me/" + WHATSAPP + "?text=" +
      encodeURIComponent("Hola " + NOMBRE_NEGOCIO + ", quiero hacer un pedido.");
    ["heroWa", "ctaWa"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.setAttribute("href", url);
    });
  }

  /* --------------------------- Arranque --------------------------- */

  // Seguridad: aseguramos que la hoja empiece SIEMPRE cerrada al cargar.
  closeSheet();

  function pintarTodo() {
    // actualizarVista pinta promos, recomendado, populares, chips y restaurantes
    // (o solo los resultados si el cliente está buscando o filtrando).
    renderMenuDia();
    actualizarVista();
    renderRepetir();
    refreshCart();
  }

  // Primer pintado con lo que haya (data.js) para que no se vea vacío.
  conectarEnlacesWa();
  pintarTodo();
  revisarHash();

  // Luego traemos los datos de la nube (restaurantes + ajustes) y repintamos.
  if (window.Store && typeof window.Store.listar === "function") {
    window.Store.listar()
      .then(function (lista) {
        if (Array.isArray(lista) && lista.length) {
          cargarRestaurantes(lista);
          // Si ya había una carta abierta (enlace directo o vista previa), se
          // vuelve a pintar con los datos reales: foto de portada, precios, etc.
          if (vistaActual && findRest(vistaActual)) {
            var yCarta = window.scrollY;
            abrirCarta(vistaActual);
            window.scrollTo(0, yCarta);
          } else if (/^#r=/.test(location.hash)) revisarHash();
          // Con la lista definitiva ya cargada, quitamos del carrito lo que no existe.
          limpiarHuerfanos();
          pintarTodo();
        }
      })
      .catch(function () { /* ya mostramos el respaldo */ });
  }
  if (window.Store && typeof window.Store.leerAjustes === "function") {
    window.Store.leerAjustes()
      .then(function (a) {
        if (!a) return;
        AJUSTES = a;
        renderPromos();
        renderPopulares();
        if (!elSheet.hidden && !_mostrandoConfirmacion) repintarHojaConservando();
      })
      .catch(function () { /* sin ajustes: valores por defecto */ });
  }

  // Los horarios cambian con la hora: repintamos cada minuto (y al volver a la pestaña).
  function refrescarHorarios() {
    if (!elVistaInicio.hidden) { renderMenuDia(); renderChips(); renderGrid(); renderResumen(); }
  }
  setInterval(refrescarHorarios, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refrescarHorarios(); });
})();
