// Coordenadas sobre el encuadre común de las fotografías de la barra.
const LADO = 440;
const COLUMNAS = 37;
const IZQUIERDA = 106;
const ANCHO = 232;
const limitar = (n, min, max) => Math.max(min, Math.min(max, n));

export function crearServicio(canvas, imagen, reducido) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width = canvas.height = LADO;

  const cavidad = new Path2D();
  cavidad.moveTo(106,94);
  cavidad.bezierCurveTo(111,70,145,9,224,9);
  cavidad.bezierCurveTo(282,9,323,55,339,95);
  cavidad.lineTo(294,388);
  cavidad.quadraticCurveTo(229,419,150,391);
  cavidad.closePath();

  // La etiqueta está en la pared delantera; el chorro pasa detrás de ella.
  const delante = new Path2D();
  delante.rect(0,0,LADO,LADO);
  delante.moveTo(167,209);
  delante.lineTo(174,200); delante.lineTo(196,202); delante.lineTo(211,195);
  delante.lineTo(207,187); delante.lineTo(217,189); delante.lineTo(223,181);
  delante.lineTo(228,190); delante.lineTo(236,187); delante.lineTo(235,196);
  delante.bezierCurveTo(250,198,263,181,279,197);
  delante.bezierCurveTo(294,203,280,225,272,230);
  delante.lineTo(260,233); delante.lineTo(257,241); delante.lineTo(189,254);
  delante.lineTo(181,246); delante.bezierCurveTo(162,252,163,236,168,222);
  delante.closePath();

  const altura = new Float32Array(COLUMNAS);
  const velocidad = new Float32Array(COLUMNAS);
  const copos = [];
  let nivel = 0, objetivo = .5, punta = .5, tiempo = 0;
  let marco = 0, anterior = 0, activo = false, mano = false;
  let cristal, mezcla;

  function solicitar() {
    if (!marco) marco = requestAnimationFrame(pintar);
  }

  function superficie(u, indice) {
    const nivelBase = 397 - 387 * nivel;
    const corona = 78 * nivel ** 5 * (2 * u - 1) ** 2;
    const grano = Math.sin(indice * 2.4) * 2;
    return nivelBase + corona + altura[indice] + grano;
  }

  function dibujarHielo() {
    if (nivel === 0) return;
    const conTextura = imagen.complete && imagen.naturalWidth;
    ctx.save();
    ctx.clip(cavidad);
    ctx.beginPath();
    for (let i = 0; i < COLUMNAS; i++) {
      const u = i / (COLUMNAS - 1);
      const x = IZQUIERDA + ANCHO * u;
      if (i === 0) ctx.moveTo(x, superficie(u,i));
      else ctx.lineTo(x, superficie(u,i));
    }
    ctx.lineTo(340,415); ctx.lineTo(103,415); ctx.closePath(); ctx.clip();
    if (conTextura) {
      ctx.drawImage(imagen,0,0,LADO,LADO);
      // Hielo recién caído: la textura de la corona recorre la superficie interior.
      if (activo) {
        ctx.save();
        ctx.clip(delante,'evenodd');
        const w = imagen.naturalWidth, h = imagen.naturalHeight;
        ctx.globalAlpha = Math.min(1,(1-nivel)*8) * .88;
        const anchoColumna = ANCHO/(COLUMNAS-1);
        for (let i = 0; i < COLUMNAS-1; i++) {
          const u = i/(COLUMNAS-1);
          const y = superficie(u,i);
          const grosor = 7 + 8 * Math.sin(Math.PI*u);
          const texturaX = (.36 + .27*u + .012*Math.sin(tiempo*5+i/7))*w;
          ctx.drawImage(imagen,texturaX,.138*h,anchoColumna*w/LADO,.055*h,
            IZQUIERDA+i*anchoColumna,y,anchoColumna+.6,grosor);
        }
        ctx.restore();
      }
    } else {
      ctx.fillStyle = cristal;
      ctx.fillRect(100,0,245,415);
    }
    ctx.restore();
  }

  // La anchura y los cristales cambian a lo largo de la caída.
  function chorro(origen, fin, impacto, color, fase, radio) {
    const largo = impacto + 12;
    const posicion = k => origen + (fin-origen)*Math.sin(k*Math.PI/2)
      + 1.3*Math.sin(k*16-tiempo*13+fase);
    const borde = k => radio*(1.15-.28*k)
      + 1.3*Math.sin(k*30-tiempo*18+fase) + .8*Math.cos(k*69-tiempo*25);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i=0; i<=20; i++) {
      const k=i/20, x=posicion(k)-borde(k), y=-12+largo*k;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    for (let i=20; i>=0; i--) {
      const k=i/20;
      ctx.lineTo(posicion(k)+borde(k),-12+largo*k);
    }
    ctx.closePath(); ctx.fill();
    for (let j=0; j<74; j++) {
      const k = ((j*.618 + tiempo*1.18)%1)**1.35;
      const x = posicion(k) + Math.sin(j*19+fase)*borde(k)*.85;
      ctx.fillStyle = j%3 ? 'rgba(255,242,245,.55)' : 'rgba(45,1,48,.44)';
      ctx.beginPath(); ctx.ellipse(x,-12+largo*k,1+j%2,1.8+j%3,.42,0,2*Math.PI); ctx.fill();
    }
  }

  function pintar(ms) {
    marco = 0;
    if (!canvas.isConnected) return;
    if (activo && reducido.matches) terminar();
    const dt = limitar((ms-(anterior || ms-16))/1000,.001,.035);
    anterior = ms;
    tiempo += dt;
    punta += (objetivo-punta)*Math.min(1,dt*14);
    const indice = Math.round(punta*(COLUMNAS-1));
    if (activo) {
      nivel = Math.min(1,nivel+dt/(mano ? 3.4 : 2.35));
      if (nivel === 1) activo=false;
    }
    let energia = 0;
    for (let i=0; i<COLUMNAS; i++) {
      const vecinos = (altura[i-1] ?? altura[i])+(altura[i+1] ?? altura[i])-2*altura[i];
      const presion = activo ? -460*Math.exp(-((i-indice)**2)/10) : 0;
      velocidad[i] += (210*vecinos-36*altura[i]-8*velocidad[i]+presion)*dt;
    }
    for (let i=0; i<COLUMNAS; i++) {
      altura[i] += velocidad[i]*dt;
      energia = Math.max(energia,Math.abs(altura[i])+Math.abs(velocidad[i])*.1);
    }

    ctx.clearRect(0,0,LADO,LADO);
    dibujarHielo();
    ctx.save();
    ctx.clip(delante,'evenodd');
    if (activo) {
      const x = IZQUIERDA+ANCHO*punta, y = superficie(punta,indice);
      ctx.globalAlpha = .85;
      if (mezcla !== cristal) {
        chorro(x-54,x-4,y,cristal,1,4.8);
        chorro(x+60,x+4,y,mezcla,2,5.3);
      } else {
        chorro(x+44,x,y,cristal,1,7.3);
      }
      for (let k=0; k<2; k++) {
        copos.push({x,y,vx:(Math.random()-.5)*112,vy:-40-Math.random()*70,
          vida:.31,r:1+Math.random()*2,color:k ? mezcla : '#ffeeda'});
      }
    }
    for (let i=copos.length-1; i>=0; i--) {
      const c=copos[i];
      c.vida -= dt;
      if (c.vida<=0) { copos.splice(i,1); continue; }
      c.x += c.vx*dt; c.vy += 385*dt; c.y += c.vy*dt;
      ctx.globalAlpha = Math.min(1,c.vida*6);
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.ellipse(c.x,c.y,c.r,c.r*.7,c.vx/28,0,2*Math.PI); ctx.fill();
    }
    ctx.restore();
    if (activo || energia>.15 || copos.length) solicitar();
    else anterior=0;
  }

  imagen.addEventListener('load',solicitar);
  function terminar() {
    if (!nivel && !activo) return;
    activo=false; nivel=1; mano=false; copos.length=0;
    altura.fill(0); velocidad.fill(0); solicitar();
  }
  return {
    servir(boton, instantaneo=false) {
      cristal = boton.style.getPropertyValue('--sabor-a').trim();
      mezcla = boton.style.getPropertyValue('--sabor-b').trim() || cristal;
      activo = !instantaneo && !reducido.matches;
      nivel = activo ? 0 : 1;
      objetivo=punta=.5; anterior=0; mano=false;
      altura.fill(0); velocidad.fill(0); copos.length=0; solicitar();
    },
    dirigir(u) {
      if (!activo || reducido.matches) return;
      objetivo=limitar(u,.19,.81); mano=true;
    },
    soltar() { mano=false; },
    terminar,
    get sirviendo() { return activo; }
  };
}
