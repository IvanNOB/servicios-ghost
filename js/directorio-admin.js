/* Directorio del administrador. Los editores y permisos pertenecen al panel. */
function crearDirectorioAdmin(api) {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = api.esc;
  const normalizar = texto => String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  let pagina = 1, vista = "lista", seleccionado = "", ventas, actualizado = 0, consultando = false;
  const filtros = [
    ["", "▤", "Establecimientos"], ["abiertos", "✓", "Abiertos"], ["cerrados", "×", "Cerrados"],
    ["precio", "◇", "Productos sin precio"], ["menu", "▦", "Menús por actualizar"]
  ];
  function menuPendiente(r) {
    return ["desayuno","almuerzo"].some(tipo => r[tipo]?.activo && !api.menuHoy(r,tipo));
  }
  function coincide(r,f) {
    switch(f) {
      case "abiertos": return r.abierto !== false;
      case "cerrados": return r.abierto === false;
      case "precio": return api.contarSinPrecio(r) > 0;
      case "menu": return menuPendiente(r);
      default: return true;
    }
  }
  function foto(r,clase) {
    return r.logo ? LogoGhost.recuadro(r,clase,{mosaico:clase==="dir-logo"}) :
      '<span class="' + clase + ' dir-inicial">' + esc(api.iniciales(r.nombre)) + '</span>';
  }
  function interruptor(r) {
    const abierto = r.abierto !== false;
    return '<button class="dir-estado" role="switch" aria-checked="' + abierto + '" aria-label="Recibir pedidos en ' + esc(r.nombre) + '" data-ali-abrir="' + esc(r.id) + '"><i></i>' + (abierto ? 'Abierto' : 'Cerrado') + '</button>';
  }
  function alerta(r) {
    const n = api.contarSinPrecio(r);
    return [n && n + ' sin precio', menuPendiente(r) && 'Menú vencido', r.visible === false && 'Carta oculta'].filter(Boolean)
      .map(s => '<span class="dir-alerta">' + s + '</span>').join(" ") || '<span class="muted">—</span>';
  }
  function acciones(r) {
    return '<button class="dir-ico" data-editar="' + esc(r.id) + '" aria-label="Editar ' + esc(r.nombre) + '">✎</button> ' +
      '<a class="dir-ico" href="' + esc(api.urlVistaPrevia(r.id)) + '" target="_blank" rel="noopener" aria-label="Vista previa de ' + esc(r.nombre) + '">↗</a>';
  }
  function nombre(r) {
    return '<button class="dir-elegir" aria-pressed="' + (seleccionado===r.id) + '" data-local="' + esc(r.id) + '">' + foto(r,"dir-logo") + '<strong>' + esc(r.nombre) + '</strong></button>';
  }
  function tabla(lista) {
    return '<div class="dir-tabla"><table><thead><tr>' + ["Establecimiento","Categoría","Estado","Productos","Alertas","Acciones"].map(x=>'<th scope="col">'+x+'</th>').join("") +
      '</tr></thead><tbody>' + lista.map(r=>'<tr class="'+(r.id===seleccionado?"elegido":"")+'"><td>'+nombre(r)+'</td><td>'+esc(r.cat || "Sin categoría")+
      '</td><td>'+interruptor(r)+'</td><td>'+api.contarPlatos(r)+'</td><td>'+alerta(r)+'</td><td>'+acciones(r)+'</td></tr>').join("")+'</tbody></table></div>';
  }
  function tarjetas(lista) {
    return '<div class="dir-cards">'+lista.map(r=>'<article class="'+(r.id===seleccionado?"elegido":"")+'">'+nombre(r)+'<small>'+esc(r.cat || "Sin categoría")+
      ' · '+api.contarPlatos(r)+' productos</small>'+interruptor(r)+'<div>'+alerta(r)+'</div><div>'+acciones(r)+'</div></article>').join("")+'</div>';
  }
  function estadisticas(r) {
    const nodo=$("dirCifras");
    if (!nodo || nodo.dataset.id!==r.id) return;
    if (!ventas || Date.now()-actualizado > 60000) {
      nodo.textContent = "Consultando ventas…";
      if (consultando) return;
      consultando=true;
      api.ventas().then(datos=>{
        ventas=datos; actualizado=Date.now();
        const actual=api.lista().find(x=>x.id===seleccionado);
        if (api.permitido() && actual) estadisticas(actual);
      }).catch(()=>{if ($("dirCifras")) $("dirCifras").innerHTML='<button data-dir-reintentar>Reintentar consulta de ventas</button>';})
        .finally(()=>{consultando=false;});
      return;
    }
    const v=Object.hasOwn(ventas,r.id)?ventas[r.id]:Object.hasOwn(ventas,r.nombre)?ventas[r.nombre]:{};
    nodo.innerHTML='<span><b>'+ (v.pedidos || 0) +'</b>Pedidos entregados</span><span><b>'+esc(api.money(v.ventas || 0))+'</b>Ventas</span>';
  }
  function detalle(r) {
    const panel=$("dirDetalle");
    panel.innerHTML=r?foto(r,"dir-portada")+'<div class="dir-interior"><h2>'+esc(r.nombre)+'</h2><p>'+esc(r.cat || "Sin categoría")+'</p>'+interruptor(r)+
      '<a class="dir-preview" href="'+esc(api.urlVistaPrevia(r.id))+'" target="_blank" rel="noopener">Vista previa ↗</a><div class="dir-gestion">'+
      [["editar","Información del establecimiento"],["ali-disp","Productos y precios"],["alm-publicar","Menú del día / Corrientazos"],["ali-estado","Estados e historias"],["ali-promo","Promociones"]].map(([k,t])=>'<button data-'+k+'="'+esc(r.id)+'">'+t+'<i>›</i></button>').join("")+
      (api.cartaNueva(r)?'<button data-sincronizar="'+esc(r.id)+'">Revisar carta nueva <i>›</i></button>':'')+
      '</div><h3>Últimos 7 días</h3><div id="dirCifras" data-id="'+esc(r.id)+'"></div><details><summary>Más acciones</summary><button class="btn-danger" data-borrar="'+esc(r.id)+'">Borrar establecimiento</button></details></div>':'';
    if (r) estadisticas(r);
  }
  function pintar() {
    if (!api.permitido()) return;
    const lista=api.lista(), f=$("dirFiltro").value, cat=$("dirCategoria"), q=normalizar($("buscarCartaAdmin").value);
    const opciones=[...new Set(lista.map(r=>r.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
    const html='<option value="">Todas las categorías</option>'+opciones.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");
    if(cat.dataset.opciones!==html){const anterior=cat.value;cat.innerHTML=html;cat.value=opciones.includes(anterior)?anterior:"";cat.dataset.opciones=html;}
    $("dirKpis").innerHTML=filtros.map(([k,i,t])=>{
      const n=k==="precio"?lista.reduce((s,r)=>s+api.contarSinPrecio(r),0):lista.filter(r=>coincide(r,k)).length;
      return '<button data-dir-kpi="'+k+'" aria-pressed="'+(f===k)+'"><i>'+i+'</i><span><b>'+n+'</b>'+t+'</span></button>';
    }).join("");
    const visibles=lista.filter(r=>coincide(r,f)&&(!cat.value||r.cat===cat.value)&&normalizar(r.nombre+' '+(r.cat||'')).includes(q));
    const paginas=Math.max(1,Math.ceil(visibles.length/8));
    pagina=Math.max(1,Math.min(paginas,pagina));
    const inicio=(pagina-1)*8, filas=visibles.slice(inicio,inicio+8);
    const r=filas.find(x=>x.id===seleccionado)||filas[0]; seleccionado=r?.id || "";
    $("listaRest").innerHTML=filas.length?(vista==="lista"?tabla(filas):tarjetas(filas)):'<p class="muted">No hay establecimientos para esta selección.</p>';
    $("dirPaginas").innerHTML='<span>'+ (filas.length ? (inicio+1)+'–'+(inicio+filas.length)+' de '+visibles.length : '0 establecimientos')+
      '</span><button data-dir-pagina="-1" aria-label="Página anterior" '+(pagina===1?'disabled':'')+'>‹</button><b>'+pagina+'</b><button data-dir-pagina="1" aria-label="Página siguiente" '+(pagina===paginas?'disabled':'')+'>›</button>';
    document.querySelectorAll("[data-dir-vista]").forEach(b=>b.setAttribute("aria-pressed",String(vista===b.dataset.dirVista)));
    detalle(r);
  }
  function filtrar(){pagina=1;pintar();}
  $("buscarCartaAdmin").addEventListener("input",filtrar);
  ["dirFiltro","dirCategoria"].forEach(id=>$(id).addEventListener("change",filtrar));
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-dir-vista],[data-dir-kpi],[data-dir-pagina],[data-local],[data-acceso],[data-dir-reintentar]");
    if (!b || !api.permitido()) return;
    if (b.hasAttribute("data-acceso")) {
      const r=api.lista().find(x=>x.id===seleccionado)||api.lista()[0];
      if(r) api.abrir(b.dataset.acceso,r.id);
      return;
    }
    if (b.dataset.dirVista) vista=b.dataset.dirVista;
    if (b.hasAttribute("data-dir-kpi")) { $("dirFiltro").value=b.dataset.dirKpi; pagina=1; }
    if (b.dataset.dirPagina) pagina+=Number(b.dataset.dirPagina);
    if (b.dataset.local) seleccionado=b.dataset.local;
    pintar();
    if (b.dataset.local && matchMedia("(max-width:1050px)").matches) $("dirDetalle").scrollIntoView({block:"start"});
  });
  return {pintar};
}
