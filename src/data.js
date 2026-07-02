// Fonte única de dados da Bentô Functional Nutrition — consumida pelo app (App.jsx),
// pelos geradores de ficha técnica (scripts/) e por material derivado.
// NÃO duplique estes dados em outro lugar: edite apenas aqui.

// Base dos GELATOS — denominação brand-free p/ rotulagem (RDC 727/2022).
// Insumo comercial de referência: "Base FRUTA 300 ZERO" (ficha técnica Ice Cream
// Mix Italia, rev. 31/05/2026). Zero açúcar; 65 g de polióis/100 g; sem alérgenos
// de declaração obrigatória.
// PENDENTE-AUDITORIA: "emulsificante" sem nome específico/INS — obter da ficha
// do fornecedor (RDC 727/2022 exige função + nome ou nº INS do aditivo).
export const BASE_NOME = "Preparado em pó para gelato";
export const BASE = "Maltitol, sorbitol, polidextrose, gordura vegetal, emulsificante, goma guar, carboximetilcelulose sódica (CMC) e goma tara";

// Base reformulada dos PICOLÉS (Bentôlé) — SEM polióis laxativos (maltitol/
// sorbitol), logo sem advertência de efeito laxativo pela base. Nome comercial
// interno de referência: "Base Funcional ZERO".
export const BASE_PICOLE_NOME = "Preparado em pó para picolé";
export const BASE_PICOLE = "Inulina, polidextrose, stévia e goma tara";

// Composições AUDITADAS nas fichas dos fornecedores (docs/fichas-fornecedores/):
// · Pasta sabor leite = ex-"Lattíssimo" (Aromitalia "Mesclado Lattissimo Senza
//   Peccato", ESP-955603 rev. 000, 23/04/2025). Sem adição de açúcar, sem dextrose.
//   CONTÉM LEITE e lactose; soja apenas em "pode conter"; sem glúten. Tem MALTITOL.
export const PASTA_LEITE = "Leite em pó integral, óleo vegetal, soro de leite em pó, gordura vegetal, manteiga de cacau, edulcorante maltitol (INS 965), polidextrose (INS 1200), emulsificante lecitina de girassol (INS 322(i)) e aromatizante";
// · Preparado de cacau = ex-"Gianduiella 50" (Aromitalia "Gianduiella 50 Senza
//   Peccato", ESP-955801 rev. 000, 26/05/2025). Sem adição de açúcares, sem dextrose.
//   SEM ALÉRGENOS: não contém avelã, leite nem soja (apesar do nome "gianduia" —
//   sabor vem de aromatizante). Tem MALTITOL e ERITRITOL. (A ficha grafa eritritol
//   como "INS 915"; o INS usual do eritritol é 968 — conferir com o fornecedor.)
export const PREPARADO_CACAU = "Cacau em pó, edulcorantes maltitol (INS 965) e eritritol, antiumectante dióxido de silício (INS 551) e aromatizante";
// · Doce de leite = Veneza "Doce de Leite Zero Adição de Açúcares" (rótulo do
//   fabricante, venezalacteos.com.br — NÃO confundir com o Tradicional, que tem
//   açúcar). Sem adição de açúcares ✔. CONTÉM LEITE e lactose. Tem MALTITOL e
//   eritritol. Rótulo avisa "Diabéticos: contém glicose".
export const DOCE_LEITE_ZERO = "Leite pasteurizado integral, edulcorantes maltitol, eritritol, polidextrose e sucralose, estabilizante citrato de sódio e conservador sorbato de potássio";

/* ===== PENDENTE-AUDITORIA (insumos compostos ainda sem ficha do fornecedor) =====
   Verificar DEXTROSE/açúcares ocultos (invalidariam "sem adição de açúcares") e
   MALTITOL (polióis → advertência laxativa) nas fichas que faltam:
   · Chocolates e stracciatella "sem adição de açúcares" — ex-linha "Lukau Zero"
   · Creme de pistache (ex-"Creme de Pistache G") · Pasta de pistache (ex-"Selection")
   · Preparado para sorbet de limão — ex-"Base Limone 50"
   · Biscoito tipo cookie sem adição de açúcares — ex-"Cookies Zero"
   · "Castanhas" (Opereta) — RDC 26/2015 exige a espécie (caju? do-pará?)
   · "Emulsificante" da base de gelato sem nome/INS na composição declarada
   RESOLVIDOS: Lattíssimo, Gianduiella, Doce de leite zero (consts acima); leite
   confirmado como LEITE EM PÓ DESNATADO (produção, 02/07/2026).
   Alulose: AUSENTE de todas as listas e fichas auditadas (proibida pela ANVISA). */

