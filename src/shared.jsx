import { useState, useEffect } from "react";
import { track } from "@vercel/analytics";
import { MOOD_META } from "./data.js";

export const tk = (name, fn) => {
  try { track(name); } catch {}
  try {
    const body = JSON.stringify({ n: name });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/ev", body);
    else fetch("/api/ev", { method: "POST", body, keepalive: true });
  } catch {}
  if (typeof fn === "function") fn();
};

// Conquistas: modais disparam um evento global; o App escuta, persiste e mostra o toast.
export const award = (id) => { try { window.dispatchEvent(new CustomEvent("bento:achieve", { detail: id })); } catch { /* */ } };


export const T = {
  bg:"#F6F1E7",bgWarm:"#EFE7D6",surface:"#FFFDF7",
  ink:"#232619",inkSoft:"#5E6353",
  pistache:"#7C8C66",pistacheDark:"#46583A",
  border:"#E4DCC9",borderSoft:"#EFE8D8",accent:"#C9A24A",
};

// Apresentação institucional da marca (pitch deck no Gamma)

export const DECK_URL = "/Bento-Functional-Nutrition.pdf";



export function BentoLogo({size=120}){
  return <img src="/bento-logo.webp" alt="Bentô Functional Nutrition" width={size} height={size} fetchpriority="high" decoding="async" style={{display:"block",borderRadius:"50%"}}/>;
}


