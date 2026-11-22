const carta = document.getElementById("vistaCarta");
const movimientoReducido = matchMedia("(prefers-reduced-motion: reduce)");
let modelo;
let localActual;
let motor;

function prepararCarta() {
  const local = carta.querySelector("[data-vaso-dbarrio]");
  if (local === localActual) return;
  localActual = local;
  modelo?.desmontar();
  modelo = undefined;
  if (!local) return;
  motor ??= import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js")
    .catch(() => undefined);
  motor.then((T) => {
    if (T && localActual === local && local.isConnected) {
      try { modelo = crearEscena(T, local); }
      catch (error) { console.warn("Vista 3D de D’Barrio no disponible", error); }
    }
  });
}

new MutationObserver(prepararCarta).observe(carta, { childList: true });
prepararCarta();

function crearEscena(T, local) {
  const escenaDOM = local.querySelector(".vaso-dbarrio__escena");
  const lienzoWebGL = document.createElement("canvas");
  const opciones = { alpha: true, antialias: true, powerPreference: "low-power" };
  const contexto = lienzoWebGL.getContext("webgl2", opciones);
  const render = contexto
    ? new T.WebGLRenderer({ ...opciones, canvas: lienzoWebGL, context: contexto })
    : crearRenderCanvas(T);
  render.setPixelRatio(Math.min(devicePixelRatio, 1.65));
  render.toneMapping = T.ACESFilmicToneMapping;
  render.toneMappingExposure = 1.16;
  const escena = new T.Scene();
  const camara = new T.PerspectiveCamera(34, 1, 0.1, 40);
  camara.position.set(0, 2.65, 6.8);
  camara.lookAt(0, 1.34, 0);

  let reflejos;
  if (contexto) {
    const estudio = new T.Scene();
    estudio.background = new T.Color("#262330");
    const paneles = [
      { p: [-3, 3, 4], s: [2.3, 5], c: "#ffffff", i: 5 },
      { p: [3, 2, -2], s: [1.8, 4], c: "#ee65bd", i: 4 },
      { p: [0, 5, -1], s: [4, 3], c: "#e8f6ff", i: 5 },
      { p: [3, 1, 4], s: [.7, 4], c: "#f4ffdc", i: 3 },
    ];
    paneles.forEach(({ p, s, c, i }) => {
      const m = new T.Mesh(new T.PlaneGeometry(...s),
        new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(i), side: T.DoubleSide }));
      m.position.set(...p);
      m.lookAt(0, 1, 0);
      estudio.add(m);
    });
    const pmrem = new T.PMREMGenerator(render);
    reflejos = pmrem.fromScene(estudio, .05);
    escena.environment = reflejos.texture;
    liberar(estudio);
    pmrem.dispose();
  }

  const ambiente = new T.HemisphereLight("#e7eaff", "#362136", 1.55);
  const principal = new T.DirectionalLight("#fff5ed", 2.9);
  principal.position.set(-3, 5, 4);
  const borde = new T.DirectionalLight("#e088ff", 1.25);
  borde.position.set(2, 3, -3);
  escena.add(ambiente, principal, borde);

  const vaso = new T.Group();
  escena.add(vaso);
  const plastico = new T.MeshPhysicalMaterial({
    color: "#eef7ff", metalness: .06, roughness: .14, transparent: true, opacity: .23,
    clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.15, depthWrite: false, side: T.DoubleSide,
  });
  const reborde = plastico.clone();
  reborde.opacity = .55;
  const lathe = (puntos, material) =>
    new T.Mesh(new T.LatheGeometry(puntos.map(([x, y]) => new T.Vector2(x, y)), contexto ? 72 : 36), material);
  const pared = lathe([[0,.03],[.44,.03],[.49,.075],[.515,.17],[.697,1.76],[.706,1.83],
    [.689,1.84],[.677,1.76],[.492,.17],[.46,.075],[0,.065]], plastico);
  pared.renderOrder = 4;
  vaso.add(pared);
  [.13, .18, 1.73, 1.78, 1.84].forEach((y) => {
    const aro = new T.Mesh(new T.TorusGeometry(.49 + y * .117, y > 1.7 ? .013 : .009, 8, 72), reborde);
    aro.rotation.x = Math.PI / 2;
    aro.position.y = y;
    aro.renderOrder = 5;
    vaso.add(aro);
  });

  let semilla = 4385;
  const azar = () => {
    semilla = (Math.imul(1664525, semilla) + 1013904223) >>> 0;
    return semilla / 4294967296;
  };
  const hieloMapa = document.createElement("canvas");
  hieloMapa.width = hieloMapa.height = 256;
  const textura = hieloMapa.getContext("2d");
  textura.fillStyle = "#858585";
  textura.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4900; i++) {
    const brillo = Math.round(76 + azar() * 179);
    textura.fillStyle = 'rgb(' + brillo + ',' + brillo + ',' + brillo + ')';
    textura.beginPath();
    textura.arc(azar() * 256, azar() * 256, .25 + azar() * 2.3, 0, Math.PI * 2);
    textura.fill();
  }
  const grano = new T.CanvasTexture(hieloMapa);
  grano.wrapS = grano.wrapT = T.RepeatWrapping;
  grano.repeat.set(2, 3);

  const tonoA = new T.Color("#78d5ee");
  const tonoB = tonoA.clone();
  const granizado = new T.Group();
  vaso.add(granizado);
  const hieloMaterial = new T.MeshPhysicalMaterial({
    color: "#ffffff", vertexColors: true, roughness: .30, clearcoat: .65,
    clearcoatRoughness: .18, map: grano, bumpMap: grano, bumpScale: .034,
  });
  const base = lathe([[0,.07],[.454,.07],[.48,.12],[.645,1.65],[.65,1.72],
    [.61,1.77],[.47,1.87],[.31,1.91],[0,1.95]], hieloMaterial);
  const posiciones = base.geometry.getAttribute("position");
  const colores = new T.BufferAttribute(new Float32Array(posiciones.count * 3), 3);
  base.geometry.setAttribute("color", colores);
  granizado.add(base);
  const cubos = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0),
    new T.MeshPhysicalMaterial({ roughness: .27, clearcoat: .95, envMapIntensity: 1.05 }), contexto ? 330 : 126);
  const matriz = new T.Object3D();
  const sitios = [];
  for (let i = 0; i < cubos.count; i++) {
    const angulo = azar() * Math.PI * 2;
    const radio = Math.sqrt(azar()) * .63;
    const y = 1.74 + Math.max(0, .19 * (1 - radio / .64)) + (azar() - .5) * .10;
    const x = Math.cos(angulo) * radio;
    matriz.position.set(x, y, Math.sin(angulo) * radio);
    const tam = .025 + azar() * .052;
    matriz.scale.set(tam, tam * (.53 + azar() * .48), tam * (.62 + azar() * .7));
    matriz.rotation.set(azar() * 7, azar() * 7, azar() * 7);
    matriz.updateMatrix();
    cubos.setMatrixAt(i, matriz.matrix);
    sitios.push({ x, brillo: .77 + azar() * .58 });
  }
  granizado.add(cubos);

  const brillo = new T.Color();
  const blanco = new T.Color("#ffffff");
  function pintarSabor(a, b) {
    tonoA.set(a);
    tonoB.set(b);
    for (let i = 0; i < posiciones.count; i++) {
      const lado = T.MathUtils.smoothstep(posiciones.getX(i), -.19, .19);
      brillo.copy(tonoA).lerp(tonoB, lado).multiplyScalar(.77 + posiciones.getY(i) * .13);
      colores.setXYZ(i, brillo.r, brillo.g, brillo.b);
    }
    colores.needsUpdate = true;
    sitios.forEach(({x, brillo: intensidad}, i) => {
      brillo.copy(tonoA).lerp(tonoB, T.MathUtils.smoothstep(x, -.17, .17));
      brillo.lerp(blanco, .14).multiplyScalar(intensidad);
      cubos.setColorAt(i, brillo);
    });
    cubos.instanceColor.needsUpdate = true;
  }

  const gotaGeo = new T.SphereGeometry(1, 9, 7);
  const gotas = new T.InstancedMesh(gotaGeo, new T.MeshPhysicalMaterial({
    color: "#fff8fb", transparent: true, opacity: .50, roughness: .11,
    metalness: .08, clearcoat: 1, depthWrite: false,
  }), contexto ? 122 : 52);
  for (let i = 0; i < gotas.count; i++) {
    const a = azar() * Math.PI * 2;
    const y = .14 + azar() * 1.56;
    const radio = .501 + y * .113;
    matriz.position.set(Math.sin(a) * radio, y, Math.cos(a) * radio);
    const s = .006 + azar() ** 2 * .022;
    matriz.scale.set(s, 1.32 * s, .56 * s);
    matriz.rotation.set(0, a, 0);
    matriz.updateMatrix();
    gotas.setMatrixAt(i, matriz.matrix);
  }
  gotas.renderOrder = 6;
  vaso.add(gotas);

  const logo = document.createElement("canvas");
  logo.width = 512;
  logo.height = 256;
  const tinta = logo.getContext("2d");
  tinta.translate(256, 130);
  tinta.rotate(-.10);
  tinta.font = "italic 900 92px system-ui";
  tinta.textAlign = "center";
  tinta.textBaseline = "middle";
  tinta.lineJoin = "round";
  tinta.strokeStyle = "#15101a";
  tinta.lineWidth = 23;
  tinta.strokeText("D’Barrio", 0, -9);
  tinta.fillStyle = "#f9f3fb";
  tinta.fillText("D’Barrio", 0, -9);
  tinta.beginPath();
  tinta.ellipse(37, 55, 123, 7, -.04, 0, Math.PI * 2);
  tinta.fillStyle = "#cbff35";
  tinta.fill();
  const etiquetaMapa = new T.CanvasTexture(logo);
  etiquetaMapa.colorSpace = T.SRGBColorSpace;
  const etiqueta = new T.Mesh(new T.CylinderGeometry(.650, .588, .54, 40, 1, true, -.79, 1.58),
    new T.MeshBasicMaterial({ map: etiquetaMapa, transparent: true, depthWrite: false }));
  etiqueta.position.y = 1.03;
  etiqueta.renderOrder = 7;
  etiqueta.userData.etiqueta = logo;
  vaso.add(etiqueta);

  const gomitas = new T.Group();
  vaso.add(gomitas);
  const gomitaGeo = new T.SphereGeometry(1, contexto ? 16 : 8, contexto ? 11 : 5);
  const figuras = ["#fb3156", "#f0991c", "#99e800", "#a43fea", "#ff6fa0"].map((color, i) => {
    const gomita = new T.Group();
    const material = new T.MeshPhysicalMaterial({ color, roughness: .28, clearcoat: .95, envMapIntensity: 1 });
    [[0,0,.08,.083],[0,.1,.065,.058],[-.05,.145,.025,.025],[.05,.145,.025,.025],
     [-.064,.005,.036,.048],[.064,.005,.036,.048],[-.042,-.064,.033,.036],[.042,-.064,.033,.036]]
      .forEach(([x, y, sx, sy]) => {
        const pieza = new T.Mesh(gomitaGeo, material);
        pieza.scale.set(sx, sy, sx * .66);
        pieza.position.set(x, y, 0);
        gomita.add(pieza);
      });
    const a = i * Math.PI * 2 / 5;
    gomita.position.set(.29 * Math.cos(a), 2.01, .29 * Math.sin(a));
    gomita.rotation.set(-.9, a, (i % 2 ? .6 : -.52));
    gomitas.add(gomita);
    return gomita;
  });

  const tapa = lathe([[0,.44],[.19,.438],[.32,.401],[.44,.32],[.56,.23],[.655,.115],[.695,.048],
    [.735,.046],[.738,0],[.705,-.015],[.704,.035],[.676,.049],[.64,.112],[.54,.22],
    [.435,.307],[.315,.385],[.185,.424],[0,.425]], plastico);
  tapa.renderOrder = 8;
  const banda = new T.Mesh(new T.TorusGeometry(.72, .018, 9, 72), reborde);
  banda.rotation.x = Math.PI / 2;
  banda.renderOrder = 9;
  tapa.add(banda);
  vaso.add(tapa);

  const canvas = render.domElement;
  canvas.className = "vaso-dbarrio__canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Vaso de granizado en 3D. Usa las flechas izquierda y derecha para girarlo.");
  const pista = document.createElement("p");
  pista.className = "vaso-dbarrio__giro";
  pista.textContent = "Arrastra para girar el vaso";
  const acciones = new AbortController();
  const escuchar = { signal: acciones.signal };
  let arrastre;
  let angulo = -.2;
  let relleno = 0, gomas = 0, cierre = 0, escala = .75;
  let meta = { visible: false, medida: .75, lleno: 0, gomas: 0, cierre: 0 };
  let saborAnterior = "";
  let raf = 0;
  let anterior = 0;
  let destruido = false;
  let activo = false;
  let medir;

  function solicitar() {
    if (!raf && !destruido) raf = requestAnimationFrame(dibujar);
  }

  function dibujar(ahora) {
    raf = 0;
    if (destruido) return;
    const dt = anterior ? Math.min(.05, (ahora - anterior) / 1000) : .016;
    anterior = ahora;
    const l = (desde, hasta, velocidad) => {
      if (movimientoReducido.matches || Math.abs(desde - hasta) < .004) return hasta;
      return T.MathUtils.lerp(desde, hasta, 1 - Math.exp(-velocidad * dt));
    };
    escala = l(escala, meta.medida, 12);
    relleno = l(relleno, meta.lleno, 7.5);
    gomas = l(gomas, meta.gomas, 12);
    cierre = l(cierre, meta.cierre, 18);
    vaso.visible = meta.visible;
    vaso.scale.setScalar(escala);
    vaso.rotation.y = l(vaso.rotation.y, angulo, 15);
    granizado.visible = relleno > .012;
    granizado.scale.y = Math.max(.001, relleno);
    gomitas.visible = gomas > .028 && meta.lleno > 0;
    figuras.forEach((figura, i) => {
      const progreso = Math.min(1, gomas * (1 + i * .10));
      figura.position.y = 1.93 + (1 - progreso) ** 2 * (1.1 + i * .13);
      figura.scale.setScalar(Math.min(1, gomas * 4));
    });
    tapa.visible = cierre > .018;
    tapa.position.y = 1.83 + (1 - cierre) * .87;
    tapa.rotation.z = (1 - cierre) * -.20;
    render.render(escena, camara);
    if (escala !== meta.medida || relleno !== meta.lleno || cierre !== meta.cierre ||
        gomas !== meta.gomas || vaso.rotation.y !== angulo) solicitar();
    else anterior = 0;
  }

  function sincronizar() {
    const medida = local.dataset.vasoMedida;
    const a = local.style.getPropertyValue("--granizado-a") || "#78d5ee";
    const b = local.style.getPropertyValue("--granizado-b") || a;
    const lleno = local.classList.contains("vaso-dbarrio--lleno");
    if (saborAnterior !== a + b) {
      if (lleno && saborAnterior) relleno = .07;
      pintarSabor(a, b);
      saborAnterior = a + b;
    }
    meta = {
      visible: Boolean(medida), medida: { 8: .76, 12: .91, 16: 1.05, fruta: .91 }[medida] || .91,
      lleno: Number(lleno), gomas: Number(local.classList.contains("vaso-dbarrio--gomas")),
      cierre: Number(local.classList.contains("vaso-dbarrio--sellado")),
    };
    pista.hidden = !meta.visible;
    canvas.tabIndex = meta.visible ? 0 : -1;
    solicitar();
  }

  const cambios = new MutationObserver(sincronizar);
  function desmontar() {
    if (destruido) return;
    destruido = true;
    if (raf) cancelAnimationFrame(raf);
    cambios.disconnect();
    medir?.disconnect();
    acciones.abort();
    canvas.remove();
    pista.remove();
    if (activo) {
      escenaDOM.classList.remove("vaso-dbarrio__escena--3d");
      escenaDOM.setAttribute("aria-hidden", "true");
    }
    liberar(escena);
    grano.dispose();
    etiquetaMapa.dispose();
    reflejos?.dispose();
    render.dispose();
  }

  try {
    canvas.addEventListener("pointerdown", (e) => {
      if (!meta.visible || (e.pointerType === "mouse" && e.button !== 0)) return;
      arrastre = { id: e.pointerId, x: e.clientX, angulo };
      canvas.setPointerCapture(e.pointerId);
    }, escuchar);
    canvas.addEventListener("pointermove", (e) => {
      if (!arrastre || arrastre.id !== e.pointerId) return;
      angulo = arrastre.angulo + (e.clientX - arrastre.x) * .012;
      solicitar();
    }, escuchar);
    canvas.addEventListener("lostpointercapture", () => { arrastre = undefined; }, escuchar);
    canvas.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      angulo += e.key === "ArrowLeft" ? -.25 : .25;
      solicitar();
    }, escuchar);
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      desmontar();
    }, escuchar);
    medir = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      render.setSize(width, height, false);
      camara.aspect = width / height;
      camara.fov = camara.aspect < .8 ? 39 : 34;
      camara.updateProjectionMatrix();
      solicitar();
    });
    escenaDOM.append(canvas, pista);
    escenaDOM.classList.add("vaso-dbarrio__escena--3d");
    escenaDOM.removeAttribute("aria-hidden");
    activo = true;
    medir.observe(canvas);
    cambios.observe(local, { attributes: true, attributeFilter: ["class", "style", "data-vaso-medida"] });
    sincronizar();
  } catch (error) {
    desmontar();
    throw error;
  }
  return { desmontar };
}

