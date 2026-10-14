/* =====================================================================
   Servicios Ghost — Capa de datos (store)
   ---------------------------------------------------------------------
   Expone window.Store con utilidades para leer/escribir restaurantes.

   - Si Supabase está configurado (supabase-config.js) y responde, los
     datos vienen de la nube.
   - Si no, usa el array RESTAURANTES de data.js como respaldo, para que
     la web nunca se quede en blanco.

   Un restaurante tiene esta forma (igual que en data.js):
     { id, nombre, cat, tiempo, abierto, color, desc, logo, carta: [
         { sec, items: [ { id, n, d, p } ] }
     ] }
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

  // Convierte una fila de la tabla "restaurantes" al formato de la app.
  function filaARestaurante(row) {
    return {
      id: row.id,
      nombre: row.nombre,
      cat: row.cat,
      tiempo: row.tiempo,
      abierto: !!row.abierto,
      color: row.color || "#3b82f6",
      desc: row.descripcion || "",
      logo: row.logo || "",
      // "carta" se guarda como JSON en la base de datos.
      carta: Array.isArray(row.carta) ? row.carta : [],
      almuerzo: row.almuerzo || null,
      orden: typeof row.orden === "number" ? row.orden : 0,
    };
  }

  // Lee todos los restaurantes. Devuelve una promesa con el array.
  async function listar() {
    var sb = client();
    if (!sb) {
      // Respaldo: data.js
      return (typeof RESTAURANTES !== "undefined" ? RESTAURANTES : []).slice();
    }
    try {
      var res = await sb
        .from("restaurantes")
        .select("*")
        .order("orden", { ascending: true })
        .order("nombre", { ascending: true });
      if (res.error) throw res.error;
      return (res.data || []).map(filaARestaurante);
    } catch (e) {
      console.warn("Supabase no respondió, uso data.js:", e && e.message);
      return (typeof RESTAURANTES !== "undefined" ? RESTAURANTES : []).slice();
    }
  }

  /* ---------------- Operaciones de administración ----------------- */
  /* Requieren sesión iniciada; las políticas RLS las protegen.        */

  // Crea o actualiza un restaurante (upsert por id).
  async function guardar(rest) {
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
      carta: rest.carta || [],
      almuerzo: rest.almuerzo || null,
      orden: typeof rest.orden === "number" ? rest.orden : 0,
    };
    var res = await sb.from("restaurantes").upsert(fila, { onConflict: "id" }).select();
    if (res.error) throw res.error;
    return res.data && res.data[0];
  }

  async function eliminar(id) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var res = await sb.from("restaurantes").delete().eq("id", id);
    if (res.error) throw res.error;
    return true;
  }

  // Sube de una vez todos los restaurantes definidos en data.js (RESTAURANTES).
  // Útil para migrar el contenido inicial a la base de datos.
  async function migrarDesdeData() {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var base = (typeof RESTAURANTES !== "undefined" ? RESTAURANTES : []);
    var filas = base.map(function (r, idx) {
      return {
        id: r.id,
        nombre: r.nombre,
        cat: r.cat,
        tiempo: r.tiempo,
        abierto: !!r.abierto,
        color: r.color || "#3b82f6",
        descripcion: r.desc || "",
        logo: r.logo || "",
        carta: r.carta || [],
        almuerzo: r.almuerzo || null,
        orden: typeof r.orden === "number" ? r.orden : idx,
      };
    });
    if (!filas.length) return 0;
    var res = await sb.from("restaurantes").upsert(filas, { onConflict: "id" }).select();
    if (res.error) throw res.error;
    return res.data ? res.data.length : 0;
  }

  /* ----------------------------- Pedidos -------------------------- */

  // Crea un pedido en la base de datos. Devuelve el pedido guardado
  // (con su id/código). Lo puede hacer un cliente sin cuenta.
  async function crearPedido(pedido) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var fila = {
      codigo: pedido.codigo || null,
      estado: "recibido",
      cliente: pedido.cliente || {},
      items: pedido.items || [],
      total: pedido.total || 0,
    };
    var res = await sb.from("pedidos").insert(fila).select();
    if (res.error) throw res.error;
    return res.data && res.data[0];
  }

  // Lista los pedidos (solo admin). Opcionalmente filtra por estado.
  async function listarPedidos(estado) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var q = sb.from("pedidos").select("*").order("creado_en", { ascending: false });
    if (estado && estado !== "todos") q = q.eq("estado", estado);
    var res = await q;
    if (res.error) throw res.error;
    return res.data || [];
  }

  // Cambia el estado de un pedido (solo admin).
  async function actualizarEstadoPedido(id, estado, incidencia) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var cambios = { estado: estado, actualizado: new Date().toISOString() };
    if (typeof incidencia === "string") cambios.incidencia = incidencia;
    var res = await sb.from("pedidos").update(cambios).eq("id", id).select();
    if (res.error) throw res.error;
    return res.data && res.data[0];
  }

  // Sube una foto al bucket y devuelve su URL pública.
  async function subirFoto(file, carpeta) {
    var sb = client();
    if (!sb) throw new Error("Supabase no está configurado.");
    var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    var nombre = (carpeta ? carpeta + "/" : "") +
      Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;

    var up = await sb.storage.from(SUPABASE_BUCKET).upload(nombre, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });
    if (up.error) throw up.error;

    var pub = sb.storage.from(SUPABASE_BUCKET).getPublicUrl(nombre);
    return pub.data.publicUrl;
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

  window.Store = {
    supabaseDisponible: supabaseDisponible,
    client: client,
    listar: listar,
    guardar: guardar,
    eliminar: eliminar,
    migrarDesdeData: migrarDesdeData,
    crearPedido: crearPedido,
    listarPedidos: listarPedidos,
    actualizarEstadoPedido: actualizarEstadoPedido,
    subirFoto: subirFoto,
    sesionActual: sesionActual,
    entrar: entrar,
    salir: salir,
  };
})();
