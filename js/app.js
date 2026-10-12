/* =====================================================================
   Servicios Ghost — Lógica de la aplicación (vanilla JS)
   Depende de las constantes definidas en js/data.js:
     WHATSAPP, NOMBRE_NEGOCIO, RESTAURANTES
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------- Utilidades --------------------------- */

  // Formatea pesos colombianos sin decimales: 12000 -> "$12.000"
  const pesos = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
  const money = (n) => pesos.format(n);

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
    return nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  // Estilo de portada: imagen si existe, si no un degradado del color.
  function coverStyle(r) {
    if (r.logo) {
      return `background-image:url('${esc(r.logo)}')`;
    }
    const c = esc(r.color || "#3b82f6");
    return `background-image:linear-gradient(135deg, ${c}, ${c}99)`;
  }

  // Busca un restaurante por id.
  const findRest = (id) => RESTAURANTES.find((r) => r.id === id);

  // Busca un plato dentro de un restaurante.
  function findItem(restId, itemId) {
    const r = findRest(restId);
    if (!r) return null;
    for (const sec of r.carta) {
      const it = sec.items.find((i) => i.id === itemId);
      if (it) return it;
    }
    return null;
  }

  /* ------------------------- Estado global ------------------------ */

  const LS_KEY = "ghost_cart_v1";

  // Carrito: { "restId::itemId": qty, ... }
  let cart = loadCart();
  let filtroCategoria = "Todos";
  let termino = "";

  function loadCart() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      return data && typeof data === "object" ? data : {};
    } catch (e) {
      return {};
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cart));
    } catch (e) {
      /* Si falla (modo privado, cuota, etc.) no rompemos la app. */
    }
  }

  const cartKey = (restId, itemId) => `${restId}::${itemId}`;
  const parseKey = (key) => {
    const i = key.indexOf("::");
    return { restId: key.slice(0, i), itemId: key.slice(i + 2) };
  };

  function getQty(restId, itemId) {
    return cart[cartKey(restId, itemId)] || 0;
  }

  function setQty(restId, itemId, qty) {
    const key = cartKey(restId, itemId);
    if (qty <= 0) delete cart[key];
    else cart[key] = qty;
    saveCart();
  }

  function totalProductos() {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  }

  function totalPesos() {
    let total = 0;
    for (const key in cart) {
      const { restId, itemId } = parseKey(key);
      const it = findItem(restId, itemId);
      if (it) total += it.p * cart[key];
    }
    return total;
  }

  // Agrupa el carrito por restaurante (ignorando entradas huérfanas).
  function groupedCart() {
    const groups = [];
    for (const key in cart) {
      const { restId, itemId } = parseKey(key);
      const r = findRest(restId);
      const it = findItem(restId, itemId);
      if (!r || !it) continue;
      let g = groups.find((x) => x.rest.id === restId);
      if (!g) {
        g = { rest: r, items: [], subtotal: 0 };
        groups.push(g);
      }
      const qty = cart[key];
      g.items.push({ item: it, qty });
      g.subtotal += it.p * qty;
    }
    return groups;
  }

  /* --------------------------- Referencias ------------------------ */

  const $ = (sel) => document.querySelector(sel);

  const elChips = $("#chips");
  const elGrid = $("#gridRestaurantes");
  const elSinResultados = $("#sinResultados");
  const elBuscador = $("#buscador");
  const elVistaInicio = $("#vistaInicio");
  const elVistaCarta = $("#vistaCarta");

  const elCartBar = $("#cartBar");
  const elCartBarCount = $("#cartBarCount");
  const elCartBarProductos = $("#cartBarProductos");
  const elCartBarTotal = $("#cartBarTotal");

  const elSheet = $("#sheet");
  const elSheetBody = $("#sheetBody");
  const elSheetClose = $("#sheetClose");
  const elSheetBackdrop = $("#sheetBackdrop");

  // Vista actual: null = inicio, o id de restaurante.
  let vistaActual = null;

  /* ---------------------------- Chips ----------------------------- */

  function categorias() {
    const cats = ["Todos"];
    for (const r of RESTAURANTES) {
      if (!cats.includes(r.cat)) cats.push(r.cat);
    }
    return cats;
  }

  function renderChips() {
    elChips.innerHTML = "";
    for (const cat of categorias()) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = cat;
      btn.setAttribute("aria-pressed", String(cat === filtroCategoria));
      btn.addEventListener("click", () => {
        filtroCategoria = cat;
        renderChips();
        renderGrid();
      });
      elChips.appendChild(btn);
    }
  }

  /* --------------------- Lista de restaurantes -------------------- */

  // ¿El restaurante coincide con el término de búsqueda?
  // Busca por nombre del restaurante y por nombre de plato.
  function matchBusqueda(r, q) {
    if (!q) return true;
    if (r.nombre.toLowerCase().includes(q)) return true;
    for (const sec of r.carta) {
      for (const it of sec.items) {
        if (it.n.toLowerCase().includes(q)) return true;
      }
    }
    return false;
  }

  function restaurantesFiltrados() {
    const q = termino.trim().toLowerCase();
    return RESTAURANTES.filter((r) => {
      const catOk = filtroCategoria === "Todos" || r.cat === filtroCategoria;
      return catOk && matchBusqueda(r, q);
    });
  }

  function estadoHTML(abierto) {
    return abierto
      ? `<span class="state state--open"><span class="state__dot"></span>Abierto</span>`
      : `<span class="state state--closed"><span class="state__dot"></span>Cerrado</span>`;
  }

  function renderGrid() {
    const lista = restaurantesFiltrados();
    elGrid.innerHTML = "";

    if (lista.length === 0) {
      elSinResultados.hidden = false;
      return;
    }
    elSinResultados.hidden = true;

    for (const r of lista) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "card";
      card.setAttribute("aria-label", `Ver la carta de ${r.nombre}`);

      const cover = r.logo
        ? `<div class="card__cover" style="${coverStyle(r)}"></div>`
        : `<div class="card__cover" style="${coverStyle(r)}">
             <span class="card__initials">${esc(iniciales(r.nombre))}</span>
           </div>`;

      card.innerHTML = `
        ${cover}
        <div class="card__body">
          <div class="card__name">${esc(r.nombre)}</div>
          <div class="card__meta">
            <span>${esc(r.cat)}</span>
            <span class="dot">·</span>
            <span>${esc(r.tiempo)}</span>
          </div>
          <div class="card__meta">${estadoHTML(r.abierto)}</div>
        </div>
      `;

      card.addEventListener("click", () => abrirCarta(r.id));
      elGrid.appendChild(card);
    }
  }

  /* ----------------------- Carta del restaurante ------------------ */

  function abrirCarta(restId) {
    const r = findRest(restId);
    if (!r) return;
    vistaActual = restId;

    const cover = r.logo
      ? `<div class="rest-head__cover" style="${coverStyle(r)}"></div>`
      : `<div class="rest-head__cover" style="${coverStyle(r)}">
           <span class="card__initials">${esc(iniciales(r.nombre))}</span>
         </div>`;

    let secciones = "";
    for (const sec of r.carta) {
      let platos = "";
      for (const it of sec.items) {
        platos += dishHTML(r, it);
      }
      secciones += `
        <div class="section">
          <h3 class="section__title">${esc(sec.sec)}</h3>
          ${platos}
        </div>
      `;
    }

    elVistaCarta.innerHTML = `
      <button type="button" class="back-btn" id="backBtn">← Todos los restaurantes</button>
      <div class="rest-head">
        ${cover}
        <div>
          <h1 class="rest-head__name">${esc(r.nombre)}</h1>
          <p class="rest-head__desc">${esc(r.desc)}</p>
          <div class="rest-head__meta">
            <span>⏱ ${esc(r.tiempo)}</span>
            ${estadoHTML(r.abierto)}
          </div>
        </div>
      </div>
      ${secciones}
    `;

    $("#backBtn").addEventListener("click", irAInicio);

    // Conecta los controles de cada plato.
    elVistaCarta.querySelectorAll("[data-dish]").forEach((node) => {
      conectarPlato(node, r);
    });

    elVistaInicio.hidden = true;
    elVistaCarta.hidden = false;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  // HTML del control de un plato (botón Agregar o stepper).
  function dishHTML(r, it) {
    const qty = getQty(r.id, it.id);
    return `
      <div class="dish" data-dish data-rest="${esc(r.id)}" data-item="${esc(it.id)}">
        <div class="dish__info">
          <div class="dish__name">${esc(it.n)}</div>
          <div class="dish__desc">${esc(it.d)}</div>
          <div class="dish__price">${esc(money(it.p))}</div>
        </div>
        <div class="dish__action" data-action>
          ${controlHTML(r, it, qty)}
        </div>
      </div>
    `;
  }

  function controlHTML(r, it, qty) {
    if (!r.abierto) {
      return `<button type="button" class="add-btn" disabled>Agregar</button>`;
    }
    if (qty <= 0) {
      return `<button type="button" class="add-btn" data-add aria-label="Agregar ${esc(it.n)}">Agregar</button>`;
    }
    return stepperHTML(it, qty);
  }

  function stepperHTML(it, qty) {
    return `
      <div class="stepper">
        <button type="button" class="stepper__btn" data-dec aria-label="Quitar uno de ${esc(it.n)}">−</button>
        <span class="stepper__qty" data-qty>${qty}</span>
        <button type="button" class="stepper__btn" data-inc aria-label="Agregar uno de ${esc(it.n)}">+</button>
      </div>
    `;
  }

  // Conecta eventos de un plato en la carta y repinta solo su control.
  function conectarPlato(node, r) {
    const itemId = node.getAttribute("data-item");
    const it = findItem(r.id, itemId);
    if (!it) return;

    function repintar() {
      const slot = node.querySelector("[data-action]");
      slot.innerHTML = controlHTML(r, it, getQty(r.id, itemId));
      enlazar(slot);
    }

    function enlazar(slot) {
      const add = slot.querySelector("[data-add]");
      const inc = slot.querySelector("[data-inc]");
      const dec = slot.querySelector("[data-dec]");
      if (add) add.addEventListener("click", () => { setQty(r.id, itemId, 1); repintar(); refreshCart(); });
      if (inc) inc.addEventListener("click", () => { setQty(r.id, itemId, getQty(r.id, itemId) + 1); repintar(); refreshCart(); });
      if (dec) dec.addEventListener("click", () => { setQty(r.id, itemId, getQty(r.id, itemId) - 1); repintar(); refreshCart(); });
    }

    enlazar(node.querySelector("[data-action]"));
  }

  function irAInicio() {
    vistaActual = null;
    elVistaCarta.hidden = true;
    elVistaCarta.innerHTML = "";
    elVistaInicio.hidden = false;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* --------------------------- Barra carrito ---------------------- */

  function refreshCart() {
    const n = totalProductos();
    if (n <= 0) {
      elCartBar.hidden = true;
    } else {
      elCartBar.hidden = false;
      elCartBarCount.textContent = String(n);
      elCartBarProductos.textContent = n === 1 ? "1 producto" : `${n} productos`;
      elCartBarTotal.textContent = money(totalPesos());
    }
    // Si la hoja está abierta, repintarla para reflejar cambios.
    if (!elSheet.hidden) renderSheet();
  }

  /* ----------------------- Hoja inferior (sheet) ------------------ */

  function openSheet() {
    if (totalProductos() <= 0) return;
    renderSheet();
    elSheet.hidden = false;
    document.body.style.overflow = "hidden";
    // Enfoca el botón de cerrar para accesibilidad.
    elSheetClose.focus();
  }

  function closeSheet() {
    elSheet.hidden = true;
    document.body.style.overflow = "";
  }

  function renderSheet() {
    const groups = groupedCart();

    if (groups.length === 0) {
      elSheetBody.innerHTML = `<p class="cart-empty">Tu pedido está vacío.</p>`;
      return;
    }

    let gruposHTML = "";
    for (const g of groups) {
      let lineas = "";
      for (const { item, qty } of g.items) {
        lineas += `
          <div class="cart-line" data-line data-rest="${esc(g.rest.id)}" data-item="${esc(item.id)}">
            <div class="cart-line__info">
              <div class="cart-line__name">${esc(item.n)}</div>
              <div class="cart-line__price">${esc(money(item.p))} c/u</div>
            </div>
            <div class="cart-line__right">
              ${stepperHTML(item, qty)}
              <span class="cart-line__sub">${esc(money(item.p * qty))}</span>
            </div>
          </div>
        `;
      }
      gruposHTML += `
        <div class="cart-group">
          <div class="cart-group__name">${esc(g.rest.nombre)}</div>
          ${lineas}
        </div>
      `;
    }

    elSheetBody.innerHTML = `
      ${gruposHTML}
      <div class="cart-total">
        <span>Total productos</span>
        <span>${esc(money(totalPesos()))}</span>
      </div>
      <p class="cart-note">Domicilio: se confirma por WhatsApp.</p>

      <form class="form" id="pedidoForm" novalidate>
        <div class="field">
          <label class="field__label" for="fNombre">Nombre</label>
          <input class="field__input" id="fNombre" name="nombre" type="text"
                 placeholder="¿A nombre de quién?" autocomplete="name" required />
        </div>
        <div class="field">
          <label class="field__label" for="fDireccion">Dirección de entrega</label>
          <input class="field__input" id="fDireccion" name="direccion" type="text"
                 placeholder="Dirección, barrio y referencias" autocomplete="street-address" required />
        </div>
        <div class="field">
          <span class="field__label">Forma de pago</span>
          <div class="pay">
            <label class="pay__option">
              <input type="radio" name="pago" value="Efectivo" checked /> 💵 Efectivo
            </label>
            <label class="pay__option">
              <input type="radio" name="pago" value="Transferencia" /> 📲 Transferencia
            </label>
          </div>
        </div>
        <div class="field">
          <label class="field__label" for="fNotas">Notas (opcional)</label>
          <textarea class="field__textarea" id="fNotas" name="notas"
                    placeholder="Ej: sin cebolla, timbre dañado, etc."></textarea>
        </div>

        <div class="actions">
          <button type="submit" class="btn-whatsapp" id="btnWhatsapp" disabled>
            <span aria-hidden="true">🟢</span> Enviar pedido por WhatsApp
          </button>
          <button type="button" class="btn-copy" id="btnCopiar">Copiar el pedido</button>
          <p class="copy-msg" id="copyMsg" role="status" aria-live="polite"></p>
        </div>
      </form>
    `;

    conectarSheet();
  }

  function conectarSheet() {
    // Steppers dentro del carrito.
    elSheetBody.querySelectorAll("[data-line]").forEach((line) => {
      const restId = line.getAttribute("data-rest");
      const itemId = line.getAttribute("data-item");
      const inc = line.querySelector("[data-inc]");
      const dec = line.querySelector("[data-dec]");
      if (inc) inc.addEventListener("click", () => {
        setQty(restId, itemId, getQty(restId, itemId) + 1);
        refreshCart();
        sincronizarCarta(restId, itemId);
      });
      if (dec) dec.addEventListener("click", () => {
        setQty(restId, itemId, getQty(restId, itemId) - 1);
        refreshCart();
        sincronizarCarta(restId, itemId);
      });
    });

    // Validación del formulario.
    const form = $("#pedidoForm");
    const btnWa = $("#btnWhatsapp");
    const btnCopiar = $("#btnCopiar");
    const copyMsg = $("#copyMsg");
    const fNombre = $("#fNombre");
    const fDireccion = $("#fDireccion");

    function validar() {
      const ok = fNombre.value.trim() !== "" && fDireccion.value.trim() !== "";
      btnWa.disabled = !ok;
    }
    fNombre.addEventListener("input", validar);
    fDireccion.addEventListener("input", validar);
    validar();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (btnWa.disabled) return;
      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(construirMensaje(form))}`;
      window.open(url, "_blank", "noopener");
    });

    btnCopiar.addEventListener("click", async () => {
      const texto = construirMensaje(form);
      try {
        await navigator.clipboard.writeText(texto);
        copyMsg.textContent = "¡Pedido copiado! 📋";
        copyMsg.classList.remove("copy-msg--error");
      } catch (err) {
        copyMsg.textContent = "No se pudo copiar. Selecciona y copia manualmente.";
        copyMsg.classList.add("copy-msg--error");
      }
    });
  }

  // Si la carta del restaurante editado está abierta, refréscala.
  function sincronizarCarta(restId, itemId) {
    if (vistaActual !== restId) return;
    const node = elVistaCarta.querySelector(
      `[data-dish][data-item="${CSS.escape(itemId)}"]`
    );
    if (!node) return;
    const r = findRest(restId);
    const it = findItem(restId, itemId);
    const slot = node.querySelector("[data-action]");
    slot.innerHTML = controlHTML(r, it, getQty(restId, itemId));
    conectarPlato(node, r);
  }

  /* ----------------------- Mensaje de WhatsApp -------------------- */

  function construirMensaje(form) {
    const data = new FormData(form);
    const nombre = (data.get("nombre") || "").toString().trim();
    const direccion = (data.get("direccion") || "").toString().trim();
    const pago = (data.get("pago") || "Efectivo").toString();
    const notas = (data.get("notas") || "").toString().trim();

    const groups = groupedCart();
    const lines = [];
    lines.push(`Hola ${NOMBRE_NEGOCIO}, quiero hacer un pedido:`);
    lines.push("");

    for (const g of groups) {
      lines.push(`*Restaurante: ${g.rest.nombre}*`);
      for (const { item, qty } of g.items) {
        lines.push(`- ${qty} x ${item.n} (${money(item.p)})`);
      }
      lines.push(`Subtotal: ${money(g.subtotal)}`);
      lines.push("");
    }

    lines.push(`*Total productos:* ${money(totalPesos())} (domicilio aparte)`);
    lines.push(`*Nombre:* ${nombre}`);
    lines.push(`*Dirección:* ${direccion}`);
    lines.push(`*Pago:* ${pago}`);
    if (notas) lines.push(`*Nota:* ${notas}`);

    return lines.join("\n");
  }

  /* ---------------------------- Eventos --------------------------- */

  elBuscador.addEventListener("input", (e) => {
    termino = e.target.value;
    if (vistaActual) irAInicio();
    renderGrid();
  });

  $("#logoHome").addEventListener("click", (e) => {
    e.preventDefault();
    irAInicio();
  });

  elCartBar.addEventListener("click", openSheet);
  elSheetClose.addEventListener("click", closeSheet);
  elSheetBackdrop.addEventListener("click", closeSheet);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !elSheet.hidden) closeSheet();
  });

  /* --------------------------- Arranque --------------------------- */

  renderChips();
  renderGrid();
  refreshCart();
})();
