// La barra utiliza los mismos controles y precios que la carta.
export function abrirBarra(box, pasoInicial) {
  if (box.classList.contains('barra')) return;
  const panel = box.querySelector('.vaso-dbarrio__controles');
  const escena = box.querySelector('.vaso-dbarrio__toma');
  const capa = escena.querySelector('.vaso-dbarrio__llenado');
  const grupos = [...panel.querySelectorAll('fieldset')];
  const botones = [...panel.querySelectorAll('[data-vaso-sabor]')];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)');
  const pasos = ['Vaso', 'Sabor', 'Extras'];
  const titulos = ['Escoge tu vaso', 'Sirve tu sabor', 'Dale tu toque'];
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
  botones.forEach((b,i) => {
    if (botones.length === 6) {
      b.classList.add('barra-sabor');
      b.style.setProperty('--recorte', (i % 3 * 50) + '% ' + (Math.floor(i / 3) * 100) + '%');
    }
  });
  let paso, fotograma = 0, sosteniendo = false, dedo = null;
  function mostrar(i) {
    paso = i;
    box.dataset.pasoBarra = i;
    grupos.forEach((g,j) => { g.hidden = j !== i; });
    [...nav.children].forEach((b,j) => {
      if (i === j) b.setAttribute('aria-current','step');
      else b.removeAttribute('aria-current');
    });
    titulo.textContent = titulos[i];
    listo.hidden = i !== 2;
    avanzar.hidden = i === 2;
    avanzar.textContent = i === 0 ? 'Elegir sabor' : 'Elegir extras';
    avanzar.disabled = i === 1 && !box.querySelector('[data-vaso-sabor][aria-pressed="true"]');
  }
  avanzar.addEventListener('click', () => { mostrar(Math.min(paso+1,2)); nav.children[paso].focus({preventScroll:true}); });
  // Un chorro de cristales con caída parabólica conserva el detalle del hielo en el vaso.
  function dibujar(t, nivel, boton) {
    if (!ctx) return;
    ctx.clearRect(0,0,440,440);
    const a = boton.style.getPropertyValue('--sabor-a').trim();
    const b = boton.style.getPropertyValue('--sabor-b').trim();
    const colores = [a,b,a,'#fcf1e6'];
    const fin = 169 - 91*nivel;
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
    for (let j=0;j<180;j++) {
      const k = (j*.618034+t*.0008)%1;
      const offset = Math.sin(j*87.3)*8;
      ctx.fillStyle = colores[j%4]; ctx.globalAlpha = Math.min(.64,nivel*8,(1-nivel)*8)*(j%4===3?.58:1);
      ctx.beginPath(); ctx.arc(x(k)+offset,y(k),1+(j%5)*.48,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  function servir(boton) {
    cancelAnimationFrame(fotograma);
    capa.getAnimations().forEach(a => a.cancel());
    if (reducido.matches) { capa.style.clipPath = ''; ctx?.clearRect(0,0,440,440); box.classList.remove('barra-sirviendo'); return; }
    let nivel = 0, ultimo = performance.now();
    box.classList.add('barra-sirviendo');
    function pintar(t) {
      if (!box.isConnected) return;
      nivel = Math.min(1,nivel + Math.max(0,t-ultimo)/(sosteniendo?2400:950));
      ultimo = t;
      capa.style.clipPath = 'inset(' + ((1-nivel)*43) + '% 0 0)';
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
