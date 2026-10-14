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

  // Busca un plato dentro de un restaurante.
  function findItem(restId, itemId) {
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
  var cart = loadCart();          // { "restId::itemId": qty }
  var filtroCategoria = "Todos";
  var termino = "";
  var vistaActual = null;         // null = inicio, o id de restaurante

  // Lista de restaurantes en memoria. Se llena desde el Store al arrancar
  // (Supabase si está configurado, o data.js como respaldo).
  var DATA = (typeof RESTAURANTES !== "undefined" ? RESTAURANTES.slice() : []);

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
    } catch (e) { /* modo privado / cuota: no rompemos la app */ }
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
      var catOk = filtroCategoria === "Todos" || r.cat === filtroCategoria;
      return catOk && matchBusqueda(r, q);
    });
  }

  function estadoHTML(abierto) {
    return abierto
      ? '<span class="state state--open"><span class="state__dot"></span>Abierto</span>'
      : '<span class="state state--closed"><span class="state__dot"></span>Cerrado</span>';
  }

  function renderGrid() {
    var lista = restaurantesFiltrados();
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
        ? '<div class="card__cover" style="' + coverStyle(r) + '"></div>'
        : '<div class="card__cover" style="' + coverStyle(r) + '">' +
          '<span class="card__initials">' + esc(iniciales(r.nombre)) + "</span></div>";

      html +=
        '<button type="button" class="card" data-rest="' + esc(r.id) +
        '" aria-label="Ver la carta de ' + esc(r.nombre) + '">' +
          cover +
          '<div class="card__body">' +
            '<div class="card__name">' + esc(r.nombre) + "</div>" +
            '<div class="card__meta"><span>' + esc(r.cat) +
              '</span><span class="dot">·</span><span>' + esc(r.tiempo) + "</span></div>" +
            '<div class="card__meta">' + estadoHTML(r.abierto) + "</div>" +
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
            estadoHTML(r.abierto) + "</div>" +
        "</div>" +
      "</div>" + secciones;

    elVistaInicio.hidden = true;
    elVistaCarta.hidden = false;
    window.scrollTo(0, 0);
  }

  function dishHTML(r, it) {
    var qty = getQty(r.id, it.id);
    return (
      '<div class="dish" data-dish data-rest="' + esc(r.id) + '" data-item="' + esc(it.id) + '">' +
        '<div class="dish__info">' +
          '<div class="dish__name">' + esc(it.n) + "</div>" +
          '<div class="dish__desc">' + esc(it.d) + "</div>" +
          '<div class="dish__price">' + esc(money(it.p)) + "</div>" +
        "</div>" +
        '<div class="dish__action">' + controlHTML(r, it, qty) + "</div>" +
      "</div>"
    );
  }

  // Los botones llevan data-* con el restaurante y el plato, para que la
  // delegación de eventos sepa a qué actuar sin necesidad de re-enganchar.
  function controlHTML(r, it, qty) {
    if (!r.abierto) {
      return '<button type="button" class="add-btn" disabled>Agregar</button>';
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
    if (!elSheet.hidden) renderSheet();
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
  }

  function renderSheet() {
    var groups = groupedCart();

    if (groups.length === 0) {
      elSheetBody.innerHTML = '<p class="cart-empty">Tu pedido está vacío.</p>';
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
              '<div class="cart-line__price">' + esc(money(item.p)) + " c/u</div>" +
            "</div>" +
            '<div class="cart-line__right">' +
              stepperHTML(g.rest.id, item, qty) +
              '<span class="cart-line__sub">' + esc(money(item.p * qty)) + "</span>" +
            "</div>" +
          "</div>";
      }
      gruposHTML +=
        '<div class="cart-group"><div class="cart-group__name">' +
        esc(g.rest.nombre) + "</div>" + lineas + "</div>";
    }

    elSheetBody.innerHTML =
      gruposHTML +
      '<div class="cart-total"><span>Total productos</span><span>' +
        esc(money(totalPesos())) + "</span></div>" +
      '<p class="cart-note">Domicilio: se confirma por WhatsApp.</p>' +
      '<h3 class="form__heading">Tus datos de entrega</h3>' +
      '<form class="form" id="pedidoForm" novalidate>' +
        '<div class="field">' +
          '<label class="field__label" for="fNombre">Nombre *</label>' +
          '<input class="field__input" id="fNombre" name="nombre" type="text" placeholder="¿A nombre de quién?" autocomplete="name" required />' +
        "</div>" +
        '<div class="field">' +
          '<label class="field__label" for="fTelefono">Teléfono (WhatsApp) *</label>' +
          '<input class="field__input" id="fTelefono" name="telefono" type="tel" inputmode="numeric" placeholder="Ej: 300 123 4567" autocomplete="tel" required />' +
        "</div>" +
        '<div class="field">' +
          '<label class="field__label" for="fDireccion">Dirección de entrega (opcional)</label>' +
          '<input class="field__input" id="fDireccion" name="direccion" type="text" placeholder="Calle, número y referencias" autocomplete="street-address" />' +
        "</div>" +
        '<div class="field">' +
          '<label class="field__label" for="fBarrio">Barrio / zona (opcional)</label>' +
          '<input class="field__input" id="fBarrio" name="barrio" type="text" placeholder="Ej: Centro, El Progreso…" />' +
        "</div>" +
        '<div class="field">' +
          '<span class="field__label">Forma de pago</span>' +
          '<div class="pay">' +
            '<label class="pay__option"><input type="radio" name="pago" value="Efectivo" checked /> 💵 Efectivo</label>' +
            '<label class="pay__option"><input type="radio" name="pago" value="Transferencia" /> 📲 Transferencia</label>' +
          "</div>" +
        "</div>" +
        '<div class="field">' +
          '<label class="field__label" for="fNotas">Notas (opcional)</label>' +
          '<textarea class="field__textarea" id="fNotas" name="notas" placeholder="Ej: sin cebolla, timbre dañado, etc."></textarea>' +
        "</div>" +
        '<p class="form__hint">El domicilio se confirma por WhatsApp según tu barrio.</p>' +
        '<div class="actions">' +
          '<button type="submit" class="btn-whatsapp" id="btnWhatsapp" disabled><span aria-hidden="true">🟢</span> Enviar pedido por WhatsApp</button>' +
          '<button type="button" class="btn-copy" data-copy>Copiar el pedido</button>' +
          '<p class="copy-msg" id="copyMsg" role="status" aria-live="polite"></p>' +
        "</div>" +
      "</form>";

    enlazarFormulario();
  }

  // El formulario sí necesita listeners propios (input/submit), pero están
  // protegidos y se vuelven a crear limpiamente en cada render del sheet.
  function enlazarFormulario() {
    var form = $("#pedidoForm");
    var btnWa = $("#btnWhatsapp");
    var fNombre = $("#fNombre");
    var fTelefono = $("#fTelefono");
    var fDireccion = $("#fDireccion");
    var fBarrio = $("#fBarrio");
    if (!form || !btnWa || !fNombre || !fTelefono || !fDireccion || !fBarrio) return;

    function validar() {
      // Solo nombre y teléfono son obligatorios.
      // Dirección y barrio son opcionales (se confirman por WhatsApp).
      btnWa.disabled = !(
        fNombre.value.trim() &&
        fTelefono.value.trim()
      );
    }
    [fNombre, fTelefono, fDireccion, fBarrio].forEach(function (campo) {
      campo.addEventListener("input", validar);
    });
    validar();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (btnWa.disabled) return;

      // Guardar el pedido en Supabase (si está disponible) ANTES de abrir
      // WhatsApp. No bloqueamos el envío si falla: el pedido igual va por WA.
      guardarPedidoEnNube(form);

      var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(construirMensaje(form));
      // Navegar directo es lo más fiable en móvil (evita el bloqueo de pop-ups).
      try {
        var win = window.open(url, "_blank");
        if (!win) window.location.href = url;
      } catch (err) {
        window.location.href = url;
      }
    });
  }

  /* ----------------------- Mensaje de WhatsApp -------------------- */

  // Guarda el pedido en Supabase con los precios registrados al momento
  // de la compra. Silencioso: si falla, no interrumpe el envío por WhatsApp.
  function guardarPedidoEnNube(form) {
    if (!window.Store || typeof window.Store.crearPedido !== "function") return;
    if (!window.Store.supabaseDisponible || !window.Store.supabaseDisponible()) return;

    var data = new FormData(form);
    var cliente = {
      nombre: (data.get("nombre") || "").toString().trim(),
      telefono: (data.get("telefono") || "").toString().trim(),
      direccion: (data.get("direccion") || "").toString().trim(),
      barrio: (data.get("barrio") || "").toString().trim(),
      pago: (data.get("pago") || "Efectivo").toString(),
      notas: (data.get("notas") || "").toString().trim(),
    };

    // Items con precio del momento (congelado), agrupados por restaurante.
    var items = [];
    var groups = groupedCart();
    for (var gi = 0; gi < groups.length; gi++) {
      var g = groups[gi];
      for (var i = 0; i < g.items.length; i++) {
        var it = g.items[i].item;
        var qty = g.items[i].qty;
        items.push({
          restaurante_id: g.rest.id,
          restaurante: g.rest.nombre,
          plato_id: it.id,
          plato: it.n,
          precio_unit: it.p,          // precio registrado al momento de la compra
          cantidad: qty,
          subtotal: it.p * qty,
        });
      }
    }

    // Código corto legible basado en la hora (ej. GH-7F3K2).
    var codigo = "GH-" + Date.now().toString(36).toUpperCase().slice(-5);

    window.Store.crearPedido({
      codigo: codigo,
      cliente: cliente,
      items: items,
      total: totalPesos(),
    }).catch(function () { /* el pedido va igual por WhatsApp */ });
  }

  function construirMensaje(form) {
    var data = new FormData(form);
    var nombre = (data.get("nombre") || "").toString().trim();
    var telefono = (data.get("telefono") || "").toString().trim();
    var direccion = (data.get("direccion") || "").toString().trim();
    var barrio = (data.get("barrio") || "").toString().trim();
    var pago = (data.get("pago") || "Efectivo").toString();
    var notas = (data.get("notas") || "").toString().trim();

    var groups = groupedCart();
    var lines = [];
    lines.push("🛵 *NUEVO PEDIDO · " + NOMBRE_NEGOCIO + "*");
    lines.push("");

    for (var gi = 0; gi < groups.length; gi++) {
      var g = groups[gi];
      lines.push("🍽️ *" + g.rest.nombre + "*");
      for (var i = 0; i < g.items.length; i++) {
        var item = g.items[i].item;
        var qty = g.items[i].qty;
        lines.push("• " + qty + " x " + item.n + " — " + money(item.p * qty));
      }
      lines.push("_Subtotal: " + money(g.subtotal) + "_");
      lines.push("");
    }

    lines.push("💰 *Total productos:* " + money(totalPesos()));
    lines.push("_(el domicilio se cobra aparte según el barrio)_");
    lines.push("");
    lines.push("👤 *Datos de entrega*");
    lines.push("• Nombre: " + nombre);
    lines.push("• Teléfono: " + telefono);
    if (direccion) lines.push("• Dirección: " + direccion);
    if (barrio) lines.push("• Barrio: " + barrio);
    lines.push("• Pago: " + pago);
    if (notas) lines.push("• Nota: " + notas);

    return lines.join("\n");
  }

  async function copiarPedido() {
    var form = $("#pedidoForm");
    var copyMsg = $("#copyMsg");
    if (!form) return;
    var texto = construirMensaje(form);
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
    if (t.closest("[data-sheet-close]")) { e.preventDefault(); closeSheet(); return; }
    if (t.hasAttribute && t.hasAttribute("data-sheet-backdrop")) { e.preventDefault(); closeSheet(); return; }

    // --- Abrir la hoja ---
    if (t.closest("#cartBar")) { openSheet(); return; }

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

    // --- Abrir carta tocando una tarjeta ---
    var card = t.closest("[data-rest]");
    if (card && card.classList.contains("card")) {
      abrirCarta(card.getAttribute("data-rest"));
      return;
    }
  }

  // Un solo listener para toda la app (incluye lo que se repinta).
  document.addEventListener("click", onClick);

  // Buscador
  elBuscador.addEventListener("input", function (e) {
    termino = e.target.value;
    if (vistaActual) irAInicio();
    renderGrid();
  });

  // Cerrar con Escape (teclado)
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !elSheet.hidden) closeSheet();
  });

  /* -------------------------- Promociones ------------------------- */
  function renderPromos() {
    var cont = document.getElementById("promos");
    if (!cont) return;
    var lista = (typeof PROMOCIONES !== "undefined" && Array.isArray(PROMOCIONES)) ? PROMOCIONES : [];
    if (!lista.length) { cont.innerHTML = ""; cont.hidden = true; return; }
    cont.hidden = false;
    var html = "";
    for (var i = 0; i < lista.length; i++) {
      var p = lista[i];
      html +=
        '<div class="promo">' +
          '<span class="promo__emoji" aria-hidden="true">' + esc(p.emoji || "✨") + "</span>" +
          '<div class="promo__text">' +
            '<div class="promo__title">' + esc(p.titulo || "") + "</div>" +
            '<div class="promo__sub">' + esc(p.texto || "") + "</div>" +
          "</div>" +
        "</div>";
    }
    cont.innerHTML = html;
  }

  /* --------------------------- Arranque --------------------------- */

  // Seguridad: aseguramos que la hoja empiece SIEMPRE cerrada al cargar.
  closeSheet();

  // Primer pintado con lo que haya (data.js) para que no se vea vacío.
  renderPromos();
  renderChips();
  renderGrid();
  refreshCart();

  // Luego intentamos traer los datos actualizados desde el Store
  // (Supabase si está configurado). Al llegar, repintamos.
  if (window.Store && typeof window.Store.listar === "function") {
    window.Store.listar()
      .then(function (lista) {
        if (Array.isArray(lista) && lista.length) {
          DATA = lista;
          renderChips();
          renderGrid();
          refreshCart();
        }
      })
      .catch(function () { /* ya mostramos el respaldo */ });
  }
})();
