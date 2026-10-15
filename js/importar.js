/* =====================================================================
   Servicios Ghost — Importador automático de cartas (texto → datos)
   ---------------------------------------------------------------------
   Convierte el texto pegado (el que devuelve ChatGPT con el prompt de
   abajo, o una lista sencilla) en la estructura de la app:
     { nombre, cat, tiempo, abierto, desc, carta: [{ sec, items }], almuerzo }

   Formatos que entiende:
     NOMBRE: / CATEGORÍA: / TIEMPO: / ABIERTO: / DESCRIPCIÓN:
     [Sección]            o  ## Sección  o  SECCIÓN: Bebidas
     Plato | descripción | 15000
     Plato || 15000
     Plato - 15000        o  Plato ...... $15.000
     ALMUERZO: precio=12000 | desc=Incluye sopa y jugo
     Grupo: Proteína > Pollo, Res, Cerdo (agotado), Sin sopa (precio=10000)
   ===================================================================== */
(function (global) {
  "use strict";

  var PROMPT =
    "Eres mi asistente para digitalizar la carta de un restaurante. Te voy a dar una foto (o el texto) de un menú. " +
    "Extrae SOLO lo esencial y devuélvemelo en el formato de abajo, sin explicaciones ni texto extra.\n\n" +
    "REGLAS:\n" +
    "1. Devuelve ÚNICAMENTE el bloque de datos. Nada de introducciones ni comentarios.\n" +
    "2. Organiza los platos por SECCIONES entre corchetes, ej: [Hamburguesas].\n" +
    "3. Cada plato en una línea: Nombre | Descripción corta | Precio\n" +
    "   - Precio solo en números, sin $ ni puntos (ej: 16000).\n" +
    "   - Descripción breve (máx. 12 palabras). Si no hay, deja vacío: Nombre || Precio\n" +
    "   - Si un plato tiene varios tamaños, pon una línea por tamaño (ej: Pizza mediana | | 30000).\n" +
    "4. Si hay almuerzo del día con opciones, agrégalo al final así:\n" +
    "   ALMUERZO: precio=12000 | desc=Incluye sopa, principio y bebida\n" +
    "   Grupo: Proteína > Pollo, Res, Cerdo\n" +
    "   Grupo: Bebida > Jugo de mango, Lulo\n" +
    "   Si una opción cambia el precio: Sin sopa (precio=10000). Si está agotada: Lentejas (agotado)\n" +
    "5. No inventes platos ni precios. Si un precio no se ve, escribe ?.\n\n" +
    "FORMATO EXACTO:\n\n" +
    "NOMBRE: <nombre del restaurante>\n" +
    "CATEGORÍA: <ej. Pizza, Parrilla, Comida rápida>\n" +
    "TIEMPO: <ej. 30-45 min>\n" +
    "ABIERTO: sí\n\n" +
    "[Sección 1]\n" +
    "Plato uno | descripción breve | 16000\n" +
    "Plato dos | | 20000\n\n" +
    "[Sección 2]\n" +
    "Bebida | | 5000\n\n" +
    "Ahora espera a que te envíe la foto o el texto de la carta y responde solo con el bloque.";

  function limpiar(s) {
    return String(s || "")
      .replace(/\*\*|__|`/g, "")        // negritas / código de markdown
      .replace(/\u00a0/g, " ")
      .trim();
  }

  function sinTildes(s) {
    return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function slug(txt) {
    return sinTildes(txt).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";
  }

  // "15.000", "$15,000", "15000", "15 mil", "15k" -> 15000. "?" -> 0
  function precio(txt) {
    var s = sinTildes(limpiar(txt)).replace(/\s+/g, "");
    if (!s || s === "?") return 0;
    var n;
    if (/(mil|k)$/.test(s)) {
      // "15mil", "12,5k" → 15000, 12500
      n = Number(s.replace(/(mil|k)$/, "").replace(/[^0-9.,]/g, "").replace(",", ".")) * 1000;
    } else {
      // En pesos no hay decimales: puntos y comas son separadores de miles.
      n = Number(s.replace(/[^0-9]/g, ""));
    }
    return isFinite(n) ? Math.round(n) : 0;
  }

  // Divide por comas respetando paréntesis: "A, B (con sopa, grande), C"
  function dividirOpciones(txt) {
    var out = [], actual = "", nivel = 0;
    for (var i = 0; i < txt.length; i++) {
      var c = txt[i];
      if (c === "(") nivel++;
      if (c === ")") nivel = Math.max(0, nivel - 1);
      if ((c === "," || c === ";") && nivel === 0) { out.push(actual); actual = ""; continue; }
      actual += c;
    }
    out.push(actual);
    return out.map(limpiar).filter(Boolean);
  }

  // "Sin sopa (precio=10000)" / "Lentejas (agotado)" / "Completo (con sopa)"
  var RE_FLAG = /^\s*(agotado|precio\s*[=:]\s*\$?\s*[\d.,]+)(\s*,\s*(agotado|precio\s*[=:]\s*\$?\s*[\d.,]+))*\s*$/i;
  function parsearOpcion(txt) {
    var n = limpiar(txt), op = { n: "", agotado: false };
    var m;
    while ((m = n.match(/\(([^()]*)\)\s*$/)) && RE_FLAG.test(m[1])) {
      m[1].split(",").forEach(function (f) {
        f = f.trim();
        if (/^agotado$/i.test(f)) op.agotado = true;
        else { var p = precio(f.replace(/^precio\s*[=:]/i, "")); if (p > 0) op.precio = p; }
      });
      n = n.slice(0, m.index).trim();
    }
    op.n = n;
    return op;
  }

  // Una línea de grupo: "Grupo: Proteína > Pollo, Res" o "Proteína: Pollo, Res"
  function parsearLineaGrupo(linea) {
    var s = limpiar(linea).replace(/^[-•*]\s*/, "").replace(/^grupo\s*:\s*/i, "");
    var corte = s.indexOf(">");
    if (corte === -1) corte = s.indexOf(":");
    if (corte === -1) return null;
    var nombre = limpiar(s.slice(0, corte));
    var opciones = dividirOpciones(s.slice(corte + 1)).map(parsearOpcion).filter(function (o) { return o.n; });
    if (!nombre || !opciones.length) return null;
    return { nombre: nombre, tipo: "unico", opciones: opciones };
  }

  // Texto de opciones del almuerzo (una línea por grupo) → array de grupos.
  function parsearOpciones(texto) {
    return String(texto || "").split(/\r?\n/).map(parsearLineaGrupo).filter(Boolean);
  }

  // Grupos → texto editable (para la pestaña "Almuerzos del día").
  function opcionesATexto(grupos) {
    return (grupos || []).map(function (g) {
      return g.nombre + ": " + (g.opciones || []).map(function (o) {
        var flags = [];
        if (o.agotado) flags.push("agotado");
        if (o.precio) flags.push("precio=" + o.precio);
        return o.n + (flags.length ? " (" + flags.join(", ") + ")" : "");
      }).join(", ");
    }).join("\n");
  }

  // Parámetros de la línea ALMUERZO: "precio=12000 | desc=..." → objeto
  function parsearCabeceraAlmuerzo(resto, alm) {
    resto.split("|").forEach(function (parte) {
      var kv = parte.split("=");
      if (kv.length < 2) return;
      var k = sinTildes(kv[0]).trim(), v = limpiar(kv.slice(1).join("="));
      if (k === "precio") alm.precio = precio(v);
      else if (k === "desc" || k === "descripcion") alm.desc = v;
      else if (k === "titulo") alm.titulo = v;
    });
  }

  var CAMPOS = {
    nombre: "nombre", restaurante: "nombre",
    categoria: "cat", tiempo: "tiempo", abierto: "abierto",
    descripcion: "desc", desc: "desc",
  };

  // Texto completo → { datos, avisos }
  function parsearCarta(texto, prefijoId) {
    var datos = { carta: [] };
    var avisos = [];
    var seccion = null;
    var enAlmuerzo = false;
    var usados = {};
    var pref = slug(prefijoId || "p").slice(0, 12).replace(/-+$/, "");

    function nuevaSeccion(nombre) {
      seccion = { sec: limpiar(nombre) || "Carta", items: [] };
      datos.carta.push(seccion);
      enAlmuerzo = false;
    }
    function idUnico(n) {
      var base = pref + "-" + slug(n), id = base, k = 2;
      while (usados[id]) id = base + "-" + (k++);
      usados[id] = true;
      return id;
    }
    function agregarPlato(n, d, p, linea) {
      n = limpiar(n).replace(/^[-•*]\s*/, "");
      if (!n) return;
      if (!seccion) nuevaSeccion("Carta");
      if (!p) avisos.push("Sin precio: " + n);
      seccion.items.push({ id: idUnico(n), n: n, d: limpiar(d), p: p, agotado: false });
    }

    var lineas = String(texto || "").split(/\r?\n/);
    for (var i = 0; i < lineas.length; i++) {
      var raw = lineas[i];
      var l = limpiar(raw);
      if (!l || /^```/.test(l) || /^-{3,}$/.test(l)) continue;

      // Inicio del bloque de almuerzo: "ALMUERZO: precio=12000 | desc=..."
      var ma = l.match(/^almuerzo(?: del dia| del día)?\s*:?\s*(.*)$/i);
      if (ma && (/^\s*$/.test(ma[1]) || /=/.test(ma[1]) || /^\(/.test(ma[1]))) {
        enAlmuerzo = true;
        datos.almuerzo = datos.almuerzo || { activo: true, titulo: "Almuerzo del día", desc: "", precio: 0, grupos: [] };
        parsearCabeceraAlmuerzo(ma[1], datos.almuerzo);
        continue;
      }

      // Campo "CLAVE: valor"
      var mc = l.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ ]{3,20})\s*:\s*(.*)$/);
      if (mc && l.indexOf("|") === -1) {
        var clave = sinTildes(mc[1]).trim();
        if (CAMPOS[clave]) {
          var v = limpiar(mc[2]);
          if (CAMPOS[clave] === "abierto") datos.abierto = !/^(no|cerrado|false)/i.test(sinTildes(v));
          else datos[CAMPOS[clave]] = v;
          continue;
        }
        if (clave === "seccion") { nuevaSeccion(mc[2]); continue; }
      }

      // Dentro del bloque ALMUERZO
      if (enAlmuerzo) {
        if (/^precio\s*=|^desc\s*=/i.test(l)) { parsearCabeceraAlmuerzo(l, datos.almuerzo); continue; }
        var g = parsearLineaGrupo(l);
        if (g) { datos.almuerzo.grupos.push(g); continue; }
      }

      // Sección: [Nombre]  /  ## Nombre  /  "Nombre:" sin precio
      var ms = l.match(/^\[(.+)\]$/) || l.match(/^#{1,4}\s*(.+)$/);
      if (ms) { nuevaSeccion(ms[1]); continue; }

      // Plato con barras: Nombre | desc | precio
      if (l.indexOf("|") !== -1) {
        var partes = l.split("|").map(limpiar);
        var nombre = partes[0];
        var p = precio(partes[partes.length - 1]);
        var desc = partes.length > 2 ? partes.slice(1, -1).filter(Boolean).join(" · ") : "";
        // Si la "última" no era precio (p. ej. "Nombre | desc"), la tomamos como descripción.
        if (!p && partes.length === 2 && !/^\s*\??\s*$/.test(partes[1])) desc = partes[1];
        agregarPlato(nombre, desc, p, raw);
        continue;
      }

      // Plato sencillo: "Nombre - 15000", "Nombre ..... $15.000", "Nombre $15.000"
      var mp = l.match(/^(.*?)[\s.\-–—:]*\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,7}|\d+\s*(?:mil|k))\s*$/i);
      if (mp && limpiar(mp[1])) {
        var resto = limpiar(mp[1]);
        var d2 = "";
        var paren = resto.match(/^(.*?)\s*\((.+)\)$/);
        if (paren) { resto = paren[1]; d2 = paren[2]; }
        agregarPlato(resto, d2, precio(mp[2]), raw);
        continue;
      }

      // Línea sin precio que termina en ":" → sección
      if (/:$/.test(l)) { nuevaSeccion(l.slice(0, -1)); continue; }

      // Texto suelto "largo" (parece descripción) debajo de un plato sin descripción
      var ultimo = seccion && seccion.items.length ? seccion.items[seccion.items.length - 1] : null;
      if (ultimo && !ultimo.d && (l.length > 25 || l.indexOf(",") !== -1)) {
        ultimo.d = l;
        continue;
      }
      // Si no hay platos aún, una línea suelta la tomamos como sección.
      if (!seccion || !seccion.items.length) { nuevaSeccion(l); continue; }
      // Línea corta sin precio → plato sin precio (se avisa para revisarlo)
      agregarPlato(l, "", 0, raw);
    }

    // Quitar secciones vacías
    datos.carta = datos.carta.filter(function (s) { return s.items.length; });
    return { datos: datos, avisos: avisos };
  }

  global.Importar = {
    PROMPT: PROMPT,
    parsearCarta: parsearCarta,
    parsearOpciones: parsearOpciones,
    opcionesATexto: opcionesATexto,
    precio: precio,
  };
})(typeof window !== "undefined" ? window : globalThis);
