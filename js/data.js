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

/* ---------------------------------------------------------------------
   PROMOCIONES (franja del inicio)
   ---------------------------------------------------------------------
   Edita, agrega o quita bloques. Cada promo tiene:
     titulo -> texto principal corto.
     texto  -> descripción breve.
     emoji  -> ícono (opcional).
   Si dejas el array vacío ([]) no se muestra la franja.
--------------------------------------------------------------------- */
const PROMOCIONES = [
  { emoji: "🔥", titulo: "Combos del día", texto: "Pide tus favoritos y ahorra." },
  { emoji: "🛵", titulo: "Domicilio rápido", texto: "A tu puerta en Cartagena del Chairá." },
  { emoji: "💬", titulo: "Pide por WhatsApp", texto: "Confirmamos tu pedido al instante." },
];

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

  {
    id: "lucarnes",
    nombre: "Piqueteadero Lucarnes",
    cat: "Parrilla",
    tiempo: "35-45 min",
    abierto: true,
    color: "#f97316",
    desc: "Perros, picadas, hamburguesas, dorilocos y más. Comida de piqueteadero para compartir.",
    logo: "",
    carta: [
      {
        sec: "Delicias",
        items: [
          { id: "lu-super-perro", n: "Super Perro", d: "Chorizo brisa, quesillo, maíz tierno, tocineta, huevos de codorniz, cebolla, ripio de papa.", p: 18000 },
          { id: "lu-perra-caliente", n: "Perra Caliente", d: "Chorizo brisa, quesillo, maíz tierno, tocineta, huevos de codorniz, pollo y carne desmechada, cebolla, ripio de papa.", p: 24000 },
          { id: "lu-patacon", n: "Patacón con Todo", d: "Quesillo, maíz tierno, tocineta, huevos de codorniz, pollo y carne desmechada, chorizo ahumado.", p: 25000 },
          { id: "lu-salchiburguer-personal", n: "Salchiburguer Personal", d: "Carne de hamburguesa, chorizo brisa, tocineta, pollo y carne desmechada, salchicha rica, papa frita, quesillo, maíz tierno, huevo de codorniz, ripio de papa, salsas.", p: 30000 },
          { id: "lu-salchiburguer-duo", n: "Salchiburguer Dúo", d: "Carne de hamburguesa, chorizo brisa, tocineta, pollo y carne desmechada, salchicha rica, papa frita, quesillo, maíz tierno, huevo de codorniz, ripio de papa, salsas.", p: 43000 },
          { id: "lu-tacos", n: "Tacos Tradicionales", d: "5 tacos. Carne desmechada, pollo desmechado, guacamole, porción de papas.", p: 24000 },
          { id: "lu-burrito-mixto", n: "Burrito Mixto", d: "Carne desmechada, pollo desmechado, guacamole, porción de papas, maíz tierno, tocineta, quesillo.", p: 23000 },
          { id: "lu-arepa-mixta", n: "Arepa Mixta", d: "Carne y pollo desmechado, carne ahumada, chorizo, maíz tierno, quesillo.", p: 18000 },
        ],
      },
      {
        sec: "Especiales",
        items: [
          { id: "lu-costilla-bbq", n: "Costilla BBQ", d: "Acompañada de papas a la francesa, croquetas de yuca y ensalada.", p: 35000 },
          { id: "lu-pechuga-gratinada", n: "Pechuga Gratinada", d: "Acompañada de papas a la francesa, croquetas de yuca y ensalada.", p: 35000 },
          { id: "lu-pechuga-plancha", n: "Pechuga a la Plancha", d: "Acompañada de papas a la francesa, croquetas de yuca y ensalada.", p: 30000 },
          { id: "lu-picada-tradicional", n: "Picada Tradicional", d: "Acompañada de papas a la francesa, croquetas de yuca y ensalada.", p: 30000 },
          { id: "lu-filete-ahumado", n: "Filete Ahumado", d: "Acompañado de papas a la francesa, croquetas de yuca y ensalada.", p: 35000 },
        ],
      },
      {
        sec: "Dorilocos",
        items: [
          { id: "lu-doriloco-mixto", n: "Doriloco Mixto", d: "Carne, huevo de codorniz, maíz tierno, quesillo, tocineta, guacamole.", p: 22000 },
          { id: "lu-doriloco-duo", n: "Doriloco Dúo", d: "Carne y pollo desmechado, Dorito grande, huevo, maíz, guacamole, tocineta, quesillo.", p: 30000 },
          { id: "lu-doriloco-huevito", n: "Doriloco Huevito", d: "Carne y pollo desmechado, Dorito pequeño, 6 huevos de codorniz, maíz, tocineta, quesillo, guacamole.", p: 25000 },
          { id: "lu-papa-loca", n: "Papa Loca", d: "Carne y pollo desmechado, chorizo brisa, huevo de codorniz, papa, maíz, tocineta, quesillo, guacamole.", p: 26000 },
        ],
      },
      {
        sec: "Hamburguesas",
        items: [
          { id: "lu-ham-tradicional", n: "Tradicional", d: "130 g de carne, lechuga, tomate, quesillo, cebolla, ripio de papa, salsas.", p: 15000 },
          { id: "lu-ham-ranchera", n: "Ranchera", d: "Huevo frito, maíz tierno, tocineta. Más 130 g de carne, lechuga, tomate, quesillo, cebolla, ripio de papa, salsas.", p: 19000 },
          { id: "lu-ham-mexicana", n: "Mexicana", d: "Tocineta, jalapeños, salsas mexicanas. Más 130 g de carne, lechuga, tomate, quesillo, cebolla, ripio de papa, salsas.", p: 18000 },
          { id: "lu-ham-fantasma", n: "Fantasma", d: "Capa de quesillo fundido, tocineta y huevo de codorniz. Más 130 g de carne, lechuga, tomate, quesillo, cebolla, ripio de papa, salsas.", p: 20000 },
          { id: "lu-ham-de-la-casa", n: "De la Casa", d: "Carne ahumada, chorizo ahumado, maíz tierno, tocineta, papas a la francesa, tajadas de maduro, huevo de codorniz. Más 130 g de carne y salsas.", p: 25000 },
        ],
      },
      {
        sec: "Adicionales",
        items: [
          { id: "lu-ad-croquetas", n: "Croquetas de Yuca", d: "Porción adicional.", p: 7000 },
          { id: "lu-ad-papas", n: "Papas a la Francesa", d: "Porción adicional.", p: 7000 },
          { id: "lu-ad-codorniz", n: "Huevos de Codorniz", d: "Porción adicional.", p: 7000 },
          { id: "lu-ad-quesillo", n: "Quesillo", d: "Porción adicional.", p: 7000 },
        ],
      },
      {
        sec: "Bebidas",
        items: [
          { id: "lu-be-hit-personal", n: "Hit Personal", d: "Jugo Hit personal.", p: 5000 },
          { id: "lu-be-hit-caja", n: "Hit Caja", d: "Jugo Hit en caja.", p: 8000 },
          { id: "lu-be-limonada-peq", n: "Jarra Limonada Pequeña", d: "Limonada natural.", p: 6000 },
          { id: "lu-be-limonada-grande", n: "Jarra Limonada Grande", d: "Limonada natural.", p: 10000 },
          { id: "lu-be-coca-15", n: "Coca Cola 1.5 L", d: "Para compartir.", p: 9000 },
          { id: "lu-be-limonada-coco", n: "Limonada de Coco", d: "Jarra de limonada de coco.", p: 15000 },
          { id: "lu-be-cerezada", n: "Cerezada", d: "Bebida de cereza.", p: 13000 },
          { id: "lu-be-postobon", n: "Postobón Personal", d: "Varios sabores.", p: 5000 },
        ],
      },
    ],
  },

  {
    id: "tricarne",
    nombre: "Tricarne",
    cat: "Hamburguesas",
    tiempo: "35-45 min",
    abierto: true,
    color: "#92400e",
    desc: "Hamburguesas en pan o plátano, perros, carnes, arepas y antojos. ¡La casa de la tricarne!",
    logo: "",
    carta: [
      {
        sec: "Hamburguesas (pan o plátano)",
        items: [
          { id: "tc-ham-sencilla", n: "Sencilla", d: "(Res/cerdo/pollo), lechuga, tomate, cebolla, queso, mortadela, ripio.", p: 16000 },
          { id: "tc-ham-hawaiana", n: "Hawaiana", d: "(Res/cerdo/pollo), lechuga, tomate, cebolla, triple queso, jamón, piña, ripio.", p: 20000 },
          { id: "tc-ham-champinera", n: "Champiñera", d: "(Res/cerdo/pollo), lechuga, tomate, cebolla, queso, mortadela, ripio, champiñones, tocineta.", p: 23000 },
          { id: "tc-ham-doble", n: "Doble Carne", d: "Doble carne (res/cerdo/pollo), lechuga, tomate, cebolla, doble queso, mortadela, ripio.", p: 22000 },
          { id: "tc-ham-especial", n: "La Especial", d: "(Res/cerdo/pollo), lechuga, tomate, cebolla, doble queso, jamón, ripio, tocineta, huevo, papas francesa.", p: 25000 },
          { id: "tc-ham-pigmento", n: "Pigmento", d: "(Res/cerdo/pollo), ají, lechuga, tomate, cebolla, queso, mortadela, ripio, ranchera, tocineta, pimentón.", p: 25000 },
          { id: "tc-ham-tricarne", n: "Tricarne", d: "Carne de res, cerdo y pollo, lechuga, tomate, cebolla, doble queso, jamón, ripio, tocineta.", p: 27000 },
          { id: "tc-ham-de-mi-tierra", n: "De Mi Tierra", d: "Doble carne (res/cerdo/pollo), lechuga, tomate, cebolla, doble queso, jamón, ripio, chorizo, tocineta, maíz, huevo, papas francesa.", p: 29000 },
          { id: "tc-ham-mechuda", n: "La Mechuda", d: "Carne de hamburguesa, carne y pollo desmechado, lechuga, tomate, cebolla, tocineta, papas francesas, jamón, doble queso, ripio, huevo de codorniz y queso gratinado.", p: 35000 },
          { id: "tc-ham-porky", n: "La Porky", d: "(Res/cerdo/pollo), panceta, lechuga, tomate, cebolla, queso, jamón y ripio.", p: 24000 },
        ],
      },
      {
        sec: "Especiales",
        items: [
          { id: "tc-esp-canoa", n: "Canoa", d: "Carne y pollo desmechado, queso, huevo, maicitos y maduro asado.", p: 20000 },
          { id: "tc-esp-tortuga", n: "Tortuga", d: "Carne de hamburguesa, papas francesas, huevos, lechuga, suizo/chorizo.", p: 21000 },
          { id: "tc-esp-megatortuga", n: "Megatortuga", d: "Carne de hamburguesa, 1 alita rellena, patacón, papa francesa, huevo, suizo/chorizo, lechuga.", p: 32000 },
          { id: "tc-esp-mazorcada", n: "Mazorcada", d: "Carne y pollo desmechada, ranchera, ripio, maicitos, maduritos y huevo.", p: 22000 },
          { id: "tc-esp-alita-rellena", n: "Alita Rellena", d: "Alita, patacón y papas francesas.", p: 20000 },
          { id: "tc-esp-alita-doble", n: "Alita Doble", d: "2 alitas, patacón y papas francesas.", p: 27000 },
          { id: "tc-esp-patacono", n: "Patacono", d: "Patacón, carne y pollo desmechada, huevo, queso, chorizo, maicitos y papas francesas.", p: 28000 },
          { id: "tc-esp-el-antojo", n: "El Antojo", d: "Rancheras, papas francesas, huevos, ripio, quesillo, carne y pollo desmechado.", p: 32000 },
          { id: "tc-esp-doriloco", n: "Doriloco", d: "Dorilocos de la casa.", p: 25000 },
        ],
      },
      {
        sec: "Carnes",
        items: [
          { id: "tc-car-plancha", n: "Carne a la Plancha", d: "Patacón y papas francesas.", p: 35000 },
          { id: "tc-car-plancha-grat", n: "Carne a la Plancha Gratinada", d: "Triple queso, patacón y papas francesas.", p: 40000 },
          { id: "tc-car-filete-pollo", n: "Filete de Pollo", d: "Patacón y papas francesas.", p: 35000 },
          { id: "tc-car-filete-pollo-grat", n: "Filete de Pollo Gratinado", d: "Triple queso, patacón y papas francesas.", p: 40000 },
          { id: "tc-car-filete-cerdo", n: "Filete de Cerdo", d: "Patacón y papas francesas.", p: 35000 },
          { id: "tc-car-filete-cerdo-grat", n: "Filete de Cerdo Gratinado", d: "Triple queso, patacón y papas francesas.", p: 40000 },
          { id: "tc-car-filete-pollo-champ", n: "Filete de Pollo con Champiñones", d: "Champiñones, patacón y papas francesas.", p: 45000 },
          { id: "tc-car-filete-pollo-haw", n: "Filete de Pollo Hawaiano", d: "Queso, jamón, piña, patacón y papas francesas.", p: 45000 },
          { id: "tc-car-combo-alitas", n: "Combo Alitas BBQ", d: "Patacón y papas francesas.", p: 45000 },
          { id: "tc-car-costilla-ahumada", n: "Costilla Ahumada", d: "Patacón y papas francesas.", p: 45000 },
          { id: "tc-car-churrasco", n: "Churrasco", d: "Patacón y papas francesas.", p: 40000 },
          { id: "tc-car-picada-personal", n: "Picada Personal", d: "Res, cerdo, pollo, salchicha, chorizo, papas francesas, patacón y huevo.", p: 40000 },
          { id: "tc-car-trasteo", n: "Trasteo", d: "Res, cerdo, pollo, salchicha, chorizo, papas francesas, patacón, huevo y costilla.", p: 60000 },
        ],
      },
      {
        sec: "Perros Calientes",
        items: [
          { id: "tc-perro-americano", n: "Americano", d: "Americana, queso, ripio y huevo.", p: 15000 },
          { id: "tc-perro-super", n: "Super Perro", d: "Americana, tocineta, doble queso, cebolla, ripio, huevo.", p: 18000 },
          { id: "tc-perro-choriperro", n: "Choriperro", d: "Doble queso, chorizo, ripio, cebolla y huevo.", p: 18000 },
          { id: "tc-perro-perra", n: "Perra", d: "Carne y pollo desmechado, queso, ripio, huevo, maicitos.", p: 20000 },
          { id: "tc-perro-hawaiano", n: "Perro Hawaiano", d: "Americana, triple queso, jamón, piña, ripio, huevo.", p: 20000 },
          { id: "tc-perro-cachorra", n: "Cachorra", d: "Rancheras, carne desmechada, doble queso, tocineta, ripio, maicitos, huevo.", p: 25000 },
        ],
      },
      {
        sec: "Arepas",
        items: [
          { id: "tc-arepa-jyq", n: "Jamón y Queso", d: "Arepa de jamón y queso.", p: 6000 },
          { id: "tc-arepa-tradicional", n: "Tradicional", d: "Carne y pollo desmechado, chicharrón, queso y huevo.", p: 14000 },
          { id: "tc-arepa-ranchera", n: "Ranchera", d: "Carne y pollo desmechado, chicharrón, ranchera, queso, maicitos y huevo.", p: 16000 },
          { id: "tc-arepa-burger", n: "Arepa Burger", d: "(Res/cerdo/pollo), lechuga, tomate, cebolla, queso, mortadela, ripio.", p: 16000 },
        ],
      },
      {
        sec: "Otros Antojos",
        items: [
          { id: "tc-ant-salchipapa", n: "Salchipapa", d: "Salchicha, papas francesas, huevos.", p: 16000 },
          { id: "tc-ant-salchipapa-grat", n: "Salchipapa Gratinada", d: "Salchicha, papas francesas, huevos, queso.", p: 20000 },
          { id: "tc-ant-choripapa", n: "Choripapa", d: "Salchicha, papas francesas, huevos.", p: 17000 },
          { id: "tc-ant-choripapa-grat", n: "Choripapa Gratinada", d: "Salchicha, papas francesas, huevos, queso.", p: 21000 },
          { id: "tc-ant-salchosuiz", n: "Salchosuiz", d: "Salchicha, chorizo, suizo, papas francesas y huevos.", p: 23000 },
          { id: "tc-ant-papas-locas", n: "Papas Locas", d: "Papas con todo.", p: 25000 },
          { id: "tc-ant-la-caquetena", n: "La Caqueteña", d: "Panceta, queso, maduro, maíz y pico de gallo.", p: 16000 },
          { id: "tc-ant-criolla", n: "Criolla", d: "Carne y pollo desmechado, chorizo, queso, maicitos, papas francesas y huevo criollo.", p: 25000 },
          { id: "tc-ant-taco-tricarne", n: "Taco Tricarne", d: "Carne de hamburguesa, queso, mortadela, tomate, lechuga y cebolla.", p: 14000 },
          { id: "tc-ant-sandwich-pollo", n: "Sándwich Pollo", d: "Sándwich de pollo.", p: 12000 },
          { id: "tc-ant-burrito", n: "Burrito", d: "Burrito de la casa.", p: 18000 },
          { id: "tc-ant-suizo", n: "Suizo", d: "Suizo.", p: 12000 },
          { id: "tc-ant-chorizo", n: "Chorizo", d: "Chorizo.", p: 12000 },
        ],
      },
      {
        sec: "Adicionales",
        items: [
          { id: "tc-ad-papas", n: "Porción de Papas", d: "Porción adicional.", p: 8000 },
          { id: "tc-ad-ensalada", n: "Porción de Ensalada", d: "Porción adicional.", p: 6000 },
          { id: "tc-ad-huevos", n: "Porción de Huevos (7 uds.)", d: "Huevos de codorniz.", p: 7000 },
          { id: "tc-ad-quesuda", n: "La Quesuda", d: "Porción de queso.", p: 8000 },
          { id: "tc-ad-yuca", n: "Porción de Yuca", d: "Porción adicional.", p: 6000 },
        ],
      },
      {
        sec: "Bebidas",
        items: [
          { id: "tc-be-limonada-agua", n: "Limonadas y Jugos en Agua", d: "Sabores: hierbabuena, piña, mango, sandía, cítrica, fresa, cereza, maracuyá, panela, frutos rojos.", p: 8000 },
          { id: "tc-be-jugo-leche", n: "Jugos en Leche", d: "Sabores: guanábana, fresa, mango, maracuyá, Milo frío, Milo caliente.", p: 9000 },
          { id: "tc-be-sodas-italianas", n: "Sodas Italianas", d: "Sabores: mango biche, maracuyá, cereza.", p: 12000 },
          { id: "tc-be-micheladas", n: "Micheladas", d: "Sabores: cereza, maracuyá, mango biche, mora azul, sandía.", p: 14000 },
          { id: "tc-be-avena", n: "Avena", d: "Vaso de avena.", p: 9000 },
          { id: "tc-be-ginger", n: "Ginger", d: "Gaseosa Ginger.", p: 8000 },
          { id: "tc-be-escarchada", n: "Escarchada", d: "Bebida escarchada.", p: 8000 },
          { id: "tc-be-soda-tricarne", n: "Soda Tricarne", d: "Soda de la casa.", p: 12000 },
          { id: "tc-be-limonada-coco", n: "Limonada de Coco", d: "Limonada de coco.", p: 15000 },
          { id: "tc-be-mangonada", n: "Mangonada", d: "Bebida de mango.", p: 15000 },
        ],
      },
    ],
  },
];
