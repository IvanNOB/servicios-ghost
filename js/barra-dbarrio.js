import { crearServicio } from './hielo-dbarrio.js?v=1';

// La barra utiliza los mismos controles y precios que la carta.
export function abrirBarra(box, pasoInicial) {
  if (box.classList.contains('barra')) return;
  const panel = box.querySelector('.vaso-dbarrio__controles');
  const escena = box.querySelector('.vaso-dbarrio__toma');
  const visor = escena.closest('figure');
  let desplazamiento = 0;
  let gestoPanorama;
  function desplazar(x) {
    const limite = visor.clientWidth * .32;
    desplazamiento = Math.max(-limite,Math.min(limite,x));
    escena.style.setProperty('--pan-x',desplazamiento+'px');
  }
  box.querySelectorAll('[data-pan]').forEach(boton => {
    boton.addEventListener('click',() => desplazar(desplazamiento-Number(boton.dataset.pan)));
  });
  visor.addEventListener('pointerdown',e => {
    if (box.dataset.vasoVista!=='panorama' || !e.isPrimary || e.button!==0) return;
    gestoPanorama = {id:e.pointerId,inicio:e.clientX,base:desplazamiento};
    visor.setPointerCapture(e.pointerId);
  });
  visor.addEventListener('pointermove',e => {
    if (e.pointerId===gestoPanorama?.id) desplazar(gestoPanorama.base+e.clientX-gestoPanorama.inicio);
  });
  visor.addEventListener('lostpointercapture',() => { gestoPanorama = undefined; });
  const capa = escena.querySelector('.vaso-dbarrio__llenado');
  const grupos = [...panel.querySelectorAll('fieldset')];
  const botones = [...panel.querySelectorAll('[data-vaso-sabor]')];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)');
  const pasos = ['Vaso', 'Sabor', 'Gomitas', 'Resumen'];
  const titulos = ['Elige tu vaso', 'Sirve tu sabor', 'Añade gomitas', 'Tu granizado'];
  const nav = document.createElement('nav');
  nav.className = 'barra-pasos';
  nav.setAttribute('aria-label','Preparación del granizado');
  pasos.forEach((nombre,i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = nombre;
    b.addEventListener('click', () => mostrar(i,true));
    nav.append(b);
  });
  const titulo = panel.querySelector('h4');
  titulo.before(nav);
  const pie = panel.querySelector('.vaso-dbarrio__compra');
  const avanzar = document.createElement('button');
  avanzar.className = 'barra-siguiente';
  avanzar.type = 'button';
  pie.append(avanzar);
  const listo = pie.querySelector('[data-vaso-listo]');
  const marco = box.querySelector('.vaso-dbarrio__presentacion');
  marco.before(nav,titulo);
  titulo.classList.add('barra-titulo');
  const textura = document.createElement('canvas');
  textura.className = 'barra-chorro';
  textura.setAttribute('aria-hidden','true');
  escena.append(textura);

  const tapa = document.createElement('button');
  tapa.type = 'button';
  tapa.setAttribute('aria-label','Sellar el vaso');
  tapa.className = 'barra-tapa';
  escena.append(tapa);
  const consejo = document.createElement('p');
  consejo.className = 'barra-gesto';
  consejo.textContent = 'Desliza el dedo sobre el vaso para guiar el chorro. Tócalo para volver a servir.';
  grupos[1].append(consejo);
  const fotos = new Map([
    ['Alpinito Cremoso','alpinito'], ['Tote D’Barrio','tote'],
    ['Eclipse (fresa con uva)','eclipse'], ['Frutos Amarillos','frutos-amarillos'],
    ['Mango Biche sin licor','mango-biche'], ['Uva sin licor','uva']
  ]);
  const imagen = capa.querySelector('img');
  const hielo = crearServicio(textura,imagen,reducido);
  box.classList.toggle('barra-viva',Boolean(hielo));
  consejo.hidden = !hielo || reducido.matches;
  const ruta = 'assets/granizados-dbarrio/barra/';
  const original = ruta + 'vacio.webp';
  const base = escena.querySelector(':scope > img');
  base.src = original;
  const descripcionInicial = 'Vaso transparente de Granizados D’Barrio sobre hielo';
  base.alt = descripcionInicial;
  for (const boton of botones) {
    const archivo = fotos.get(boton.dataset.vasoSabor);
    if (!archivo) continue;
    boton.dataset.foto = ruta + archivo + '.webp';
    boton.classList.add('barra-sabor');
    boton.style.setProperty('--foto-sabor', 'url("../' + boton.dataset.foto + '")');
  }
  function mostrarFoto(boton) {
    const conGomas = box.querySelector('[data-vaso-gomas]')?.checked;
    const foto = boton?.dataset.foto;
    box.classList.toggle('barra-con-foto', Boolean(foto));
    imagen.src = foto || original;
    base.alt = foto ? 'Granizado ' + boton.dataset.vasoSabor + (conGomas ? ' con gomitas' : '') : descripcionInicial;
    if (foto) box.style.setProperty('--fondo-sabor','url("../' + foto + '")');
  }
  const marcado = () => botones.find(b => b.getAttribute('aria-pressed') === 'true');
  mostrarFoto(marcado());
  if(marcado()) hielo?.servir(marcado(),true);
  const opcionGomas = box.querySelector('[data-vaso-gomas]');
  const empaqueControl = box.querySelector('[data-vaso-empaque]');
  const resumen = document.createElement('fieldset');
  resumen.className = 'barra-resumen';
  const detalle = document.createElement('p');
  detalle.setAttribute('aria-live','polite');
  const guiaTapa = document.createElement('small');
  guiaTapa.className = 'barra-guia-tapa';
  guiaTapa.setAttribute('role','status');
  resumen.append(detalle, empaqueControl.closest('label'), guiaTapa);
  grupos[2].after(resumen);
  grupos.push(resumen);
  const tipos = [
    ['Gusanos','gusanos','#60d5c3'], ['Ositos','ositos','#ec8d47'],
    ['Aros','aros','#f0b54c'], ['Sandías','sandias','#f57a93']
  ];
  const dulces = document.createElement('div');
  dulces.className = 'barra-dulces';
  dulces.setAttribute('aria-hidden','true');
  escena.insertBefore(dulces,tapa);
  const bandeja = document.createElement('div');
  bandeja.className = 'barra-bandeja';
  const gomasInfo = document.createElement('div');
  gomasInfo.className = 'barra-porcion';
  const leyenda = document.createElement('strong');
  const precio = opcionGomas?.closest('label').querySelector('b').textContent;
  leyenda.textContent = opcionGomas ? 'Porción surtida' : 'Gomitas agotadas';
  const importe = document.createElement('span');
  importe.textContent = precio || '';
  gomasInfo.append(leyenda, importe);
  grupos[2].append(gomasInfo,bandeja);
  if (opcionGomas) {
    opcionGomas.closest('label').hidden = true;
    const info = document.createElement('p');
    info.className = 'barra-ayuda-gomas';
    info.textContent = 'Mezcla por el mismo precio. Toca para elegir o quitar y arrastra cada gomita a su sitio.';
    grupos[2].append(info);
  }
  const limitar = (n,min,max) => Math.max(min,Math.min(max,n));
  const nombres = () => opcionGomas ? tipos.map(t => t[0]).filter(n => (box.dataset.surtido || '').split('|').includes(n)) : [];
  let posiciones = {};
  try { posiciones = JSON.parse(box.dataset.gomitasPos || '{}') || {}; } catch { /* Una mezcla anterior usa las posiciones iniciales. */ }

  function sincronia() {
    const elegidos = nombres();
    const sabor = marcado();
    const medida = box.querySelector('[data-vaso-tamano]:checked')?.nextElementSibling?.querySelector('strong')?.textContent;
    detalle.textContent = [medida,sabor?.dataset.vasoSabor,elegidos.join(' + ') || 'Sin gomitas'].filter(Boolean).join(' · ');
    if (sabor) base.alt = 'Granizado ' + sabor.dataset.vasoSabor + (elegidos.length ? ' con ' + elegidos.map(n => n.toLowerCase()).join(' y ') : '');
    for (const boton of bandeja.children) boton.setAttribute('aria-pressed',String(elegidos.includes(boton.value)));
    for (const grupo of dulces.children) grupo.hidden = !elegidos.includes(grupo.dataset.tipo);
  }

  if (opcionGomas) tipos.forEach(([nombre,id,color],i) => {
    const elegir = document.createElement('button');
    elegir.type = 'button';
    elegir.value = nombre;
    elegir.setAttribute('aria-label',nombre);
    elegir.style.setProperty('--color-dulce',color);
    const foto = document.createElement('span');
    foto.className = 'barra-muestra';
    const icono = new Image();
    icono.src = ruta + id + '.webp';
    icono.alt = '';
    icono.draggable = false;
    foto.append(icono);
    const etiqueta = document.createElement('span');
    etiqueta.textContent = nombre;
    const marca = document.createElement('span');
    marca.className = 'barra-goma-marcada';
    marca.setAttribute('aria-hidden','true');
    marca.textContent = '✓';
    elegir.append(foto,etiqueta,marca);
    bandeja.append(elegir);

    const grupo = document.createElement('span');
    grupo.dataset.tipo = nombre;
    grupo.hidden = true;
    dulces.append(grupo);
    const piezas = Array.from({length:3},(_,j) => {
      const pieza = icono.cloneNode();
      pieza.style.width = ([12,9,11][j] + (id==='gusanos' ? 1 : 0))+'%';
      pieza.style.setProperty('--giro',([-32,19,-12][j]+i*13)+'deg');
      grupo.append(pieza);
      return pieza;
    });

    // El horizonte del hielo es curvo. Los bordes admiten menos profundidad que el centro.
    function ubicar(punto) {
      piezas.forEach((pieza,j) => {
        const individual = punto?.piezas?.[j];
        const enGrupo = Number.isFinite(punto?.x) && Number.isFinite(punto?.y);
        const x = limitar(individual?.x ?? (enGrupo ? punto.x+[-4.4,3.9,.2][j] : 32+((i*3+j*5)%12)*3.15),32,68);
        const borde = 7.4+.022*(x-50)**2;
        const y = limitar(individual?.y ?? ((enGrupo ? punto.y : borde+4+(i%2)*2)+[-1.8,0,3.2][j]),borde,borde+8.5);
        pieza.style.left = x+'%';
        pieza.style.top = y+'%';
        pieza.style.zIndex = String(Math.round(y*10));
      });
    }
    ubicar(posiciones[id]);
    function seleccionar(activa) {
      const seleccion = new Set(nombres());
      if (activa) seleccion.add(nombre);
      else seleccion.delete(nombre);
      box.dataset.surtido = [...seleccion].join('|');
      opcionGomas.checked = seleccion.size > 0;
      opcionGomas.dispatchEvent(new Event('change',{bubbles:true}));
      sincronia();
    }

    function caer(desde, solo) {
      if (reducido.matches || !piezas[0].animate) return;
      piezas.forEach((pieza,j) => {
        if (solo && pieza!==solo) return;
        pieza.getAnimations().forEach(a => a.cancel());
        const r = pieza.getBoundingClientRect();
        const dx = desde ? desde.x-r.left-r.width/2 : (j-1)*14;
        const dy = desde ? desde.y-r.top-r.height/2 : -r.height*(1.6+j*.35);
        pieza.animate([
          {transform:'translate('+dx+'px,'+dy+'px) rotate(-24deg) scale(1.12)',easing:'cubic-bezier(.5,0,.88,.56)'},
          {offset:.65, transform:'translateY(1px) rotate(var(--giro)) scale(1.08,.91)',easing:'ease-out'},
          {offset:.82, transform:'translateY(-3px) rotate(var(--giro))'},
          {transform:'rotate(var(--giro))'}
        ],{duration:420+j*38,delay:j*52,fill:'backwards'});
      });
    }
    let arrastre = null;
    let evitarClick = false;
    function limpiar() {
      if (!arrastre) return;
      arrastre.fantasma?.remove();
      arrastre.observador?.disconnect();
      window.removeEventListener('blur',limpiar);
      box.classList.remove('barra-recibiendo');
      arrastre = null;
    }
    function puntoSobreVaso(e) {
      const r = escena.getBoundingClientRect();
      const x = (e.clientX-r.left)/r.width*100, y = (e.clientY-r.top)/r.height*100;
      if (x<20 || x>80 || y<0 || y>76) return null;
      return {x:limitar(x,32,68), y:limitar(y,8,22)};
    }
    function iniciar(e) {
      if (!e.isPrimary || e.button!==0) return;
      limpiar();
      evitarClick = false;
      arrastre = {id:e.pointerId,x:e.clientX,y:e.clientY};
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    function mover(e) {
      if (arrastre?.id!==e.pointerId) return;
      if (!arrastre.fantasma && Math.hypot(e.clientX-arrastre.x,e.clientY-arrastre.y)<7) return;
      if (!arrastre.fantasma) {
        evitarClick = true;
        if (box.dataset.vasoVista!=='foto') box.querySelector('[data-vaso-ver="foto"]').click();
        arrastre.fantasma = icono.cloneNode();
        arrastre.fantasma.className = 'barra-gomita-en-mano';
        box.ownerDocument.body.append(arrastre.fantasma);
        window.addEventListener('blur',limpiar);
        arrastre.observador = new MutationObserver(() => { if (!box.isConnected) limpiar(); });
        arrastre.observador.observe(box.closest('#vistaCarta'),{childList:true});
      }
      arrastre.fantasma.style.left = e.clientX+'px';
      arrastre.fantasma.style.top = e.clientY+'px';
      const punto = puntoSobreVaso(e);
      box.classList.toggle('barra-recibiendo',!!punto);
      if (punto) {
        dulces.style.setProperty('--sitio-x',punto.x+'%');
        dulces.style.setProperty('--sitio-y',punto.y+'%');
      }
    }
    function soltar(e) {
      if (arrastre?.id!==e.pointerId) return;
      const punto = arrastre.fantasma && puntoSobreVaso(e);
      if (punto) {
        const pieza = e.currentTarget === elegir ? null : e.currentTarget;
        if (pieza) {
          const anterior = posiciones[id] || {};
          posiciones[id] = {...anterior,piezas:{...anterior.piezas,[piezas.indexOf(pieza)]:punto}};
        } else posiciones[id] = punto;
        box.dataset.gomitasPos = JSON.stringify(posiciones);
        seleccionar(true);
        ubicar(posiciones[id]);
        caer({x:e.clientX,y:e.clientY},pieza);
      }
      limpiar();
    }
    for (const origen of [elegir,...piezas]) {
      origen.addEventListener('pointerdown',iniciar);
      origen.addEventListener('pointermove',mover);
      origen.addEventListener('pointerup',soltar);
      origen.addEventListener('pointercancel',limpiar);
      origen.addEventListener('lostpointercapture',limpiar);
    }
    elegir.addEventListener('click',e => {
      if (!evitarClick || e.detail===0) {
        const activa = !nombres().includes(nombre);
        seleccionar(activa);
        if (activa) {
          if (box.dataset.vasoVista!=='foto') box.querySelector('[data-vaso-ver="foto"]').click();
          ubicar(posiciones[id]);
          caer();
        }
      }
      evitarClick=false;
    });
  });
  box.addEventListener('vaso-reiniciar',() => {
    box.dataset.surtido = '';
    box.dataset.gomitasPos = '';
    posiciones = {};
    mostrarFoto(null);
    mostrar(0);
  });
  let paso;
  function mostrar(i, encuadrar = false) {
    if (i > 1 && !botones.some(b => b.getAttribute('aria-pressed') === 'true')) i = 1;
    if (i !== 1) hielo?.terminar();
    sincronia();
    paso = i;
    if (i !== 3) sellar(false);
    box.dataset.pasoBarra = i;
    grupos.forEach((g,j) => { g.hidden = j !== i; });
    [...nav.children].forEach((b,j) => {
      if (i === j) b.setAttribute('aria-current','step');
      else b.removeAttribute('aria-current');
    });
    titulo.textContent = titulos[i];
    listo.hidden = i !== 3;
    avanzar.hidden = i === 3;
    avanzar.textContent = ['Elegir sabor','Elegir gomitas','Revisar mi vaso'][i] || '';
    avanzar.disabled = i === 1 && !box.querySelector('[data-vaso-sabor][aria-pressed="true"]');
    if (encuadrar && matchMedia('(max-width:760px)').matches) {
      nav.scrollIntoView({block:'start',behavior:'instant'});
    }
  }
  avanzar.addEventListener('click', () => { mostrar(Math.min(paso+1,3),true); nav.children[paso].focus({preventScroll:true}); });
  function servir(boton) {
    if (box.dataset.vasoVista !== 'foto') box.querySelector('[data-vaso-ver="foto"]').click();
    mostrarFoto(boton);
    hielo?.servir(boton);
    if(paso===1) avanzar.disabled=false;
  }
  for(const boton of botones) {
    boton.addEventListener('click',() => queueMicrotask(() => { if(box.isConnected) servir(boton); }));
  }
  let dedo = null;
  function apuntar(e) {
    const r=escena.getBoundingClientRect();
    hielo.dirigir(((e.clientX-r.left)/r.width-.24)/.52);
  }
  escena.addEventListener('pointerdown',e => {
    if(box.dataset.vasoVista!=='foto' || !hielo || paso!==1 || !marcado() || !e.isPrimary || e.button!==0) return;
    dedo=e.pointerId;
    escena.setPointerCapture(dedo);
    if(!hielo.sirviendo) servir(marcado());
    apuntar(e);
  });
  escena.addEventListener('pointermove',e => { if(e.pointerId===dedo) apuntar(e); });
  escena.addEventListener('lostpointercapture',() => { dedo=null; hielo?.soltar(); });
  box.addEventListener('change',e => {
    if(!e.target.matches('[data-vaso-tamano]') || reducido.matches) return;
    escena.animate([{translate:'0 -22%',opacity:.5},{offset:.75,translate:'0 1.5%',opacity:1},{translate:'0 0'}],
      {duration:420,easing:'cubic-bezier(.23,.8,.3,1)'});
  });
  function sellar(cerrada) {
    box.classList.toggle('barra-sellada',cerrada);
    tapa.setAttribute('aria-pressed',String(cerrada));
    guiaTapa.textContent = cerrada ? 'Vaso sellado.' : 'Toca la tapa o bájala con el dedo para sellar.';
  }
  function empaque() {
    box.classList.toggle('barra-para-llevar',empaqueControl.checked);
    if (!empaqueControl.checked) sellar(false);
    guiaTapa.hidden = !empaqueControl.checked;
  }
  let presion = null;
  let tapaArrastrada = false;
  tapa.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0 || !empaqueControl.checked) return;
    presion = {id:e.pointerId,y:e.clientY};
    tapaArrastrada = false;
    tapa.setPointerCapture(e.pointerId);
  });
  tapa.addEventListener('pointermove', e => {
    if (presion?.id !== e.pointerId) return;
    const distancia = e.clientY-presion.y;
    if (Math.abs(distancia)<4 && !tapaArrastrada) return;
    tapaArrastrada = true;
    const avance = Math.max(0,Math.min(1,(box.classList.contains('barra-sellada') ? 1 : 0)+distancia/24));
    tapa.style.setProperty('--separacion',(avance-1)*32+'%');
  });
  tapa.addEventListener('pointerup', e => {
    if (presion?.id === e.pointerId && tapaArrastrada && Math.abs(e.clientY-presion.y)>6) {
      sellar(e.clientY>presion.y);
    }
  });
  tapa.addEventListener('lostpointercapture', () => {
    presion = null;
    tapa.style.removeProperty('--separacion');
  });
  tapa.addEventListener('click', e => {
    if (!tapaArrastrada || e.detail===0) sellar(!box.classList.contains('barra-sellada'));
    tapaArrastrada = false;
  });
  box.addEventListener('vaso-agregado', () => { if (empaqueControl.checked) sellar(true); });
  box.addEventListener('change',empaque);
  empaque();
  box.classList.add('barra');
  mostrar(pasoInicial || 0);
}
