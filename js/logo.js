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

  var ZMIN = 0.2, ZMAX = 4;
  // ¿El navegador entiende las medidas del marco (cqw/cqh)? Los celulares con
  // navegador viejo no: ahí usamos una forma más simple que siempre se ve.
  var MEDIDAS_EXACTAS = !!(typeof window !== "undefined" && window.CSS && CSS.supports &&
    CSS.supports("width", "calc(1cqw + 1cqh)") && CSS.supports("container-type", "size"));

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
    return { modo: "foto", pos: null };
  }

  function marco(o) {
    return { z: num(o && o.z, 1, ZMIN, ZMAX), x: num(o && o.x, 50, 0, 100), y: num(o && o.y, 50, 0, 100) };
  }

  /* pos = { z, x, y }  → marco de la carta (recuadro ancho)
           l: { z, x, y } → marco de la lista (tarjeta); si falta, usa el de la carta
           b: "#rrggbb"   → color de fondo (se ve si la foto es más pequeña que el marco)
     z = 1 → la foto llena justo el marco; menos de 1 → se ve completa y más pequeña. */
  function normalizar(o) {
    var p = marco(o);
    if (o.l && typeof o.l === "object") p.l = marco(o.l);
    p.b = esColor(o.b) ? o.b : null;
    var a = Number(o.a);
    p.a = isFinite(a) && a > 0.05 && a < 20 ? a : null; // ancho/alto de la foto
    return { modo: "foto", pos: p };
  }

  // Lo que se guarda en la base (texto).
  function guardar(modo, pos) {
    if (!pos) return "foto";
    var p = normalizar(pos).pos;
    var r2 = function (m) { return { z: Math.round(m.z * 100) / 100, x: Math.round(m.x), y: Math.round(m.y) }; };
    var o = r2(p);
    o.m = "foto";
    if (p.l) o.l = r2(p.l);
    if (p.b) o.b = p.b;
    if (p.a) o.a = Math.round(p.a * 1000) / 1000;
    var neutro = function (m) { return !m || (m.z === 1 && m.x === 50 && m.y === 50); };
    if (neutro(o) && neutro(o.l) && !o.b) return "foto";
    return JSON.stringify(o);
  }

  // Ajustes del marco que se va a pintar.
  function ajustesDe(r, mosaico) {
    var p = r.logoPos;
    if (!p) return { z: 1, x: 50, y: 50 };
    return marco(mosaico && p.l ? p.l : p);
  }

  /* Contenido de la portada: devuelve { estilo, html } para meter dentro de
     cualquier recuadro (tarjeta, cabecera de la carta, panel…).
     opciones.mosaico → es la tarjeta de la lista (usa su propio ajuste).
     La foto se agranda o se achica desde el punto (x, y): con 100% llena justo
     el marco; con menos se ve completa y el resto toma el color de fondo. */
  function portada(r, opciones) {
    opciones = opciones || {};
    if (!r || !r.logo) return null;
    var m = ajustesDe(r, opciones.mosaico);
    var pos = r.logoPos || {};
    var fondo = esColor(pos.b) ? pos.b : "#111111";
    var imgEstilo;
    if (pos.a && MEDIDAS_EXACTAS) {
      // Medidas exactas (ver .lg-img--exacta en style.css): la foto puede ser
      // más grande o más pequeña que el marco y se ve entera, sin recortes raros.
      imgEstilo = "--a:" + pos.a + ";--z:" + m.z + ";--x:" + m.x + ";--y:" + m.y;
      return {
        estilo: "background-color:" + fondo,
        html: '<img class="lg-img lg-img--exacta" src="' + esc(r.logo) + '" alt="" ' + (opciones.sinLazy ? "" : 'loading="lazy" ') +
          'decoding="async" draggable="false" style="' + imgEstilo + '" />',
      };
    }
    // Sin la forma de la foto (datos viejos) o navegador viejo: llenar el marco;
    // si el negocio la achicó, se muestra completa.
    var z = m.z;
    imgEstilo = (z < 1 ? "object-fit:contain;object-position:50% 50%;" :
      "object-fit:cover;object-position:" + m.x + "% " + m.y + "%;" +
      (z !== 1 ? "transform:scale(" + z + ");transform-origin:" + m.x + "% " + m.y + "%;" : ""));
    return {
      estilo: "background-color:" + fondo,
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

  window.LogoGhost = { leer: leer, guardar: guardar, portada: portada, recuadro: recuadro, ajustesDe: ajustesDe, ZMIN: ZMIN, ZMAX: ZMAX };
})();
