# Servicios Ghost — Domicilios 👻

Sitio web estático de una agencia de domicilios en Colombia. Funciona como
un marketplace tipo Rappi: el cliente ve los restaurantes aliados, mira sus
cartas, arma el pedido y lo envía por **WhatsApp** a Servicios Ghost
(no hay pagos en la web).

Hecho con **HTML, CSS y JavaScript puro** (sin frameworks ni build).

## Estructura

```
index.html        Página única
css/style.css     Estilos (oscuro por defecto, claro automático)
js/data.js        👈 Configuración y datos (lo que vas a editar)
js/app.js         Lógica de la app
```

## 1) Cambiar el número de WhatsApp

Abre `js/data.js` y edita la constante `WHATSAPP`. El número va en
**formato internacional, sin el signo `+`**, sin espacios ni guiones:

```js
// Colombia (57) + celular 300 123 4567:
const WHATSAPP = "573001234567";
```

Cámbialo por el número real de Servicios Ghost y guarda.

## 2) Agregar o editar restaurantes

Todo vive en el array `RESTAURANTES` de `js/data.js`. Para **agregar uno
nuevo basta con copiar un bloque `{ ... }`**, pegarlo dentro del array y
cambiar sus valores:

```js
{
  id: "mi-restaurante",      // identificador único, sin espacios
  nombre: "Mi Restaurante",
  cat: "Pizza",              // también genera el chip de categoría
  tiempo: "30-40 min",
  abierto: true,             // false = aparece como "Cerrado"
  color: "#3b82f6",          // color de la portada si no hay imagen
  desc: "Descripción corta.",
  logo: "",                  // URL de imagen (opcional). "" = portada con iniciales
  carta: [
    {
      sec: "Sección",
      items: [
        { id: "plato-1", n: "Nombre del plato", d: "Descripción.", p: 15000 },
      ],
    },
  ],
}
```

Notas:
- Los `id` (del restaurante y de cada plato) deben ser **únicos**.
- Los precios (`p`) son números **sin puntos** (`15000`, no `15.000`).
- Si no pones `logo`, se dibuja una portada con degradado del `color` y las iniciales.
- Para que un restaurante salga como cerrado, usa `abierto: false`
  (sus botones "Agregar" quedan deshabilitados).

## 3) Publicarlo (sitio estático)

El sitio no necesita servidor ni compilación: son archivos estáticos.

### Opción A — GitHub Pages
1. Sube estos archivos a un repositorio de GitHub.
2. En el repo: **Settings → Pages**.
3. En *Source* elige la rama (`main`) y la carpeta `/root`.
4. Guarda. En un par de minutos tendrás la URL pública.

### Opción B — Render (Static Site)
1. Crea un servicio **Static Site** en Render conectado a tu repositorio.
2. **Build Command:** déjalo vacío.
3. **Publish Directory:** `.` (la raíz, donde está `index.html`).
4. Deploy.

### Probar en local
Abre `index.html` directamente en el navegador, o sirve la carpeta:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```
```