export function GelatoSVG({p,size=200,id}){
  const {base,mid,deep,swirl,hl}=p,u=`g-${id}`;
  return(<svg viewBox="0 0 220 220" width={size} height={size}><defs><radialGradient id={`${u}-c`} cx="40%" cy="30%" r="80%"><stop offset="0%" stopColor={hl}/><stop offset="35%" stopColor={base}/><stop offset="80%" stopColor={mid}/><stop offset="100%" stopColor={deep}/></radialGradient><linearGradient id={`${u}-p`} x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#FFF"/><stop offset="50%" stopColor="#F8F4E8"/><stop offset="100%" stopColor="#D9D0B5"/></linearGradient><radialGradient id={`${u}-s`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1F2317" stopOpacity="0.3"/><stop offset="100%" stopColor="#1F2317" stopOpacity="0"/></radialGradient><radialGradient id={`${u}-g`} cx="35%" cy="20%" r="50%"><stop offset="0%" stopColor="#FFF" stopOpacity="0.5"/><stop offset="60%" stopColor="#FFF" stopOpacity="0"/></radialGradient><filter id={`${u}-b`}><feGaussianBlur stdDeviation="1.2"/></filter></defs><ellipse cx="110" cy="200" rx="78" ry="8" fill={`url(#${u}-s)`}/><path d="M 50 102 L 58 188 Q 60 198 70 198 L 150 198 Q 160 198 162 188 L 170 102 Z" fill={`url(#${u}-p)`} stroke="#B8AE8E" strokeWidth="0.8"/><g opacity="0.15" stroke="#8B7E5A" strokeWidth="0.4"><line x1="80" y1="110" x2="83" y2="195"/><line x1="110" y1="110" x2="110" y2="195"/><line x1="140" y1="110" x2="137" y2="195"/></g><ellipse cx="110" cy="102" rx="62" ry="10" fill="#FBF8EE" stroke="#B8AE8E" strokeWidth="0.8"/><path d="M 52 100 Q 58 72 78 70 Q 88 50 105 60 Q 118 42 132 58 Q 148 50 158 72 Q 168 80 168 98 Z" fill={`url(#${u}-c)`}/><path d="M 65 88 Q 85 70 110 75 Q 130 68 148 82" fill="none" stroke={hl} strokeWidth="3" strokeLinecap="round" opacity="0.65"/><path d="M 72 92 Q 92 82 112 92 Q 132 84 152 92" fill="none" stroke={swirl} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" filter={`url(#${u}-b)`}/><circle cx="92" cy="84" r="2" fill={swirl} opacity="0.7"/><circle cx="128" cy="78" r="1.6" fill={swirl} opacity="0.6"/><path d="M 60 78 Q 80 58 110 64 Q 130 56 150 72" fill={`url(#${u}-g)`} opacity="0.65"/><rect x="80" y="148" width="60" height="32" rx="1" fill="#FBF8EE" stroke="#B8AE8E" strokeWidth="0.6"/><line x1="86" y1="158" x2="134" y2="158" stroke="#5C6B3A" strokeWidth="0.8" opacity="0.6"/><line x1="86" y1="164" x2="124" y2="164" stroke={T.inkSoft} strokeWidth="0.5" opacity="0.35"/></svg>);
}


export function PicoleSVG({p,size=200,id}){
  const {base,mid,deep,swirl,hl}=p,u=`p-${id}`;
  return(<svg viewBox="0 0 220 220" width={size} height={size}><defs><linearGradient id={`${u}-b`} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={hl} stopOpacity="0.85"/><stop offset="20%" stopColor={base}/><stop offset="70%" stopColor={mid}/><stop offset="100%" stopColor={deep}/></linearGradient><linearGradient id={`${u}-c`} x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={mid}/><stop offset="100%" stopColor={deep}/></linearGradient><linearGradient id={`${u}-st`} x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#A87C4A"/><stop offset="50%" stopColor="#D9B074"/><stop offset="100%" stopColor="#8B6535"/></linearGradient><radialGradient id={`${u}-s`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1F2317" stopOpacity="0.3"/><stop offset="100%" stopColor="#1F2317" stopOpacity="0"/></radialGradient><radialGradient id={`${u}-g`} cx="30%" cy="25%" r="55%"><stop offset="0%" stopColor="#FFF" stopOpacity="0.42"/><stop offset="60%" stopColor="#FFF" stopOpacity="0"/></radialGradient></defs><ellipse cx="110" cy="208" rx="55" ry="6" fill={`url(#${u}-s)`}/><rect x="102" y="160" width="16" height="46" rx="3" fill={`url(#${u}-st)`} stroke="#5E3F1A" strokeWidth="0.6"/><line x1="106" y1="170" x2="106" y2="200" stroke="#7A5028" strokeWidth="0.4" opacity="0.6"/><path d="M 60 38 Q 60 26 72 26 L 148 26 Q 160 26 160 38 L 160 158 Q 160 168 150 168 L 70 168 Q 60 168 60 158 Z" fill={`url(#${u}-b)`} stroke={deep} strokeWidth="0.8"/><path d="M 60 38 Q 60 26 72 26 L 148 26 Q 160 26 160 38 L 160 60 Q 152 70 144 60 Q 134 76 124 62 Q 110 76 100 60 Q 88 76 78 60 Q 68 70 60 60 Z" fill={`url(#${u}-c)`}/><ellipse cx="90" cy="40" rx="22" ry="6" fill={hl} opacity="0.38"/><ellipse cx="78" cy="92" rx="3.5" ry="2.5" fill={swirl} opacity="0.85"/><ellipse cx="135" cy="105" rx="3" ry="2" fill={swirl} opacity="0.8"/><ellipse cx="100" cy="125" rx="3.2" ry="2.2" fill={swirl} opacity="0.8"/><ellipse cx="120" cy="80" rx="2.5" ry="1.8" fill={hl} opacity="0.65"/><ellipse cx="85" cy="135" rx="2.8" ry="2" fill={swirl} opacity="0.7"/><path d="M 66 50 Q 64 100 70 158" fill="none" stroke="#FFF" strokeWidth="2.5" opacity="0.2"/><path d="M 60 38 Q 60 26 72 26 L 148 26 Q 160 26 160 38 L 160 158 Q 160 168 150 168 L 70 168 Q 60 168 60 158 Z" fill={`url(#${u}-g)`}/><circle cx="68" cy="115" r="0.9" fill="#FFF" opacity="0.55"/><circle cx="155" cy="130" r="0.8" fill="#FFF" opacity="0.5"/></svg>);
}


export function ProductArt({product,size}){
  // Foto por convenção (/sabores/<id>.jpg); se faltar, cai para a arte SVG.
  const [err,setErr]=useState(false);
  const src=product.image||`/sabores/${product.id}.jpg`;
  if(src&&!err) return <img src={src} alt={product.name} loading="lazy" decoding="async" width={size} height={size} onError={()=>setErr(true)} style={{width:size,height:size,objectFit:"cover",borderRadius:10,background:T.bgWarm}}/>;
  return product.category==="gelato"?<GelatoSVG p={product.palette} size={size} id={product.id}/>:<PicoleSVG p={product.palette} size={size} id={product.id}/>;
}


export function MoodChip({mood,small}){
  const m=MOOD_META[mood];if(!m)return null;
  return(<span style={{fontSize:small?9:10,letterSpacing:"0.1em",padding:small?"3px 7px":"4px 9px",background:m.bg,color:m.color,borderRadius:9,textTransform:"uppercase",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:4,fontFamily:"'JetBrains Mono',monospace"}}><span>{m.icon}</span>{m.label}</span>);
}

export function Chip({children,tone="neutral"}){
  const t={neutral:{bg:T.bgWarm,color:T.ink,border:T.border},good:{bg:"#E5EBD3",color:T.pistacheDark,border:"#C7D29F"},warn:{bg:"#F2E2C5",color:"#7A5320",border:"#D9BD8A"}}[tone];
  return(<span style={{fontSize:10,letterSpacing:"0.12em",padding:"4px 8px",background:t.bg,color:t.color,border:`1px solid ${t.border}`,borderRadius:9,textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace"}}>{children}</span>);
}

export function MacroBar({label,value,max,color=T.pistacheDark}){
  const pct=Math.min(100,(value/max)*100);
  return(<div style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:9,letterSpacing:"0.18em",color:T.inkSoft,textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace"}}>{label}</span><span style={{fontSize:10,color:T.ink,fontWeight:500,fontFamily:"'JetBrains Mono',monospace"}}>{value}g</span></div><div style={{height:5,background:T.borderSoft,borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:99,transition:"width .6s cubic-bezier(.2,.8,.2,1)"}}/></div></div>);
}


export function useModal(onClose){
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onClose();};
    document.addEventListener("keydown",h);
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{document.removeEventListener("keydown",h);document.body.style.overflow=prev;};
  },[onClose]);
}

// Placeholder para fotos que falharem ao carregar (evita ícone de imagem quebrada)

export const IMG_FB="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23EAE3CE'/%3E%3Ctext x='40' y='52' font-size='34' text-anchor='middle'%3E%F0%9F%8D%A8%3C/text%3E%3C/svg%3E";

export const onImgErr=e=>{if(!e.currentTarget.dataset.fb){e.currentTarget.dataset.fb="1";e.currentTarget.src=IMG_FB;}};

/* ========== QUIZ ========== */

export const VD={kcal:2000,carbs:300,addedSugars:50,protein:50,fat:65,satFat:20,fiber:25,sodium:2000};
// Arredondamento/formatação pt-BR (vírgula decimal); sódio < 5 mg = não significativo → "0"

export const br=v=>Number.isInteger(v)?String(v):String(v).replace(".",",");
// Ordem da lista de ingredientes: decrescente de quantidade na receita
// (RDC 727/2022, art. 22 — obrigatória no rótulo). g e mL são tratados como
// equivalentes só para ordenar (densidades ≈ 1); empate mantém a ordem da receita.
// Qty não numérica (ex.: "a confirmar") NÃO vira zero: o ingrediente preserva a
// posição em que foi declarado na receita até a gramatura ser definida.

export function orderIngredients(ings){
  const grams=q=>{const g=parseFloat(String(q).replace(/\./g,""));return Number.isFinite(g)?g:null;}; // "2.500 mL" → 2500
  const all=ings.map((ing,i)=>({ing,i,g:grams(ing.qty)}));
  const sorted=all.filter(x=>x.g!==null).sort((a,b)=>b.g-a.g||a.i-b.i);
  let k=0;
  return all.map(x=>{
    const pin=all.find(y=>y.g===null&&y.i===x.i);
    return pin?pin.ing:sorted[k++].ing;
  });
}
