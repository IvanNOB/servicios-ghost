import { crearServicio } from './hielo-dbarrio.js?v=1';

// La barra utiliza los mismos controles y precios que la carta.
export function abrirBarra(box, pasoInicial) {
  if (box.classList.contains('barra')) return;
  const panel = box.querySelector('.vaso-dbarrio__controles');
  const escena = box.querySelector('.vaso-dbarrio__toma');
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
  const tipos = [['Gusanos','gusanos'],['Ositos','ositos'],['Aros','aros'],['Sandías','sandias']];
  const dulces = document.createElement('div');
  dulces.className = 'barra-dulces';
  escena.insertBefore(dulces,tapa);
  const bandeja = document.createElement('div');
  bandeja.className = 'barra-bandeja';
  grupos[2].append(bandeja);
  const info = document.createElement('p');
  const precio = opcionGomas?.closest('label').querySelector('b').textContent;
  info.textContent = opcionGomas ? 'Una porción ' + precio + '. Toca una gomita o arrástrala al vaso. Mezcla según disponibilidad.' : 'Las gomitas están agotadas.';
  grupos[2].append(info);
  if (opcionGomas) opcionGomas.closest('label').hidden = true;
  function tiposElegidos() {
    return tipos.filter(([nombre]) => (box.dataset.surtido || '').split('|').includes(nombre));
  }
  function sincronia() {
    const elegidos = tiposElegidos();
    const sabor = botones.find(b => b.getAttribute('aria-pressed') === 'true');
    const medida = box.querySelector('[data-vaso-tamano]:checked')?.nextElementSibling?.querySelector('strong')?.textContent;
    detalle.textContent = [medida,sabor?.dataset.vasoSabor,elegidos.map(([n]) => n).join(' + ') || 'Sin gomitas'].filter(Boolean).join(' · ');
    if (sabor) base.alt = 'Granizado ' + sabor.dataset.vasoSabor + (elegidos.length ? ' con ' + elegidos.map(([n]) => n.toLowerCase()).join(' y ') : '');
    for (const b of bandeja.children) b.setAttribute('aria-pressed',String(elegidos.some(([n]) => n === b.value)));
    for (const grupo of dulces.children) grupo.hidden = !elegidos.some(([n]) => n === grupo.dataset.tipo);
  }
  if (opcionGomas) tipos.forEach(([nombre,id],i) => {
    const elegir = document.createElement('button');
    elegir.type = 'button';
    elegir.value = nombre;
    const icono = new Image();
    icono.src = ruta + id + '.webp';
    icono.alt = '';
    elegir.append(icono,nombre);
    bandeja.append(elegir);
    const piezas = document.createElement('span');
    piezas.dataset.tipo = nombre;
    for(let j=0;j<3;j++) {
      const pieza = icono.cloneNode();
      const u = (i*.265 + j*.31) % 1;
      pieza.style.left = (27 + u*36) + '%';
      pieza.style.top = (7 + 7*(2*u-1)**2 + 4*(j%2)) + '%';
      pieza.style.setProperty('--giro',(i*17-22+j*14)+'deg');
      piezas.append(pieza);
    }
    dulces.append(piezas);
    function elegirTipo(sumar = false) {
      const activos = new Set(tiposElegidos().map(([n]) => n));
      if (activos.has(nombre) && !sumar) activos.delete(nombre); else activos.add(nombre);
      box.dataset.surtido = [...activos].join('|');
      opcionGomas.checked = activos.size > 0;
      opcionGomas.dispatchEvent(new Event('change',{bubbles:true}));
      sincronia();
    }
    // El mismo botón permite tocar, arrastrar y activar con teclado.
    let arrastre = null, evitarClick = false;
    function limpiarArrastre() {
      arrastre?.fantasma?.remove();
      box.classList.remove('barra-recibiendo');
      arrastre = null;
    }
    elegir.addEventListener('pointerdown',e => {
      if (!e.isPrimary || e.button !== 0) return;
      evitarClick=false;
      arrastre={ id:e.pointerId, x:e.clientX, y:e.clientY };
      elegir.setPointerCapture(e.pointerId);
    });
    elegir.addEventListener('pointermove',e => {
      if (arrastre?.id !== e.pointerId) return;
      if (!arrastre.fantasma && Math.hypot(e.clientX-arrastre.x,e.clientY-arrastre.y)<7) return;
      if (!arrastre.fantasma) {
        evitarClick=true;
        if(box.dataset.vasoVista!=='foto') box.querySelector('[data-vaso-ver="foto"]').click();
        arrastre.fantasma=icono.cloneNode();
        arrastre.fantasma.className='barra-gomita-en-mano';
        box.ownerDocument.body.append(arrastre.fantasma);
      }
      arrastre.fantasma.style.left=e.clientX+'px';
      arrastre.fantasma.style.top=e.clientY+'px';
      const r=escena.getBoundingClientRect();
      const dentro=e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom;
      box.classList.toggle('barra-recibiendo',dentro);
    });
    elegir.addEventListener('pointerup',e => {
      if (arrastre?.id!==e.pointerId) return;
      const r=escena.getBoundingClientRect();
      if(arrastre.fantasma && e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom) {
        const x=Math.max(27,Math.min(61,(e.clientX-r.left)/r.width*100-4));
        elegirTipo(true);
        [...piezas.children].forEach((pieza,j) => {
          const centro=x+[0,-4,3][j];
          pieza.style.left=centro+'%';
          pieza.style.top=(6+Math.abs(centro-45)*.35+j*2)+'%';
          if(!reducido.matches) {
            const destino=pieza.getBoundingClientRect();
            pieza.animate([{transform:'translate('+(e.clientX-destino.left-destino.width/2)+'px,'+(e.clientY-destino.top-destino.height/2)+'px) scale(1.22)'},{offset:.78,transform:'translateY(3px) rotate(12deg)'},{transform:'rotate(var(--giro))'}],{duration:380+j*85,easing:'ease-out'});
          }
        });
      }
      limpiarArrastre();
    });
    elegir.addEventListener('lostpointercapture',limpiarArrastre);
    elegir.addEventListener('pointercancel',limpiarArrastre);
    elegir.addEventListener('click',e => {
      if(!evitarClick || e.detail===0) elegirTipo();
      evitarClick=false;
    });
  });
  box.addEventListener('vaso-reiniciar',() => { box.dataset.surtido = ''; mostrar(0); });
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
    if(!hielo || paso!==1 || !marcado() || !e.isPrimary || e.button!==0) return;
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
  listo.addEventListener('click', () => { if (empaqueControl.checked) sellar(true); });
  box.addEventListener('change',empaque);
  empaque();
  box.classList.add('barra');
  mostrar(pasoInicial || 0);
}
