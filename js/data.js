/* =====================================================================
   Servicios Ghost — Configuración y datos
   ---------------------------------------------------------------------
   Este archivo concentra TODO lo que normalmente querrás editar.
   No necesitas tocar app.js ni style.css para cambiar el negocio.
   ===================================================================== */

/* ---------------------------------------------------------------------
   NÚMERO DE WHATSAPP
   ---------------------------------------------------------------------
   Escribe el número en formato internacional SIN el signo "+",
   sin espacios y sin guiones.

   Estructura: código de país + número.
   Ejemplo para Colombia (código 57) con el celular 300 123 4567:

        573001234567

   Cambia el valor de abajo por el número real de Servicios Ghost.
--------------------------------------------------------------------- */
const WHATSAPP = "573214286626";

/* Nombre del negocio (aparece en el logo y en el mensaje de WhatsApp). */
const NOMBRE_NEGOCIO = "Servicios Ghost";

/* ---------------------------------------------------------------------
   RESTAURANTES
   ---------------------------------------------------------------------
   Para AGREGAR un restaurante nuevo, copia uno de los bloques { ... }
   de abajo, pégalo dentro del array y cambia sus valores.

   Campos de cada restaurante:
     id      -> identificador único (texto corto, sin espacios).
     nombre  -> nombre visible del restaurante.
     cat     -> categoría (se usa también para los chips de filtro).
     tiempo  -> tiempo estimado de entrega (texto libre).
     abierto -> true si está abierto, false si está cerrado.
     color   -> color de la portada cuando NO hay imagen (hex).
     desc    -> descripción corta.
     logo    -> URL de imagen de portada (opcional; deja "" si no tienes).
     carta   -> array de secciones. Cada sección tiene:
                  sec   -> nombre de la sección (ej. "Obleas").
                  items -> array de platos, cada uno con:
                             id -> identificador único del plato.
                             n  -> nombre del plato.
                             d  -> descripción corta.
                             p  -> precio en pesos (número, sin puntos).
--------------------------------------------------------------------- */
const RESTAURANTES = [
  {
    id: "obleas-y-mas",
    nombre: "Obleas y Más",
    cat: "Postres",
    tiempo: "20-30 min",
    abierto: true,
    color: "#d4af37",
    desc: "Obleas, helados y antojos dulces para endulzar el día.",
    logo: "",
    carta: [
      {
        sec: "Obleas",
        items: [
          { id: "ob-clasica", n: "Oblea clásica", d: "Arequipe, queso y crema.", p: 12000 },
          { id: "ob-mixta", n: "Oblea mixta", d: "Arequipe, mora, queso y leche condensada.", p: 15000 },
          { id: "ob-especial", n: "Oblea especial", d: "Todos los ingredientes de la casa.", p: 18000 },
        ],
      },
      {
        sec: "Helados",
        items: [
          { id: "he-vainilla", n: "Helado de vainilla", d: "Dos bolas con galleta.", p: 9000 },
          { id: "he-mixto", n: "Copa mixta", d: "Vainilla, chocolate y fresa.", p: 13000 },
        ],
      },
      {
        sec: "Bebidas",
        items: [
          { id: "be-malteada", n: "Malteada", d: "Vainilla, chocolate o fresa.", p: 11000 },
          { id: "be-jugo", n: "Jugo natural", d: "En agua o en leche.", p: 7000 },
        ],
      },
    ],
  },

  {
    id: "la-parrilla",
    nombre: "La Parrilla del Barrio",
    cat: "Parrilla",
    tiempo: "35-45 min",
    abierto: true,
    color: "#b08d2e",
    desc: "Carnes a la brasa, picadas y acompañamientos generosos.",
    logo: "",
    carta: [
      {
        sec: "Carnes",
        items: [
          { id: "pa-churrasco", n: "Churrasco", d: "Lomo de res con chimichurri.", p: 32000 },
          { id: "pa-pollo", n: "Pechuga a la plancha", d: "Pechuga con ensalada y papa.", p: 24000 },
          { id: "pa-costilla", n: "Costillas BBQ", d: "Costillas de cerdo en salsa BBQ.", p: 29000 },
        ],
      },
      {
        sec: "Picadas",
        items: [
          { id: "pa-picada1", n: "Picada personal", d: "Carne, pollo, chorizo y papa criolla.", p: 26000 },
          { id: "pa-picada2", n: "Picada para dos", d: "Surtido mixto con arepa y maduro.", p: 48000 },
        ],
      },
      {
        sec: "Bebidas",
        items: [
          { id: "pa-limonada", n: "Limonada natural", d: "Vaso grande.", p: 6000 },
          { id: "pa-gaseosa", n: "Gaseosa personal", d: "Varios sabores.", p: 5000 },
        ],
      },
    ],
  },

  {
    id: "pizza-nova",
    nombre: "Pizza Nova",
    cat: "Pizza",
    tiempo: "30-40 min",
    abierto: true,
    color: "#8a8f94",
    desc: "Pizzas artesanales horneadas al momento.",
    logo: "",
    carta: [
      {
        sec: "Pizzas",
        items: [
          { id: "pz-hawaiana", n: "Hawaiana", d: "Jamón, piña y queso mozzarella.", p: 34000 },
          { id: "pz-pepperoni", n: "Pepperoni", d: "Doble pepperoni y queso.", p: 36000 },
          { id: "pz-vegetariana", n: "Vegetariana", d: "Champiñón, pimentón, cebolla y maíz.", p: 33000 },
          { id: "pz-pollo", n: "Pollo champiñón", d: "Pollo desmechado y champiñones.", p: 37000 },
        ],
      },
      {
        sec: "Entradas",
        items: [
          { id: "pz-pan", n: "Pan al ajo", d: "Con queso gratinado.", p: 14000 },
          { id: "pz-alitas", n: "Alitas (6 und)", d: "BBQ o picantes.", p: 22000 },
        ],
      },
      {
        sec: "Bebidas",
        items: [
          { id: "pz-gaseosa15", n: "Gaseosa 1.5 L", d: "Para compartir.", p: 9000 },
        ],
      },
    ],
  },

  {
    id: "burger-rapida",
    nombre: "Burger Rápida",
    cat: "Rápida",
    tiempo: "25-35 min",
    abierto: false,
    color: "#c8ccd0",
    desc: "Hamburguesas, perros y papas. Comida rápida clásica.",
    logo: "",
    carta: [
      {
        sec: "Hamburguesas",
        items: [
          { id: "bu-sencilla", n: "Hamburguesa sencilla", d: "Carne, queso, lechuga y tomate.", p: 16000 },
          { id: "bu-doble", n: "Doble carne", d: "Doble carne y doble queso.", p: 23000 },
          { id: "bu-pollo", n: "Hamburguesa de pollo", d: "Pollo crocante y salsa de la casa.", p: 19000 },
        ],
      },
      {
        sec: "Acompañamientos",
        items: [
          { id: "bu-papas", n: "Papas a la francesa", d: "Porción personal.", p: 8000 },
          { id: "bu-perro", n: "Perro caliente", d: "Salchicha, salsas y papitas.", p: 12000 },
        ],
      },
      {
        sec: "Bebidas",
        items: [
          { id: "bu-malteada", n: "Malteada", d: "Oreo, vainilla o chocolate.", p: 13000 },
          { id: "bu-gaseosa", n: "Gaseosa personal", d: "Varios sabores.", p: 5000 },
        ],
      },
    ],
  },
];
