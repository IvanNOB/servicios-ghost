/* =====================================================================
   Servicios Ghost — Contador de visitas anónimo
   ---------------------------------------------------------------------
   Cuenta las entradas a la tienda para que el administrador las vea en
   el panel. El cliente NO ve nada: ni contador, ni aviso, ni banner.

   Privacidad:
   - No se guarda IP, nombre, teléfono ni correo.
   - Solo un identificador aleatorio en el navegador (localStorage) para
     saber cuántas personas distintas entraron, y el tipo de dispositivo.
   - Una visita por sesión (no se cuenta cada recarga).
   - Si el administrador marca "no contar mis visitas", no se envía nada.
   ===================================================================== */
(function () {
  "use strict";

  var LS_ID = "ghost-visitante";
  var LS_OFF = "ghost-sin-visitas";
  var SS_VISTO = "ghost-visita-contada";

  function aleatorio() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) { /* navegador viejo */ }
    return "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  function guardar(clave, valor) {
    try { localStorage.setItem(clave, valor); } catch (e) { /* modo privado */ }
  }
  function leer(clave) {
    try { return localStorage.getItem(clave); } catch (e) { return null; }
  }

  function enviar() {
    // El administrador puede excluir su propio navegador desde el panel.
    if (leer(LS_OFF) === "1") return;

    var ua = navigator.userAgent || "";
    if (navigator.webdriver) return;
    if (/bot|crawl|spider|headless|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|preview|monitor/i.test(ua)) return;

    // Una sola vez por sesión: recargar no infla el número.
    try {
      if (sessionStorage.getItem(SS_VISTO) === "1") return;
      sessionStorage.setItem(SS_VISTO, "1");
    } catch (e) { /* sin sessionStorage: se envía igual (el servidor filtra 20 s) */ }

    var id = leer(LS_ID);
    if (!id) { id = aleatorio(); guardar(LS_ID, id); }

    var ref = "";
    try {
      if (document.referrer && document.referrer.indexOf(location.hostname) === -1) {
        ref = new URL(document.referrer).hostname.slice(0, 120);
      }
    } catch (e) { /* referrer raro */ }

    var disp = "escritorio";
    try {
      if (window.matchMedia && matchMedia("(max-width: 760px)").matches) disp = "movil";
    } catch (e) { /* sin matchMedia */ }

    if (!window.Store || typeof window.Store.registrarVisita !== "function") return;
    // Silencioso: si falla (sin internet, SQL sin ejecutar), no pasa nada.
    var envio = window.Store.registrarVisita({
      visita: id,
      pagina: "tienda",
      ref: ref,
      dispositivo: disp,
    });
    if (envio && typeof envio.catch === "function") envio.catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(enviar, 900);
  else window.addEventListener("load", function () { setTimeout(enviar, 900); });
})();
