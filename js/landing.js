/* =====================================================================
   Servicios Ghost — Landing page
   ===================================================================== */
(function () {
  "use strict";

  /* ----- Configuración ----- */
  var WHATSAPP = "573214286626"; // número en formato internacional sin +
  var NEGOCIO = "Servicios Ghost";

  function waLink(mensaje) {
    return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(mensaje);
  }

  /* ----- Íconos SVG (se ven igual en todos los dispositivos) ----- */
  var ICON = {
    mercado: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    comida: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16"/><path d="M5 10a7 7 0 0 1 14 0"/><path d="M3 14h18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3Z"/><path d="M5 20h14"/></svg>',
    antojo: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.5 11a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg>',
    consignacion: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    paquete: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    negocio: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9 4 4h16l1 5"/><path d="M4 9v11h16V9"/><path d="M3 9h18"/><path d="M9 20v-6h6v6"/></svg>',
  };

  /* ----- Servicios (según el mockup) ----- */
  // "link" opcional: si el servicio tiene página propia, se abre esa.
  var SERVICIOS = [
    { icon: ICON.mercado, nombre: "Mercados", desc: "Tu lista, sin filas.", link: "tienda.html" },
    { icon: ICON.comida, nombre: "Comidas rápidas", desc: "Sabor en cada entrega.", link: "tienda.html" },
    { icon: ICON.antojo, nombre: "Antojos", desc: "Lo que se antoja, se lleva.", link: "tienda.html" },
    { icon: ICON.consignacion, nombre: "Consignaciones", desc: "Tus envíos, en buenas manos." },
    { icon: ICON.paquete, nombre: "Paquetes", desc: "Recoge y entrega sin complicaciones." },
    { icon: ICON.negocio, nombre: "Negocios", desc: "Tu aliado en el crecimiento." },
  ];

  function esc(v) {
    return String(v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function renderServicios() {
    var grid = document.getElementById("servicesGrid");
    if (!grid) return;
    var html = "";
    for (var i = 0; i < SERVICIOS.length; i++) {
      var s = SERVICIOS[i];
      var href = s.link
        ? s.link
        : waLink("Hola " + NEGOCIO + ", quiero información sobre el servicio de " + s.nombre + ".");
      var target = s.link ? "" : ' target="_blank" rel="noopener"';
      // s.icon es SVG definido por nosotros (contenido confiable, no de usuario).
      html +=
        '<a class="service" href="' + esc(href) + '"' + target + '>' +
          '<div class="service__icon" aria-hidden="true">' + s.icon + "</div>" +
          '<div class="service__name">' + esc(s.nombre) + "</div>" +
          '<div class="service__desc">' + esc(s.desc) + "</div>" +
        "</a>";
    }
    grid.innerHTML = html;
  }

  /* ----- Enlaces a WhatsApp ----- */
  function conectarWhatsApp() {
    var genericos = document.querySelectorAll("[data-wa]");
    genericos.forEach(function (a) {
      a.setAttribute("href", waLink("Hola " + NEGOCIO + ", quiero pedir un domicilio."));
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    });
    var negocio = document.querySelectorAll("[data-wa-negocio]");
    negocio.forEach(function (a) {
      a.setAttribute("href", waLink("Hola " + NEGOCIO + ", tengo un negocio y quiero ser aliado."));
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    });
  }

  /* ----- Menú móvil ----- */
  function conectarMenu() {
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      var abierto = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", abierto ? "true" : "false");
      toggle.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    });

    // Cerrar al tocar un enlace
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ----- Header con fondo al hacer scroll ----- */
  function conectarScroll() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    function onScroll() {
      if (window.scrollY > 20) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ----- Arranque ----- */
  renderServicios();
  conectarWhatsApp();
  conectarMenu();
  conectarScroll();
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
