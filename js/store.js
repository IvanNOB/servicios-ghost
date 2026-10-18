/* =====================================================================
   Servicios Ghost — Capa de datos (store)
   ---------------------------------------------------------------------
   Expone window.Store con todo lo que lee/escribe la web.

   - Si Supabase está configurado (supabase-config.js) y responde, los
     datos vienen de la nube.
   - Si no, usa los datos de data.js como respaldo, para que la web nunca
     se quede en blanco.
   - Todo lo "nuevo" (ajustes, seguimiento, aliados) funciona aunque aún
     no se haya ejecutado supabase-mejoras.sql: simplemente se desactiva
     y la web sigue andando como antes.
   ===================================================================== */
(function () {
  "use strict";

  // ¿Hay credenciales de Supabase y la librería cargada?
  function supabaseDisponible() {
    return (
      typeof SUPABASE_URL === "string" && SUPABASE_URL &&
      typeof SUPABASE_ANON_KEY === "string" && SUPABASE_ANON_KEY &&
      typeof window.supabase !== "undefined" &&
      typeof window.supabase.createClient === "function"
    );
  }

  // Cliente único de Supabase (o null si no está configurado).
  var _client = null;
  function client() {
    if (_client) return _client;
    if (!supabaseDisponible()) return null;
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _client;
  }

  // Columnas que la base de datos dijo no tener (para avisar en el admin).
  var columnasFaltantes = {};
  var columnasTabla = null; // columnas vistas al leer restaurantes

  // ¿El error de Supabase significa "esa función / tabla / columna no existe"?
  function esNoExiste(err) {
    if (!err) return false;
    var code = String(err.code || "");
    var msg = String(err.message || "");
    return code === "PGRST202" || code === "PGRST205" || code === "PGRST204" ||
      code === "42883" || code === "42P01" || code === "42703" ||
      /does not exist|Could not find the/i.test(msg);
  }

  // Convierte una fila de la tabla "restaurantes" al formato de la app.
  function filaARestaurante(row) {
    return {
      _nube: true,  // viene de Supabase (no de data.js)
      id: row.id,
      nombre: row.nombre,
      cat: row.cat,
      tiempo: row.tiempo,
      abierto: !!row.abierto,
      color: row.color || "#3b82f6",
      desc: row.descripcion || "",
      logo: row.logo || "",
      logoAjuste: leerLogo(row.logo_ajuste).modo,
      logoPos: leerLogo(row.logo_ajuste).pos,
      visible: row.visible !== false,
      promo: normalizarPromo(row.promo),
      whatsapp: normalizarWhatsapp(row.whatsapp),
      carta: Array.isArray(row.carta) ? row.carta : [],
      almuerzo: row.almuerzo || null,
      desayuno: row.desayuno || null,
      horario: normalizarHorario(row.horario),
      orden: typeof row.orden === "number" ? row.orden : 0,
    };
  }

  // Lee todos los restaurantes. Combina Supabase + data.js: la nube manda y
  // se AÑADEN los de data.js cuyo id aún no exista en Supabase.
  async function listar() {
    var base = (typeof RESTAURANTES !== "undefined" ? RESTAURANTES : []).slice();
    var sb = client();
    if (!sb) return base;

    try {
      var res = await sb
        .from("restaurantes")
        .select("*")
        .order("orden", { ascending: true })
        .order("nombre", { ascending: true });
      if (res.error) throw res.error;
      // Qué columnas tiene la tabla (para avisar en el panel si falta alguna nueva).
      if (res.data && res.data[0]) columnasTabla = Object.keys(res.data[0]);
      var nube = (res.data || []).map(filaARestaurante);
      quitarIlustraciones(nube);
      var idsNube = {};
      for (var i = 0; i < nube.length; i++) idsNube[nube[i].id] = true;
      var faltantes = base.filter(function (r) { return !idsNube[r.id]; });
      return nube.concat(faltantes);
    } catch (e) {
      console.warn("Supabase no respondió, uso data.js:", e && e.message);
      return base;
    }
  }

  // Las imágenes ilustrativas (assets/platos/…) ya no existen: si alguna quedó
  // guardada en un plato, se quita para que no salga una imagen rota.
  function quitarIlustraciones(lista) {
    lista.forEach(function (r) {
      (r.carta || []).forEach(function (s) {
        (s.items || []).forEach(function (it) { if (/^assets\/platos\//.test(String(it.foto || ""))) delete it.foto; });
      });
    });
  }

  // Ajustes de la foto de perfil (ver js/logo.js).
  function leerLogo(v) {
    if (window.LogoGhost) return LogoGhost.leer(v);
    return { modo: v === "logo" ? "logo" : "foto", pos: null };
  }

  /* ----------------------- Normalizadores -------------------------- */

  function normalizarOpciones(grupos) {
    return grupos.map(function (g) {
      return {
        nombre: g && g.nombre ? String(g.nombre) : "Opción",
        opciones: Array.isArray(g && g.opciones) ? g.opciones.map(function (op) {
          var o = { n: String(op.n || ""), agotado: !!op.agotado };
          if (Number(op.precio) > 0) o.precio = Number(op.precio);
          return o;
        }) : [],
      };
    });
  }

  // Carta: array de secciones con items válidos (conserva opciones y foto).
  function normalizarCarta(carta) {
    if (!Array.isArray(carta)) return [];
    return carta.map(function (sec) {
      var salida = {
        sec: (sec && sec.sec ? String(sec.sec) : "Sección"),
        items: Array.isArray(sec && sec.items) ? sec.items.map(function (it) {
          var plato = {
            id: it.id || (String(it.n || "plato").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" +
                 Math.random().toString(36).slice(2, 6)),
            n: String(it.n || ""),
            d: String(it.d || ""),
            p: Number(it.p) || 0,
            agotado: !!it.agotado,
          };
          if (it.foto) plato.foto = String(it.foto);
          // Mensaje del negocio en el producto ("🔥 El más pedido"), que puede apagar sin borrarlo.
          if (it.msg && String(it.msg.texto || "").trim()) plato.msg = { texto: String(it.msg.texto).trim().slice(0, 60), mostrar: it.msg.mostrar !== false };
          // Mensaje en vaso o tarjeta: solo en los productos donde el negocio lo activa.
          if (it.ded && Number(it.ded.max) > 0) plato.ded = { max: Math.min(500, Math.max(5, Math.round(Number(it.ded.max)))) };
          if (Array.isArray(it.opciones) && it.opciones.length) plato.opciones = normalizarOpciones(it.opciones);
          return plato;
        }) : [],
      };
      // Adiciones de la sección (queso extra, tocineta…): el cliente marca las que quiera.
      var adic = normalizarAdiciones(sec && sec.adiciones);
      if (adic.length) salida.adiciones = adic;
      return salida;
    });
  }

  function normalizarAdiciones(lista) {
    if (!Array.isArray(lista)) return [];
    return lista.map(function (a) {
      var o = { n: String((a && a.n) || "").trim(), precio: Math.max(0, Number(a && a.precio) || 0) };
      if (a && a.agotado) o.agotado = true;
      return o;
    }).filter(function (a) { return a.n; });
  }

  // WhatsApp del negocio: solo números, con el 57 de Colombia ("321 428 6626" → "573214286626").
  function normalizarWhatsapp(v) {
    var d = String(v || "").replace(/\D/g, "");
    if (d.length === 10 && d.charAt(0) === "3") d = "57" + d;
    return d.length >= 11 && d.length <= 15 ? d : "";
  }

  // Promoción propia del negocio: { texto, hasta: "YYYY-MM-DD" | "" } o null.
  function normalizarPromo(p) {
    if (!p || typeof p !== "object" || !String(p.texto || "").trim()) return null;
    return { texto: String(p.texto).trim().slice(0, 40), hasta: /^\d{4}-\d{2}-\d{2}$/.test(p.hasta || "") ? p.hasta : "" };
  }

  // Almuerzo del día (o null).
  function normalizarAlmuerzo(a) {
    if (!a || typeof a !== "object") return null;
    return {
      activo: !!a.activo,
      titulo: a.titulo ? String(a.titulo) : "Almuerzo del día",
      desc: a.desc ? String(a.desc) : "",
      precio: Number(a.precio) || 0,
      fecha: a.fecha ? String(a.fecha) : "",
      foto: a.foto ? String(a.foto) : "",
      grupos: Array.isArray(a.grupos) ? a.grupos.map(function (g) {
        var grupo = {
          nombre: g && g.nombre ? String(g.nombre) : "Opciones",
          tipo: g && g.tipo ? String(g.tipo) : "unico",
          opciones: Array.isArray(g && g.opciones) ? g.opciones.map(function (op) {
            var o = { n: String(op.n || ""), agotado: !!op.agotado };
            if (Number(op.precio) > 0) o.precio = Number(op.precio);
            return o;
          }) : [],
        };
        if (g && g.mostrarSi) grupo.mostrarSi = g.mostrarSi;
        if (g && g.opcional) grupo.opcional = true;
        if (g && g.obligatorio) grupo.obligatorio = true;
        return grupo;
      }) : [],
    };
  }

  // Horario: { lun: {abre:"11:00", cierra:"22:00"} | null, ..., dom }.
  // Devuelve null si no hay ningún día configurado.
  var DIAS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
  var RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
  function normalizarHorario(h) {
    if (!h || typeof h !== "object") return null;
    var out = {}, alguno = false;
    DIAS.forEach(function (d) {
      var x = h[d];
      if (x && RE_HORA.test(x.abre || "") && RE_HORA.test(x.cierra || "")) {
        out[d] = { abre: x.abre, cierra: x.cierra };
        alguno = true;
      } else {
        out[d] = null;
      }
    });
    return alguno ? out : null;
  }

  /* ---------------- Operaciones de administración ----------------- */

  // Escribe una fila y, si la base de datos no tiene alguna columna (porque
  // aún no se ejecutó el SQL de mejoras), la quita y reintenta. Así guardar
  // NUNCA falla por una columna nueva.
  async function escribirResiliente(hacer, fila) {
    for (var intento = 0; intento < 4; intento++) {
      var res = await hacer(fila);
      if (!res.error) return res;
      var m = String(res.error.message || "").match(/Could not find the '([^']+)' column/i) ||
              String(res.error.message || "").match(/column "?([a-z_]+)"? .*does not exist/i);
      if (m && m[1] in fila) {
        columnasFaltantes[m[1]] = true;
        fila = Object.assign({}, fila);
        delete fila[m[1]];
        continue;
      }
      throw res.error;
    }
    throw new Error("No se pudo guardar.");
  }

  // Crea o actualiza un restaurante. Con { soloActualizar: true } usa UPDATE
  // (necesario para los aliados, que pueden editar pero no crear).
  async function guardar(rest, opciones) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var fila = {
      id: rest.id,
      nombre: rest.nombre,
      cat: rest.cat,
      tiempo: rest.tiempo,
      abierto: !!rest.abierto,
      color: rest.color || "#3b82f6",
      descripcion: rest.desc || "",
      logo: rest.logo || "",
      logo_ajuste: window.LogoGhost ? LogoGhost.guardar(rest.logoAjuste, rest.logoPos) : (rest.logoAjuste === "logo" ? "logo" : "foto"),
      visible: rest.visible !== false,
      promo: normalizarPromo(rest.promo),
      whatsapp: normalizarWhatsapp(rest.whatsapp) || null,
      carta: normalizarCarta(rest.carta),
      almuerzo: normalizarAlmuerzo(rest.almuerzo),
      desayuno: normalizarAlmuerzo(rest.desayuno),
      horario: normalizarHorario(rest.horario),
      orden: typeof rest.orden === "number" ? rest.orden : 0,
    };
    var soloActualizar = opciones && opciones.soloActualizar;
    var res = await escribirResiliente(function (f) {
      return soloActualizar
        ? sb.from("restaurantes").update(f).eq("id", f.id).select()
        : sb.from("restaurantes").upsert(f, { onConflict: "id" }).select();
    }, fila);
    if (soloActualizar && (!res.data || !res.data.length)) {
      throw new Error("No tienes permiso para editar este restaurante.");
    }
    return res.data && res.data[0];
  }

  async function eliminar(id) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var res = await sb.from("restaurantes").delete().eq("id", id);
    if (res.error) throw res.error;
    return true;
  }

  /* ------------------------------ Ajustes -------------------------- */
  // Tabla "ajustes" (clave → valor JSON): domicilios, promociones,
  // comisión, lo más pedido… Si la tabla no existe, devuelve null.

  var _ajustes = null, _ajustesPromesa = null, ajustesDisponibles = null;

  async function leerAjustes(forzar) {
    if (_ajustes && !forzar) return _ajustes;
    if (_ajustesPromesa && !forzar) return _ajustesPromesa;
    var sb = client();
    if (!sb) { ajustesDisponibles = false; return null; }
    _ajustesPromesa = (async function () {
      try {
        var res = await sb.from("ajustes").select("clave, valor");
        if (res.error) throw res.error;
        var out = {};
        (res.data || []).forEach(function (f) { out[f.clave] = f.valor; });
        _ajustes = out;
        ajustesDisponibles = true;
        return out;
      } catch (e) {
        ajustesDisponibles = false;
        if (!esNoExiste(e)) console.warn("No se pudieron leer los ajustes:", e && e.message);
        return null;
      } finally {
        _ajustesPromesa = null;
      }
    })();
    return _ajustesPromesa;
  }

  async function guardarAjuste(clave, valor) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var res = await sb.from("ajustes")
      .upsert({ clave: clave, valor: valor, actualizado: new Date().toISOString() }, { onConflict: "clave" });
    if (res.error) {
      if (esNoExiste(res.error)) {
        var e = new Error("Falta ejecutar supabase-mejoras.sql en Supabase para guardar ajustes.");
        e.code = "SIN_SQL";
        throw e;
      }
      throw res.error;
    }
    if (_ajustes) _ajustes[clave] = valor;
    return true;
  }

  /* ----------------------------- Pedidos -------------------------- */

  // Código corto, fácil de dictar (sin 0/O ni 1/I): GH-7K3QPA
  function nuevoCodigo() {
    var abc = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ", s = "";
    var rnd = new Uint32Array(6);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(rnd);
    else for (var j = 0; j < 6; j++) rnd[j] = Math.floor(Math.random() * 4294967296);
    for (var i = 0; i < 6; i++) s += abc[rnd[i] % abc.length];
    return "GH-" + s;
  }

  // Crea un pedido (lo puede hacer un cliente sin cuenta).
  // IMPORTANTE: sin .select(). El cliente anónimo no tiene permiso de LEER
  // pedidos, y pedir la fila de vuelta hacía que Supabase rechazara el
  // pedido entero (los pedidos de clientes reales no llegaban al panel).
  async function crearPedido(pedido) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var fila = {
      codigo: pedido.codigo || nuevoCodigo(),
      estado: "recibido",
      cliente: pedido.cliente || {},
      items: pedido.items || [],
      total: pedido.total || 0,
    };
    var res = await sb.from("pedidos").insert(fila);
    if (res.error) throw res.error;
    return { codigo: fila.codigo };
  }

  // Lista pedidos (solo admin). estado: "todos" o uno concreto.
  // desdeISO (opcional): solo pedidos creados desde esa fecha.
  // Supabase entrega máximo 1000 filas por consulta: pedimos de a páginas
  // para que los reportes nunca se queden cortos sin avisar.
  // columnas (opcional): para consultas livianas, ej. el aviso de pedidos nuevos.
  async function listarPedidos(estado, desdeISO, columnas) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var PAGINA = 1000, todos = [];
    for (var desde = 0; desde < 50000; desde += PAGINA) {
      var q = sb.from("pedidos").select(columnas || "*").order("creado_en", { ascending: false });
      if (estado && estado !== "todos") q = q.eq("estado", estado);
      if (desdeISO) q = q.gte("creado_en", desdeISO);
      var res = await q.range(desde, desde + PAGINA - 1);
      if (res.error) throw res.error;
      var filas = res.data || [];
      todos = todos.concat(filas);
      if (filas.length < PAGINA) break;
    }
    return todos;
  }

  async function actualizarEstadoPedido(id, estado, incidencia) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var cambios = { estado: estado, actualizado: new Date().toISOString() };
    if (typeof incidencia === "string") cambios.incidencia = incidencia;
    var res = await sb.from("pedidos").update(cambios).eq("id", id).select();
    if (res.error) throw res.error;
    return res.data && res.data[0];
  }

  // Seguimiento público: el cliente consulta SOLO el estado de su pedido
  // con el código (función segura en la base de datos, sin datos personales).
  // Devuelve el pedido, null si no existe, o lanza { code: "SIN_SQL" }.
  async function estadoPedido(codigo) {
    var sb = client();
    if (!sb) { var e0 = new Error("sin supabase"); e0.code = "SIN_SQL"; throw e0; }
    var res = await sb.rpc("estado_pedido", { p_codigo: String(codigo || "").trim().toUpperCase() });
    if (res.error) {
      if (esNoExiste(res.error)) { var e = new Error("sin función"); e.code = "SIN_SQL"; throw e; }
      throw res.error;
    }
    var d = Array.isArray(res.data) ? res.data[0] : res.data;
    return d || null;
  }

  /* ------------------------------ Fotos ---------------------------- */

  // Sube una foto al bucket y devuelve su URL pública.
  async function subirFoto(file, carpeta) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var ext = (String(file.name || "foto.jpg").split(".").pop() || "jpg").toLowerCase();
    var nombre = (carpeta ? carpeta + "/" : "") +
      Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    var up = await sb.storage.from(SUPABASE_BUCKET).upload(nombre, file, {
      cacheControl: "31536000",   // las fotos no cambian de nombre: caché de 1 año
      upsert: false,
      contentType: file.type || "image/jpeg",
    });
    if (up.error) throw up.error;
    var pub = sb.storage.from(SUPABASE_BUCKET).getPublicUrl(nombre);
    return pub.data.publicUrl;
  }

  // Imagen que sale al compartir el enlace de la tienda (WhatsApp, Facebook…).
  // Siempre en la misma ruta: index.html apunta a ella y el panel la reemplaza.
  var RUTA_PORTADA_ENLACE = "portada/og.jpg";
  function urlPortadaEnlace() {
    return typeof SUPABASE_URL === "string" && SUPABASE_URL
      ? SUPABASE_URL + "/storage/v1/object/public/" + SUPABASE_BUCKET + "/" + RUTA_PORTADA_ENLACE : "";
  }
  async function subirPortadaEnlace(blob) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var up = await sb.storage.from(SUPABASE_BUCKET).upload(RUTA_PORTADA_ENLACE, blob, {
      cacheControl: "300",   // 5 min: así el cambio se ve pronto
      upsert: true,
      contentType: "image/jpeg",
    });
    if (up.error) throw up.error;
    return urlPortadaEnlace();
  }

  /* ------------------------------ Auth ----------------------------- */

  async function sesionActual() {
    var sb = client();
    if (!sb) return null;
    var res = await sb.auth.getSession();
    return res.data ? res.data.session : null;
  }

  async function entrar(email, password) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data.session;
  }

  async function salir() {
    var sb = client();
    if (!sb) return;
    await sb.auth.signOut();
  }

  // Rol del usuario con sesión: { rol: "admin" } o { rol: "aliado", restaurante_id }.
  // Si aún no se ejecutó el SQL de mejoras, todos los usuarios son admin
  // (comportamiento de antes) y se marca legado: true.
  // Devuelve null si el usuario no tiene ningún permiso asignado.
  async function miPerfil() {
    var sb = client();
    if (!sb) return null;
    var res = await sb.rpc("mi_perfil");
    if (res.error) {
      if (esNoExiste(res.error)) return { rol: "admin", legado: true };
      throw res.error;
    }
    var d = Array.isArray(res.data) ? res.data[0] : res.data;
    return d && d.rol ? d : null;
  }

  async function rpcAdmin(nombre, args) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var res = await sb.rpc(nombre, args || {});
    if (res.error) {
      if (esNoExiste(res.error)) {
        var e = new Error("Falta ejecutar supabase-mejoras.sql en Supabase.");
        e.code = "SIN_SQL";
        throw e;
      }
      throw res.error;
    }
    return res.data;
  }
  function listarAliados() { return rpcAdmin("listar_aliados").then(function (d) { return d || []; }); }
  function asignarAliado(email, restauranteId) {
    return rpcAdmin("asignar_aliado", { p_email: email, p_restaurante: restauranteId });
  }
  // Ventas del negocio aliado con sesión (solo totales, sin datos de clientes).
  function misVentas(desdeISO) { return rpcAdmin("mis_ventas", { p_desde: desdeISO || null }).then(function (d) { return d || {}; }); }
  function quitarAliado(email) { return rpcAdmin("quitar_aliado", { p_email: email }); }

  window.Store = {
    supabaseDisponible: supabaseDisponible,
    listar: listar,
    guardar: guardar,
    eliminar: eliminar,
    leerAjustes: leerAjustes,
    guardarAjuste: guardarAjuste,
    ajustesDisponibles: function () { return ajustesDisponibles; },
    _ajustesCache: function () { return _ajustes || {}; },
    // Solo las que la base de datos rechazó al guardar (seguro).
    columnasRechazadas: function () { return Object.keys(columnasFaltantes); },
    columnasFaltantes: function () {
      var faltan = Object.keys(columnasFaltantes);
      if (columnasTabla) ["horario", "desayuno", "visible", "logo_ajuste", "promo", "whatsapp"].forEach(function (c) {
        if (columnasTabla.indexOf(c) === -1 && faltan.indexOf(c) === -1) faltan.push(c);
      });
      return faltan;
    },
    nuevoCodigo: nuevoCodigo,
    normalizarWhatsapp: normalizarWhatsapp,
    crearPedido: crearPedido,
    listarPedidos: listarPedidos,
    actualizarEstadoPedido: actualizarEstadoPedido,
    estadoPedido: estadoPedido,
    subirFoto: subirFoto,
    urlPortadaEnlace: urlPortadaEnlace,
    subirPortadaEnlace: subirPortadaEnlace,
    sesionActual: sesionActual,
    entrar: entrar,
    salir: salir,
    miPerfil: miPerfil,
    listarAliados: listarAliados,
    asignarAliado: asignarAliado,
    quitarAliado: quitarAliado,
    misVentas: misVentas,
  };
})();
