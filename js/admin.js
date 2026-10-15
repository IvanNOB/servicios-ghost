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

  // Fecha de hoy YYYY-MM-DD (hora local).
  function hoyISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1); if (m.length < 2) m = "0" + m;
    var dd = String(d.getDate()); if (dd.length < 2) dd = "0" + dd;
    return d.getFullYear() + "-" + m + "-" + dd;
  }
  function almuerzoHoy(r) {
    var a = r && r.almuerzo;
    return !!(a && a.activo && (!a.fecha || a.fecha === hoyISO()));
  }

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
    pintarAlmuerzos();
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
              " · " + contarPlatos(r) + " platos" + (almuerzoHoy(r) ? " · 🍲 almuerzo hoy" : "") + "</div>" +
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
      importadorHTML(r) +
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

      almuerzoEditorHTML(r) +

      '<h3 class="editor-section__title" style="margin:18px 0 10px">Carta</h3>' +
      '<div id="secciones">' + seccionesHTML + "</div>" +
      '<button type="button" class="btn-copy" data-add-seccion style="margin-bottom:16px">+ Agregar sección</button>' +

      '<div class="actions">' +
        '<button type="button" class="btn-primary" id="btnGuardar">Guardar cambios</button>' +
      "</div>";

    enlazarEditor();
  }

  // Caja "Pegar carta": convierte texto en carta automáticamente.
  function importadorHTML(r) {
    var abierto = r._esNuevo || r._importTexto || r._importMsg;
    return (
      '<details class="importar"' + (abierto ? " open" : "") + ">" +
        '<summary class="importar__summary">📋 Pegar carta (se llena sola)</summary>' +
        '<div class="importar__body">' +
          '<ol class="importar__pasos muted">' +
            "<li>Toca <strong>“Copiar prompt”</strong> y pégalo en ChatGPT junto con la foto del menú.</li>" +
            "<li>Copia lo que te responda y pégalo aquí abajo (también sirve una lista simple: <code>Plato - 15000</code>).</li>" +
            "<li>Toca <strong>“Llenar carta”</strong>, revisa y pulsa <strong>Guardar cambios</strong>.</li>" +
          "</ol>" +
          '<textarea class="field__textarea importar__texto" id="importTexto" rows="9" placeholder="NOMBRE: …&#10;CATEGORÍA: …&#10;&#10;[Hamburguesas]&#10;Sencilla | Carne, queso y vegetales | 12000&#10;Doble carne || 15000">' +
            esc(r._importTexto || "") + "</textarea>" +
          '<div class="inline-actions">' +
            '<button type="button" class="btn-primary" data-import="reemplazar">✨ Llenar carta</button>' +
            (r.carta && r.carta.length
              ? '<button type="button" class="btn-copy" data-import="agregar">+ Agregar a la carta actual</button>' : "") +
            '<button type="button" class="btn-copy" data-copiar-prompt>📄 Copiar prompt para ChatGPT</button>' +
          "</div>" +
          '<div class="importar__msg" id="importMsg">' + (r._importMsg || "") + "</div>" +
        "</div>" +
      "</details>"
    );
  }

  // Lee el texto pegado y llena el restaurante en edición.
  function importarCarta(modo) {
    leerEditor();
    var r = editando;
    var texto = r._importTexto || "";
    if (!texto.trim()) { toast("Primero pega el texto de la carta", true); return; }
    if (!window.Importar) { toast("No se cargó el importador. Recarga la página.", true); return; }

    // 1ª pasada para conocer el nombre (y así armar ids con prefijo del restaurante)
    var previo = window.Importar.parsearCarta(texto, "r").datos;
    var prefijo = r.id || slug(previo.nombre || r.nombre || "rest");
    var res = window.Importar.parsearCarta(texto, prefijo);
    var d = res.datos;
    var nPlatos = 0;
    d.carta.forEach(function (s) { nPlatos += s.items.length; });

    if (!nPlatos && !d.almuerzo && !d.nombre) {
      toast("No encontré platos en el texto. Revisa el formato.", true);
      return;
    }
    if (modo === "reemplazar" && r.carta && r.carta.length && nPlatos &&
        !confirm("Esto reemplazará la carta actual (" + contarPlatos(r) + " platos) por la nueva (" + nPlatos + " platos). ¿Continuar?")) {
      return;
    }

    // Datos generales: en "reemplazar" mandan los del texto; en "agregar" solo llenan vacíos.
    ["nombre", "cat", "tiempo", "desc"].forEach(function (k) {
      if (d[k] && (modo === "reemplazar" || !r[k])) r[k] = d[k];
    });
    if (typeof d.abierto === "boolean") r.abierto = d.abierto;

    if (modo === "agregar") {
      var usados = {};
      (r.carta || []).forEach(function (s) { (s.items || []).forEach(function (it) { usados[it.id] = true; }); });
      d.carta.forEach(function (s) {
        s.items.forEach(function (it) {
          var base = it.id, k = 2;
          while (usados[it.id]) it.id = base + "-" + (k++);
          usados[it.id] = true;
        });
      });
      r.carta = (r.carta || []).concat(d.carta);
    } else if (nPlatos) {
      r.carta = d.carta;
    }
    if (d.almuerzo) { d.almuerzo.fecha = hoyISO(); r.almuerzo = d.almuerzo; }

    var msg = "✅ Listo: " + d.carta.length + " secciones y " + nPlatos + " platos" +
      (d.almuerzo ? " + almuerzo del día" : "") + ". Revisa abajo y pulsa <strong>Guardar cambios</strong>.";
    if (res.avisos.length) {
      msg += '<div class="importar__avisos">⚠️ Revisa:<ul>' +
        res.avisos.slice(0, 10).map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") +
        (res.avisos.length > 10 ? "<li>… y " + (res.avisos.length - 10) + " más</li>" : "") + "</ul></div>";
    }
    r._importTexto = "";
    r._importMsg = msg;
    pintarEditor();
    toast("Carta cargada: " + nPlatos + " platos ✓");
  }

  // Copia el prompt de ChatGPT al portapapeles.
  function copiarPrompt() {
    var texto = window.Importar ? window.Importar.PROMPT : "";
    function ok() { toast("Prompt copiado ✓ Pégalo en ChatGPT con la foto del menú"); }
    function respaldo() {
      var ta = document.createElement("textarea");
      ta.value = texto; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { toast("No se pudo copiar", true); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(ok, respaldo);
    } else {
      respaldo();
    }
  }

  // Editor del "almuerzo del día": activar, precio, grupos y opciones (con agotados).
  function almuerzoEditorHTML(r) {
    var a = r.almuerzo || {};
    var activo = !!a.activo;
    var grupos = Array.isArray(a.grupos) ? a.grupos : [];

    var gruposHTML = "";
    for (var gi = 0; gi < grupos.length; gi++) {
      var g = grupos[gi];
      var ops = Array.isArray(g.opciones) ? g.opciones : [];
      var opsHTML = "";
      for (var oi = 0; oi < ops.length; oi++) {
        var op = ops[oi];
        opsHTML +=
          '<div class="alm-op-row" data-alm-op="' + gi + "-" + oi + '">' +
            '<input class="field__input" data-alm-op-n="' + gi + "-" + oi + '" value="' + esc(op.n || "") +
              '" placeholder="Opción (ej. Pollo frito)" />' +
            '<input class="field__input alm-op-precio" data-alm-op-p="' + gi + "-" + oi + '" type="number" min="0" step="100" value="' +
              esc(op.precio != null ? op.precio : "") + '" placeholder="Precio (opc.)" title="Precio solo si esta opción cambia el valor del almuerzo" />' +
            '<label class="agotado-check"><input type="checkbox" data-alm-op-ag="' + gi + "-" + oi + '"' +
              (op.agotado ? " checked" : "") + " /> Agotado</label>" +
            '<button type="button" class="btn-danger btn-sm" data-alm-del-op="' + gi + "-" + oi + '">✕</button>' +
          "</div>";
      }
      gruposHTML +=
        '<div class="alm-grupo-edit" data-alm-g="' + gi + '">' +
          '<div class="alm-grupo-edit__head">' +
            '<input class="field__input" data-alm-g-n="' + gi + '" value="' + esc(g.nombre || "") +
              '" placeholder="Grupo (ej. Proteína)" style="font-weight:700" />' +
            '<button type="button" class="btn-danger btn-sm" data-alm-del-g="' + gi + '">Quitar grupo</button>' +
          "</div>" +
          '<div data-alm-ops="' + gi + '">' + opsHTML + "</div>" +
          '<button type="button" class="btn-copy btn-sm" data-alm-add-op="' + gi + '">+ Opción</button>' +
        "</div>";
    }

    return (
      '<div class="editor-section" style="margin-top:16px">' +
        '<div class="editor-section__head">' +
          '<span class="editor-section__title">🍽️ Almuerzo del día</span>' +
          '<label class="agotado-check"><input type="checkbox" id="almActivo"' +
            (activo ? " checked" : "") + " /> Ofrece almuerzo</label>" +
        "</div>" +
        '<p class="muted" style="font-size:.85rem;margin:0 0 10px">Para publicar lo de cada día usa la pestaña ' +
          "<strong>🍲 Almuerzos del día</strong>." +
          (a.fecha ? " Última publicación: <strong>" + esc(a.fecha) + "</strong>." : "") + "</p>" +
        '<div class="grid-2">' +
          '<div class="field"><label class="field__label">Título</label>' +
            '<input class="field__input" id="almTitulo" value="' + esc(a.titulo || "Almuerzo del día") + '" /></div>' +
          '<div class="field"><label class="field__label">Precio</label>' +
            '<input class="field__input" id="almPrecio" type="number" min="0" step="100" value="' +
              esc(a.precio != null ? a.precio : "") + '" placeholder="Ej: 15000" /></div>' +
        "</div>" +
        '<div class="field"><label class="field__label">Descripción (opcional)</label>' +
          '<input class="field__input" id="almDesc" value="' + esc(a.desc || "") +
          '" placeholder="Ej: Incluye sopa, principio, proteína y bebida" /></div>' +
        '<div id="almGrupos">' + gruposHTML + "</div>" +
        '<button type="button" class="btn-copy btn-sm" data-alm-add-g>+ Agregar grupo de opciones</button>' +
      "</div>"
    );
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
      '<div class="plato-row" data-plato="' + si + "-" + pi + '" data-plato-id="' + esc(it.id || "") + '">' +
        '<div class="plato-row__top">' +
          '<input class="field__input" data-plato-n="' + si + "-" + pi + '" value="' + esc(it.n || "") +
            '" placeholder="Nombre del plato" />' +
          '<button type="button" class="btn-danger" data-del-plato="' + si + "-" + pi + '">✕</button>' +
        "</div>" +
        '<input class="field__input" data-plato-d="' + si + "-" + pi + '" value="' + esc(it.d || "") +
          '" placeholder="Descripción" />' +
        '<input class="field__input" data-plato-p="' + si + "-" + pi + '" type="number" min="0" step="100" value="' +
          esc(it.p != null ? it.p : "") + '" placeholder="Precio (ej. 12000)" />' +
        '<label class="agotado-check"><input type="checkbox" data-plato-ag="' + si + "-" + pi + '"' +
          (it.agotado ? " checked" : "") + " /> Agotado</label>" +
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
    var imp = $("#importTexto");
    if (imp) r._importTexto = imp.value;
    var usadosIds = {};

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
        var ag = pEl.querySelector('[data-plato-ag="' + key + '"]');
        var nombre = n ? n.value.trim() : "";
        if (!nombre) return;
        // Conservar el id existente (así los carritos de clientes no se rompen).
        var idPlato = pEl.getAttribute("data-plato-id") || "";
        if (!idPlato || usadosIds[idPlato]) idPlato = slug(nombre) + "-" + Math.random().toString(36).slice(2, 6);
        usadosIds[idPlato] = true;
        items.push({
          id: idPlato,
          n: nombre,
          d: d ? d.value.trim() : "",
          p: p ? Number(p.value) || 0 : 0,
          agotado: ag ? ag.checked : false,
        });
      });
      nuevasSecs.push({ sec: nombreSec ? nombreSec.value.trim() : "Sección", items: items });
    });
    r.carta = nuevasSecs;

    // Leer configuración del almuerzo
    var anterior = r.almuerzo || {};
    var almActivo = $("#almActivo");
    var grupos = [];
    elEditorBody.querySelectorAll("[data-alm-g]").forEach(function (gEl) {
      var gi = gEl.getAttribute("data-alm-g");
      var gn = gEl.querySelector('[data-alm-g-n="' + gi + '"]');
      var opciones = [];
      gEl.querySelectorAll("[data-alm-op]").forEach(function (oEl) {
        var key = oEl.getAttribute("data-alm-op");
        var on = oEl.querySelector('[data-alm-op-n="' + key + '"]');
        var oag = oEl.querySelector('[data-alm-op-ag="' + key + '"]');
        var opp = oEl.querySelector('[data-alm-op-p="' + key + '"]');
        var nombre = on ? on.value.trim() : "";
        if (!nombre) return;
        var opObj = { n: nombre, agotado: oag ? oag.checked : false };
        var precioOp = opp ? Number(opp.value) : 0;
        if (precioOp > 0) opObj.precio = precioOp;
        opciones.push(opObj);
      });
      // Conservar propiedades que el formulario no muestra (tipo, condición, opcional).
      var previo = (anterior.grupos || [])[Number(gi)] || {};
      var grupo = { nombre: gn ? gn.value.trim() : "Opciones", tipo: previo.tipo || "unico", opciones: opciones };
      if (previo.mostrarSi) grupo.mostrarSi = previo.mostrarSi;
      if (previo.opcional) grupo.opcional = true;
      grupos.push(grupo);
    });
    r.almuerzo = {
      activo: almActivo ? almActivo.checked : false,
      titulo: ($("#almTitulo") && $("#almTitulo").value.trim()) || "Almuerzo del día",
      desc: ($("#almDesc") && $("#almDesc").value.trim()) || "",
      precio: ($("#almPrecio") && Number($("#almPrecio").value)) || 0,
      fecha: anterior.fecha || "",
      grupos: grupos,
    };
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

  /* --------------------- Almuerzos del día ------------------------ */
  var elListaAlm = $("#listaAlmuerzos");
  var elAlmSheet = $("#almSheet");
  var elAlmBody = $("#almSheetBody");
  var almEditando = null; // restaurante cuyo almuerzo se está publicando

  function pintarAlmuerzos() {
    if (!elListaAlm) return;
    if (!restaurantes.length) {
      elListaAlm.innerHTML = '<p class="muted">Aún no hay restaurantes.</p>';
      return;
    }
    // Primero los publicados hoy, luego los que tienen almuerzo, luego el resto.
    var lista = restaurantes.slice().sort(function (a, b) {
      function peso(r) { return almuerzoHoy(r) ? 0 : (r.almuerzo && r.almuerzo.grupos ? 1 : 2); }
      return peso(a) - peso(b);
    });
    var html = "";
    for (var i = 0; i < lista.length; i++) {
      var r = lista[i];
      var a = r.almuerzo || {};
      var hoy = almuerzoHoy(r);
      var estado = hoy
        ? '<span class="estado-badge estado-badge--entregado">✅ Publicado hoy</span>'
        : (a.fecha ? '<span class="estado-badge estado-badge--cancelado">Último: ' + esc(a.fecha) + "</span>"
                   : '<span class="estado-badge estado-badge--preparando">Sin publicar</span>');
      var resumen = hoy
        ? esc((a.titulo || "Almuerzo") + (a.precio ? " · " + money(a.precio) : "")) : "";
      html +=
        '<div class="admin-card">' +
          '<div class="admin-card__info">' +
            '<div class="admin-card__name">' + esc(r.nombre) + "</div>" +
            '<div class="admin-card__meta">' + estado + (resumen ? " " + resumen : "") + "</div>" +
          "</div>" +
          '<div class="admin-card__actions">' +
            '<button type="button" class="btn-primary btn-sm" data-alm-publicar="' + esc(r.id) + '">' +
              (hoy ? "Editar hoy" : "Publicar hoy") + "</button>" +
            (hoy ? '<button type="button" class="btn-danger btn-sm" data-alm-quitar="' + esc(r.id) + '">Quitar</button>' : "") +
          "</div>" +
        "</div>";
    }
    elListaAlm.innerHTML = html;
  }

  function abrirPublicarAlmuerzo(id) {
    var r = restaurantes.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    almEditando = JSON.parse(JSON.stringify(r));
    var a = almEditando.almuerzo || {};
    var opciones = window.Importar ? window.Importar.opcionesATexto(a.grupos || []) : "";
    $("#almSheetTitle").textContent = "Almuerzo de hoy · " + r.nombre;
    elAlmBody.innerHTML =
      '<p class="muted" style="margin-bottom:12px">Hoy es <strong>' + esc(hoyISO()) + "</strong>. " +
        "Lo de ayer ya viene cargado: solo cambia lo que sea distinto y pulsa Publicar.</p>" +
      '<div class="grid-2">' +
        '<div class="field"><label class="field__label" for="pubTitulo">Título</label>' +
          '<input class="field__input" id="pubTitulo" value="' + esc(a.titulo || "Almuerzo del día") + '" /></div>' +
        '<div class="field"><label class="field__label" for="pubPrecio">Precio</label>' +
          '<input class="field__input" id="pubPrecio" type="number" min="0" step="500" value="' +
            esc(a.precio || "") + '" placeholder="Ej: 13000" /></div>' +
      "</div>" +
      '<div class="field"><label class="field__label" for="pubDesc">¿Qué incluye? (opcional)</label>' +
        '<input class="field__input" id="pubDesc" value="' + esc(a.desc || "") +
        '" placeholder="Ej: Sopa, arroz, principio, proteína, ensalada y jugo" /></div>' +
      '<div class="field"><label class="field__label" for="pubOpciones">Opciones de hoy (una línea por grupo)</label>' +
        '<textarea class="field__textarea" id="pubOpciones" rows="7" placeholder="Sopa: Sancocho, Ajiaco&#10;Proteína: Pollo frito, Res, Cerdo (agotado)&#10;Principio: Fríjol, Lenteja&#10;Bebida: Limonada, Jugo de mango">' +
          esc(opciones) + "</textarea>" +
        '<p class="muted" style="font-size:.82rem;margin-top:6px">Formato: <code>Grupo: opción, opción</code>. ' +
          "Marca <code>(agotado)</code> si se acabó, o <code>(precio=10000)</code> si esa opción cambia el precio " +
          "(ej. <code>Sin sopa (precio=10000)</code>). Si no hay opciones, déjalo vacío.</p>" +
      "</div>" +
      '<div class="actions">' +
        '<button type="button" class="btn-primary" id="btnPublicarAlm">✅ Publicar para hoy</button>' +
      "</div>";
    elAlmSheet.hidden = false;
    document.body.classList.add("no-scroll");
  }

  function cerrarPublicarAlmuerzo() {
    elAlmSheet.hidden = true;
    document.body.classList.remove("no-scroll");
    almEditando = null;
  }

  async function guardarRestauranteAlm(r, msgOk) {
    if (typeof r.orden !== "number") r.orden = restaurantes.length;
    await window.Store.guardar(r);
    toast(msgOk);
    await recargarLista();
  }

  async function publicarAlmuerzo() {
    var r = almEditando;
    if (!r) return;
    var anterior = r.almuerzo || {};
    var grupos = window.Importar.parsearOpciones($("#pubOpciones").value);
    // Conservar condiciones (ej. "Sopa" solo si eligen "Con sopa") de grupos con el mismo nombre.
    grupos.forEach(function (g) {
      (anterior.grupos || []).forEach(function (p) {
        if (p.nombre && p.nombre.toLowerCase() === g.nombre.toLowerCase()) {
          if (p.mostrarSi) g.mostrarSi = p.mostrarSi;
          if (p.tipo) g.tipo = p.tipo;
          if (p.opcional) g.opcional = true;
        }
      });
    });
    var precio = Number($("#pubPrecio").value) || 0;
    var hayPrecioOpcion = grupos.some(function (g) {
      return (g.opciones || []).some(function (o) { return o.precio > 0; });
    });
    if (!precio && !hayPrecioOpcion) { toast("Ponle precio al almuerzo", true); return; }

    r.almuerzo = {
      activo: true,
      titulo: $("#pubTitulo").value.trim() || "Almuerzo del día",
      desc: $("#pubDesc").value.trim(),
      precio: precio,
      fecha: hoyISO(),
      grupos: grupos,
    };
    var btn = $("#btnPublicarAlm");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Publicando…';
    try {
      await guardarRestauranteAlm(r, "Almuerzo publicado para hoy ✓");
      cerrarPublicarAlmuerzo();
    } catch (ex) {
      toast(mensajeErrorGuardar(ex), true);
      btn.disabled = false;
      btn.textContent = "✅ Publicar para hoy";
    }
  }

  async function quitarAlmuerzo(id) {
    var r = restaurantes.filter(function (x) { return x.id === id; })[0];
    if (!r || !r.almuerzo) return;
    if (!confirm("¿Quitar el almuerzo de hoy de " + r.nombre + "?")) return;
    var copia = JSON.parse(JSON.stringify(r));
    copia.almuerzo.activo = false;
    try {
      await guardarRestauranteAlm(copia, "Almuerzo quitado");
    } catch (ex) {
      toast(mensajeErrorGuardar(ex), true);
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

    // Pegar carta automática / copiar prompt
    var imp = t.closest("[data-import]");
    if (imp) { importarCarta(imp.getAttribute("data-import")); return; }
    if (t.closest("[data-copiar-prompt]")) { copiarPrompt(); return; }

    // Almuerzos del día
    if (t.closest("[data-alm-close]")) { cerrarPublicarAlmuerzo(); return; }
    var pub = t.closest("[data-alm-publicar]");
    if (pub) { abrirPublicarAlmuerzo(pub.getAttribute("data-alm-publicar")); return; }
    var qui = t.closest("[data-alm-quitar]");
    if (qui) { quitarAlmuerzo(qui.getAttribute("data-alm-quitar")); return; }
    if (t.closest("#btnPublicarAlm")) { publicarAlmuerzo(); return; }
    if (t.closest("#btnNuevoLugarAlm")) {
      var nl = nuevoRestaurante();
      nl.cat = "Almuerzos corrientes";
      nl.almuerzo = { activo: false, titulo: "Almuerzo del día", desc: "", precio: 0, grupos: [] };
      abrirEditor(nl);
      return;
    }

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
      editando.carta[si].items.push({ n: "", d: "", p: 0, agotado: false });
      pintarEditor(); return;
    }
    var delPlato = t.closest("[data-del-plato]");
    if (delPlato) {
      leerEditor();
      var parts = delPlato.getAttribute("data-del-plato").split("-");
      editando.carta[Number(parts[0])].items.splice(Number(parts[1]), 1);
      pintarEditor(); return;
    }

    // Almuerzo: agregar grupo
    if (t.closest("[data-alm-add-g]")) {
      leerEditor();
      if (!editando.almuerzo) editando.almuerzo = { activo: true, grupos: [] };
      if (!editando.almuerzo.grupos) editando.almuerzo.grupos = [];
      editando.almuerzo.grupos.push({ nombre: "", tipo: "unico", opciones: [{ n: "", agotado: false }] });
      pintarEditor(); return;
    }
    // Almuerzo: quitar grupo
    var delG = t.closest("[data-alm-del-g]");
    if (delG) {
      leerEditor();
      editando.almuerzo.grupos.splice(Number(delG.getAttribute("data-alm-del-g")), 1);
      pintarEditor(); return;
    }
    // Almuerzo: agregar opción
    var addOp = t.closest("[data-alm-add-op]");
    if (addOp) {
      leerEditor();
      var gi = Number(addOp.getAttribute("data-alm-add-op"));
      editando.almuerzo.grupos[gi].opciones.push({ n: "", agotado: false });
      pintarEditor(); return;
    }
    // Almuerzo: quitar opción
    var delOp = t.closest("[data-alm-del-op]");
    if (delOp) {
      leerEditor();
      var p = delOp.getAttribute("data-alm-del-op").split("-");
      editando.almuerzo.grupos[Number(p[0])].opciones.splice(Number(p[1]), 1);
      pintarEditor(); return;
    }

    // Guardar
    if (t.closest("#btnGuardar")) { guardar(); return; }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && elAlmSheet && !elAlmSheet.hidden) { cerrarPublicarAlmuerzo(); return; }
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
    // Si se edita un restaurante de data.js sin "orden", darle uno coherente.
    if (typeof r.orden !== "number") r.orden = restaurantes.length;

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
      toast(mensajeErrorGuardar(ex), true);
      btn.disabled = false;
      btn.textContent = "Guardar cambios";
    }
  }

  // Traduce errores comunes de Supabase a algo accionable para el admin.
  function mensajeErrorGuardar(ex) {
    var msg = (ex && ex.message) ? String(ex.message) : "";
    var code = ex && ex.code ? String(ex.code) : "";
    // Columna inexistente (p. ej. falta "almuerzo" en la tabla) → 400 PGRST204 / 42703
    if (code === "PGRST204" || code === "42703" || /column .* does not exist/i.test(msg) ||
        /Could not find the '.*' column/i.test(msg)) {
      return "Falta una columna en la base de datos. Ejecuta el SQL de supabase-setup.sql " +
             "(o el ALTER TABLE de la columna almuerzo) en Supabase y vuelve a intentar.";
    }
    // Sesión caducada / sin permisos → RLS
    if (code === "42501" || /row-level security|JWT|not authorized|permission denied/i.test(msg)) {
      return "Tu sesión caducó o no tienes permisos. Cierra sesión y vuelve a entrar.";
    }
    return "No se pudo guardar: " + (msg || "error desconocido");
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

  /* ------------------------- Pestañas ----------------------------- */
  function cambiarTab(cual) {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("tab--active", t.getAttribute("data-tab") === cual);
    });
    var r = document.getElementById("tabRestaurantes");
    var al = document.getElementById("tabAlmuerzos");
    var p = document.getElementById("tabPedidos");
    if (r) r.hidden = cual !== "restaurantes";
    if (al) al.hidden = cual !== "almuerzos";
    if (p) p.hidden = cual !== "pedidos";
    if (cual === "almuerzos") pintarAlmuerzos();
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
