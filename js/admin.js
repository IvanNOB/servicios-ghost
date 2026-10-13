/* =====================================================================
   Servicios Ghost — Panel de administración
   Requiere: supabase-js (CDN), supabase-config.js, store.js
   ===================================================================== */
(function () {
  "use strict";

  function $(s) { return document.querySelector(s); }
  function esc(v) {
    return String(v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function iniciales(n) {
    return String(n).split(/\s+/).filter(Boolean).slice(0, 2)
      .map(function (w) { return w[0]; }).join("").toUpperCase();
  }
  function slug(txt) {
    return String(txt).toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || ("r-" + Date.now());
  }

  var elAvisoConfig = $("#avisoConfig");
  var elVistaLogin = $("#vistaLogin");
  var elVistaPanel = $("#vistaPanel");
  var elHeaderRight = $("#headerRight");
  var elAdminUser = $("#adminUser");
  var elListaRest = $("#listaRest");
  var elEditorSheet = $("#editorSheet");
  var elEditorBody = $("#editorBody");
  var elEditorTitle = $("#editorTitle");

  var restaurantes = [];   // copia en memoria
  var editando = null;     // restaurante en edición
  var pedidos = [];        // pedidos en memoria

  // Estados posibles de un pedido y su flujo.
  var ESTADOS = ["recibido", "preparando", "listo", "en-camino", "entregado"];
  var ESTADO_LABEL = {
    "recibido": "Recibido",
    "preparando": "Preparando",
    "listo": "Listo",
    "en-camino": "En camino",
    "entregado": "Entregado",
    "cancelado": "Cancelado",
  };

  /* ----------------------------- Toast ---------------------------- */
  function toast(msg, esError) {
    var t = document.createElement("div");
    t.className = "toast" + (esError ? " toast--error" : "");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* --------------------------- Vistas ----------------------------- */
  function mostrar(cualVista) {
    elAvisoConfig.hidden = cualVista !== "config";
    elVistaLogin.hidden = cualVista !== "login";
    elVistaPanel.hidden = cualVista !== "panel";
    elHeaderRight.hidden = cualVista !== "panel";
  }

  /* ----------------------------- Login ---------------------------- */
  function enlazarLogin() {
    var form = $("#loginForm");
    var err = $("#loginError");
    var btn = $("#btnEntrar");
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      err.textContent = "";
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Entrando…';
      try {
        await window.Store.entrar($("#loginEmail").value.trim(), $("#loginPass").value);
        await iniciarPanel();
      } catch (ex) {
        err.textContent = "No se pudo entrar: " + (ex && ex.message ? ex.message : "revisa el correo y la contraseña.");
      } finally {
        btn.disabled = false;
        btn.textContent = "Entrar";
      }
    });
  }

  $("#btnSalir").addEventListener("click", async function () {
    await window.Store.salir();
    location.reload();
  });

  /* ------------------------- Panel / lista ------------------------ */
  async function iniciarPanel() {
    var sesion = await window.Store.sesionActual();
    if (!sesion) { mostrar("login"); return; }
    elAdminUser.textContent = sesion.user && sesion.user.email ? sesion.user.email : "Admin";
    mostrar("panel");
    await recargarLista();
  }

  async function recargarLista() {
    restaurantes = await window.Store.listar();
    pintarLista();
  }

  function pintarLista() {
    if (!restaurantes.length) {
      elListaRest.innerHTML = '<p class="muted">Aún no hay restaurantes. Toca “+ Nuevo restaurante”.</p>';
      return;
    }
    var html = "";
    for (var i = 0; i < restaurantes.length; i++) {
      var r = restaurantes[i];
      var cover = r.logo
        ? 'style="background-image:url(\'' + esc(r.logo) + '\')"'
        : 'style="background:' + esc(r.color || "#3b82f6") + '"';
      html +=
        '<div class="admin-card">' +
          '<div class="admin-card__cover" ' + cover + '>' + (r.logo ? "" : esc(iniciales(r.nombre))) + "</div>" +
          '<div class="admin-card__info">' +
            '<div class="admin-card__name">' + esc(r.nombre) + "</div>" +
            '<div class="admin-card__meta">' + esc(r.cat) + " · " + (r.abierto ? "Abierto" : "Cerrado") +
              " · " + contarPlatos(r) + " platos</div>" +
          "</div>" +
          '<div class="admin-card__actions">' +
            '<button type="button" class="btn-copy" data-editar="' + esc(r.id) + '">Editar</button>' +
            '<button type="button" class="btn-danger" data-borrar="' + esc(r.id) + '">Borrar</button>' +
          "</div>" +
        "</div>";
    }
    elListaRest.innerHTML = html;
  }

  function contarPlatos(r) {
    var n = 0;
    (r.carta || []).forEach(function (s) { n += (s.items || []).length; });
    return n;
  }

  /* --------------------------- Editor ----------------------------- */
  function nuevoRestaurante() {
    return {
      id: "", nombre: "", cat: "", tiempo: "20-30 min", abierto: true,
      color: "#3b82f6", desc: "", logo: "", carta: [], orden: restaurantes.length,
      _esNuevo: true,
    };
  }

  function abrirEditor(rest) {
    editando = JSON.parse(JSON.stringify(rest));
    if (!editando.carta) editando.carta = [];
    elEditorTitle.textContent = rest._esNuevo ? "Nuevo restaurante" : "Editar: " + rest.nombre;
    pintarEditor();
    elEditorSheet.hidden = false;
    document.body.classList.add("no-scroll");
  }

  function cerrarEditor() {
    elEditorSheet.hidden = true;
    document.body.classList.remove("no-scroll");
    editando = null;
  }

  function pintarEditor() {
    var r = editando;
    var cover = r.logo
      ? 'style="background-image:url(\'' + esc(r.logo) + '\')"'
      : "";
    var seccionesHTML = "";
    for (var si = 0; si < r.carta.length; si++) {
      seccionesHTML += seccionHTML(r.carta[si], si);
    }

    elEditorBody.innerHTML =
      '<div class="foto-preview" id="fotoPreview" ' + cover + ">" +
        (r.logo ? "" : "Portada (opcional)") + "</div>" +
      '<div class="inline-actions" style="margin-bottom:14px">' +
        '<label class="btn-primary" style="cursor:pointer">' +
          '<span id="subirTxt">📷 Subir foto</span>' +
          '<input type="file" id="fotoInput" accept="image/*" hidden />' +
        "</label>" +
        (r.logo ? '<button type="button" class="btn-danger" data-quitar-foto>Quitar foto</button>' : "") +
      "</div>" +

      '<div class="grid-2">' +
        campo("Nombre", "nombre", r.nombre, "text", "Ej: Obleas y Más") +
        campo("Categoría", "cat", r.cat, "text", "Ej: Postres, Pizza…") +
        campo("Tiempo estimado", "tiempo", r.tiempo, "text", "Ej: 20-30 min") +
        campoColor(r.color) +
      "</div>" +
      campoTextarea("Descripción", "desc", r.desc, "Frase corta sobre el restaurante") +
      '<label class="pay__option" style="margin:4px 0 16px; max-width:220px">' +
        '<input type="checkbox" id="campoAbierto" ' + (r.abierto ? "checked" : "") + " /> Abierto ahora</label>" +

      '<h3 class="editor-section__title" style="margin-bottom:10px">Carta</h3>' +
      '<div id="secciones">' + seccionesHTML + "</div>" +
      '<button type="button" class="btn-copy" data-add-seccion style="margin-bottom:16px">+ Agregar sección</button>' +

      '<div class="actions">' +
        '<button type="button" class="btn-primary" id="btnGuardar">Guardar cambios</button>' +
      "</div>";

    enlazarEditor();
  }

  function campo(label, key, val, tipo, ph) {
    return '<div class="field"><label class="field__label">' + esc(label) + "</label>" +
      '<input class="field__input" data-campo="' + key + '" type="' + tipo + '" value="' + esc(val || "") +
      '" placeholder="' + esc(ph || "") + '" /></div>';
  }
  function campoTextarea(label, key, val, ph) {
    return '<div class="field"><label class="field__label">' + esc(label) + "</label>" +
      '<textarea class="field__textarea" data-campo="' + key + '" placeholder="' + esc(ph || "") +
      '">' + esc(val || "") + "</textarea></div>";
  }
  function campoColor(val) {
    return '<div class="field"><label class="field__label">Color (si no hay foto)</label>' +
      '<input class="field__input" data-campo="color" type="color" value="' + esc(val || "#3b82f6") +
      '" style="height:46px; padding:4px" /></div>';
  }

  function seccionHTML(sec, idx) {
    var platos = "";
    for (var i = 0; i < (sec.items || []).length; i++) {
      platos += platoHTML(sec.items[i], idx, i);
    }
    return (
      '<div class="editor-section" data-seccion="' + idx + '">' +
        '<div class="editor-section__head">' +
          '<input class="field__input" data-sec-nombre="' + idx + '" value="' + esc(sec.sec || "") +
            '" placeholder="Nombre de la sección (ej. Obleas)" style="font-weight:700" />' +
          '<button type="button" class="btn-danger" data-del-seccion="' + idx + '">Quitar</button>' +
        "</div>" +
        '<div data-platos="' + idx + '">' + platos + "</div>" +
        '<button type="button" class="btn-copy" data-add-plato="' + idx + '">+ Agregar plato</button>' +
      "</div>"
    );
  }

  function platoHTML(it, si, pi) {
    return (
      '<div class="plato-row" data-plato="' + si + "-" + pi + '">' +
        '<div class="plato-row__top">' +
          '<input class="field__input" data-plato-n="' + si + "-" + pi + '" value="' + esc(it.n || "") +
            '" placeholder="Nombre del plato" />' +
          '<button type="button" class="btn-danger" data-del-plato="' + si + "-" + pi + '">✕</button>' +
        "</div>" +
        '<input class="field__input" data-plato-d="' + si + "-" + pi + '" value="' + esc(it.d || "") +
          '" placeholder="Descripción" />' +
        '<input class="field__input" data-plato-p="' + si + "-" + pi + '" type="number" min="0" step="100" value="' +
          esc(it.p != null ? it.p : "") + '" placeholder="Precio (ej. 12000)" />' +
      "</div>"
    );
  }

  // Lee los valores actuales del formulario hacia el objeto "editando".
  function leerEditor() {
    var r = editando;
    elEditorBody.querySelectorAll("[data-campo]").forEach(function (el) {
      var k = el.getAttribute("data-campo");
      if (k === "color") r.color = el.value;
      else r[k] = el.value;
    });
    var ab = $("#campoAbierto");
    r.abierto = ab ? ab.checked : true;

    // Secciones y platos
    var nuevasSecs = [];
    elEditorBody.querySelectorAll("[data-seccion]").forEach(function (secEl) {
      var si = secEl.getAttribute("data-seccion");
      var nombreSec = secEl.querySelector('[data-sec-nombre="' + si + '"]');
      var items = [];
      secEl.querySelectorAll("[data-plato]").forEach(function (pEl) {
        var key = pEl.getAttribute("data-plato");
        var n = pEl.querySelector('[data-plato-n="' + key + '"]');
        var d = pEl.querySelector('[data-plato-d="' + key + '"]');
        var p = pEl.querySelector('[data-plato-p="' + key + '"]');
        var nombre = n ? n.value.trim() : "";
        if (!nombre) return;
        items.push({
          id: slug(nombre) + "-" + Math.random().toString(36).slice(2, 6),
          n: nombre,
          d: d ? d.value.trim() : "",
          p: p ? Number(p.value) || 0 : 0,
        });
      });
      nuevasSecs.push({ sec: nombreSec ? nombreSec.value.trim() : "Sección", items: items });
    });
    r.carta = nuevasSecs;
  }

  function enlazarEditor() {
    // Subir foto
    var fotoInput = $("#fotoInput");
    if (fotoInput) {
      fotoInput.addEventListener("change", async function () {
        var file = fotoInput.files && fotoInput.files[0];
        if (!file) return;
        var txt = $("#subirTxt");
        txt.innerHTML = '<span class="spinner"></span>Subiendo…';
        try {
          var url = await window.Store.subirFoto(file, "restaurantes");
          editando.logo = url;
          leerEditor();           // conservar lo escrito
          pintarEditor();         // repintar con la foto
          toast("Foto subida ✓");
        } catch (ex) {
          toast("No se pudo subir: " + (ex && ex.message ? ex.message : "error"), true);
          txt.textContent = "📷 Subir foto";
        }
      });
    }
  }

  /* ------------------- Delegación de eventos ---------------------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest) return;

    // Cerrar editor
    if (t.closest("[data-editor-close]")) { cerrarEditor(); return; }

    // Nuevo restaurante
    if (t.closest("#btnNuevo")) { abrirEditor(nuevoRestaurante()); return; }

    // Migrar restaurantes de ejemplo (data.js) a la base de datos
    if (t.closest("#btnMigrar")) { migrar(); return; }

    // Pestañas
    var tab = t.closest("[data-tab]");
    if (tab) { cambiarTab(tab.getAttribute("data-tab")); return; }

    // Pedidos: refrescar
    if (t.closest("#btnRefrescarPedidos")) { recargarPedidos(); return; }

    // Pedidos: avanzar estado
    var av = t.closest("[data-avanzar]");
    if (av) { avanzarPedido(av.getAttribute("data-avanzar"), av.getAttribute("data-estado")); return; }

    // Pedidos: cancelar
    var ca = t.closest("[data-cancelar]");
    if (ca) { cancelarPedido(ca.getAttribute("data-cancelar")); return; }

    // Editar / borrar en la lista
    var ed = t.closest("[data-editar]");
    if (ed) {
      var id = ed.getAttribute("data-editar");
      var r = restaurantes.filter(function (x) { return x.id === id; })[0];
      if (r) abrirEditor(r);
      return;
    }
    var bo = t.closest("[data-borrar]");
    if (bo) { borrar(bo.getAttribute("data-borrar")); return; }

    // Quitar foto
    if (t.closest("[data-quitar-foto]")) {
      leerEditor(); editando.logo = ""; pintarEditor(); return;
    }

    // Secciones
    if (t.closest("[data-add-seccion]")) {
      leerEditor(); editando.carta.push({ sec: "", items: [] }); pintarEditor(); return;
    }
    var delSec = t.closest("[data-del-seccion]");
    if (delSec) {
      leerEditor();
      editando.carta.splice(Number(delSec.getAttribute("data-del-seccion")), 1);
      pintarEditor(); return;
    }
    var addPlato = t.closest("[data-add-plato]");
    if (addPlato) {
      leerEditor();
      var si = Number(addPlato.getAttribute("data-add-plato"));
      editando.carta[si].items.push({ n: "", d: "", p: 0 });
      pintarEditor(); return;
    }
    var delPlato = t.closest("[data-del-plato]");
    if (delPlato) {
      leerEditor();
      var parts = delPlato.getAttribute("data-del-plato").split("-");
      editando.carta[Number(parts[0])].items.splice(Number(parts[1]), 1);
      pintarEditor(); return;
    }

    // Guardar
    if (t.closest("#btnGuardar")) { guardar(); return; }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !elEditorSheet.hidden) cerrarEditor();
  });

  // Filtro de pedidos por estado
  document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "filtroPedidos") recargarPedidos();
  });

  async function guardar() {
    leerEditor();
    var r = editando;
    if (!r.nombre.trim()) { toast("Ponle un nombre al restaurante", true); return; }
    if (!r.cat.trim()) { toast("Ponle una categoría", true); return; }
    if (!r.id) r.id = slug(r.nombre);

    var btn = $("#btnGuardar");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Guardando…';
    try {
      delete r._esNuevo;
      await window.Store.guardar(r);
      toast("Guardado ✓");
      cerrarEditor();
      await recargarLista();
    } catch (ex) {
      toast("No se pudo guardar: " + (ex && ex.message ? ex.message : "error"), true);
      btn.disabled = false;
      btn.textContent = "Guardar cambios";
    }
  }

  async function borrar(id) {
    var r = restaurantes.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    if (!confirm('¿Borrar "' + r.nombre + '"? Esta acción no se puede deshacer.')) return;
    try {
      await window.Store.eliminar(id);
      toast("Restaurante borrado");
      await recargarLista();
    } catch (ex) {
      toast("No se pudo borrar: " + (ex && ex.message ? ex.message : "error"), true);
    }
  }

  async function migrar() {
    if (!confirm("Esto subirá los restaurantes de ejemplo (data.js) a la base de datos. " +
                 "Si ya existe uno con el mismo id, se actualizará. ¿Continuar?")) return;
    var btn = document.getElementById("btnMigrar");
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Migrando…'; }
    try {
      var n = await window.Store.migrarDesdeData();
      toast(n + " restaurantes migrados ✓");
      await recargarLista();
    } catch (ex) {
      toast("No se pudo migrar: " + (ex && ex.message ? ex.message : "error"), true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "⬆️ Migrar ejemplos"; }
    }
  }

  /* ------------------------- Pestañas ----------------------------- */
  function cambiarTab(cual) {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("tab--active", t.getAttribute("data-tab") === cual);
    });
    var r = document.getElementById("tabRestaurantes");
    var p = document.getElementById("tabPedidos");
    if (r) r.hidden = cual !== "restaurantes";
    if (p) p.hidden = cual !== "pedidos";
    if (cual === "pedidos") recargarPedidos();
  }

  /* ------------------------- Pedidos ------------------------------ */
  function money(n) {
    try {
      return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
    } catch (e) {
      return "$" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
  }

  async function recargarPedidos() {
    var cont = document.getElementById("listaPedidos");
    if (cont) cont.innerHTML = '<p class="muted">Cargando pedidos…</p>';
    var filtro = document.getElementById("filtroPedidos");
    var estado = filtro ? filtro.value : "todos";
    try {
      pedidos = await window.Store.listarPedidos(estado);
      pintarPedidos();
    } catch (ex) {
      if (cont) cont.innerHTML = '<p class="muted">No se pudieron cargar los pedidos: ' +
        esc(ex && ex.message ? ex.message : "error") + "</p>";
    }
  }

  function pintarPedidos() {
    var cont = document.getElementById("listaPedidos");
    if (!cont) return;
    if (!pedidos.length) {
      cont.innerHTML = '<p class="muted">No hay pedidos para mostrar.</p>';
      return;
    }
    var html = "";
    for (var i = 0; i < pedidos.length; i++) {
      html += pedidoHTML(pedidos[i]);
    }
    cont.innerHTML = html;
  }

  function fechaCorta(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleString("es-CO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  }

  function pedidoHTML(p) {
    var cliente = p.cliente || {};
    var items = p.items || [];
    var lineas = "";
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      lineas += '<li>' + esc(it.cantidad) + " × " + esc(it.plato) +
        ' <span class="muted">(' + esc(it.restaurante) + ")</span> — " + esc(money(it.subtotal)) + "</li>";
    }

    // Botones de cambio de estado
    var acciones = "";
    if (p.estado !== "entregado" && p.estado !== "cancelado") {
      var idx = ESTADOS.indexOf(p.estado);
      if (idx !== -1 && idx < ESTADOS.length - 1) {
        var sig = ESTADOS[idx + 1];
        acciones += '<button type="button" class="btn-primary btn-sm" data-avanzar="' + esc(p.id) +
          '" data-estado="' + esc(sig) + '">Marcar: ' + esc(ESTADO_LABEL[sig]) + "</button>";
      }
      acciones += '<button type="button" class="btn-danger btn-sm" data-cancelar="' + esc(p.id) + '">Cancelar</button>';
    }

    return (
      '<article class="pedido estado-' + esc(p.estado) + '">' +
        '<div class="pedido__head">' +
          '<span class="pedido__codigo">' + esc(p.codigo || p.id.slice(0, 6)) + "</span>" +
          '<span class="estado-badge estado-badge--' + esc(p.estado) + '">' + esc(ESTADO_LABEL[p.estado] || p.estado) + "</span>" +
          '<span class="pedido__fecha">' + esc(fechaCorta(p.creado_en)) + "</span>" +
        "</div>" +
        '<ul class="pedido__items">' + lineas + "</ul>" +
        '<div class="pedido__total">Total: <strong>' + esc(money(p.total || 0)) + "</strong> <span class=\"muted\">(domicilio aparte)</span></div>" +
        '<div class="pedido__cliente">' +
          "👤 " + esc(cliente.nombre || "—") + " · 📞 " + esc(cliente.telefono || "—") + "<br>" +
          "📍 " + esc(cliente.direccion || "—") + ", " + esc(cliente.barrio || "—") +
          " · 💳 " + esc(cliente.pago || "—") +
          (cliente.notas ? "<br>📝 " + esc(cliente.notas) : "") +
          (p.incidencia ? '<br><span class="pedido__incidencia">⚠️ ' + esc(p.incidencia) + "</span>" : "") +
        "</div>" +
        (acciones ? '<div class="pedido__actions">' + acciones + "</div>" : "") +
      "</article>"
    );
  }

  async function avanzarPedido(id, estado) {
    try {
      await window.Store.actualizarEstadoPedido(id, estado);
      toast("Pedido → " + (ESTADO_LABEL[estado] || estado));
      await recargarPedidos();
    } catch (ex) {
      toast("No se pudo actualizar: " + (ex && ex.message ? ex.message : "error"), true);
    }
  }

  async function cancelarPedido(id) {
    var motivo = prompt("Motivo de la cancelación / incidencia (opcional):", "");
    if (motivo === null) return; // canceló el prompt
    try {
      await window.Store.actualizarEstadoPedido(id, "cancelado", motivo || "");
      toast("Pedido cancelado");
      await recargarPedidos();
    } catch (ex) {
      toast("No se pudo cancelar: " + (ex && ex.message ? ex.message : "error"), true);
    }
  }

  /* --------------------------- Arranque --------------------------- */
  (async function init() {
    if (!window.Store || !window.Store.supabaseDisponible()) {
      mostrar("config");
      return;
    }
    enlazarLogin();
    try {
      await iniciarPanel();
    } catch (ex) {
      mostrar("login");
    }
  })();
})();
