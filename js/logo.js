/* =====================================================================
   Servicios Ghost — Foto de perfil (logo) de cada negocio
   ---------------------------------------------------------------------
   Cada negocio decide cómo se ve su logo: completo o llenando el espacio,
   el tamaño (zoom), la posición y el fondo. Se guarda en la columna
   "logo_ajuste" de Supabase:
     - "logo" / "foto"            → formato antiguo (sin ajustes)
     - {"m":"logo","z":1.2,...}   → con ajustes (texto JSON)
   La tienda y el panel usan estas mismas funciones, así lo que el negocio
   ve al editar es exactamente lo que ve el cliente.
   ===================================================================== */
(function () {
  "use strict";

  var FONDOS_FIJOS = { blanco: "#ffffff", negro: "#000000" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(v, def, min, max) {
    var n = Number(v);
    if (!isFinite(n)) return def;
    return Math.min(max, Math.max(min, n));
  }
  function esColor(c) { return typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c); }

  // Lee lo guardado en la base (texto) → { modo, pos }.
  function leer(valor) {
    if (valor && typeof valor === "object") return normalizar(valor);
    var t = String(valor || "").trim();
    if (t.charAt(0) === "{") {
      try { return normalizar(JSON.parse(t)); } catch (e) { /* formato raro: usamos el modo por defecto */ }
    }
    return { modo: t === "logo" ? "logo" : "foto", pos: null };
  }

  function normalizar(o) {
    var modo = o.m === "logo" || o.modo === "logo" ? "logo" : "foto";
    var b = o.b;
    if (!(b === "blur" || b === "blanco" || b === "negro" || esColor(b))) b = null;
    return {
      modo: modo,
      pos: { z: num(o.z, 1, 1, 4), x: num(o.x, 50, 0, 100), y: num(o.y, 50, 0, 100), b: b },
    };
  }

  // Lo que se guarda en la base (texto).
  function guardar(modo, pos) {
    modo = modo === "logo" ? "logo" : "foto";
    if (!pos) return modo;
    var p = normalizar({ m: modo, z: pos.z, x: pos.x, y: pos.y, b: pos.b }).pos;
    if (p.z === 1 && p.x === 50 && p.y === 50) return "foto";
    return JSON.stringify({ m: "foto", z: Math.round(p.z * 100) / 100, x: Math.round(p.x), y: Math.round(p.y) });
  }

  // Color de fondo detrás del logo.
  function colorFondo(r, pos) {
    var b = pos && pos.b;
    if (b && FONDOS_FIJOS[b]) return FONDOS_FIJOS[b];
    if (esColor(b)) return b;
    if (r.logoAjuste === "logo") return esColor(r.color) ? r.color : "#1e1e1e";
    return "#111111";
  }

  /* Contenido de la portada: devuelve { estilo, html } para meter dentro de
     cualquier recuadro (tarjeta, cabecera de la carta, panel…).
     La foto SIEMPRE llena todo el recuadro (sin franjas vacías). El negocio
     elige qué parte se ve: acerca (zoom ≥ 100%) y mueve la foto.
     Por qué no deja huecos: "object-fit: cover" ya cubre el recuadro, y
     agrandar (scale ≥ 1) desde un punto que está dentro del recuadro sigue
     cubriéndolo entero. */
  function portada(r, opciones) {
    opciones = opciones || {};
    if (!r || !r.logo) return null;
    var p = r.logoPos || { z: 1, x: 50, y: 50 };
    var z = Math.max(1, Math.min(4, Number(p.z) || 1));
    var x = num(p.x, 50, 0, 100), y = num(p.y, 50, 0, 100);
    var imgEstilo = "object-fit:cover;object-position:" + x + "% " + y + "%;" +
      (z !== 1 ? "transform:scale(" + z + ");transform-origin:" + x + "% " + y + "%;" : "");
    return {
      estilo: "background-color:#111",
      html: '<img class="lg-img" src="' + esc(r.logo) + '" alt="" ' + (opciones.sinLazy ? "" : 'loading="lazy" ') +
        'decoding="async" draggable="false" style="' + imgEstilo + '" />',
    };
  }

  // Atajo: recuadro completo con la clase indicada.
  function recuadro(r, clase, opciones) {
    var c = portada(r, opciones);
    if (!c) return "";
    return '<div class="' + clase + ' lg" style="' + c.estilo + '">' + c.html + "</div>";
  }

  window.LogoGhost = { leer: leer, guardar: guardar, portada: portada, recuadro: recuadro, colorFondo: colorFondo };
})();
