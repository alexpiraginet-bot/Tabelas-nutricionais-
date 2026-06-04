import { useState, useEffect, useMemo, useCallback } from "react";
import { ArrowLeft, ChevronRight, Search, Leaf, Zap, Beaker, Award, Info, Filter, Heart, Scale, X, Sparkles, Target } from "lucide-react";

const T = {
  bg:"#F1ECDD",bgWarm:"#EAE3CE",surface:"#FBF8EE",
  ink:"#1F2317",inkSoft:"#5A5E4E",
  pistache:"#8B9D5A",pistacheDark:"#5C6B3A",
  border:"#D9D2BD",borderSoft:"#E5DFCB",accent:"#C4A882",
};

const BASE = "Inulina, Liga Neutra, Polidextrose, Edulcorantes, Steviol";

const PRODUCTS = [
  { id:"ninho-nutella", name:"Ninho com Nutella", category:"gelato", sub:"Cremoso avelã & leite", emoji:"🍫",
    moods:["indulgente","comfort"], palette:{base:"#E8C896",mid:"#C49862",deep:"#7B5328",swirl:"#3E2511",hl:"#FFF1D8"}, image:null,
    serving:100, portionLabel:"100 g",
    ingredients:[{name:"Base Super Clean",qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite Piracanjuba",qty:"350 g"},{name:"Whey WPH",qty:"250 g"},{name:"Creme de Gianduia",qty:"400 g"}],
    nutrition:{kcal:120,carbs:21,sugars:1.8,addedSugars:0,protein:5.7,fat:4.0,satFat:0.8,transFat:0,fiber:0.8,sodium:8},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"O clássico reinventado sem açúcar adicionado. Cremoso italiano com avelã e creme de gianduia enriquecido com whey hidrolisado." },
  { id:"limao-siciliano", name:"Limão Siciliano", category:"gelato", sub:"Sorbet funcional", emoji:"🍋",
    moods:["refrescante","leve","zerocal"], palette:{base:"#F4E78A",mid:"#D9C447",deep:"#8B7A1E",swirl:"#5C5114",hl:"#FFF8C4"}, image:null,
    serving:100, portionLabel:"100 g",
    ingredients:[{name:"Base G Frutte",qty:"1.050 g"},{name:"Água",qty:"2.500 mL"},{name:"Base Limone 50",qty:"100 g"},{name:"Colágeno Hidrolisado",qty:"50 g"}],
    nutrition:{kcal:68,carbs:15,sugars:2.1,addedSugars:1.4,protein:1.2,fat:0,satFat:0,transFat:0,fiber:14,sodium:14},
    flags:{gluten:false,lactose:false}, yield:"2.000 mL",
    description:"Sorbet de limão siciliano com colágeno hidrolisado. Zero gordura, alta fibra. O gelato mais leve do cardápio." },
  { id:"extra-dark", name:"Extra Dark", category:"gelato", sub:"Cacau intenso 100%", emoji:"🖤",
    moods:["zerocal","leve","premium"], palette:{base:"#5A3A22",mid:"#3A2418",deep:"#1A0E08",swirl:"#0A0503",hl:"#A87545"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:"Base Super Clean",qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Cacau em pó",qty:"250 g"}],
    nutrition:{kcal:70,carbs:20,sugars:0.1,addedSugars:0.1,protein:1.2,fat:0.8,satFat:0.5,transFat:0,fiber:2.2,sodium:1.24},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"Apenas 70 kcal por porção. Cacau puro de alta intensidade, zero lactose, zero glúten. Para quem não abre mão do chocolate." },
  { id:"pacoca", name:"Paçoca", category:"gelato", sub:"Amendoim cremoso", emoji:"🥜",
    moods:["postreino","comfort","proteina"], palette:{base:"#D9B574",mid:"#B08A48",deep:"#6E5224",swirl:"#3E2D11",hl:"#F2DDA8"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:"Base Super Clean",qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Whey WPH",qty:"420 g"},{name:"Leite Piracanjuba",qty:"350 g"},{name:"Pasta de amendoim",qty:"420 g"}],
    nutrition:{kcal:166,carbs:22,sugars:5.1,addedSugars:0,protein:13,fat:7.7,satFat:2.7,transFat:0,fiber:0.6,sodium:86},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"13g de proteína por porção. Pasta de amendoim de verdade com whey WPH. Pós-treino que parece sobremesa." },
  { id:"chocolate-branco", name:"Chocolate Branco", category:"gelato", sub:"Veludo lácteo", emoji:"🤍",
    moods:["indulgente","comfort","proteina"], palette:{base:"#F4EAD2",mid:"#E0CFA8",deep:"#A8916A",swirl:"#6E5C3D",hl:"#FFF8E8"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:"Base Super Clean",qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite Piracanjuba",qty:"350 g"},{name:"Whey WPH",qty:"420 g"},{name:"Latissimo",qty:"250 g"}],
    nutrition:{kcal:144,carbs:23,sugars:5.4,addedSugars:0,protein:11,fat:5.2,satFat:2.4,transFat:0,fiber:0.3,sodium:51},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"Textura aveludada com Latissimo e whey WPH. 11g de proteína, zero lactose. Suavidade sem culpa." },
  { id:"coco", name:"Coco", category:"gelato", sub:"Tropical cremoso", emoji:"🥥",
    moods:["refrescante","comfort"], palette:{base:"#FBF7EE",mid:"#E5DCC5",deep:"#A89C7C",swirl:"#5E5440",hl:"#FFFFFF"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:"Base Super Clean",qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Whey WPH",qty:"250 g"},{name:"Leite Piracanjuba",qty:"350 g"},{name:"Leite de coco em pó",qty:"280 g"}],
    nutrition:{kcal:159,carbs:22,sugars:3.8,addedSugars:0,protein:6.7,fat:5.5,satFat:4.2,transFat:0,fiber:0,sodium:41},
    flags:{gluten:false,lactose:false}, yield:"5.000 mL",
    description:"Leite de coco em pó real com textura densa e aroma tropical. Zero lactose, zero glúten." },
  { id:"chocolate-dubai", name:"Chocolate Dubai", category:"gelato", sub:"Cacau · pistache · kadaif", emoji:"✨",
    moods:["premium","indulgente","proteina"], palette:{base:"#5A3D24",mid:"#3A2614",deep:"#1F1408",swirl:"#A4B96A",hl:"#D4B074"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:"Base Super Clean",qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite Piracanjuba",qty:"350 g"},{name:"Whey WPH",qty:"420 g"},{name:"Cacau em pó",qty:"250 g"},{name:"Creme de Pistache G",qty:"200 g"},{name:"Chocolate 70%",qty:"100 g"},{name:"Kadaif",qty:"50 g"}],
    nutrition:{kcal:162,carbs:27,sugars:4.5,addedSugars:0.1,protein:12,fat:6.6,satFat:2.9,transFat:0,fiber:2.5,sodium:47},
    flags:{gluten:true,lactose:true}, yield:"5.000 mL",
    description:"A tendência do Dubai em formato gelato. Cacau 70%, creme de pistache e kadaif crocante. 12g de proteína." },
  { id:"pistache", name:"Pistache", category:"gelato", sub:"Pasta de pistache italiano", emoji:"💚",
    moods:["premium","proteina","comfort"], palette:{base:"#B8C97A",mid:"#8FA050",deep:"#4A5A22",swirl:"#2E3812",hl:"#DCE8A8"}, image:null,
    serving:60, portionLabel:"60 g",
    ingredients:[{name:"Base Super Clean",qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite Piracanjuba",qty:"350 g"},{name:"Whey WPH",qty:"420 g"},{name:"Pasta Pistache Selection",qty:"160 g"}],
    nutrition:{kcal:130,carbs:21,sugars:4.4,addedSugars:0,protein:10,fat:4.5,satFat:2.1,transFat:0,fiber:0,sodium:40},
    flags:{gluten:true,lactose:false}, yield:"5.000 mL",
    description:"Pasta de pistache selecionada, origem italiana. Cor natural, sabor intenso. 10g de proteína, zero açúcar adicionado." },
  { id:"bentole-choco-dubai", name:"Chocolate Dubai", category:"bentole", sub:"Cacau · pistache · kadaif · stracciatella", emoji:"✨",
    moods:["premium","indulgente","proteina"], palette:{base:"#3D2818",mid:"#2A1A0E",deep:"#140A05",swirl:"#A4B96A",hl:"#E4C9A0"}, image:null,
    serving:55, portionLabel:"55 g (mini picolé)",
    ingredients:[{name:"Base Super Clean",qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Whey WPH",qty:"600 g"},{name:"Leite em pó",qty:"350 g"},{name:"Cacau em pó",qty:"300 g"},{name:"Creme de Pistache G",qty:"300 g"},{name:"Stracciatella",qty:"150 g"},{name:"Kadaif",qty:"70 g"}],
    nutrition:{kcal:108,carbs:17,sugars:3.6,addedSugars:0.1,protein:10,fat:4.3,satFat:1.7,transFat:0,fiber:1.5,sodium:33},
    flags:{gluten:true,lactose:true}, yield:"~100 picolés",
    description:"O Dubai em formato mini picolé. Cacau escuro, pistache, stracciatella e kadaif crocante. 10g de proteína." },
  { id:"bentole-snickers", name:"Snickers", category:"bentole", sub:"Amendoim · doce de leite · choco 70%", emoji:"🥜",
    moods:["postreino","proteina","indulgente"], palette:{base:"#A87545",mid:"#7A4F2A",deep:"#3E2511",swirl:"#1A0D05",hl:"#D9A878"}, image:null,
    serving:55, portionLabel:"55 g (mini picolé)",
    ingredients:[{name:"Base Super Clean",qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite Piracanjuba",qty:"350 g"},{name:"Whey WPH",qty:"650 g"},{name:"Pasta de amendoim",qty:"420 g"},{name:"Doce de leite Zero (Veneza)",qty:"250 g"},{name:"Chocolate 70%",qty:"30 g"}],
    nutrition:{kcal:95,carbs:13,sugars:3.1,addedSugars:0,protein:9.6,fat:4.5,satFat:1.7,transFat:0,fiber:0.5,sodium:52},
    flags:{gluten:false,lactose:false}, yield:"~100 picolés",
    description:"Picolé inspirado no Snickers. Amendoim real, doce de leite zero açúcar, chocolate 70%. 9,6g de proteína." },
  { id:"bentole-franui", name:"Franui", category:"bentole", sub:"Framboesa · choco branco · choco 70%", emoji:"🫐",
    moods:["refrescante","leve","zerocal"], palette:{base:"#D85A6E",mid:"#A8334A",deep:"#5C1422",swirl:"#F2E7D0",hl:"#FFB0BE"}, image:null,
    serving:55, portionLabel:"55 g (mini picolé)",
    ingredients:[{name:"Base G Frutte",qty:"1.000 g"},{name:"Água",qty:"2.500 mL"},{name:"Framboesa",qty:"2.000 g"},{name:"Colágeno Hidrolisado",qty:"80 g"},{name:"Chocolate Branco Cacauzissimo",qty:"30 g"},{name:"Chocolate 70%",qty:"15 g"}],
    nutrition:{kcal:42,carbs:8.9,sugars:1.4,addedSugars:0,protein:1.2,fat:0.3,satFat:0.1,transFat:0,fiber:7.7,sodium:4.64},
    flags:{gluten:false,lactose:false}, yield:"~100 picolés",
    description:"Apenas 42 kcal. Framboesa real, colágeno, cobertura dupla de chocolate. O mais leve e frutado da linha." },
  { id:"bentole-opereta", name:"Opereta", category:"bentole", sub:"Choco branco · castanhas", emoji:"🌰",
    moods:["premium","proteina","comfort"], palette:{base:"#EADCB8",mid:"#C9A878",deep:"#7A5A2E",swirl:"#3E2D14",hl:"#FFF2CE"}, image:null,
    serving:60, portionLabel:"60 g (mini picolé)",
    ingredients:[{name:"Base Super Clean",qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite Piracanjuba",qty:"350 g"},{name:"Whey WPH",qty:"700 g"},{name:"Latissimo",qty:"200 g"},{name:"Castanhas",qty:"100 g"}],
    nutrition:{kcal:86,carbs:14,sugars:3.5,addedSugars:0,protein:9.9,fat:3.0,satFat:1.4,transFat:0,fiber:0.2,sodium:28},
    flags:{gluten:false,lactose:true}, yield:"~100 picolés",
    description:"Chocolate branco Latissimo com castanhas selecionadas. 9,9g de proteína. Elegante, crocante, sofisticado." },
  { id:"bentole-pistache-cb", name:"Pistache & Choco Branco", category:"bentole", sub:"Recheio + cobertura + pistaches inteiros", emoji:"💚",
    moods:["premium","proteina","postreino"], palette:{base:"#F0E4C8",mid:"#C9D49A",deep:"#5A6A2E",swirl:"#3E4A18",hl:"#FFFFFF"}, image:null,
    serving:60, portionLabel:"60 g (mini picolé)",
    ingredients:[{name:"Base Super Clean",qty:"1.000 g",note:BASE},{name:"Água",qty:"2.500 mL"},{name:"Leite desnatado",qty:"350 g"},{name:"Whey WPH",qty:"680 g"},{name:"Pasta Pistache Selection",qty:"170 g"},{name:"Latissimo",qty:"200 g"},{name:"Chocolate Branco Cacauzissimo",qty:"30 g"}],
    nutrition:{kcal:61,carbs:10,sugars:5.7,addedSugars:0,protein:10,fat:2.4,satFat:0.9,transFat:0,fiber:3.7,sodium:21},
    flags:{gluten:false,lactose:true}, yield:"~100 picolés",
    description:"O campeão da linha: 10g de proteína com apenas 61 kcal. Pasta de pistache selecionada, cobertura de chocolate branco, pistaches inteiros." },
];

// Aviso ANVISA obrigatório — polióis presentes na Base Super Clean (~0,5% maltitol/sorbitol)
const AVISO_POLIOL = "O consumo excessivo pode ter efeito laxativo.";
// Quais produtos têm poliol declarável (todos os gelatos com Base Super Clean ou Base G Frutte)
// Base G Frutte também usa polióis como umectantes
const POLIOL_IDS = ["ninho-nutella","limao-siciliano","extra-dark","pacoca","chocolate-branco","coco","chocolate-dubai","pistache"];

const MOOD_META = {
  postreino:  {label:"Pós-treino",  color:"#3A6B20",bg:"#D0EAB8",icon:"💪"},
  proteina:   {label:"Rico em Prot.",color:"#1A4FAA",bg:"#C0D5F5",icon:"⚡"},
  refrescante:{label:"Refrescante", color:"#0A6A5E",bg:"#B8E8E2",icon:"❄️"},
  leve:       {label:"Levinho",     color:"#6A5E0A",bg:"#EAE0B8",icon:"🍃"},
  zerocal:    {label:"Zero Culpa",  color:"#5A2DAA",bg:"#DED0F8",icon:"✅"},
  indulgente: {label:"Indulgente",  color:"#8A2A00",bg:"#F5CEBA",icon:"😋"},
  premium:    {label:"Premium",     color:"#4A5A2A",bg:"#D8E5BE",icon:"👑"},
  comfort:    {label:"Comfort",     color:"#7A3A0A",bg:"#F0D5BA",icon:"🫶"},
};

function BentoLogo({size=120,mono=false}){
  const c=mono?T.ink:T.pistacheDark;
  return(<svg viewBox="0 0 200 200" width={size} height={size}><defs><path id="tA" d="M 30 100 A 70 70 0 0 1 170 100" fill="none"/><path id="bA" d="M 35 105 A 65 65 0 0 0 165 105" fill="none"/></defs><circle cx="100" cy="100" r="78" fill={c}/><g transform="translate(100 105)" fill="none" stroke={T.bg} strokeWidth="2.4" strokeLinecap="round"><path d="M -22 -4 Q 0 -10 22 -4 L 18 12 Q 0 18 -18 12 Z"/><circle cx="-8" cy="-12" r="1.4" fill={T.bg} stroke="none"/><circle cx="0" cy="-14" r="1.4" fill={T.bg} stroke="none"/><circle cx="8" cy="-12" r="1.4" fill={T.bg} stroke="none"/></g><text fill={T.bg} style={{fontFamily:"'Fraunces',serif",fontSize:"20px",letterSpacing:"0.18em",fontWeight:500}}><textPath href="#tA" startOffset="50%" textAnchor="middle">BENTÔ</textPath></text><text fill={T.bg} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",letterSpacing:"0.42em"}}><textPath href="#bA" startOffset="50%" textAnchor="middle">GELATOS</textPath></text></svg>);
}

function GelatoSVG({p,size=200,id}){
  const {base,mid,deep,swirl,hl}=p,u=`g-${id}`;
  return(<svg viewBox="0 0 220 220" width={size} height={size}><defs><radialGradient id={`${u}-c`} cx="40%" cy="30%" r="80%"><stop offset="0%" stopColor={hl}/><stop offset="35%" stopColor={base}/><stop offset="80%" stopColor={mid}/><stop offset="100%" stopColor={deep}/></radialGradient><linearGradient id={`${u}-p`} x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#FFF"/><stop offset="50%" stopColor="#F8F4E8"/><stop offset="100%" stopColor="#D9D0B5"/></linearGradient><radialGradient id={`${u}-s`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1F2317" stopOpacity="0.3"/><stop offset="100%" stopColor="#1F2317" stopOpacity="0"/></radialGradient><radialGradient id={`${u}-g`} cx="35%" cy="20%" r="50%"><stop offset="0%" stopColor="#FFF" stopOpacity="0.5"/><stop offset="60%" stopColor="#FFF" stopOpacity="0"/></radialGradient><filter id={`${u}-b`}><feGaussianBlur stdDeviation="1.2"/></filter></defs><ellipse cx="110" cy="200" rx="78" ry="8" fill={`url(#${u}-s)`}/><path d="M 50 102 L 58 188 Q 60 198 70 198 L 150 198 Q 160 198 162 188 L 170 102 Z" fill={`url(#${u}-p)`} stroke="#B8AE8E" strokeWidth="0.8"/><g opacity="0.15" stroke="#8B7E5A" strokeWidth="0.4"><line x1="80" y1="110" x2="83" y2="195"/><line x1="110" y1="110" x2="110" y2="195"/><line x1="140" y1="110" x2="137" y2="195"/></g><ellipse cx="110" cy="102" rx="62" ry="10" fill="#FBF8EE" stroke="#B8AE8E" strokeWidth="0.8"/><path d="M 52 100 Q 58 72 78 70 Q 88 50 105 60 Q 118 42 132 58 Q 148 50 158 72 Q 168 80 168 98 Z" fill={`url(#${u}-c)`}/><path d="M 65 88 Q 85 70 110 75 Q 130 68 148 82" fill="none" stroke={hl} strokeWidth="3" strokeLinecap="round" opacity="0.65"/><path d="M 72 92 Q 92 82 112 92 Q 132 84 152 92" fill="none" stroke={swirl} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" filter={`url(#${u}-b)`}/><circle cx="92" cy="84" r="2" fill={swirl} opacity="0.7"/><circle cx="128" cy="78" r="1.6" fill={swirl} opacity="0.6"/><path d="M 60 78 Q 80 58 110 64 Q 130 56 150 72" fill={`url(#${u}-g)`} opacity="0.65"/><rect x="80" y="148" width="60" height="32" rx="1" fill="#FBF8EE" stroke="#B8AE8E" strokeWidth="0.6"/><line x1="86" y1="158" x2="134" y2="158" stroke="#5C6B3A" strokeWidth="0.8" opacity="0.6"/><line x1="86" y1="164" x2="124" y2="164" stroke={T.inkSoft} strokeWidth="0.5" opacity="0.35"/></svg>);
}

function PicoleSVG({p,size=200,id}){
  const {base,mid,deep,swirl,hl}=p,u=`p-${id}`;
  return(<svg viewBox="0 0 220 220" width={size} height={size}><defs><linearGradient id={`${u}-b`} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={hl} stopOpacity="0.85"/><stop offset="20%" stopColor={base}/><stop offset="70%" stopColor={mid}/><stop offset="100%" stopColor={deep}/></linearGradient><linearGradient id={`${u}-c`} x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={mid}/><stop offset="100%" stopColor={deep}/></linearGradient><linearGradient id={`${u}-st`} x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#A87C4A"/><stop offset="50%" stopColor="#D9B074"/><stop offset="100%" stopColor="#8B6535"/></linearGradient><radialGradient id={`${u}-s`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1F2317" stopOpacity="0.3"/><stop offset="100%" stopColor="#1F2317" stopOpacity="0"/></radialGradient><radialGradient id={`${u}-g`} cx="30%" cy="25%" r="55%"><stop offset="0%" stopColor="#FFF" stopOpacity="0.42"/><stop offset="60%" stopColor="#FFF" stopOpacity="0"/></radialGradient></defs><ellipse cx="110" cy="208" rx="55" ry="6" fill={`url(#${u}-s)`}/><rect x="102" y="160" width="16" height="46" rx="3" fill={`url(#${u}-st)`} stroke="#5E3F1A" strokeWidth="0.6"/><line x1="106" y1="170" x2="106" y2="200" stroke="#7A5028" strokeWidth="0.4" opacity="0.6"/><path d="M 60 38 Q 60 26 72 26 L 148 26 Q 160 26 160 38 L 160 158 Q 160 168 150 168 L 70 168 Q 60 168 60 158 Z" fill={`url(#${u}-b)`} stroke={deep} strokeWidth="0.8"/><path d="M 60 38 Q 60 26 72 26 L 148 26 Q 160 26 160 38 L 160 60 Q 152 70 144 60 Q 134 76 124 62 Q 110 76 100 60 Q 88 76 78 60 Q 68 70 60 60 Z" fill={`url(#${u}-c)`}/><ellipse cx="90" cy="40" rx="22" ry="6" fill={hl} opacity="0.38"/><ellipse cx="78" cy="92" rx="3.5" ry="2.5" fill={swirl} opacity="0.85"/><ellipse cx="135" cy="105" rx="3" ry="2" fill={swirl} opacity="0.8"/><ellipse cx="100" cy="125" rx="3.2" ry="2.2" fill={swirl} opacity="0.8"/><ellipse cx="120" cy="80" rx="2.5" ry="1.8" fill={hl} opacity="0.65"/><ellipse cx="85" cy="135" rx="2.8" ry="2" fill={swirl} opacity="0.7"/><path d="M 66 50 Q 64 100 70 158" fill="none" stroke="#FFF" strokeWidth="2.5" opacity="0.2"/><path d="M 60 38 Q 60 26 72 26 L 148 26 Q 160 26 160 38 L 160 158 Q 160 168 150 168 L 70 168 Q 60 168 60 158 Z" fill={`url(#${u}-g)`}/><circle cx="68" cy="115" r="0.9" fill="#FFF" opacity="0.55"/><circle cx="155" cy="130" r="0.8" fill="#FFF" opacity="0.5"/></svg>);
}

function ProductArt({product,size}){
  if(product.image) return <img src={product.image} alt={product.name} style={{width:size,height:size,objectFit:"cover",borderRadius:4}}/>;
  return product.category==="gelato"?<GelatoSVG p={product.palette} size={size} id={product.id}/>:<PicoleSVG p={product.palette} size={size} id={product.id}/>;
}

function MoodChip({mood,small}){
  const m=MOOD_META[mood];if(!m)return null;
  return(<span style={{fontSize:small?9:10,letterSpacing:"0.1em",padding:small?"3px 7px":"4px 9px",background:m.bg,color:m.color,borderRadius:2,textTransform:"uppercase",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:4,fontFamily:"'JetBrains Mono',monospace"}}><span>{m.icon}</span>{m.label}</span>);
}
function Chip({children,tone="neutral"}){
  const t={neutral:{bg:T.bgWarm,color:T.ink,border:T.border},good:{bg:"#E5EBD3",color:T.pistacheDark,border:"#C7D29F"},warn:{bg:"#F2E2C5",color:"#7A5320",border:"#D9BD8A"}}[tone];
  return(<span style={{fontSize:10,letterSpacing:"0.12em",padding:"4px 8px",background:t.bg,color:t.color,border:`1px solid ${t.border}`,borderRadius:2,textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace"}}>{children}</span>);
}
function MacroBar({label,value,max,color=T.pistacheDark}){
  const pct=Math.min(100,(value/max)*100);
  return(<div style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:9,letterSpacing:"0.18em",color:T.inkSoft,textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace"}}>{label}</span><span style={{fontSize:10,color:T.ink,fontWeight:500,fontFamily:"'JetBrains Mono',monospace"}}>{value}g</span></div><div style={{height:5,background:T.borderSoft,borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:99,transition:"width .6s cubic-bezier(.2,.8,.2,1)"}}/></div></div>);
}

function GStyle(){return(<style>{`
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap');
.fd{font-family:'Fraunces',Georgia,serif}
.fb{font-family:'DM Sans',system-ui,sans-serif}
.fm{font-family:'JetBrains Mono',ui-monospace,monospace}
.fade{animation:fade .35s ease both}
.rise{animation:rise .45s cubic-bezier(.2,.8,.2,1) both}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.hl{transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s,border-color .2s}
.hl:hover{transform:translateY(-3px);border-color:${T.pistacheDark};box-shadow:0 16px 40px -18px rgba(31,35,23,.22)}
.hd{background-image:linear-gradient(90deg,${T.border} 50%,transparent 0);background-size:6px 1px;background-repeat:repeat-x;height:1px}
.gn{position:relative}
.gn::after{content:'';position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(31,35,23,.05) 1px,transparent 1px);background-size:3px 3px;opacity:.6;mix-blend-mode:multiply}
*::-webkit-scrollbar{width:5px}*::-webkit-scrollbar-thumb{background:${T.border};border-radius:99px}
input:focus,button:focus{outline:none}button{cursor:pointer}
`}</style>);}

/* ========== QUIZ ========== */
const QUIZ=[
  {q:"O que você está buscando agora?",opts:[{label:"Proteína & resultado",icon:"💪",val:"proteina"},{label:"Algo leve & refrescante",icon:"❄️",val:"refrescante"},{label:"Prazer sem culpa",icon:"😋",val:"indulgente"},{label:"Experiência premium",icon:"👑",val:"premium"}]},
  {q:"Alguma restrição alimentar?",opts:[{label:"Sem glúten",icon:"🌾",val:"nogluten"},{label:"Sem lactose",icon:"🥛",val:"nolactose"},{label:"Sem glúten & sem lactose",icon:"✅",val:"both"},{label:"Nenhuma restrição",icon:"👍",val:"none"}]},
  {q:"Qual é o momento?",opts:[{label:"Pós-treino",icon:"🏋️",val:"postreino"},{label:"Sobremesa",icon:"🍽️",val:"comfort"},{label:"Lanche rápido",icon:"⚡",val:"lanche"},{label:"Me surpreenda!",icon:"🎲",val:"surprise"}]},
];
function QuizModal({onClose,onResult}){
  const [step,setStep]=useState(0);const [ans,setAns]=useState([]);const [done,setDone]=useState(false);const [result,setResult]=useState(null);
  const pick=(val)=>{
    const na=[...ans,val];
    if(step<QUIZ.length-1){setAns(na);setStep(step+1);}
    else{
      const[goal,restrict,moment]=na;
      let pool=[...PRODUCTS];
      if(restrict==="nogluten")pool=pool.filter(p=>!p.flags.gluten);
      if(restrict==="nolactose")pool=pool.filter(p=>!p.flags.lactose);
      if(restrict==="both")pool=pool.filter(p=>!p.flags.gluten&&!p.flags.lactose);
      const mm={proteina:"proteina",refrescante:"refrescante",indulgente:"indulgente",premium:"premium",postreino:"postreino",comfort:"comfort",lanche:"leve",surprise:null};
      const g=mm[goal],m2=mm[moment];
      const sc=pool.map(p=>({...p,score:(g&&p.moods.includes(g)?3:0)+(m2&&p.moods.includes(m2)?2:0)+Math.random()*0.5})).sort((a,b)=>b.score-a.score);
      setResult(sc[0]||PRODUCTS[0]);setDone(true);setAns(na);
    }
  };
  return(
    <div className="fade" style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" style={{background:T.surface,borderRadius:6,maxWidth:480,width:"100%",border:`1px solid ${T.border}`,overflow:"hidden"}}>
        <div style={{background:T.ink,padding:"18px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>{done?"Resultado":`Pergunta ${step+1} de ${QUIZ.length}`}</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:4}}>{done?"Seu Bentô ideal 🎉":"Qual é o seu Bentô?"}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={14}/></button>
        </div>
        {!done&&<div style={{height:3,background:T.bgWarm}}><div style={{height:"100%",background:T.pistacheDark,width:`${((step+1)/QUIZ.length)*100}%`,transition:"width .4s ease"}}/></div>}
        <div style={{padding:22}}>
          {!done?(
            <>
              <p className="fb" style={{fontSize:15,color:T.ink,marginBottom:18,lineHeight:1.4}}>{QUIZ[step].q}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {QUIZ[step].opts.map(o=>(
                  <button key={o.val} onClick={()=>pick(o.val)} className="hl fb"
                    style={{padding:"13px 11px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:4,textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:22}}>{o.icon}</span>
                    <span style={{fontSize:13,color:T.ink,lineHeight:1.3}}>{o.label}</span>
                  </button>
                ))}
              </div>
            </>
          ):result&&(
            <div className="fade">
              <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><ProductArt product={result} size={150}/></div>
              <div className="fd" style={{fontSize:26,color:T.ink,textAlign:"center",letterSpacing:"-0.01em"}}>{result.name}</div>
              <div className="fb" style={{fontSize:13,color:T.inkSoft,textAlign:"center",marginTop:6,lineHeight:1.5}}>{result.description}</div>
              <div className="hd" style={{margin:"14px 0"}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:18}}>
                {[{l:"kcal",v:result.nutrition.kcal},{l:"proteína",v:`${result.nutrition.protein}g`,g:true},{l:"açúc. adic.",v:`${result.nutrition.addedSugars}g`}].map(s=>(
                  <div key={s.l} style={{textAlign:"center",background:T.bg,borderRadius:4,padding:"10px 6px"}}>
                    <div className="fm" style={{fontSize:9,color:T.inkSoft,letterSpacing:"0.18em",textTransform:"uppercase"}}>{s.l}</div>
                    <div className="fd" style={{fontSize:20,color:s.g?T.pistacheDark:T.ink,fontWeight:500,marginTop:2}}>{s.v}</div>
                  </div>
                ))}
              </div>
              <button onClick={()=>{onClose();onResult(result.id);}} style={{width:"100%",padding:"13px 0",background:T.pistacheDark,color:T.surface,border:"none",borderRadius:4,fontSize:14,fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>Ver ficha completa →</button>
              <button onClick={()=>{setStep(0);setAns([]);setDone(false);setResult(null);}} style={{width:"100%",marginTop:8,padding:"10px 0",background:"transparent",color:T.inkSoft,border:`1px solid ${T.border}`,borderRadius:4,fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>Refazer quiz</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========== COMPARE ========== */
function CompareModal({ids,onClose,onViewProduct}){
  const products=ids.map(id=>PRODUCTS.find(p=>p.id===id)).filter(Boolean);
  if(products.length<2)return null;
  const fields=[{k:"kcal",l:"Energia (kcal)"},{k:"protein",l:"Proteínas (g)",hi:true},{k:"carbs",l:"Carboidratos (g)"},{k:"sugars",l:"Açúcares totais (g)"},{k:"addedSugars",l:"Açúc. adicionados (g)"},{k:"fat",l:"Gorduras totais (g)"},{k:"fiber",l:"Fibra alimentar (g)"},{k:"sodium",l:"Sódio (mg)"}];
  const best=(k)=>{const vs=products.map(p=>p.nutrition[k]);return(k==="protein"||k==="fiber")?Math.max(...vs):Math.min(...vs);};
  return(
    <div className="fade" style={{position:"fixed",inset:0,zIndex:100,background:"rgba(31,35,23,0.65)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="rise" style={{background:T.surface,borderRadius:6,maxWidth:680,width:"100%",maxHeight:"88vh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"14px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
          <span className="fd" style={{fontSize:18,color:T.bg}}>Comparando sabores</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={14}/></button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={{padding:"14px 18px",textAlign:"left",background:T.bg,borderBottom:`1px solid ${T.border}`,minWidth:150}}><span className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase"}}>Nutriente</span></th>
                {products.map(p=>(
                  <th key={p.id} style={{padding:"14px 18px",textAlign:"center",background:T.bg,borderBottom:`1px solid ${T.border}`,minWidth:150}}>
                    <div style={{display:"flex",justifyContent:"center",marginBottom:6}}><ProductArt product={p} size={64}/></div>
                    <div className="fd" style={{fontSize:15,color:T.ink,lineHeight:1.2}}>{p.name}</div>
                    <div className="fm" style={{fontSize:9,color:T.inkSoft,textTransform:"uppercase",letterSpacing:"0.12em",marginTop:2}}>{p.category==="gelato"?"Gelato":"Bentôlé"} · {p.portionLabel}</div>
                    <button onClick={()=>{onClose();onViewProduct(p.id);}} className="fm" style={{marginTop:8,fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",background:"transparent",border:`1px solid ${T.border}`,borderRadius:2,padding:"4px 10px",color:T.inkSoft}}>Ver ficha</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((f,i)=>{
                const b=best(f.k);
                return(<tr key={f.k} style={{background:i%2===0?T.surface:T.bg}}>
                  <td className="fb" style={{padding:"12px 18px",fontSize:13,color:f.hi?T.ink:T.inkSoft,fontWeight:f.hi?500:400,borderBottom:`1px solid ${T.borderSoft}`}}>{f.l}</td>
                  {products.map(p=>{const v=p.nutrition[f.k],iB=v===b;return(
                    <td key={p.id} style={{padding:"12px 18px",textAlign:"center",borderBottom:`1px solid ${T.borderSoft}`}}>
                      <span className="fm" style={{fontSize:15,fontWeight:500,color:iB?T.pistacheDark:T.ink}}>{v}</span>
                      {iB&&<span style={{marginLeft:4,fontSize:11}}>✓</span>}
                    </td>
                  );})}
                </tr>);
              })}
              {[{l:"Sem glúten",k:"gluten"},{l:"Sem lactose",k:"lactose"}].map(f=>(
                <tr key={f.k} style={{background:T.bgWarm}}>
                  <td className="fb" style={{padding:"12px 18px",fontSize:13,color:T.inkSoft}}>{f.l}</td>
                  {products.map(p=><td key={p.id} style={{padding:"12px 18px",textAlign:"center"}}><span style={{fontSize:14}}>{!p.flags[f.k]?"✅":"⚠️"}</span></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{padding:"10px 22px",background:T.bgWarm,borderTop:`1px solid ${T.border}`}}>
          <span className="fm" style={{fontSize:9,color:T.inkSoft,letterSpacing:"0.14em"}}>✓ = melhor valor na comparação para esse nutriente</span>
        </div>
      </div>
    </div>
  );
}

/* ========== HEADER ========== */
function Header({onHome,compareCount,onOpenCompare,onQuiz,favorites}){
  return(
    <header className="sticky top-0 z-40 backdrop-blur" style={{background:`${T.bg}EA`,borderBottom:`1px solid ${T.border}`}}>
      <div style={{maxWidth:1152,margin:"0 auto",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <button onClick={onHome} style={{display:"flex",alignItems:"center",gap:12,background:"none",border:"none"}}>
          <BentoLogo size={34}/>
          <div style={{lineHeight:1.3,textAlign:"left"}}>
            <div className="fd" style={{fontSize:14,color:T.ink}}>Bentô · Lab</div>
            <div className="fm" style={{fontSize:8,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>Nutritional Index</div>
          </div>
        </button>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {favorites.length>0&&<span className="fm" style={{fontSize:9,letterSpacing:"0.18em",color:T.inkSoft,textTransform:"uppercase"}}>❤️ {favorites.length}</span>}
          {compareCount>0&&(
            <button onClick={onOpenCompare} className="fb" style={{background:T.bgWarm,color:T.ink,border:`1px solid ${T.border}`,borderRadius:3,padding:"8px 12px",fontSize:12,display:"flex",alignItems:"center",gap:6,position:"relative"}}>
              <Scale size={13}/><span className="fm" style={{fontSize:9,letterSpacing:"0.14em"}}>Comparar</span>
              <span style={{position:"absolute",top:-6,right:-6,background:T.pistacheDark,color:T.surface,borderRadius:"50%",width:18,height:18,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>{compareCount}</span>
            </button>
          )}
          <button onClick={onQuiz} className="fb" style={{background:T.pistacheDark,color:T.surface,border:"none",borderRadius:3,padding:"9px 14px",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:6}}>
            <Sparkles size={13}/>Encontre seu sabor
          </button>
        </div>
      </div>
    </header>
  );
}

/* ========== HOME ========== */
function Home({onSelect,onQuiz}){
  const counts={gelato:PRODUCTS.filter(p=>p.category==="gelato").length,bentole:PRODUCTS.filter(p=>p.category==="bentole").length};
  const topProt=PRODUCTS.slice().sort((a,b)=>b.nutrition.protein-a.nutrition.protein).slice(0,4);
  return(
    <div className="fade">
      <section style={{maxWidth:1152,margin:"0 auto",padding:"52px 24px 32px",textAlign:"center"}}>
        <div className="rise"><BentoLogo size={110}/></div>
        <h1 className="fd rise" style={{fontSize:"clamp(34px,6vw,68px)",lineHeight:1.05,color:T.ink,marginTop:18,fontWeight:400,letterSpacing:"-0.02em",animationDelay:"50ms"}}>
          Gelato com <em style={{color:T.pistacheDark,fontStyle:"italic"}}>propósito</em>
        </h1>
        <p className="fb rise" style={{maxWidth:480,margin:"14px auto 0",color:T.inkSoft,fontSize:15,lineHeight:1.6,animationDelay:"100ms"}}>
          Zero açúcar adicionado. Rico em proteína. Rótulo limpo. Descubra o sabor feito para você.
        </p>
        <div className="rise" style={{animationDelay:"150ms",marginTop:22,display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap"}}>
          <button onClick={onQuiz} className="fb" style={{background:T.pistacheDark,color:T.surface,border:"none",borderRadius:4,padding:"13px 22px",fontSize:14,fontWeight:500,display:"flex",alignItems:"center",gap:8}}>
            <Sparkles size={15}/>Qual é o meu sabor?
          </button>
          <button onClick={()=>onSelect("gelato")} className="fb" style={{background:"transparent",color:T.ink,border:`1px solid ${T.border}`,borderRadius:4,padding:"13px 22px",fontSize:14,display:"flex",alignItems:"center",gap:6}}>
            Explorar catálogo <ChevronRight size={14}/>
          </button>
        </div>
      </section>

      <section style={{maxWidth:1152,margin:"0 auto",padding:"0 24px 20px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
        {[
          {cat:"gelato",tag:"01 · Vitrine",title:"Gelatos",desc:"Cremosos, proteicos, sem açúcar adicionado.",count:counts.gelato,art:<GelatoSVG p={{base:"#B8C97A",mid:"#8FA050",deep:"#4A5A22",swirl:"#2E3812",hl:"#DCE8A8"}} size={120} id="cg"/>},
          {cat:"bentole",tag:"02 · Take-home",title:"Bentôlé",desc:"Mini picolés premium. Alta proteína. Leve para onde for.",count:counts.bentole,art:<PicoleSVG p={{base:"#D85A6E",mid:"#A8334A",deep:"#5C1422",swirl:"#F2E7D0",hl:"#FFB0BE"}} size={120} id="cp"/>},
        ].map(c=>(
          <button key={c.cat} onClick={()=>onSelect(c.cat)} className="hl" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:4,padding:22,textAlign:"left",display:"flex",alignItems:"center",gap:16}}>
            {c.art}
            <div>
              <div className="fm" style={{fontSize:9,letterSpacing:"0.24em",color:T.inkSoft,textTransform:"uppercase",marginBottom:8}}>{c.tag}</div>
              <div className="fd" style={{fontSize:32,color:T.ink,lineHeight:1,letterSpacing:"-0.015em"}}>{c.title}</div>
              <div className="fb" style={{fontSize:13,color:T.inkSoft,marginTop:6,lineHeight:1.4}}>{c.desc}</div>
              <div className="fm" style={{fontSize:10,color:T.pistacheDark,letterSpacing:"0.18em",textTransform:"uppercase",marginTop:10}}>{c.count} sabores →</div>
            </div>
          </button>
        ))}
        <button onClick={onQuiz} style={{background:T.pistacheDark,border:"none",borderRadius:4,padding:22,display:"flex",flexDirection:"column",justifyContent:"center",textAlign:"left"}}>
          <span style={{fontSize:34,marginBottom:12}}>🎯</span>
          <div className="fd" style={{fontSize:24,color:T.surface,lineHeight:1.2}}>Descubra seu<br/>sabor ideal</div>
          <div className="fb" style={{fontSize:12,color:`${T.surface}99`,marginTop:8}}>Quiz rápido · 3 perguntas</div>
        </button>
      </section>

      <section style={{maxWidth:1152,margin:"0 auto",padding:"0 24px 20px"}}>
        <div className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:14}}>⚡ Mais ricos em proteína</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
          {topProt.map(p=>(
            <div key={p.id} className="hl" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:4,padding:14,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>onSelect(p.category)}>
              <ProductArt product={p} size={72}/>
              <div>
                <div className="fd" style={{fontSize:16,color:T.ink}}>{p.name}</div>
                <div className="fm" style={{fontSize:18,color:T.pistacheDark,fontWeight:500,marginTop:4}}>{p.nutrition.protein}g</div>
                <div className="fm" style={{fontSize:9,color:T.inkSoft,letterSpacing:"0.18em",textTransform:"uppercase"}}>proteína · {p.nutrition.kcal} kcal</div>
                <div style={{marginTop:6,display:"flex",gap:4}}>{p.moods.slice(0,1).map(m=><MoodChip key={m} mood={m} small/>)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{maxWidth:1152,margin:"0 auto",padding:"0 24px 40px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
        {[{icon:"🧬",title:"Whey WPH",desc:"Proteína hidrolisada de alta biodisponibilidade"},{icon:"🌿",title:"Base Super Clean",desc:"Inulina · Liga Neutra · Polidextrose · Steviol"},{icon:"0️⃣",title:"Zero açúcar",desc:"Sem sacarose adicionada em toda a linha"},{icon:"🧪",title:"Formulação técnica",desc:"Balanço PAC/POD calibrado para textura perfeita"}].map(b=>(
          <div key={b.title} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:4,padding:16}}>
            <div style={{fontSize:24,marginBottom:8}}>{b.icon}</div>
            <div className="fd" style={{fontSize:15,color:T.ink,marginBottom:4}}>{b.title}</div>
            <div className="fb" style={{fontSize:12,color:T.inkSoft,lineHeight:1.4}}>{b.desc}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

/* ========== LIST ========== */
function ProductList({category,onBack,onSelectProduct,compareIds,onToggleCompare,onOpenCompare}){
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("all");
  const [moodF,setMoodF]=useState(null);
  const allMoods=useMemo(()=>[...new Set(PRODUCTS.filter(p=>p.category===category).flatMap(p=>p.moods))],...[category]);
  const items=useMemo(()=>PRODUCTS.filter(p=>p.category===category).filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).filter(p=>filter==="nogluten"?!p.flags.gluten:filter==="nolactose"?!p.flags.lactose:filter==="prot9"?p.nutrition.protein>=9:true).filter(p=>moodF?p.moods.includes(moodF):true),[category,search,filter,moodF]);
  const meta=category==="gelato"?{tag:"01 / Linha Vitrine",title:"Gelatos",sub:"Potes para vitrine · cremoso italiano"}:{tag:"02 / Linha Take-Home",title:"Bentôlé",sub:"Mini picolés · 55–60g · embalagem individual"};
  return(
    <div className="fade">
      <div style={{maxWidth:1152,margin:"0 auto",padding:"28px 24px 0"}}>
        <button onClick={onBack} className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.inkSoft,textTransform:"uppercase",background:"none",border:"none",display:"flex",alignItems:"center",gap:6,marginBottom:20}}><ArrowLeft size={13}/>Voltar</button>
        <div style={{display:"flex",flexWrap:"wrap",alignItems:"flex-end",justifyContent:"space-between",gap:14,marginBottom:20}}>
          <div>
            <div className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:8}}>{meta.tag}</div>
            <h1 className="fd" style={{fontSize:"clamp(36px,5vw,58px)",lineHeight:1,color:T.ink,fontWeight:400,letterSpacing:"-0.02em"}}>{meta.title}</h1>
            <p className="fb" style={{fontSize:13,color:T.inkSoft,marginTop:6}}>{meta.sub}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,background:T.surface,border:`1px solid ${T.border}`,borderRadius:3,padding:"8px 12px",minWidth:190}}>
            <Search size={13} style={{color:T.inkSoft}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar sabor…" className="fb" style={{background:"transparent",border:"none",fontSize:13,color:T.ink,width:"100%"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
          <Filter size={12} style={{color:T.inkSoft}}/>
          {[{id:"all",l:"Todos"},{id:"prot9",l:"Proteína ≥ 9g"},{id:"nogluten",l:"Sem glúten"},{id:"nolactose",l:"Sem lactose"}].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} className="fm" style={{fontSize:10,letterSpacing:"0.14em",padding:"6px 12px",borderRadius:2,textTransform:"uppercase",background:filter===f.id?T.pistacheDark:"transparent",color:filter===f.id?T.surface:T.inkSoft,border:`1px solid ${filter===f.id?T.pistacheDark:T.border}`}}>{f.l}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20,alignItems:"center"}}>
          <button onClick={()=>setMoodF(null)} className="fm" style={{fontSize:9,letterSpacing:"0.14em",padding:"5px 10px",borderRadius:2,textTransform:"uppercase",background:!moodF?T.ink:"transparent",color:!moodF?T.surface:T.inkSoft,border:`1px solid ${!moodF?T.ink:T.border}`}}>Todos os momentos</button>
          {allMoods.map(m=>{const mm=MOOD_META[m];if(!mm)return null;const a=moodF===m;return(<button key={m} onClick={()=>setMoodF(a?null:m)} className="fm" style={{fontSize:9,letterSpacing:"0.1em",padding:"5px 10px",borderRadius:2,background:a?mm.bg:"transparent",color:a?mm.color:T.inkSoft,border:`1px solid ${a?mm.color:T.border}`}}>{mm.icon} {mm.label}</button>);})}
        </div>
        {compareIds.length>0&&(
          <div style={{background:T.bgWarm,border:`1px solid ${T.border}`,borderRadius:3,padding:"10px 16px",marginBottom:18,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <span className="fb" style={{fontSize:13,color:T.ink}}><Scale size={13} style={{display:"inline",marginRight:6}}/>{compareIds.length} sabor{compareIds.length>1?"es":""} para comparar</span>
            <button onClick={onOpenCompare} className="fb" style={{background:T.pistacheDark,color:T.surface,border:"none",borderRadius:3,padding:"7px 14px",fontSize:12,fontWeight:500}}>Comparar agora</button>
          </div>
        )}
      </div>
      <div style={{maxWidth:1152,margin:"0 auto",padding:"0 24px 32px"}}>
        {items.length===0?<div className="fb" style={{textAlign:"center",padding:"60px 0",color:T.inkSoft}}>Nenhum sabor com esses filtros.</div>:(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:14}}>
            {items.map((p,i)=><ProductCard key={p.id} product={p} delay={i*35} onClick={()=>onSelectProduct(p.id)} inCompare={compareIds.includes(p.id)} canCompare={compareIds.length<3} onToggleCompare={()=>onToggleCompare(p.id)}/>)}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({product:p,onClick,delay,inCompare,canCompare,onToggleCompare}){
  return(
    <div className="rise hl" style={{background:T.surface,border:`1px solid ${inCompare?T.pistacheDark:T.border}`,borderRadius:4,overflow:"hidden",animationDelay:`${delay}ms`,display:"flex",flexDirection:"column"}}>
      <button onClick={onClick} style={{background:`linear-gradient(160deg,${T.bgWarm},${T.surface})`,padding:"14px 0 8px",display:"flex",justifyContent:"center",border:"none",width:"100%"}}>
        <ProductArt product={p} size={138}/>
      </button>
      <div style={{padding:"12px 16px 16px",flex:1,display:"flex",flexDirection:"column"}}>
        <button onClick={onClick} style={{background:"none",border:"none",textAlign:"left",padding:0}}>
          <div className="fd" style={{fontSize:20,color:T.ink,lineHeight:1.1,letterSpacing:"-0.01em"}}>{p.name}</div>
          {p.sub&&<div className="fb" style={{fontSize:11.5,color:T.inkSoft,marginTop:3}}>{p.sub}</div>}
        </button>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:10}}>{p.moods.slice(0,2).map(m=><MoodChip key={m} mood={m} small/>)}</div>
        <div style={{marginTop:14}}>
          <MacroBar label={`Proteína`} value={p.nutrition.protein} max={18} color={T.pistacheDark}/>
          <MacroBar label={`Carboidratos`} value={p.nutrition.carbs} max={31} color={T.accent}/>
        </div>
        <div className="hd" style={{margin:"12px 0"}}/>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={onClick} className="fb" style={{flex:1,padding:"9px 0",background:T.pistacheDark,color:T.surface,border:"none",borderRadius:3,fontSize:12,fontWeight:500}}>Ver ficha completa</button>
          <button onClick={e=>{e.stopPropagation();onToggleCompare();}} title={inCompare?"Remover":canCompare?"Comparar":"Máx 3"} style={{width:36,height:36,border:`1px solid ${inCompare?T.pistacheDark:T.border}`,borderRadius:3,background:inCompare?T.pistacheDark:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:inCompare?T.surface:T.inkSoft,opacity:(!inCompare&&!canCompare)?0.4:1}}><Scale size={14}/></button>
        </div>
        <div style={{display:"flex",gap:5,marginTop:10,flexWrap:"wrap"}}>
          {!p.flags.gluten&&<Chip tone="good">Sem Glúten</Chip>}
          {!p.flags.lactose&&<Chip tone="good">Sem Lactose</Chip>}
          {p.nutrition.addedSugars===0&&<Chip tone="good">0 Açúcar Adic.</Chip>}
        </div>
        {POLIOL_IDS.includes(p.id)&&(
          <div style={{marginTop:10,display:"flex",alignItems:"flex-start",gap:6,background:"#FDF8EC",border:"1px solid #E8D98A",borderRadius:2,padding:"7px 10px"}}>
            <span style={{fontSize:11,flexShrink:0}}>⚠️</span>
            <span className="fb" style={{fontSize:10.5,color:"#6B5A10",lineHeight:1.45}}>Contém polióis (sorbitol, maltitol ~0,5%). {AVISO_POLIOL}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== DETAIL ========== */
function ProductDetail({productId,onBack,favorites,onToggleFav,compareIds,onToggleCompare}){
  const product=PRODUCTS.find(p=>p.id===productId);if(!product)return null;
  const n=product.nutrition;
  const [protGoal,setProtGoal]=useState(120);
  const VD={kcal:2000,carbs:300,protein:50,fat:65,satFat:20,fiber:25,sodium:2400};
  const pct=(v,r)=>Math.round((v/r)*100);
  const isFav=favorites.includes(product.id);
  const inCmp=compareIds.includes(product.id);
  const units=Math.ceil(protGoal/n.protein);
  const ROWS=[
    {k:"kcal",l:"Valor energético",v:n.kcal,u:"kcal",vd:pct(n.kcal,VD.kcal)},
    {k:"carbs",l:"Carboidratos",v:n.carbs,u:"g",vd:pct(n.carbs,VD.carbs)},
    {k:"sugars",l:"Açúcares totais",v:n.sugars,u:"g",ind:true},
    {k:"added",l:"Açúcares adicionados",v:n.addedSugars,u:"g",ind:true,hl:n.addedSugars===0},
    {k:"protein",l:"Proteínas",v:n.protein,u:"g",vd:pct(n.protein,VD.protein),main:true},
    {k:"fat",l:"Gorduras totais",v:n.fat,u:"g",vd:pct(n.fat,VD.fat)},
    {k:"satFat",l:"Gorduras saturadas",v:n.satFat,u:"g",vd:pct(n.satFat,VD.satFat),ind:true},
    {k:"trans",l:"Gorduras trans",v:n.transFat,u:"g",ind:true},
    {k:"fiber",l:"Fibra alimentar",v:n.fiber,u:"g",vd:pct(n.fiber,VD.fiber)},
    {k:"sodium",l:"Sódio",v:n.sodium,u:"mg",vd:pct(n.sodium,VD.sodium)},
  ];
  const similar=PRODUCTS.filter(p=>p.id!==product.id&&p.moods.some(m=>product.moods.includes(m))).slice(0,3);
  return(
    <div className="fade">
      <div style={{maxWidth:1152,margin:"0 auto",padding:"28px 24px 40px"}}>
        <button onClick={onBack} className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.inkSoft,textTransform:"uppercase",background:"none",border:"none",display:"flex",alignItems:"center",gap:6,marginBottom:24}}><ArrowLeft size={13}/>Voltar</button>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1.4fr)",gap:16,alignItems:"start"}}>
          {/* LEFT */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:`linear-gradient(160deg,${T.bgWarm},${T.surface})`,border:`1px solid ${T.border}`,borderRadius:4,padding:26,textAlign:"center",position:"relative"}}>
              <div style={{position:"absolute",top:12,right:12,display:"flex",gap:8}}>
                <button onClick={onToggleFav} style={{background:isFav?"#FFEDED":T.bgWarm,border:`1px solid ${isFav?"#E8A0A0":T.border}`,borderRadius:"50%",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",color:isFav?"#C04040":T.inkSoft}}><Heart size={14} fill={isFav?"#C04040":"none"}/></button>
                <button onClick={onToggleCompare} style={{background:inCmp?"#E5EBD3":T.bgWarm,border:`1px solid ${inCmp?T.pistacheDark:T.border}`,borderRadius:"50%",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",color:inCmp?T.pistacheDark:T.inkSoft}}><Scale size={14}/></button>
              </div>
              <div className="fm" style={{fontSize:9,letterSpacing:"0.28em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:6}}>{product.category==="gelato"?"Gelato · Vitrine":"Picolé · Bentôlé"}</div>
              <h1 className="fd" style={{fontSize:"clamp(26px,4vw,42px)",lineHeight:1,color:T.ink,fontWeight:400,letterSpacing:"-0.015em"}}>{product.name}</h1>
              {product.sub&&<p className="fb" style={{fontSize:13,color:T.inkSoft,marginTop:6}}>{product.sub}</p>}
              <div style={{display:"flex",justifyContent:"center",margin:"18px 0"}}><ProductArt product={product} size={210}/></div>
              <p className="fb" style={{fontSize:13.5,color:T.inkSoft,lineHeight:1.6}}>{product.description}</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",marginTop:14}}>{product.moods.map(m=><MoodChip key={m} mood={m}/>)}</div>
              <div className="hd" style={{margin:"16px 0"}}/>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
                {!product.flags.gluten&&<Chip tone="good">Sem Glúten</Chip>}
                {!product.flags.lactose&&<Chip tone="good">Sem Lactose</Chip>}
                {n.addedSugars===0&&<Chip tone="good">0 Açúcar Adicionado</Chip>}
                {n.protein>=9&&<Chip tone="good">Alta Proteína</Chip>}
                {product.flags.gluten&&<Chip tone="warn">Contém Glúten</Chip>}
                {product.flags.lactose&&<Chip tone="warn">Contém Lactose</Chip>}
              </div>
              {POLIOL_IDS.includes(product.id)&&(
                <div style={{marginTop:16,display:"flex",alignItems:"flex-start",gap:10,background:"#FDF8EC",border:"1px solid #D4B840",borderRadius:3,padding:"12px 14px",textAlign:"left"}}>
                  <span style={{fontSize:18,flexShrink:0,marginTop:1}}>⚠️</span>
                  <div>
                    <div className="fm" style={{fontSize:9,letterSpacing:"0.22em",textTransform:"uppercase",color:"#7A6210",marginBottom:4}}>Aviso regulatório · ANVISA</div>
                    <div className="fb" style={{fontSize:12.5,color:"#5A4A08",lineHeight:1.55}}>
                      Contém <strong>polióis</strong> (sorbitol e maltitol) em aproximadamente 0,5% da composição, provenientes da Base Super Clean. <strong>{AVISO_POLIOL}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Calculadora */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:4,padding:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><Target size={14} style={{color:T.pistacheDark}}/><h3 className="fm" style={{fontSize:10,letterSpacing:"0.25em",color:T.ink,textTransform:"uppercase"}}>Calculadora de proteína</h3></div>
              <div className="fb" style={{fontSize:13,color:T.inkSoft,marginBottom:10}}>Qual é sua meta diária de proteína?</div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <input type="range" min={30} max={250} value={protGoal} onChange={e=>setProtGoal(Number(e.target.value))} style={{flex:1,accentColor:T.pistacheDark}}/>
                <span className="fm" style={{fontSize:13,color:T.ink,minWidth:55}}>{protGoal}g</span>
              </div>
              <div style={{background:`${T.pistacheDark}18`,border:`1px solid ${T.pistacheDark}40`,borderRadius:4,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:28}}>{product.category==="gelato"?"🍨":"🍡"}</span>
                <div>
                  <div className="fd" style={{fontSize:20,color:T.pistacheDark,fontWeight:500}}>{units} {product.category==="gelato"?"porções":"picolés"}</div>
                  <div className="fb" style={{fontSize:12,color:T.inkSoft,marginTop:2}}>= {(n.protein*units).toFixed(0)}g prot · {(n.kcal*units).toFixed(0)} kcal</div>
                </div>
              </div>
            </div>
          </div>
          {/* RIGHT */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Tabela */}
            <div className="gn" style={{background:T.surface,border:`1px solid ${T.ink}`,borderRadius:4,overflow:"hidden"}}>
              <div style={{background:T.ink,color:T.bg,padding:"13px 20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <h3 className="fd" style={{fontSize:20,fontWeight:500}}>Informação Nutricional</h3>
                  <span className="fm" style={{fontSize:8,letterSpacing:"0.28em",opacity:0.6,textTransform:"uppercase"}}>ANVISA · RDC 429/20</span>
                </div>
                <div className="fm" style={{fontSize:9,letterSpacing:"0.16em",opacity:0.68,textTransform:"uppercase",marginTop:4}}>Porção: {product.portionLabel}</div>
              </div>
              <div style={{padding:"0 20px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 70px 48px",padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                  {["Nutriente","Por porção","%VD*"].map((h,i)=><span key={h} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase",textAlign:i>0?"right":"left"}}>{h}</span>)}
                </div>
                {ROWS.map((row,i)=>(
                  <div key={row.k} style={{display:"grid",gridTemplateColumns:"1fr 70px 48px",padding:"11px 0",paddingLeft:row.ind?14:0,borderBottom:i<ROWS.length-1?`1px solid ${T.borderSoft}`:"none",background:row.main?"#EFF5E5":"transparent",marginLeft:row.main?-20:0,paddingLeft:row.main?20:row.ind?14:0,paddingRight:row.main?20:0,marginRight:row.main?-20:0}}>
                    <span className="fb" style={{fontSize:row.ind?12:13.5,color:row.ind?T.inkSoft:T.ink,fontWeight:row.main?600:400}}>{row.l}</span>
                    <span className="fm" style={{textAlign:"right",fontSize:13,color:row.main?T.pistacheDark:T.ink,fontWeight:row.main?600:400}}>{row.v}{row.u!=="kcal"?` ${row.u}`:""}</span>
                    <span className="fm" style={{textAlign:"right",fontSize:11,color:T.inkSoft}}>{row.vd!=null?`${row.vd}%`:"—"}</span>
                  </div>
                ))}
              </div>
              <div style={{background:T.bgWarm,padding:"10px 20px",borderTop:`1px solid ${T.border}`}}>
                <p className="fb" style={{fontSize:10.5,color:T.inkSoft,lineHeight:1.5}}>*Valores diários com base em dieta de 2.000 kcal.</p>
                {POLIOL_IDS.includes(product.id)&&(
                  <p className="fb" style={{fontSize:10.5,color:"#6B5010",lineHeight:1.5,marginTop:6,paddingTop:6,borderTop:`1px dashed #D4B840`}}>
                    ⚠️ Contém polióis (sorbitol, maltitol). {AVISO_POLIOL}
                  </p>
                )}
              </div>
            </div>
            {/* Ingredientes */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:4,padding:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><Leaf size={14} style={{color:T.pistacheDark}}/><h3 className="fm" style={{fontSize:10,letterSpacing:"0.25em",color:T.ink,textTransform:"uppercase"}}>Ingredientes</h3></div>
              {product.ingredients.map((ing,i)=>(
                <div key={i}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,padding:"9px 0",borderBottom:i<product.ingredients.length-1?`1px solid ${T.borderSoft}`:"none"}}>
                    <span className="fb" style={{fontSize:13.5,color:T.ink}}>{ing.name}</span>
                    <span className="fm" style={{fontSize:11.5,color:T.inkSoft}}>{ing.qty}</span>
                  </div>
                  {ing.note&&<div className="fb" style={{fontSize:11,color:T.inkSoft,fontStyle:"italic",borderLeft:`2px solid ${T.pistache}`,paddingLeft:10,marginLeft:4,marginBottom:4,marginTop:2,lineHeight:1.5}}>Composição: {ing.note}</div>}
                </div>
              ))}
            </div>
            {/* Ficha */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:4,padding:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><Beaker size={14} style={{color:T.pistacheDark}}/><h3 className="fm" style={{fontSize:10,letterSpacing:"0.25em",color:T.ink,textTransform:"uppercase"}}>Ficha de produção</h3></div>
              {[{l:"Rendimento",v:product.yield},{l:"Porção",v:product.portionLabel},{l:"Linha",v:product.category==="gelato"?"Gelato (vitrine)":"Picolé Bentôlé"}].map(r=>(
                <div key={r.l} style={{display:"grid",gridTemplateColumns:"100px 1fr",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.borderSoft}`}}>
                  <span className="fm" style={{fontSize:9,letterSpacing:"0.18em",color:T.inkSoft,textTransform:"uppercase",paddingTop:2}}>{r.l}</span>
                  <span className="fb" style={{fontSize:13.5,color:T.ink}}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Similares */}
        {similar.length>0&&(
          <div style={{marginTop:28}}>
            <div className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:14}}>Você também pode gostar</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
              {similar.map(p=>(
                <button key={p.id} onClick={onBack} className="hl" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:4,padding:14,display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
                  <ProductArt product={p} size={68}/>
                  <div>
                    <div className="fd" style={{fontSize:15,color:T.ink}}>{p.name}</div>
                    <div className="fb" style={{fontSize:11,color:T.inkSoft,marginTop:3}}>{p.nutrition.kcal} kcal · {p.nutrition.protein}g prot.</div>
                    <div style={{marginTop:6,display:"flex",gap:4}}>{p.moods.slice(0,1).map(m=><MoodChip key={m} mood={m} small/>)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== APP ========== */
export default function App(){
  const[view,setView]=useState("home");
  const[category,setCat]=useState(null);
  const[productId,setProd]=useState(null);
  const[showQuiz,setShowQuiz]=useState(false);
  const[showCmp,setShowCmp]=useState(false);
  const[compareIds,setCmpIds]=useState([]);
  const[favorites,setFavs]=useState([]);
  useEffect(()=>{window.scrollTo({top:0,behavior:"smooth"});},[view,productId]);
  const goHome=useCallback(()=>{setView("home");setCat(null);setProd(null);},[]);
  const openCat=useCallback((c)=>{setCat(c);setView("list");},[]);
  const openProd=useCallback((id)=>{setProd(id);setView("detail");},[]);
  const backList=useCallback(()=>{setView("list");setProd(null);},[]);
  const toggleCmp=useCallback((id)=>setCmpIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<3?[...prev,id]:prev),[]);
  const toggleFav=useCallback((id)=>setFavs(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]),[]);
  const onQuizResult=useCallback((id)=>{const p=PRODUCTS.find(x=>x.id===id);if(p){setCat(p.category);setProd(id);setView("detail");}},[]);
  return(
    <div className="min-h-screen fb gn" style={{background:T.bg,color:T.ink}}>
      <GStyle/>
      <Header onHome={goHome} compareCount={compareIds.length} onOpenCompare={()=>setShowCmp(true)} onQuiz={()=>setShowQuiz(true)} favorites={favorites}/>
      {view==="home"&&<Home onSelect={openCat} onQuiz={()=>setShowQuiz(true)}/>}
      {view==="list"&&<ProductList category={category} onBack={goHome} onSelectProduct={openProd} compareIds={compareIds} onToggleCompare={toggleCmp} onOpenCompare={()=>setShowCmp(true)}/>}
      {view==="detail"&&<ProductDetail productId={productId} onBack={backList} favorites={favorites} onToggleFav={()=>toggleFav(productId)} compareIds={compareIds} onToggleCompare={()=>toggleCmp(productId)}/>}
      {showQuiz&&<QuizModal onClose={()=>setShowQuiz(false)} onResult={(id)=>{setShowQuiz(false);onQuizResult(id);}}/>}
      {showCmp&&compareIds.length>=2&&<CompareModal ids={compareIds} onClose={()=>setShowCmp(false)} onViewProduct={(id)=>{setShowCmp(false);const p=PRODUCTS.find(x=>x.id===id);if(p){setCat(p.category);openProd(id);}}}/>}
      <footer style={{maxWidth:1152,margin:"0 auto",padding:"24px 24px",display:"flex",justifyContent:"space-between",borderTop:`1px solid ${T.border}`}}>
        <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>Bentô Gelatos · ES · BR</div>
        <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>v3.0 · Clean Label</div>
      </footer>
    </div>
  );
}
