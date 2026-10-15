/* =====================================================================
   Servicios Ghost — Service worker (app instalable)
   ---------------------------------------------------------------------
   Estrategia "primero la red": el cliente SIEMPRE ve la carta y los
   precios más recientes. La copia guardada solo se usa si no hay señal,
   para que la app abra igual y se pueda mirar la carta.
   No toca nada de otros dominios (Supabase, WhatsApp, fuentes).
   ===================================================================== */
var CACHE = "ghost-v1";
var BASICOS = [
  "./",
  "index.html",
  "css/style.css",
  "js/data.js",
  "js/supabase-config.js",
  "js/store.js",
  "js/app.js",
  "assets/logo-sm.png",
  "assets/icon-192.png",
  "manifest.webmanifest",
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(BASICOS); })
      .catch(function () { /* si algo falla, igual se instala */ })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, fuentes, CDN: directo a la red

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === "basic") {
        var copia = res.clone();
        // Se guarda sin "?t=..." para no llenar el teléfono de copias.
        var clave = url.origin + url.pathname;
        caches.open(CACHE).then(function (c) { c.put(clave, copia); });
      }
      return res;
    }).catch(function () {
      return caches.match(url.origin + url.pathname).then(function (r) {
        if (r) return r;
        if (req.mode !== "navigate") return new Response("", { status: 503, statusText: "Sin conexión" });
        return caches.match(new URL("./", self.location).href).then(function (inicio) {
          return inicio || new Response(
            "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>" +
            "<body style='background:#0b0b0b;color:#f2f2f2;font-family:sans-serif;text-align:center;padding:40px'>" +
            "<h1>👻 Sin conexión</h1><p>Revisa tu señal y vuelve a intentar.</p></body>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } });
        });
      });
    })
  );
});
