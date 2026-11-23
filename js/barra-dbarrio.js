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
    b.addEventListener('click', () => mostrar(i));
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
  const firma = document.createElement('div');
  firma.className = 'barra-firma';
  firma.textContent = 'La barra D’Barrio';
  marco.prepend(firma);
  const textura = document.createElement('canvas');
  textura.className = 'barra-chorro';
  textura.width = textura.height = 440;
  textura.setAttribute('aria-hidden','true');
  escena.append(textura);
  const ctx = textura.getContext('2d');
  const tapa = document.createElement('span');
  tapa.className = 'barra-tapa';
  escena.append(tapa);
  const consejo = document.createElement('p');
  consejo.className = 'barra-gesto';
  consejo.textContent = 'Toca un sabor o mantenlo presionado para servirlo despacio.';
  grupos[1].append(consejo);
  const progreso = document.createElement('span');
  progreso.className = 'barra-nivel';
  marco.append(progreso);
  const fotos = new Map([
    ['Alpinito Cremoso','alpinito'], ['Tote D’Barrio','tote'],
    ['Eclipse (fresa con uva)','eclipse'], ['Frutos Amarillos','frutos-amarillos'],
    ['Mango Biche sin licor','mango-biche'], ['Uva sin licor','uva']
  ]);
  const imagen = capa.querySelector('img');
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
    const baseFoto = boton?.dataset.foto;
    const conGomas = box.querySelector('[data-vaso-gomas]')?.checked;
    const foto = baseFoto;
    box.classList.toggle('barra-con-foto', Boolean(foto));
    imagen.src = foto || original;
    base.alt = foto ? 'Granizado ' + boton.dataset.vasoSabor + (conGomas ? ' con gomitas' : '') : descripcionInicial;
    if (foto) box.style.setProperty('--fondo-sabor','url("../' + foto + '")');
  }
  mostrarFoto(botones.find(b => b.getAttribute('aria-pressed') === 'true'));
  const opcionGomas = box.querySelector('[data-vaso-gomas]');
  const empaqueControl = box.querySelector('[data-vaso-empaque]');
  const resumen = document.createElement('fieldset');
  resumen.className = 'barra-resumen';
  const detalle = document.createElement('p');
  detalle.setAttribute('aria-live','polite');
  resumen.append(detalle, empaqueControl.closest('label'));
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
  info.textContent = opcionGomas ? 'Una porción ' + precio + '. Elige tu mezcla según disponibilidad.' : 'Las gomitas están agotadas.';
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
    for(let j=0;j<2;j++) {
      const pieza = icono.cloneNode();
      pieza.style.left = (29 + i*8 + j*3) + '%';
      pieza.style.top = (12 - Math.sin(i)*4 + j*5) + '%';
      pieza.style.setProperty('--giro',(i*17-22+j*14)+'deg');
      piezas.append(pieza);
    }
    dulces.append(piezas);
    elegir.onclick = () => {
      const activos = new Set(tiposElegidos().map(([n]) => n));
      if (activos.has(nombre)) activos.delete(nombre); else activos.add(nombre);
      box.dataset.surtido = [...activos].join('|');
      opcionGomas.checked = activos.size > 0;
      opcionGomas.dispatchEvent(new Event('change',{bubbles:true}));
      sincronia();
    };
  });
  box.addEventListener('vaso-reiniciar',() => { box.dataset.surtido = ''; mostrar(0); });
  let paso, fotograma = 0, sosteniendo = false, dedo = null;
  function mostrar(i) {
    if (i > 1 && !botones.some(b => b.getAttribute('aria-pressed') === 'true')) i = 1;
    sincronia();
    paso = i;
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
  }
  avanzar.addEventListener('click', () => { mostrar(Math.min(paso+1,3)); nav.children[paso].focus({preventScroll:true}); });
  // Un chorro de cristales con caída parabólica conserva el detalle del hielo en el vaso.
  function dibujar(t, nivel, boton) {
    if (!ctx) return;
    ctx.clearRect(0,0,440,440);
    const a = boton.style.getPropertyValue('--sabor-a').trim();
    const b = boton.style.getPropertyValue('--sabor-b').trim();
    const colores = [a,b,a,'#fcf1e6'];
    const fin = 102 - 76*nivel;
    ctx.save();
    ctx.globalAlpha = Math.min(1,nivel*12,(1-nivel)*12);
    ctx.lineCap = 'round';
    const x = k => 311 - 75*k - 24*k*k + Math.sin(k*7+t*.013)*2;
    const y = k => -10 + (fin+10)*k*k;
    const luz = ctx.createLinearGradient(204,0,321,0);
    luz.addColorStop(0,b); luz.addColorStop(.52,a); luz.addColorStop(1,b);
    ctx.strokeStyle = luz; ctx.lineWidth = 13;
    ctx.beginPath();
    for(let k=0;k<=1.001;k+=.025) { if(!k) ctx.moveTo(x(k),y(k)); else ctx.lineTo(x(k),y(k)); }
    ctx.stroke();
    if (a !== b) {
      ctx.save(); ctx.translate(440,0); ctx.scale(-1,1); ctx.strokeStyle=b;
      ctx.beginPath();
      for(let k=0;k<=1.001;k+=.025) { if(!k) ctx.moveTo(x(k),y(k)); else ctx.lineTo(x(k),y(k)); }
      ctx.stroke(); ctx.restore();
    }
    for (let j=0;j<180;j++) {
      const k = (j*.618034+t*.0008)%1;
      const offset = Math.sin(j*87.3)*8;
      ctx.fillStyle = colores[j%4]; ctx.globalAlpha = Math.min(.64,nivel*8,(1-nivel)*8)*(j%4===3?.58:1);
      ctx.beginPath(); ctx.arc(x(k)+offset,y(k),1+(j%5)*.48,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  function servir(boton) {
    mostrarFoto(boton);
    if (box.dataset.vasoVista !== "foto") box.querySelector('[data-vaso-ver="foto"]').click();
    cancelAnimationFrame(fotograma);
    capa.getAnimations().forEach(a => a.cancel());
    if (reducido.matches) { capa.style.clipPath = ''; ctx?.clearRect(0,0,440,440); box.classList.remove('barra-sirviendo'); return; }
    let nivel = 0, ultimo = performance.now();
    box.classList.add('barra-sirviendo');
    function pintar(t) {
      if (!box.isConnected) return;
      nivel = Math.min(1,nivel + Math.max(0,t-ultimo)/(sosteniendo?2400:950));
      ultimo = t;
      capa.style.clipPath = 'inset(' + ((1-nivel)*92) + '% 0 0)';
      progreso.style.setProperty('--nivel',nivel);
      dibujar(t,nivel,boton);
      if (nivel < 1) fotograma = requestAnimationFrame(pintar);
      else { ctx?.clearRect(0,0,440,440); capa.style.clipPath = ''; box.classList.remove('barra-sirviendo'); }
    }
    pintar(ultimo);
  }
  let activado = null;
  for (const b of botones) {
    b.addEventListener('pointerdown', e => {
      if (!e.isPrimary || e.button !== 0 || b.disabled) return;
      activado = b; dedo = e.pointerId; sosteniendo = true;
      b.setPointerCapture(e.pointerId);
      b.click();
    });
    const soltar = e => {
      if (dedo !== e.pointerId) return;
      sosteniendo = false; dedo = null;
      setTimeout(() => { if(activado === b) activado = null; },0);
    };
    b.addEventListener('pointerup',soltar);
    b.addEventListener('pointercancel',soltar);
    b.addEventListener('click', e => {
      if (e.detail && activado === b) { e.stopPropagation(); return; }
      queueMicrotask(() => { if (box.isConnected) { servir(b); if(paso===1) avanzar.disabled=false; } });
    });
  }
  function empaque() { box.classList.toggle('barra-para-llevar',box.querySelector('[data-vaso-empaque]').checked); }
  box.addEventListener('change',empaque);
  empaque();
  box.classList.add('barra');
  mostrar(pasoInicial || 0);
}