function liberar(objeto) {
  const geometrias = new Set();
  const materiales = new Set();
  objeto.traverse((nodo) => {
    if (nodo.geometry) geometrias.add(nodo.geometry);
    if (nodo.material) materiales.add(nodo.material);
  });
  geometrias.forEach((geometria) => geometria.dispose());
  materiales.forEach((material) => material.dispose());
}

// Proyecta las mismas mallas en Canvas cuando WebGL está desactivado.
function crearRenderCanvas(T) {
  const domElement = document.createElement("canvas");
  const ctx = domElement.getContext("2d");
  if (!ctx) throw new Error("Canvas no está disponible");
  const luz = new T.Vector3(-.34, .68, .65).normalize();
  const proyeccion = new T.Matrix4();
  const instancia = new T.Matrix4();
  const matriz = new T.Matrix4();
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  const normal = new T.Vector3(), arista = new T.Vector3(), vista = new T.Vector3();
  const proyectado = new T.Vector3();
  const color = new T.Color(), colorInstancia = new T.Color();
  let ancho = 0, alto = 0, densidad = 1;

  function punto(v) {
    proyectado.copy(v).applyMatrix4(proyeccion);
    return [(proyectado.x + 1) * ancho / 2, (1 - proyectado.y) * alto / 2, proyectado.z];
  }

  return {
    domElement,
    setPixelRatio(valor) { densidad = Math.min(1.4, valor); },
    setSize(w, h) {
      ancho = w;
      alto = h;
      domElement.width = Math.round(w * densidad);
      domElement.height = Math.round(h * densidad);
      ctx.setTransform(densidad, 0, 0, densidad, 0, 0);
    },
    render(escena, camara) {
      if (!ancho || !alto) return;
      escena.updateMatrixWorld();
      camara.updateMatrixWorld();
      proyeccion.multiplyMatrices(camara.projectionMatrix, camara.matrixWorldInverse);
      const caras = [];
      let logo;
      escena.traverseVisible((malla) => {
        if (!malla.isMesh) return;
        if (malla.userData.etiqueta) {
          const origen = new T.Vector3().setFromMatrixPosition(malla.matrixWorld);
          const frente = new T.Vector3(0, 0, 1).transformDirection(malla.matrixWorld);
          const haciaCamara = new T.Vector3().subVectors(camara.position, origen).normalize();
          const angulo = frente.dot(haciaCamara);
          if (angulo > .15) {
            const centro = punto(origen.addScaledVector(frente, .64));
            const punta = punto(new T.Vector3(.47, 0, .64).applyMatrix4(malla.matrixWorld));
            const base = punto(new T.Vector3(0, .24, .64).applyMatrix4(malla.matrixWorld));
            logo = { imagen: malla.userData.etiqueta, centro, w: 2 * Math.abs(punta[0] - centro[0]),
              h: 2 * Math.abs(base[1] - centro[1]) };
          }
          return;
        }
        const { geometry, material } = malla;
        const vertices = geometry.getAttribute("position");
        const colores = geometry.getAttribute("color");
        const indices = geometry.index;
        const limite = indices ? indices.count : vertices.count;
        const numero = malla.isInstancedMesh ? malla.count : 1;
        for (let n = 0; n < numero; n++) {
          matriz.copy(malla.matrixWorld);
          colorInstancia.set("#ffffff");
          if (malla.isInstancedMesh) {
            malla.getMatrixAt(n, instancia);
            matriz.multiply(instancia);
            if (malla.instanceColor) malla.getColorAt(n, colorInstancia);
          }
          for (let i = 0; i < limite; i += 3) {
            const ia = indices ? indices.getX(i) : i;
            const ib = indices ? indices.getX(i + 1) : i + 1;
            const ic = indices ? indices.getX(i + 2) : i + 2;
            a.fromBufferAttribute(vertices, ia).applyMatrix4(matriz);
            b.fromBufferAttribute(vertices, ib).applyMatrix4(matriz);
            c.fromBufferAttribute(vertices, ic).applyMatrix4(matriz);
            normal.subVectors(b, a).cross(arista.subVectors(c, a)).normalize();
            vista.subVectors(camara.position, a).normalize();
            const frente = normal.dot(vista);
            if (frente < .001) continue;
            color.copy(material.color).multiply(colorInstancia);
            if (colores) {
              color.r *= (colores.getX(ia) + colores.getX(ib) + colores.getX(ic)) / 3;
              color.g *= (colores.getY(ia) + colores.getY(ib) + colores.getY(ic)) / 3;
              color.b *= (colores.getZ(ia) + colores.getZ(ib) + colores.getZ(ic)) / 3;
            }
            const brillo = .58 + Math.max(0, normal.dot(luz)) * .58 + Math.max(0, frente) ** 12 * .34;
            color.multiplyScalar(brillo);
            const sombra = material.transparent
              ? material.opacity * (.48 + .73 * (1 - frente) + .35 * Math.max(0, normal.dot(luz)) ** 4)
              : 1;
            const p = punto(a), q = punto(b), r = punto(c);
            caras.push({ p, q, r, profundidad: (p[2] + q[2] + r[2]) / 3,
              orden: malla.renderOrder, color: "#" + color.getHexString(), sombra });
          }
        }
      });
      caras.sort((a, b) => a.orden - b.orden || b.profundidad - a.profundidad);
      ctx.clearRect(0, 0, ancho, alto);
      ctx.lineJoin = "round";
      ctx.lineWidth = .65;
      const dibujarLogo = () => {
        if (!logo || logo.w <= .1 || logo.h <= .1) return;
        const { imagen, centro, w, h } = logo;
        ctx.globalAlpha = 1;
        ctx.drawImage(imagen, centro[0] - w / 2, centro[1] - h / 2, w, h);
        logo = undefined;
      };
      for (const { p, q, r, orden, color, sombra } of caras) {
        if (orden > 7) dibujarLogo();
        ctx.globalAlpha = Math.min(1, sombra);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
        ctx.lineTo(r[0], r[1]);
        ctx.closePath();
        ctx.fill();
        if (sombra === 1) {
          ctx.strokeStyle = color;
          ctx.stroke();
        }
      }
      dibujarLogo();
      ctx.globalAlpha = 1;
    },
    dispose() { domElement.width = domElement.height = 0; },
  };
}
