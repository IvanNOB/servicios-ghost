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

  // Estilo de portada: imagen si existe, si no un degradado del color.
  function coverStyle(r) {
    if (r.logo) {
      return "background-image:url('" + esc(r.logo) + "')";
    }
    var c = esc(r.color || "#3b82f6");
    return "background-image:linear-gradient(135deg, " + c + ", " + c + "99)";
  }

  // Busca un restaurante por id.
  function findRest(id) {
    for (var i = 0; i < DATA.length; i++) {
      if (DATA[i].id === id) return DATA[i];
    }
    return null;
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

  // ¿El restaurante tiene almuerzo publicado para HOY?
  // - Si el almuerzo tiene "fecha", solo vale ese día (se publica a diario
  //   desde el panel admin → pestaña "Almuerzos del día").
  // - Si no tiene fecha (datos antiguos), se considera permanente.
  function almuerzoVigente(r) {
    var a = r && r.almuerzo;
    if (!a || !a.activo) return false;
    if (a.fecha && a.fecha !== hoyISO()) return false;
    return true;
  }

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
  var LS_ARMADOS = "ghost_armados_v1";
  var cart = loadCart();          // { "restId::itemId": qty }
  almuerzosArmados = loadArmados();
  var filtroCategoria = "Todos";
  var termino = "";
  var vistaActual = null;         // null = inicio, o id de restaurante

  // Lista de restaurantes en memoria. Se llena desde el Store al arrancar
  // (Supabase si está configurado, o data.js como respaldo).
  var DATA = (typeof RESTAURANTES !== "undefined" ? RESTAURANTES.slice() : []);

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
      var vencido = !!(arm && arm._almuerzo && !almuerzoVigente(r));  // almuerzo de otro día
      if (r && arm && arm._base) {
        // Combo (salsa, tamaño…): se rehace con los precios y agotados de HOY.
        var base = findItem(r.id, arm._base);
        var nuevo = base && !base.agotado && tieneOpciones(base) ? armarCombo(r, base, arm._elec || []) : null;
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

  /* ---------------------------- Chips ----------------------------- */

  function categorias() {
    var cats = ["Todos"];
    // Si algún restaurante ofrece almuerzo, añadimos la categoría especial.
    var hayAlmuerzo = DATA.some(almuerzoVigente);
    if (hayAlmuerzo) cats.push("🍽️ Almuerzos");
    for (var i = 0; i < DATA.length; i++) {
      if (cats.indexOf(DATA[i].cat) === -1) cats.push(DATA[i].cat);
    }
    return cats;
  }

  function renderChips() {
    var cats = categorias();
    var html = "";
    for (var i = 0; i < cats.length; i++) {
      var activo = cats[i] === filtroCategoria;
      html +=
        '<button type="button" class="chip" data-chip="' + esc(cats[i]) +
        '" aria-pressed="' + (activo ? "true" : "false") + '">' +
        esc(cats[i]) + "</button>";
    }
    elChips.innerHTML = html;
  }

  /* --------------------- Lista de restaurantes -------------------- */

  function matchBusqueda(r, q) {
    if (!q) return true;
    if (r.nombre.toLowerCase().indexOf(q) !== -1) return true;
    for (var s = 0; s < r.carta.length; s++) {
      var items = r.carta[s].items;
      for (var i = 0; i < items.length; i++) {
        if (items[i].n.toLowerCase().indexOf(q) !== -1) return true;
      }
    }
    return false;
  }

  function restaurantesFiltrados() {
    var q = termino.trim().toLowerCase();
    return DATA.filter(function (r) {
      var catOk;
      if (filtroCategoria === "🍽️ Almuerzos") {
        catOk = almuerzoVigente(r);
      } else {
        catOk = filtroCategoria === "Todos" || r.cat === filtroCategoria;
      }
      return catOk && matchBusqueda(r, q);
    });
  }

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
      var cover = r.logo
        ? '<div class="card__cover" style="background-image:url(\'' + esc(r.logo) + '\')"></div>'
        : '<div class="card__cover">' +
          '<span class="card__initials">' + esc(iniciales(r.nombre)) + "</span></div>";

      // Enlace de acción: La Arepazo (con almuerzo) invita a armar almuerzo.
      var tieneAlmuerzo = almuerzoVigente(r);
      var enlace = tieneAlmuerzo ? "Armar almuerzo →" : "Ver carta →";

      html +=
        '<button type="button" class="card' + (abiertoAhora(r) ? "" : " card--cerrado") + '" data-rest="' + esc(r.id) +
        '" aria-label="Ver la carta de ' + esc(r.nombre) + '">' +
          cover +
          '<div class="card__body">' +
            '<div class="card__name">' + esc(r.nombre) + "</div>" +
            '<div class="card__meta"><span>' + esc(r.cat) +
              '</span><span class="dot">·</span><span>' + esc(r.tiempo) + "</span></div>" +
            '<div class="card__meta">' + estadoHTML(r) + "</div>" +
            '<span class="card__link">' + enlace + "</span>" +
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
      ? '<div class="rest-head__cover" style="' + coverStyle(r) + '"></div>'
      : '<div class="rest-head__cover" style="' + coverStyle(r) + '">' +
        '<span class="card__initials">' + esc(iniciales(r.nombre)) + "</span></div>";

    // Bloque del almuerzo del día (si el restaurante lo tiene activo)
    var almuerzoBloque = almuerzoHTML(r);

    var secciones = "";
    for (var s = 0; s < r.carta.length; s++) {
      var sec = r.carta[s];
      var platos = "";
      for (var i = 0; i < sec.items.length; i++) {
        platos += dishHTML(r, sec.items[i]);
      }
      secciones +=
        '<div class="section"><h3 class="section__title">' + esc(sec.sec) +
        "</h3>" + platos + "</div>";
    }

    elVistaCarta.innerHTML =
      '<button type="button" class="back-btn" data-back>← Todos los restaurantes</button>' +
      '<div class="rest-head">' + cover +
        "<div>" +
          '<h1 class="rest-head__name">' + esc(r.nombre) + "</h1>" +
          '<p class="rest-head__desc">' + esc(r.desc) + "</p>" +
          '<div class="rest-head__meta"><span>⏱ ' + esc(r.tiempo) + "</span>" +
            estadoHTML(r) + "</div>" +
        "</div>" +
      "</div>" + almuerzoBloque + secciones;

    elVistaInicio.hidden = true;
    elVistaCarta.hidden = false;
    window.scrollTo(0, 0);
  }

  function dishHTML(r, it) {
    var qty = getQty(r.id, it.id);
    var agotadoClase = it.agotado ? " dish--agotado" : "";
    var etiqueta = it.agotado ? ' <span class="agotado-tag">Agotado</span>' : "";
    // Plato con opciones a elegir (ej. salsa de las alitas).
    if (tieneOpciones(it) && !it.agotado && abiertoAhora(r)) {
      // "desde $X" si algún grupo cambia el precio (hay tamaños/variantes).
      var variaPrecio = it.opciones.some(grupoTienePrecios);
      var precioMostrar = it.p > 0 ? (variaPrecio ? "desde " : "") + money(it.p) : precioTxt(0);
      return (
        '<div class="dish dish--opciones' + (it.foto ? ' dish--foto' : '') + '" data-dish data-rest="' + esc(r.id) + '" data-item="' + esc(it.id) + '">' +
          fotoHTML(it) +
          '<div class="dish__info">' +
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
          '<div class="dish__name">' + esc(it.n) + etiqueta + "</div>" +
          '<div class="dish__desc">' + esc(it.d) + "</div>" +
          '<div class="dish__price' + (it.p > 0 ? "" : " dish__price--confirmar") + '">' + esc((it.p > 0 && tieneOpciones(it) ? "desde " : "") + precioTxt(it.p)) + "</div>" +
        "</div>" +
        '<div class="dish__action">' + controlHTML(r, it, qty) + "</div>" +
      "</div>"
    );
  }

  // Foto del plato (si la subieron en el panel). Carga diferida: no gasta datos
  // hasta que el cliente baja hasta ese plato.
  function fotoHTML(it) {
    if (!it.foto) return "";
    return '<img class="dish__foto" src="' + esc(it.foto) + '" alt="' + esc(it.n) + '" loading="lazy" decoding="async" width="96" height="96" />';
  }

  // ¿El plato ofrece opciones a elegir (grupos tipo salsa)?
  function tieneOpciones(it) {
    return Array.isArray(it.opciones) && it.opciones.length > 0;
  }

  // ¿Alguna opción de este grupo cambia el precio del plato?
  function grupoTienePrecios(g) {
    return (g.opciones || []).some(function (op) { return Number(op.precio) > 0; });
  }

  // Selector de opciones + botón "Agregar" para un plato (ej. salsa o tamaño).
  function opcionesPlatoHTML(r, it) {
    var html = '<div class="dish-opc" data-rest="' + esc(r.id) + '" data-item="' + esc(it.id) + '">';
    for (var gi = 0; gi < it.opciones.length; gi++) {
      var g = it.opciones[gi];
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
    html += '<button type="button" class="add-btn dish-opc__add" data-opc-add ' +
      'data-rest="' + esc(r.id) + '" data-item="' + esc(it.id) + '">Agregar</button>';
    return html + "</div>";
  }

  // Construye la línea "plato + opciones elegidas" con el precio ACTUAL.
  // elecciones = valor elegido por cada grupo (en orden). Devuelve null si
  // alguna opción ya no existe o está agotada (ej. al repetir un pedido viejo).
  function armarCombo(r, it, elecciones) {
    var extra = 0, valores = [];
    for (var gi = 0; gi < it.opciones.length; gi++) {
      var g = it.opciones[gi] || {}, val = elecciones[gi];
      var op = (g.opciones || []).filter(function (o) { return o.n === val && !o.agotado; })[0];
      if (!op) return null;
      extra += Number(op.precio) || 0;
      valores.push(val);
    }
    var sufijo = valores.join(", ");
    // id único por combinación: así "4 alitas BBQ" y "4 alitas Maracuyá" no se mezclan.
    return {
      id: it.id + "--" + slug(sufijo),
      n: it.n + (sufijo ? " (" + sufijo + ")" : ""),
      d: it.d || "",
      p: it.p + extra,
      _combo: true,
      _base: it.id,
      _elec: valores,
    };
  }

  // Lee las opciones elegidas de un plato y lo agrega al carrito como línea única.
  function agregarPlatoConOpciones(restId, itemId) {
    var r = findRest(restId);
    var it = r ? findItem(restId, itemId) : null;
    if (!r || !it || !tieneOpciones(it)) return;
    var cont = elVistaCarta.querySelector('.dish-opc[data-item="' + cssId(itemId) + '"]');
    if (!cont) return;

    var elecciones = [];
    cont.querySelectorAll("[data-opc]").forEach(function (sel) {
      elecciones[Number(sel.getAttribute("data-opc"))] = sel.value;
    });
    var combo = armarCombo(r, it, elecciones);
    if (!combo) return;
    almuerzosArmados[combo.id] = { restId: r.id, item: combo };
    setQty(r.id, combo.id, getQty(r.id, combo.id) + 1);
    refreshCart();
    repintarPlato(r.id, it.id);

    // Feedback breve en el botón.
    var btn = cont.querySelector("[data-opc-add]");
    if (btn) {
      var antes = btn.textContent;
      btn.textContent = "¡Agregado! ✓";
      btn.classList.add("add-btn--ok");
      setTimeout(function () { btn.textContent = antes; btn.classList.remove("add-btn--ok"); }, 1200);
    }
  }

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

  /* ----------------------- Almuerzo del día ----------------------- */

  // Devuelve el HTML del armador de almuerzo, o "" si el restaurante no lo tiene.
  function almuerzoHTML(r) {
    if (!almuerzoVigente(r)) return "";
    var a = r.almuerzo;
    // Puede no tener grupos: un almuerzo fijo ("lo que hay hoy") con su precio.
    var grupos = Array.isArray(a.grupos) ? a.grupos : [];

    var gruposHTML = "";
    for (var gi = 0; gi < grupos.length; gi++) {
      var g = grupos[gi];
      var ops = Array.isArray(g.opciones) ? g.opciones : [];
      var multiple = g.tipo === "multiple";
      var opsHTML = "";
      for (var oi = 0; oi < ops.length; oi++) {
        var op = ops[oi];
        var agot = !!op.agotado;
        var etqPrecio = (typeof op.precio === "number" && op.precio > 0)
          ? ' <span class="alm-op__precio">' + esc(money(op.precio)) + "</span>" : "";
        opsHTML +=
          '<label class="alm-op' + (agot ? " alm-op--agotado" : "") + '">' +
            '<input type="' + (multiple ? "checkbox" : "radio") + '" name="alm-g' + gi + '" ' +
              'value="' + esc(op.n) + '"' + (agot ? " disabled" : "") + ' />' +
            "<span>" + esc(op.n) + (agot ? " (agotado)" : "") + etqPrecio + "</span>" +
          "</label>";
      }
      // Visibilidad condicional: el grupo puede depender de otra elección.
      var condAttr = "";
      var ocultoInicial = "";
      if (g.mostrarSi && g.mostrarSi.grupo && g.mostrarSi.valor) {
        condAttr =
          ' data-mostrar-si-grupo="' + esc(g.mostrarSi.grupo) + '"' +
          ' data-mostrar-si-valor="' + esc(g.mostrarSi.valor) + '"';
        ocultoInicial = ' hidden'; // oculto hasta que se cumpla la condición
      }

      gruposHTML +=
        '<div class="alm-grupo" data-alm-grupo="' + gi + '" data-tipo="' + (multiple ? "multiple" : "unico") + '"' +
          condAttr + ocultoInicial + ">" +
          '<div class="alm-grupo__nombre">' + esc(g.nombre) +
            (multiple ? ' <span class="muted">(elige los que quieras)</span>' : ' <span class="muted">(elige 1)</span>') +
          "</div>" +
          '<div class="alm-ops">' + opsHTML + "</div>" +
        "</div>";
    }

    var precio = a.precio ? money(a.precio) : "";
    return (
      '<div class="almuerzo" id="almuerzoBox" data-rest="' + esc(r.id) + '">' +
        '<div class="almuerzo__head">' +
          '<h3 class="section__title">🍽️ ' + esc(a.titulo || "Almuerzo del día") + "</h3>" +
          (precio ? '<span class="almuerzo__precio">' + esc(precio) + "</span>" : "") +
        "</div>" +
        (a.desc ? '<p class="almuerzo__desc">' + esc(a.desc) + "</p>" : "") +
        gruposHTML +
        '<button type="button" class="add-btn almuerzo__btn" data-alm-add' +
          (abiertoAhora(r) ? "" : " disabled") + '>' +
          (abiertoAhora(r) ? "Agregar almuerzo" : "Cerrado") +
        "</button>" +
        '<p class="almuerzo__error" id="almError" role="alert"></p>' +
      "</div>"
    );
  }

  // Muestra/oculta los grupos condicionales según lo elegido.
  // Ej: el grupo "Sopa" solo se ve si en "Opción" se eligió "Completo (con sopa)".
  function actualizarVisibilidadAlmuerzo() {
    var box = document.getElementById("almuerzoBox");
    if (!box) return;

    // Mapa: nombre de grupo -> valor(es) elegido(s)
    var elegidos = {};
    box.querySelectorAll("[data-alm-grupo]").forEach(function (gEl) {
      var nombre = (gEl.querySelector(".alm-grupo__nombre") || {}).textContent || "";
      // Usamos el texto antes del "(elige...)" como clave; mejor: data del grupo.
    });

    // Más fiable: recorremos los inputs marcados y guardamos por nombre de grupo real.
    var valoresPorGrupo = {};
    var grupos = (findRest(vistaActual) || {}).almuerzo;
    grupos = grupos && grupos.grupos ? grupos.grupos : [];
    box.querySelectorAll("[data-alm-grupo]").forEach(function (gEl) {
      var gi = Number(gEl.getAttribute("data-alm-grupo"));
      var def = grupos[gi] || {};
      var marcado = gEl.querySelector("input:checked");
      if (marcado) valoresPorGrupo[def.nombre] = marcado.value;
    });

    // Aplicar condiciones
    box.querySelectorAll("[data-mostrar-si-grupo]").forEach(function (gEl) {
      var grupoCond = gEl.getAttribute("data-mostrar-si-grupo");
      var valorCond = gEl.getAttribute("data-mostrar-si-valor");
      var cumple = valoresPorGrupo[grupoCond] === valorCond;
      gEl.hidden = !cumple;
      // Si se oculta, desmarcamos sus opciones para no arrastrar elecciones viejas.
      if (!cumple) {
        gEl.querySelectorAll("input:checked").forEach(function (c) { c.checked = false; });
      }
    });
  }

  // Lee las opciones escogidas y agrega el almuerzo armado al carrito.
  function agregarAlmuerzo() {
    var r = findRest(vistaActual);
    if (!r || !almuerzoVigente(r)) return;
    var box = document.getElementById("almuerzoBox");
    var err = document.getElementById("almError");
    if (!box) return;

    var grupos = r.almuerzo.grupos || [];
    var elecciones = [];
    var faltan = [];
    var precioOpcion = null;  // si alguna opción define precio, manda sobre el base

    var gruposEl = box.querySelectorAll("[data-alm-grupo]");
    for (var i = 0; i < gruposEl.length; i++) {
      var gEl = gruposEl[i];
      // Si el grupo está oculto (condición no cumplida), lo ignoramos.
      if (gEl.hidden) continue;
      var gi = Number(gEl.getAttribute("data-alm-grupo"));
      var def = grupos[gi] || {};
      var defOps = Array.isArray(def.opciones) ? def.opciones : [];
      var marcados = gEl.querySelectorAll("input:checked");
      if (marcados.length === 0) {
        // Un grupo es opcional solo si está marcado así; por defecto exige 1.
        if (!def.opcional) { faltan.push(def.nombre || "una opción"); continue; }
      }
      var vals = [];
      for (var m = 0; m < marcados.length; m++) {
        var val = marcados[m].value;
        vals.push(val);
        // Si la opción elegida tiene un precio propio, lo usamos como precio del almuerzo.
        for (var d = 0; d < defOps.length; d++) {
          if (defOps[d].n === val && typeof defOps[d].precio === "number" && defOps[d].precio > 0) {
            precioOpcion = defOps[d].precio;
          }
        }
      }
      if (vals.length) elecciones.push({ grupo: def.nombre, valores: vals });
    }

    if (faltan.length) {
      if (err) err.textContent = "Falta escoger: " + faltan.join(", ") + ".";
      return;
    }
    if (err) err.textContent = "";

    // Precio final: el de la opción elegida (si existe) o el base del almuerzo.
    var precioFinal = precioOpcion != null ? precioOpcion : (r.almuerzo.precio || 0);

    // Creamos un "plato" dinámico que representa este almuerzo armado.
    var resumen = elecciones.map(function (e) { return e.valores.join(", "); }).join(" · ");
    var almItem = {
      id: "almuerzo-" + Date.now().toString(36),
      n: (r.almuerzo.titulo || "Almuerzo") + (resumen ? " (" + resumen + ")" : ""),
      d: "",
      p: precioFinal,
      _almuerzo: true,
    };
    // Guardamos este item temporal en un registro para que el carrito lo encuentre.
    almuerzosArmados[almItem.id] = { restId: r.id, item: almItem };
    setQty(r.id, almItem.id, 1);
    refreshCart();

    // Feedback
    if (err) { err.textContent = "¡Almuerzo agregado! ✓"; err.classList.add("almuerzo__error--ok"); }
    // Limpiar selección
    box.querySelectorAll("input:checked").forEach(function (c) { c.checked = false; });
  }

  function irAInicio() {
    vistaActual = null;
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
  function mostrarConfirmacion(waUrl, codigo) {
    _mostrandoConfirmacion = true;
    elSheetBody.innerHTML =
      '<div class="confirm">' +
        '<div class="confirm__ico" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>' +
        "</div>" +
        '<h3 class="confirm__title">¡Pedido enviado!</h3>' +
        '<p class="confirm__text">Abrimos WhatsApp para que confirmes tu pedido con nosotros. ' +
          "Si no se abrió, toca el botón de abajo.</p>" +
        '<div class="confirm__codigo">Tu código: <strong>' + esc(codigo) + "</strong></div>" +
        '<a class="btn-whatsapp" href="' + esc(waUrl) + '" target="_blank" rel="noopener">Abrir WhatsApp</a>' +
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
          "</div>";
      }
      gruposHTML +=
        '<div class="cart-group"><div class="cart-group__name">' +
        esc(g.rest.nombre) + "</div>" + lineas + "</div>";
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

      var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(construirMensaje(datos, codigo));
      mostrarConfirmacion(url, codigo);

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

  function construirMensaje(datos, codigo) {
    var groups = groupedCart();
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
      }
      lines.push("Subtotal: " + money(g.subtotal));
      lines.push("");
    }

    var productos = totalPesos();
    lines.push("--------------------------------");
    lines.push("Total productos: " + money(productos) +
      (hayPorConfirmar() ? " + productos con precio a confirmar" : ""));
    if (datos.domicilio != null) {
      lines.push("Domicilio (" + datos.barrio + "): " + (datos.domicilio > 0 ? money(datos.domicilio) : "gratis"));
      lines.push("TOTAL A PAGAR: " + money(productos + datos.domicilio) + (hayPorConfirmar() ? " + productos con precio a confirmar" : ""));
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
    if (t.closest("#logoHome")) { e.preventDefault(); if (!elSheet.hidden) closeSheet(); irAInicio(); return; }

    // --- Chips de categoría ---
    var chip = t.closest("[data-chip]");
    if (chip) {
      filtroCategoria = chip.getAttribute("data-chip");
      renderChips();
      renderGrid();
      return;
    }

    // --- Volver desde la carta ---
    if (t.closest("[data-back]")) { irAInicio(); return; }

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

    // --- Agregar almuerzo armado ---
    if (t.closest("[data-alm-add]")) { agregarAlmuerzo(); return; }

    // --- Tarjeta de "Almuerzos de hoy": abre la carta en el almuerzo ---
    var almVer = t.closest("[data-alm-ver]");
    if (almVer) {
      abrirCarta(almVer.getAttribute("data-alm-ver"));
      var box = document.getElementById("almuerzoBox");
      if (box && box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // --- Fila del escaparate: abre la carta de ese restaurante ---
    var escRow = t.closest(".esc__row");
    if (escRow) { abrirCarta(escRow.getAttribute("data-rest")); return; }

    // --- Abrir carta tocando una tarjeta ---
    var card = t.closest("[data-rest]");
    if (card && card.classList.contains("card")) {
      abrirCarta(card.getAttribute("data-rest"));
      return;
    }
  }

  // Un solo listener para toda la app (incluye lo que se repinta).
  document.addEventListener("click", onClick);

  // Cuando cambia una opción del almuerzo, actualizamos los grupos condicionales
  // (ej: mostrar/ocultar "Sopa" según se elija "Completo" o "Sin sopa").
  document.addEventListener("change", function (e) {
    if (e.target && e.target.closest && e.target.closest("#almuerzoBox")) {
      actualizarVisibilidadAlmuerzo();
    }
  });

  // Buscador
  elBuscador.addEventListener("input", function (e) {
    termino = e.target.value;
    if (vistaActual) irAInicio();
    renderGrid();
  });

  // Cerrar con Escape (teclado)
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && elTrack && !elTrack.hidden) { cerrarSeguimiento(); return; }
    if (e.key === "Escape" && !elSheet.hidden) closeSheet();
  });

  /* ---------------- Escaparate de platos al azar ------------------ */
  // Recoge todos los platos de todos los restaurantes (con su restaurante)
  // y muestra algunos al azar en el hero, rotándolos cada pocos segundos.
  function todosLosPlatos() {
    var out = [];
    for (var i = 0; i < DATA.length; i++) {
      var r = DATA[i];
      var carta = r.carta || [];
      for (var s = 0; s < carta.length; s++) {
        var items = carta[s].items || [];
        for (var j = 0; j < items.length; j++) {
          var it = items[j];
          if (it.agotado) continue;           // no mostramos agotados
          if (typeof it.p !== "number" || it.p <= 0) continue;
          out.push({ rest: r, item: it });
        }
      }
    }
    return out;
  }

  function barajar(arr) {
    arr = arr.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var k = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[k]; arr[k] = t;
    }
    return arr;
  }

  var _escTimer = null;
  function renderEscaparate() {
    var cont = document.getElementById("escaparate");
    if (!cont) return;

    // Para dar variedad, tomamos como máximo 1 plato al azar por restaurante
    // y luego barajamos esos; así se ven restaurantes distintos.
    var porRest = {};
    var todos = todosLosPlatos();
    for (var i = 0; i < todos.length; i++) {
      var rid = todos[i].rest.id;
      if (!porRest[rid]) porRest[rid] = [];
      porRest[rid].push(todos[i]);
    }
    var unoPorRest = [];
    for (var k in porRest) {
      var lista = barajar(porRest[k]);
      unoPorRest.push(lista[0]);
    }
    var platos = barajar(unoPorRest).slice(0, 4);
    if (!platos.length) { cont.innerHTML = ""; return; }

    var html = "";
    for (var i = 0; i < platos.length; i++) {
      var p = platos[i];
      var inicial = esc(iniciales(p.rest.nombre));
      var fotoMini = p.item.foto || p.rest.logo;
      var mini = fotoMini
        ? '<span class="esc__img" style="background-image:url(\'' + esc(fotoMini) + '\')"></span>'
        : '<span class="esc__img esc__img--ini">' + inicial + "</span>";
      html +=
        '<button type="button" class="esc__row" data-rest="' + esc(p.rest.id) + '" aria-label="Ver ' + esc(p.rest.nombre) + '">' +
          mini +
          '<span class="esc__info">' +
            '<span class="esc__plato">' + esc(p.item.n) + "</span>" +
            '<span class="esc__rest">' + esc(p.rest.nombre) + "</span>" +
          "</span>" +
          '<span class="esc__precio">' + esc((tieneOpciones(p.item) ? "desde " : "") + money(p.item.p)) + "</span>" +
        "</button>";
    }
    cont.innerHTML = html;
  }

  function iniciarEscaparate() {
    renderEscaparate();
    if (_escTimer) clearInterval(_escTimer);
    // Rota los platos cada 4 segundos (respeta reduce-motion: si está activo, no rota)
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      _escTimer = setInterval(function () {
        if (!elVistaInicio.hidden) renderEscaparate();
      }, 4000);
    }
  }

  /* --------------------- Almuerzos corrientes de hoy -------------- */
  // Sección propia en el inicio con todos los almuerzos publicados HOY.
  function renderAlmuerzosHoy() {
    var cont = document.getElementById("gridAlmuerzos");
    var vacio = document.getElementById("almuerzosVacio");
    if (!cont) return;
    var lista = DATA.filter(almuerzoVigente);
    if (!lista.length) {
      cont.innerHTML = "";
      if (vacio) vacio.hidden = false;
      return;
    }
    if (vacio) vacio.hidden = true;

    var html = "";
    for (var i = 0; i < lista.length; i++) {
      var r = lista[i];
      var a = r.almuerzo;
      // Resumen corto de las opciones: "Proteína: Pollo, Res, Cerdo"
      var resumen = "";
      var grupos = Array.isArray(a.grupos) ? a.grupos : [];
      for (var g = 0; g < grupos.length && g < 4; g++) {
        var ops = (grupos[g].opciones || [])
          .filter(function (o) { return !o.agotado; })
          .map(function (o) { return o.n; });
        if (!ops.length) continue;
        resumen += '<li><strong>' + esc(grupos[g].nombre) + ":</strong> " + esc(ops.join(", ")) + "</li>";
      }
      html +=
        '<article class="alm-card">' +
          '<div class="alm-card__head">' +
            '<span class="alm-card__rest">' + esc(r.nombre) + "</span>" +
            (a.precio ? '<span class="alm-card__precio">' + esc(money(a.precio)) + "</span>" : "") +
          "</div>" +
          '<div class="alm-card__titulo">🍲 ' + esc(a.titulo || "Almuerzo del día") + "</div>" +
          (a.desc ? '<p class="alm-card__desc">' + esc(a.desc) + "</p>" : "") +
          (resumen ? '<ul class="alm-card__ops">' + resumen + "</ul>" : "") +
          '<div class="alm-card__foot">' + estadoHTML(r) +
            '<button type="button" class="add-btn" data-alm-ver="' + esc(r.id) + '">Pedir almuerzo →</button>' +
          "</div>" +
        "</article>";
    }
    cont.innerHTML = html;
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

  // Abre la carta de un restaurante y, si se indica, resalta un plato.
  function irAPlato(restId, itemId) {
    if (!findRest(restId)) return;
    abrirCarta(restId);
    if (!itemId) return;
    var nodo = elVistaCarta.querySelector('[data-dish][data-item="' + cssId(itemId) + '"]');
    if (!nodo) return;
    setTimeout(function () {
      if (nodo.scrollIntoView) nodo.scrollIntoView({ behavior: "smooth", block: "center" });
      nodo.classList.add("dish--destacado");
      setTimeout(function () { nodo.classList.remove("dish--destacado"); }, 2200);
    }, 60);
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
        var combo = base && !base.agotado && tieneOpciones(base) ? armarCombo(r, base, l.armado._elec || []) : null;
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
            return "<li>" + esc(x.cantidad) + " × " + esc(x.plato) + ' <span class="muted">· ' + esc(x.restaurante) + "</span></li>";
          }).join("") + "</ul>" +
          (p.total ? '<p class="track-total">Productos: <strong>' + esc(money(p.total)) + "</strong></p>" : "") +
          "</details>" : "") +
      "</div>";
  }

  // Enlace directo: .../servicios-ghost/#pedido=GH-XXXXXX
  function revisarHash() {
    // "#pedido=" vacío (atajo de la app instalada) abre con el último pedido.
    var m = location.hash.match(/^#pedido=([A-Za-z0-9-]*)/);
    if (m) abrirSeguimiento(decodeURIComponent(m[1]));
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
    renderPromos();
    renderChips();
    renderAlmuerzosHoy();
    renderPopulares();
    renderGrid();
    renderRepetir();
    refreshCart();
  }

  // Primer pintado con lo que haya (data.js) para que no se vea vacío.
  conectarEnlacesWa();
  pintarTodo();
  iniciarEscaparate();
  revisarHash();

  // Luego traemos los datos de la nube (restaurantes + ajustes) y repintamos.
  if (window.Store && typeof window.Store.listar === "function") {
    window.Store.listar()
      .then(function (lista) {
        if (Array.isArray(lista) && lista.length) {
          DATA = lista;
          // Con la lista definitiva ya cargada, quitamos del carrito lo que no existe.
          limpiarHuerfanos();
          pintarTodo();
          iniciarEscaparate();
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
    if (!elVistaInicio.hidden) { renderGrid(); renderAlmuerzosHoy(); }
  }
  setInterval(refrescarHorarios, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refrescarHorarios(); });
})();
