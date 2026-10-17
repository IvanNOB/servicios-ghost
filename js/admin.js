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

  // Fecha YYYY-MM-DD en Colombia (igual que la tienda, sin importar la zona del PC).
  function fechaColombia(d) {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" })
        .format(d || new Date());
    } catch (e) {
      d = d || new Date();
      var m = String(d.getMonth() + 1); if (m.length < 2) m = "0" + m;
      var dd = String(d.getDate()); if (dd.length < 2) dd = "0" + dd;
      return d.getFullYear() + "-" + m + "-" + dd;
    }
  }
  function hoyISO() { return fechaColombia(); }

  // Perfil del usuario con sesión: { rol: "admin" } o { rol: "aliado", restaurante_id }.
  var perfil = { rol: "admin" };
  function esAliado() { return perfil && perfil.rol === "aliado"; }
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
    try {
      perfil = await window.Store.miPerfil();
    } catch (ex) {
      // No sabemos qué permisos tiene: mejor no mostrar nada que mostrar de más.
      mostrar("login");
      $("#loginError").textContent = "No pudimos verificar tu cuenta (" + (ex && ex.message ? ex.message : "sin conexión") +
        "). Revisa tu internet y recarga la página.";
      return;
    }
    if (!perfil) {
      mostrar("login");
      $("#loginError").textContent = "Tu cuenta no tiene permisos todavía. Pídele al administrador de Servicios Ghost que te asigne tu restaurante.";
      await window.Store.salir();
      return;
    }
    elAdminUser.textContent = (sesion.user && sesion.user.email ? sesion.user.email : "Admin") +
      (esAliado() ? " · aliado" : "");
    // El negocio aliado se queda en su panel: el logo no lo saca a la tienda de clientes.
    var logoPanel = document.querySelector(".admin-header .logo");
    if (logoPanel && esAliado()) { logoPanel.setAttribute("href", "admin.html"); logoPanel.setAttribute("aria-label", "Mi panel"); }
    aplicarRol();
    mostrar("panel");
    await recargarLista();
    if (!esAliado()) {
      revisarSql();
      iniciarAvisos();
    }
  }

  // Un aliado solo ve su restaurante y su almuerzo del día.
  function aplicarRol() {
    var aliado = esAliado();
    document.body.classList.toggle("modo-aliado", aliado);
    document.querySelectorAll("[data-solo-admin]").forEach(function (el) { el.hidden = aliado; });
    var tag = document.querySelector(".admin-header .logo__tag"); if (tag) tag.textContent = aliado ? "Mi negocio" : "Admin";
    var tabR = document.querySelector("[data-tab=restaurantes]"); if (tabR && aliado) tabR.textContent = "🏪 Mi negocio";
    var titR = document.querySelector("#tabRestaurantes .panel__title"); if (titR) titR.textContent = aliado ? "Mi negocio" : "Restaurantes";
    ["#btnNuevo", "#btnNuevoLugarAlm"].forEach(function (s) { var el = $(s); if (el) el.hidden = aliado; });
  }

  async function recargarLista() {
    restaurantes = await window.Store.listar();
    if (esAliado()) {
      restaurantes = restaurantes.filter(function (r) { return r.id === perfil.restaurante_id; });
    }
    pintarLista();
    pintarAlmuerzos();
  }

  // Avisa si falta ejecutar el SQL de mejoras (y qué se activa al hacerlo).
  async function revisarSql() {
    var el = $("#avisoSql");
    if (!el) return;
    await window.Store.leerAjustes(true);
    var faltan = [];
    if (perfil && perfil.legado) faltan.push("cuentas para aliados");
    if (window.Store.ajustesDisponibles() === false) faltan.push("domicilio por barrio, promociones y lo más pedido");
    var colsFalt = window.Store.columnasFaltantes();
    if (colsFalt.indexOf("horario") !== -1) faltan.push("horarios automáticos");
    if (colsFalt.indexOf("desayuno") !== -1 && !(perfil && perfil.legado) && faltan.length === 0) {
      el.hidden = false;
      el.innerHTML = "<strong>⚡ Un paso para activar los desayunos:</strong> en Supabase → <em>SQL Editor</em>, ejecuta esta línea y recarga:<br>" +
        "<code class=\"sql-linea\">alter table public.restaurantes add column if not exists desayuno jsonb default null;</code>";
      return;
    }
    if (colsFalt.indexOf("desayuno") !== -1) faltan.push("desayunos del día");
    if (colsFalt.indexOf("visible") !== -1 || colsFalt.indexOf("logo_ajuste") !== -1) faltan.push("ocultar negocios mientras organizan su carta y mostrar logos completos");
    if (perfil && perfil.legado) faltan.push("seguimiento del pedido para clientes");
    if (!faltan.length) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = "<strong>⚡ Falta un paso para activar:</strong> " + esc(faltan.join(", ")) + ". " +
      "Abre Supabase → <em>SQL Editor</em>, pega el archivo <code>supabase-mejoras.sql</code> del repositorio y pulsa <em>Run</em>. " +
      "Luego recarga esta página.";
  }

  function pintarLista() {
    if (!restaurantes.length) {
      elListaRest.innerHTML = '<p class="muted">Aún no hay restaurantes. Toca “+ Nuevo restaurante”.</p>';
      return;
    }
    var html = esAliado() && restaurantes[0] ? tableroAliadoHTML(restaurantes[0]) + bienvenidaAliadoHTML(restaurantes[0]) : "";
    var nuevas = esAliado() ? [] : restaurantes.filter(cartaNueva);
    if (nuevas.length) {
      html += '<div class="aviso-sql" style="grid-column:1/-1">🆕 <strong>Estas cartas son distintas a la versión que me pasaste por el chat:</strong> ' +
        esc(nuevas.map(function (r) { return r.nombre; }).join(", ")) +
        '. La tienda muestra la copia guardada en el panel. Toca <strong>“Revisar carta nueva”</strong> para ver qué cambia en cada una; si la diferencia son correcciones que hiciste tú en el panel, toca Cancelar y no pasa nada.</div>';
    }
    for (var i = 0; i < restaurantes.length; i++) {
      var r = restaurantes[i];
      var cover = estiloPortada(r);
      html +=
        '<div class="admin-card' + (r.visible === false ? " admin-card--oculto" : "") + '">' +
          (r.logo ? LogoGhost.recuadro(r, "admin-card__cover", { mosaico: true })
                  : '<div class="admin-card__cover" ' + cover + '>' + esc(iniciales(r.nombre)) + "</div>") +
          '<div class="admin-card__info">' +
            '<div class="admin-card__name">' + esc(r.nombre) +
              (r.visible === false ? ' <span class="estado-badge estado-badge--preparando">🙈 Oculto</span>' : "") + "</div>" +
            '<div class="admin-card__meta">' + esc(r.cat) + " · " + (r.abierto ? "Abierto" : "Cerrado") +
              " · " + contarPlatos(r) + " platos" + (contarConFoto(r) ? " · 📷 " + contarConFoto(r) + "/" + contarPlatos(r) : "") +
              (menuHoy(r, "desayuno") ? " · 🍳 desayuno hoy" : "") + (almuerzoHoy(r) ? " · 🍲 almuerzo hoy" : "") +
              (contarSinPrecio(r) ? ' · <span class="falta-precio">⚠️ ' + contarSinPrecio(r) + " sin precio</span>" : "") +
              "</div>" +
          "</div>" +
          '<div class="admin-card__actions">' +
            '<button type="button" class="btn-copy" data-editar="' + esc(r.id) + '">Editar</button>' +
            '<button type="button" class="btn-copy btn-sm" data-ali-disp="' + esc(r.id) + '" title="Marcar agotados y cambiar precios rápido">⚡ Disponibilidad</button>' +
            (!esAliado() && cartaNueva(r) ? '<button type="button" class="btn-primary btn-sm" data-sincronizar="' + esc(r.id) + '" title="La carta que me pasaste por el chat es distinta a la guardada. Toca para ver qué cambia antes de aplicarla.">🆕 Revisar carta nueva</button>' : "") +
            (esAliado() ? "" : '<button type="button" class="btn-danger" data-borrar="' + esc(r.id) + '">Borrar</button>') +
          "</div>" +
        "</div>";
    }
    elListaRest.innerHTML = html;
  }

  // Lista de pasos para el negocio aliado cuando entra al panel.
  function bienvenidaAliadoHTML(r) {
    var tieneHorario = r.horario && Object.keys(r.horario).some(function (k) { return r.horario[k]; });
    var pasos = [
      [!!r.logo, "Sube tu foto de perfil (logo o foto del local)"],
      [contarPlatos(r) > 0 && !contarSinPrecio(r), "Revisa tu carta: nombres, descripciones y precios" + (contarSinPrecio(r) ? " (" + contarSinPrecio(r) + " sin precio)" : "")],
      [contarConFoto(r) > 0, "Agrega fotos a tus productos más vendidos (" + contarConFoto(r) + " de " + contarPlatos(r) + ")"],
      [!!tieneHorario, "Pon tu horario de atención"],
      [r.visible !== false, "Publica tu negocio en la tienda"],
    ];
    var hechos = pasos.filter(function (p) { return p[0]; }).length;
    if (hechos === pasos.length) {
      return '<p class="bienvenida__ok" style="grid-column:1/-1">🎉 ¡Todo listo! ' + esc(r.nombre) + ' está publicado. Usa las herramientas de arriba en tu día a día.</p>';
    }
    return '<section class="bienvenida" style="grid-column:1/-1">' +
        "<h3>👋 ¡Bienvenidos, " + esc(r.nombre) + "!</h3>" +
        '<div class="progreso" aria-label="Avance"><span style="width:' + Math.round(hechos / pasos.length * 100) + '%"></span></div>' +
        '<p class="muted" style="margin:4px 0 0;font-size:.85rem">' + hechos + " de " + pasos.length + " pasos listos</p>" +
        '<p class="muted">Este es el panel de tu negocio. Aquí organizas tu carta como quieras; los cambios se ven en la tienda al pulsar <strong>Guardar cambios</strong>.</p>' +
        '<ol class="bienvenida__pasos">' + pasos.map(function (p) {
          return '<li class="' + (p[0] ? "hecho" : "") + '">' + (p[0] ? "✅ " : "⬜ ") + esc(p[1]) + "</li>";
        }).join("") + "</ol>" +
        '<div class="inline-actions">' +
          '<button type="button" class="btn-primary" data-editar="' + esc(r.id) + '">✏️ Editar mi carta</button>' +
          '<a class="btn-copy" href="' + esc(urlVistaPrevia(r.id)) + '" target="_blank" rel="noopener">👁️ Ver cómo se ve</a>' +
        "</div>" +
        '<details class="bienvenida__ayuda"><summary>💡 ¿Productos con tamaños o con/sin chantilly?</summary>' +
          "<ol>" +
            "<li>Deja <strong>un solo producto</strong> (ej. “Frappé de caramelo”) con el precio <strong>más bajo</strong>.</li>" +
            "<li>Debajo del producto toca <strong>⚙️ ¿El cliente elige algo?</strong> y luego <strong>📏 Tamaños</strong> o <strong>🍦 Con / sin chantilly</strong>.</li>" +
            "<li>Escribe el nombre de cada opción y, en <strong>+ $</strong>, cuánto <strong>más</strong> cuesta (ej. Grande + $3.000). Si cuesta lo mismo, déjalo vacío.</li>" +
            "<li>Debajo verás <strong>👀 El cliente ve</strong> con el precio final de cada opción. Puedes agregar tamaños y chantilly en el mismo producto.</li>" +
          "</ol>" +
        "</details>" +
      "</section>";
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
      color: "#3b82f6", desc: "", logo: "", logoAjuste: "foto", visible: true, carta: [], orden: restaurantes.length,
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

  // Fondo cuando no hay foto de perfil. Las fotos se pintan con LogoGhost (js/logo.js).
  function estiloPortada(r) { return 'style="background:' + esc(r.color || "#3b82f6") + '"'; }
  /* ------------- Editor de la foto de perfil: cada negocio la acomoda -------------
     Dos marcos (la carta y la lista), cada uno con su propio ajuste. En cada
     uno se puede agrandar la foto (para recortar) o achicarla (para que se vea
     completa); lo que sobra toma el color de fondo, que por defecto es el
     color del borde de la foto, para que no se note. */
  var _marcoLogo = "carta"; // marco que se está acomodando: "carta" | "lista"

  function posLogo(r) { return r.logoPos || { z: 1, x: 50, y: 50 }; }
  function marcoActual(r) {
    var p = posLogo(r);
    if (_marcoLogo === "lista") return p.l || { z: p.z, x: p.x, y: p.y };
    return { z: p.z, x: p.x, y: p.y };
  }

  function logoEditorHTML(r) {
    var p = posLogo(r);
    return (
      '<div class="logo-ed" id="logoEd">' +
        '<div class="logo-ed__vistas">' +
          '<button type="button" class="logo-ed__fig logo-ed__fig--banner" data-logo-marco="carta">' +
            '<span class="logo-ed__banner" id="logoEdBanner"></span>' +
            '<span class="logo-ed__cap">En tu carta</span>' +
          "</button>" +
          '<button type="button" class="logo-ed__fig logo-ed__fig--cuadro" data-logo-marco="lista">' +
            '<span class="logo-ed__cuadro" id="logoEdCuadro"></span>' +
            '<span class="logo-ed__cap">En la lista</span>' +
          "</button>" +
        "</div>" +
        '<p class="logo-ed__ayuda" id="logoEdAyuda"></p>' +

        '<div class="logo-ed__rapidos">' +
          '<button type="button" class="logo-ed__rapido" data-logo-ajustar="completa">🖼️ Que se vea completa</button>' +
          '<button type="button" class="logo-ed__rapido" data-logo-ajustar="llenar">⬛ Llenar el marco</button>' +
        "</div>" +

        '<div class="logo-ed__fila">' +
          '<span class="logo-ed__lbl">🔍 Tamaño</span>' +
          '<button type="button" class="logo-ed__btn" data-logo-zoom="-5" aria-label="Más pequeña">−</button>' +
          '<input type="range" id="logoZoom" min="' + Math.round(LogoGhost.ZMIN * 100) + '" max="' + Math.round(LogoGhost.ZMAX * 100) + '" step="1" aria-label="Tamaño de la foto en el marco" />' +
          '<button type="button" class="logo-ed__btn" data-logo-zoom="5" aria-label="Más grande">+</button>' +
          '<span class="logo-ed__val" id="logoZoomTxt"></span>' +
        "</div>" +

        '<div class="logo-ed__fila" id="logoFondoFila">' +
          '<span class="logo-ed__lbl">🎨 Fondo</span>' +
          '<label class="logo-ed__color"><input type="color" id="logoFondo" value="' + esc(p.b || "#111111") + '" /> <span>Elegir color</span></label>' +
          '<button type="button" class="btn-link" data-logo-fondo-auto>Color de la foto</button>' +
        "</div>" +

        '<div class="logo-ed__pie">' +
          '<span class="muted">Así lo verán tus clientes. Se guarda al tocar <strong>Guardar cambios</strong>.</span>' +
          '<button type="button" class="btn-link" data-logo-reset>↺ Empezar de nuevo</button>' +
        "</div>" +
      "</div>"
    );
  }

  // Repinta las dos vistas previas (rápido, sin redibujar el editor).
  function pintarLogoVistas() {
    var r = editando;
    if (!r || !r.logo) return;
    [["logoEdBanner", false], ["logoEdCuadro", true]].forEach(function (v) {
      var el = document.getElementById(v[0]);
      if (!el) return;
      var c = LogoGhost.portada(r, { sinLazy: true, mosaico: v[1] });
      var img = el.querySelector("img");
      if (img && img.getAttribute("src") === r.logo) {
        var tmp = document.createElement("div"); tmp.innerHTML = c.html;
        img.setAttribute("style", tmp.firstChild.getAttribute("style"));
        img.className = tmp.firstChild.className;
      } else {
        el.innerHTML = c.html;
        var nueva = el.querySelector("img");
        if (nueva && v[0] === "logoEdBanner") nueva.addEventListener("load", function () { guardarForma(nueva); fondoAutomatico(false); });
      }
      el.classList.add("lg");
      el.setAttribute("style", c.estilo);
    });
    document.querySelectorAll("#logoEd [data-logo-marco]").forEach(function (b) {
      b.classList.toggle("logo-ed__fig--on", b.getAttribute("data-logo-marco") === _marcoLogo);
    });
    var m = marcoActual(r);
    var ay = document.getElementById("logoEdAyuda");
    if (ay) ay.innerHTML = "Estás acomodando el marco <strong>" + (_marcoLogo === "carta" ? "de tu carta" : "de la lista") +
      "</strong> (toca el otro para cambiar). 👆 <strong>Arrastra</strong> la foto para moverla; para agrandarla o achicarla usa " +
      "<strong>dos dedos</strong>, la <strong>rueda del mouse</strong> o la barra.";
    var zt = document.getElementById("logoZoomTxt"); if (zt) zt.textContent = Math.round(m.z * 100) + "%";
    var z = document.getElementById("logoZoom"); if (z) z.value = Math.round(m.z * 100);
    var col = document.getElementById("logoFondo"); if (col && posLogo(r).b) col.value = posLogo(r).b;
  }

  function cambiarLogo(cambios) {
    if (!editando) return;
    var p = Object.assign({}, posLogo(editando));
    var m = Object.assign(marcoActual(editando), cambios);
    m.z = Math.min(LogoGhost.ZMAX, Math.max(LogoGhost.ZMIN, m.z));
    m.x = Math.min(100, Math.max(0, m.x));
    m.y = Math.min(100, Math.max(0, m.y));
    if (_marcoLogo === "lista") p.l = m;
    else {
      // El de la lista queda "pegado" al de la carta hasta que lo ajusten aparte.
      if (!p.l) p.l = { z: p.z, x: p.x, y: p.y };
      p.z = m.z; p.x = m.x; p.y = m.y;
    }
    editando.logoPos = p;
    editando.logoAjuste = "foto";
    pintarLogoVistas();
  }

  // Guarda la forma de la foto (ancho / alto): con eso la tienda la coloca
  // con medidas exactas, sea más grande o más pequeña que el marco.
  function guardarForma(img) {
    if (!editando || !img || !img.naturalWidth || img.getAttribute("src") !== editando.logo) return;
    var a = img.naturalWidth / img.naturalHeight;
    var p = Object.assign({}, posLogo(editando));
    if (p.a && Math.abs(p.a - a) < 0.001) return;
    p.a = a;
    editando.logoPos = p;
    pintarLogoVistas();
  }

  // Tamaño con el que la foto se ve COMPLETA en el marco actual.
  function zoomCompleta() {
    var marco = document.getElementById(_marcoLogo === "carta" ? "logoEdBanner" : "logoEdCuadro");
    var img = marco && marco.querySelector("img");
    if (!img || !img.naturalWidth) return 1;
    var W = marco.clientWidth, H = marco.clientHeight, w = img.naturalWidth, h = img.naturalHeight;
    return Math.min(W / w, H / h) / Math.max(W / w, H / h);
  }

  // Color de fondo = color promedio del borde de la foto (así no se nota el marco).
  function fondoAutomatico(forzar) {
    if (!editando || !editando.logo) return;
    if (!forzar && posLogo(editando).b) return;
    var im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = function () {
      try {
        var c = document.createElement("canvas"), N = 40;
        c.width = N; c.height = N;
        var ctx = c.getContext("2d");
        ctx.drawImage(im, 0, 0, N, N);
        var d = ctx.getImageData(0, 0, N, N).data, rr = 0, gg = 0, bb = 0, n = 0;
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
          if (x > 1 && x < N - 2 && y > 1 && y < N - 2) continue; // solo el borde
          var i = (y * N + x) * 4;
          if (d[i + 3] < 30) continue; // transparente
          rr += d[i]; gg += d[i + 1]; bb += d[i + 2]; n++;
        }
        var hex = n ? "#" + [rr, gg, bb].map(function (v) { return ("0" + Math.round(v / n).toString(16)).slice(-2); }).join("") : "#ffffff";
        var p = Object.assign({}, posLogo(editando)); p.b = hex;
        editando.logoPos = p;
        pintarLogoVistas();
      } catch (e) {
        if (forzar) toast("No se pudo leer el color de la foto. Elige uno con “Elegir color”.", true);
      }
    };
    im.onerror = function () { if (forzar) toast("No se pudo leer la foto.", true); };
    im.src = editando.logo;
  }

  // Arrastrar con un dedo / el mouse; agrandar o achicar con dos dedos.
  var _dedos = {}, _gesto = null;
  function nDedos() { return Object.keys(_dedos).length; }
  function distDedos() {
    var k = Object.keys(_dedos), a = _dedos[k[0]], b = _dedos[k[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function iniciarGesto(el) {
    var m = marcoActual(editando), k = Object.keys(_dedos), d = _dedos[k[0]];
    _gesto = { el: el, x0: d.x, y0: d.y, px: m.x, py: m.y, pz: m.z, d0: nDedos() > 1 ? distDedos() : 0 };
  }
  document.addEventListener("pointerdown", function (e) {
    var el = e.target.closest && e.target.closest("#logoEdBanner, #logoEdCuadro");
    if (!el || !editando || !editando.logo) return;
    e.preventDefault();
    var marco = el.id === "logoEdBanner" ? "carta" : "lista";
    if (marco !== _marcoLogo) { _marcoLogo = marco; pintarLogoVistas(); }
    _dedos[e.pointerId] = { x: e.clientX, y: e.clientY };
    el.classList.add("logo-ed--arrastrando");
    iniciarGesto(el);
    try { if (el.setPointerCapture) el.setPointerCapture(e.pointerId); } catch (ex) { /* sin captura: igual funciona */ }
  });
  document.addEventListener("pointermove", function (e) {
    if (!_gesto || !_dedos[e.pointerId]) return;
    _dedos[e.pointerId] = { x: e.clientX, y: e.clientY };
    var g = _gesto;
    if (nDedos() > 1 && g.d0) { cambiarLogo({ z: g.pz * distDedos() / g.d0 }); return; }
    // La foto sigue exactamente al dedo. Sobra = marco − foto (negativo si la
    // foto es más grande); la posición x/y es el % de ese sobrante.
    var W = g.el.clientWidth, H = g.el.clientHeight, a = posLogo(editando).a || (W / H);
    var ancho = Math.max(W, H * a) * g.pz, alto = ancho / a;
    var sobraX = W - ancho, sobraY = H - alto;
    cambiarLogo({
      x: Math.abs(sobraX) < 1 ? g.px : g.px + (e.clientX - g.x0) / sobraX * 100,
      y: Math.abs(sobraY) < 1 ? g.py : g.py + (e.clientY - g.y0) / sobraY * 100,
    });
  });
  function soltarDedo(e) {
    if (!_dedos[e.pointerId]) return;
    delete _dedos[e.pointerId];
    if (!nDedos()) { if (_gesto) _gesto.el.classList.remove("logo-ed--arrastrando"); _gesto = null; }
    else if (_gesto) iniciarGesto(_gesto.el);
  }
  document.addEventListener("pointerup", soltarDedo);
  document.addEventListener("pointercancel", soltarDedo);
  document.addEventListener("wheel", function (e) {
    var el = e.target.closest && e.target.closest("#logoEdBanner, #logoEdCuadro");
    if (!el || !editando) return;
    e.preventDefault();
    var marco = el.id === "logoEdBanner" ? "carta" : "lista";
    if (marco !== _marcoLogo) _marcoLogo = marco;
    cambiarLogo({ z: marcoActual(editando).z * (e.deltaY < 0 ? 1.06 : 1 / 1.06) });
  }, { passive: false });

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (!t || !editando) return;
    if (t.id === "logoZoom") cambiarLogo({ z: Number(t.value) / 100 });
    else if (t.id === "logoFondo") { var p = Object.assign({}, posLogo(editando)); p.b = t.value; editando.logoPos = p; pintarLogoVistas(); }
  });
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest || !editando) return;
    var mb = t.closest("[data-logo-marco]");
    if (mb) { _marcoLogo = mb.getAttribute("data-logo-marco"); pintarLogoVistas(); return; }
    var zb = t.closest("[data-logo-zoom]");
    if (zb) { cambiarLogo({ z: marcoActual(editando).z + Number(zb.getAttribute("data-logo-zoom")) / 100 }); return; }
    var aj = t.closest("[data-logo-ajustar]");
    if (aj) {
      cambiarLogo(aj.getAttribute("data-logo-ajustar") === "completa" ? { z: zoomCompleta(), x: 50, y: 50 } : { z: 1, x: 50, y: 50 });
      return;
    }
    if (t.closest("[data-logo-fondo-auto]")) { fondoAutomatico(true); return; }
    if (t.closest("[data-logo-reset]")) {
      var forma = posLogo(editando).a;
      editando.logoPos = forma ? { z: 1, x: 50, y: 50, a: forma } : null;
      _marcoLogo = "carta"; pintarLogoVistas(); fondoAutomatico(true);
    }
  });

  function urlVistaPrevia(id) {
    return location.href.replace(/admin\.html.*$/, "index.html") + "#r=" + encodeURIComponent(id) + "&previa=1";
  }

  function pintarEditor() {
    var r = editando;
    var seccionesHTML = "";
    for (var si = 0; si < r.carta.length; si++) {
      seccionesHTML += seccionHTML(r.carta[si], si);
    }

    elEditorBody.innerHTML =
      importadorHTML(r) +
      publicacionHTML(r) +
      '<h3 class="editor-section__title" style="margin:4px 0 8px">Foto de perfil</h3>' +
      (r.logo ? logoEditorHTML(r) : '<div class="foto-preview" id="fotoPreview">Tu logo o una foto del local (opcional)</div>') +
      '<div class="inline-actions" style="margin-bottom:14px">' +
        '<label class="btn-primary" style="cursor:pointer">' +
          '<span id="subirTxt">📷 ' + (r.logo ? "Cambiar foto" : "Subir foto") + "</span>" +
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
      '<label class="pay__option" style="margin:4px 0 6px; max-width:320px">' +
        '<input type="checkbox" id="campoAbierto" ' + (r.abierto ? "checked" : "") + " /> Recibe pedidos</label>" +
      '<p class="muted" style="font-size:.82rem;margin:0 0 14px">Desmárcalo para cerrarlo ya (por ejemplo, si hoy no abre); ' +
        "queda cerrado hasta que lo vuelvas a marcar. Si tiene horario, se abre y se cierra solo según las horas.</p>" +
      horarioEditorHTML(r) +

      almuerzoEditorHTML(r) +

      '<h3 class="editor-section__title" style="margin:18px 0 10px">Carta</h3>' +
      '<div id="secciones">' + seccionesHTML + "</div>" +
      '<button type="button" class="btn-copy" data-add-seccion style="margin-bottom:16px">+ Agregar sección</button>' +

      '<div class="actions">' +
        '<button type="button" class="btn-primary" id="btnGuardar">Guardar cambios</button>' +
      "</div>";

    enlazarEditor();
    pintarLogoVistas();
  }

  /* ---------------------------- Horario --------------------------- */
  var DIAS_H = [
    ["lun", "Lunes"], ["mar", "Martes"], ["mie", "Miércoles"], ["jue", "Jueves"],
    ["vie", "Viernes"], ["sab", "Sábado"], ["dom", "Domingo"],
  ];
  function horarioEditorHTML(r) {
    var h = r.horario || {};
    var filas = DIAS_H.map(function (d) {
      var x = h[d[0]];
      return '<div class="hor-fila" data-hor="' + d[0] + '">' +
          '<label class="agotado-check hor-dia"><input type="checkbox" data-hor-abre-dia="' + d[0] + '"' + (x ? " checked" : "") + " /> " + d[1] + "</label>" +
          '<input class="field__input hor-hora" type="time" data-hor-abre="' + d[0] + '" value="' + esc(x ? x.abre : "11:00") + '"' + (x ? "" : " disabled") + ' aria-label="Abre ' + d[1] + '" />' +
          '<span class="muted">a</span>' +
          '<input class="field__input hor-hora" type="time" data-hor-cierra="' + d[0] + '" value="' + esc(x ? x.cierra : "22:00") + '"' + (x ? "" : " disabled") + ' aria-label="Cierra ' + d[1] + '" />' +
        "</div>";
    }).join("");
    var activo = !!r.horario;
    return '<details class="editor-section hor"' + (activo ? " open" : "") + ">" +
        '<summary class="editor-section__title">🕒 Horario de atención ' +
          '<span class="muted" style="font-weight:500">' + (activo ? "(se abre y cierra solo)" : "(opcional)") + "</span></summary>" +
        '<p class="muted" style="font-size:.82rem;margin:8px 0">Marca los días que abre. Si cierra después de medianoche, ' +
          "pon la hora de cierre normal (ej. 6:00 p. m. a 2:00 a. m.). Hora de Colombia.</p>" +
        filas +
        '<div class="inline-actions" style="margin-top:8px">' +
          '<button type="button" class="btn-copy btn-sm" data-hor-copiar>Copiar el lunes a todos los días</button>' +
          '<button type="button" class="btn-danger btn-sm" data-hor-limpiar>Quitar horario</button>' +
        "</div>" +
      "</details>";
  }
  function leerHorario() {
    var out = {}, alguno = false;
    DIAS_H.forEach(function (d) {
      var on = elEditorBody.querySelector('[data-hor-abre-dia="' + d[0] + '"]');
      var a = elEditorBody.querySelector('[data-hor-abre="' + d[0] + '"]');
      var c = elEditorBody.querySelector('[data-hor-cierra="' + d[0] + '"]');
      if (on && on.checked && a && c && a.value && c.value) { out[d[0]] = { abre: a.value, cierra: c.value }; alguno = true; }
      else out[d[0]] = null;
    });
    return alguno ? out : null;
  }

  /* ------------------- Fotos (comprimidas al subir) ---------------- */
  // Una foto de celular pesa 3-8 MB; la reducimos a ~150 KB antes de subirla
  // para que la carta cargue rápido incluso con datos móviles.
  function comprimirImagen(file, maxLado, calidad) {
    return new Promise(function (resolve) {
      if (!file || !/^image\//.test(file.type) || /gif|svg/.test(file.type)) { resolve(file); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var esc2 = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.round(img.naturalWidth * esc2), h = Math.round(img.naturalHeight * esc2);
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        var ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        var tipo = c.toDataURL("image/webp").indexOf("image/webp") === 5 ? "image/webp" : "image/jpeg";
        c.toBlob(function (blob) {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          var ext = tipo === "image/webp" ? "webp" : "jpg";
          try { resolve(new File([blob], "foto." + ext, { type: tipo })); }
          catch (e) { blob.name = "foto." + ext; resolve(blob); }
        }, tipo, calidad);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }
  async function subirFotoComprimida(file, carpeta, maxLado) {
    var lista = await comprimirImagen(file, maxLado || 1200, 0.8);
    // Cada aliado sube a su propia carpeta (las reglas de Supabase lo exigen).
    if (esAliado()) carpeta = "aliados/" + perfil.restaurante_id + "/" + carpeta;
    return window.Store.subirFoto(lista, carpeta);
  }

  // Publicado o no en la tienda + vista previa.
  function publicacionHTML(r) {
    if (r._esNuevo) return "";
    var visible = r.visible !== false;
    return '<div class="publicar' + (visible ? " publicar--on" : "") + '">' +
        '<label class="publicar__switch"><input type="checkbox" id="campoVisible"' + (visible ? " checked" : "") + ' /> ' +
          "<span><strong>" + (visible ? "✅ Publicado en la tienda" : "🙈 Oculto: aún no sale en la tienda") + "</strong>" +
          "<small>" + (visible ? "Los clientes ven este negocio y pueden pedir." : "Organiza tu carta con calma. Cuando esté lista, marca esta casilla y pulsa Guardar.") + "</small></span></label>" +
        '<a class="btn-copy btn-sm" href="' + esc(urlVistaPrevia(r.id)) + '" target="_blank" rel="noopener">👁️ Ver cómo se ve</a>' +
      "</div>";
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

    if (!nPlatos && !d.almuerzo && !d.desayuno && !d.nombre) {
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
      conservarAdiciones(r.carta, d.carta);
      r.carta = d.carta;
    }
    if (d.almuerzo) { d.almuerzo.fecha = hoyISO(); r.almuerzo = d.almuerzo; }
    if (d.desayuno) { d.desayuno.fecha = hoyISO(); r.desayuno = d.desayuno; }

    var msg = "✅ Listo: " + d.carta.length + " secciones y " + nPlatos + " platos" +
      (d.almuerzo ? " + almuerzo del día" : "") + (d.desayuno ? " + desayuno del día" : "") + ". Revisa abajo y pulsa <strong>Guardar cambios</strong>.";
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
          "<strong>🍳🍲 Menú del día</strong> (ahí también publicas el desayuno)." +
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
        adicionesSeccionHTML(sec, idx) +
      "</div>"
    );
  }

  // Adiciones de la sección: el cliente puede marcar las que quiera en
  // cualquier plato de esta sección, y cada una suma su precio.
  function adicionesSeccionHTML(sec, idx) {
    var lista = sec.adiciones || [];
    var n = lista.filter(function (a) { return a.n; }).length;
    return (
      '<details class="plato-opc sec-adic"' + (lista.length ? " open" : "") + ' data-ad="' + idx + '">' +
        "<summary>➕ Adiciones de esta sección <span class=\"muted\">(queso extra, tocineta…)</span>" + (n ? " · " + n : "") + "</summary>" +
        '<p class="muted plato-opc__ayuda" style="margin-top:0">El cliente puede marcar las que quiera en <strong>cualquier producto de esta sección</strong>, y cada una suma su precio.</p>' +
        lista.map(function (a, oi) { return filaOpcionHTML("data-ad-o", a, 'data-ad-del="' + idx + "|" + oi + '"'); }).join("") +
        '<div class="inline-actions">' +
          '<button type="button" class="btn-copy btn-sm" data-ad-add="' + idx + '">+ Agregar adición</button>' +
          (n ? '<button type="button" class="btn-link btn-sm" data-adic-todas="' + idx + '">Usar en todas las secciones</button>' : "") +
        "</div>" +
      "</details>"
    );
  }
  function leerAdicionesSeccion(secEl) {
    var out = [];
    secEl.querySelectorAll("[data-ad-o]").forEach(function (oEl) {
      var a = { n: (oEl.querySelector("[data-op-n]").value || "").trim(), precio: Number(oEl.querySelector("[data-op-p]").value) || 0 };
      if (oEl.querySelector("[data-op-ag]").checked) a.agotado = true;
      out.push(a);
    });
    return out;
  }

  function platoHTML(it, si, pi) {
    return (
      '<div class="plato-row" data-plato="' + si + "-" + pi + '" data-plato-id="' + esc(it.id || "") + '">' +
        '<span class="mini-label">Producto</span>' +
        '<div class="plato-row__top">' +
          '<input class="field__input" data-plato-n="' + si + "-" + pi + '" value="' + esc(it.n || "") +
            '" placeholder="Ej: Frappé de caramelo" aria-label="Nombre del producto" />' +
          '<button type="button" class="btn-danger" data-del-plato="' + si + "-" + pi + '" title="Quitar este producto">✕</button>' +
        "</div>" +
        '<span class="mini-label">Descripción <span class="muted">(opcional)</span></span>' +
        '<input class="field__input" data-plato-d="' + si + "-" + pi + '" value="' + esc(it.d || "") +
          '" placeholder="Ej: Con leche, 354 ml" aria-label="Descripción" />' +
        '<span class="mini-label">Precio' + (Array.isArray(it.opciones) && it.opciones.length ? ' <span class="muted">(el más bajo)</span>' : "") + "</span>" +
        '<label class="op-fila__p op-fila__p--grande"><span>$</span><input class="field__input" data-plato-p="' + si + "-" + pi + '" type="number" min="0" step="100" inputmode="numeric" value="' +
          esc(it.p != null ? it.p : "") + '" placeholder="12000" aria-label="Precio" /></label>' +
        '<label class="agotado-check"><input type="checkbox" data-plato-ag="' + si + "-" + pi + '"' +
          (it.agotado ? " checked" : "") + " /> Agotado</label>" +
        (it.p > 0 || !it.n ? "" : '<span class="falta-precio">⚠️ Falta el precio</span>') +
        '<div class="plato-foto">' +
          (it.foto ? '<img src="' + esc(it.foto) + '" alt="" loading="lazy" />' : "") +
          '<input type="hidden" data-plato-foto="' + si + "-" + pi + '" value="' + esc(it.foto || "") + '" />' +
          '<label class="btn-copy btn-sm" style="cursor:pointer">' +
            '<span data-plato-foto-txt="' + si + "-" + pi + '">' + (it.foto ? "📷 Cambiar foto" : "📷 Foto del plato") + "</span>" +
            '<input type="file" accept="image/*" hidden data-plato-foto-input="' + si + "-" + pi + '" />' +
          "</label>" +
          (it.foto ? '<button type="button" class="btn-danger btn-sm" data-plato-foto-quitar="' + si + "-" + pi + '">Quitar</button>' : "") +
        "</div>" +
        platoMensajeHTML(it, si + "-" + pi) +
        platoOpcionesHTML(it, si + "-" + pi) +
      "</div>"
    );
  }

  // Mensaje en el producto: el negocio decide si se muestra o no.
  var MENSAJES_LISTOS = ["🔥 El más pedido", "⭐ Recomendado", "🆕 Nuevo", "🌶️ Picante", "🌱 Vegetariano", "🏠 Hecho en casa", "⏱️ Tarda un poco más", "🎉 Promoción"];
  function platoMensajeHTML(it, key) {
    var m = it.msg && it.msg.texto ? it.msg : null;
    var on = m ? m.mostrar !== false : true;
    return '<details class="plato-opc plato-msg"' + (m ? " open" : "") + ' data-msg-box="' + key + '">' +
        "<summary>🏷️ Mensaje en el producto <span class=\"muted\">(opcional)</span>" +
          (m ? (on ? ' · <span class="plato-msg__estado plato-msg__estado--on">Se muestra</span>' : ' · <span class="plato-msg__estado">Oculto</span>') : "") + "</summary>" +
        '<label class="plato-msg__on"><input type="checkbox" data-plato-msg-on' + (on ? " checked" : "") + " /> Mostrarlo a los clientes</label>" +
        '<input class="field__input" data-plato-msg maxlength="60" value="' + esc(m ? m.texto : "") + '" placeholder="Ej: 🔥 El más pedido · Solo fines de semana · Pídelo bien frío" aria-label="Mensaje en el producto" />' +
        '<div class="op-plantillas"><span class="muted">Ideas:</span>' +
          MENSAJES_LISTOS.map(function (t) { return '<button type="button" class="btn-copy btn-sm" data-msg-listo="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") +
        "</div>" +
        '<p class="muted plato-opc__ayuda">Sale en la carta junto al producto. Para quitarlo un tiempo sin borrarlo, desmarca “Mostrarlo a los clientes”.</p>' +
      "</details>";
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-msg-listo]");
    if (!b) return;
    var box = b.closest("[data-msg-box]");
    var inp = box && box.querySelector("[data-plato-msg]");
    if (!inp) return;
    inp.value = b.getAttribute("data-msg-listo");
    var on = box.querySelector("[data-plato-msg-on]");
    if (on) on.checked = true;
    inp.focus();
  });

  // Opciones que elige el cliente (tamaño, sabor, salsa…): sin códigos, con casillas.
  var PLANTILLAS_OPC = {
    tamano: { t: "📏 Tamaños", g: { nombre: "Tamaño", opciones: [{ n: "Pequeño" }, { n: "Mediano" }, { n: "Grande" }] } },
    chantilly: { t: "🍦 Con / sin chantilly", g: { nombre: "Chantilly", opciones: [{ n: "Sin chantilly" }, { n: "Con chantilly" }] } },
    salsa: { t: "🥫 Salsas", g: { nombre: "Salsa", opciones: [{ n: "" }, { n: "" }] } },
    otro: { t: "➕ Otra cosa", g: { nombre: "", opciones: [{ n: "" }, { n: "" }] } },
  };

  function editarFilasOpciones(btn) {
    leerEditor();
    var y = elEditorBody.scrollTop;
    var plato = function (k) { var p = k.split("-"); return editando.carta[Number(p[0])].items[Number(p[1])]; };
    var v;
    if ((v = btn.getAttribute("data-po-plantilla"))) {
      var pp = v.split("|"), it = plato(pp[0]);
      it.opciones = (it.opciones || []).concat([JSON.parse(JSON.stringify(PLANTILLAS_OPC[pp[1]].g))]);
    } else if ((v = btn.getAttribute("data-po-add-o"))) {
      var pa = v.split("|"); plato(pa[0]).opciones[Number(pa[1])].opciones.push({ n: "" });
    } else if ((v = btn.getAttribute("data-po-del-o"))) {
      var pd = v.split("|"); plato(pd[0]).opciones[Number(pd[1])].opciones.splice(Number(pd[2]), 1);
    } else if ((v = btn.getAttribute("data-po-del-g"))) {
      var pg = v.split("|"); plato(pg[0]).opciones.splice(Number(pg[1]), 1);
    } else if ((v = btn.getAttribute("data-ad-add"))) {
      var sc = editando.carta[Number(v)]; sc.adiciones = (sc.adiciones || []).concat([{ n: "", precio: 0 }]);
    } else if ((v = btn.getAttribute("data-ad-del"))) {
      var px = v.split("|"); editando.carta[Number(px[0])].adiciones.splice(Number(px[1]), 1);
    }
    pintarEditor();
    elEditorBody.scrollTop = y;
    // Poner el cursor en la primera casilla vacía de lo que se agregó.
    var cont = btn.getAttribute("data-ad-add") != null ? elEditorBody.querySelector('[data-ad="' + btn.getAttribute("data-ad-add") + '"]')
      : elEditorBody.querySelector('[data-po="' + String(v).split("|")[0] + '"]');
    var vacio = cont && [].filter.call(cont.querySelectorAll("[data-po-gn],[data-op-n]"), function (i) { return !i.value; }).pop();
    if (vacio && !btn.hasAttribute("data-po-del-o") && !btn.hasAttribute("data-po-del-g") && !btn.hasAttribute("data-ad-del")) vacio.focus({ preventScroll: true });
  }

  // "👀 El cliente ve" se actualiza mientras escribe.
  function refrescarVistaOpc(el) {
    var pEl = el.closest("[data-plato]");
    if (!pEl) return;
    var base = Number((pEl.querySelector("[data-plato-p]") || {}).value) || 0;
    var grupos = leerOpcionesPlato(pEl);
    pEl.querySelectorAll("[data-po-g]").forEach(function (gEl, gi) {
      var v = gEl.querySelector("[data-po-vista]");
      var txt = vistaOpcTexto(base, grupos[gi] || {});
      if (v) v.textContent = txt ? "👀 El cliente ve: " + txt : "";
    });
  }
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest("#editorBody") && (t.closest("[data-po-g]") || t.hasAttribute("data-plato-p"))) refrescarVistaOpc(t);
  });

  function precioTxtAdm(n) { return "$" + Number(n || 0).toLocaleString("es-CO"); }

  // "Así lo ve el cliente: Pequeño $14.000 · Mediano $17.000"
  function vistaOpcTexto(base, g) {
    var ops = (g.opciones || []).filter(function (o) { return o.n; });
    if (!ops.length) return "";
    return ops.map(function (o) {
      return o.n + (base > 0 ? " " + precioTxtAdm(base + (Number(o.precio) || 0)) : (o.precio > 0 ? " +" + precioTxtAdm(o.precio) : "")) + (o.agotado ? " (agotado)" : "");
    }).join(" · ");
  }

  function filaOpcionHTML(attrs, o, quitar) {
    return '<div class="op-fila" ' + attrs + ">" +
        '<input class="field__input op-fila__n" data-op-n value="' + esc(o.n || "") + '" placeholder="Nombre (ej. Grande)" />' +
        '<label class="op-fila__p"><span>+ $</span><input class="field__input" data-op-p type="number" min="0" step="500" inputmode="numeric" value="' +
          (Number(o.precio) > 0 ? Number(o.precio) : "") + '" placeholder="0" aria-label="Cuánto más cuesta" /></label>' +
        '<label class="op-fila__ag" title="Se acabó"><input type="checkbox" data-op-ag' + (o.agotado ? " checked" : "") + " /> Agotado</label>" +
        '<button type="button" class="btn-danger btn-sm op-fila__x" ' + quitar + ' aria-label="Quitar">✕</button>' +
      "</div>";
  }

  function platoOpcionesHTML(it, key) {
    var grupos = Array.isArray(it.opciones) ? it.opciones : [];
    var base = Number(it.p) || 0;
    var html = '<details class="plato-opc"' + (grupos.length ? " open" : "") + ' data-po="' + key + '">' +
      "<summary>⚙️ ¿El cliente elige algo? <span class=\"muted\">(tamaño, sabor, salsa…)</span>" + (grupos.length ? " · " + grupos.length : "") + "</summary>";
    grupos.forEach(function (g, gi) {
      var k = key + "|" + gi;
      html += '<div class="op-grupo" data-po-g="' + k + '">' +
        '<div class="op-grupo__head">' +
          '<input class="field__input op-grupo__n" data-po-gn value="' + esc(g.nombre || "") + '" placeholder="¿Qué elige? (ej. Tamaño)" />' +
          '<button type="button" class="btn-link btn-sm" data-po-del-g="' + k + '">Quitar</button>' +
        "</div>" +
        (g.opciones || []).map(function (o, oi) { return filaOpcionHTML("data-po-o", o, 'data-po-del-o="' + k + "|" + oi + '"'); }).join("") +
        '<button type="button" class="btn-copy btn-sm" data-po-add-o="' + k + '">+ Otra opción</button>' +
        '<p class="op-vista" data-po-vista>' + (vistaOpcTexto(base, g) ? "👀 El cliente ve: " + esc(vistaOpcTexto(base, g)) : "") + "</p>" +
      "</div>";
    });
    html += '<div class="op-plantillas"><span class="muted">' + (grupos.length ? "Agregar otra:" : "Agregar:") + "</span>" +
      Object.keys(PLANTILLAS_OPC).map(function (k) {
        return '<button type="button" class="btn-copy btn-sm" data-po-plantilla="' + key + "|" + k + '">' + PLANTILLAS_OPC[k].t + "</button>";
      }).join("") + "</div>" +
      '<p class="muted plato-opc__ayuda">En <strong>+ $</strong> pon cuánto <strong>más</strong> cuesta esa opción (ej. Grande + $3.000). Si cuesta lo mismo, déjalo vacío.</p>' +
      "</details>";
    return html;
  }

  // Lee las opciones de un plato desde las casillas.
  function leerOpcionesPlato(pEl) {
    var grupos = [];
    pEl.querySelectorAll("[data-po-g]").forEach(function (gEl) {
      var nombre = (gEl.querySelector("[data-po-gn]") || {}).value || "";
      var ops = [];
      gEl.querySelectorAll("[data-po-o]").forEach(function (oEl) {
        var n = (oEl.querySelector("[data-op-n]").value || "").trim();
        var o = { n: n };
        var pr = Number(oEl.querySelector("[data-op-p]").value) || 0;
        if (pr > 0) o.precio = pr;
        if (oEl.querySelector("[data-op-ag]").checked) o.agotado = true;
        ops.push(o);
      });
      grupos.push({ nombre: nombre.trim(), opciones: ops });
    });
    return grupos;
  }
  // Al guardar: fuera filas y grupos vacíos.
  function limpiarOpciones(grupos) {
    return (grupos || []).map(function (g) {
      return { nombre: g.nombre || "Opción", opciones: (g.opciones || []).filter(function (o) { return o.n; }) };
    }).filter(function (g) { return g.opciones.length; });
  }

  /* ------------- Carta nueva en el código (data.js) vs. la guardada ------------- */
  // La tienda muestra la copia de Supabase. Si en data.js hay una carta
  // distinta para el mismo restaurante, ofrecemos pasarla a Supabase.
  function huellaCarta(carta) {
    return JSON.stringify((carta || []).map(function (s) {
      return [s.sec, (s.items || []).map(function (it) {
        return [it.id, it.n, it.d || "", Number(it.p) || 0, JSON.stringify((it.opciones || []).map(function (g) {
          return [g.nombre, (g.opciones || []).map(function (o) { return [o.n, Number(o.precio) || 0]; })];
        }))];
      })];
    }));
  }
  function cartaDelCodigo(id) {
    var base = typeof RESTAURANTES !== "undefined" ? RESTAURANTES : [];
    for (var i = 0; i < base.length; i++) if (base[i].id === id) return base[i];
    return null;
  }
  function cartaNueva(r) {
    if (!r || !r._nube) return false;
    var c = cartaDelCodigo(r.id);
    return !!c && huellaCarta(c.carta) !== huellaCarta(r.carta);
  }

  // Qué cambia entre la carta guardada (panel) y la del código (lo que pegaste en el chat).
  function diferenciasCarta(guardada, codigo) {
    function mapa(carta) {
      var m = {};
      (carta || []).forEach(function (s) { (s.items || []).forEach(function (it) { m[it.id] = it; }); });
      return m;
    }
    var a = mapa(guardada), b = mapa(codigo), d = { nuevos: [], quitados: [], precios: [], textos: 0 };
    Object.keys(b).forEach(function (k) {
      if (!a[k]) { d.nuevos.push(b[k].n); return; }
      if ((Number(a[k].p) || 0) !== (Number(b[k].p) || 0)) d.precios.push({ n: b[k].n, de: Number(a[k].p) || 0, a: Number(b[k].p) || 0 });
      else if (a[k].n !== b[k].n || (a[k].d || "") !== (b[k].d || "")) d.textos++;
    });
    Object.keys(a).forEach(function (k) { if (!b[k]) d.quitados.push(a[k].n); });
    return d;
  }
  function lista(arr, n) { return arr.slice(0, n).join(", ") + (arr.length > n ? " y " + (arr.length - n) + " más" : ""); }

  async function sincronizarCarta(id, boton) {
    var r = restaurantes.filter(function (x) { return x.id === id; })[0];
    var c = cartaDelCodigo(id);
    if (!r || !c) return;
    var nPlatos = c.carta.reduce(function (n, s) { return n + (s.items || []).length; }, 0);
    var df = diferenciasCarta(r.carta, c.carta);
    var bajanACero = df.precios.filter(function (x) { return x.de > 0 && x.a === 0; });
    var lineas = ["Carta de " + r.nombre.toUpperCase() + " (solo este restaurante).", ""];
    if (df.nuevos.length) lineas.push("➕ Se agregan " + df.nuevos.length + ": " + lista(df.nuevos, 4));
    if (df.precios.length) lineas.push("💲 Cambian " + df.precios.length + " precios: " + lista(df.precios.map(function (x) {
      return x.n + " " + (x.de ? money(x.de) : "$0") + " → " + (x.a ? money(x.a) : "$0"); }), 4));
    if (df.textos) lineas.push("✏️ Cambian nombres o descripciones de " + df.textos + " productos");
    if (df.quitados.length) lineas.push("➖ Se QUITAN " + df.quitados.length + ": " + lista(df.quitados, 4));
    if (!df.nuevos.length && !df.precios.length && !df.textos && !df.quitados.length) lineas.push("Solo cambian secciones u opciones.");
    lineas.push("");
    if (df.quitados.length || bajanACero.length) {
      lineas.push("⚠️ OJO: la copia del panel tiene productos o precios que la carta nueva no tiene. " +
        "Si los agregaste o corregiste tú desde el panel, se perderán. En ese caso toca Cancelar.");
      lineas.push("");
    }
    lineas.push("Se conservan: fotos, agotados, mensajes, adiciones, horario, portada, menús del día y si está abierto.");
    lineas.push("¿Usar la carta nueva?");
    if (!confirm(lineas.join("\n"))) return;
    // Fotos y agotados de la copia actual, por id de plato.
    var previos = {};
    (r.carta || []).forEach(function (s) { (s.items || []).forEach(function (it) { previos[it.id] = it; }); });
    var nueva = JSON.parse(JSON.stringify(c.carta));
    nueva.forEach(function (s) {
      (s.items || []).forEach(function (it) {
        var p = previos[it.id];
        if (p && p.foto && !it.foto) it.foto = p.foto;
        if (p && p.agotado) it.agotado = true;
        if (p && p.msg && !it.msg) it.msg = p.msg;
      });
    });
    conservarAdiciones(r.carta, nueva);
    var copia = JSON.parse(JSON.stringify(r));
    copia.carta = nueva;
    copia.nombre = c.nombre; copia.cat = c.cat; copia.tiempo = c.tiempo; copia.desc = c.desc;
    if (!copia.color) copia.color = c.color;
    delete copia._nube;
    var texto = boton.textContent;
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span>Actualizando…';
    try {
      await window.Store.guardar(copia);
      toast("Carta de " + c.nombre + " actualizada ✓ (" + nPlatos + " productos)");
      await recargarLista();
    } catch (ex) {
      toast(mensajeErrorGuardar(ex), true);
      boton.disabled = false;
      boton.textContent = texto;
    }
  }

  // Al reemplazar una carta, cada sección conserva sus adiciones (por nombre),
  // salvo que la carta nueva ya traiga las suyas.
  function conservarAdiciones(vieja, nueva) {
    var porNombre = {};
    (vieja || []).forEach(function (s) { if (s.adiciones && s.adiciones.length) porNombre[slug(s.sec || "")] = s.adiciones; });
    (nueva || []).forEach(function (s) {
      var prev = porNombre[slug(s.sec || "")];
      if (prev && !(s.adiciones && s.adiciones.length)) s.adiciones = JSON.parse(JSON.stringify(prev));
    });
  }

  function contarConFoto(r) {
    var n = 0;
    (r.carta || []).forEach(function (s) { (s.items || []).forEach(function (it) { if (it.foto) n++; }); });
    return n;
  }

  function contarSinPrecio(r) {
    var n = 0;
    (r.carta || []).forEach(function (s) { (s.items || []).forEach(function (it) { if (!(it.p > 0)) n++; }); });
    return n;
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
    var vis = $("#campoVisible");
    if (vis) r.visible = vis.checked;
    var aj = elEditorBody.querySelector("input[name=logoAjuste]:checked");
    if (aj) r.logoAjuste = aj.value;
    var imp = $("#importTexto");
    if (imp) r._importTexto = imp.value;
    if (elEditorBody.querySelector("[data-hor]")) r.horario = leerHorario();
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
        var plato = {
          id: idPlato,
          n: nombre,
          d: d ? d.value.trim() : "",
          p: p ? Number(p.value) || 0 : 0,
          agotado: ag ? ag.checked : false,
        };
        var fotoEl = pEl.querySelector('[data-plato-foto="' + key + '"]');
        if (fotoEl && fotoEl.value) plato.foto = fotoEl.value;
        var msgEl = pEl.querySelector("[data-plato-msg]");
        if (msgEl && msgEl.value.trim()) {
          var msgOn = pEl.querySelector("[data-plato-msg-on]");
          plato.msg = { texto: msgEl.value.trim().slice(0, 60), mostrar: msgOn ? msgOn.checked : true };
        }
        // Opciones del plato (salsa, tamaño…). Antes se perdían al guardar.
        var gruposOpc = leerOpcionesPlato(pEl);
        if (gruposOpc.length) plato.opciones = gruposOpc;
        items.push(plato);
      });
      var secNueva = { sec: nombreSec ? nombreSec.value.trim() : "Sección", items: items };
      var adic = secEl.querySelector("[data-ad]") ? leerAdicionesSeccion(secEl) : [];
      if (adic.length) secNueva.adiciones = adic;
      nuevasSecs.push(secNueva);
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
      if (previo.obligatorio) grupo.obligatorio = true;
      grupos.push(grupo);
    });
    r.almuerzo = {
      activo: almActivo ? almActivo.checked : false,
      titulo: ($("#almTitulo") && $("#almTitulo").value.trim()) || "Almuerzo del día",
      desc: ($("#almDesc") && $("#almDesc").value.trim()) || "",
      precio: ($("#almPrecio") && Number($("#almPrecio").value)) || 0,
      fecha: anterior.fecha || "",
      foto: anterior.foto || "",
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
          var url = await subirFotoComprimida(file, "restaurantes", 1400);
          editando.logo = url;
          editando.logoPos = null;  // foto nueva: empieza centrada
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

  /* --------------------- Menú del día (desayuno / almuerzo) ------------------------ */
  var elListaAlm = $("#listaAlmuerzos");
  var elAlmSheet = $("#almSheet");
  var elAlmBody = $("#almSheetBody");
  var almEditando = null; // restaurante cuyo menú se está publicando
  var MENUS_ADM = {
    desayuno: { campo: "desayuno", titulo: "Desayuno del día", emoji: "🍳", nombre: "desayuno",
      ejemploDesc: "Ej: Calentado, huevos al gusto, arepa y bebida caliente",
      ejemploOpc: "Huevos: Pericos, Revueltos, Fritos&#10;Acompañante: Arepa, Pan, Calentado&#10;Bebida: Chocolate, Café con leche, Jugo de naranja (precio=9000)",
      ejemploPrecio: "Ej: 8000" },
    almuerzo: { campo: "almuerzo", titulo: "Almuerzo del día", emoji: "🍲", nombre: "almuerzo",
      ejemploDesc: "Ej: Sopa, arroz, principio, proteína, ensalada y jugo",
      ejemploOpc: "Sopa: Sancocho, Ajiaco&#10;Proteína: Pollo frito, Res, Cerdo (agotado)&#10;Principio: Fríjol, Lenteja&#10;Bebida: Limonada, Jugo de mango",
      ejemploPrecio: "Ej: 13000" },
  };
  var tipoAdm = "almuerzo";
  try { tipoAdm = localStorage.getItem("ghost_admin_tipo_menu") === "desayuno" ? "desayuno" : "almuerzo"; } catch (e) { /* nada */ }

  function menuHoy(r, tipo) {
    var a = r && r[MENUS_ADM[tipo].campo];
    return !!(a && a.activo && (!a.fecha || a.fecha === hoyISO()));
  }

  function pintarAlmuerzos() {
    if (!elListaAlm) return;
    var tabs = $("#menuTiposAdm");
    if (tabs) {
      tabs.innerHTML = ["desayuno", "almuerzo"].map(function (t) {
        var M = MENUS_ADM[t];
        var n = restaurantes.filter(function (r) { return menuHoy(r, t); }).length;
        return '<button type="button" class="tab-mini' + (t === tipoAdm ? " tab-mini--on" : "") + '" data-tipo-menu="' + t + '">' +
          M.emoji + " " + (t === "desayuno" ? "Desayunos" : "Almuerzos") + (n ? " · " + n + " hoy" : "") + "</button>";
      }).join("");
    }
    if (!restaurantes.length) {
      elListaAlm.innerHTML = '<p class="muted">Aún no hay restaurantes.</p>';
      return;
    }
    var M = MENUS_ADM[tipoAdm];
    // Primero los publicados hoy, luego los que ya lo han ofrecido, luego el resto.
    var lista = restaurantes.slice().sort(function (a, b) {
      function peso(r) { return menuHoy(r, tipoAdm) ? 0 : (r[M.campo] && r[M.campo].grupos ? 1 : 2); }
      return peso(a) - peso(b);
    });
    elListaAlm.innerHTML = lista.map(function (r) {
      var a = r[M.campo] || {};
      var hoy = menuHoy(r, tipoAdm);
      var estado = hoy
        ? '<span class="estado-badge estado-badge--entregado">✅ Publicado hoy</span>'
        : (a.fecha ? '<span class="estado-badge estado-badge--cancelado">Último: ' + esc(a.fecha) + "</span>"
                   : '<span class="estado-badge estado-badge--preparando">Sin publicar</span>');
      var resumen = hoy ? esc((a.titulo || M.titulo) + (a.precio ? " · " + money(a.precio) : "")) : "";
      return '<div class="admin-card">' +
          (a.foto ? '<div class="admin-card__cover" style="background-image:url(\'' + esc(a.foto) + '\')"></div>' : "") +
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
    }).join("");
  }

  function cambiarTipoMenu(t) {
    tipoAdm = t === "desayuno" ? "desayuno" : "almuerzo";
    try { localStorage.setItem("ghost_admin_tipo_menu", tipoAdm); } catch (e) { /* nada */ }
    pintarAlmuerzos();
  }

  function abrirPublicarAlmuerzo(id) {
    var r = restaurantes.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    var M = MENUS_ADM[tipoAdm];
    almEditando = JSON.parse(JSON.stringify(r));
    almEditando._tipoMenu = tipoAdm;
    var a = almEditando[M.campo] || {};
    var opciones = window.Importar ? window.Importar.opcionesATexto(a.grupos || []) : "";
    $("#almSheetTitle").textContent = M.emoji + " " + (tipoAdm === "desayuno" ? "Desayuno" : "Almuerzo") + " de hoy · " + r.nombre;
    var faltaColumna = tipoAdm === "desayuno" && window.Store.columnasFaltantes().indexOf("desayuno") !== -1;
    elAlmBody.innerHTML =
      (faltaColumna ? '<p class="aviso-sql aviso-sql--inline">Para guardar desayunos falta un paso en Supabase: mira el aviso amarillo de arriba.</p>' : "") +
      '<p class="muted" style="margin-bottom:12px">Hoy es <strong>' + esc(hoyISO()) + "</strong>. " +
        "Lo de la última vez ya viene cargado: solo cambia lo que sea distinto y pulsa Publicar.</p>" +
      '<div class="pub-foto" id="pubFotoBox">' + pubFotoHTML(a.foto) + "</div>" +
      '<div class="grid-2">' +
        '<div class="field"><label class="field__label" for="pubTitulo">Título</label>' +
          '<input class="field__input" id="pubTitulo" value="' + esc(a.titulo || M.titulo) + '" /></div>' +
        '<div class="field"><label class="field__label" for="pubPrecio">Precio</label>' +
          '<input class="field__input" id="pubPrecio" type="number" min="0" step="500" value="' +
            esc(a.precio || "") + '" placeholder="' + M.ejemploPrecio + '" /></div>' +
      "</div>" +
      '<div class="field"><label class="field__label" for="pubDesc">¿Qué incluye? (opcional)</label>' +
        '<input class="field__input" id="pubDesc" value="' + esc(a.desc || "") +
        '" placeholder="' + M.ejemploDesc + '" /></div>' +
      '<div class="field"><label class="field__label" for="pubOpciones">Opciones que elige el cliente (una línea por grupo)</label>' +
        '<textarea class="field__textarea" id="pubOpciones" rows="7" placeholder="' + M.ejemploOpc + '">' +
          esc(opciones) + "</textarea>" +
        '<p class="muted" style="font-size:.82rem;margin-top:6px">Formato: <code>Grupo: opción, opción</code>. ' +
          "Marca <code>(agotado)</code> si se acabó, o <code>(precio=10000)</code> si esa opción cambia el precio. " +
          "Si no hay opciones, déjalo vacío.</p>" +
        '<p class="muted" style="font-size:.82rem;margin-top:4px">👌 El cliente puede <strong>dejar sin marcar</strong> lo que no quiera ' +
          "(ej. sin principio) y en el pedido sale “Sin principio”. Si un grupo se debe escoger sí o sí, escribe " +
          "<code>(obligatorio)</code> después del nombre: <code>Proteína (obligatorio): Pollo, Res</code>.</p>" +
      "</div>" +
      '<input type="hidden" id="pubFoto" value="' + esc(a.foto || "") + '" />' +
      '<div class="actions">' +
        '<button type="button" class="btn-primary" id="btnPublicarAlm">✅ Publicar para hoy</button>' +
      "</div>";
    elAlmSheet.hidden = false;
    document.body.classList.add("no-scroll");
  }

  function pubFotoHTML(foto) {
    return (foto ? '<img src="' + esc(foto) + '" alt="" />' : '<div class="pub-foto__vacia">📷 Foto del plato de hoy (opcional)<br><small>Con foto se vende más y puede salir en “Recomendado”.</small></div>') +
      '<div class="inline-actions">' +
        '<label class="btn-copy btn-sm" style="cursor:pointer"><span id="pubFotoTxt">' + (foto ? "📷 Cambiar foto" : "📷 Subir foto") + "</span>" +
          '<input type="file" accept="image/*" hidden id="pubFotoInput" /></label>' +
        (foto ? '<button type="button" class="btn-danger btn-sm" data-pub-foto-quitar>Quitar foto</button>' : "") +
      "</div>";
  }

  async function subirFotoMenu(file) {
    var txt = $("#pubFotoTxt");
    if (txt) txt.innerHTML = '<span class="spinner"></span>Subiendo…';
    try {
      var url = await subirFotoComprimida(file, "menus", 1200);
      $("#pubFoto").value = url;
      $("#pubFotoBox").innerHTML = pubFotoHTML(url);
      toast("Foto lista ✓ (pulsa Publicar)");
    } catch (ex) {
      toast("No se pudo subir la foto: " + (ex && ex.message ? ex.message : "error"), true);
      if (txt) txt.textContent = "📷 Subir foto";
    }
  }

  function cerrarPublicarAlmuerzo() {
    elAlmSheet.hidden = true;
    document.body.classList.remove("no-scroll");
    almEditando = null;
  }

  async function guardarRestauranteAlm(r, msgOk) {
    if (typeof r.orden !== "number") r.orden = restaurantes.length;
    delete r._tipoMenu;
    await window.Store.guardar(r, { soloActualizar: esAliado() });
    var faltan = window.Store.columnasFaltantes();
    if (faltan.indexOf("desayuno") !== -1 && r.desayuno && r.desayuno.activo) {
      toast("⚠️ El desayuno no se guardó: falta ejecutar la línea de SQL del aviso amarillo.", true);
    } else {
      toast(msgOk);
    }
    await recargarLista();
  }

  async function publicarAlmuerzo() {
    var r = almEditando;
    if (!r) return;
    var tipo = r._tipoMenu || tipoAdm, M = MENUS_ADM[tipo];
    var anterior = r[M.campo] || {};
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
    if (!precio && !hayPrecioOpcion) { toast("Ponle precio al " + M.nombre, true); return; }

    r[M.campo] = {
      activo: true,
      titulo: $("#pubTitulo").value.trim() || M.titulo,
      desc: $("#pubDesc").value.trim(),
      precio: precio,
      fecha: hoyISO(),
      foto: $("#pubFoto").value || "",
      grupos: grupos,
    };
    var btn = $("#btnPublicarAlm");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Publicando…';
    try {
      await guardarRestauranteAlm(r, M.emoji + " " + (tipo === "desayuno" ? "Desayuno" : "Almuerzo") + " publicado para hoy ✓");
      cerrarPublicarAlmuerzo();
    } catch (ex) {
      toast(mensajeErrorGuardar(ex), true);
      btn.disabled = false;
      btn.textContent = "✅ Publicar para hoy";
    }
  }

  async function quitarAlmuerzo(id) {
    var M = MENUS_ADM[tipoAdm];
    var r = restaurantes.filter(function (x) { return x.id === id; })[0];
    if (!r || !r[M.campo]) return;
    if (!confirm("¿Quitar el " + M.nombre + " de hoy de " + r.nombre + "?")) return;
    var copia = JSON.parse(JSON.stringify(r));
    copia[M.campo].activo = false;
    try {
      await guardarRestauranteAlm(copia, (tipoAdm === "desayuno" ? "Desayuno" : "Almuerzo") + " quitado");
    } catch (ex) {
      toast(mensajeErrorGuardar(ex), true);
    }
  }

  /* ================== Herramientas del negocio (tablero del aliado) ================== */
  // Disponibilidad rápida, abrir/cerrar, promoción propia, mis ventas y compartir con QR.
  var elAli = $("#aliSheet");
  var elAliBody = $("#aliBody");
  var dispCopia = null, dispTimer = null, dispGuardando = null;

  function restPorId(id) { return restaurantes.filter(function (x) { return x.id === id; })[0]; }
  function enlaceTienda(id) { return location.href.replace(/admin\.html.*$/, "index.html") + "#r=" + encodeURIComponent(id); }
  function promoVigente(r) { var p = r && r.promo; return !!(p && p.texto && (!p.hasta || p.hasta >= hoyISO())); }
  function fechaBonita(iso) {
    try { return new Date(iso + "T12:00:00-05:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" }); }
    catch (e) { return iso; }
  }
  function reemplazarEnMemoria(copia) {
    for (var i = 0; i < restaurantes.length; i++) {
      if (restaurantes[i].id === copia.id) { restaurantes[i] = JSON.parse(JSON.stringify(copia)); return; }
    }
  }

  function abrirAli(titulo, html) {
    $("#aliTitle").textContent = titulo;
    elAliBody.innerHTML = html;
    elAli.hidden = false;
    elAliBody.scrollTop = 0;
    document.body.classList.add("no-scroll");
  }
  async function cerrarAli() {
    if (!elAli || elAli.hidden) return;
    if (dispTimer) { clearTimeout(dispTimer); dispTimer = null; await guardarDisp(); }
    if (dispGuardando) await dispGuardando;
    elAli.hidden = true;
    elAliBody.innerHTML = "";
    dispCopia = null;
    document.body.classList.remove("no-scroll");
    pintarLista();
  }

  function horarioHoyTexto(r) {
    var h = r.horario;
    if (!h || !Object.keys(h).some(function (k) { return h[k]; })) return "Sin horario: abierto mientras recibas pedidos";
    var dia = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"][new Date(hoyISO() + "T12:00:00-05:00").getDay()];
    var x = h[dia];
    return x ? "Horario de hoy: " + x.abre + " a " + x.cierra : "Según tu horario, hoy no abres";
  }

  function tile(ico, titulo, detalle, attr, valor, destacado) {
    return '<button type="button" class="tile' + (destacado ? " tile--on" : "") + '" ' + attr + '="' + esc(valor) + '">' +
      '<span class="tile__ico" aria-hidden="true">' + ico + "</span>" +
      "<strong>" + esc(titulo) + "</strong><small>" + esc(detalle) + "</small></button>";
  }

  function tableroAliadoHTML(r) {
    var abierto = r.abierto !== false;
    var agotados = 0;
    (r.carta || []).forEach(function (s) { (s.items || []).forEach(function (it) { if (it.agotado) agotados++; }); });
    var hoyMenu = (menuHoy(r, "desayuno") ? "🍳 " : "") + (almuerzoHoy(r) ? "🍲 " : "");
    // Su portada, en grande, tal como sale en la carta.
    var portada = r.logo
      ? LogoGhost.recuadro(r, "tablero__portada-img", { sinLazy: true })
      : '<div class="tablero__portada-img tablero__portada-img--vacia">📷 Aún no tienes foto de portada</div>';
    return '<section class="tablero" style="grid-column:1/-1">' +
        '<div class="tablero__portada">' + portada +
          '<div class="tablero__portada-pie"><span><strong>Tu portada</strong> · así la ven tus clientes</span>' +
            '<button type="button" class="btn-copy btn-sm" data-editar="' + esc(r.id) + '">' + (r.logo ? "📷 Cambiar o acomodar" : "📷 Subir foto") + "</button></div>" +
        "</div>" +
        '<div class="tablero__estado' + (abierto ? " tablero__estado--on" : "") + '">' +
          "<div><strong>" + (abierto ? "🟢 Recibiendo pedidos" : "🔴 Cerrado temporalmente") + "</strong>" +
            "<small>" + esc(horarioHoyTexto(r)) + (r.visible === false ? " · 🙈 Aún no publicado en la tienda" : "") + "</small></div>" +
          '<button type="button" class="' + (abierto ? "btn-danger" : "btn-primary") + '" data-ali-abrir="' + esc(r.id) + '">' +
            (abierto ? "⏸️ Cerrar ahora" : "▶️ Abrir ahora") + "</button>" +
        "</div>" +
        '<div class="tablero__grid">' +
          tile("⚡", "Disponibilidad rápida", agotados ? agotados + " agotado(s) · toca para cambiar" : "Marca agotados y ajusta precios en segundos", "data-ali-disp", r.id, agotados > 0) +
          tile("🔥", "Mi promoción", promoVigente(r) ? "“" + r.promo.texto + "”" + (r.promo.hasta ? " · hasta " + fechaBonita(r.promo.hasta) : "") : "Destaca una oferta en tu tarjeta", "data-ali-promo", r.id, promoVigente(r)) +
          tile("📊", "Mis ventas", "Pedidos, ventas y lo que más se vende", "data-ali-ventas", r.id) +
          tile("📲", "Compartir mi carta", "Enlace y código QR para redes y mesas", "data-ali-compartir", r.id) +
          tile("🍽️", "Menú del día", hoyMenu ? hoyMenu + "publicado hoy" : "Publica tu desayuno o almuerzo de hoy", "data-tab-ir", "almuerzos", !!hoyMenu) +
          tile("✏️", "Editar mi carta", contarPlatos(r) + " productos · fotos, horario y más", "data-editar", r.id) +
        "</div>" +
      "</section>";
  }

  /* ---- Abrir / cerrar ya ---- */
  async function alternarAbierto(id, boton) {
    var r = restPorId(id);
    if (!r) return;
    var copia = JSON.parse(JSON.stringify(r));
    copia.abierto = !(r.abierto !== false);
    if (!copia.abierto && !confirm("¿Cerrar " + r.nombre + " ahora? Los clientes verán “Cerrado” y no podrán pedir hasta que lo vuelvas a abrir.")) return;
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span>';
    try {
      await window.Store.guardar(copia, { soloActualizar: esAliado() });
      reemplazarEnMemoria(copia);
      toast(copia.abierto ? "▶️ " + r.nombre + " ya recibe pedidos" : "⏸️ " + r.nombre + " quedó cerrado");
      pintarLista();
    } catch (ex) {
      toast(mensajeErrorGuardar(ex), true);
      boton.disabled = false;
    }
  }

  /* ---- Disponibilidad rápida: agotados y precios, se guarda solo ---- */
  function abrirDisponibilidad(id) {
    var r = restPorId(id);
    if (!r) return;
    dispCopia = JSON.parse(JSON.stringify(r));
    var html =
      '<p class="muted" style="margin-top:0">Apaga lo que se te acabó y ajusta precios aquí mismo. <strong>Todo se guarda solo</strong> y se ve en la tienda al instante.</p>' +
      '<div class="disp-barra">' +
        '<input class="field__input" id="dispBuscar" type="search" placeholder="🔎 Buscar producto…" autocomplete="off" />' +
        '<span class="disp-estado" id="dispEstado" role="status" aria-live="polite"></span>' +
      "</div>";
    (dispCopia.carta || []).forEach(function (s, si) {
      html += '<div class="disp-sec" data-disp-sec><h4>' + esc(s.sec) + "</h4>";
      (s.items || []).forEach(function (it, pi) {
        var k = si + "-" + pi;
        html +=
          '<div class="disp-fila' + (it.agotado ? " disp-fila--agotado" : "") + '" data-disp-fila data-n="' + esc(String(it.n || "").toLowerCase()) + '">' +
            '<label class="disp-toggle" title="Disponible / agotado"><input type="checkbox" data-disp-ag="' + k + '"' + (it.agotado ? "" : " checked") +
              ' aria-label="' + esc(it.n) + ' disponible" /><span class="disp-switch"></span></label>' +
            '<span class="disp-nombre">' + esc(it.n) +
              (Array.isArray(it.opciones) && it.opciones.length ? ' <small class="muted">· con opciones</small>' : "") +
              '<small class="disp-tag">' + (it.agotado ? "Agotado" : "Disponible") + "</small></span>" +
            '<span class="disp-precio"><span>$</span><input class="field__input" type="number" min="0" step="100" inputmode="numeric" data-disp-p="' + k + '" value="' +
              esc(it.p || "") + '" aria-label="Precio de ' + esc(it.n) + '" /></span>' +
          "</div>";
      });
      html += "</div>";
    });
    if (!(dispCopia.carta || []).length) html += '<p class="muted">Aún no tienes productos. Agrégalos en “Editar mi carta”.</p>';
    abrirAli("⚡ Disponibilidad · " + r.nombre, html);
  }
  function itemDisp(k) {
    var p = k.split("-");
    var s = dispCopia && dispCopia.carta[Number(p[0])];
    return s && s.items[Number(p[1])];
  }
  function programarGuardadoDisp() {
    var est = $("#dispEstado");
    if (est) { est.textContent = "Guardando…"; est.className = "disp-estado"; }
    if (dispTimer) clearTimeout(dispTimer);
    dispTimer = setTimeout(function () { dispTimer = null; guardarDisp(); }, 700);
  }
  async function guardarDisp() {
    if (!dispCopia) return;
    var copia = JSON.parse(JSON.stringify(dispCopia));
    var est = $("#dispEstado");
    dispGuardando = (async function () {
      try {
        await window.Store.guardar(copia, { soloActualizar: esAliado() });
        reemplazarEnMemoria(copia);
        if (est) { est.textContent = "✓ Guardado"; est.className = "disp-estado disp-estado--ok"; }
      } catch (ex) {
        if (est) { est.textContent = "⚠️ " + mensajeErrorGuardar(ex); est.className = "disp-estado disp-estado--error"; }
      } finally { dispGuardando = null; }
    })();
    return dispGuardando;
  }

  /* ---- Promoción propia ---- */
  function abrirPromo(id) {
    var r = restPorId(id);
    if (!r) return;
    var p = r.promo || {};
    var faltaSql = window.Store.columnasFaltantes().indexOf("promo") !== -1;
    abrirAli("🔥 Mi promoción · " + r.nombre,
      (faltaSql ? '<p class="aviso-sql aviso-sql--inline">Las promociones se activan cuando el equipo de Servicios Ghost termine de configurar el sistema.</p>' : "") +
      '<p class="muted" style="margin-top:0">Sale como una etiqueta dorada en tu tarjeta y arriba de tu carta. Que sea corta y clara.</p>' +
      '<div class="promo-ideas">' + ["2x1 en granizados", "10% en tu primer pedido", "Postre gratis desde $40.000", "Combo del día $15.000"].map(function (t) {
        return '<button type="button" class="chip chip--sm" data-promo-idea="' + esc(t) + '">' + esc(t) + "</button>";
      }).join("") + "</div>" +
      '<div class="field"><label class="field__label" for="promoTexto">Texto de la promoción <span class="muted">(máx. 40 letras)</span></label>' +
        '<input class="field__input" id="promoTexto" maxlength="40" value="' + esc(p.texto || "") + '" placeholder="Ej: 2x1 en granizados" /></div>' +
      '<div class="field"><label class="field__label" for="promoHasta">Válida hasta <span class="muted">(opcional; se quita sola)</span></label>' +
        '<input class="field__input" id="promoHasta" type="date" min="' + esc(hoyISO()) + '" value="' + esc(p.hasta || "") + '" /></div>' +
      '<div class="promo-vista" id="promoVista"></div>' +
      '<div class="actions">' +
        '<button type="button" class="btn-primary" data-promo-guardar="' + esc(id) + '">💾 Guardar promoción</button>' +
        (p.texto ? '<button type="button" class="btn-danger" data-promo-quitar="' + esc(id) + '">Quitar promoción</button>' : "") +
      "</div>");
    pintarVistaPromo();
  }
  function pintarVistaPromo() {
    var v = $("#promoVista"), t = (($("#promoTexto") || {}).value || "").trim();
    if (v) v.innerHTML = t ? 'Así se verá: <span class="promo-badge">🔥 ' + esc(t) + "</span>" : "";
  }
  async function guardarPromo(id, quitar, boton) {
    var r = restPorId(id);
    if (!r) return;
    var texto = quitar ? "" : (($("#promoTexto") || {}).value || "").trim();
    if (!quitar && !texto) { toast("Escribe el texto de la promoción", true); return; }
    var copia = JSON.parse(JSON.stringify(r));
    copia.promo = texto ? { texto: texto, hasta: ($("#promoHasta") || {}).value || "" } : null;
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span>Guardando…';
    try {
      await window.Store.guardar(copia, { soloActualizar: esAliado() });
      if (window.Store.columnasRechazadas().indexOf("promo") !== -1) {
        toast("Aún no se puede guardar la promoción: falta un paso de configuración (avísale a Servicios Ghost).", true);
      } else {
        reemplazarEnMemoria(copia);
        toast(texto ? "🔥 Promoción publicada ✓" : "Promoción quitada");
      }
      cerrarAli();
    } catch (ex) {
      toast(mensajeErrorGuardar(ex), true);
      boton.disabled = false;
      boton.textContent = quitar ? "Quitar promoción" : "💾 Guardar promoción";
    }
  }

  /* ---- Mis ventas ---- */
  function abrirVentasAliado(id) {
    var r = restPorId(id);
    if (!r) return;
    abrirAli("📊 Mis ventas · " + r.nombre,
      '<div class="inline-actions" style="margin-bottom:12px"><select class="field__select" id="aliRango" aria-label="Periodo">' +
        '<option value="hoy">Hoy</option><option value="7">Últimos 7 días</option><option value="30" selected>Últimos 30 días</option><option value="mes">Este mes</option><option value="todo">Todo</option>' +
      "</select></div>" +
      '<div id="aliVentas"><p class="muted">Calculando…</p></div>');
    cargarVentasAliado();
  }
  async function cargarVentasAliado() {
    var cont = $("#aliVentas");
    if (!cont) return;
    var rango = ($("#aliRango") || {}).value || "30";
    cont.innerHTML = '<p class="muted">Calculando…</p>';
    try {
      var d = await window.Store.misVentas(desdeRango(rango));
      if (!$("#aliVentas")) return;
      if (!d.pedidos && !d.cancelados) {
        cont.innerHTML = '<p class="muted">Todavía no hay pedidos en este periodo. ¡Comparte tu carta para recibir los primeros! 📲</p>';
        return;
      }
      var kpis = [
        ["Ventas entregadas", money(Number(d.ventas) || 0)],
        ["Pedidos entregados", (d.entregados || 0) + " de " + (d.pedidos || 0)],
        ["En curso", String(d.en_curso || 0)],
        ["Productos vendidos", String(d.unidades || 0)],
      ];
      var dias = Object.keys(d.por_dia || {}).sort();
      cont.innerHTML =
        '<div class="kpis">' + kpis.map(function (k) {
          return '<div class="kpi"><span class="kpi__etq">' + esc(k[0]) + '</span><strong class="kpi__val">' + esc(k[1]) + "</strong></div>";
        }).join("") + "</div>" +
        (dias.length > 1 ? '<div class="ventas-card"><h3>Ventas por día</h3>' +
          barrasHTML(dias.map(function (x) { return [x.slice(8, 10) + "/" + x.slice(5, 7), Number(d.por_dia[x]) || 0]; }), money) + "</div>" : "") +
        ((d.top || []).length ? '<div class="ventas-card"><h3>🏆 Lo que más te piden</h3><ol class="top-platos">' +
          d.top.map(function (t) { return "<li><span>" + esc(t.plato) + "</span><strong>" + esc(t.unidades) + "</strong></li>"; }).join("") +
          "</ol></div>" : "") +
        '<p class="muted" style="font-size:.8rem">Las ventas cuentan solo pedidos entregados. Por privacidad, aquí no se muestran datos de los clientes.</p>';
    } catch (ex) {
      cont.innerHTML = ex && ex.code === "SIN_SQL"
        ? '<p class="aviso-sql aviso-sql--inline">Las estadísticas se activan cuando el equipo de Servicios Ghost termine de configurar el sistema.</p>'
        : '<p class="muted">No se pudieron cargar las ventas: ' + esc(ex && ex.message ? ex.message : "error") + "</p>";
    }
  }

  /* ---- Compartir mi carta (enlace + QR) ---- */
  function abrirCompartir(id) {
    var r = restPorId(id);
    if (!r) return;
    var url = enlaceTienda(id);
    var qr = "https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=16&data=" + encodeURIComponent(url);
    var wa = "https://wa.me/?text=" + encodeURIComponent("Mira la carta de " + r.nombre + " y pide a domicilio 🛵👻 " + url);
    abrirAli("📲 Compartir · " + r.nombre,
      (r.visible === false ? '<p class="aviso-sql aviso-sql--inline">Tu negocio aún no está publicado: el enlace y el QR funcionarán cuando lo publiques.</p>' : "") +
      '<div class="compartir">' +
        '<figure class="compartir__qr"><img src="' + esc(qr) + '" alt="Código QR de la carta de ' + esc(r.nombre) + '" width="220" height="220" />' +
          "<figcaption>Escanea y pide a domicilio</figcaption></figure>" +
        '<div class="compartir__acc">' +
          '<p class="muted" style="margin-top:0">Imprime el QR y ponlo en tus mesas, el mostrador o tus bolsas. Comparte el enlace en tus estados de WhatsApp, Instagram y Facebook.</p>' +
          '<input class="field__input" readonly value="' + esc(url) + '" id="aliUrl" aria-label="Enlace de tu carta" />' +
          '<div class="inline-actions">' +
            '<button type="button" class="btn-primary btn-sm" data-ali-copiar>📋 Copiar enlace</button>' +
            '<a class="btn-copy btn-sm" href="' + esc(wa) + '" target="_blank" rel="noopener">💬 Enviar por WhatsApp</a>' +
            '<a class="btn-copy btn-sm" href="' + esc(qr.replace("480x480", "1000x1000")) + '" target="_blank" rel="noopener">⬇️ QR para imprimir</a>' +
          "</div>" +
        "</div>" +
      "</div>");
  }
  function copiarEnlaceAli() {
    var inp = $("#aliUrl");
    if (!inp) return;
    function ok() { toast("Enlace copiado ✓ Pégalo donde quieras"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inp.value).then(ok, function () { inp.select(); document.execCommand("copy"); ok(); });
    } else { inp.select(); document.execCommand("copy"); ok(); }
  }

  /* ---- Eventos de las herramientas ---- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest("[data-ali-close]")) { cerrarAli(); return; }
    var x;
    if ((x = t.closest("[data-ali-abrir]"))) { alternarAbierto(x.getAttribute("data-ali-abrir"), x); return; }
    if ((x = t.closest("[data-ali-disp]"))) { abrirDisponibilidad(x.getAttribute("data-ali-disp")); return; }
    if ((x = t.closest("[data-ali-promo]"))) { abrirPromo(x.getAttribute("data-ali-promo")); return; }
    if ((x = t.closest("[data-ali-ventas]"))) { abrirVentasAliado(x.getAttribute("data-ali-ventas")); return; }
    if ((x = t.closest("[data-ali-compartir]"))) { abrirCompartir(x.getAttribute("data-ali-compartir")); return; }
    if (t.closest("[data-ali-copiar]")) { copiarEnlaceAli(); return; }
    if ((x = t.closest("[data-tab-ir]"))) { cambiarTab(x.getAttribute("data-tab-ir")); window.scrollTo(0, 0); return; }
    if ((x = t.closest("[data-promo-idea]"))) { $("#promoTexto").value = x.getAttribute("data-promo-idea"); pintarVistaPromo(); return; }
    if ((x = t.closest("[data-promo-guardar]"))) { guardarPromo(x.getAttribute("data-promo-guardar"), false, x); return; }
    if ((x = t.closest("[data-promo-quitar]"))) { guardarPromo(x.getAttribute("data-promo-quitar"), true, x); return; }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var k = t.getAttribute("data-disp-ag");
    if (k) {
      var it = itemDisp(k);
      if (!it) return;
      it.agotado = !t.checked;
      var fila = t.closest("[data-disp-fila]");
      fila.classList.toggle("disp-fila--agotado", it.agotado);
      fila.querySelector(".disp-tag").textContent = it.agotado ? "Agotado" : "Disponible";
      programarGuardadoDisp();
      return;
    }
    k = t.getAttribute("data-disp-p");
    if (k) {
      var it2 = itemDisp(k);
      if (!it2) return;
      var v = Math.max(0, Math.round(Number(t.value) || 0));
      if (v === (Number(it2.p) || 0)) return;
      it2.p = v;
      programarGuardadoDisp();
      return;
    }
    if (t.id === "aliRango") cargarVentasAliado();
  });
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (!t) return;
    if (t.id === "promoTexto") { pintarVistaPromo(); return; }
    if (t.id === "dispBuscar") {
      var q = t.value.trim().toLowerCase();
      elAliBody.querySelectorAll("[data-disp-sec]").forEach(function (sec) {
        var alguna = false;
        sec.querySelectorAll("[data-disp-fila]").forEach(function (f) {
          var ver = !q || f.getAttribute("data-n").indexOf(q) !== -1;
          f.hidden = !ver;
          if (ver) alguna = true;
        });
        sec.hidden = !alguna;
      });
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && elAli && !elAli.hidden) cerrarAli();
  });

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

    // Menú del día (desayunos y almuerzos)
    if (t.closest("[data-alm-close]")) { cerrarPublicarAlmuerzo(); return; }
    var pub = t.closest("[data-alm-publicar]");
    if (pub) { abrirPublicarAlmuerzo(pub.getAttribute("data-alm-publicar")); return; }
    var qui = t.closest("[data-alm-quitar]");
    if (qui) { quitarAlmuerzo(qui.getAttribute("data-alm-quitar")); return; }
    if (t.closest("#btnPublicarAlm")) { publicarAlmuerzo(); return; }
    var tm = t.closest("[data-tipo-menu]");
    if (tm) { cambiarTipoMenu(tm.getAttribute("data-tipo-menu")); return; }
    if (t.closest("[data-pub-foto-quitar]")) { $("#pubFoto").value = ""; $("#pubFotoBox").innerHTML = pubFotoHTML(""); return; }
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
    var sinc = t.closest("[data-sincronizar]");
    if (sinc) { sincronizarCarta(sinc.getAttribute("data-sincronizar"), sinc); return; }
    var bo = t.closest("[data-borrar]");
    if (bo) { borrar(bo.getAttribute("data-borrar")); return; }

    // Horario: copiar el lunes a todos / quitar
    if (t.closest("[data-hor-copiar]")) {
      var on = elEditorBody.querySelector('[data-hor-abre-dia="lun"]');
      var a0 = elEditorBody.querySelector('[data-hor-abre="lun"]').value;
      var c0 = elEditorBody.querySelector('[data-hor-cierra="lun"]').value;
      DIAS_H.forEach(function (d) {
        elEditorBody.querySelector('[data-hor-abre-dia="' + d[0] + '"]').checked = on.checked;
        var a = elEditorBody.querySelector('[data-hor-abre="' + d[0] + '"]');
        var c = elEditorBody.querySelector('[data-hor-cierra="' + d[0] + '"]');
        a.value = a0; c.value = c0; a.disabled = c.disabled = !on.checked;
      });
      toast("Horario del lunes copiado a toda la semana");
      return;
    }
    if (t.closest("[data-hor-limpiar]")) {
      elEditorBody.querySelectorAll("[data-hor-abre-dia]").forEach(function (x) { x.checked = false; });
      elEditorBody.querySelectorAll("[data-hor-abre],[data-hor-cierra]").forEach(function (x) { x.disabled = true; });
      return;
    }

    // Quitar la foto de un plato
    var qf = t.closest("[data-plato-foto-quitar]");
    if (qf) {
      leerEditor();
      var pq = qf.getAttribute("data-plato-foto-quitar").split("-");
      var itq = editando.carta[Number(pq[0])].items[Number(pq[1])];
      if (itq) delete itq.foto;
      pintarEditor();
      return;
    }

    // Ajustes / ventas / avisos
    if (t.closest("#btnAvisos")) { alternarAvisos(); return; }
    if (t.closest("#btnCsv")) { descargarCsv(); return; }
    var aj = t.closest("[data-aj]");
    if (aj) { accionAjustes(aj.getAttribute("data-aj"), aj); return; }

    // Quitar foto
    if (t.closest("[data-quitar-foto]")) {
      leerEditor(); editando.logo = ""; editando.logoPos = null; pintarEditor(); return;
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
    // Copiar las adiciones de una sección a todas
    var adicTodas = t.closest("[data-adic-todas]");
    if (adicTodas) {
      leerEditor();
      var origen = editando.carta[Number(adicTodas.getAttribute("data-adic-todas"))];
      var lista = origen && origen.adiciones ? origen.adiciones : [];
      if (!lista.length) return;
      if (!confirm("¿Poner estas " + lista.length + " adiciones en todas las secciones? Reemplaza las que tengan las otras secciones.")) return;
      editando.carta.forEach(function (sc) { sc.adiciones = JSON.parse(JSON.stringify(lista)); });
      var yA = elEditorBody.scrollTop;
      pintarEditor();
      elEditorBody.scrollTop = yA;
      toast("Adiciones copiadas a " + editando.carta.length + " secciones ✓ (falta Guardar cambios)");
      return;
    }
    // Opciones del plato y adiciones: agregar / quitar filas
    var po = t.closest("[data-po-plantilla],[data-po-add-o],[data-po-del-o],[data-po-del-g],[data-ad-add],[data-ad-del]");
    if (po) { editarFilasOpciones(po); return; }
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
    var t = e.target;
    if (!t) return;
    if (t.id === "filtroPedidos") { recargarPedidos(); return; }
    if (t.id === "rangoVentas") { cargarVentas(); return; }

    // Horario: activar/desactivar las horas del día
    var dia = t.getAttribute && t.getAttribute("data-hor-abre-dia");
    if (dia) {
      elEditorBody.querySelectorAll('[data-hor-abre="' + dia + '"],[data-hor-cierra="' + dia + '"]')
        .forEach(function (x) { x.disabled = !t.checked; });
      return;
    }

    if (t.id === "pubFotoInput" && t.files && t.files[0]) { subirFotoMenu(t.files[0]); return; }

    // Foto de perfil (logo/foto) y publicar: repintar para ver el resultado al instante
    if ((t.name === "logoAjuste" || t.id === "campoVisible" || t.getAttribute("data-campo") === "color") && editando) {
      var y = elEditorBody.scrollTop;
      leerEditor(); pintarEditor();
      elEditorBody.scrollTop = y;
      return;
    }

    // Foto de un plato
    var key = t.getAttribute && t.getAttribute("data-plato-foto-input");
    if (key && t.files && t.files[0]) subirFotoPlato(key, t.files[0]);
  });

  async function subirFotoPlato(key, file) {
    var txt = elEditorBody.querySelector('[data-plato-foto-txt="' + key + '"]');
    if (txt) txt.innerHTML = '<span class="spinner"></span>Subiendo…';
    try {
      var url = await subirFotoComprimida(file, "platos", 800);
      leerEditor();
      var p = key.split("-");
      var it = editando.carta[Number(p[0])] && editando.carta[Number(p[0])].items[Number(p[1])];
      if (it) it.foto = url;
      pintarEditor();
      toast("Foto del plato lista ✓ (recuerda Guardar cambios)");
    } catch (ex) {
      toast("No se pudo subir la foto: " + (ex && ex.message ? ex.message : "error"), true);
      if (txt) txt.textContent = "📷 Foto del plato";
    }
  }

  async function guardar() {
    leerEditor();
    var r = editando;
    // Fuera filas vacías (opciones sin nombre, grupos sin opciones, adiciones sin nombre).
    (r.carta || []).forEach(function (sc) {
      (sc.items || []).forEach(function (it) {
        if (it.opciones) { it.opciones = limpiarOpciones(it.opciones); if (!it.opciones.length) delete it.opciones; }
      });
      if (sc.adiciones) { sc.adiciones = sc.adiciones.filter(function (a) { return a.n; }); if (!sc.adiciones.length) delete sc.adiciones; }
    });
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
      delete r._importTexto;
      delete r._importMsg;
      await window.Store.guardar(r, { soloActualizar: esAliado() });
      var falta = window.Store.columnasFaltantes();
      toast(falta.indexOf("horario") !== -1 && r.horario
        ? "Guardado ✓ (el horario se activará al ejecutar supabase-mejoras.sql)"
        : "Guardado ✓");
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
    if (/No tienes permiso para editar/i.test(msg)) return msg;
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
    var paneles = { restaurantes: "tabRestaurantes", almuerzos: "tabAlmuerzos", pedidos: "tabPedidos",
      ventas: "tabVentas", ajustes: "tabAjustes" };
    Object.keys(paneles).forEach(function (k) {
      var el = document.getElementById(paneles[k]);
      if (el) el.hidden = k !== cual;
    });
    if (cual === "almuerzos") pintarAlmuerzos();
    if (cual === "ventas") cargarVentas();
    if (cual === "ajustes") pintarAjustes();
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
      return d.toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
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
        '<div class="pedido__total">Productos: <strong>' + esc(money(p.total || 0)) + "</strong>" +
          (typeof cliente.domicilio === "number"
            ? " · Domicilio: <strong>" + esc(cliente.domicilio > 0 ? money(cliente.domicilio) : "gratis") + "</strong>" +
              ' · <span class="pedido__pagar">Total a cobrar: ' + esc(money((p.total || 0) + cliente.domicilio)) + "</span>"
            : ' <span class="muted">(domicilio por confirmar)</span>') + "</div>" +
        '<div class="pedido__cliente">' +
          "👤 " + esc(cliente.nombre || "—") + " · 📞 " +
          (cliente.telefono
            ? '<a href="https://wa.me/' + esc(telWa(cliente.telefono)) + '" target="_blank" rel="noopener">' + esc(cliente.telefono) + "</a>"
            : "—") + "<br>" +
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
    var motivo = prompt("Motivo de la cancelación (opcional). El cliente lo verá al seguir su pedido:", "");
    if (motivo === null) return; // canceló el prompt
    try {
      await window.Store.actualizarEstadoPedido(id, "cancelado", motivo || "");
      toast("Pedido cancelado");
      await recargarPedidos();
    } catch (ex) {
      toast("No se pudo cancelar: " + (ex && ex.message ? ex.message : "error"), true);
    }
  }

  /* ------------------------- Utilidades --------------------------- */
  // Teléfono → número de WhatsApp (Colombia por defecto).
  function telWa(tel) {
    var d = String(tel || "").replace(/\D/g, "");
    if (d.length === 10 && d[0] === "3") d = "57" + d;
    return d;
  }
  function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }
  function idBase(platoId) { return String(platoId || "").split("--")[0]; }

  /* ---------------------------- Ventas ---------------------------- */
  var ventasPedidos = [];

  // Fecha ISO desde la que se cuentan las ventas (medianoche de Colombia).
  function desdeRango(v) {
    var hoy = fechaColombia();
    function medianoche(fecha) { return new Date(fecha + "T00:00:00-05:00").toISOString(); }
    if (v === "hoy") return medianoche(hoy);
    if (v === "mes") return medianoche(hoy.slice(0, 8) + "01");
    if (v === "7" || v === "30") {
      var d = new Date(new Date(hoy + "T12:00:00-05:00").getTime() - (Number(v) - 1) * 86400000);
      return medianoche(fechaColombia(d));
    }
    return null;
  }

  async function cargarVentas() {
    var cont = $("#contVentas");
    if (!cont) return;
    cont.innerHTML = '<p class="muted">Calculando ventas…</p>';
    var rango = ($("#rangoVentas") || {}).value || "7";
    try {
      await window.Store.leerAjustes();
      ventasPedidos = await window.Store.listarPedidos("todos", desdeRango(rango));
      cont.innerHTML = ventasHTML(ventasPedidos, rango);
      publicarPopulares(ventasPedidos, rango);
    } catch (ex) {
      cont.innerHTML = '<p class="muted">No se pudieron cargar las ventas: ' + esc(ex && ex.message ? ex.message : "error") + "</p>";
    }
  }

  function calcularVentas(lista) {
    // Dinero (ventas, comisión, domicilios) = SOLO pedidos marcados "Entregado".
    // Lo demás (popularidad, horas pico) cuenta todo lo que no se canceló.
    var r = { pedidos: 0, cancelados: 0, entregados: 0, ventas: 0, domicilios: 0,
      pendientes: 0, ventasPendientes: 0,
      porRest: {}, porPlato: {}, porDia: {}, porHora: new Array(24).fill(0) };
    lista.forEach(function (p) {
      if (p.estado === "cancelado") { r.cancelados++; return; }
      r.pedidos++;
      var entregado = p.estado === "entregado";
      if (!entregado) { r.pendientes++; r.ventasPendientes += Number(p.total) || 0; }
      if (entregado) {
        r.entregados++;
        r.ventas += Number(p.total) || 0;
        var c = p.cliente || {};
        if (typeof c.domicilio === "number") r.domicilios += c.domicilio;
        var dia = fechaColombia(new Date(p.creado_en));
        r.porDia[dia] = (r.porDia[dia] || 0) + (Number(p.total) || 0);
      }
      try {
        var h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "2-digit", hourCycle: "h23" })
          .format(new Date(p.creado_en))) % 24;
        r.porHora[h]++;
      } catch (e) { r.porHora[new Date(p.creado_en).getHours()]++; }
      var restEnPedido = {};
      (p.items || []).forEach(function (it) {
        var rid = it.restaurante_id || it.restaurante || "?";
        if (entregado) {
          var R = r.porRest[rid] || (r.porRest[rid] = { nombre: it.restaurante || rid, pedidos: 0, unidades: 0, ventas: 0 });
          R.unidades += Number(it.cantidad) || 0;
          R.ventas += Number(it.subtotal) || 0;
          if (!restEnPedido[rid]) { R.pedidos++; restEnPedido[rid] = true; }
        }
        if (/^(almuerzo|desayuno)-/.test(it.plato_id || "")) return; // el menú del día cambia cada día
        var kb = rid + "::" + idBase(it.plato_id);
        var P = r.porPlato[kb] || (r.porPlato[kb] = { rest: rid, item: idBase(it.plato_id), restNombre: it.restaurante,
          nombre: String(it.plato || "").replace(/\s*\(.*\)\s*$/, ""), unidades: 0, ventas: 0 });
        P.unidades += Number(it.cantidad) || 0;
        P.ventas += Number(it.subtotal) || 0;
      });
    });
    return r;
  }

  function barrasHTML(pares, formato) {
    var max = Math.max.apply(null, pares.map(function (x) { return x[1]; }).concat([1]));
    return '<div class="barras">' + pares.map(function (x) {
      return '<div class="barra" title="' + esc(x[0] + ": " + formato(x[1])) + '">' +
          '<div class="barra__valor" style="height:' + Math.max(2, Math.round((x[1] / max) * 100)) + '%"></div>' +
          '<span class="barra__etq">' + esc(x[0]) + "</span>" +
        "</div>";
    }).join("") + "</div>";
  }

  function ventasHTML(lista, rango) {
    var v = calcularVentas(lista);
    if (!lista.length) return '<p class="muted">Todavía no hay pedidos en este periodo.</p>';
    var filasRestVacias = !Object.keys(v.porRest).length;
    var aj = window.Store.ajustesDisponibles() ? (cacheAjustes().comision || 0) : 0;
    var comision = Number(aj) || 0;
    var kpis = [
      ["Ventas entregadas", money(v.ventas)],
      ["Pedidos entregados", v.entregados + " de " + v.pedidos],
      ["Ticket promedio", money(v.entregados ? Math.round(v.ventas / v.entregados) : 0)],
      ["Domicilios cobrados", money(v.domicilios)],
      ["Sin marcar como entregados", v.pendientes + (v.pendientes ? " · " + money(v.ventasPendientes) : "")],
      ["Cancelados", String(v.cancelados)],
    ];
    if (comision) kpis.splice(1, 0, ["Comisión (" + comision + "%)", money(Math.round(v.ventas * comision / 100))]);
    var avisoPend = v.pendientes
      ? '<p class="aviso-sql aviso-sql--inline">Hay ' + v.pendientes + " pedido(s) sin marcar como <strong>Entregado</strong>. " +
        "Las ventas y la comisión solo cuentan pedidos entregados: márcalos en la pestaña Pedidos.</p>"
      : "";

    var rest = Object.keys(v.porRest).map(function (k) { return v.porRest[k]; })
      .sort(function (a, b) { return b.ventas - a.ventas; });
    var filasRest = rest.map(function (R) {
      return "<tr><td>" + esc(R.nombre) + "</td><td>" + R.pedidos + "</td><td>" + R.unidades + "</td><td>" +
        esc(money(R.ventas)) + ' <span class="muted">(' + pct(R.ventas, v.ventas) + "%)</span></td>" +
        (comision ? "<td>" + esc(money(Math.round(R.ventas * comision / 100))) + "</td>" : "") + "</tr>";
    }).join("");

    var platos = Object.keys(v.porPlato).map(function (k) { return v.porPlato[k]; })
      .sort(function (a, b) { return b.unidades - a.unidades || b.ventas - a.ventas; }).slice(0, 10);

    var dias = Object.keys(v.porDia).sort();
    var graficoDias = dias.length > 1
      ? '<div class="ventas-card"><h3>Ventas por día</h3>' +
          barrasHTML(dias.map(function (d) { return [d.slice(8, 10) + "/" + d.slice(5, 7), v.porDia[d]]; }), money) + "</div>"
      : "";
    var horas = [];
    for (var h = 6; h < 24; h++) horas.push([(h % 12 || 12) + (h < 12 ? "a" : "p"), v.porHora[h]]);

    return avisoPend + '<div class="kpis">' + kpis.map(function (k) {
        return '<div class="kpi"><span class="kpi__etq">' + esc(k[0]) + '</span><strong class="kpi__val">' + esc(k[1]) + "</strong></div>";
      }).join("") + "</div>" +
      graficoDias +
      '<div class="ventas-grid">' +
        '<div class="ventas-card"><h3>Por restaurante <span class="muted" style="font-weight:500;font-size:.8rem">(entregados)</span></h3><div class="tabla-scroll"><table class="tabla">' +
          "<thead><tr><th>Restaurante</th><th>Pedidos</th><th>Unid.</th><th>Ventas</th>" + (comision ? "<th>Comisión</th>" : "") + "</tr></thead>" +
          "<tbody>" + (filasRestVacias ? '<tr><td colspan="5" class="muted">Aún no hay pedidos entregados.</td></tr>' : filasRest) + "</tbody></table></div>" +
          (comision ? "" : '<p class="muted" style="font-size:.82rem">Configura tu % de comisión en Ajustes para ver cuánto le corresponde a Ghost de cada aliado.</p>') +
        "</div>" +
        '<div class="ventas-card"><h3>Platos más vendidos</h3><ol class="top-platos">' +
          platos.map(function (P) {
            return "<li><span>" + esc(P.nombre) + ' <span class="muted">· ' + esc(P.restNombre) + "</span></span><strong>" + P.unidades + "</strong></li>";
          }).join("") + "</ol>" +
          '<p class="muted" style="font-size:.82rem" id="notaPopulares"></p>' +
        "</div>" +
      "</div>" +
      '<div class="ventas-card"><h3>Horas con más pedidos</h3>' +
        barrasHTML(horas, function (n) { return n + (n === 1 ? " pedido" : " pedidos"); }) + "</div>";
  }

  function cacheAjustes() {
    return window.Store._ajustesCache ? window.Store._ajustesCache() : {};
  }

  // Publica en la tienda la sección "Lo más pedido" con los datos del periodo.
  async function publicarPopulares(lista, rango) {
    var nota = $("#notaPopulares");
    if (rango === "hoy") { if (nota) nota.textContent = "Elige 7 días o más para actualizar “Lo más pedido” en la tienda."; return; }
    if (window.Store.ajustesDisponibles() === false) {
      if (nota) nota.textContent = "Ejecuta supabase-mejoras.sql para mostrar estos platos en la tienda como “Lo más pedido”.";
      return;
    }
    var v = calcularVentas(lista);
    var top = Object.keys(v.porPlato).map(function (k) { return v.porPlato[k]; })
      .sort(function (a, b) { return b.unidades - a.unidades; }).slice(0, 8)
      .map(function (P) { return { rest: P.rest, item: P.item, veces: P.unidades }; });
    if (top.length < 3) { if (nota) nota.textContent = "Con al menos 3 platos vendidos aparecerá “Lo más pedido” en la tienda."; return; }
    var antes = JSON.stringify(cacheAjustes().populares || []);
    try {
      if (antes !== JSON.stringify(top)) await window.Store.guardarAjuste("populares", top);
      if (nota) nota.textContent = "✓ Estos platos se muestran en la tienda como “Lo más pedido”.";
    } catch (ex) {
      if (nota) nota.textContent = ex.message || "No se pudo publicar en la tienda.";
    }
  }

  function descargarCsv() {
    if (!ventasPedidos.length) { toast("No hay pedidos en este periodo", true); return; }
    var cab = ["fecha", "codigo", "estado", "cliente", "telefono", "barrio", "direccion", "pago",
      "restaurante", "plato", "cantidad", "precio_unitario", "subtotal", "total_productos", "domicilio"];
    function celda(x) {
      x = x == null ? "" : String(x);
      // Evita que Excel ejecute como fórmula lo que escribió un cliente (=, +, -, @).
      if (/^[=+\-@\t\r]/.test(x) && !/^-?\d+(\.\d+)?$/.test(x)) x = "'" + x;
      return /[;"\n\r]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x;
    }
    var filas = [cab.join(";")];
    ventasPedidos.forEach(function (p) {
      var c = p.cliente || {};
      (p.items && p.items.length ? p.items : [{}]).forEach(function (it) {
        filas.push([fechaColombia(new Date(p.creado_en)) + " " + new Date(p.creado_en).toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" }),
          p.codigo, p.estado, c.nombre, c.telefono, c.barrio, c.direccion, c.pago,
          it.restaurante, it.plato, it.cantidad, it.precio_unit, it.subtotal, p.total,
          typeof c.domicilio === "number" ? c.domicilio : ""].map(celda).join(";"));
      });
    });
    var blob = new Blob(["\ufeff" + filas.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ventas-servicios-ghost-" + fechaColombia() + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------------------------- Ajustes --------------------------- */
  var ajLocal = null; // copia editable { barrios: [], promos: [], comision: 0 }

  async function pintarAjustes() {
    var cont = $("#contAjustes");
    if (!cont) return;
    cont.innerHTML = '<p class="muted">Cargando…</p>';
    var a = (await window.Store.leerAjustes(true)) || {};
    ajLocal = {
      barrios: ((a.domicilios && a.domicilios.barrios) || []).map(function (b) { return { n: b.n, p: b.p }; }),
      promos: Array.isArray(a.promos) ? a.promos.slice()
        : (typeof PROMOCIONES !== "undefined" ? PROMOCIONES.map(function (p) { return Object.assign({ activo: true }, p); }) : []),
      comision: Number(a.comision) || 0,
    };
    renderAjustes();
    cargarAliados();
  }

  function opcionesRestaurantes(sel) {
    return '<option value="">— Ninguno —</option>' + restaurantes.map(function (r) {
      return '<option value="' + esc(r.id) + '"' + (r.id === sel ? " selected" : "") + ">" + esc(r.nombre) + "</option>";
    }).join("");
  }

  function renderAjustes() {
    var sinSql = window.Store.ajustesDisponibles() === false;
    var avisoSql = sinSql ? '<p class="aviso-sql aviso-sql--inline">Para guardar esto, ejecuta <code>supabase-mejoras.sql</code> en Supabase (una sola vez).</p>' : "";
    var a = ajLocal;
    $("#contAjustes").innerHTML =
      // Domicilios
      '<section class="aj-card">' +
        "<h3>🛵 Domicilio por barrio</h3>" +
        '<p class="muted">El cliente elige su barrio al pedir y ve el valor del domicilio y el total a pagar. ' +
          "Si su barrio no está en la lista, se confirma por WhatsApp. Déjala vacía para confirmar siempre por WhatsApp.</p>" +
        avisoSql +
        '<div class="aj-filas" id="ajBarrios">' + (a.barrios.length ? a.barrios.map(function (b, i) {
          return '<div class="aj-fila" data-barrio="' + i + '">' +
              '<input class="field__input" data-b-n value="' + esc(b.n || "") + '" placeholder="Barrio" />' +
              '<input class="field__input aj-precio" data-b-p type="number" min="0" step="500" value="' + esc(b.p != null ? b.p : "") + '" placeholder="Valor" />' +
              '<button type="button" class="btn-danger btn-sm" data-aj="del-barrio" data-i="' + i + '" aria-label="Quitar barrio">✕</button>' +
            "</div>";
        }).join("") : '<p class="muted">Aún no hay barrios.</p>') + "</div>" +
        '<div class="inline-actions">' +
          '<button type="button" class="btn-copy btn-sm" data-aj="add-barrio">+ Agregar barrio</button>' +
          '<button type="button" class="btn-primary btn-sm" data-aj="guardar-barrios">Guardar domicilios</button>' +
        "</div>" +
        '<details class="aj-pegar"><summary>Pegar una lista de barrios</summary>' +
          '<textarea class="field__textarea" id="ajPegarBarrios" rows="4" placeholder="Centro - 3000&#10;El Progreso - 4000&#10;Villa del Río 5.000"></textarea>' +
          '<button type="button" class="btn-copy btn-sm" data-aj="pegar-barrios">Agregar estos barrios</button>' +
        "</details>" +
      "</section>" +

      // Promociones
      '<section class="aj-card">' +
        "<h3>🔥 Promociones del inicio</h3>" +
        '<p class="muted">Se muestran en la franja de la tienda. Si eliges un restaurante, al tocarla se abre su carta.</p>' +
        avisoSql +
        '<div class="aj-filas" id="ajPromos">' + (a.promos.length ? a.promos.map(function (p, i) {
          return '<div class="aj-promo" data-promo="' + i + '">' +
              '<input class="field__input aj-emoji" data-p-emoji value="' + esc(p.emoji || "") + '" placeholder="🔥" maxlength="4" />' +
              '<input class="field__input" data-p-titulo value="' + esc(p.titulo || "") + '" placeholder="Título (ej. 2x1 en hamburguesas)" />' +
              '<input class="field__input" data-p-texto value="' + esc(p.texto || "") + '" placeholder="Texto corto" />' +
              '<select class="field__input field__select" data-p-rest aria-label="Restaurante">' + opcionesRestaurantes(p.rest) + "</select>" +
              '<label class="agotado-check"><input type="checkbox" data-p-activo' + (p.activo !== false ? " checked" : "") + " /> Visible</label>" +
              '<button type="button" class="btn-danger btn-sm" data-aj="del-promo" data-i="' + i + '" aria-label="Quitar promoción">✕</button>' +
            "</div>";
        }).join("") : '<p class="muted">No hay promociones.</p>') + "</div>" +
        '<div class="inline-actions">' +
          '<button type="button" class="btn-copy btn-sm" data-aj="add-promo">+ Agregar promoción</button>' +
          '<button type="button" class="btn-primary btn-sm" data-aj="guardar-promos">Guardar promociones</button>' +
        "</div>" +
      "</section>" +

      // Comisión
      '<section class="aj-card">' +
        "<h3>💰 Comisión de Servicios Ghost</h3>" +
        '<p class="muted">Porcentaje que cobras a los restaurantes sobre sus ventas. Se usa en la pestaña Ventas.</p>' +
        avisoSql +
        '<div class="inline-actions">' +
          '<input class="field__input aj-precio" id="ajComision" type="number" min="0" max="100" step="0.5" value="' + esc(a.comision || "") + '" placeholder="Ej: 10" />' +
          '<span class="muted">%</span>' +
          '<button type="button" class="btn-primary btn-sm" data-aj="guardar-comision">Guardar comisión</button>' +
        "</div>" +
      "</section>" +

      // Aliados
      '<section class="aj-card">' +
        "<h3>🤝 Cuentas de restaurantes aliados</h3>" +
        '<p class="muted">Cada aliado entra a este mismo panel con su correo y <strong>solo</strong> puede editar su carta, ' +
          "marcar agotados, cambiar su horario y publicar su almuerzo del día. No ve pedidos, ventas ni a los demás restaurantes.</p>" +
        '<ol class="muted aj-pasos">' +
          "<li>En Supabase → <em>Authentication → Users → Add user</em>, crea la cuenta con el correo del aliado y una contraseña (marca <em>Auto Confirm User</em>).</li>" +
          "<li>Aquí abajo escribe ese correo, elige su restaurante y toca <strong>Dar acceso</strong>.</li>" +
          "<li>Pásale al aliado el enlace del panel, su correo y su contraseña.</li>" +
        "</ol>" +
        '<div class="aj-fila">' +
          '<input class="field__input" id="ajAliadoEmail" type="email" placeholder="correo@del-aliado.com" />' +
          '<select class="field__input field__select" id="ajAliadoRest" aria-label="Restaurante">' + opcionesRestaurantes("") + "</select>" +
          '<button type="button" class="btn-primary btn-sm" data-aj="asignar">Dar acceso</button>' +
        "</div>" +
        '<div id="ajAliados" class="aj-aliados"><p class="muted">Cargando aliados…</p></div>' +
      "</section>";
  }

  // Pasa lo escrito en pantalla a ajLocal (para no perderlo al repintar).
  function leerAjustesDOM() {
    if (!ajLocal) return;
    var bs = [];
    document.querySelectorAll("#ajBarrios [data-barrio]").forEach(function (f) {
      bs.push({ n: f.querySelector("[data-b-n]").value.trim(), p: Number(f.querySelector("[data-b-p]").value) || 0 });
    });
    if (document.querySelector("#ajBarrios")) ajLocal.barrios = bs;
    var ps = [];
    document.querySelectorAll("#ajPromos [data-promo]").forEach(function (f) {
      ps.push({
        emoji: f.querySelector("[data-p-emoji]").value.trim(),
        titulo: f.querySelector("[data-p-titulo]").value.trim(),
        texto: f.querySelector("[data-p-texto]").value.trim(),
        rest: f.querySelector("[data-p-rest]").value || "",
        activo: f.querySelector("[data-p-activo]").checked,
      });
    });
    if (document.querySelector("#ajPromos")) ajLocal.promos = ps;
    var c = $("#ajComision");
    if (c) ajLocal.comision = Number(c.value) || 0;
  }

  async function guardarAj(clave, valor, boton, okMsg) {
    var texto = boton.textContent;
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span>Guardando…';
    try {
      await window.Store.guardarAjuste(clave, valor);
      toast(okMsg);
    } catch (ex) {
      toast(ex && ex.message ? ex.message : "No se pudo guardar", true);
    } finally {
      boton.disabled = false;
      boton.textContent = texto;
    }
  }

  async function accionAjustes(accion, el) {
    leerAjustesDOM();
    var i = Number(el.getAttribute("data-i"));
    switch (accion) {
      case "add-barrio": ajLocal.barrios.push({ n: "", p: "" }); renderAjustes(); cargarAliados();
        var ult = document.querySelectorAll("#ajBarrios [data-b-n]"); if (ult.length) ult[ult.length - 1].focus(); return;
      case "del-barrio": ajLocal.barrios.splice(i, 1); renderAjustes(); cargarAliados(); return;
      case "pegar-barrios": {
        var txt = ($("#ajPegarBarrios") || {}).value || "";
        var n = 0;
        txt.split(/\r?\n/).forEach(function (l) {
          var m = l.trim().match(/^(.*?)[\s:\-–—|]*\$?\s*([\d.,]+\s*(?:mil|k)?)\s*$/i);
          if (m && m[1].trim()) { ajLocal.barrios.push({ n: m[1].trim(), p: window.Importar ? window.Importar.precio(m[2]) : Number(m[2].replace(/\D/g, "")) }); n++; }
          else if (l.trim()) { ajLocal.barrios.push({ n: l.trim(), p: 0 }); n++; }
        });
        renderAjustes(); cargarAliados();
        toast(n ? n + " barrios agregados. Revisa y pulsa Guardar." : "No encontré barrios en el texto", !n);
        return;
      }
      case "guardar-barrios": {
        var limpios = ajLocal.barrios.filter(function (b) { return b.n; })
          .sort(function (a, b) { return a.n.localeCompare(b.n, "es"); });
        var vistos = {}, dup = limpios.filter(function (b) { var k = b.n.toLowerCase(); if (vistos[k]) return true; vistos[k] = 1; return false; });
        if (dup.length) { toast("Hay barrios repetidos: " + dup.map(function (b) { return b.n; }).join(", "), true); return; }
        ajLocal.barrios = limpios;
        await guardarAj("domicilios", { barrios: limpios }, el, limpios.length ? "Domicilios guardados ✓ (" + limpios.length + " barrios)" : "Listo: el domicilio se confirmará por WhatsApp");
        renderAjustes(); cargarAliados();
        return;
      }
      case "add-promo": ajLocal.promos.push({ emoji: "✨", titulo: "", texto: "", rest: "", activo: true }); renderAjustes(); cargarAliados(); return;
      case "del-promo": ajLocal.promos.splice(i, 1); renderAjustes(); cargarAliados(); return;
      case "guardar-promos": {
        var promos = ajLocal.promos.filter(function (p) { return p.titulo || p.texto; });
        await guardarAj("promos", promos, el, "Promociones guardadas ✓");
        return;
      }
      case "guardar-comision": {
        if (ajLocal.comision < 0 || ajLocal.comision > 100) { toast("La comisión debe estar entre 0 y 100", true); return; }
        await guardarAj("comision", ajLocal.comision, el, "Comisión guardada ✓");
        return;
      }
      case "asignar": return asignarAliadoUI(el);
      case "quitar": return quitarAliadoUI(el.getAttribute("data-email"));
    }
  }

  async function cargarAliados() {
    var cont = $("#ajAliados");
    if (!cont) return;
    try {
      var lista = await window.Store.listarAliados();
      if (!lista.length) { cont.innerHTML = '<p class="muted">Aún no hay aliados con acceso.</p>'; return; }
      cont.innerHTML = lista.map(function (x) {
        var r = restaurantes.filter(function (y) { return y.id === x.restaurante_id; })[0];
        return '<div class="aj-aliado"><span><strong>' + esc(x.email) + "</strong> → " + esc(r ? r.nombre : x.restaurante_id) + "</span>" +
          '<button type="button" class="btn-danger btn-sm" data-aj="quitar" data-email="' + esc(x.email) + '">Quitar acceso</button></div>';
      }).join("");
    } catch (ex) {
      cont.innerHTML = '<p class="aviso-sql aviso-sql--inline">' + esc(ex && ex.code === "SIN_SQL"
        ? "Para crear cuentas de aliados, ejecuta supabase-mejoras.sql en Supabase."
        : "No se pudieron cargar los aliados: " + (ex && ex.message ? ex.message : "error")) + "</p>";
    }
  }

  async function asignarAliadoUI(boton) {
    var email = ($("#ajAliadoEmail").value || "").trim();
    var rid = $("#ajAliadoRest").value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast("Escribe un correo válido", true); return; }
    if (!rid) { toast("Elige el restaurante del aliado", true); return; }
    var texto = boton.textContent;
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span>Dando acceso…';
    try {
      try {
        await window.Store.asignarAliado(email, rid);
      } catch (ex) {
        // Si el restaurante solo estaba en data.js, lo subimos a la nube y reintentamos.
        if (!/no está guardado/i.test(ex && ex.message || "")) throw ex;
        var r = restaurantes.filter(function (x) { return x.id === rid; })[0];
        if (typeof r.orden !== "number") r.orden = restaurantes.indexOf(r);
        await window.Store.guardar(r);
        await window.Store.asignarAliado(email, rid);
      }
      toast("Listo: " + email + " ya puede editar su restaurante ✓");
      $("#ajAliadoEmail").value = "";
      cargarAliados();
    } catch (ex) {
      toast(ex && ex.message ? ex.message : "No se pudo dar acceso", true);
    } finally {
      boton.disabled = false;
      boton.textContent = texto;
    }
  }

  async function quitarAliadoUI(email) {
    if (!confirm("¿Quitarle el acceso a " + email + "? Ya no podrá editar su restaurante.")) return;
    try {
      await window.Store.quitarAliado(email);
      toast("Acceso quitado");
      cargarAliados();
    } catch (ex) {
      toast(ex && ex.message ? ex.message : "No se pudo quitar", true);
    }
  }

  /* ------------------- Avisos de pedidos nuevos ------------------- */
  var LS_AVISOS = "ghost_admin_avisos";
  var avisos = { on: false, vistos: null, timer: null, ctx: null, tituloBase: document.title };
  try { avisos.on = localStorage.getItem(LS_AVISOS) === "1"; } catch (e) { /* nada */ }

  function pintarBotonAvisos() {
    var b = $("#btnAvisos");
    if (!b) return;
    b.hidden = false;
    b.textContent = avisos.on ? "🔔 Avisos activos" : "🔕 Activar avisos";
    b.classList.toggle("btn-avisos--on", avisos.on);
  }

  function iniciarAvisos() {
    pintarBotonAvisos();
    sondearPedidos();
    if (avisos.timer) clearInterval(avisos.timer);
    avisos.timer = setInterval(sondearPedidos, 20000);
    window.addEventListener("focus", function () { document.title = avisos.tituloBase; });
  }

  function alternarAvisos() {
    avisos.on = !avisos.on;
    try { localStorage.setItem(LS_AVISOS, avisos.on ? "1" : "0"); } catch (e) { /* nada */ }
    if (avisos.on) {
      sonar(); // el primer sonido necesita un toque del usuario para desbloquear el audio
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
      toast("Te avisaremos con sonido cuando llegue un pedido. Deja esta pestaña abierta.");
    }
    pintarBotonAvisos();
  }

  // "Ding-dong" generado (no necesita archivos de audio).
  function sonar() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      avisos.ctx = avisos.ctx || new AC();
      var ctx = avisos.ctx;
      if (ctx.state === "suspended") ctx.resume();
      [[880, 0], [660, 0.22], [880, 0.6], [660, 0.82]].forEach(function (n) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, ctx.currentTime + n[1]);
        g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + n[1] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n[1] + 0.35);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + n[1]); o.stop(ctx.currentTime + n[1] + 0.4);
      });
    } catch (e) { /* sin audio */ }
  }

  async function sondearPedidos() {
    var lista;
    try { lista = await window.Store.listarPedidos("recibido", null, "id, codigo, cliente, total, creado_en"); } catch (e) { return; }
    var badge = $("#badgePedidos");
    if (badge) { badge.hidden = !lista.length; badge.textContent = String(lista.length); }
    var ids = {};
    lista.forEach(function (p) { ids[p.id] = true; });
    if (avisos.vistos) {
      var nuevos = lista.filter(function (p) { return !avisos.vistos[p.id]; });
      if (nuevos.length) {
        var txt = nuevos.length === 1
          ? "Pedido nuevo " + (nuevos[0].codigo || "") + " · " + ((nuevos[0].cliente || {}).nombre || "") + " · " + money(nuevos[0].total || 0)
          : nuevos.length + " pedidos nuevos";
        toast("🛎️ " + txt);
        if (avisos.on) {
          sonar();
          if (document.hidden || !document.hasFocus()) document.title = "(" + nuevos.length + ") 🛎️ Pedido nuevo · Ghost";
          if ("Notification" in window && Notification.permission === "granted") {
            try { new Notification("🛎️ Servicios Ghost", { body: txt, icon: "assets/icon-192.png", tag: "pedido-nuevo" }); }
            catch (e) { /* algunos celulares no permiten notificaciones desde la página */ }
          }
        }
        var tabP = $("#tabPedidos");
        if (tabP && !tabP.hidden) recargarPedidos();
      }
    }
    avisos.vistos = ids;
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