export const PRODUCTS = [
  { id:"ninho-nutella", name:"Ninho com Nutella", category:"gelato", sub:"Cremoso avelã & leite", emoji:"🍫",
    moods:["indulgente","comfort"], palette:{base:"#E8C896",mid:"#C49862",deep:"#7B5328",swirl:"#3E2511",hl:"#FFF1D8"}, image:null,
    serving:100, portionLabel:"100 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"250 g"},{name:"Preparado de cacau sabor gianduia",qty:"400 g",note:PREPARADO_CACAU}],
    nutrition:{kcal:120,carbs:21,sugars:1.8,addedSugars:0,protein:5.7,fat:4.0,satFat:0.8,transFat:0,fiber:0.8,sodium:8},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"O clássico reinventado sem açúcar adicionado. Cremoso italiano com avelã e creme de gianduia enriquecido com whey hidrolisado." },
  { id:"limao-siciliano", name:"Limão Siciliano", category:"gelato", sub:"Sorbet funcional", emoji:"🍋",
    moods:["refrescante","leve","zerocal"], palette:{base:"#F4E78A",mid:"#D9C447",deep:"#8B7A1E",swirl:"#5C5114",hl:"#FFF8C4"}, image:null,
    serving:100, portionLabel:"100 g",
    ingredients:[{name:BASE_NOME,qty:"1.050 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Preparado para sorbet de limão",qty:"100 g"},{name:"Colágeno Hidrolisado",qty:"50 g"}],
    nutrition:{kcal:68,carbs:15,sugars:2.1,addedSugars:1.4,protein:1.2,fat:0,satFat:0,transFat:0,fiber:14,sodium:14},
    flags:{gluten:false,lactose:false}, yield:"2.000 mL",
    description:"Sorbet de limão siciliano com colágeno hidrolisado. Zero gordura, alta fibra. O gelato mais leve do cardápio." },
  { id:"extra-dark", name:"Extra Dark", category:"gelato", sub:"Cacau intenso 100%", emoji:"🖤",
    moods:["zerocal","leve","premium"], palette:{base:"#5A3A22",mid:"#3A2418",deep:"#1A0E08",swirl:"#0A0503",hl:"#A87545"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Cacau em pó",qty:"250 g"}],
    nutrition:{kcal:70,carbs:20,sugars:0.1,addedSugars:0.1,protein:1.2,fat:0.8,satFat:0.5,transFat:0,fiber:2.2,sodium:1.24},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"Apenas 70 kcal por porção. Cacau puro de alta intensidade, zero lactose, zero glúten. Para quem não abre mão do chocolate." },
  { id:"pacoca", name:"Paçoca", category:"gelato", sub:"Amendoim cremoso", emoji:"🥜",
    moods:["postreino","comfort","proteina"], palette:{base:"#D9B574",mid:"#B08A48",deep:"#6E5224",swirl:"#3E2D11",hl:"#F2DDA8"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"420 g"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Pasta de amendoim",qty:"420 g"}],
    nutrition:{kcal:166,carbs:22,sugars:5.1,addedSugars:0,protein:13,fat:7.7,satFat:2.7,transFat:0,fiber:0.6,sodium:86},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"13g de proteína por porção. Pasta de amendoim de verdade com whey WPH. Pós-treino que parece sobremesa." },
  { id:"chocolate-branco", name:"Chocolate Branco", category:"gelato", sub:"Veludo lácteo", emoji:"🤍",
    moods:["indulgente","comfort","proteina"], palette:{base:"#F4EAD2",mid:"#E0CFA8",deep:"#A8916A",swirl:"#6E5C3D",hl:"#FFF8E8"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"420 g"},{name:"Pasta sabor leite",qty:"250 g",note:PASTA_LEITE}],
    nutrition:{kcal:144,carbs:23,sugars:5.4,addedSugars:0,protein:11,fat:5.2,satFat:2.4,transFat:0,fiber:0.3,sodium:51},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"Textura aveludada com Latissimo e whey WPH. 11g de proteína, sem açúcar adicionado. Suavidade sem culpa." },
  { id:"coco", name:"Coco", category:"gelato", sub:"Tropical cremoso", emoji:"🥥",
    moods:["refrescante","comfort"], palette:{base:"#FBF7EE",mid:"#E5DCC5",deep:"#A89C7C",swirl:"#5E5440",hl:"#FFFFFF"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"250 g"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Leite de coco em pó",qty:"280 g"}],
    nutrition:{kcal:159,carbs:22,sugars:3.8,addedSugars:0,protein:6.7,fat:5.5,satFat:4.2,transFat:0,fiber:0,sodium:41},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"Leite de coco em pó real com textura densa e aroma tropical. Sem açúcar adicionado, sem glúten." },
  { id:"chocolate-dubai", name:"Chocolate Dubai", category:"gelato", sub:"Cacau · pistache · kadaif", emoji:"✨",
    moods:["premium","indulgente","proteina"], palette:{base:"#5A3D24",mid:"#3A2614",deep:"#1F1408",swirl:"#A4B96A",hl:"#D4B074"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"420 g"},{name:"Cacau em pó",qty:"250 g"},{name:"Creme de pistache",qty:"200 g"},{name:"Chocolate amargo 70% cacau sem adição de açúcares",qty:"100 g"},{name:"Kadaif",qty:"50 g"}],
    nutrition:{kcal:162,carbs:27,sugars:4.5,addedSugars:0.1,protein:12,fat:6.6,satFat:2.9,transFat:0,fiber:2.5,sodium:47},
    flags:{gluten:true,lactose:true}, yield:"5.000 mL",
    description:"A tendência do Dubai em formato gelato. Cacau 70%, creme de pistache e kadaif crocante. 12g de proteína." },
  { id:"pistache", name:"Pistache", category:"gelato", sub:"Pasta de pistache italiano", emoji:"💚",
    moods:["premium","proteina","comfort"], palette:{base:"#B8C97A",mid:"#8FA050",deep:"#4A5A22",swirl:"#2E3812",hl:"#DCE8A8"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"420 g"},{name:"Pasta de pistache",qty:"160 g"}],
    nutrition:{kcal:130,carbs:21,sugars:4.4,addedSugars:0,protein:10,fat:4.5,satFat:2.1,transFat:0,fiber:0,sodium:40},
    flags:{gluten:true,lactose:false}, yield:"5.000 mL",
    description:"Pasta de pistache selecionada, origem italiana. Cor natural, sabor intenso. 10g de proteína, zero açúcar adicionado." },

  /* ===== 10 novos sabores — macros ESTIMADOS por analogia (estimated:true). Confirmar com análise laboratorial antes de uso em rótulo. ===== */
  { id:"morango", name:"Morango", category:"gelato", sub:"Cremoso de fruta", emoji:"🍓", estimated:true,
    moods:["refrescante","leve","proteina"], palette:{base:"#F2A6B0",mid:"#D9657A",deep:"#8B2A3E",swirl:"#FFD9DF",hl:"#FFEBEF"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Polpa de morango",qty:"600 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"320 g"},{name:"Leite em pó desnatado",qty:"300 g"}],
    nutrition:{kcal:96,carbs:17,sugars:4.6,addedSugars:0,protein:7.6,fat:1.8,satFat:0.9,transFat:0,fiber:1.6,sodium:34},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"Morango de verdade com whey WPH. Refrescante, cremoso e leve. 7,6g de proteína, sem açúcar adicionado." },
  { id:"baunilha", name:"Baunilha de Madagascar", category:"gelato", sub:"Fior di latte · fava de baunilha", emoji:"🤍", estimated:true,
    moods:["comfort","proteina","indulgente"], palette:{base:"#F5E9CC",mid:"#E6D2A0",deep:"#B89B5E",swirl:"#8A6E3A",hl:"#FFF8E6"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"350 g"},{name:"Fava de baunilha Madagascar",qty:"6 g"}],
    nutrition:{kcal:112,carbs:16,sugars:5.0,addedSugars:0,protein:9.2,fat:3.6,satFat:2.1,transFat:0,fiber:0.2,sodium:46},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"A baunilha clássica reinventada: fava de Madagascar e whey WPH. Base perfeita, cremosa e proteica." },
  { id:"doce-de-leite", name:"Doce de Leite", category:"gelato", sub:"Doce de leite · sem adição de açúcar", emoji:"🍯", estimated:true,
    moods:["indulgente","comfort","proteina"], palette:{base:"#D9A86A",mid:"#B07C3E",deep:"#6E4A1E",swirl:"#3E2A10",hl:"#F2D9A8"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"400 g"},{name:"Doce de leite sem adição de açúcares",qty:"350 g",note:DOCE_LEITE_ZERO}],
    nutrition:{kcal:138,carbs:20,sugars:6.0,addedSugars:0,protein:11,fat:4.4,satFat:2.6,transFat:0,fiber:0.2,sodium:72},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"Doce de leite sem adição de açúcar (Veneza) com whey WPH. O sabor afetivo brasileiro, 11g de proteína." },
  { id:"avela", name:"Avelã", category:"gelato", sub:"Nocciola · pasta de avelã", emoji:"🌰", estimated:true,
    moods:["premium","comfort","proteina"], palette:{base:"#C9A074",mid:"#9E7344",deep:"#5E3E1E",swirl:"#3A2410",hl:"#E8CBA0"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"400 g"},{name:"Pasta de avelã",qty:"200 g"}],
    nutrition:{kcal:166,carbs:18,sugars:4.0,addedSugars:0,protein:11,fat:8.6,satFat:1.8,transFat:0,fiber:1.3,sodium:40},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"Pasta de avelã pura (nocciola italiana) com whey WPH. Intenso e aveludado. 11g de proteína." },
  { id:"cafe", name:"Café Espresso", category:"gelato", sub:"Espresso italiano", emoji:"☕", estimated:true,
    moods:["comfort","proteina","premium"], palette:{base:"#8A6244",mid:"#5E3E26",deep:"#2E1A0E",swirl:"#1A0E06",hl:"#C9A07A"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"380 g"},{name:"Café espresso",qty:"180 mL"}],
    nutrition:{kcal:114,carbs:16,sugars:4.4,addedSugars:0,protein:10,fat:3.4,satFat:2.0,transFat:0,fiber:0.5,sodium:48},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"Espresso intenso com whey WPH. Para quem ama café de verdade. 10g de proteína, sem açúcar adicionado." },
  { id:"maracuja", name:"Maracujá", category:"gelato", sub:"Sorbet funcional", emoji:"💛", estimated:true,
    moods:["refrescante","leve","zerocal"], palette:{base:"#F2D24A",mid:"#D9A823",deep:"#8B6A14",swirl:"#5C4A10",hl:"#FFF0A0"}, image:null,
    serving:100, portionLabel:"100 g",
    ingredients:[{name:BASE_NOME,qty:"1.050 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Polpa de maracujá",qty:"700 g"},{name:"Colágeno Hidrolisado",qty:"60 g"}],
    nutrition:{kcal:74,carbs:16,sugars:3.6,addedSugars:0.8,protein:2.6,fat:0.4,satFat:0.1,transFat:0,fiber:12,sodium:12},
    flags:{gluten:false,lactose:false}, yield:"2.000 mL",
    description:"Sorbet de maracujá com colágeno hidrolisado. Refrescante, alta fibra e zero gordura. O par perfeito do Limão Siciliano." },
  { id:"cookies-cream", name:"Cookies & Cream", category:"gelato", sub:"Creme · cookies zero", emoji:"🍪", estimated:true,
    moods:["indulgente","comfort","proteina"], palette:{base:"#E8E0D2",mid:"#B8AE9A",deep:"#3A332A",swirl:"#1F1A14",hl:"#FFFFFF"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"400 g"},{name:"Biscoito tipo cookie sem adição de açúcares",qty:"180 g"},{name:"Chocolate amargo 70% cacau sem adição de açúcares",qty:"40 g"}],
    nutrition:{kcal:150,carbs:22,sugars:5.0,addedSugars:0,protein:11,fat:5.0,satFat:2.5,transFat:0,fiber:0.9,sodium:76},
    flags:{gluten:true,lactose:true}, yield:"5.000 mL",
    description:"Creme proteico com pedaços de cookies sem adição de açúcar e chocolate 70%. O clássico americano, 11g de proteína." },
  { id:"menta", name:"Menta Intensa", category:"gelato", sub:"Menta · cacau 70%", emoji:"🌿", estimated:true,
    moods:["refrescante","premium","proteina"], palette:{base:"#A8E0C4",mid:"#5FB890",deep:"#2A6A4A",swirl:"#1A3E2A",hl:"#D8F5E6"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"350 g"},{name:"Extrato natural de menta",qty:"8 g"},{name:"Chocolate amargo 70% cacau sem adição de açúcares",qty:"80 g"}],
    nutrition:{kcal:120,carbs:18,sugars:3.2,addedSugars:0,protein:9.5,fat:4.6,satFat:2.4,transFat:0,fiber:1.6,sodium:44},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"Menta refrescante com lascas de chocolate 70% zero. Sofisticado e proteico. 9,5g de proteína." },
  { id:"brigadeiro", name:"Brigadeiro", category:"gelato", sub:"Chocolate ao leite brasileiro", emoji:"🍫", estimated:true,
    moods:["indulgente","comfort","proteina"], palette:{base:"#6E4A38",mid:"#4A2E20",deep:"#241410",swirl:"#120A06",hl:"#A87C5A"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"420 g"},{name:"Cacau em pó",qty:"180 g"},{name:"Chocolate ao leite sem adição de açúcares",qty:"120 g"}],
    nutrition:{kcal:140,carbs:21,sugars:5.0,addedSugars:0,protein:12,fat:5.0,satFat:2.8,transFat:0,fiber:2.0,sodium:54},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"O brigadeiro brasileiro em gelato: cacau e chocolate ao leite sem adição de açúcar. 12g de proteína, alto teor." },
  { id:"banana-canela", name:"Banana com Canela", category:"gelato", sub:"Banana · canela do Ceilão", emoji:"🍌", estimated:true,
    moods:["postreino","comfort","leve"], palette:{base:"#F2E2A0",mid:"#D9C25E",deep:"#A88A2E",swirl:"#6E5A1A",hl:"#FFF8D0"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Banana",qty:"500 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"300 g"},{name:"Leite em pó desnatado",qty:"300 g"},{name:"Canela do Ceilão",qty:"5 g"}],
    nutrition:{kcal:110,carbs:21,sugars:7.0,addedSugars:0,protein:7.4,fat:1.5,satFat:0.7,transFat:0,fiber:1.8,sodium:30},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"Banana real com canela do Ceilão e whey WPH. Doçura natural da fruta, zero açúcar adicionado. Ótimo pós-treino." },

  { id:"bentole-choco-dubai", name:"Chocolate Dubai", category:"bentole", sub:"Cacau · pistache · kadaif · stracciatella", emoji:"✨",
    moods:["premium","indulgente","proteina"], palette:{base:"#3D2818",mid:"#2A1A0E",deep:"#140A05",swirl:"#A4B96A",hl:"#E4C9A0"}, image:"/sabores/bentole-choco-dubai.jpg",
    serving:55, portionLabel:"55 g (mini picolé)",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"600 g"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Cacau em pó",qty:"300 g"},{name:"Creme de pistache",qty:"300 g"},{name:"Raspas de chocolate sem adição de açúcares (stracciatella)",qty:"150 g"},{name:"Kadaif",qty:"70 g"}],
    nutrition:{kcal:108,carbs:17,sugars:3.6,addedSugars:0.1,protein:10,fat:4.3,satFat:1.7,transFat:0,fiber:1.5,sodium:33},
    flags:{gluten:true,lactose:true}, yield:"~100 picolés",
    description:"O Dubai em formato mini picolé. Cacau escuro, pistache, stracciatella e kadaif crocante. 10g de proteína." },
  { id:"bentole-snickers", name:"Snickers", category:"bentole", sub:"Amendoim · doce de leite · choco 70%", emoji:"🥜",
    moods:["postreino","proteina","indulgente"], palette:{base:"#A87545",mid:"#7A4F2A",deep:"#3E2511",swirl:"#1A0D05",hl:"#D9A878"}, image:"/sabores/bentole-snickers.jpg",
    serving:55, portionLabel:"55 g (mini picolé)",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"650 g"},{name:"Pasta de amendoim",qty:"420 g"},{name:"Doce de leite sem adição de açúcares",qty:"250 g",note:DOCE_LEITE_ZERO},{name:"Chocolate amargo 70% cacau sem adição de açúcares",qty:"30 g"}],
    nutrition:{kcal:95,carbs:13,sugars:3.1,addedSugars:0,protein:9.6,fat:4.5,satFat:1.7,transFat:0,fiber:0.5,sodium:52},
    flags:{gluten:false,lactose:false}, yield:"~100 picolés",
    description:"Picolé inspirado no Snickers. Amendoim real, doce de leite sem adição de açúcar, chocolate 70%. 9,6g de proteína." },
  { id:"bentole-franui", name:"Franui", category:"bentole", sub:"Framboesa · choco branco · choco 70%", emoji:"🫐",
    moods:["refrescante","leve","zerocal"], palette:{base:"#D85A6E",mid:"#A8334A",deep:"#5C1422",swirl:"#F2E7D0",hl:"#FFB0BE"}, image:"/sabores/bentole-franui.jpg",
    serving:55, portionLabel:"55 g (mini picolé)",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Framboesa",qty:"2.000 g"},{name:"Colágeno Hidrolisado",qty:"80 g"},{name:"Chocolate branco sem adição de açúcares",qty:"30 g"},{name:"Chocolate amargo 70% cacau sem adição de açúcares",qty:"15 g"}],
    nutrition:{kcal:42,carbs:8.9,sugars:1.4,addedSugars:0,protein:1.2,fat:0.3,satFat:0.1,transFat:0,fiber:7.7,sodium:4.64},
    flags:{gluten:false,lactose:false}, yield:"~100 picolés",
    description:"Apenas 42 kcal. Framboesa real, colágeno, cobertura dupla de chocolate. O mais leve e frutado da linha." },
  { id:"bentole-opereta", name:"Opereta", category:"bentole", sub:"Choco branco · castanhas", emoji:"🌰",
    moods:["premium","proteina","comfort"], palette:{base:"#EADCB8",mid:"#C9A878",deep:"#7A5A2E",swirl:"#3E2D14",hl:"#FFF2CE"}, image:"/sabores/bentole-opereta.jpg",
    serving:60, portionLabel:"60 g (mini picolé)",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"700 g"},{name:"Pasta sabor leite",qty:"200 g",note:PASTA_LEITE},{name:"Castanhas",qty:"100 g"}],
    nutrition:{kcal:86,carbs:14,sugars:3.5,addedSugars:0,protein:9.9,fat:3.0,satFat:1.4,transFat:0,fiber:0.2,sodium:28},
    flags:{gluten:false,lactose:true}, yield:"~100 picolés",
    description:"Chocolate branco Latissimo com castanhas selecionadas. 9,9g de proteína. Elegante, crocante, sofisticado." },
  { id:"bentole-pistache-cb", name:"Pistache & Choco Branco", category:"bentole", sub:"Recheio + cobertura + pistaches inteiros", emoji:"💚",
    moods:["premium","proteina","postreino"], palette:{base:"#F0E4C8",mid:"#C9D49A",deep:"#5A6A2E",swirl:"#3E4A18",hl:"#FFFFFF"}, image:"/sabores/bentole-pistache-cb.jpg",
    serving:60, portionLabel:"60 g (mini picolé)",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"680 g"},{name:"Pasta de pistache",qty:"170 g"},{name:"Pasta sabor leite",qty:"200 g",note:PASTA_LEITE},{name:"Chocolate branco sem adição de açúcares",qty:"30 g"}],
    nutrition:{kcal:61,carbs:10,sugars:5.7,addedSugars:0,protein:10,fat:2.4,satFat:0.9,transFat:0,fiber:3.7,sodium:21},
    flags:{gluten:false,lactose:true}, yield:"~100 picolés",
    description:"O campeão da linha: 10g de proteína com apenas 61 kcal. Pasta de pistache selecionada, cobertura de chocolate branco, pistaches inteiros." },
  { id:"bentole-prestigio", name:"Prestígio", category:"bentole", sub:"Coco cremoso · cobertura de chocolate", emoji:"🥥", estimated:true,
    moods:["indulgente","comfort","proteina"], palette:{base:"#FBF7EE",mid:"#E5DCC5",deep:"#6E4A2E",swirl:"#3A2414",hl:"#FFFEF8"}, image:"/sabores/bentole-prestigio.jpg",
    serving:55, portionLabel:"55 g (mini picolé)",
    ingredients:[{name:BASE_NOME,qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Proteína do soro de leite hidrolisada (whey)",qty:"650 g"},{name:"Leite em pó desnatado",qty:"350 g"},{name:"Leite de coco em pó",qty:"280 g"},{name:"Chocolate ao leite sem adição de açúcares",qty:"120 g"},{name:"Coco ralado",qty:"60 g"}],
    nutrition:{kcal:91,carbs:13,sugars:3.5,addedSugars:0,protein:8,fat:4.0,satFat:3.0,transFat:0,fiber:1.0,sodium:30},
    flags:{gluten:false,lactose:true}, yield:"~100 picolés",
    description:"O clássico Prestígio em mini picolé: coco cremoso com cobertura de chocolate. 8g de proteína, sem açúcar adicionado. 91 kcal (55g) · 182 kcal (110g)." },
];

// Advertência de polióis (maltitol/sorbitol da Base FRUTA 300 ZERO — 65 g/100 g na base).
// Texto oficial da RDC 727/2022, art. 25 (exibido em negrito no rótulo).
export const AVISO_POLIOL = "Este produto pode ter efeito laxativo.";
// POLIOL_IDS é derivado de hasPolyols, calculado mais abaixo (após a troca de
// base dos picolés), a partir das composições auditadas dos insumos.

// ALÉRGICOS por produto (RDC 26/2015) — derivado dos insumos de cada receita.
// PRELIMINAR: SOJA (lecitina dos chocolates/cremes) marcada onde provável — confirmar nas fichas dos fornecedores.
export const ALLERGENS = {
  "ninho-nutella":      ["LEITE"],  // gianduiella auditada: SEM avelã e SEM soja; leite = leite em pó + whey
  "limao-siciliano":    [],
  "extra-dark":         [],
  "pacoca":             ["LEITE","AMENDOIM"],
  "chocolate-branco":   ["LEITE"],  // lattíssimo: lecitina de girassol; soja só "pode conter"
  "coco":               ["LEITE"],
  "chocolate-dubai":    ["LEITE","PISTACHE","TRIGO","SOJA"],
  "pistache":           ["LEITE","PISTACHE"],
  "morango":            ["LEITE"],
  "baunilha":           ["LEITE"],
  "doce-de-leite":      ["LEITE"],
  "avela":              ["LEITE","AVELÃ"],
  "cafe":               ["LEITE"],
  "maracuja":           [],
  "cookies-cream":      ["LEITE","TRIGO","SOJA"],
  "menta":              ["LEITE","SOJA"],
  "brigadeiro":         ["LEITE","SOJA"],
  "banana-canela":      ["LEITE"],
  "bentole-choco-dubai":["LEITE","PISTACHE","TRIGO","SOJA"],
  "bentole-snickers":   ["LEITE","AMENDOIM","SOJA"],
  "bentole-franui":     ["LEITE","SOJA"],
  "bentole-opereta":    ["LEITE","CASTANHAS"],  // lattíssimo: soja só "pode conter"
  "bentole-pistache-cb":["LEITE","PISTACHE","SOJA"],
  "bentole-prestigio":  ["LEITE","SOJA"],
};
// Produção compartilhada na mesma gelateria: contato cruzado possível com todos estes.
export const PODE_CONTER = ["LEITE","AMENDOIM","CASTANHAS","PISTACHE","AVELÃ","TRIGO","SOJA"];

// LACTOSE e GLÚTEN = derivados dos alérgicos — FONTE ÚNICA DE VERDADE (RDC 26/2015).
// Whey WPH e Leite contêm lactose → todo sabor com LEITE nos alérgicos contém lactose.
// (Apenas Limão, Extra Dark e Maracujá, sem leite/whey, são zero lactose.)
// Glúten só vem de kadaif e cookies (trigo) → só sabores com TRIGO contêm glúten.
// Contato cruzado de produção é tratado à parte em PODE_CONTER ("pode conter").
for (const p of PRODUCTS) {
  p.flags.lactose = (ALLERGENS[p.id] || []).includes("LEITE");
  p.flags.gluten  = (ALLERGENS[p.id] || []).includes("TRIGO");
}

// BASE dos picolés foi reformulada (sem maltitol/sorbitol). Substitui o 1º ingrediente
// (a base) dos Bentôlé pela Base Funcional ZERO, mantendo a quantidade da receita.
for (const p of PRODUCTS) if (p.category === "bentole") {
  p.ingredients[0] = { name: BASE_PICOLE_NOME, qty: p.ingredients[0].qty, note: BASE_PICOLE };
}

// POLIÓIS = maltitol/sorbitol em QUALQUER insumo do produto, detectado na
// composição declarada (note): base dos gelatos, pasta sabor leite (Lattíssimo),
// preparado de cacau (Gianduiella) e doce de leite zero. Com isso, Bentôlés que
// levam esses insumos (Opereta, Pistache & Choco Branco, Snickers) também exibem
// a advertência laxativa da RDC 727/2022, apesar da base sem polióis.
// Fichas pendentes (chocolates "zero") podem incluir outros — ver PENDENTE-AUDITORIA.
for (const p of PRODUCTS) p.hasPolyols = p.ingredients.some(i => (i.note || "").toLowerCase().includes("maltitol"));
export const POLIOL_IDS = PRODUCTS.filter(p => p.hasPolyols).map(p => p.id);

// Rotulagem nutricional frontal (RDC 429/2020 — limites para sólidos, por 100 g):
// açúcares adicionados ≥ 15 g · gordura saturada ≥ 6 g · sódio ≥ 600 mg.
export function lupaFrontal(p){
  const f = 100 / p.serving, n = p.nutrition, out = [];
  if (n.addedSugars * f >= 15) out.push("AÇÚCAR ADICIONADO");
  if (n.satFat * f >= 6)       out.push("GORDURA SATURADA");
  if (n.sodium * f >= 600)     out.push("SÓDIO");
  return out;
}

// Alegações de proteína (RDC 54/2012): "alto teor" ≥ 12 g/porção · "fonte" ≥ 6 g/porção.
export function proteinClaim(p){
  const g = p.nutrition.protein;
  if (g >= 12) return "ALTO TEOR DE PROTEÍNA";
  if (g >= 6)  return "FONTE DE PROTEÍNA";
  return null;
}

// Alegação de açúcares (RDC 54/2012) — FONTE ÚNICA para app, fichas e CSV:
//  · "ZERO AÇÚCARES" (absoluto): nenhum açúcar adicionado E ≤ 0,5 g de açúcares totais/100 g.
//  · "SEM ADIÇÃO DE AÇÚCARES": nenhum açúcar adicionado no processamento; quando o alimento
//    contém açúcares próprios (lactose do leite/whey, frutose das frutas, etc.), a alegação
//    DEVE vir acompanhada da frase "Contém açúcares próprios dos ingredientes."
//  · Qualquer adição (mesmo residual, ex.: 0,1 g vinda de um insumo açucarado) → SEM alegação.
export const FRASE_ACUCARES_PROPRIOS = "Contém açúcares próprios dos ingredientes.";
export function sugarClaim(p){
  const n = p.nutrition, f = 100 / p.serving;
  if ((n.addedSugars || 0) > 0) return null;                       // houve adição → não alega
  if ((n.sugars || 0) * f <= 0.5) return { label: "ZERO AÇÚCARES", note: null };
  return { label: "SEM ADIÇÃO DE AÇÚCARES", note: FRASE_ACUCARES_PROPRIOS };
}

export const MOOD_META = {
  postreino:  {label:"Pós-treino",  color:"#3A6B20",bg:"#D0EAB8",icon:"💪"},
  proteina:   {label:"Rico em Prot.",color:"#1A4FAA",bg:"#C0D5F5",icon:"⚡"},
  refrescante:{label:"Refrescante", color:"#0A6A5E",bg:"#B8E8E2",icon:"❄️"},
  leve:       {label:"Levinho",     color:"#6A5E0A",bg:"#EAE0B8",icon:"🍃"},
  zerocal:    {label:"Zero Culpa",  color:"#5A2DAA",bg:"#DED0F8",icon:"✅"},
  indulgente: {label:"Indulgente",  color:"#8A2A00",bg:"#F5CEBA",icon:"😋"},
  premium:    {label:"Premium",     color:"#4A5A2A",bg:"#D8E5BE",icon:"👑"},
  comfort:    {label:"Comfort",     color:"#7A3A0A",bg:"#F0D5BA",icon:"🫶"},
};

/* ========== SHAKES (linha proteica · tabela nutricional + ingredientes) ==========
   Lista de ingredientes conforme as fichas técnicas FT-SHAKE (rev. mai/2026).
   Macros CALCULADOS a partir dos rótulos oficiais do whey True (truesource/
   vivatrue, por 30 g) somados aos valores TACO/USDA dos demais ingredientes
   (por 100 g). Sem passo a passo de preparo. Valores por porção, por líquido
   escolhido — leite integral aprox. 1,03 g/ml. São estimativas de cálculo;
   podem variar conforme lote, ponto da fruta e marca do líquido.
   cols da nutrition: kcal · carb(g) · prot(g) · fat(g) · sat(g) · fiber(g) · na(mg) */
export const SHAKES = [
  { id:"shake-frutas-vermelhas", code:"FT-SHAKE-01", name:"Shake Frutas Vermelhas", emoji:"🍓",
    color:{bg:"#FBE3EC",ink:"#A8334A"},
    description:"Frutas vermelhas batidas na hora com whey True Fior di Latte (isolado e hidrolisado) e o líquido à escolha do cliente.",
    sub:"200 g de frutas vermelhas · 30 g de whey", prep:"~60 s", protein:24,
    ingredients:[
      {name:"Frutas vermelhas",qty:"200 g"},
      {name:"Proteína do soro de leite (whey) isolada e hidrolisada",qty:"30 g",note:"Sabor fior di latte"},
      {name:"Líquido à escolha",qty:"150 ml",note:"Água, leite integral ou leite de amêndoas"},
    ],
    nutrition:[
      {liquid:"Água",            kcal:208, carb:23.7, prot:23.7, fat:3.1, sat:1.3, fiber:8.7, na:123},
      {liquid:"Leite integral",  kcal:302, carb:31.1, prot:28.6, fat:8.1, sat:4.2, fiber:8.7, na:189},
      {liquid:"Leite de amêndoas",kcal:230, carb:24.1, prot:24.5, fat:4.9, sat:1.5, fiber:8.7, na:213},
    ] },
  { id:"shake-acai-banana", code:"FT-SHAKE-02", name:"Shake Açaí com Banana", emoji:"🫐",
    color:{bg:"#E7E0F2",ink:"#5A2DAA"},
    description:"Açaí e banana congelados batidos com Whey de Coco True. O cliente escolhe o tipo de whey e o líquido base. Macros calculados com o whey Coconut hidrolisado/isolado.",
    sub:"100 g açaí + 100 g banana · 4 tipos de whey", prep:"~90 s", protein:24,
    ingredients:[
      {name:"Açaí congelado",qty:"100 g"},
      {name:"Banana congelada",qty:"100 g"},
      {name:"Proteína do soro de leite (whey) sabor coco",qty:"30 g",note:"4 tipos: hidrolisado, tradicional, zero lactose ou vegano"},
      {name:"Líquido à escolha",qty:"150 ml",note:"Água, leite A2 integral ou leite de amêndoas"},
    ],
    nutrition:[
      {liquid:"Água",            kcal:281, carb:35.0, prot:23.7, fat:7.1,  sat:1.2, fiber:5.1, na:116},
      {liquid:"Leite A2 integral",kcal:375, carb:42.4, prot:28.6, fat:12.2,sat:4.1, fiber:5.1, na:183},
      {liquid:"Leite de amêndoas",kcal:304, carb:35.5, prot:24.5, fat:8.9, sat:1.4, fiber:5.1, na:206},
    ] },
  { id:"shake-morango-maracuja", code:"FT-SHAKE-03", name:"Shake Morango com Maracujá", emoji:"🍓",
    color:{bg:"#FCEAD9",ink:"#B5531C"},
    description:"Morango e maracujá pré-misturados, batidos com whey True Yummy Milk (concentrado e isolado) e o líquido à escolha. Cálculo com proporção estimada de 100 g morango + 100 g maracujá.",
    sub:"200 g de morango + maracujá · 30 g de whey", prep:"~60 s", protein:21,
    ingredients:[
      {name:"Morango + maracujá",qty:"200 g",note:"Sementes do maracujá são esperadas"},
      {name:"Proteína do soro de leite (whey) concentrada e isolada",qty:"30 g",note:"Sabor leite"},
      {name:"Líquido à escolha",qty:"150 ml",note:"Água, leite integral ou leite de amêndoas"},
    ],
    nutrition:[
      {liquid:"Água",            kcal:184, carb:21.7, prot:21.1, fat:2.0, sat:0.2, fiber:2.1, na:72},
      {liquid:"Leite integral",  kcal:278, carb:29.1, prot:26.0, fat:7.1, sat:3.1, fiber:2.1, na:138},
      {liquid:"Leite de amêndoas",kcal:206, carb:22.1, prot:21.8, fat:3.8, sat:0.4, fiber:2.1, na:162},
    ] },
  { id:"shake-choco-power", code:"FT-SHAKE-04", name:"Shake Choco Power", emoji:"🍫",
    color:{bg:"#E8DED2",ink:"#5C3A1E"},
    description:"Chocolate intenso: whey True Dark Chocolate + cacau 100% alcalino, batidos com gelo e o líquido à escolha. Sem fruta.",
    sub:"20 g de cacau 100% · sem fruta", prep:"~70 s", protein:26,
    ingredients:[
      {name:"Gelo",qty:"200 g"},
      {name:"Cacau 100% alcalino",qty:"20 g",note:"1 colher de sopa cheia"},
      {name:"Proteína do soro de leite (whey) sabor chocolate",qty:"30 g"},
      {name:"Líquido à escolha",qty:"130 ml",note:"Água, leite integral ou leite de amêndoas"},
    ],
    nutrition:[
      {liquid:"Água",            kcal:159, carb:14.1, prot:25.5, fat:4.1, sat:2.4, fiber:8.9, na:107},
      {liquid:"Leite integral",  kcal:240, carb:20.5, prot:29.7, fat:8.5, sat:4.9, fiber:8.9, na:165},
      {liquid:"Leite de amêndoas",kcal:178, carb:14.5, prot:26.2, fat:5.7, sat:2.5, fiber:8.9, na:185},
    ] },
];

/* ========== QUIZ ========== */
export const QUIZ=[
  {q:"O que você está buscando agora?",opts:[{label:"Proteína & resultado",icon:"💪",val:"proteina"},{label:"Algo leve & refrescante",icon:"❄️",val:"refrescante"},{label:"Prazer sem culpa",icon:"😋",val:"indulgente"},{label:"Experiência premium",icon:"👑",val:"premium"}]},
  {q:"Alguma restrição alimentar?",opts:[{label:"Sem glúten",icon:"🌾",val:"nogluten"},{label:"Sem lactose",icon:"🥛",val:"nolactose"},{label:"Sem glúten & sem lactose",icon:"✅",val:"both"},{label:"Nenhuma restrição",icon:"👍",val:"none"}]},
  {q:"Qual é o momento?",opts:[{label:"Pós-treino",icon:"🏋️",val:"postreino"},{label:"Sobremesa",icon:"🍽️",val:"comfort"},{label:"Lanche rápido",icon:"⚡",val:"lanche"},{label:"Me surpreenda!",icon:"🎲",val:"surprise"}]},
];
