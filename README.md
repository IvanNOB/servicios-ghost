# Servicios Ghost — Domicilios 👻

Sitio web estático de una agencia de domicilios en Colombia. Funciona como
un marketplace tipo Rappi: el cliente ve los restaurantes aliados, mira sus
cartas, arma el pedido y lo envía por **WhatsApp** a Servicios Ghost
(no hay pagos en la web).

Hecho con **HTML, CSS y JavaScript puro** (sin frameworks ni build).

## Estructura

```
index.html             Tienda / marketplace de restaurantes (inicio)
admin.html             Panel de administración (solo para ti)
css/style.css          Estilos de la tienda (Montserrat, premium negro/dorado)
css/admin.css          Estilos del panel de admin
js/data.js             Datos de respaldo (si Supabase no está configurado)
js/supabase-config.js  👈 Tus credenciales de Supabase
js/store.js            Capa de datos (Supabase o respaldo)
js/app.js              Lógica de la tienda
js/admin.js            Lógica del panel de admin
supabase-setup.sql     SQL para preparar Supabase (ejecutar 1 vez)
```

> **¿Cómo funciona?** Si configuras Supabase, los restaurantes viven en la
> nube y los editas desde `admin.html` (subiendo fotos y todo). Si NO lo
> configuras, la web sigue funcionando con los restaurantes de `data.js`.

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

---

## Panel de administración con Supabase (subir fotos y editar en la nube)

Con esto podrás agregar/editar restaurantes y **subir fotos desde tu
celular o PC**, con login seguro. Los clientes solo pueden ver; solo tú
(con sesión iniciada) puedes editar.

### Paso 1 — Crear el proyecto en Supabase (gratis)
1. Entra a **https://supabase.com** y crea una cuenta.
2. **New Project** → ponle un nombre y una contraseña de base de datos.
3. Espera a que termine de crearse (~2 min).

### Paso 2 — Preparar la base de datos y el storage
1. En tu proyecto, ve a **SQL Editor → New query**.
2. Abre el archivo **`supabase-setup.sql`** de este repo, copia TODO su
   contenido, pégalo y pulsa **Run**.
   - Esto crea la tabla `restaurantes`, el bucket `fotos` y las reglas de
     seguridad (lectura pública, escritura solo para admin).

### Paso 3 — Crear tu usuario admin
1. Ve a **Authentication → Users → Add user**.
2. Pon tu **correo** y una **contraseña**. Ese será tu acceso al panel.

### Paso 4 — Conectar la web con tu proyecto
1. En Supabase ve a **Project Settings → API** y copia:
   - **Project URL** (ej. `https://xxxx.supabase.co`)
   - **anon public** key (empieza por `eyJ...`)
2. Abre **`js/supabase-config.js`** y pégalos:
   ```js
   const SUPABASE_URL = "https://xxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ...";
   ```
   > Estos dos datos son **públicos y seguros** de poner ahí. **Nunca**
   > pongas la clave `service_role` (esa es secreta).
3. Haz commit y push a `main`. Pages se actualiza solo.

### Paso 5 — Usar el panel
1. Entra a **`https://ivannob.github.io/servicios-ghost/admin.html`**
2. Inicia sesión con el correo y contraseña del Paso 3.
3. Desde ahí puedes:
   - **+ Nuevo restaurante** → nombre, categoría, tiempo, color, descripción.
   - **📷 Subir foto** de portada desde tu dispositivo.
   - Agregar **secciones** (ej. Obleas, Bebidas) y **platos** (nombre,
     descripción, precio).
   - **Editar** o **Borrar** restaurantes existentes.
4. Lo que guardes aparece de inmediato en la tienda para los clientes.

> La URL `admin.html` no está enlazada desde la tienda, así que los
> clientes no la ven. Además, sin tu correo y contraseña nadie puede
> editar nada: las reglas de seguridad de Supabase lo impiden.

### ¿Y si no configuro Supabase?
No pasa nada: la web usa los restaurantes de `js/data.js` como respaldo y
funciona igual. El panel `admin.html` te avisará que falta configurarlo.
