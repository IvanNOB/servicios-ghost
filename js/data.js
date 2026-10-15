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

// Salsas a elegir para las alitas de ZZ Chicken Wings (sin costo extra).
const ZZ_SALSAS = [
  { nombre: "Salsa", opciones: [
    { n: "BBQ picante" },
    { n: "Miel mostaza" },
    { n: "Maracuyá" },
  ] },
];

const RESTAURANTES = [
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


  {
    id: "ricuras-de-nana",
    nombre: "Las Ricuras de Nana",
    cat: "Rápida",
    tiempo: "30-45 min",
    abierto: true,
    color: "#dc2626",
    desc: "Comidas rápidas: arepas, perros, hamburguesas, carnes y más.",
    logo: "",
    carta: [
      {
        sec: "Entradas",
        items: [
          { id: "rn-ent-huevos", n: "Porción de huevos", d: "Huevos de codorniz.", p: 7000 },
          { id: "rn-ent-papas", n: "Porción de papas", d: "Papas a la francesa.", p: 8000 },
          { id: "rn-ent-chicharrones", n: "Porción de chicharrones", d: "Porción de chicharrón.", p: 7000 },
          { id: "rn-ent-pataconas", n: "Pataconas con salsa de la casa", d: "Pataconas con salsa de la casa.", p: 7000 },
        ],
      },
      {
        sec: "Arepas",
        items: [
          { id: "rn-ar-queso-jamon", n: "Arepa con queso y jamón", d: "Queso y jamón.", p: 7000 },
          { id: "rn-ar-mixta", n: "Arepa mixta", d: "Queso, pollo, carne, chicharrón, huevo de codorniz.", p: 14000 },
          { id: "rn-ar-especial", n: "Arepa especial", d: "Queso, jamón, pollo, carne, chicharrón, maíz tierno, chorizo, huevo de codorniz.", p: 20000 },
          { id: "rn-ar-paisa", n: "Arepa paisa", d: "Queso, carne, pollo, chorizo, maíz tierno, chicharrón, maduro, huevo de codorniz.", p: 20000 },
          { id: "rn-ar-mexicana", n: "Arepa mexicana", d: "Queso, pollo, carne, chicharrón, jalapeños, huevo de codorniz.", p: 20000 },
          { id: "rn-ar-criolla", n: "Arepa criolla", d: "Queso, pollo, carne, chicharrón, maíz tierno, huevo frito, huevo de codorniz.", p: 20000 },
          { id: "rn-ar-ranchera", n: "Arepa ranchera", d: "Queso, carne, chicharrón, chorizo, huevo de codorniz.", p: 20000 },
          { id: "rn-ar-burguer", n: "Arepa burguer", d: "Queso, carne de hamburguesa, salsa de la casa, huevo de codorniz.", p: 12000 },
        ],
      },
      {
        sec: "Choripapas",
        items: [
          { id: "rn-ch-sencilla", n: "Choripapa sencilla", d: "Papa francesa, chorizo brisa, queso, huevo de codorniz.", p: 15000 },
          { id: "rn-ch-especial", n: "Choripapa especial", d: "Papa francesa, chorizo brisa, queso, tocineta, maíz tierno, huevo de codorniz.", p: 20000 },
        ],
      },
      {
        sec: "Perros Calientes",
        items: [
          { id: "rn-pe-sencillo", n: "Perro sencillo", d: "Salchicha, cebolla, ripio, queso y huevo de codorniz.", p: 15000 },
          { id: "rn-pe-especial", n: "Perro especial", d: "Chorizo, carne desmechada, cebolla, ripio, queso, tocineta, huevo de codorniz.", p: 25000 },
          { id: "rn-pe-perra", n: "Perra", d: "Carne, pollo desmechado, queso, maíz tierno, huevo de codorniz.", p: 20000 },
          { id: "rn-pe-de-la-casa", n: "Perro de la casa", d: "Papa francesa, chorizo, carne desmechada, pollo, tocineta, maduro, queso, maíz tierno, huevo de codorniz.", p: 30000 },
        ],
      },
      {
        sec: "Hamburguesas",
        items: [
          { id: "rn-ha-clasica", n: "Hamburguesa clásica", d: "Carne artesanal de res, ripio, queso, jamón, vegetales, huevo de codorniz.", p: 14000 },
          { id: "rn-ha-especial", n: "Hamburguesa especial", d: "Carne artesanal de res, queso, tocineta, carne desmechada, vegetales, ripio, huevo de codorniz.", p: 20000 },
          { id: "rn-ha-doble", n: "Hamburguesa doble carne", d: "Vegetales, ripio, queso, jamón, huevo de codorniz.", p: 23000 },
          { id: "rn-ha-sparta", n: "Hamburguesa sparta", d: "Carne artesanal de res, tocineta, queso, chorizo, ripio, vegetales, huevo de codorniz.", p: 23000 },
          { id: "rn-ha-criolla", n: "Hamburguesa criolla", d: "Carne artesanal de res, maíz tierno, huevo frito, tocineta, queso, vegetales, ripio, huevo de codorniz.", p: 20000 },
          { id: "rn-ha-mexicana", n: "Hamburguesa mexicana", d: "Carne artesanal de res, queso, tocineta, ripio, vegetales, jalapeños, huevo de codorniz.", p: 20000 },
          { id: "rn-ha-mixta", n: "Hamburguesa mixta", d: "Carne artesanal de res, pechuga, queso, tocineta, ripio, vegetales, huevo de codorniz.", p: 20000 },
          { id: "rn-ha-hawaiana", n: "Hamburguesa hawaiana", d: "Carne artesanal de res, tocineta, ripio, vegetales, piña melada, huevo de codorniz.", p: 20000 },
          { id: "rn-ha-monster", n: "Hamburguesa monster", d: "Carne artesanal de res, carne desmechada, pechuga, chorizo, tocineta, vegetales, maíz tierno, ripio, huevo de codorniz.", p: 30000 },
        ],
      },
      {
        sec: "Carnes",
        items: [
          { id: "rn-ca-lomo-cerdo", n: "Lomo cerdo", d: "Papa francesa, lechuga, tomate, huevo de codorniz.", p: 35000 },
          { id: "rn-ca-picadas", n: "Picadas", d: "Carne de cerdo, pechuga, chorizo, costilla ahumada, papa francesa, maíz tierno, lechuga, tomate, huevo de codorniz.", p: 35000 },
          { id: "rn-ca-costilla", n: "Costilla ahumada", d: "Papa francesa, lechuga, tomate, queso, maíz tierno, huevo de codorniz.", p: 30000 },
          { id: "rn-ca-chorizo-brisa", n: "Chorizo brisa", d: "Papa francesa, lechuga, tomate.", p: 12000 },
          { id: "rn-ca-pincho-cerdo", n: "Pincho de cerdo", d: "Papa francesa, lechuga, tomate, huevo de codorniz.", p: 20000 },
          { id: "rn-ca-pechuga-plancha", n: "Pechuga a la plancha", d: "Papa francesa, lechuga, tomate, huevo de codorniz.", p: 30000 },
          { id: "rn-ca-pechuga-gratinada", n: "Pechuga gratinada", d: "Papa francesa, lechuga, tomate, queso gratinado, huevo de codorniz.", p: 35000 },
          { id: "rn-ca-pechuga-hawaiana", n: "Pechuga hawaiana", d: "Papa francesa, lechuga, tomate, piña melada, huevo de codorniz.", p: 35000 },
          { id: "rn-ca-alita-rellena", n: "Alita rellena", d: "Papa a la francesa, lechuga, tomate, maíz tierno, queso, huevo de codorniz.", p: 20000 },
        ],
      },
      {
        sec: "Patacones",
        items: [
          { id: "rn-pa-con-todo", n: "Patacón con todo", d: "Carne, pollo desmechado, queso, chorizo, chicharrón, maíz tierno, huevo de codorniz.", p: 30000 },
          { id: "rn-pa-paisa", n: "Patacón paisa", d: "Carne, pollo desmechado, chicharrón, chorizo, costilla ahumada, maíz tierno, maduro, queso, huevo de codorniz.", p: 35000 },
          { id: "rn-pa-carne-desmechada", n: "Patacón carne desmechada", d: "Chorizo, maíz tierno, queso, huevo de codorniz.", p: 25000 },
          { id: "rn-pa-maduro-relleno", n: "Maduro relleno", d: "Carne, pollo desmechado, maíz tierno, chicharrón, huevo de codorniz.", p: 18000 },
          { id: "rn-pa-maduro-queso", n: "Maduro con queso y mantequilla", d: "Maduro con queso y mantequilla.", p: 8000 },
        ],
      },
      {
        sec: "Mazorcadas",
        items: [
          { id: "rn-ma-tradicional", n: "Mazorcada tradicional", d: "Carne, pollo desmechado, papa francesa, maíz tierno, queso, chicharrón, chorizo, ripio, huevo de codorniz.", p: 30000 },
          { id: "rn-ma-especial", n: "Mazorcada especial", d: "Carne de cerdo, pechuga, chorizo, queso, maíz tierno, papa francesa, huevo de codorniz.", p: 35000 },
        ],
      },
      {
        sec: "Caldo",
        items: [
          { id: "rn-cal-costilla", n: "Caldo de costilla", d: "Arroz, arepa, limonada.", p: 10000 },
          { id: "rn-cal-menudencia", n: "Caldo de menudencia", d: "Arroz, arepa, limonada.", p: 10000 },
          { id: "rn-cal-gallina", n: "Caldo de gallina", d: "Arroz, arepa, presa, limonada.", p: 20000 },
        ],
      },
      {
        sec: "Otros",
        items: [
          { id: "rn-ot-choriburro", n: "Choriburro", d: "Carne, pollo desmechado, maíz tierno, chorizo, chicharrón, queso, huevo de codorniz.", p: 25000 },
          { id: "rn-ot-burrito", n: "Burrito", d: "Carne, pollo desmechado, jamón, maíz tierno, queso, chicharrón, huevo de codorniz.", p: 20000 },
        ],
      },
      {
        sec: "Calentados",
        items: [
          { id: "rn-ce-huevo", n: "Calentado con huevo", d: "Arepa + limonada.", p: 12000 },
          { id: "rn-ce-chorizo", n: "Calentado con chorizo", d: "Arepa + limonada.", p: 16000 },
          { id: "rn-ce-cerdo", n: "Calentado con carne de cerdo", d: "Arepa + limonada.", p: 18000 },
        ],
      },
      {
        sec: "Bebidas",
        items: [
          { id: "rn-be-limonada", n: "Limonada", d: "Limonada natural.", p: 5000 },
          { id: "rn-be-jugos", n: "Jugos naturales", d: "Varios sabores.", p: 5000 },
          { id: "rn-be-cerezada", n: "Cerezada", d: "Bebida de cereza.", p: 6000 },
          { id: "rn-be-milo", n: "Milo", d: "Vaso de Milo.", p: 5000 },
          { id: "rn-be-coca", n: "Coca Cola", d: "Gaseosa.", p: 5000 },
          { id: "rn-be-hit", n: "Jugo Hit", d: "Jugo Hit.", p: 4000 },
        ],
      },
    ],
  },

  {
    id: "donatello",
    nombre: "Donatello",
    cat: "Pizza",
    tiempo: "35-50 min",
    abierto: true,
    color: "#7c3aed",
    desc: "Pizzas, hamburguesas, perros, platos especiales y mucho más.",
    logo: "",
    carta: [
      {
        sec: "Hamburguesas",
        items: [
          { id: "do-ha-clasica", n: "Clásica", d: "150g de carne de res, queso, jamón, vegetales, ripio.", p: 16000 },
          { id: "do-ha-doble", n: "Doble carne", d: "150g de carne de res o pechuga, queso, jamón, vegetales, ripio.", p: 21000 },
          { id: "do-ha-criolla", n: "Criolla", d: "150g de carne de res, huevo frito, jamón, queso, vegetales, ripio.", p: 20000 },
          { id: "do-ha-especial", n: "Especial", d: "150g de carne de res, chorizo, tocineta, jamón, queso, vegetales, ripio.", p: 21000 },
          { id: "do-ha-mexicana", n: "Mexicana", d: "150g de carne de res, ají, jalapeños, jamón, queso, vegetales, ripio.", p: 17000 },
          { id: "do-ha-hawaiana", n: "Hawaiana", d: "150g de carne de res, piña, jamón, queso, vegetales, ripio.", p: 17000 },
          { id: "do-ha-marinera", n: "Marinera", d: "150g de carne de res, tocineta, camarones, queso, jamón, vegetales, ripio.", p: 32000 },
        ],
      },
      {
        sec: "Super Combos",
        items: [
          { id: "do-co-pizza-infantil", n: "Combo de pizza infantil", d: "Pizza mini-hit mini-nucita.", p: 13000 },
          { id: "do-co-hamburguesa-infantil", n: "Combo hamburguesa infantil", d: "Hamburguesa mini-hit mini-nucita.", p: 13000 },
          { id: "do-co-mini-hamburguesas", n: "Combo mini hamburguesas", d: "6 mini hamburguesas.", p: 55000 },
          { id: "do-co-mini-mixto", n: "Combo mini mixto", d: "3 hamburguesas mini, 3 perros mini.", p: 55000 },
        ],
      },
      {
        sec: "Perros Calientes",
        items: [
          { id: "do-pe-americano", n: "Americano", d: "Pan artesanal, salchicha americana, cebolla caramelizada, ripio, queso.", p: 14000 },
          { id: "do-pe-especial", n: "Especial", d: "Pan artesanal, salchicha americana, tocineta, cebolla caramelizada, ripio, queso.", p: 16000 },
          { id: "do-pe-hawaiano", n: "Hawaiano", d: "Pan artesanal, salchicha americana, piña, cebolla caramelizada, ripio, queso.", p: 16000 },
          { id: "do-pe-infiel", n: "Infiel", d: "Carne al barril en trozos, costilla ahumada, salchicha ranchera, pechuga, queso, cebolla caramelizada, ripio.", p: 20000 },
        ],
      },
      {
        sec: "Mazorcadas",
        items: [
          { id: "do-ma-pollo", n: "Pollo", d: "Pollo desmechado, maíz tierno, ripio, papa a la francesa, chorizo brisa, queso.", p: 25000 },
          { id: "do-ma-de-la-casa", n: "De la casa", d: "Carne al barril, costilla ahumada, pechuga, chorizo brisa, maíz tierno, papa a la francesa, ripio, queso.", p: 30000 },
        ],
      },
      {
        sec: "Alitas BBQ",
        items: [
          { id: "do-al-3", n: "3 alitas", d: "Acompañadas de papa a la francesa.", p: 20000 },
          { id: "do-al-6", n: "6 alitas", d: "Acompañadas de papa a la francesa.", p: 30000 },
          { id: "do-al-10", n: "10 alitas", d: "Acompañadas de papa a la francesa.", p: 45000 },
        ],
      },
      {
        sec: "Burritos",
        items: [
          { id: "do-bu-pollo", n: "Pollo", d: "Pollo desmechado, maíz tierno, tocineta, cebolla caramelizada, ripio, queso.", p: 22000 },
          { id: "do-bu-mixto", n: "Mixto", d: "Pollo desmechado, carne, maíz tierno, cebolla caramelizada, queso, ripio, tocineta.", p: 22000 },
          { id: "do-bu-donatello", n: "Donatello", d: "Carne al barril en trozos, costilla ahumada, pechuga, salchicha ranchera, cebolla caramelizada, ripio, tocineta.", p: 30000 },
        ],
      },
      {
        sec: "Salchipapas",
        items: [
          { id: "do-sa-sencilla", n: "Sencilla", d: "Papa a la francesa, salchicha ranchera, queso.", p: 15000 },
          { id: "do-sa-especial", n: "Especial", d: "Papa a la francesa, salchicha ranchera, tocineta, queso.", p: 18000 },
          { id: "do-sa-salchiduo", n: "Salchidúo", d: "Papa a la francesa, salchicha ranchera, lechuga, ripio, carne de cerdo al barril, pollo en trozos, costilla ahumada, pollo desmechado, queso, maíz tierno.", p: 44000 },
          { id: "do-sa-salchicucharable", n: "Salchi-cucharable", d: "A base de papa criolla, salchicha caramelizada, queso, huevo codorniz.", p: 13000 },
        ],
      },
      {
        sec: "Choripapas",
        items: [
          { id: "do-chp-sencilla", n: "Sencilla", d: "Papa a la francesa, chorizo brisa, queso.", p: 15000 },
          { id: "do-chp-especial", n: "Especial", d: "Papa a la francesa, chorizo brisa, tocineta, queso.", p: 18000 },
        ],
      },
      {
        sec: "Pizzas Personales (porción en triángulo)",
        items: [
          { id: "do-pzp-donatello", n: "Donatello", d: "Trozos de costilla ahumada, res, pollo, queso.", p: 13000 },
          { id: "do-pzp-hawaiana", n: "Hawaiana", d: "Piña, jamón, queso.", p: 11000 },
          { id: "do-pzp-criolla", n: "Criolla", d: "Res, pollo, maíz tierno, queso.", p: 13000 },
          { id: "do-pzp-mexicana", n: "Mexicana", d: "Res, pollo, ají, jalapeño, picadillo, queso.", p: 13000 },
          { id: "do-pzp-pollo-champ", n: "Pollo con champiñones", d: "Pollo, champiñones, queso.", p: 13000 },
          { id: "do-pzp-tres-carnes", n: "Tres carnes", d: "Res, pollo, chorizo brisa, queso.", p: 13000 },
          { id: "do-pzp-ranchera", n: "Ranchera", d: "Res, pollo, salchicha ranchera, queso.", p: 13000 },
          { id: "do-pzp-cevichera", n: "Cevichera", d: "Pollo, res, camarones, picadillo, queso.", p: 19000 },
          { id: "do-pzp-campesina", n: "Campesina", d: "Res, pollo, maíz tierno, maduritos, queso.", p: 13000 },
          { id: "do-pzp-especial", n: "Especial", d: "Pollo, tocineta y queso.", p: 13000 },
          { id: "do-pzp-hawaiana2", n: "Hawaiana (4 porciones 20x20cm)", d: "4 porciones 20x20cm.", p: 13000 },
          { id: "do-pzp-mixta", n: "Mixta (4 porciones 20x20cm)", d: "Mitad hawaiana, mitad carne.", p: 13000 },
        ],
      },
      {
        sec: "Pizzas Familiares",
        items: [
          { id: "do-pzf-hawaiana6", n: "Hawaiana 6 porciones 30x30cm", d: "Pizza familiar.", p: 35000 },
          { id: "do-pzf-mixta6", n: "Mixta 6 porciones 30x30cm", d: "Mitad hawaiana, mitad carne.", p: 40000 },
          { id: "do-pzf-hawaiana8", n: "Hawaiana 8 porciones 40x40cm", d: "Pizza familiar.", p: 50000 },
          { id: "do-pzf-mixta8", n: "Mixta 8 porciones 40x40cm", d: "Mitad hawaiana, mitad carne.", p: 55000 },
        ],
      },
      {
        sec: "Platos Especiales",
        items: [
          { id: "do-pe-pechuga-plancha", n: "Pechuga a la plancha", d: "Papa a la francesa, lechuga, tomate.", p: 30000 },
          { id: "do-pe-pechuga-gratinada", n: "Pechuga gratinada", d: "Papa a la francesa, lechuga, tomate.", p: 35000 },
          { id: "do-pe-pechuga-hawaiana", n: "Pechuga hawaiana", d: "Piña, jamón, queso, papa a la francesa, lechuga, tomate.", p: 35000 },
          { id: "do-pe-pechuga-marinera", n: "Pechuga marinera", d: "Papa a la francesa, lechuga, tomate, camarones.", p: 45000 },
          { id: "do-pe-costilla-ahumada", n: "Costilla ahumada", d: "Papa a la francesa, lechuga, tomate.", p: 35000 },
          { id: "do-pe-lomo-cerdo", n: "Lomo de cerdo al barril", d: "Papa a la francesa, lechuga, tomate.", p: 35000 },
          { id: "do-pe-picadas", n: "Picadas carne asada al barril", d: "Carne de cerdo al barril, pechuga, costilla ahumada, chorizo brisa, papa a la francesa, platanitos.", p: 35000 },
          { id: "do-pe-patacon-mixto", n: "Patacón mixto", d: "Carne de cerdo, pechuga, chorizo brisa, costilla ahumada, lechuga, maíz tierno, queso.", p: 30000 },
          { id: "do-pe-patacon-pollo", n: "Patacón con pollo", d: "Pollo desmechado, maíz tierno, ripio, lechuga, queso.", p: 25000 },
          { id: "do-pe-chorizo-brisa", n: "Chorizo brisa", d: "Papa a la francesa gratinada con maíz tierno, lechuga, tomate.", p: 16000 },
          { id: "do-pe-ceviche-camaron", n: "Ceviche de camarón", d: "Acompañado de platanitos.", p: 30000 },
        ],
      },
      {
        sec: "Lasañas de Pasta",
        items: [
          { id: "do-la-ranchera", n: "Ranchera", d: "Res, pollo, salchicha ranchera, queso.", p: 25000 },
          { id: "do-la-marinera", n: "Marinera", d: "Res, pollo, camarones, queso.", p: 35000 },
          { id: "do-la-pollo-champ", n: "Pollo con champiñones", d: "Pollo, champiñones, queso.", p: 25000 },
          { id: "do-la-mixta", n: "Mixta", d: "Res, pollo, queso.", p: 25000 },
        ],
      },
      {
        sec: "Arepas Rellenas",
        items: [
          { id: "do-ar-mixta", n: "Mixta", d: "Carne de res y pollo desmechado, jamón, queso, chicharrón, huevo de codorniz.", p: 14000 },
          { id: "do-ar-ranchera", n: "Ranchera", d: "Carne de res y pollo desmechado, jamón, queso, chicharrón, huevo de codorniz, salchicha ranchera.", p: 16000 },
          { id: "do-ar-al-barril", n: "Al barril", d: "Carne de cerdo al barril, costilla ahumada, pechuga, salchicha ranchera, pollo, jamón, queso, huevo de codorniz.", p: 20000 },
        ],
      },
      {
        sec: "Bebidas",
        items: [
          { id: "do-be-michelada", n: "Michelada con ginger", d: "Mango biche, maracuyá, cereza, maracumango, tropical.", p: 14000 },
          { id: "do-be-limonada-casa", n: "Limonada de la casa", d: "Jarra. Vaso $4.000 / jarra 1lt $7.000 / jarra 2lt $10.000.", p: 5000 },
          { id: "do-be-cerezada", n: "Cerezada", d: "Bebida de cereza.", p: 13000 },
          { id: "do-be-coco", n: "Coco", d: "Bebida de coco.", p: 13000 },
          { id: "do-be-hierbabuena", n: "Hierbabuena", d: "Bebida de hierbabuena.", p: 13000 },
          { id: "do-be-citrica", n: "Cítrica", d: "Bebida cítrica.", p: 7000 },
          { id: "do-be-granizado-agua", n: "Granizado / Jugo en agua", d: "Café, fresa, mango, maracuyá, mora, guanábana, lulo.", p: 12000 },
          { id: "do-be-milo-frio", n: "Milo frío", d: "Vaso de Milo frío.", p: 11000 },
          { id: "do-be-coca-personal", n: "Coca Cola personal", d: "Gaseosa personal.", p: 5000 },
          { id: "do-be-coca-15", n: "Coca Cola 1.5", d: "Para compartir.", p: 10000 },
          { id: "do-be-hit", n: "Jugo Hit", d: "Jugo Hit.", p: 3000 },
          { id: "do-be-bretania", n: "Bretaña", d: "Bebida Bretaña.", p: 5000 },
          { id: "do-be-agua", n: "Agua personal", d: "Botella de agua.", p: 3000 },
        ],
      },
    ],
  },

  {
    id: "delicias-de-wily",
    nombre: "Las Delicias de Wily",
    cat: "Comida rápida y pescados",
    tiempo: "30-45 min",
    abierto: true,
    color: "#0ea5e9",
    desc: "Comidas rápidas, mariscos y pescados. Hamburguesas, perros, arroces especiales y pescado fresco.",
    logo: "",
    carta: [
      {
        sec: "Hamburguesas",
        items: [
          { id: "wi-ham-sencilla", n: "Hamburguesa Sencilla", d: "Carne, vegetales, queso, jamón, ripio (pan o plátano).", p: 12000 },
          { id: "wi-ham-doble", n: "Doble Carne", d: "2 carnes, vegetales, queso, jamón, ripio (pan o plátano).", p: 15000 },
          { id: "wi-ham-xl", n: "Burguer XL", d: "3 carnes, vegetales, queso, jamón, ripio (pan o plátano).", p: 19000 },
          { id: "wi-ham-campesina", n: "Hamburguesa Campesina", d: "3 carnes, vegetales, queso, jamón, huevo frito, ripio (pan o plátano).", p: 25000 },
          { id: "wi-ham-vegetariana", n: "Hamburguesa Vegetariana", d: "Carne de lentejas, vegetales, queso, jamón, huevo, ripio (pan o plátano).", p: 17000 },
          { id: "wi-ham-ranchera", n: "Hamburguesa Ranchera", d: "2 carnes, vegetales, maíz, queso, jamón, tocineta, chorizo, ripio.", p: 20000 },
          { id: "wi-ham-hawaiana", n: "Hamburguesa Hawaiana", d: "2 carnes, vegetales, queso, jamón, piña, ripio (pan o plátano).", p: 20000 },
          { id: "wi-ham-camaron", n: "Hamburguesa con Camarón", d: "2 carnes, vegetales, queso, jamón, camarones, ripio (pan o plátano).", p: 30000 },
        ],
      },
      {
        sec: "Perros Calientes",
        items: [
          { id: "wi-pe-sencillo", n: "Sencillo", d: "Carnes, vegetales, queso, papa a la francesa.", p: 12000 },
          { id: "wi-pe-super", n: "Súper Perro", d: "Queso, pan, chorizo, tocineta, maíz, ripio.", p: 17000 },
          { id: "wi-pe-hawaiano", n: "Hawaiano", d: "Pan, salchicha, queso, jamón, ripio, piña.", p: 15000 },
        ],
      },
      {
        sec: "Burrito",
        items: [
          { id: "wi-bu-sencillo", n: "Sencillo", d: "Carnes, vegetales, queso y papa a la francesa.", p: 15000 },
        ],
      },
      {
        sec: "Comidas Rápidas",
        items: [
          { id: "wi-cr-alitas-bbq", n: "Alitas BBQ", d: "", p: 15000 },
          { id: "wi-cr-alitas-rellenas", n: "Alitas Rellenas", d: "", p: 20000 },
          { id: "wi-cr-patacon", n: "Patacón con Todo", d: "", p: 25000 },
          { id: "wi-cr-mazorcada", n: "Mazorcada", d: "", p: 25000 },
          { id: "wi-cr-picada-carne", n: "Picada de Carne", d: "", p: 30000 },
        ],
      },
      {
        sec: "Salchipapas",
        items: [
          { id: "wi-sp-sencilla", n: "Sencilla", d: "Queso, salchicha, papa a la francesa.", p: 12000 },
          { id: "wi-sp-salchipollo", n: "Salchipollo", d: "Queso, salchicha, huevo de codorniz, maíz, papa francesa.", p: 17000 },
          { id: "wi-sp-choripollo", n: "Choripollo", d: "Queso, chorizo, pollo, maíz, papa a la francesa.", p: 17000 },
          { id: "wi-sp-choripapa", n: "Choripapa", d: "Queso, chorizo y papa a la francesa.", p: 13000 },
        ],
      },
      {
        sec: "Arroz Especial",
        items: [
          { id: "wi-ar-chino", n: "Arroz Chino", d: "", p: 20000 },
          { id: "wi-ar-paisa", n: "Arroz Paisa", d: "", p: 20000 },
          { id: "wi-ar-camarones", n: "Arroz con Camarones", d: "Pequeño $40.000 / grande $60.000.", p: 40000 },
          { id: "wi-ar-pollo-parrilla", n: "Arroz Pollo Estilo Parrilla", d: "", p: 25000 },
        ],
      },
      {
        sec: "Mariscos",
        items: [
          { id: "wi-ma-ceviche-copa", n: "Ceviche de Camarón en Copa", d: "", p: 40000 },
          { id: "wi-ma-coctel", n: "Coctel de Camarón", d: "", p: 40000 },
          { id: "wi-ma-patacon-camaron", n: "Patacón con Camarón", d: "", p: 40000 },
          { id: "wi-ma-camaron-apanado", n: "Camarón Apanado", d: "", p: 45000 },
          { id: "wi-ma-camaron-ajillo", n: "Camarón al Ajillo", d: "", p: 40000 },
          { id: "wi-ma-cazuela", n: "Cazuela de Mariscos", d: "", p: 40000 },
        ],
      },
      {
        sec: "Pescado",
        items: [
          { id: "wi-pz-salmon", n: "Salmón", d: "", p: 40000 },
          { id: "wi-pz-salmon-marinero", n: "Salmón Marinero", d: "", p: 60000 },
          { id: "wi-pz-salmon-ajillo", n: "Salmón al Ajillo", d: "", p: 50000 },
          { id: "wi-pz-trucha", n: "Trucha", d: "", p: 40000 },
          { id: "wi-pz-trucha-marinera", n: "Trucha Marinera", d: "", p: 60000 },
          { id: "wi-pz-trucha-ajillo", n: "Trucha al Ajillo", d: "", p: 50000 },
          { id: "wi-pz-milanesa", n: "Milanesa de Pescado", d: "", p: 40000 },
          { id: "wi-pz-mojarra-ahumada", n: "Mojarra Ahumada", d: "", p: 40000 },
          { id: "wi-pz-mojarra-frita", n: "Mojarra Frita", d: "", p: 30000 },
          { id: "wi-pz-mojarra-marinera", n: "Mojarra Marinera", d: "", p: 50000 },
          { id: "wi-pz-cachama-ahumada", n: "Cachama Ahumada", d: "", p: 30000 },
          { id: "wi-pz-bagre-criolla", n: "Bagre en Salsa Criolla", d: "", p: 40000 },
        ],
      },
      {
        sec: "Adiciones",
        items: [
          { id: "wi-ad-papas", n: "Porción de Papas a la Francesa", d: "", p: 7000 },
          { id: "wi-ad-codorniz", n: "Porción de Huevos de Codorniz", d: "", p: 7000 },
          { id: "wi-ad-patacon", n: "Porción de Patacón", d: "", p: 7000 },
          { id: "wi-ad-yuca", n: "Porción de Yuca", d: "", p: 7000 },
          { id: "wi-ad-ensalada", n: "Porción de Ensalada", d: "", p: 7000 },
        ],
      },
      {
        sec: "Bebidas",
        items: [
          { id: "wi-be-limonada-personal", n: "Limonada Personal", d: "", p: 5000 },
          { id: "wi-be-limonada-coco", n: "Limonada de Coco", d: "", p: 13000 },
          { id: "wi-be-cerezada", n: "Cerezada", d: "", p: 8000 },
          { id: "wi-be-jugo-agua", n: "Jugos Naturales en Agua", d: "", p: 5000 },
          { id: "wi-be-jugo-leche", n: "Jugos Naturales en Leche", d: "", p: 7000 },
        ],
      },
    ],
  },

  {
    id: "cakes-and-coffee",
    nombre: "Cakes and Coffee",
    cat: "Café y Panadería",
    tiempo: "30-45 min",
    abierto: true,
    color: "#7c3f1d",
    desc: "Café de especialidad, repostería, sándwiches gourmet, smoothies, helados y bebidas de temporada.",
    logo: "",
    carta: [
      {
        sec: "Entradas",
        items: [
          { id: "cc-ent-brushettas", n: "Brushettas x6 und", d: "Montaditos en pan artesano, queso, pollo y salsa a elección.", p: 15000 },
          { id: "cc-ent-choricitos", n: "Choricitos endiablados", d: "Chorizo en salsa agridulce picante con croquetas de yuca.", p: 20000 },
          { id: "cc-ent-patacones", n: "Patacones con hogao", d: "Tostones de plátano con hogao y queso doble crema.", p: 12000 },
          { id: "cc-ent-salchipapa", n: "Salchipapa sencilla", d: "Papas a la francesa, salchicha, queso derretido, huevo, salsas.", p: 25000 },
        ],
      },
      {
        sec: "Sándwichs",
        items: [
          { id: "cc-sa-sencillo", n: "Sencillo", d: "Pan, jamón, queso, salsa de maíz y salsa de piña.", p: 6000 },
          { id: "cc-sa-emparedado", n: "Emparedado", d: "Pan, lechuga, tomate, doble jamón, queso, salsas.", p: 9000 },
          { id: "cc-sa-gratinado", n: "Gratinado", d: "2 pisos, jamón, queso, salsa de la casa, piña y queso gratinado.", p: 14000 },
        ],
      },
      {
        sec: "Sándwich cubano",
        items: [
          { id: "cc-cu-criollo", n: "Criollo", d: "Pan francés, lechuga, tomate, carne desmechada, chorizo, maduro, queso, papitas.", p: 30000 },
          { id: "cc-cu-roastbeef", n: "Roast beef", d: "Pan francés, lechuga, tomate, res y cerdo, queso crema, pimentón, papitas.", p: 30000 },
          { id: "cc-cu-pollo-crunchy", n: "Pollo crunchy", d: "Pan francés, lechuga, tomate, pechuga apanada, queso, papitas.", p: 30000 },
          { id: "cc-cu-panini", n: "Panini de pollo y pimentón caramelizado", d: "Pan brioche, pollo desmechado, jamón, queso, pimientos, papitas.", p: 28000 },
        ],
      },
      {
        sec: "Comidas",
        items: [
          { id: "cc-co-patacon-mixto", n: "Patacón mixto", d: "Base de patacón con carne, pollo, maíz, jamón, queso y tocineta.", p: 25000 },
          { id: "cc-co-costilla-bbq", n: "Costilla BBQ", d: "300g costilla ahumada en salsa BBQ, ensalada y papas.", p: 38000 },
          { id: "cc-co-deditos", n: "Deditos de pollo", d: "Pechuga apanada en panko, papitas a la francesa y ensalada.", p: 25000 },
          { id: "cc-co-pechuga-grat", n: "Pechuga gratinada", d: "Pechuga a la plancha gratinada con jamón, queso, papas y ensalada.", p: 30000 },
          { id: "cc-co-ham-clasica", n: "Hamburguesa clásica", d: "Carne artesanal, jamón, doble queso, lechuga, tomate, salsas, papas.", p: 24000 },
          { id: "cc-co-ham-argentina", n: "Hamburguesa argentina", d: "Carne artesanal, chorizo, chimichurri, cebolla caramelizada, papas.", p: 26000 },
          { id: "cc-co-ham-casa", n: "Hamburguesa de la casa", d: "Roast beef, piña asada, tocineta, triple queso, salsas, papas.", p: 30000 },
        ],
      },
      {
        sec: "Plato de temporada",
        items: [
          { id: "cc-ts-lomo-cerdo", n: "Lomo de cerdo ahumado", d: "Lomo en salsa de vino tinto, puré de papa y ensalada.", p: 38000 },
        ],
      },
      {
        sec: "Cafés",
        items: [
          { id: "cc-cf-espresso-sencillo", n: "Espresso sencillo", d: "", p: 6000 },
          { id: "cc-cf-espresso-doble", n: "Espresso doble", d: "", p: 9000 },
          { id: "cc-cf-americano", n: "Americano", d: "", p: 6000 },
          { id: "cc-cf-con-leche", n: "Café con leche", d: "", p: 8000 },
          { id: "cc-cf-irlandes", n: "Irlandés/Francés", d: "", p: 10000 },
          { id: "cc-cf-carajillo", n: "Carajillo", d: "", p: 10000 },
          { id: "cc-cf-quesillo", n: "Café con quesillo", d: "", p: 10000 },
          { id: "cc-cf-campesino", n: "Café campesino", d: "", p: 8000 },
        ],
      },
      {
        sec: "Capuccinos",
        items: [
          { id: "cc-cap-tradicional", n: "Tradicional", d: "", p: 10000 },
          { id: "cc-cap-saborizado", n: "Canela/Macadamia/Vainilla", d: "", p: 12000 },
          { id: "cc-cap-mokaccino", n: "Mokaccino", d: "Café y chocolate.", p: 12000 },
          { id: "cc-cap-irlandes", n: "Irlandés", d: "Crema de whisky.", p: 15000 },
          { id: "cc-cap-frances", n: "Francés", d: "Ron.", p: 15000 },
          { id: "cc-cap-vienes", n: "Vienés", d: "Crema chantilly.", p: 15000 },
          { id: "cc-cap-latte-arequipe", n: "Latte con arequipe", d: "", p: 12000 },
        ],
      },
      {
        sec: "Aromáticas e infusiones",
        items: [
          { id: "cc-ar-frutos-rojos", n: "Frutos rojos", d: "", p: 9000 },
          { id: "cc-ar-frutos-verdes", n: "Frutos verdes", d: "", p: 9000 },
          { id: "cc-ar-pina-naranja", n: "Piña, naranja y limoncillo", d: "", p: 9000 },
          { id: "cc-ar-jamaica", n: "Flor de Jamaica", d: "", p: 9000 },
          { id: "cc-ar-manzana-canela", n: "Manzana-canela", d: "", p: 9000 },
          { id: "cc-ar-te-chai", n: "Té chai", d: "", p: 14000 },
        ],
      },
      {
        sec: "Tortas y postres",
        items: [
          { id: "cc-to-waffle-pandebono", n: "Waffle de pandebono", d: "Acompañado de salsa de bocadillo y dulce de leche.", p: 14000 },
          { id: "cc-to-tortas", n: "Chocolate/María Luisa/Maracuyá", d: "", p: 9000 },
          { id: "cc-to-tres-leches", n: "Tres leches", d: "", p: 10000 },
        ],
      },
      {
        sec: "Granizados",
        items: [
          { id: "cc-gr-frutales", n: "Mandarina/Naranja/Limón/Maracuyá/Mora", d: "", p: 12000 },
          { id: "cc-gr-cremosos", n: "Café/Milo/Brownie/Galleta/Frutos rojos/Coco/Vainilla", d: "", p: 14000 },
        ],
      },
      {
        sec: "Nevados (granizado + chantilly)",
        items: [
          { id: "cc-ne-cremosos", n: "Café/Milo/Brownie/Galleta/Frutos rojos/Coco/Vainilla/Caramelo", d: "", p: 16000 },
          { id: "cc-ne-macadamia", n: "Macadamia", d: "", p: 17000 },
          { id: "cc-ne-amor-perfecto", n: "Amor perfecto", d: "Granizado de café con crema de whisky.", p: 18000 },
        ],
      },
      {
        sec: "Limonadas",
        items: [
          { id: "cc-li-vino", n: "Limonada de vino", d: "", p: 14000 },
          { id: "cc-li-natural", n: "Natural", d: "", p: 6000 },
          { id: "cc-li-citricas", n: "Yerbabuena/Mandarina/Naranja", d: "", p: 10000 },
          { id: "cc-li-frutales", n: "Mango/Piña/Sandía", d: "", p: 12000 },
          { id: "cc-li-especiales", n: "Cítrica/Vino/Frutos rojos/Coco/Cerezada", d: "", p: 14000 },
        ],
      },
      {
        sec: "Jugos naturales",
        items: [
          { id: "cc-ju-agua", n: "En agua", d: "Maracuyá, fresa, mango, mora, piña, guanábana, sandía, uva, papaya.", p: 7000 },
          { id: "cc-ju-leche", n: "En leche (sorbetes)", d: "Maracuyá, fresa, mango, mora, guanábana, uva.", p: 9000 },
        ],
      },
      {
        sec: "Extractos",
        items: [
          { id: "cc-ex-mandarina", n: "Mandarina (sin hielo)", d: "", p: 14000 },
          { id: "cc-ex-naranja", n: "Naranja (sin hielo)", d: "", p: 14000 },
        ],
      },
      {
        sec: "Smoothies",
        items: [
          { id: "cc-sm-peachberry", n: "Peachberry", d: "Frutos rojos y durazno.", p: 14000 },
          { id: "cc-sm-sunset", n: "Sunset", d: "Coco, piña y durazno.", p: 14000 },
          { id: "cc-sm-paradise", n: "Paradise", d: "Piña, mandarina y mango.", p: 14000 },
          { id: "cc-sm-frutos-rojos", n: "Frutos rojos", d: "Fresa, mora, arándano y cereza.", p: 14000 },
        ],
      },
      {
        sec: "Malteadas",
        items: [
          { id: "cc-ma-todas", n: "Vainilla/Chocolate/Arequipe/Fresa/Café/Vainilla chips/Brownie", d: "", p: 16000 },
        ],
      },
      {
        sec: "Helados",
        items: [
          { id: "cc-he-payasito", n: "Payasito", d: "", p: 10000 },
          { id: "cc-he-ratoncito", n: "Ratoncito", d: "", p: 10000 },
          { id: "cc-he-pulpo", n: "Pulpo", d: "", p: 12000 },
          { id: "cc-he-yogurt", n: "Helado con yogurt", d: "", p: 14000 },
          { id: "cc-he-affogato", n: "Affogato", d: "", p: 14000 },
          { id: "cc-he-affogato-licor", n: "Affogato con licor", d: "", p: 16000 },
          { id: "cc-he-brownie", n: "Brownie con helado", d: "", p: 16000 },
          { id: "cc-he-casa", n: "Helado de la casa", d: "3 bolas de helado, fruta, chantilly, salsa de chocolate.", p: 18000 },
          { id: "cc-he-waffle", n: "Waffle con fruta y helado", d: "Kiwi, fresa, mango y uva.", p: 20000 },
        ],
      },
      {
        sec: "Otras bebidas frías",
        items: [
          { id: "cc-bf-milo", n: "Milo frío", d: "", p: 10000 },
          { id: "cc-bf-latte", n: "Latte frío", d: "", p: 15000 },
          { id: "cc-bf-te-chai", n: "Té chai frío", d: "", p: 16000 },
          { id: "cc-bf-soda", n: "Soda saborizada", d: "Tamarindo, cereza, mandarina, piña, sandía, maracuyá, otros.", p: 14000 },
          { id: "cc-bf-michelada", n: "Michelada Tropical", d: "Mango, manzana verde, fresa, uva, cerezas y gomitas.", p: 16000 },
        ],
      },
      {
        sec: "Bebidas de temporada",
        items: [
          { id: "cc-tp-golden-milk", n: "Golden Milk", d: "Leche dorada con cúrcuma, canela y un toque de miel.", p: 16500 },
          { id: "cc-tp-caramel-latte", n: "Caramel Latte", d: "Latte cremoso con caramelo artesanal.", p: 17000 },
          { id: "cc-tp-mango-matcha", n: "Mango Matcha Latte", d: "Mezcla tropical de mango con matcha y leche.", p: 17000 },
          { id: "cc-tp-tinto-verano", n: "Tinto de Verano", d: "Vino tinto con frutas cítricas y especias.", p: 18000 },
          { id: "cc-tp-soda-maracumango", n: "Soda de Maracumango", d: "Soda refrescante con maracuyá, mango y hierbabuena.", p: 16000 },
          { id: "cc-tp-pink-matcha", n: "Pink Matcha", d: "Matcha con un toque de fresa y espuma cremosa.", p: 16000 },
          { id: "cc-tp-mojito-fresa", n: "Mojito de Fresa", d: "Cóctel refrescante con ron, fresas, hierbabuena y limón.", p: 18000 },
        ],
      },
    ],
  },

  {
    id: "dulcessa",
    nombre: "Dulcessa Cafetería y Repostería",
    cat: "Cafetería",
    tiempo: "30-45 min",
    abierto: true,
    color: "#db2777",
    desc: "Cafetería y repostería: hamburguesas, sándwiches, obleas, helados, bebidas frías y calientes.",
    logo: "",
    carta: [
      {
        sec: "Hamburguesa de pan doble carne",
        items: [
          { id: "du-ham-casa", n: "De la casa", d: "Res, lechuga, tomate, cebolla, doble queso, jamón, pepinillos, salsa, papas.", p: 20000 },
        ],
      },
      {
        sec: "Sándwich",
        items: [
          { id: "du-sa-sencillo", n: "Sencillo", d: "Pan, queso, jamón, salsa piña, salsa dulce.", p: 5000 },
          { id: "du-sa-emparedado", n: "Emparedado", d: "Pan, queso, jamón, lechuga, tomate verde, salsa maíz y piña.", p: 8000 },
          { id: "du-sa-gratinado", n: "Gratinado de tres pisos", d: "Pan, queso, jamón, salsa dulce.", p: 11000 },
          { id: "du-sa-pollo", n: "Pollo", d: "Pan, pollo desmechado, queso, jamón, lechuga, tomate verde, salsa maíz.", p: 13000 },
        ],
      },
      {
        sec: "Perros calientes",
        items: [
          { id: "du-pe-sencillo", n: "Sencillo", d: "Salchicha, cebolla caramelizada, ripio, queso, salsa piña y maíz.", p: 12000 },
          { id: "du-pe-mixto", n: "Mixto", d: "Salchicha, pollo desmechado, carne res desmechada, ripio, queso, salsas.", p: 16000 },
        ],
      },
      {
        sec: "Burritos",
        items: [
          { id: "du-bu-mini-wraps", n: "Mini wraps", d: "Tortilla, queso, jamón, lechuga, tomate verde, salsa dulce.", p: 7000 },
          { id: "du-bu-pollo", n: "Pollo", d: "Pollo desmechado, queso, jamón, lechuga, tomate, salsa de la casa.", p: 18000 },
          { id: "du-bu-mixto", n: "Mixto", d: "Pollo y res desmechada, queso, jamón, lechuga, tomate, salsa de la casa.", p: 20000 },
          { id: "du-bu-carne", n: "Carne", d: "Carne de res desmechada, queso, jamón, lechuga, tomate, salsa de la casa.", p: 18000 },
          { id: "du-bu-ranchero", n: "Ranchero", d: "Lomo de res con verduras, chorizo, jamón, queso, maicitos, pico de gallo.", p: 25000 },
        ],
      },
      {
        sec: "Bebidas frías",
        items: [
          { id: "du-bf-maracuya-agua", n: "Maracuyá", d: "Jugo en agua.", p: 6000 },
          { id: "du-bf-mango-agua", n: "Mango", d: "Jugo en agua.", p: 6000 },
          { id: "du-bf-lulo-mora-agua", n: "Lulo / Mora", d: "Jugo en agua.", p: 6000 },
          { id: "du-bf-guanabana-agua", n: "Guanábana", d: "Jugo en agua.", p: 6000 },
          { id: "du-bf-fresa-agua", n: "Fresa", d: "Jugo en agua.", p: 6000 },
          { id: "du-bf-fresa-leche", n: "Fresa", d: "Jugo en leche.", p: 7000 },
          { id: "du-bf-mora-leche", n: "Mora", d: "Jugo en leche.", p: 7000 },
          { id: "du-bf-mango-leche", n: "Mango", d: "Jugo en leche.", p: 7000 },
          { id: "du-bf-guanabana-leche", n: "Guanábana", d: "Jugo en leche.", p: 7000 },
        ],
      },
      {
        sec: "Micheladas",
        items: [
          { id: "du-mi-frutos-rojos", n: "Frutos rojos", d: "Soda o Ginger.", p: 13000 },
          { id: "du-mi-cereza", n: "Cereza", d: "Soda o Ginger.", p: 13000 },
          { id: "du-mi-maracuya", n: "Maracuyá", d: "Soda o Ginger.", p: 13000 },
          { id: "du-mi-mango-viche", n: "Mango viche", d: "Soda o Ginger.", p: 13000 },
          { id: "du-mi-maracumango", n: "Maracumango", d: "Soda o Ginger.", p: 13000 },
          { id: "du-mi-lulo", n: "Lulo", d: "Soda o Ginger.", p: 13000 },
        ],
      },
      {
        sec: "Sodas italianas",
        items: [
          { id: "du-si-frutos-rojos", n: "Frutos rojos", d: "", p: 13000 },
          { id: "du-si-maracuya", n: "Maracuyá", d: "", p: 13000 },
          { id: "du-si-lulo", n: "Lulo", d: "", p: 13000 },
        ],
      },
      {
        sec: "Limonadas",
        items: [
          { id: "du-li-citrica", n: "Cítrica", d: "", p: 7000 },
          { id: "du-li-sandia", n: "Sandía", d: "", p: 7000 },
          { id: "du-li-cereza", n: "Cereza", d: "", p: 7000 },
          { id: "du-li-mango", n: "Mango", d: "", p: 7000 },
          { id: "du-li-coco", n: "Coco", d: "", p: 12000 },
        ],
      },
      {
        sec: "Otras bebidas",
        items: [
          { id: "du-ot-soda-escarchada", n: "Soda escarchada", d: "", p: 5000 },
          { id: "du-ot-ginger", n: "Ginger", d: "", p: 5000 },
          { id: "du-ot-cerveza-escarchada", n: "Cerveza escarchada", d: "", p: 7000 },
          { id: "du-ot-milo-frio", n: "Milo frío", d: "", p: 7000 },
        ],
      },
      {
        sec: "Granizados",
        items: [
          { id: "du-gr-naranja", n: "Naranja", d: "", p: 10000 },
          { id: "du-gr-mandarina", n: "Mandarina", d: "", p: 10000 },
          { id: "du-gr-mango", n: "Mango", d: "", p: 10000 },
          { id: "du-gr-maracumango", n: "Maracumango", d: "", p: 10000 },
          { id: "du-gr-guanabana", n: "Guanábana", d: "", p: 10000 },
          { id: "du-gr-sandia", n: "Sandía", d: "", p: 10000 },
          { id: "du-gr-fresa", n: "Fresa", d: "", p: 10000 },
          { id: "du-gr-maracuya", n: "Maracuyá", d: "", p: 10000 },
          { id: "du-gr-lulo", n: "Lulo", d: "", p: 10000 },
        ],
      },
      {
        sec: "Nevados",
        items: [
          { id: "du-ne-milo", n: "Milo", d: "", p: 13000 },
          { id: "du-ne-cafe", n: "Café", d: "", p: 13000 },
          { id: "du-ne-caramelo", n: "Caramelo", d: "", p: 13000 },
          { id: "du-ne-choco-frappe", n: "Choco frappe", d: "", p: 16000 },
        ],
      },
      {
        sec: "Bebidas calientes",
        items: [
          { id: "du-bc-milo", n: "Milo", d: "", p: 5000 },
          { id: "du-bc-cafe-negro", n: "Café negro", d: "", p: 1500 },
          { id: "du-bc-cafe-leche", n: "Café con leche", d: "", p: 2000 },
          { id: "du-bc-chocolate", n: "Chocolate caliente", d: "", p: 5000 },
          { id: "du-bc-capuchino", n: "Capuchino", d: "", p: 6000 },
          { id: "du-bc-americano", n: "Café americano", d: "", p: 5000 },
        ],
      },
      {
        sec: "Aromáticas frutales",
        items: [
          { id: "du-af-frutos-rojos", n: "Frutos rojos", d: "", p: 6000 },
          { id: "du-af-frutos-verdes", n: "Frutos verdes", d: "", p: 6000 },
          { id: "du-af-frutos-bosque", n: "Frutos del bosque", d: "", p: 6000 },
        ],
      },
      {
        sec: "Aromática tradicional",
        items: [
          { id: "du-at-toronjil", n: "Toronjil", d: "", p: 1500 },
          { id: "du-at-manzanilla", n: "Manzanilla", d: "", p: 1500 },
          { id: "du-at-hierbabuena", n: "Hierbabuena", d: "", p: 1500 },
          { id: "du-at-limoncillo", n: "Limoncillo", d: "", p: 1500 },
        ],
      },
      {
        sec: "Obleas",
        items: [
          { id: "du-ob-tradicional", n: "Tradicional", d: "Con arequipe.", p: 4000 },
          { id: "du-ob-noviazgo", n: "Noviazgo", d: "Con arequipe y queso.", p: 7000 },
          { id: "du-ob-frutal", n: "Obleas frutal", d: "Arequipe, queso, mango, fresa, chantilly.", p: 12000 },
          { id: "du-ob-choco", n: "Choco oblea", d: "Arequipe, queso, fresa, chantilly, chocolate.", p: 12000 },
          { id: "du-ob-amor-libre", n: "Amor libre", d: "Arequipe, queso, crema chantilly.", p: 9000 },
          { id: "du-ob-ensueno", n: "Ensueño", d: "Arequipe, queso, crema chantilly, mermelada de fresa.", p: 10000 },
        ],
      },
      {
        sec: "Helados",
        items: [
          { id: "du-he-atraccion", n: "Copa Atracción", d: "2 bolas de helado, fresa, Oreo, chantilly, chocolate.", p: 12000 },
          { id: "du-he-frutal", n: "Copa Frutal", d: "1 bola de helado, fresa, kiwi, mango, manzana, cereza, chantilly, galleta.", p: 15000 },
          { id: "du-he-ratoncito", n: "Ratoncito", d: "2 bolas de helado, Oreo, sprinkles.", p: 10000 },
          { id: "du-he-gusanito", n: "Gusanito", d: "3 bolas de helado, gomitas, barquillo, sprinkles.", p: 10000 },
          { id: "du-he-brownie", n: "Brownie con helado", d: "Brownie, helado, fresas, crema chantilly, chocolate.", p: 10000 },
          { id: "du-he-bola", n: "Bola de helado", d: "", p: 2000 },
        ],
      },
      {
        sec: "Bebidas embotelladas",
        items: [
          { id: "du-em-agua-300", n: "Agua Cristal 300 ml", d: "", p: 1000 },
          { id: "du-em-agua-600", n: "Agua Cristal 600 ml", d: "", p: 1500 },
          { id: "du-em-agua-1000", n: "Agua Cristal 1 L", d: "", p: 2500 },
          { id: "du-em-ginger-400", n: "Ginger 400 ml", d: "", p: 3000 },
          { id: "du-em-ginger-15", n: "Ginger 1.5 L", d: "", p: 5000 },
          { id: "du-em-postobon-15", n: "Gaseosa Postobón 1.5 L", d: "", p: 5000 },
          { id: "du-em-cocacola-500", n: "Coca-Cola 500 ml", d: "", p: 3500 },
          { id: "du-em-cocacola-15", n: "Coca-Cola 1.5 L", d: "", p: 7500 },
          { id: "du-em-pony", n: "Pony personal", d: "", p: 3000 },
          { id: "du-em-bretania", n: "Bretaña", d: "", p: 3000 },
          { id: "du-em-aguila", n: "Águila lata", d: "", p: 4700 },
          { id: "du-em-coronita", n: "Coronita", d: "", p: 4500 },
        ],
      },
    ],
  },

  {
    id: "antojo-house",
    nombre: "Antojo House",
    cat: "Comida rápida",
    tiempo: "30-45 min",
    abierto: true,
    color: "#ea580c",
    desc: "Comida rápida: tacos, hamburguesas, salchipapas, carnes, nachos y bebidas.",
    logo: "",
    carta: [
      {
        sec: "Entradas",
        items: [
          { id: "ah-ent-patacones", n: "Patacones con guacamole", d: "", p: 11000 },
          { id: "ah-ent-croquetas", n: "Croquetas de yuca con guacamole", d: "", p: 11000 },
          { id: "ah-ent-chorizo", n: "Chorizo con papa y aguacate", d: "", p: 11000 },
        ],
      },
      {
        sec: "Tacos",
        items: [
          { id: "ah-ta-antojo-house", n: "Antojo House", d: "Queso, aguacate, cebolla roja, carne, pollo, tocineta, queso fundido, cilantro.", p: 25000 },
          { id: "ah-ta-azteca", n: "Azteca", d: "Queso, carne desmechada, tocineta doble, guacamole, cebolla roja, cilantro.", p: 24000 },
          { id: "ah-ta-pollito", n: "Pollito consentido", d: "Queso, pollo desmechado, guacamole, queso crema, cebolla, cilantro.", p: 24000 },
          { id: "ah-ta-birria", n: "Birria house", d: "Queso fundido, birria de res cocinada, cebolla, cilantro, consomé.", p: 30000 },
          { id: "ah-ta-forajido", n: "Forajido", d: "Res picada, queso, jalapeños, trozos de aguacate, cebolla, cilantro.", p: 26000 },
        ],
      },
      {
        sec: "Hamburguesas",
        items: [
          { id: "ah-ha-volcan", n: "Volcán burger", d: "Doble carne, doble queso, cebolla o pepino caramelizado, jamón, choriza, lechuga, tomate y queso gratinado.", p: 31000 },
          { id: "ah-ha-monster", n: "Antojo monster", d: "200 g de carne, carne desmechada, queso, tocineta, aguacate, jamón, pico de gallo, cebolla o pepino, tomate, lechuga, salsa de la casa.", p: 34000 },
          { id: "ah-ha-jalapeno", n: "Jalapeño picosa", d: "150 g de carne, queso, cebolla o pepino caramelizado, jamón, tocineta, jalapeños, pimentón salteado, lechuga, tomate, salsa de la casa y papas a la francesa.", p: 27000 },
          { id: "ah-ha-clasica", n: "House clásica", d: "130 g de carne, queso, cebolla o pepino caramelizado, jamón, lechuga, tomate y salsa de la casa.", p: 17000 },
          { id: "ah-ha-mini", n: "Mini clásica", d: "75 g de carne, queso, cebolla o pepino caramelizado, jamón, lechuga y tomate.", p: 10000 },
          { id: "ah-ha-triple", n: "Triple antojo", d: "Doble carne, doble queso, carne desmechada, cebolla o pepino caramelizado, jamón, tocineta, lechuga, tomate, queso gratinado y salsa de la casa.", p: 36000 },
        ],
      },
      {
        sec: "Salchipapas",
        items: [
          { id: "ah-sa-triple", n: "Triple", d: "Papa a la francesa, chorizo, butifarra, ranchera, guacamole y huevo de codorniz.", p: 25000 },
          { id: "ah-sa-poderosa", n: "La poderosa", d: "Papa a la francesa, salchicha, carne desmechada, maíz tierno, tocineta y huevo de codorniz.", p: 28000 },
          { id: "ah-sa-clasica", n: "Clásica", d: "Papa a la francesa, salchicha, tocineta, huevo de codorniz y queso.", p: 20000 },
        ],
      },
      {
        sec: "Otros",
        items: [
          { id: "ah-ot-nuggets", n: "Nuggets de pollo", d: "Papa a la francesa, nuggets y monedas de plátano.", p: 20000 },
          { id: "ah-ot-mega-nachos", n: "Mega nachos Antojo H", d: "Nachos, carne desmechada, tocineta, frijoles con chile y carne, pico de gallo, guacamole y trozos de aguacate.", p: 38000 },
          { id: "ah-ot-ceviche", n: "Ceviche de camarones", d: "", p: 30000 },
          { id: "ah-ot-ceviche-mango", n: "Ceviche de camarones con mango", d: "", p: 35000 },
          { id: "ah-ot-patacon-forajido", n: "Patacón forajido", d: "Carne y pollo desmechado, queso, ranchera, jalapeños, aguacate, papa a la francesa.", p: 27000 },
          { id: "ah-ot-sandwich", n: "Sándwich consentido", d: "Pollo desmechado, tocineta doble, queso, lechuga, tomate.", p: 15000 },
        ],
      },
      {
        sec: "Carnes",
        items: [
          { id: "ah-ca-punta-anca", n: "Punta de anca", d: "Papa a la francesa, patacones, aguacate y chimichurri.", p: 0 },
          { id: "ah-ca-churrasco", n: "Churrasco", d: "Papa a la francesa, patacones, aguacate y chimichurri.", p: 0 },
          { id: "ah-ca-pechuga-plancha", n: "Pechuga a la plancha", d: "Papa a la francesa, patacones, aguacate.", p: 0 },
          { id: "ah-ca-pechuga-gratinada", n: "Pechuga gratinada", d: "Papa a la francesa, patacones, aguacate.", p: 0 },
          { id: "ah-ca-pechuga-suprema", n: "Pechuga suprema", d: "Champiñones y jalapeños, papa a la francesa, patacones y aguacate.", p: 0 },
        ],
      },
      {
        sec: "Jugos",
        items: [
          { id: "ah-ju-maracuya-agua", n: "Maracuyá", d: "En agua.", p: 8000 },
          { id: "ah-ju-maracuya-leche", n: "Maracuyá", d: "En leche.", p: 9000 },
          { id: "ah-ju-fresa-agua", n: "Fresa", d: "En agua.", p: 8000 },
          { id: "ah-ju-fresa-leche", n: "Fresa", d: "En leche.", p: 9000 },
          { id: "ah-ju-mora-agua", n: "Mora", d: "En agua.", p: 8000 },
          { id: "ah-ju-mora-leche", n: "Mora", d: "En leche.", p: 9000 },
          { id: "ah-ju-guanabana-agua", n: "Guanábana", d: "En agua.", p: 8000 },
          { id: "ah-ju-guanabana-leche", n: "Guanábana", d: "En leche.", p: 9000 },
          { id: "ah-ju-lulo-agua", n: "Lulo", d: "En agua.", p: 8000 },
          { id: "ah-ju-mango-agua", n: "Mango", d: "En agua.", p: 8000 },
          { id: "ah-ju-mango-leche", n: "Mango", d: "En leche.", p: 9000 },
          { id: "ah-ju-sandia-agua", n: "Sandía", d: "En agua.", p: 8000 },
          { id: "ah-ju-milo-leche", n: "Milo", d: "En leche.", p: 9000 },
        ],
      },
      {
        sec: "Granizados y limonadas",
        items: [
          { id: "ah-gr-maracuya", n: "Maracuyá", d: "", p: 8000 },
          { id: "ah-gr-fresa", n: "Fresa", d: "", p: 8000 },
          { id: "ah-gr-sandia", n: "Sandía", d: "", p: 8000 },
          { id: "ah-gr-mango", n: "Mango", d: "", p: 8000 },
          { id: "ah-gr-cereza", n: "Cereza", d: "", p: 9000 },
          { id: "ah-gr-coco", n: "Coco", d: "", p: 12000 },
          { id: "ah-gr-cafe", n: "Café", d: "", p: 16000 },
          { id: "ah-gr-milo", n: "Milo", d: "", p: 14000 },
        ],
      },
      {
        sec: "Bebidas (sal y limón)",
        items: [
          { id: "ah-sl-soda-azteca", n: "Soda azteca", d: "", p: 8000 },
          { id: "ah-sl-ginger-fuego", n: "Ginger fuego", d: "", p: 8000 },
          { id: "ah-sl-coronita", n: "Coronita bandida", d: "", p: 8000 },
          { id: "ah-sl-aguila", n: "Águila forajida", d: "", p: 8000 },
        ],
      },
      {
        sec: "Cerveza",
        items: [
          { id: "ah-ce-coronita", n: "Coronita", d: "", p: 6500 },
          { id: "ah-ce-aguila", n: "Águila", d: "", p: 6500 },
        ],
      },
      {
        sec: "Gaseosas",
        items: [
          { id: "ah-ga-personal", n: "Personal", d: "", p: 4500 },
          { id: "ah-ga-litro-medio", n: "Litro y medio", d: "", p: 8000 },
          { id: "ah-ga-3-litros", n: "3 litros", d: "", p: 12000 },
          { id: "ah-ga-ginger-15", n: "Ginger litro y medio", d: "", p: 7000 },
          { id: "ah-ga-soda", n: "Soda", d: "", p: 4000 },
          { id: "ah-ga-hit-caja", n: "Hit caja", d: "", p: 5500 },
          { id: "ah-ga-hit-personal", n: "Hit personal", d: "", p: 4500 },
          { id: "ah-ga-pony-personal", n: "Pony personal", d: "", p: 3500 },
          { id: "ah-ga-pony-mini", n: "Pony mini", d: "", p: 2500 },
          { id: "ah-ga-speed", n: "Speed", d: "", p: 2500 },
          { id: "ah-ga-agua", n: "Agua personal", d: "", p: 2500 },
        ],
      },
      {
        sec: "Micheladas",
        items: [
          { id: "ah-mi-maracuya", n: "Maracuyá", d: "Ginger, soda o cerveza.", p: 15000 },
          { id: "ah-mi-fresa", n: "Fresa", d: "Ginger, soda o cerveza.", p: 15000 },
          { id: "ah-mi-cereza", n: "Cereza", d: "Ginger, soda o cerveza.", p: 15000 },
          { id: "ah-mi-mango-biche", n: "Mango biche", d: "Ginger, soda o cerveza.", p: 15000 },
        ],
      },
    ],
  },

  {
    id: "que-fresas",
    nombre: "Qué Fresas",
    cat: "Heladería y Repostería",
    tiempo: "30-45 min",
    abierto: true,
    color: "#e11d48",
    desc: "Heladería y repostería: fresas con crema, granizados, crepes dulces y salados y plátano asado.",
    logo: "",
    carta: [
      {
        sec: "Fresas",
        items: [
          { id: "qf-fr-pequena", n: "Fresas con crema pequeña", d: "Crema casera, fresas frescas, salsas y toppings (1 topping gratis).", p: 13000 },
          { id: "qf-fr-mediana", n: "Fresas con crema mediana", d: "Crema casera, fresas frescas, salsas y toppings (2 toppings gratis).", p: 15000 },
          { id: "qf-fr-grande", n: "Fresas con crema grande", d: "Crema casera, fresas frescas, salsas y toppings (3 toppings gratis).", p: 17000 },
        ],
      },
      {
        sec: "Granizados",
        items: [
          { id: "qf-gr-cafe", n: "Café", d: "", p: 11000 },
          { id: "qf-gr-oreo", n: "Oreo", d: "", p: 11000 },
          { id: "qf-gr-chocorramo", n: "Chocorramo", d: "", p: 11000 },
        ],
      },
      {
        sec: "Crepes dulces",
        items: [
          { id: "qf-cd-platanazo", n: "Platanazo", d: "Cobertura de chocolate, leche en polvo, gomitas, leche condensada y fruta picada.", p: 12000 },
        ],
      },
      {
        sec: "Crepes salados",
        items: [
          { id: "qf-cs-1", n: "Crepe #1", d: "Pollo o carne desmechada en salsa casera, quesillo, maíz tierno, salsa de maíz.", p: 17000 },
          { id: "qf-cs-2", n: "Crepe #2", d: "Pollo o carne desmechada en salsa casera, quesillo, maíz tierno, salsa de maíz.", p: 15000 },
        ],
      },
      {
        sec: "Plátano asado",
        items: [
          { id: "qf-pa-platano", n: "Plátano asado", d: "Pollo y carne desmechada en salsa casera, mantequilla, quesillo, tocineta, salchicha parrillera, guacamole artesanal + jugo gratis del día.", p: 23000 },
        ],
      },
    ],
  },

  {
    id: "zz-chicken-wings",
    nombre: "ZZ Chicken Wings",
    cat: "Comida rápida",
    tiempo: "30-45 min",
    abierto: true,
    color: "#b91c1c",
    desc: "Alitas de pollo por orden, siempre con papas a la francesa. Elige tu salsa favorita.",
    logo: "",
    carta: [
      {
        sec: "Alitas con papas a la francesa",
        items: [
          { id: "zz-al-4", n: "Orden de 4 alitas", d: "Incluye papas a la francesa.", p: 11000, opciones: ZZ_SALSAS },
          { id: "zz-al-6", n: "Orden de 6 alitas", d: "Incluye papas a la francesa.", p: 16000, opciones: ZZ_SALSAS },
          { id: "zz-al-10", n: "Orden de 10 alitas", d: "Incluye papas a la francesa.", p: 23000, opciones: ZZ_SALSAS },
          { id: "zz-al-15", n: "Orden de 15 alitas", d: "Incluye papas a la francesa.", p: 31000, opciones: ZZ_SALSAS },
          { id: "zz-al-20", n: "Orden de 20 alitas", d: "Incluye papas a la francesa.", p: 42000, opciones: ZZ_SALSAS },
          { id: "zz-al-25", n: "Orden de 25 alitas", d: "Incluye papas a la francesa.", p: 52000, opciones: ZZ_SALSAS },
          { id: "zz-al-30", n: "Orden de 30 alitas", d: "Incluye papas a la francesa.", p: 62000, opciones: ZZ_SALSAS },
          { id: "zz-al-35", n: "Orden de 35 alitas", d: "Incluye papas a la francesa.", p: 72000, opciones: ZZ_SALSAS },
          { id: "zz-al-40", n: "Orden de 40 alitas", d: "Incluye papas a la francesa.", p: 82000, opciones: ZZ_SALSAS },
          { id: "zz-al-45", n: "Orden de 45 alitas", d: "Incluye papas a la francesa.", p: 92000, opciones: ZZ_SALSAS },
          { id: "zz-al-50", n: "Orden de 50 alitas", d: "Incluye papas a la francesa.", p: 102000, opciones: ZZ_SALSAS },
        ],
      },
    ],
  },
];
