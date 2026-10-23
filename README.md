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
css/style.css          Estilos de la tienda (negro, dorado y plata)
css/admin.css          Estilos del panel de admin
js/data.js             Datos de respaldo (si Supabase no está configurado)
js/supabase-config.js  👈 Tus credenciales de Supabase
js/store.js            Capa de datos (Supabase o respaldo)
js/app.js              Lógica de la tienda
js/admin.js            Lógica del panel de admin
supabase-setup.sql     SQL para preparar Supabase (ejecutar 1 vez)
supabase-pedidos.sql   SQL de la tabla de pedidos (ejecutar 1 vez)
supabase-mejoras.sql   SQL de horarios, ajustes, seguimiento y aliados (ejecutar 1 vez)
js/importar.js         "Pegar carta": convierte texto de ChatGPT en carta
manifest.webmanifest   App instalable (ícono, nombre, colores)
sw.js                  Service worker: la app abre aunque la señal esté mala
assets/icon-*.png      Íconos de la app · assets/logo-sm.png: logo flotante
assets/og.jpg          Vista previa al compartir el enlace (WhatsApp, Facebook)
sitemap.xml            Mapa del sitio para Google (Search Console)
```

## ⚡ Activar las mejoras (una sola vez)

1. Supabase → **SQL Editor → New query** → pega **todo** `supabase-mejoras.sql` → **Run**.
   La primera vez, los usuarios que ya existen quedan como **administradores**.
2. Supabase → **Authentication → Sign In / Providers → Email** → desactiva
   **"Allow new users to sign up"**. Así solo tú creas cuentas.
3. Recarga `admin.html`. Si falta algo, el panel muestra un aviso amarillo diciendo qué.

Sin este paso la web sigue funcionando como antes; solo quedan apagadas las
funciones nuevas que necesitan la base de datos.

## Qué hay en el panel

| Pestaña | Para qué |
|---|---|
| 🍽️ Restaurantes | Cartas, fotos de platos, **horario** (se abre/cierra solo, hora de Colombia), opciones por plato (salsa, tamaño), "Pegar carta". |
| 🍳🍲 Menú del día | Publicar cada día el **desayuno** y/o el **almuerzo** de cada lugar, con opciones y foto. El cliente arma el suyo. Se oculta solo al día siguiente. |
| 📋 Pedidos | Filtra por **Hoy / Últimas 24 h / Ayer / 7 días / mes / día exacto** y por **hora** (8 p. m., 9 p. m.…), con contadores en cada filtro y agrupados por fecha. Cambia el estado (el cliente lo ve en "Seguir mi pedido") y borra pedidos de prueba. El aliado solo puede borrar pedidos **cancelados** que sean exclusivamente de su negocio. |
| 📊 Ventas | Ventas **entregadas**, comisión, por restaurante, platos más vendidos, horas pico, descarga **CSV** (Excel). Al abrirla se actualiza "Lo más pedido" en la tienda. |
| ⚙️ Ajustes | **Domicilio por barrio y por horario**, promociones del inicio, % de comisión y **cuentas de aliados**. |

- **🔔 Activar avisos** (arriba): suena y muestra una notificación cuando llega un pedido. Deja la pestaña abierta.
- **Datos para transferencia**: en la ficha de cada negocio escribes su Nequi, Daviplata o cuenta bancaria. El cliente lo ve al elegir **Transferencia** como forma de pago.
- **Cuentas de aliados**: crea la cuenta en Supabase → *Authentication → Users → Add user*
  (marca *Auto Confirm User*), luego en *Ajustes → Cuentas de aliados* asígnale su restaurante.
  El aliado entra al mismo `admin.html` y solo ve **su** carta y su almuerzo del día.
  Lo que ves en Ventas tampoco lo ve el aliado.
  Para que un aliado pueda borrar sus pedidos **cancelados**, vuelve a ejecutar
  `supabase-pedidos-aliados.sql` (no puede borrar pedidos activos ni compartidos
  con otros negocios).

## Qué ve el cliente

- Estado real de cada restaurante: "Abierto · Hasta las 10 pm", "Cerrado · Abre mañana 11 am".
- Al pedir, elige su barrio y ve **domicilio y total a pagar**. La web recuerda sus datos.
- Cada pedido tiene un **código** (GH-XXXXXX) y un enlace para **seguir el pedido**.
- Botones **🍳 Desayunos** y **🍲 Almuerzos** en el inicio y sección **Menú del día** donde arma el suyo.
- **⭐ Recomendado**: un plato con foto a todo lo ancho, elegido al azar (cambia solo). Solo usa platos que tengan foto.
- Las fotos de los platos se pueden tocar para verlas en grande.
- **Repetir mi último pedido**, sección **🔥 Lo más pedido**.
- Se puede **instalar como app** (botón "📲 Instalar app" en Android; en iPhone: Compartir → Agregar a inicio).

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
