import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { ArrowLeft, ChevronRight, Search, Leaf, Beaker, Filter, Heart, Scale, X, Sparkles, Target, Printer } from "lucide-react";
import { PRODUCTS, AVISO_POLIOL, MOOD_META, QUIZ, ALLERGENS, PODE_CONTER, lupaFrontal, proteinClaim } from "./data.js";
import { Analytics } from "@vercel/analytics/react";
import { track } from "@vercel/analytics";

// Rastreio de cliques. Registra no Vercel Web Analytics (oficial) e no nosso painel próprio (/api/ev → Redis).
// tk("nome do botão", fn?) registra o clique e, se passado, executa a ação original.
const tk = (name, fn) => {
  try { track(name); } catch {}
  try {
    const body = JSON.stringify({ n: name });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/ev", body);
    else fetch("/api/ev", { method: "POST", body, keepalive: true });
  } catch {}
  if (typeof fn === "function") fn();
};

const T = {
  bg:"#F1ECDD",bgWarm:"#EAE3CE",surface:"#FBF8EE",
  ink:"#1F2317",inkSoft:"#5A5E4E",
  pistache:"#8B9D5A",pistacheDark:"#5C6B3A",
  border:"#D9D2BD",borderSoft:"#E5DFCB",accent:"#C4A882",
};

// Apresentação institucional da marca (pitch deck no Gamma)
const DECK_URL = "/Bento-Functional-Nutrition.pdf";


function BentoLogo({size=120}){
  return <img src="/bento-logo.webp" alt="Bentô Functional Nutrition" width={size} height={size} fetchpriority="high" style={{display:"block",borderRadius:"50%"}}/>;
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
  // Foto por convenção (/sabores/<id>.jpg); se faltar, cai para a arte SVG.
  const [err,setErr]=useState(false);
  const src=product.image||`/sabores/${product.id}.jpg`;
  if(src&&!err) return <img src={src} alt={product.name} loading="lazy" onError={()=>setErr(true)} style={{width:size,height:size,objectFit:"cover",borderRadius:4,background:T.bgWarm}}/>;
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
.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none}
.gn::after{content:'';position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(31,35,23,.05) 1px,transparent 1px);background-size:3px 3px;opacity:.6;mix-blend-mode:multiply}
*::-webkit-scrollbar{width:5px}*::-webkit-scrollbar-thumb{background:${T.border};border-radius:99px}
button{cursor:pointer}
:focus{outline:none}
:focus-visible{outline:2px solid ${T.pistacheDark};outline-offset:2px}
.hdr{position:sticky;top:0;z-index:40;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.shell{min-height:100dvh}
.detail-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:16px;align-items:start}
@media(max-width:760px){.detail-grid{grid-template-columns:1fr}}
.cmp-first{position:sticky;left:0;background:${T.surface};z-index:1}
@media print{
  @page{margin:12mm}
  body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .no-print{display:none!important}
  .print-only{display:flex!important}
  .gn::after{display:none!important}
  .print-grid{display:block!important}
  .print-grid > div{margin-bottom:14px;break-inside:avoid}
  .print-grid > div > div{break-inside:avoid}
  /* IN 75/2020: tabela nutricional impressa em preto sobre branco, sem cores */
  .nutri-print,.nutri-print *{background:#fff!important;color:#000!important;border-color:#000!important}
  *{box-shadow:none!important}
}
`}</style>);}

// Comportamento padrão de modal: fecha no Esc e trava o scroll do fundo (iOS inclusive)
function useModal(onClose){
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onClose();};
    document.addEventListener("keydown",h);
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{document.removeEventListener("keydown",h);document.body.style.overflow=prev;};
  },[onClose]);
}

// Placeholder para fotos que falharem ao carregar (evita ícone de imagem quebrada)
const IMG_FB="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23EAE3CE'/%3E%3Ctext x='40' y='52' font-size='34' text-anchor='middle'%3E%F0%9F%8D%A8%3C/text%3E%3C/svg%3E";
const onImgErr=e=>{if(!e.currentTarget.dataset.fb){e.currentTarget.dataset.fb="1";e.currentTarget.src=IMG_FB;}};

/* ========== QUIZ ========== */
function QuizModal({onClose,onResult}){
  useModal(onClose);
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
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Quiz: qual é o seu Bentô" style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:6,maxWidth:480,width:"100%",border:`1px solid ${T.border}`,overflow:"hidden"}}>
        <div style={{background:T.ink,padding:"18px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>{done?"Resultado":`Pergunta ${step+1} de ${QUIZ.length}`}</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:4}}>{done?"Seu Bentô ideal 🎉":"Qual é o seu Bentô?"}</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
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
  useModal(onClose);
  const products=ids.map(id=>PRODUCTS.find(p=>p.id===id)).filter(Boolean);
  if(products.length<2)return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" style={{position:"fixed",inset:0,zIndex:100,background:"rgba(31,35,23,0.65)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="rise" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:6,maxWidth:360,width:"100%",border:`1px solid ${T.border}`,padding:"28px 24px",textAlign:"center"}}>
        <Scale size={28} style={{color:T.pistacheDark}}/>
        <div className="fd" style={{fontSize:20,color:T.ink,marginTop:10}}>Selecione 2 ou 3 sabores</div>
        <div className="fb" style={{fontSize:13,color:T.inkSoft,marginTop:6,lineHeight:1.5}}>Toque no ícone de balança ⚖️ nos cards para montar a comparação lado a lado.</div>
        <button onClick={onClose} className="fb" style={{marginTop:16,padding:"10px 20px",background:T.pistacheDark,color:T.surface,border:"none",borderRadius:4,fontSize:13,fontWeight:500}}>Entendi</button>
      </div>
    </div>
  );
  const fields=[{k:"kcal",l:"Energia (kcal)"},{k:"protein",l:"Proteínas (g)",hi:true},{k:"carbs",l:"Carboidratos (g)"},{k:"sugars",l:"Açúcares totais (g)"},{k:"addedSugars",l:"Açúc. adicionados (g)"},{k:"fat",l:"Gorduras totais (g)"},{k:"fiber",l:"Fibra alimentar (g)"},{k:"sodium",l:"Sódio (mg)"}];
  const best=(k)=>{const vs=products.map(p=>p.nutrition[k]);return(k==="protein"||k==="fiber")?Math.max(...vs):Math.min(...vs);};
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Comparar sabores" style={{position:"fixed",inset:0,zIndex:100,background:"rgba(31,35,23,0.65)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="rise" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:6,maxWidth:680,width:"100%",maxHeight:"88dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"14px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
          <span className="fd" style={{fontSize:18,color:T.bg}}>Comparando sabores</span>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th className="cmp-first" style={{padding:"14px 18px",textAlign:"left",borderBottom:`1px solid ${T.border}`,minWidth:120}}><span className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase"}}>Nutriente</span></th>
                {products.map(p=>(
                  <th key={p.id} style={{padding:"14px 18px",textAlign:"center",background:T.bg,borderBottom:`1px solid ${T.border}`,minWidth:140}}>
                    <div style={{display:"flex",justifyContent:"center",marginBottom:6}}><ProductArt product={p} size={64}/></div>
                    <div className="fd" style={{fontSize:15,color:T.ink,lineHeight:1.2}}>{p.name}</div>
                    <div className="fm" style={{fontSize:9,color:T.inkSoft,textTransform:"uppercase",letterSpacing:"0.12em",marginTop:2}}>{p.category==="gelato"?"Gelato":"Bentôlé"} · {p.portionLabel}</div>
                    <button onClick={()=>{onClose();onViewProduct(p.id);}} className="fm" style={{marginTop:8,fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",background:"transparent",border:`1px solid ${T.border}`,borderRadius:2,padding:"6px 10px",color:T.inkSoft}}>Ver ficha</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((f,i)=>{
                const b=best(f.k);
                return(<tr key={f.k} style={{background:i%2===0?T.surface:T.bg}}>
                  <td className="fb cmp-first" style={{padding:"12px 18px",fontSize:13,color:f.hi?T.ink:T.inkSoft,fontWeight:f.hi?500:400,borderBottom:`1px solid ${T.borderSoft}`}}>{f.l}</td>
                  {products.map(p=>{const v=p.nutrition[f.k],iB=v===b;return(
                    <td key={p.id} style={{padding:"12px 18px",textAlign:"center",borderBottom:`1px solid ${T.borderSoft}`}}>
                      <span className="fm" style={{fontSize:15,fontWeight:500,color:iB?T.pistacheDark:T.ink}}>{v}</span>
                      {iB&&<span style={{marginLeft:4,fontSize:11}} aria-label="melhor valor">✓</span>}
                    </td>
                  );})}
                </tr>);
              })}
              {[{l:"Glúten",k:"gluten"},{l:"Lactose",k:"lactose"}].map(f=>(
                <tr key={f.k} style={{background:T.bgWarm}}>
                  <td className="fb cmp-first" style={{padding:"12px 18px",fontSize:13,color:T.inkSoft,background:T.bgWarm}}>{f.l}</td>
                  {products.map(p=><td key={p.id} style={{padding:"12px 18px",textAlign:"center"}}><span className="fm" style={{fontSize:11,color:p.flags[f.k]?"#7A5320":T.pistacheDark}}>{p.flags[f.k]?"Contém":"Não contém"}</span></td>)}
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

/* ========== CARDÁPIO DIGITAL ========== */
const CARDAPIO = [
  { cat:"Bentôlé", emoji:"🍡", items:[
    { name:"Bentôlé P Proteico", info:"50 g (aprox. 55 g) · embalagem prateada", price:"14,90", img:"/cardapio/pic-p.jpg" },
    { name:"Bentôlé Proteico MEGA", info:"110 g aprox.", price:"26,90", img:"/cardapio/pic-mega.jpg" },
    { name:"Kit 4 Picolés Mega", info:"cada unidade sai a R$ 24,00", price:"96,00", img:"/cardapio/pic-kit4.jpg" },
    { name:"Kit 6 Bentôlés", info:"cada unidade sai a R$ 13,00", price:"78,00", img:"/cardapio/pic-kit6.jpg" },
    { name:"Bentôlé Baby", info:"cortesia · consumo local · até 1 un", price:"6,90", img:"/cardapio/pic-baby.jpg" },
  ]},
  { cat:"Gelatos", emoji:"🍨", items:[
    { name:"Gelato Box", info:"700 ml · até 3 sabores", price:"99,90", img:"/cardapio/gelato-box.jpg" },
    { name:"Tamanho M", info:"170 g · 1–2 sabores · p/ viagem", price:"28,90", img:"/cardapio/gelato-m.jpg" },
    { name:"Tamanho P", info:"120 g · 1–2 sabores · p/ viagem", price:"23,90", img:"/cardapio/gelato-p.jpg" },
  ]},
  { cat:"Shakes", emoji:"🥤", items:[
    { name:"Shake Morango c/ Maracujá", info:"Whey True Vanilla + 200 g de fruta", price:"29,90", img:"/cardapio/morango-maracuja.jpg" },
    { name:"Shake Frutas Vermelhas", info:"Whey True Fior di Latte + 200 g", price:"37,90", img:"/cardapio/frutas-vermelhas.jpg" },
    { name:"Shake Dark Chocolate", info:"Whey hidrolisado + chocolate zero", price:"37,90", img:"/cardapio/dark-chocolate.jpg" },
    { name:"Milkshake Pistache Zero", info:"gelato pistache zero batido c/ leite", price:"39,90", img:"/cardapio/milkshake-pistache.jpg" },
    { name:"Milkshake Doce de Leite Zero", info:"400 ml · gelato doce de leite zero", price:"39,90", img:"/cardapio/milkshake-doce-leite.jpg" },
  ]},
  { cat:"Bebidas", emoji:"🧃", items:[
    { name:"Brain-Up True", info:"lata", price:"14,90", img:"/cardapio/brain-up.jpg" },
    { name:"Pro Force", info:"bebida láctea proteica", price:"9,90", img:"/cardapio/pro-force.jpg" },
    { name:"Cold Brew 200 ml", info:"zero açúcar", price:"24,90", img:"/cardapio/cold-brew.jpg" },
  ]},
  { cat:"Cafeteria", emoji:"☕", items:[
    { name:"Café Expresso", info:"especial 85 pontos", price:"8,90", img:"/cardapio/cafe-expresso.jpg" },
    { name:"Café Expresso Duplo", info:"90 ml · 85 pontos", price:"14,90", img:"/cardapio/cafe-duplo.jpg" },
    { name:"Coado V60", info:"café especial 86 pontos", price:"14,90", img:"/cardapio/coado-v60.jpg" },
    { name:"Capuccino Italiano", info:"verificar disponibilidade", price:"16,90", img:"/cardapio/capuccino.jpg" },
    { name:"Affogato Proteico", info:"1 bola de gelato (100 g) à escolha", price:"24,90", img:"/cardapio/affogato.jpg" },
  ]},
  { cat:"Cafés Especiais", emoji:"🫘", items:[
    { name:"Café Moído 85+ Pontos", info:"250 g · Muniz Freire/Caparaó-ES", price:"49,90", img:"/cardapio/cafe-moido.jpg" },
    { name:"Café em Grãos 85+ Pontos", info:"250 g · 85 pontos", price:"49,90", img:"/cardapio/cafe-graos.jpg" },
    { name:"Drip Coffee c/ Creatina", info:"100% arábica · 3 g de creatina", price:"9,90", img:"/cardapio/drip-creatina.jpg" },
  ]},
];
function CardapioDigital({onClose}){
  const ink="#181C12",cream="#F1ECDD",gold="#C9A86A",pist=T.pistache;
  const [c,setC]=useState(0);
  useModal(onClose);
  const cat=CARDAPIO[c];
  const grid="radial-gradient(rgba(201,168,106,0.10) 1px, transparent 1px)";
  return (
    <div className="fade" role="dialog" aria-modal="true" aria-label="Cardápio digital Bentô"
      style={{position:"fixed",inset:0,zIndex:200,background:ink,backgroundImage:grid,backgroundSize:"26px 26px",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><BentoLogo size={32}/><div><div className="fd" style={{fontSize:17,color:cream,lineHeight:1}}>Cardápio</div><div className="fm" style={{fontSize:8.5,letterSpacing:"0.24em",color:"#9A9C86",textTransform:"uppercase",marginTop:2}}>Digital</div></div></div>
        <button onClick={onClose} aria-label="Fechar" className="fm" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(201,168,106,0.3)",color:cream,borderRadius:5,padding:"8px 14px",fontSize:11,letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><X size={14}/>ESC</button>
      </div>
      {/* chips de categoria */}
      <div className="no-scrollbar" style={{display:"flex",gap:8,overflowX:"auto",padding:"4px 20px 14px",flexShrink:0}}>
        {CARDAPIO.map((k,idx)=>(
          <button key={k.cat} onClick={()=>setC(idx)} className="fm" style={{whiteSpace:"nowrap",flexShrink:0,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",padding:"9px 15px",borderRadius:999,cursor:"pointer",border:`1px solid ${idx===c?gold:"rgba(201,168,106,0.3)"}`,background:idx===c?gold:"transparent",color:idx===c?ink:cream}}>
            <span style={{marginRight:6}}>{k.emoji}</span>{k.cat}
          </button>
        ))}
      </div>
      {/* itens */}
      <div key={c} className="rise" style={{flex:1,overflow:"auto",padding:"4px 16px 24px"}}>
        <div style={{maxWidth:640,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>
          {cat.items.map(it=>(
            <div key={it.name} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",border:"1px solid rgba(201,168,106,0.2)",borderRadius:8,background:"rgba(255,255,255,0.02)"}}>
              {it.img
                ? <div style={{width:62,height:62,borderRadius:8,overflow:"hidden",flexShrink:0,border:"1px solid rgba(201,168,106,0.25)"}}><img src={it.img} alt={it.name} width={62} height={62} loading="lazy" style={{objectFit:"cover",display:"block"}} onError={onImgErr} /></div>
                : <div style={{width:62,height:62,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,background:"linear-gradient(135deg,rgba(201,168,106,0.18),rgba(124,139,78,0.16))",border:"1px solid rgba(201,168,106,0.25)"}}>{cat.emoji}</div>}
              <div style={{flex:1,minWidth:0}}>
                <div className="fb" style={{fontSize:15,color:cream,fontWeight:500,lineHeight:1.2}}>{it.name}</div>
                <div className="fb" style={{fontSize:12,color:"#A9AB96",marginTop:3,lineHeight:1.35}}>{it.info}</div>
              </div>
              <div className="fm" style={{fontSize:15,color:gold,whiteSpace:"nowrap",fontWeight:500}}>R$ {it.price}</div>
            </div>
          ))}
        </div>
        <p className="fb" style={{textAlign:"center",fontSize:10.5,color:"#7E806C",marginTop:22,lineHeight:1.5}}>Preços e disponibilidade conforme a loja · sujeitos a alteração.<br/>Sabores de gelato e picolé: consulte a ficha nutricional completa no catálogo.</p>
      </div>
    </div>
  );
}

/* ========== PÁGINA PARCERIA / REVENDA ========== */
const PARC_PILARES=[
  {t:"Premium",d:"Estética sofisticada e percepção de valor superior ao congelado comum.",e:"✦"},
  {t:"Proteico",d:"Comunicação direta com o público fitness, wellness e consumidores de suplementos.",e:"💪"},
  {t:"Impulso",d:"Formato prático para consumo imediato e venda adicional no checkout.",e:"⚡"},
];
const PARC_PUBLICOS=["Lojas de suplementos","Empórios naturais","Academias","Studios de treino","Restaurantes saudáveis","Cafeterias premium","Mercados de alto padrão","Clínicas de estética","Espaços fitness & wellness"];
const PARC_PRODUTOS=[
  {n:"Picolé Bistrô",papel:"Entrada premium e impulso. O produto que faz o freezer girar.",badge:"Maior giro",img:"/cardapio/pic-p.jpg"},
  {n:"Picolé Mega",papel:"Indulgência proteica de ticket alto e alto valor percebido.",badge:"Ticket maior",img:"/cardapio/pic-mega.jpg"},
  {n:"Gelato 140 ml",papel:"O potinho gourmet — a maior margem da linha para o parceiro.",badge:"Até 50% de margem",img:"/cardapio/gelato-m.jpg"},
];
const PARC_MODELOS=[
  {t:"Compra avulsa",d:"Para testar a aceitação sem compromisso mensal. Reposição conforme a demanda.",tag:"Flexível"},
  {t:"Compra recorrente",d:"Para parceiros com giro previsível e freezer próprio. Calendário de reposição.",tag:"Recorrência"},
  {t:"Freezer Bentô",d:"Equipamento personalizado no ponto, com exposição exclusiva da marca.",tag:"Mais margem"},
  {t:"Parceiro estratégico",d:"Alto volume, alto fluxo ou operação regional. Condição máxima em mix selecionado.",tag:"Top"},
];
const PARC_PASSOS=[
  {t:"Avaliação do ponto",d:"Perfil do público, fluxo, localização e estrutura."},
  {t:"Escolha do modelo",d:"Avulsa, recorrente, freezer Bentô ou parceiro estratégico."},
  {t:"Definição do mix",d:"Picolés Bistrô, Mega e gelatos 140 ml em sabores selecionados."},
  {t:"Condição comercial",d:"Margem definida conforme volume, recorrência e compromisso."},
  {t:"Início da operação",d:"Exposição, reposição e acompanhamento de giro."},
];
function SejaParceiro({onClose,onForm}){
  const ink="#181C12",cream="#F1ECDD",gold="#C9A86A",pist="#8B9D5A",soft="#A9AB96";
  useModal(onClose);
  const grid="radial-gradient(rgba(201,168,106,0.08) 1px, transparent 1px)";
  const wa="https://wa.me/"+WHATS_REVENDA+"?text="+encodeURIComponent("Olá! Tenho interesse em revender a Bentô no meu ponto. 🍨");
  const Kicker=({children})=>(<div className="fm" style={{fontSize:10,letterSpacing:"0.3em",color:gold,textTransform:"uppercase",marginBottom:12}}>{children}</div>);
  const H=({children})=>(<h2 className="fd" style={{fontSize:"clamp(24px,4vw,38px)",color:cream,fontWeight:400,lineHeight:1.12,letterSpacing:"-0.02em",margin:0}}>{children}</h2>);
  const card={background:"rgba(255,255,255,0.03)",border:"1px solid rgba(201,168,106,0.2)",borderRadius:10,padding:"22px"};
  const wrap={maxWidth:980,margin:"0 auto",padding:"0 22px"};
  return(
    <div className="fade" role="dialog" aria-modal="true" aria-label="Seja um parceiro Bentô" style={{position:"fixed",inset:0,zIndex:200,background:ink,backgroundImage:grid,backgroundSize:"28px 28px",overflow:"auto"}}>
      <button onClick={onClose} aria-label="Fechar" className="fm" style={{position:"fixed",top:16,right:16,zIndex:10,background:"rgba(24,28,18,0.7)",backdropFilter:"blur(6px)",border:"1px solid rgba(201,168,106,0.3)",color:cream,borderRadius:6,padding:"9px 14px",fontSize:11,letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><X size={14}/>FECHAR</button>

      {/* HERO */}
      <section style={{...wrap,paddingTop:64,paddingBottom:40}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}><BentoLogo size={34}/><div className="fm" style={{fontSize:9,letterSpacing:"0.26em",color:soft,textTransform:"uppercase"}}>Gelatos · Vitória-ES</div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:28,alignItems:"center"}}>
          <div className="rise">
            <div className="fm" style={{display:"inline-block",fontSize:10,letterSpacing:"0.2em",color:ink,background:gold,textTransform:"uppercase",padding:"6px 12px",borderRadius:999,marginBottom:16}}>Condições exclusivas para lojistas</div>
            <h1 className="fd" style={{fontSize:"clamp(32px,6.4vw,60px)",color:cream,fontWeight:400,lineHeight:1.05,letterSpacing:"-0.025em",margin:0}}>Tenha a Bentô<br/>no seu <em style={{color:gold,fontStyle:"italic"}}>ponto</em>.</h1>
            <p className="fb" style={{fontSize:16,color:soft,lineHeight:1.6,marginTop:18,maxWidth:560}}>O picolé proteico mais desejado do mercado — e gelatos premium em potinhos — para lojas, academias, empórios e cafeterias que querem <strong style={{color:cream}}>aumentar ticket, desejo e percepção de valor</strong>.</p>
            <div className="fm" style={{fontSize:13,letterSpacing:"0.08em",color:gold,marginTop:16}}>Programa de revenda · margens de 30% a 50%</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:24}}>
              <button onClick={onForm} className="fb" style={{background:gold,color:ink,border:"none",borderRadius:6,padding:"15px 26px",fontSize:15,fontWeight:600,cursor:"pointer"}}>Quero ser parceiro →</button>
              <a href={wa} target="_blank" rel="noreferrer" className="fb" style={{background:"#25D366",color:"#fff",borderRadius:6,padding:"15px 22px",fontSize:15,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}>💬 WhatsApp direto</a>
            </div>
          </div>
          <div className="rise" style={{borderRadius:14,overflow:"hidden",border:"1px solid rgba(201,168,106,0.25)",boxShadow:"0 30px 80px -30px rgba(0,0,0,0.7)"}}>
            <img src="/parceria/freezer.jpg" alt="Freezer Bentô personalizado em um ponto de venda" style={{width:"100%",display:"block"}} onError={onImgErr} />
          </div>
        </div>
      </section>

      {/* OPORTUNIDADE / PILARES */}
      <section style={{...wrap,paddingTop:30,paddingBottom:40}}>
        <Kicker>A oportunidade</Kicker>
        <H>Uma nova categoria premium de consumo por impulso.</H>
        <p className="fb" style={{fontSize:15,color:soft,lineHeight:1.6,marginTop:14,maxWidth:680}}>Transforme o freezer em um ponto de desejo dentro da loja — gerando tráfego, diferenciação e aumento do ticket médio, sem cozinha nem operação complexa.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginTop:26}}>
          {PARC_PILARES.map(p=>(
            <div key={p.t} style={card}>
              <div style={{fontSize:24,marginBottom:10}}>{p.e}</div>
              <div className="fd" style={{fontSize:21,color:cream}}>{p.t}</div>
              <div className="fb" style={{fontSize:13.5,color:soft,lineHeight:1.5,marginTop:6}}>{p.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PARA QUEM É */}
      <section style={{...wrap,paddingTop:30,paddingBottom:40}}>
        <Kicker>Para quem é</Kicker>
        <H>Produto certo para o ponto certo.</H>
        <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:22}}>
          {PARC_PUBLICOS.map(p=>(
            <span key={p} className="fb" style={{fontSize:13.5,color:cream,border:"1px solid rgba(201,168,106,0.3)",borderRadius:999,padding:"10px 16px"}}>{p}</span>
          ))}
        </div>
      </section>

      {/* MARGENS / PRODUTOS */}
      <section style={{...wrap,paddingTop:30,paddingBottom:40}}>
        <Kicker>Arquitetura de produtos</Kicker>
        <H>Margens de <span style={{color:gold}}>30% a 50%</span>.</H>
        <p className="fb" style={{fontSize:15,color:soft,lineHeight:1.6,marginTop:14,maxWidth:680}}>Faixas de preço pensadas para preservar a percepção premium e entregar margem comercial real ao parceiro.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14,marginTop:26}}>
          {PARC_PRODUTOS.map(p=>(
            <div key={p.n} style={{...card,padding:0,overflow:"hidden"}}>
              <img src={p.img} alt={p.n} style={{width:"100%",height:170,objectFit:"cover",display:"block"}} onError={onImgErr} />
              <div style={{padding:"18px 20px"}}>
                <div className="fd" style={{fontSize:20,color:cream}}>{p.n}</div>
                <div className="fb" style={{fontSize:13,color:soft,marginTop:6,lineHeight:1.45}}>{p.papel}</div>
                <span className="fm" style={{display:"inline-block",marginTop:14,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:gold,border:`1px solid ${gold}`,borderRadius:999,padding:"6px 13px"}}>{p.badge}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="fb" style={{fontSize:13,color:soft,marginTop:18,lineHeight:1.55,maxWidth:680}}>Trabalhamos com <strong style={{color:cream}}>preço final sugerido protegido</strong> — você mantém a percepção premium e ainda garante uma margem saudável. As <strong style={{color:cream}}>condições exatas são reveladas após avaliarmos o seu ponto</strong>. 👀</p>
      </section>

      {/* MODELOS */}
      <section style={{...wrap,paddingTop:30,paddingBottom:40}}>
        <Kicker>Modelos de parceria</Kicker>
        <H>Quanto maior o compromisso, melhor a margem.</H>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginTop:26}}>
          {PARC_MODELOS.map((m,i)=>(
            <div key={m.t} style={card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span className="fm" style={{fontSize:13,color:gold}}>0{i+1}</span>
                <span className="fm" style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:ink,background:pist,borderRadius:999,padding:"4px 9px"}}>{m.tag}</span>
              </div>
              <div className="fd" style={{fontSize:19,color:cream}}>{m.t}</div>
              <div className="fb" style={{fontSize:13.5,color:soft,lineHeight:1.5,marginTop:6}}>{m.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{...wrap,paddingTop:30,paddingBottom:40}}>
        <Kicker>Como funciona</Kicker>
        <H>Cinco passos para começar.</H>
        <div style={{marginTop:24,display:"flex",flexDirection:"column",gap:0}}>
          {PARC_PASSOS.map((s,i)=>(
            <div key={s.t} style={{display:"flex",gap:18,alignItems:"flex-start",padding:"16px 0",borderTop:i?"1px solid rgba(201,168,106,0.16)":"none"}}>
              <div className="fd" style={{fontSize:30,color:gold,lineHeight:1,minWidth:46}}>{i+1}</div>
              <div><div className="fd" style={{fontSize:19,color:cream}}>{s.t}</div><div className="fb" style={{fontSize:14,color:soft,marginTop:4,lineHeight:1.5}}>{s.d}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* MODELO DE NEGÓCIO / FRANQUIA */}
      <section style={{...wrap,paddingTop:30,paddingBottom:40}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:28,alignItems:"center"}}>
          <div>
            <Kicker>Para futuros franqueados</Kicker>
            <H>Um modelo de negócio para chamar de seu.</H>
            <p className="fb" style={{fontSize:15,color:soft,lineHeight:1.6,marginTop:14}}>Mais do que um freezer: um <strong style={{color:cream}}>destino</strong>. Um estande conceito que transforma o gelato proteico em experiência premium — a visão que estamos desenhando para o modelo de franquia Bentô.</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:18}}>
              {["Estande conceito","Alto valor percebido","Experiência de marca"].map(t=>(
                <span key={t} className="fb" style={{fontSize:12.5,color:cream,border:"1px solid rgba(201,168,106,0.3)",borderRadius:999,padding:"8px 14px"}}>{t}</span>
              ))}
            </div>
            <div className="fb" style={{fontSize:12.5,color:soft,marginTop:18,lineHeight:1.5}}>💡 A <strong style={{color:cream}}>franquia é um projeto futuro</strong>. Registre seu interesse e seja o primeiro a saber quando abrirmos.</div>
            <button onClick={onForm} className="fb" style={{marginTop:18,background:gold,color:ink,border:"none",borderRadius:6,padding:"14px 24px",fontSize:14.5,fontWeight:600,cursor:"pointer"}}>Quero ser avisado →</button>
          </div>
          <div style={{borderRadius:14,overflow:"hidden",border:"1px solid rgba(201,168,106,0.25)",boxShadow:"0 30px 80px -30px rgba(0,0,0,0.7)"}}>
            <img src="/parceria/estande.jpg" alt="Estande conceito Bentô Gelatos — modelo de negócio para franquia" style={{width:"100%",display:"block"}} onError={onImgErr} />
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{...wrap,paddingTop:20,paddingBottom:70}}>
        <div style={{background:"linear-gradient(135deg, rgba(201,168,106,0.16), rgba(124,139,78,0.12))",border:"1px solid rgba(201,168,106,0.3)",borderRadius:14,padding:"40px 28px",textAlign:"center"}}>
          <H>Vamos conversar?</H>
          <p className="fb" style={{fontSize:15,color:soft,lineHeight:1.6,marginTop:12,maxWidth:520,marginLeft:"auto",marginRight:"auto"}}>Conte sobre o seu ponto e a sua região. Avaliamos o perfil e montamos a melhor condição para você.</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:24}}>
            <button onClick={onForm} className="fb" style={{background:gold,color:ink,border:"none",borderRadius:6,padding:"15px 28px",fontSize:15,fontWeight:600,cursor:"pointer"}}>Preencher meus dados →</button>
            <a href={wa} target="_blank" rel="noreferrer" className="fb" style={{background:"#25D366",color:"#fff",borderRadius:6,padding:"15px 24px",fontSize:15,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}>💬 Chamar no WhatsApp</a>
          </div>
          <div className="fm" style={{fontSize:12,color:soft,marginTop:22,letterSpacing:"0.06em"}}>WhatsApp (27) 99915-9995 · Instagram @bentogelateria · Vitória-ES</div>
          <div className="fb" style={{fontSize:11.5,color:soft,marginTop:14,maxWidth:520,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>💡 Pensando em <strong style={{color:cream}}>franquia</strong>? É um projeto futuro — registre seu interesse no formulário e avisamos você primeiro.</div>
        </div>
      </section>
    </div>
  );
}

/* ========== EVENTOS ========== */
const EV_PERS=["Carrinho personalizado","Potinhos personalizados","Outra personalização"];
const fmtBRL=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const EV_KM_RATE=2.0;     // R$/km rodado (combustível + deslocamento + tempo, média)
const EV_ROTA=1.3;        // fator linha reta → rota real
const EV_POTINHO=0.5;     // R$ por potinho personalizado (2 por pessoa)
const EV_CARRINHO=200;    // R$ personalização do carrinho
function evHaversine(a,b,c,d){const R=6371,r=x=>x*Math.PI/180;const h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
async function evGeocode(text){
  const base=(text||"").trim();
  if(!base) return{ok:false};
  try{const c=sessionStorage.getItem("bento:geo:"+base.toLowerCase());if(c)return JSON.parse(c);}catch{}
  const parts=base.split(/[-–—,\/·]/).map(t=>t.trim()).filter(Boolean);
  const tries=[...new Set([base, parts.at(-1)?parts.at(-1)+" ES":"", parts[0]||""].filter(Boolean))].slice(0,3);
  let res={ok:false};
  for(const t of tries){
    try{
      const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(t)}`,
        {headers:{"Accept-Language":"pt-BR"},signal:AbortSignal.timeout(6000)});
      if(!r.ok) continue;            // 429/403 etc. → tenta a próxima variação
      const j=await r.json();
      if(j&&j[0]){
        const la=+j[0].lat,lo=+j[0].lon;
        let best=null;
        for(const s of LOJAS){const km=evHaversine(la,lo,s.lat,s.lng);if(!best||km<best.km)best={km,loja:s.nome};}
        res={ok:true,km:Math.max(1,Math.round(best.km*EV_ROTA)),loja:best.loja};
        break;
      }
    }catch(e){ /* timeout/rede: tenta próxima; se todas falharem, retorna ok:false */ }
  }
  try{sessionStorage.setItem("bento:geo:"+base.toLowerCase(),JSON.stringify(res));}catch{}
  return res;
}
function calcEvento(g,tipo="Mix (gelatos + picolés)",pers=[],km=null){
  const n=Math.max(1,Number(g)||0);
  let rend;
  if(tipo==="Gelatos") rend=`~${Math.round(n*0.15)} L de gelato · 150 ml/pessoa`;
  else if(tipo==="Picolés") rend=`~${n*2} picolés Bistrô · 2 por pessoa`;
  else rend=`~${Math.round(n*0.075)} L de gelato + ~${n} picolés · 1 + 1 por pessoa`;
  const base=n*27;                                                        // R$ 27 por pessoa
  const potinhos=pers.includes("Potinhos personalizados")?n*2*EV_POTINHO:0; // 2 potinhos/pessoa
  const carrinho=pers.includes("Carrinho personalizado")?EV_CARRINHO:0;
  const persACombinar=pers.filter(p=>p!=="Potinhos personalizados"&&p!=="Carrinho personalizado");
  const logistica=km!=null?Math.round(km*2*EV_KM_RATE):null;              // ida e volta × R$/km
  return{
    sabores:n>=150?6:Math.max(2,Math.round(n*6/150)),   // até 6 sabores (150+); proporcional abaixo
    rend,
    promotoras:n>300?2:1,                                // até 2 promotoras acima de 300
    base,potinhos,carrinho,persACombinar,logistica,
    total:base+potinhos+carrinho+(logistica||0),
    corporativo:n>300,
  };
}
function EventosModal({onClose}){
  useModal(onClose);
  const[step,setStep]=useState(1);
  const[ev,setEv]=useState({data:"",local:"",convidados:150,tipo:"Mix (gelatos + picolés)",pers:[]});
  const[cad,setCad]=useState({nome:"",doc:"",email:"",zap:"",empresa:"",obs:"",consent:false});
  const setE=(k,v)=>setEv(f=>({...f,[k]:v}));
  const setC=(k,v)=>setCad(f=>({...f,[k]:v}));
  const togglePers=p=>setE("pers",ev.pers.includes(p)?ev.pers.filter(x=>x!==p):[...ev.pers,p]);
  const[geo,setGeo]=useState(null);   // {ok,km,loja} após geocodificar o local
  const[busy,setBusy]=useState(false);
  const q=calcEvento(ev.convidados,ev.tipo,ev.pers,geo&&geo.ok?geo.km:null);
  const nConv=Number(ev.convidados)||0;
  const zapOk=cad.zap.replace(/\D/g,"").length>=10;
  // Captura do lead no nosso banco (não perder contato mesmo sem enviar o WhatsApp)
  const postLead=(payload)=>{try{fetch("/api/lead",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),keepalive:true});}catch{}};
  const verOrcamento=async()=>{
    setBusy(true);
    const g=await evGeocode(ev.local);
    setGeo(g);
    setBusy(false);
    const q2=calcEvento(ev.convidados,ev.tipo,ev.pers,g&&g.ok?g.km:null);
    tk("Lead · Orçamento gerado");
    postLead({stage:"orçamento",phone:cad.zap.trim(),nome:cad.nome.trim(),data:ev.data,local:ev.local.trim(),convidados:nConv,tipo:ev.tipo,pers:ev.pers,total:q2.total,km:g&&g.ok?g.km:null,loja:g&&g.ok?g.loja:null});
    setStep(2);
  };
  const menor=nConv>0&&nConv<70;
  const ok1=ev.data&&ev.local.trim()&&nConv>=70&&zapOk;
  const waMenor=()=>{
    const l=["*Evento Bentô — até 70 convidados* 🎉","Olá! Gostaria de levar a Bentô para um evento menor e ver outras possibilidades de serviço.",
      ev.data&&`*Data:* ${ev.data.split("-").reverse().join("/")}`,
      ev.local.trim()&&`*Local:* ${ev.local.trim()}`,
      nConv>0&&`*Convidados:* ${nConv}`].filter(Boolean);
    tk("Conversão · Evento (até 70)");
    window.open(`https://wa.me/${WHATS_REVENDA}?text=${encodeURIComponent(l.join("\n"))}`,"_blank","noopener,noreferrer");
  };
  const emailOk=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const docOk=d2=>[11,14].includes(d2.replace(/\D/g,"").length);
  const ok3=cad.nome.trim()&&docOk(cad.doc)&&emailOk(cad.email)&&cad.zap.replace(/\D/g,"").length>=10&&cad.consent;
  const enviar=()=>{
    // link interno: abre o contrato pré-preenchido para a equipe revisar e gerar o PDF
    const payload={nome:cad.nome.trim(),doc:cad.doc.trim(),email:cad.email.trim(),zap:cad.zap.trim(),empresa:cad.empresa.trim(),
      data:ev.data.split("-").reverse().join("/"),local:ev.local.trim(),convidados:nConv,tipo:ev.tipo,
      sabores:q.sabores,rend:q.rend,promotoras:q.promotoras,pers:ev.pers,persAC:q.persACombinar,
      base:q.base,logistica:q.logistica,km:geo&&geo.ok?geo.km:null,loja:geo&&geo.ok?geo.loja:null,
      potinhos:q.potinhos,carrinho:q.carrinho,total:q.total};
    const b64=btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    const linkContrato=`https://bentogelateria.com/?contrato=${b64}`;
    const linhas=[
      "*Novo orçamento — Eventos Bentô* 🎉","",
      "*— Dados do contratante —*",
      `*Nome:* ${cad.nome.trim()}`,
      `*CPF/CNPJ:* ${cad.doc.trim()}`,
      `*E-mail:* ${cad.email.trim()}`,
      `*WhatsApp:* ${cad.zap.trim()}`,
      cad.empresa.trim()&&`*Empresa:* ${cad.empresa.trim()}`,"",
      "*— Dados do evento —*",
      `*Data:* ${ev.data.split("-").reverse().join("/")}`,
      `*Local:* ${ev.local.trim()}`,
      `*Convidados:* ${ev.convidados}`,
      `*Produtos:* ${ev.tipo}`,
      `*Sabores:* até ${q.sabores}`,
      `*Rendimento:* ${q.rend}`,
      `*Promotoras:* ${q.promotoras} uniformizada${q.promotoras>1?"s":""} e treinada${q.promotoras>1?"s":""}`,"",
      "*— Orçamento online —*",
      `*Serviço (R$ 27 × ${ev.convidados}):* ${fmtBRL(q.base)}`,
      geo&&geo.ok?`*Logística (~${geo.km} km · Bentô ${geo.loja} · ida e volta):* ${fmtBRL(q.logistica)}`:"*Logística:* a confirmar",
      q.potinhos>0&&`*Potinhos personalizados (2/pessoa):* ${fmtBRL(q.potinhos)}`,
      q.carrinho>0&&`*Personalização do carrinho:* ${fmtBRL(q.carrinho)}`,
      q.persACombinar.length>0&&`*A combinar:* ${q.persACombinar.join(", ")}`,
      q.corporativo&&"*Evento corporativo 300+:* condições especiais",
      `*Total estimado:* ${fmtBRL(q.total)}`,
      cad.obs.trim()&&`*Observações:* ${cad.obs.trim()}`,"",
      "_Solicito a formulação do contrato para assinatura online._","",
      `📄 *Contrato pré-preenchido (uso interno):*\n${linkContrato}`,
    ].filter(Boolean);
    tk("Conversão · Orçamento de evento");
    postLead({stage:"contrato",phone:cad.zap.trim(),nome:cad.nome.trim(),email:cad.email.trim(),doc:cad.doc.trim(),data:ev.data,local:ev.local.trim(),convidados:nConv,tipo:ev.tipo,total:q.total,km:geo&&geo.ok?geo.km:null,loja:geo&&geo.ok?geo.loja:null});
    window.open(`https://wa.me/${WHATS_REVENDA}?text=${encodeURIComponent(linhas.join("\n"))}`,"_blank","noopener,noreferrer");
  };
  const inp={width:"100%",padding:"11px 12px",borderRadius:4,border:`1px solid ${T.border}`,background:T.bg,color:T.ink,fontSize:14,outline:"none",boxSizing:"border-box"};
  const lab={fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:T.inkSoft,display:"block",marginBottom:5,marginTop:14};
  const Row=({l,v,strong})=>(
    <div style={{display:"flex",justifyContent:"space-between",gap:10,padding:"9px 0",borderBottom:`1px solid ${T.borderSoft}`}}>
      <span className="fb" style={{fontSize:13,color:T.inkSoft}}>{l}</span>
      <span className={strong?"fd":"fb"} style={{fontSize:strong?16:13,color:strong?T.pistacheDark:T.ink,fontWeight:strong?600:500,textAlign:"right"}}>{v}</span>
    </div>
  );
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Nos leve para seu evento" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:6,maxWidth:540,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:1}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>Eventos · Passo {step} de 3</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:2}}>Nos leve para seu evento 🎉</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        <div style={{padding:22}}>
          {step===1&&(<>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gridTemplateRows:"76px 76px",gap:8,marginBottom:14}}>
              <img src="/eventos/carrinho-1.jpg" alt="Carrinho Bentô em casamento" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:6,gridRow:"1 / span 2",border:`1px solid ${T.border}`}} onError={onImgErr} />
              <img src="/eventos/carrinho-2.jpg" alt="Carrinho Bentô em área externa" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:6,border:`1px solid ${T.border}`}} onError={onImgErr} />
              <img src="/eventos/carrinho-3.jpg" alt="Carrinho Bentô servindo em evento real" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:6,border:`1px solid ${T.border}`}} onError={onImgErr} />
            </div>
            <div className="fb" style={{fontSize:13,color:T.inkSoft}}>Nosso carrinho de gelateria no seu evento — casamentos, festas e corporativo. Preencha e veja seu orçamento na hora:</div>
            <span className="fm" style={lab}>Seu WhatsApp (com DDD) *</span>
            <input className="fb" style={inp} value={cad.zap} onChange={e=>setC("zap",e.target.value)} placeholder="(27) 99999-9999" inputMode="tel"/>
            <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:5,lineHeight:1.4}}>Usamos só para te enviar este orçamento e combinar os detalhes do evento. 💛</div>
            <span className="fm" style={lab}>Data do evento *</span>
            <input type="date" className="fb" style={inp} value={ev.data} onChange={e=>setE("data",e.target.value)}/>
            <span className="fm" style={lab}>Local (cidade / espaço) *</span>
            <input className="fb" style={inp} value={ev.local} onChange={e=>setE("local",e.target.value)} placeholder="Ex.: Vitória — Cerimonial X"/>
            <span className="fm" style={lab}>Quantidade de convidados * (mín. 70)</span>
            <input type="number" min={70} className="fb" style={inp} value={ev.convidados} onChange={e=>setE("convidados",e.target.value===""?"":Number(e.target.value))} inputMode="numeric"/>
            <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
              {[70,100,150,300,500].map(n=>(
                <button key={n} onClick={()=>setE("convidados",n)} className="fm" style={{fontSize:10,padding:"6px 12px",borderRadius:999,border:`1px solid ${Number(ev.convidados)===n?T.pistacheDark:T.border}`,background:Number(ev.convidados)===n?T.pistacheDark:"transparent",color:Number(ev.convidados)===n?T.surface:T.inkSoft,cursor:"pointer"}}>{n}</button>
              ))}
            </div>
            <span className="fm" style={lab}>O que servir?</span>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["Gelatos","Picolés","Mix (gelatos + picolés)"].map(o=>(
                <button key={o} onClick={()=>setE("tipo",o)} className="fb" style={{flex:1,minWidth:110,padding:"11px 8px",borderRadius:4,border:`1px solid ${ev.tipo===o?T.pistacheDark:T.border}`,background:ev.tipo===o?T.pistacheDark:"transparent",color:ev.tipo===o?T.surface:T.ink,fontSize:12.5,fontWeight:500,cursor:"pointer"}}>{o}</button>
              ))}
            </div>
            <span className="fm" style={lab}>Personalização (opcional · custo a combinar)</span>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {EV_PERS.map(p=>(
                <button key={p} onClick={()=>togglePers(p)} className="fb" style={{fontSize:12,padding:"9px 12px",borderRadius:999,border:`1px solid ${ev.pers.includes(p)?T.pistacheDark:T.border}`,background:ev.pers.includes(p)?"#EFF5E5":"transparent",color:T.ink,cursor:"pointer"}}>{ev.pers.includes(p)?"✓ ":""}{p}</button>
              ))}
            </div>
            {menor?(
              <div style={{marginTop:18,background:"#EFF5E5",border:`1px solid ${T.pistacheDark}55`,borderRadius:6,padding:"16px"}}>
                <div className="fd" style={{fontSize:16,color:T.ink}}>Evento com menos de 70 convidados?</div>
                <div className="fb" style={{fontSize:13,color:T.inkSoft,marginTop:6,lineHeight:1.5}}>O orçamento online é para eventos a partir de <strong>70 pessoas</strong>. Para grupos menores temos <strong>outras possibilidades de serviço</strong> — fale com a gente que montamos algo sob medida. 💛</div>
                <button onClick={waMenor} className="fb" style={{width:"100%",marginTop:14,padding:"13px",borderRadius:4,border:"none",background:"#25D366",color:"#fff",fontSize:14.5,fontWeight:600,cursor:"pointer"}}>💬 Falar no WhatsApp</button>
              </div>
            ):(<>
              <button onClick={verOrcamento} disabled={!ok1||busy} className="fb" style={{width:"100%",marginTop:20,padding:"14px",borderRadius:4,border:"none",background:ok1&&!busy?T.pistacheDark:T.border,color:ok1&&!busy?T.surface:T.inkSoft,fontSize:15,fontWeight:600,cursor:ok1&&!busy?"pointer":"not-allowed"}}>{busy?"Calculando logística…":"Ver meu orçamento →"}</button>
              {!ok1&&<div className="fb" style={{fontSize:11,color:T.inkSoft,textAlign:"center",marginTop:8}}>Preencha WhatsApp, data, local e ao menos 70 convidados.</div>}
            </>)}
          </>)}

          {step===2&&(<>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.25em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:10}}>Seu orçamento online</div>
            <div style={{background:T.bg,border:`1.5px solid ${T.pistacheDark}`,borderRadius:6,padding:"6px 16px 4px"}}>
              <Row l="Convidados" v={ev.convidados}/>
              <Row l="Produtos" v={ev.tipo}/>
              <Row l="Sabores inclusos" v={`até ${q.sabores}`}/>
              <Row l="Rendimento" v={q.rend}/>
              <Row l="Equipe" v={`${q.promotoras} promotora${q.promotoras>1?"s":""} uniformizada${q.promotoras>1?"s":""} e treinada${q.promotoras>1?"s":""}`}/>
              <Row l={`Serviço (R$ 27 × ${ev.convidados})`} v={fmtBRL(q.base)}/>
              {geo&&geo.ok
                ? <Row l={`Logística · ~${geo.km} km da Bentô ${geo.loja} (ida e volta)`} v={fmtBRL(q.logistica)}/>
                : <Row l="Logística (deslocamento)" v="a confirmar"/>}
              {q.potinhos>0&&<Row l={`Potinhos personalizados (2/pessoa · R$ 0,50)`} v={fmtBRL(q.potinhos)}/>}
              {q.carrinho>0&&<Row l="Personalização do carrinho" v={fmtBRL(q.carrinho)}/>}
              {q.persACombinar.length>0&&<Row l={q.persACombinar.join(" · ")} v="a combinar ✨"/>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0 10px"}}>
                <span className="fb" style={{fontSize:13,color:T.inkSoft}}>Total estimado</span>
                <span className="fd" style={{fontSize:28,color:T.pistacheDark,fontWeight:600}}>{fmtBRL(q.total)}</span>
              </div>
            </div>
            {geo&&!geo.ok&&(
              <div className="fb" style={{marginTop:10,fontSize:12,color:T.inkSoft,lineHeight:1.5}}>📍 Não conseguimos localizar o endereço para calcular a logística — confirmamos o deslocamento no fechamento. Dica: volte e inclua bairro e cidade no local.</div>
            )}
            {geo&&geo.ok&&(
              <div className="fb" style={{marginTop:10,fontSize:11.5,color:T.inkSoft,lineHeight:1.5}}>🚚 Logística estimada a partir da nossa loja mais próxima (Bentô {geo.loja}), incluindo combustível e deslocamento médios.</div>
            )}
            {q.corporativo&&(
              <div className="fb" style={{marginTop:12,background:"#EFF5E5",border:`1px solid ${T.pistacheDark}55`,borderRadius:4,padding:"11px 14px",fontSize:12.5,color:T.ink,lineHeight:1.5}}>🏢 <strong>Evento corporativo com mais de 300 pessoas?</strong> Você tem condições especiais — o valor final pode ficar ainda melhor no fechamento.</div>
            )}
            {q.persACombinar.length>0&&(
              <div className="fb" style={{marginTop:10,fontSize:12,color:T.inkSoft,lineHeight:1.5}}>✨ {q.persACombinar.join(", ")}: valores combinados diretamente com nossa equipe.</div>
            )}
            <div className="fb" style={{marginTop:10,fontSize:11,color:T.inkSoft,lineHeight:1.5,fontStyle:"italic"}}>Estimativa online sujeita a confirmação de data, logística e proposta final em contrato.</div>
            <div style={{display:"flex",gap:8,marginTop:18}}>
              <button onClick={()=>setStep(1)} className="fb" style={{padding:"14px 18px",borderRadius:4,border:`1px solid ${T.border}`,background:"transparent",color:T.ink,fontSize:14,cursor:"pointer"}}>← Ajustar</button>
              <button onClick={()=>setStep(3)} className="fb" style={{flex:1,padding:"14px",borderRadius:4,border:"none",background:T.pistacheDark,color:T.surface,fontSize:15,fontWeight:600,cursor:"pointer"}}>Fechar orçamento →</button>
            </div>
          </>)}

          {step===3&&(<>
            <div className="fb" style={{fontSize:13,color:T.inkSoft}}>Quase lá! Com seus dados, nossa equipe formula o <strong style={{color:T.ink}}>contrato para assinatura online</strong> e confirma os detalhes:</div>
            <span className="fm" style={lab}>Nome completo *</span>
            <input className="fb" style={inp} value={cad.nome} onChange={e=>setC("nome",e.target.value)} placeholder="Seu nome"/>
            <span className="fm" style={lab}>CPF ou CNPJ *</span>
            <input className="fb" style={inp} value={cad.doc} onChange={e=>setC("doc",e.target.value)} placeholder="000.000.000-00" inputMode="numeric"/>
            <span className="fm" style={lab}>E-mail *</span>
            <input type="email" className="fb" style={inp} value={cad.email} onChange={e=>setC("email",e.target.value)} placeholder="voce@email.com"/>
            <span className="fm" style={lab}>WhatsApp (com DDD) *</span>
            <input className="fb" style={inp} value={cad.zap} onChange={e=>setC("zap",e.target.value)} placeholder="(27) 99999-9999" inputMode="tel"/>
            <span className="fm" style={lab}>Empresa (se corporativo)</span>
            <input className="fb" style={inp} value={cad.empresa} onChange={e=>setC("empresa",e.target.value)} placeholder="Opcional"/>
            <span className="fm" style={lab}>Observações</span>
            <textarea className="fb" rows={2} style={{...inp,resize:"vertical"}} value={cad.obs} onChange={e=>setC("obs",e.target.value)} placeholder="Horário, tema da festa, restrições…"/>
            <div style={{background:T.bgWarm,border:`1px solid ${T.border}`,borderRadius:4,padding:"10px 14px",marginTop:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span className="fb" style={{fontSize:12,color:T.inkSoft}}>{ev.convidados} convidados · {ev.data.split("-").reverse().join("/")}</span>
              <span className="fd" style={{fontSize:18,color:T.pistacheDark,fontWeight:600}}>{fmtBRL(q.total)}</span>
            </div>
            <label style={{display:"flex",gap:9,alignItems:"flex-start",marginTop:16,cursor:"pointer"}}>
              <input type="checkbox" checked={cad.consent} onChange={e=>setC("consent",e.target.checked)} style={{marginTop:3,accentColor:T.pistacheDark,width:16,height:16,flexShrink:0}}/>
              <span className="fb" style={{fontSize:11.5,color:T.inkSoft,lineHeight:1.45}}>Autorizo o uso dos meus dados para contato e elaboração do orçamento/contrato, conforme a <a href="/?privacidade=1" target="_blank" rel="noopener noreferrer" style={{color:T.pistacheDark,textDecoration:"underline"}}>Política de Privacidade</a>.</span>
            </label>
            <button onClick={enviar} disabled={!ok3} className="fb" style={{width:"100%",marginTop:14,padding:"14px",borderRadius:4,border:"none",background:ok3?"#25D366":T.border,color:ok3?"#fff":T.inkSoft,fontSize:15,fontWeight:600,cursor:ok3?"pointer":"not-allowed"}}>💬 Enviar e solicitar contrato</button>
            <div className="fb" style={{fontSize:11,color:T.inkSoft,textAlign:"center",marginTop:10,lineHeight:1.5}}>Seu orçamento completo abre no WhatsApp — é só confirmar o envio.<br/>Retornamos com o contrato para assinatura online. 📄</div>
            <button onClick={()=>setStep(2)} className="fb" style={{width:"100%",marginTop:10,padding:"10px",borderRadius:4,border:"none",background:"transparent",color:T.inkSoft,fontSize:12,cursor:"pointer"}}>← Voltar ao orçamento</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ========== FAQ NUTRICIONAL ========== */
const FAQ=[
  {q:"Posso comer na dieta?",a:"Sim, com equilíbrio! Nossos gelatos não levam açúcar adicionado e são ricos em proteína (whey WPH). Mas atenção: não são alimentos de baixo valor energético — cada sabor tem sua ficha nutricional completa aqui no app, com calorias e macros por porção, pra você encaixar na sua meta."},
  {q:"Quem tem diabetes pode consumir?",a:"Nossos produtos não têm açúcar adicionado — a doçura vem de polióis e stévia. Porém, contêm carboidratos e açúcares próprios dos ingredientes (frutas, leite). Por isso, a recomendação responsável é: consulte seu médico ou nutricionista e confira a ficha nutricional de cada sabor antes de incluir na sua rotina."},
  {q:"O que são polióis? Por que o aviso de efeito laxativo?",a:"Polióis (como maltitol e sorbitol) são adoçantes que usamos no lugar do açúcar. São seguros e amplamente utilizados, mas — como todo poliol — em consumo excessivo podem ter efeito laxativo em pessoas sensíveis. Por isso mantemos o aviso nas fichas, por transparência."},
  {q:"Tem lactose?",a:"A maioria dos sabores contém leite e whey (derivado do leite). Os sorbets de fruta, como Limão Siciliano e Maracujá, não levam leite na receita. Confira o selo 'sem lactose' na ficha de cada sabor aqui no app — é a fonte mais segura."},
  {q:"Tem glúten?",a:"A grande maioria dos sabores não contém glúten. As exceções são sabores com ingredientes como kadaif ou cookies (ex.: Chocolate Dubai, Cookies & Cream), sempre indicadas na ficha do sabor. Todos os produtos trazem a declaração de alérgenos conforme a RDC 26/2015."},
  {q:"Qual é o sabor mais proteico?",a:"Nossos gelatos levam whey WPH (proteína hidrolisada, de alta absorção). O ranking 'mais ricos em proteína' fica na área de Tabelas Nutricionais — em geral, os sabores cremosos com whey passam de 9 g de proteína por porção."},
  {q:"Como conservar em casa?",a:"Mantenha sempre no freezer. Para a textura perfeita de gelato, tire alguns minutos antes de consumir e evite descongelar e recongelar — isso preserva a cremosidade e a qualidade do produto."},
  {q:"Onde compro?",a:"Em nossas duas lojas em Vitória-ES (Praia do Canto e Jardim Camburi) ou em casa, pelo iFood — é só tocar no botão Delivery na tela inicial. 🛵"},
];
function FaqModal({onClose}){
  useModal(onClose);
  const[open,setOpen]=useState(0);
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Dúvidas frequentes" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:6,maxWidth:520,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:1}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>Nutrição · Transparência</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:2}}>Dúvidas frequentes ❓</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        <div style={{padding:"14px 18px 20px"}}>
          {FAQ.map((f,i)=>(
            <div key={i} style={{borderBottom:i<FAQ.length-1?`1px solid ${T.borderSoft}`:"none"}}>
              <button onClick={()=>setOpen(open===i?-1:i)} aria-expanded={open===i} className="fb" style={{width:"100%",textAlign:"left",background:"none",border:"none",padding:"14px 4px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,cursor:"pointer"}}>
                <span className="fd" style={{fontSize:16.5,color:open===i?T.pistacheDark:T.ink,lineHeight:1.25}}>{f.q}</span>
                <span className="fd" style={{fontSize:20,color:T.pistacheDark,flexShrink:0,transform:open===i?"rotate(45deg)":"none",transition:"transform .2s"}}>+</span>
              </button>
              {open===i&&<p className="fb fade" style={{fontSize:13.5,color:T.inkSoft,lineHeight:1.6,padding:"0 4px 16px",margin:0}}>{f.a}</p>}
            </div>
          ))}
          <p className="fb" style={{fontSize:11,color:T.inkSoft,textAlign:"center",marginTop:14,lineHeight:1.5}}>Conteúdo informativo — não substitui orientação de médico ou nutricionista.<br/>Ainda com dúvida? Chame a gente no WhatsApp (27) 99915-9995.</p>
        </div>
      </div>
    </div>
  );
}

/* ========== DELIVERY (IFOOD) ========== */
const LOJAS=[
  {id:"praia-do-canto",nome:"Praia do Canto",bairro:"Praia do Canto · Vitória-ES",lat:-20.2947,lng:-40.2925,
   ifood:"https://www.ifood.com.br/delivery/vitoria-es/bento-gelatos-saudaveis-praia-do-canto/fcfff152-838e-4743-88f3-0e18eff6b867?utm_medium=share",
   maps:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("Bentô Gelatos Praia do Canto Vitória ES")},
  {id:"jardim-camburi",nome:"Jardim Camburi",bairro:"Jardim Camburi · Vitória-ES",lat:-20.2547,lng:-40.2670,
   ifood:"https://www.ifood.com.br/delivery/vitoria-es/bento-gelatos-jardim-camburi/e654e388-ebc8-480c-bb0d-7d0c31f6cc3a?utm_medium=share",
   maps:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("Bentô Gelatos Jardim Camburi Vitória ES")},
];
function DeliveryModal({onClose}){
  useModal(onClose);
  const[near,setNear]=useState(null); // id da loja mais próxima
  const[geoMsg,setGeoMsg]=useState("");
  const locate=()=>{
    if(!navigator.geolocation){setGeoMsg("Seu navegador não permite localização — escolha pela lista.");return;}
    setGeoMsg("Localizando…");
    navigator.geolocation.getCurrentPosition(pos=>{
      const{latitude:la,longitude:lo}=pos.coords;
      const d=s=>Math.hypot(s.lat-la,(s.lng-lo)*Math.cos(la*Math.PI/180));
      const best=[...LOJAS].sort((a,b)=>d(a)-d(b))[0];
      setNear(best.id);setGeoMsg("");
    },()=>setGeoMsg("Não foi possível obter sua localização — escolha pela lista."),{timeout:8000});
  };
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Delivery Bentô" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:6,maxWidth:480,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>Delivery · iFood</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:2}}>Peça em casa 🛵</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        <div style={{padding:22}}>
          <div className="fb" style={{fontSize:13,color:T.inkSoft,marginBottom:14}}>Temos duas lojas em Vitória. Escolha a mais perto de você — ou deixe a gente descobrir:</div>
          <button onClick={locate} className="fb" style={{width:"100%",padding:"12px",borderRadius:4,border:`1px solid ${T.pistacheDark}`,background:"transparent",color:T.pistacheDark,fontSize:13.5,fontWeight:600,cursor:"pointer",marginBottom:6}}>📍 Qual loja está mais perto de mim?</button>
          {geoMsg&&<div className="fb" style={{fontSize:11.5,color:T.inkSoft,textAlign:"center",marginBottom:6}}>{geoMsg}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:10}}>
            {LOJAS.map(l=>(
              <div key={l.id} style={{border:`1.5px solid ${near===l.id?T.pistacheDark:T.border}`,background:near===l.id?"#EFF5E5":T.bg,borderRadius:6,padding:"16px 16px 14px",position:"relative"}}>
                {near===l.id&&<span className="fm" style={{position:"absolute",top:-9,left:14,fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",background:T.pistacheDark,color:T.surface,borderRadius:999,padding:"3px 10px"}}>⭐ Mais próxima de você</span>}
                <div className="fd" style={{fontSize:20,color:T.ink}}>Bentô {l.nome}</div>
                <div className="fb" style={{fontSize:12,color:T.inkSoft,marginTop:2}}>{l.bairro}</div>
                <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
                  <a href={l.ifood} onClick={()=>tk("Conversão · iFood · "+l.nome)} target="_blank" rel="noreferrer" className="fb" style={{flex:1,minWidth:140,textAlign:"center",background:"#EA1D2C",color:"#fff",borderRadius:4,padding:"12px 14px",fontSize:13.5,fontWeight:700,textDecoration:"none"}}>Pedir no iFood</a>
                  <a href={l.maps} target="_blank" rel="noreferrer" className="fb" style={{textAlign:"center",border:`1px solid ${T.border}`,color:T.ink,borderRadius:4,padding:"12px 14px",fontSize:13,textDecoration:"none"}}>🗺️ Ver no mapa</a>
                </div>
              </div>
            ))}
          </div>
          <div className="fb" style={{fontSize:11,color:T.inkSoft,textAlign:"center",marginTop:14,lineHeight:1.5}}>Área e taxa de entrega são calculadas pelo iFood conforme seu endereço.</div>
        </div>
      </div>
    </div>
  );
}

/* ========== SEJA BENTÔ (REVENDA / FRANQUIA) ========== */
const WHATS_REVENDA="5527999159995"; // DDI+DDD+número, só dígitos
function SejaBento({onClose}){
  useModal(onClose);
  const[form,setForm]=useState({interesse:"Revenda",nome:"",zap:"",cidade:"",ponto:"",msg:"",consent:false});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const ok=form.nome.trim()&&form.zap.replace(/\D/g,"").length>=10&&form.cidade.trim()&&form.consent;
  const enviar=()=>{
    const linhas=[
      "*Nova solicitação — Seja Bentô* 🍨",
      `*Interesse:* ${form.interesse}`,
      `*Nome:* ${form.nome.trim()}`,
      `*WhatsApp:* ${form.zap.trim()}`,
      `*Cidade/UF:* ${form.cidade.trim()}`,
      form.ponto&&`*Ponto comercial:* ${form.ponto}`,
      form.msg.trim()&&`*Mensagem:* ${form.msg.trim()}`,
    ].filter(Boolean);
    tk("Conversão · Revenda/Franquia");
    window.open(`https://wa.me/${WHATS_REVENDA}?text=${encodeURIComponent(linhas.join("\n"))}`,"_blank","noopener,noreferrer");
  };
  const inp={width:"100%",padding:"11px 12px",borderRadius:4,border:`1px solid ${T.border}`,background:T.bg,color:T.ink,fontSize:14,outline:"none",boxSizing:"border-box"};
  const lab={fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:T.inkSoft,display:"block",marginBottom:5,marginTop:14};
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Seja um revendedor ou franqueado" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:6,maxWidth:480,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>Expansão</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:2}}>Seja Bentô 🤝</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        <div style={{padding:22}}>
          <div className="fb" style={{fontSize:13,color:T.inkSoft}}>Quer levar a Bentô para a sua cidade? Preencha abaixo — a mensagem chega direto no nosso WhatsApp e respondemos rapidinho.</div>
          <span className="fm" style={lab}>Tenho interesse em</span>
          <div style={{display:"flex",gap:8}}>
            {["Revenda","Franquia (futuro)"].map(o=>(
              <button key={o} onClick={()=>set("interesse",o)} className="fb" style={{flex:1,padding:"11px",borderRadius:4,border:`1px solid ${form.interesse===o?T.pistacheDark:T.border}`,background:form.interesse===o?T.pistacheDark:"transparent",color:form.interesse===o?T.surface:T.ink,fontSize:13,fontWeight:500}}>{o}</button>
            ))}
          </div>
          {form.interesse==="Franquia (futuro)"&&<div className="fb" style={{fontSize:11.5,color:T.inkSoft,marginTop:8,lineHeight:1.45}}>A franquia é um projeto futuro — registramos seu interesse e avisamos você primeiro. 💛</div>}
          <span className="fm" style={lab}>Nome completo *</span>
          <input className="fb" style={inp} value={form.nome} onChange={e=>set("nome",e.target.value)} placeholder="Seu nome"/>
          <span className="fm" style={lab}>Seu WhatsApp (com DDD) *</span>
          <input className="fb" style={inp} value={form.zap} onChange={e=>set("zap",e.target.value)} placeholder="(27) 99999-9999" inputMode="tel"/>
          <span className="fm" style={lab}>Cidade / Estado *</span>
          <input className="fb" style={inp} value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="Ex.: Vitória / ES"/>
          <span className="fm" style={lab}>Já possui ponto comercial?</span>
          <div style={{display:"flex",gap:8}}>
            {["Sim","Não","Ainda avaliando"].map(o=>(
              <button key={o} onClick={()=>set("ponto",form.ponto===o?"":o)} className="fb" style={{flex:1,padding:"10px 6px",borderRadius:4,border:`1px solid ${form.ponto===o?T.pistacheDark:T.border}`,background:form.ponto===o?T.pistacheDark:"transparent",color:form.ponto===o?T.surface:T.ink,fontSize:12.5}}>{o}</button>
            ))}
          </div>
          <span className="fm" style={lab}>Mensagem (opcional)</span>
          <textarea className="fb" rows={3} style={{...inp,resize:"vertical"}} value={form.msg} onChange={e=>set("msg",e.target.value)} placeholder="Conte um pouco sobre você, sua experiência ou sua região…"/>
          <label style={{display:"flex",gap:9,alignItems:"flex-start",marginTop:16,cursor:"pointer"}}>
            <input type="checkbox" checked={form.consent} onChange={e=>set("consent",e.target.checked)} style={{marginTop:3,accentColor:T.pistacheDark,width:16,height:16,flexShrink:0}}/>
            <span className="fb" style={{fontSize:11.5,color:T.inkSoft,lineHeight:1.45}}>Autorizo o uso dos meus dados para contato, conforme a <a href="/?privacidade=1" target="_blank" rel="noopener noreferrer" style={{color:T.pistacheDark,textDecoration:"underline"}}>Política de Privacidade</a>.</span>
          </label>
          <button onClick={enviar} disabled={!ok} className="fb" style={{width:"100%",marginTop:14,padding:"14px",borderRadius:4,border:"none",background:ok?"#25D366":T.border,color:ok?"#fff":T.inkSoft,fontSize:15,fontWeight:600,cursor:ok?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            💬 Enviar pelo WhatsApp
          </button>
          <div className="fb" style={{fontSize:11,color:T.inkSoft,textAlign:"center",marginTop:10}}>Ao enviar, o WhatsApp abre com a mensagem pronta — é só confirmar o envio.</div>
        </div>
      </div>
    </div>
  );
}

/* ========== MONTE SEU POTE ========== */
const CUPS=[{id:"P",label:"Pote P",g:120},{id:"M",label:"Pote M",g:170}];
function PoteBuilder({onClose}){
  useModal(onClose);
  const gelatos=useMemo(()=>PRODUCTS.filter(p=>p.category==="gelato"),[]);
  const [cup,setCup]=useState("P");
  const [aId,setAId]=useState(gelatos[0].id);
  const [bId,setBId]=useState(gelatos[1].id);
  const [ratio,setRatio]=useState(50);
  const A=gelatos.find(p=>p.id===aId)||gelatos[0];
  const B=gelatos.find(p=>p.id===bId)||gelatos[1];
  const g=CUPS.find(c=>c.id===cup).g;
  const gA=Math.round(g*ratio/100), gB=g-gA;
  const per=(p,k)=>p.nutrition[k]/p.serving;       // por grama
  const tot=k=>per(A,k)*gA+per(B,k)*gB;            // total no pote
  const Sel=({value,onChange,label})=>(
    <select value={value} onChange={e=>onChange(e.target.value)} aria-label={label} className="fb" style={{width:"100%",padding:"8px 10px",borderRadius:4,border:`1px solid ${T.border}`,background:T.bg,color:T.ink,fontSize:13}}>
      {gelatos.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Monte seu pote" style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:6,maxWidth:480,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>Calculadora</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:2}}>Monte seu pote 🍦</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        <div style={{padding:22}}>
          <div className="fb" style={{fontSize:13,color:T.inkSoft,marginBottom:12}}>Escolha o tamanho e combine 2 sabores. As calorias e a proteína são calculadas para o peso real do pote.</div>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {CUPS.map(c=>(
              <button key={c.id} onClick={()=>setCup(c.id)} className="fb" style={{flex:1,padding:"11px",borderRadius:4,border:`1px solid ${cup===c.id?T.pistacheDark:T.border}`,background:cup===c.id?T.pistacheDark:"transparent",color:cup===c.id?T.surface:T.ink,fontSize:13,fontWeight:500}}>{c.label} · {c.g} g</button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1,textAlign:"center"}}>
              <ProductArt product={A} size={84}/>
              <div className="fm" style={{fontSize:11,color:T.pistacheDark,fontWeight:600,marginTop:4}}>{gA} g</div>
              <div style={{marginTop:8}}><Sel value={aId} onChange={setAId} label="Sabor 1"/></div>
            </div>
            <div className="fd" style={{fontSize:26,color:T.pistacheDark,alignSelf:"center",paddingTop:24}}>+</div>
            <div style={{flex:1,textAlign:"center"}}>
              <ProductArt product={B} size={84}/>
              <div className="fm" style={{fontSize:11,color:T.pistacheDark,fontWeight:600,marginTop:4}}>{gB} g</div>
              <div style={{marginTop:8}}><Sel value={bId} onChange={setBId} label="Sabor 2"/></div>
            </div>
          </div>
          <div style={{marginTop:18}}>
            <input type="range" min={0} max={100} step={5} value={ratio} onChange={e=>setRatio(Number(e.target.value))} aria-label="Proporção entre os sabores" style={{width:"100%",accentColor:T.pistacheDark}}/>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span className="fm" style={{fontSize:10,color:T.inkSoft}}>{ratio}% {A.name}</span>
              <span className="fm" style={{fontSize:10,color:T.inkSoft}}>{B.name} {100-ratio}%</span>
            </div>
          </div>
          <div style={{marginTop:18,background:T.ink,borderRadius:6,padding:"16px 18px",display:"flex",gap:12,alignItems:"center"}}>
            <div style={{flex:1,textAlign:"center"}}>
              <div className="fd" style={{fontSize:34,color:T.bg,fontWeight:500,lineHeight:1}}>{Math.round(tot("kcal"))}</div>
              <div className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.border,textTransform:"uppercase",marginTop:4}}>kcal no pote</div>
            </div>
            <div style={{width:1,alignSelf:"stretch",background:"rgba(255,255,255,0.15)"}}/>
            <div style={{flex:1,textAlign:"center"}}>
              <div className="fd" style={{fontSize:34,color:"#B8C97A",fontWeight:500,lineHeight:1}}>{tot("protein").toFixed(1)}g</div>
              <div className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.border,textTransform:"uppercase",marginTop:4}}>proteína</div>
            </div>
          </div>
          <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[["Carboidratos",tot("carbs")],["Gorduras",tot("fat")],["Fibras",tot("fiber")]].map(([l,v])=>(
              <div key={l} style={{background:T.bg,borderRadius:4,padding:"9px 6px",textAlign:"center"}}>
                <div className="fd" style={{fontSize:16,color:T.ink}}>{v.toFixed(1)}g</div>
                <div className="fm" style={{fontSize:8,letterSpacing:"0.12em",color:T.inkSoft,textTransform:"uppercase",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          <p className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:12,lineHeight:1.5,textAlign:"center"}}>Referência padrão: 100 g · valores calculados proporcionalmente para o pote de {g} g.</p>
        </div>
      </div>
    </div>
  );
}

/* ========== PITCH DECK (interativo, tech, on-brand) ========== */
function PitchKicker({n,total,label,gold}){
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
      <span className="fm" style={{fontSize:12,letterSpacing:"0.3em",color:gold}}>{String(n).padStart(2,"0")} / {String(total).padStart(2,"0")}</span>
      <span style={{flex:"0 0 28px",height:1,background:gold,opacity:0.6}}/>
      <span className="fm" style={{fontSize:10,letterSpacing:"0.34em",textTransform:"uppercase",color:"#B9BBA6"}}>{label}</span>
    </div>
  );
}
function PitchStat({v,u,l,gold,cream}){
  return (
    <div style={{border:"1px solid rgba(196,168,130,0.28)",borderRadius:6,padding:"18px 16px",background:"rgba(255,255,255,0.02)"}}>
      <div className="fm" style={{fontSize:"clamp(30px,5vw,46px)",color:gold,lineHeight:1,fontWeight:500}}>{v}<span style={{fontSize:"0.5em",color:cream,opacity:0.7}}>{u}</span></div>
      <div className="fb" style={{fontSize:12.5,color:cream,opacity:0.72,marginTop:8,lineHeight:1.4}}>{l}</div>
    </div>
  );
}
function PitchDeck({onClose,onCatalog}){
  const ink="#181C12",cream="#F1ECDD",gold="#C9A86A",pist=T.pistache,pistD="#7C8B4E";
  const G=useMemo(()=>PRODUCTS.filter(p=>p.category==="gelato"),[]);
  const B=useMemo(()=>PRODUCTS.filter(p=>p.category==="bentole"),[]);
  const thumbs=useMemo(()=>[G[7],G[6],G[8],G[2],B[0],B[5]].filter(Boolean),[G,B]);
  const H1={fontFamily:"'Fraunces',Georgia,serif",color:cream,fontSize:"clamp(30px,6.2vw,60px)",lineHeight:1.04,letterSpacing:"-0.02em",fontWeight:400};
  const BODY={fontSize:"clamp(14px,2.4vw,18px)",color:cream,opacity:0.8,lineHeight:1.6,maxWidth:640};
  const card=(title,desc)=>(
    <div key={title} style={{flex:"1 1 180px",minWidth:170,border:"1px solid rgba(196,168,130,0.25)",borderRadius:6,padding:"18px 18px",background:"rgba(255,255,255,0.02)"}}>
      <div className="fd" style={{fontSize:18,color:gold,marginBottom:8}}>{title}</div>
      <div className="fb" style={{fontSize:13.5,color:cream,opacity:0.72,lineHeight:1.5}}>{desc}</div>
    </div>
  );
  const pill=t=><span key={t} className="fm" style={{fontSize:11,letterSpacing:"0.16em",color:cream,border:`1px solid ${gold}`,borderRadius:999,padding:"7px 14px",textTransform:"uppercase"}}>{t}</span>;

  const slides=[
    // 0 — Capa
    <div key="s0" style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <span className="fm" style={{fontSize:11,letterSpacing:"0.42em",color:gold,marginBottom:26}}>PITCH DECK · 2026</span>
      <BentoLogo size={104}/>
      <h1 style={{...H1,marginTop:26,fontSize:"clamp(38px,8vw,76px)"}}>Gelato com <i style={{color:pist,fontStyle:"italic"}}>propósito</i></h1>
      <p style={{...BODY,marginTop:18,opacity:0.85}}>A primeira linha brasileira de gelato funcional: sabor de sobremesa, ficha técnica de suplemento.</p>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:28}}>{["Zero açúcar adicionado","Rico em proteína","Rótulo limpo"].map(pill)}</div>
      <div className="fm" style={{fontSize:11,letterSpacing:"0.3em",color:"#9A9C86",marginTop:34,textTransform:"uppercase"}}>Espírito Santo · Brasil</div>
    </div>,
    // 1 — Problema
    <div key="s1">
      <PitchKicker n={1} total={10} label="O problema" gold={gold}/>
      <h1 style={H1}>Prazer gelado ainda<br/>é sinônimo de culpa.</h1>
      <p style={{...BODY,marginTop:22}}>Um público crescente — fitness, low-carb, controle glicêmico, alimentação limpa — não encontra sobremesa gelada que entregue prazer real sem comprometer a dieta. O “fit” tradicional falha em sabor e confunde no rótulo.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:30}}>{[["Mercado grande","sorvete é hábito nacional"],["Mal atendido","sabor ruim ou rótulo opaco"],["Tendência clara","alta proteína + menos açúcar"]].map(([t,d])=>card(t,d))}</div>
    </div>,
    // 2 — Solução
    <div key="s2">
      <PitchKicker n={2} total={10} label="A solução" gold={gold}/>
      <h1 style={H1}>Gelato italiano,<br/>reformulado do zero.</h1>
      <p style={{...BODY,marginTop:22}}>Reengenharia de formulação para unir cremosidade real e desempenho nutricional — sem sacarose adicionada em toda a linha.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:30}}>{[["Base ZERO","fibras e polióis no lugar do açúcar"],["Whey WPH","proteína hidrolisada, alta absorção"],["0 g sacarose","adoçado por stévia e polióis"]].map(([t,d])=>card(t,d))}</div>
    </div>,
    // 3 — Portfólio
    <div key="s3">
      <PitchKicker n={3} total={10} label="Portfólio" gold={gold}/>
      <h1 style={H1}>{PRODUCTS.length} sabores. Duas linhas.</h1>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:24}}>
        <div style={{flex:"1 1 240px",border:"1px solid rgba(196,168,130,0.25)",borderRadius:6,padding:"18px"}}>
          <div className="fm" style={{fontSize:10,letterSpacing:"0.24em",color:gold,textTransform:"uppercase"}}>01 · Vitrine</div>
          <div className="fd" style={{fontSize:26,color:cream,marginTop:4}}>Gelatos <span style={{color:pist}}>· {G.length}</span></div>
          <div className="fb" style={{fontSize:13,color:cream,opacity:0.7,marginTop:6,lineHeight:1.5}}>Cremosos e proteicos. Clássicos e premium (Pistache, Dubai, Doce de Leite) e sorbets funcionais.</div>
        </div>
        <div style={{flex:"1 1 240px",border:"1px solid rgba(196,168,130,0.25)",borderRadius:6,padding:"18px"}}>
          <div className="fm" style={{fontSize:10,letterSpacing:"0.24em",color:gold,textTransform:"uppercase"}}>02 · Take-home</div>
          <div className="fd" style={{fontSize:26,color:cream,marginTop:4}}>Bentôlé <span style={{color:pist}}>· {B.length}</span></div>
          <div className="fb" style={{fontSize:13,color:cream,opacity:0.7,marginTop:6,lineHeight:1.5}}>Mini picolés premium de alta proteína. Leve para onde for.</div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:18,flexWrap:"wrap"}}>{thumbs.map(p=><div key={p.id} style={{width:74,height:74,borderRadius:6,overflow:"hidden",border:"1px solid rgba(196,168,130,0.3)"}}><ProductArt product={p} size={74}/></div>)}</div>
    </div>,
    // 4 — Números
    <div key="s4">
      <PitchKicker n={4} total={10} label="Números que vendem" gold={gold}/>
      <h1 style={H1}>Indulgência com<br/>ficha de suplemento.</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginTop:28}}>
        <PitchStat v="13" u="g" l="proteína por porção (Paçoca, Brigadeiro)" gold={gold} cream={cream}/>
        <PitchStat v="61" u="kcal" l="campeão Pistache & Choco Branco — com 10 g de proteína" gold={gold} cream={cream}/>
        <PitchStat v="0" u="g" l="açúcar adicionado em toda a linha" gold={gold} cream={cream}/>
        <PitchStat v="42" u="kcal" l="o mais leve (Franui)" gold={gold} cream={cream}/>
      </div>
    </div>,
    // 5 — Engenharia / regulatório
    <div key="s5">
      <PitchKicker n={5} total={10} label="Engenharia & conformidade" gold={gold}/>
      <h1 style={H1}>Técnica que o<br/>“fit” não entrega.</h1>
      <p style={{...BODY,marginTop:22}}>Balanço PAC/POD calibrado para textura cremosa real, whey hidrolisado e chocolates zero açúcar (Lukau). Rotulagem limpa, auditável e pronta para escala.</p>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:26}}>{["RDC 429/2020","IN 75/2020","RDC 26/2015 · alérgicos","RDC 727/2022"].map(pill)}</div>
    </div>,
    // 6 — Transparência / app
    <div key="s6">
      <PitchKicker n={6} total={10} label="Transparência como marca" gold={gold}/>
      <h1 style={H1}>Índice nutricional<br/>digital, no PDV.</h1>
      <p style={{...BODY,marginTop:22}}>Um QR code no balcão leva o cliente à ficha completa de cada sabor: informação nutricional, ingredientes, alérgicos, comparador e calculadora de proteína. Transparência radical vira conversão.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:28}}>{[["Ficha completa","IN 75/2020 por sabor"],["Comparador","lado a lado"],["Calculadora","proteína por meta"]].map(([t,d])=>card(t,d))}</div>
    </div>,
    // 7 — Monte seu Pote
    <div key="s7">
      <PitchKicker n={7} total={10} label="Experiência interativa" gold={gold}/>
      <h1 style={H1}>Monte seu pote.</h1>
      <p style={{...BODY,marginTop:22}}>O cliente combina 2 sabores no pote P (120 g) ou M (170 g) e vê na hora as calorias e a proteína exatas da combinação. Personalização que engaja, aumenta o ticket e reforça o posicionamento funcional.</p>
      <div style={{display:"flex",gap:16,alignItems:"center",marginTop:30,flexWrap:"wrap"}}>
        <div className="fm" style={{fontSize:"clamp(28px,5vw,44px)",color:gold}}>2 <span style={{fontSize:"0.42em",color:cream,opacity:0.7}}>SABORES</span></div>
        <span style={{color:pist,fontSize:28}}>→</span>
        <div className="fm" style={{fontSize:"clamp(28px,5vw,44px)",color:gold}}>kcal + proteína <span style={{fontSize:"0.4em",color:cream,opacity:0.7}}>NA HORA</span></div>
      </div>
    </div>,
    // 8 — Mercado & modelo
    <div key="s8">
      <PitchKicker n={8} total={10} label="Mercado & modelo" gold={gold}/>
      <h1 style={H1}>Público premium,<br/>escala por franquia.</h1>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:26}}>{[["Público","musculação, low-carb, controle glicêmico, clean label"],["Canais","vitrine, franquia, take-home, e-commerce, academias"],["Escala","~100 picolés por receita de Bentôlé"],["Recorrência","assinatura e cross-sell entre linhas"]].map(([t,d])=>card(t,d))}</div>
    </div>,
    // 9 — Visão / CTA
    <div key="s9" style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <PitchKicker n={9} total={10} label="Visão" gold={gold}/>
      <h1 style={{...H1,fontSize:"clamp(32px,7vw,64px)"}}>A referência nacional<br/>em sobremesa funcional.</h1>
      <p style={{...BODY,marginTop:20,textAlign:"center"}}>Zero açúcar adicionado. Alta proteína. Rótulo limpo. Sem abrir mão do prazer.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",marginTop:34}}>
        <a href={DECK_URL} target="_blank" rel="noopener noreferrer" className="fb" style={{background:gold,color:ink,border:"none",borderRadius:5,padding:"13px 24px",fontSize:14,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}><Printer size={15}/>Baixar PDF</a>
        <button onClick={onCatalog} className="fb" style={{background:"transparent",color:cream,border:`1px solid ${gold}`,borderRadius:5,padding:"13px 24px",fontSize:14,display:"flex",alignItems:"center",gap:8}}>Explorar catálogo <ChevronRight size={14}/></button>
      </div>
      <div className="fm" style={{fontSize:11,letterSpacing:"0.3em",color:"#9A9C86",marginTop:30,textTransform:"uppercase"}}>Bentô · Functional Nutrition</div>
    </div>,
  ];
  const n=slides.length;
  const [i,setI]=useState(0);
  const go=useCallback(d=>setI(v=>Math.max(0,Math.min(n-1,v+d))),[n]);
  useModal(onClose);
  useEffect(()=>{
    const h=e=>{if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();go(1);}else if(e.key==="ArrowLeft")go(-1);};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[go]);
  const tx=useRef(null);
  const grid="radial-gradient(rgba(201,168,106,0.10) 1px, transparent 1px)";
  return (
    <div className="fade" role="dialog" aria-modal="true" aria-label="Pitch deck Bentô"
      onTouchStart={e=>tx.current=e.touches[0].clientX}
      onTouchEnd={e=>{if(tx.current==null)return;const d=e.changedTouches[0].clientX-tx.current;if(Math.abs(d)>50)go(d<0?1:-1);tx.current=null;}}
      style={{position:"fixed",inset:0,zIndex:200,background:ink,backgroundImage:grid,backgroundSize:"26px 26px",display:"flex",flexDirection:"column"}}>
      {/* topo */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><BentoLogo size={30}/><span className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:"#9A9C86",textTransform:"uppercase"}}>Pitch</span></div>
        <button onClick={onClose} aria-label="Fechar" className="fm" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(201,168,106,0.3)",color:cream,borderRadius:5,padding:"8px 14px",fontSize:11,letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><X size={14}/>ESC</button>
      </div>
      {/* slide */}
      <div style={{flex:1,overflow:"auto",display:"flex",alignItems:"center",justifyContent:"center",padding:"12px 24px"}}>
        <div key={i} className="rise" style={{width:"100%",maxWidth:880}}>{slides[i]}</div>
      </div>
      {/* progresso */}
      <div style={{height:2,background:"rgba(255,255,255,0.08)",flexShrink:0}}><div style={{height:"100%",width:`${((i+1)/n)*100}%`,background:gold,transition:"width .4s cubic-bezier(.2,.8,.2,1)"}}/></div>
      {/* base */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",flexShrink:0,gap:12}}>
        <div style={{display:"flex",gap:7}}>{slides.map((_,k)=><button key={k} onClick={()=>setI(k)} aria-label={`Slide ${k+1}`} style={{width:k===i?22:8,height:8,borderRadius:999,border:"none",background:k===i?gold:"rgba(255,255,255,0.22)",transition:"all .3s",cursor:"pointer"}}/>)}</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span className="fm" style={{fontSize:12,color:"#9A9C86",minWidth:54,textAlign:"right"}}>{String(i+1).padStart(2,"0")} / {String(n).padStart(2,"0")}</span>
          <button onClick={()=>go(-1)} disabled={i===0} aria-label="Anterior" style={{background:"transparent",border:`1px solid rgba(201,168,106,${i===0?0.15:0.4})`,color:i===0?"#555":cream,borderRadius:5,width:38,height:34,cursor:i===0?"default":"pointer"}}><ArrowLeft size={15} style={{verticalAlign:"middle"}}/></button>
          <button onClick={()=>go(1)} disabled={i===n-1} aria-label="Próximo" style={{background:i===n-1?"transparent":gold,border:`1px solid ${gold}`,color:i===n-1?"#555":ink,borderRadius:5,width:38,height:34,cursor:i===n-1?"default":"pointer"}}><ChevronRight size={16} style={{verticalAlign:"middle"}}/></button>
        </div>
      </div>
    </div>
  );
}

/* ========== HEADER ========== */
function Header({onHome,compareCount,onOpenCompare,onQuiz,favorites}){
  return(
    <header className="hdr no-print" style={{background:`${T.bg}EA`,borderBottom:`1px solid ${T.border}`}}>
      <div style={{maxWidth:1152,margin:"0 auto",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <button onClick={onHome} aria-label="Início" style={{display:"flex",alignItems:"center",gap:12,background:"none",border:"none"}}>
          <BentoLogo size={38}/>
          <div style={{lineHeight:1.3,textAlign:"left"}}>
            <div className="fd" style={{fontSize:14,color:T.ink}}>Bentô</div>
            <div className="fm" style={{fontSize:8,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>Functional Nutrition</div>
          </div>
        </button>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {favorites.length>0&&<span className="fm" aria-label={`${favorites.length} favoritos`} style={{fontSize:9,letterSpacing:"0.18em",color:T.inkSoft,textTransform:"uppercase"}}>❤️ {favorites.length}</span>}
          {compareCount>0&&(
            <button onClick={onOpenCompare} className="fb" aria-label={`Comparar ${compareCount} sabores`} style={{background:T.bgWarm,color:T.ink,border:`1px solid ${T.border}`,borderRadius:3,padding:"8px 12px",fontSize:12,display:"flex",alignItems:"center",gap:6,position:"relative"}}>
              <Scale size={13}/><span className="fm" style={{fontSize:9,letterSpacing:"0.14em"}}>Comparar</span>
              <span style={{position:"absolute",top:-6,right:-6,background:T.pistacheDark,color:T.surface,borderRadius:"50%",width:18,height:18,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>{compareCount}</span>
            </button>
          )}
          <button onClick={onQuiz} className="fb" style={{background:T.pistacheDark,color:T.surface,border:"none",borderRadius:3,padding:"10px 14px",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:6}}>
            <Sparkles size={13}/>Encontre seu sabor
          </button>
        </div>
      </div>
    </header>
  );
}

/* ========== ARTE DO JOGO (Stranger Things × Mario) ========== */
function GameArt({size=38}){
  return(
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="gaGlow" cx="50%" cy="38%" r="62%"><stop offset="0" stopColor="#E63946" stopOpacity="0.45"/><stop offset="1" stopColor="#E63946" stopOpacity="0"/></radialGradient>
        <linearGradient id="gaBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e1430"/><stop offset="1" stopColor="#0d0a16"/></linearGradient>
      </defs>
      <rect width="48" height="48" rx="9" fill="url(#gaBg)"/>
      <rect width="48" height="48" rx="9" fill="url(#gaGlow)"/>
      <circle cx="9" cy="9" r="0.9" fill="#ff5d6c"/><circle cx="40" cy="7" r="0.7" fill="#ffd2d6"/><circle cx="33" cy="13" r="0.6" fill="#ff5d6c"/><circle cx="14" cy="31" r="0.6" fill="#ff8d97" opacity="0.7"/><circle cx="44" cy="18" r="0.6" fill="#ff8d97" opacity="0.6"/>
      <rect x="6" y="9" width="11" height="11" rx="1.5" fill="#F2C14E" stroke="#9c6b16" strokeWidth="1.2"/>
      <text x="11.5" y="18" fontSize="9" fontFamily="monospace" fontWeight="700" fill="#7a4d0a" textAnchor="middle">?</text>
      <circle cx="8.2" cy="11.2" r="0.6" fill="#9c6b16"/><circle cx="14.8" cy="11.2" r="0.6" fill="#9c6b16"/><circle cx="8.2" cy="17.8" r="0.6" fill="#9c6b16"/><circle cx="14.8" cy="17.8" r="0.6" fill="#9c6b16"/>
      <rect x="33" y="28" width="10" height="12" fill="#3FA34D"/><rect x="31.5" y="25.5" width="13" height="4.6" rx="1" fill="#4FBF5D" stroke="#2C7A3D" strokeWidth="0.8"/><rect x="35" y="29" width="1.8" height="11" fill="#2C7A3D" opacity="0.5"/>
      <rect x="20.6" y="34" width="2.4" height="7" rx="1" fill="#C9A86A"/>
      <rect x="16" y="20" width="11.6" height="16" rx="4" fill="#E63946" stroke="#8c1f2b" strokeWidth="1"/>
      <rect x="18" y="22.5" width="2.8" height="6" rx="1.4" fill="#ff8d97" opacity="0.8"/>
      <circle cx="20" cy="27" r="1.5" fill="#fff"/><circle cx="24" cy="27" r="1.5" fill="#fff"/><circle cx="20.3" cy="27.2" r="0.75" fill="#17101f"/><circle cx="24.3" cy="27.2" r="0.75" fill="#17101f"/>
      <rect x="0" y="40" width="48" height="8" fill="#3a241f"/>
      <g stroke="#21130f" strokeWidth="0.8"><line x1="0" y1="44" x2="48" y2="44"/><line x1="6" y1="40" x2="6" y2="44"/><line x1="18" y1="40" x2="18" y2="44"/><line x1="30" y1="40" x2="30" y2="44"/><line x1="42" y1="40" x2="42" y2="44"/><line x1="12" y1="44" x2="12" y2="48"/><line x1="24" y1="44" x2="24" y2="48"/><line x1="36" y1="44" x2="36" y2="48"/></g>
    </svg>
  );
}

/* ========== BOTÃO DE FUNÇÃO (Tile) ==========
   Suporta dois estilos: padrão (ícone/emoji + texto) e a variante
   "preenchida com imagem" (t.img) — fundo full-bleed + função em destaque ao centro. */
function Tile({t,delay=0}){
  if(t.img){
    return(
      <button onClick={()=>tk(t.title,t.onClick)} className="hl rise" style={{position:"relative",overflow:"hidden",width:"100%",border:`1px solid ${t.bd||"#0d0a16"}`,borderRadius:12,padding:0,minHeight:122,cursor:"pointer",animationDelay:`${delay}ms`}}>
        <img src={t.img} alt="" aria-hidden="true" loading="lazy" onError={onImgErr} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:t.imgPos||"center"}}/>
        <div style={{position:"absolute",inset:0,background:t.overlay||"linear-gradient(180deg,rgba(13,10,22,.12) 0%,rgba(13,10,22,.46) 52%,rgba(13,10,22,.88) 100%)"}}/>
        <div style={{position:"relative",minHeight:122,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:7,padding:"16px 12px"}}>
          <div className="fd" style={{fontSize:19,lineHeight:1.05,color:"#fff",textAlign:"center",letterSpacing:"-0.01em",textShadow:t.glow?`0 0 18px ${t.glow}, 0 2px 10px rgba(0,0,0,.75)`:"0 2px 10px rgba(0,0,0,.75)"}}>{t.title}</div>
          <div className="fb" style={{fontSize:11,lineHeight:1.3,color:"rgba(255,255,255,.92)",textAlign:"center",textShadow:"0 1px 6px rgba(0,0,0,.75)"}}>{t.sub}</div>
          {t.badge&&<span className="fm" style={{marginTop:2,fontSize:9,letterSpacing:"0.04em",fontWeight:700,color:"#fff",background:t.badgeBg||"#6B4FA0",borderRadius:999,padding:"3px 11px",boxShadow:"0 2px 10px rgba(0,0,0,.45)"}}>{t.badge}</span>}
        </div>
      </button>
    );
  }
  return(
    <button onClick={()=>tk(t.title,t.onClick)} className="hl rise" style={{background:t.bg,border:`1px solid ${t.bd}`,borderRadius:12,padding:"18px 14px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:7,minHeight:122,cursor:"pointer",animationDelay:`${delay}ms`}}>
      {t.art||<span style={{fontSize:30,lineHeight:1}}>{t.emoji}</span>}
      <div className="fd" style={{fontSize:16,lineHeight:1.1,color:t.fg}}>{t.title}</div>
      <div className="fb" style={{fontSize:11,lineHeight:1.3,color:t.fg===T.bg?`${T.bg}BB`:T.inkSoft}}>{t.sub}</div>
      {t.badge&&<span className="fm" style={{marginTop:5,fontSize:9,letterSpacing:"0.04em",fontWeight:700,color:"#fff",background:"#6B4FA0",borderRadius:999,padding:"3px 10px"}}>{t.badge}</span>}
    </button>
  );
}

/* ========== HOME (LAUNCHER) ========== */
function Home({onTabelas,onCardapio,onPitch,onParceria,onDelivery,onFaq,onEventos}){
  const tiles=[
    {title:"Delivery",sub:"Peça em casa pelo iFood",onClick:onDelivery,img:"/tiles/delivery.webp",imgPos:"center",bd:"#9c6f64",badge:"🗺️ Peça agora pelo iFood e nos encontre",badgeBg:"#EA1D2C"},
    {title:"Cardápio",sub:"Linha completa com fotos e preços",onClick:onCardapio,img:"/tiles/cardapio.webp",imgPos:"center 42%",bd:"#7a6440"},
    {title:"Seja um parceiro",sub:"Revenda & franquia",onClick:onParceria,img:"/tiles/parceria.webp",imgPos:"center 22%",bd:"#2f3a24"},
    {title:"Stranger Gelatos",sub:"Vença as fases e conquiste descontos",onClick:()=>window.open("https://stranger-gelatos.vercel.app/index.html","_blank","noopener"),img:"/games/stranger-gelatos.webp",imgPos:"26% 40%",glow:"rgba(230,57,70,.55)",bd:"#3a2630",badge:"🎮 Jogar e ganhar desconto",badgeBg:"#C2384A"},
    {title:"Conheça a Bentô",sub:"Nossa história e propósito",onClick:onPitch,img:"/tiles/conheca.webp",imgPos:"center 30%",bd:"#4a5a3a"},
    {title:"Dúvidas frequentes",sub:"Dieta, polióis, lactose e mais",onClick:onFaq,img:"/tiles/duvidas.webp",imgPos:"center 35%",bd:"#4a5142"},
  ];
  return(
    <div className="fade">
      <section style={{minHeight:"calc(100svh - 64px)",maxWidth:880,margin:"0 auto",padding:"16px 20px 28px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",textAlign:"center"}}>
        <div className="rise"><BentoLogo size={78}/></div>
        <h1 className="fd rise" style={{fontSize:"clamp(26px,5vw,46px)",lineHeight:1.05,color:T.ink,marginTop:12,fontWeight:400,letterSpacing:"-0.02em",animationDelay:"50ms"}}>
          Gelato com <em style={{color:T.pistacheDark,fontStyle:"italic"}}>propósito</em>
        </h1>
        <p className="fb rise" style={{maxWidth:440,margin:"8px auto 0",color:T.inkSoft,fontSize:13.5,lineHeight:1.55,animationDelay:"100ms"}}>
          Zero açúcar adicionado · rico em proteína · rótulo limpo.
        </p>

        <div style={{width:"100%",marginTop:22}}>
          {/* Botão principal: Tabelas */}
          <button onClick={()=>tk("Tabelas Nutricionais",onTabelas)} className="hl rise" style={{width:"100%",display:"flex",alignItems:"center",gap:14,textAlign:"left",background:"linear-gradient(135deg,#EEF4DF 0%,#E1ECC8 100%)",border:"1px solid #BCCE8E",borderLeft:`4px solid ${T.pistacheDark}`,borderRadius:14,padding:"12px 18px",cursor:"pointer",animationDelay:"120ms",boxShadow:"0 10px 28px -16px rgba(74,90,34,.5)"}}>
            <div style={{display:"flex",gap:2,flexShrink:0}}>
              <GelatoSVG p={{base:"#B8C97A",mid:"#8FA050",deep:"#4A5A22",swirl:"#2E3812",hl:"#DCE8A8"}} size={46} id="hg"/>
              <PicoleSVG p={{base:"#D85A6E",mid:"#A8334A",deep:"#5C1422",swirl:"#F2E7D0",hl:"#FFB0BE"}} size={40} id="hp"/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div className="fm" style={{display:"inline-block",fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"#fff",background:T.pistacheDark,borderRadius:999,padding:"2px 9px",marginBottom:5}}>Comece por aqui</div>
              <div className="fd" style={{fontSize:"clamp(19px,3.2vw,24px)",color:T.ink,lineHeight:1.05}}>Tabelas Nutricionais</div>
              <div className="fb" style={{fontSize:12,color:T.inkSoft,marginTop:2,lineHeight:1.3}}>Gelatos, picolés, monte seu pote e quiz de sabores.</div>
            </div>
            <span className="fd" style={{fontSize:24,color:T.pistacheDark,flexShrink:0}}>→</span>
          </button>

          {/* Linha 1 de funções */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginTop:12}}>
            {tiles.slice(0,2).map((t,i)=>(
              <Tile key={t.title} t={t} delay={160+i*45}/>
            ))}
          </div>

          {/* Banner Eventos */}
          <button onClick={()=>tk("Nos leve para seu evento",onEventos)} className="hl rise" style={{width:"100%",display:"flex",alignItems:"center",gap:14,textAlign:"left",background:"linear-gradient(135deg,#F8EFD8 0%,#EFDFB8 100%)",border:"1px solid #D3B57E",borderLeft:"4px solid #A9831C",borderRadius:14,padding:"12px 20px 12px 12px",cursor:"pointer",marginTop:12,animationDelay:"250ms",boxShadow:"0 10px 28px -16px rgba(169,131,28,.5)"}}>
            <img src="/eventos/carrinho-1-thumb.webp" alt="" aria-hidden="true" loading="lazy" style={{width:54,height:54,objectFit:"cover",borderRadius:10,flexShrink:0,border:"1px solid #DCC494"}} onError={onImgErr} />
            <div style={{flex:1,minWidth:0}}>
              <span className="fm" style={{display:"inline-block",fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"#fff",background:"#A9831C",borderRadius:999,padding:"2px 9px",marginBottom:4}}>⚡ Orçamento na hora</span>
              <div className="fd" style={{fontSize:"clamp(17px,3vw,21px)",color:T.ink,lineHeight:1.1}}>Nos leve para seu evento</div>
              <div className="fb" style={{fontSize:12,color:T.inkSoft,marginTop:2,lineHeight:1.3}}>Estrutura completa + orçamento online na hora · casamentos, festas e corporativo</div>
            </div>
            <span className="fd" style={{fontSize:22,color:"#A9831C",flexShrink:0}}>→</span>
          </button>

          {/* Demais funções */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginTop:12}}>
            {tiles.slice(2).map((t,i)=>(
              <Tile key={t.title} t={t} delay={250+i*45}/>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========== TABELAS (HUB DE PRODUTOS/FERRAMENTAS) ========== */
function TabelasHub({onSelect,onSelectProduct,onPote,onQuiz,onBack,onCulpa,onGLP1}){
  const counts={gelato:PRODUCTS.filter(p=>p.category==="gelato").length,bentole:PRODUCTS.filter(p=>p.category==="bentole").length};
  const topProt=PRODUCTS.slice().sort((a,b)=>b.nutrition.protein-a.nutrition.protein).slice(0,4);
  const tools=[
    {title:"Gelatos",sub:`${counts.gelato} sabores · ficha completa`,onClick:()=>onSelect("gelato"),art:<GelatoSVG p={{base:"#B8C97A",mid:"#8FA050",deep:"#4A5A22",swirl:"#2E3812",hl:"#DCE8A8"}} size={64} id="tg"/>},
    {title:"Bentôlé",sub:`${counts.bentole} picolés · ficha por sabor`,onClick:()=>onSelect("bentole"),art:<PicoleSVG p={{base:"#D85A6E",mid:"#A8334A",deep:"#5C1422",swirl:"#F2E7D0",hl:"#FFB0BE"}} size={64} id="tp"/>},
    {title:"Monte seu pote",sub:"Combine 2 sabores · calorias e proteína",onClick:onPote,emoji:"🍦"},
    {title:"Qual é o meu sabor?",sub:"Quiz rápido de 3 perguntas",onClick:onQuiz,emoji:"🎯"},
  ];
  return(
    <div className="fade">
      <section style={{maxWidth:1000,margin:"0 auto",padding:"24px 24px 40px"}}>
        <button onClick={onBack} className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.inkSoft,textTransform:"uppercase",background:"none",border:"none",display:"flex",alignItems:"center",gap:6,marginBottom:18,cursor:"pointer"}}><ArrowLeft size={13}/>Início</button>
        <div className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:8}}>Tabelas Nutricionais</div>
        <h1 className="fd" style={{fontSize:"clamp(30px,5vw,52px)",lineHeight:1,color:T.ink,fontWeight:400,letterSpacing:"-0.02em"}}>Explore os produtos</h1>
        <p className="fb" style={{fontSize:14,color:T.inkSoft,marginTop:8,maxWidth:560,lineHeight:1.5}}>Fichas nutricionais completas, calculadora de pote e o quiz de sabores.</p>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14,marginTop:24}}>
          {tools.map((t,i)=>(
            <button key={t.title} onClick={t.onClick} className="hl rise" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"20px",textAlign:"left",display:"flex",alignItems:"center",gap:14,cursor:"pointer",animationDelay:`${i*45}ms`}}>
              <div style={{width:64,height:64,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.art||<span style={{fontSize:38,lineHeight:1}}>{t.emoji}</span>}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="fd" style={{fontSize:22,color:T.ink,lineHeight:1.1,letterSpacing:"-0.01em"}}>{t.title}</div>
                <div className="fb" style={{fontSize:12.5,color:T.inkSoft,marginTop:4,lineHeight:1.35}}>{t.sub}</div>
              </div>
              <span className="fd" style={{fontSize:22,color:T.pistacheDark,flexShrink:0}}>→</span>
            </button>
          ))}
        </div>

        <div className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.pistacheDark,textTransform:"uppercase",margin:"34px 0 14px"}}>✦ Inteligência nutricional</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
          <button onClick={()=>tk("Sem culpa-ômetro",onCulpa)} className="hl rise" style={{textAlign:"left",background:"linear-gradient(135deg,#222B1A,#3A472A)",border:"1px solid #3A472A",borderRadius:10,padding:"18px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:34,flexShrink:0}}>🍦</span>
            <div style={{flex:1,minWidth:0}}>
              <div className="fm" style={{fontSize:8.5,letterSpacing:"0.18em",textTransform:"uppercase",color:"#B8C97A"}}>Compare & compartilhe</div>
              <div className="fd" style={{fontSize:19,color:"#fff",lineHeight:1.1,marginTop:3}}>Sem culpa-ômetro</div>
              <div className="fb" style={{fontSize:11.5,color:"rgba(255,255,255,.8)",marginTop:3,lineHeight:1.3}}>Quanto açúcar você economiza vs sorvete comum</div>
            </div>
            <span className="fd" style={{fontSize:20,color:"#B8C97A",flexShrink:0}}>→</span>
          </button>
          <button onClick={()=>tk("Aliado da caneta (GLP-1)",onGLP1)} className="hl rise" style={{textAlign:"left",background:"linear-gradient(135deg,#2A2238,#3E2F58)",border:"1px solid #463A5F",borderRadius:10,padding:"18px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:34,flexShrink:0}}>💉</span>
            <div style={{flex:1,minWidth:0}}>
              <div className="fm" style={{fontSize:8.5,letterSpacing:"0.18em",textTransform:"uppercase",color:"#D9C7F2"}}>Para quem usa GLP-1</div>
              <div className="fd" style={{fontSize:19,color:"#fff",lineHeight:1.1,marginTop:3}}>Tá na caneta?</div>
              <div className="fb" style={{fontSize:11.5,color:"rgba(255,255,255,.8)",marginTop:3,lineHeight:1.3}}>Proteína em porção pequena pra pouco apetite</div>
            </div>
            <span className="fd" style={{fontSize:20,color:"#D9C7F2",flexShrink:0}}>→</span>
          </button>
        </div>

        <div className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.pistacheDark,textTransform:"uppercase",margin:"34px 0 14px"}}>⚡ Mais ricos em proteína</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
          {topProt.map(p=>(
            <button key={p.id} className="hl" style={{textAlign:"left",background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:14,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>onSelectProduct(p.id)}>
              <ProductArt product={p} size={64}/>
              <div>
                <div className="fd" style={{fontSize:16,color:T.ink}}>{p.name}</div>
                <div className="fm" style={{fontSize:17,color:T.pistacheDark,fontWeight:500,marginTop:3}}>{p.nutrition.protein}g</div>
                <div className="fm" style={{fontSize:9,color:T.inkSoft,letterSpacing:"0.18em",textTransform:"uppercase"}}>proteína · {p.nutrition.kcal} kcal</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ========== LIST ========== */
function ProductList({category,onBack,onSelectProduct,compareIds,onToggleCompare,onOpenCompare}){
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("all");
  const [moodF,setMoodF]=useState(null);
  const allMoods=useMemo(()=>[...new Set(PRODUCTS.filter(p=>p.category===category).flatMap(p=>p.moods))],[category]);
  const items=useMemo(()=>PRODUCTS.filter(p=>p.category===category).filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).filter(p=>filter==="nogluten"?!p.flags.gluten:filter==="nolactose"?!p.flags.lactose:filter==="prot9"?p.nutrition.protein>=9:filter==="kcal100"?p.nutrition.kcal<100:true).filter(p=>moodF?p.moods.includes(moodF):true),[category,search,filter,moodF]);
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
          {[{id:"all",l:"Todos"},{id:"prot9",l:"Proteína ≥ 9g"},{id:"kcal100",l:"< 100 kcal"},{id:"nogluten",l:"Sem glúten"},{id:"nolactose",l:"Sem lactose"}].map(f=>(
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
          <button onClick={onClick} className="fb" style={{flex:1,padding:"10px 0",background:T.pistacheDark,color:T.surface,border:"none",borderRadius:3,fontSize:12,fontWeight:500}}>Ver ficha completa</button>
          <button onClick={e=>{e.stopPropagation();onToggleCompare();}} aria-label={inCompare?"Remover da comparação":canCompare?"Adicionar à comparação":"Máximo de 3 sabores"} style={{width:44,height:44,border:`1px solid ${inCompare?T.pistacheDark:T.border}`,borderRadius:3,background:inCompare?T.pistacheDark:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:inCompare?T.surface:T.inkSoft,opacity:(!inCompare&&!canCompare)?0.4:1}}><Scale size={14}/></button>
        </div>
        <div style={{display:"flex",gap:5,marginTop:10,flexWrap:"wrap"}}>
          <Chip tone={p.flags.gluten?"warn":"good"}>{p.flags.gluten?"Contém Glúten":"Não Contém Glúten"}</Chip>
          {!p.flags.lactose&&<Chip tone="good">Zero Lactose</Chip>}
          {proteinClaim(p)&&<Chip tone="good">{proteinClaim(p)}</Chip>}
          {p.nutrition.addedSugars===0&&<Chip tone="good">Sem Açúcar Adicionado</Chip>}
          {p.estimated&&<Chip tone="neutral">Macros Estimados</Chip>}
        </div>
        {lupaFrontal(p).map(l=>(
          <div key={l} style={{marginTop:8,display:"inline-flex",alignSelf:"flex-start",alignItems:"center",gap:6,background:"#1F2317",color:"#fff",borderRadius:2,padding:"5px 9px"}}>
            <span className="fm" style={{fontSize:9,letterSpacing:"0.12em",fontWeight:600}}>⬛ ALTO EM {l}</span>
          </div>
        ))}
        {ALLERGENS[p.id]?.length>0&&(
          <div className="fm" style={{marginTop:9,fontSize:9.5,letterSpacing:"0.06em",color:"#7A1F1F",lineHeight:1.4,fontWeight:600}}>ALÉRGICOS: CONTÉM {ALLERGENS[p.id].join(", ")}.</div>
        )}
      </div>
    </div>
  );
}

/* ========== DETAIL ========== */
// Valores Diários de Referência — IN 75/2020, Anexo II
const VD={kcal:2000,carbs:300,addedSugars:50,protein:50,fat:65,satFat:20,fiber:25,sodium:2000};
// Arredondamento/formatação pt-BR (vírgula decimal); sódio < 5 mg = não significativo → "0"
const br=v=>Number.isInteger(v)?String(v):String(v).replace(".",",");
// Ordem de leitura dos ingredientes: fruta primeiro (gelatos de fruta), depois
// whey, água e leite — os de maior composição — e por fim o restante (ordem original).
function orderIngredients(ings){
  const rank=name=>{
    const n=name.toLowerCase();
    if(n.startsWith("polpa")) return 0;
    if(n.includes("whey")) return 1;
    if(n==="água"||n==="agua") return 2;
    if(n.startsWith("leite piracanjuba")) return 3;
    return 4;
  };
  return ings.map((ing,i)=>({ing,i})).sort((a,b)=>rank(a.ing.name)-rank(b.ing.name)||a.i-b.i).map(x=>x.ing);
}
function ProductDetail({productId,onBack,onSelectProduct,favorites,onToggleFav,compareIds,onToggleCompare}){
  const [protGoal,setProtGoal]=useState(120);
  const product=PRODUCTS.find(p=>p.id===productId);
  if(!product)return null;
  const n=product.nutrition;
  const per100=k=>n[k]*(100/product.serving);
  const pct=(v,r)=>Math.round((v/r)*100);
  const isFav=favorites.includes(product.id);
  const inCmp=compareIds.includes(product.id);
  const units=n.protein>0?Math.min(99,Math.ceil(protGoal/n.protein)):0;
  const lupas=lupaFrontal(product);
  const claim=proteinClaim(product);
  const allergens=ALLERGENS[product.id]||[];
  // sódio: valores não significativos (< 5 mg/porção) declaram 0 (IN 75, Anexo III)
  const sod=n.sodium<5?0:n.sodium, sod100=per100("sodium")<5?0:per100("sodium");
  const ROWS=[
    {k:"kcal",l:"Valor energético (kcal)",v100:Math.round(per100("kcal")),v:n.kcal,u:"",vd:pct(n.kcal,VD.kcal)},
    {k:"carbs",l:"Carboidratos",v100:per100("carbs"),v:n.carbs,u:"g",vd:pct(n.carbs,VD.carbs)},
    {k:"sugars",l:"Açúcares totais",v100:per100("sugars"),v:n.sugars,u:"g",ind:true},
    {k:"added",l:"Açúcares adicionados",v100:per100("addedSugars"),v:n.addedSugars,u:"g",ind:true,vd:pct(n.addedSugars,VD.addedSugars)},
    {k:"protein",l:"Proteínas",v100:per100("protein"),v:n.protein,u:"g",vd:pct(n.protein,VD.protein),main:true},
    {k:"fat",l:"Gorduras totais",v100:per100("fat"),v:n.fat,u:"g",vd:pct(n.fat,VD.fat)},
    {k:"satFat",l:"Gorduras saturadas",v100:per100("satFat"),v:n.satFat,u:"g",vd:pct(n.satFat,VD.satFat),ind:true},
    {k:"trans",l:"Gorduras trans",v100:per100("transFat"),v:n.transFat,u:"g",ind:true},
    {k:"fiber",l:"Fibras alimentares",v100:per100("fiber"),v:n.fiber,u:"g",vd:pct(n.fiber,VD.fiber)},
    {k:"sodium",l:"Sódio",v100:sod100,v:sod,u:"mg",vd:pct(sod,VD.sodium)},
  ].map(r=>({...r,v100:typeof r.v100==="number"&&r.u==="g"?Math.round(r.v100*10)/10:r.v100}));
  const similar=PRODUCTS.filter(p=>p.id!==product.id&&p.moods.some(m=>product.moods.includes(m))).slice(0,3);
  return(
    <div className="fade">
      <div style={{maxWidth:1152,margin:"0 auto",padding:"28px 24px 40px"}}>
        <div className="no-print" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:24,flexWrap:"wrap"}}>
          <button onClick={onBack} className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.inkSoft,textTransform:"uppercase",background:"none",border:"none",display:"flex",alignItems:"center",gap:6}}><ArrowLeft size={13}/>Voltar</button>
          <button onClick={()=>window.print()} className="fm" style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",background:T.ink,color:T.bg,border:"none",borderRadius:3,padding:"9px 16px",display:"flex",alignItems:"center",gap:7}}><Printer size={13}/>Imprimir / PDF</button>
        </div>
        {/* Cabeçalho visível apenas na impressão */}
        <div className="print-only" style={{display:"none",justifyContent:"space-between",alignItems:"flex-end",borderBottom:`2px solid ${T.ink}`,paddingBottom:10,marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <BentoLogo size={48}/>
            <div>
              <div className="fd" style={{fontSize:20,color:T.ink}}>Bentô · Functional Nutrition</div>
              <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>Ficha Técnica · Informação Nutricional</div>
            </div>
          </div>
          <div className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase",textAlign:"right"}}>{product.name}<br/>Emitido em {new Date().toLocaleDateString("pt-BR")}</div>
        </div>
        <div className="detail-grid print-grid">
          {/* LEFT */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:`linear-gradient(160deg,${T.bgWarm},${T.surface})`,border:`1px solid ${T.border}`,borderRadius:4,padding:26,textAlign:"center",position:"relative"}}>
              <div className="no-print" style={{position:"absolute",top:12,right:12,display:"flex",gap:8}}>
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
                <Chip tone={product.flags.gluten?"warn":"good"}>{product.flags.gluten?"Contém Glúten":"Não Contém Glúten"}</Chip>
                {!product.flags.lactose&&<Chip tone="good">Zero Lactose</Chip>}
                {n.addedSugars===0&&<Chip tone="good">Sem Açúcar Adicionado</Chip>}
                {claim&&<Chip tone="good">{claim}</Chip>}
                {n.fiber>=5&&<Chip tone="good">Alto em Fibras</Chip>}
              </div>
              {lupas.length>0&&(
                <div style={{marginTop:14,display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                  {lupas.map(l=>(
                    <div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#1F2317",color:"#fff",border:"2px solid #1F2317",borderRadius:6,padding:"8px 12px",minWidth:96}}>
                      <span className="fm" style={{fontSize:9,letterSpacing:"0.1em",opacity:0.85}}>ALTO EM</span>
                      <span className="fd" style={{fontSize:13,fontWeight:600,textAlign:"center",lineHeight:1.1}}>{l==="GORDURA SATURADA"?"GORDURA SATURADA":l}</span>
                    </div>
                  ))}
                  <div className="fm" style={{fontSize:8,letterSpacing:"0.1em",color:T.inkSoft,alignSelf:"center",maxWidth:120}}>Rotulagem frontal · RDC 429/2020 (por 100 g)</div>
                </div>
              )}
              {n.addedSugars===0&&(
                <p className="fb" style={{fontSize:10,color:T.inkSoft,lineHeight:1.5,marginTop:10,fontStyle:"italic"}}>
                  Contém açúcares próprios dos ingredientes. Este não é um alimento baixo ou reduzido em valor energético.
                </p>
              )}
            </div>
            {/* Calculadora */}
            <div className="no-print" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:4,padding:20}}>
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
            <div className="gn nutri-print" style={{background:T.surface,border:`1px solid ${T.ink}`,borderRadius:4,overflow:"hidden"}}>
              <div style={{background:T.ink,color:T.bg,padding:"13px 20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <h3 className="fd" style={{fontSize:20,fontWeight:500}}>Informação Nutricional</h3>
                  <span className="fm" style={{fontSize:8,letterSpacing:"0.28em",opacity:0.6,textTransform:"uppercase"}}>IN 75/2020</span>
                </div>
                <div className="fm" style={{fontSize:9,letterSpacing:"0.12em",opacity:0.68,textTransform:"uppercase",marginTop:4}}>Porções por embalagem: {product.category==="gelato"?"variável (granel)":"1"} · Porção: {product.portionLabel}</div>
              </div>
              <div style={{padding:"0 20px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 64px 64px 44px",padding:"10px 0",borderBottom:`1px solid ${T.border}`,gap:4}}>
                  {[{h:"Nutriente",a:"left"},{h:"100 g",a:"right"},{h:"Porção",a:"right"},{h:"%VD*",a:"right"}].map(c=><span key={c.h} className="fm" style={{fontSize:9,letterSpacing:"0.12em",color:T.inkSoft,textTransform:"uppercase",textAlign:c.a}}>{c.h}</span>)}
                </div>
                {ROWS.map((row,i)=>(
                  <div key={row.k} style={{display:"grid",gridTemplateColumns:"1fr 64px 64px 44px",gap:4,padding:"11px 0",paddingLeft:row.ind?14:0,borderBottom:i<ROWS.length-1?`1px solid ${T.borderSoft}`:"none",background:row.main?"#EFF5E5":"transparent"}}>
                    <span className="fb" style={{fontSize:row.ind?12:13,color:row.ind?T.inkSoft:T.ink,fontWeight:row.main?600:400}}>{row.l}</span>
                    <span className="fm" style={{textAlign:"right",fontSize:12,color:T.inkSoft}}>{br(row.v100)}{row.u&&` ${row.u}`}</span>
                    <span className="fm" style={{textAlign:"right",fontSize:12,color:row.main?T.pistacheDark:T.ink,fontWeight:row.main?600:400}}>{br(row.v)}{row.u&&` ${row.u}`}</span>
                    <span className="fm" style={{textAlign:"right",fontSize:11,color:T.inkSoft}}>{row.vd!=null?`${row.vd}%`:"—"}</span>
                  </div>
                ))}
              </div>
              <div style={{background:T.bgWarm,padding:"10px 20px",borderTop:`1px solid ${T.border}`}}>
                <p className="fb" style={{fontSize:10.5,color:T.inkSoft,lineHeight:1.5}}>*Percentual de valores diários fornecidos pela porção.</p>
                {product.hasPolyols&&(
                <p className="fb" style={{fontSize:10.5,color:"#6B5010",lineHeight:1.5,marginTop:6,paddingTop:6,borderTop:`1px dashed #D4B840`}}>
                  Contém polióis. <strong>{AVISO_POLIOL}</strong>
                </p>
                )}
                {product.estimated&&(
                  <p className="fb" style={{fontSize:10.5,color:T.inkSoft,lineHeight:1.5,marginTop:6,paddingTop:6,borderTop:`1px dashed ${T.border}`,fontStyle:"italic"}}>
                    Valores nutricionais <strong>estimados</strong> por analogia de formulação — sujeitos a confirmação por análise laboratorial antes do uso em rótulo.
                  </p>
                )}
              </div>
            </div>
            {/* Alérgicos — RDC 26/2015 */}
            <div className="nutri-print" style={{background:"#fff",border:`2px solid #1F2317`,borderRadius:4,padding:"14px 18px"}}>
              <div className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase",marginBottom:6}}>Informação ao alérgico · RDC 26/2015</div>
              <div className="fb" style={{fontSize:13,color:"#1F2317",fontWeight:700,lineHeight:1.5,textTransform:"uppercase"}}>
                {allergens.length>0?`Alérgicos: contém ${allergens.join(", ")}.`:"Alérgicos: não contém alérgenos de declaração obrigatória."}
              </div>
              <div className="fb" style={{fontSize:12,color:"#5A4A08",fontWeight:600,lineHeight:1.5,textTransform:"uppercase",marginTop:4}}>
                Alérgicos: pode conter {PODE_CONTER.join(", ")}.
              </div>
              <div className="fb" style={{fontSize:13,color:"#1F2317",fontWeight:700,marginTop:8,textTransform:"uppercase"}}>
                {product.flags.gluten?"Contém glúten.":"Não contém glúten."}
              </div>
            </div>
            {/* Ingredientes */}
            {(()=>{const ordered=orderIngredients(product.ingredients);return(
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:4,padding:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><Leaf size={14} style={{color:T.pistacheDark}}/><h3 className="fm" style={{fontSize:10,letterSpacing:"0.25em",color:T.ink,textTransform:"uppercase"}}>Ingredientes</h3></div>
              <p className="fb" style={{fontSize:13,color:T.ink,lineHeight:1.6}}>{ordered.map(i=>i.name).join(", ")}.</p>
              {ordered.filter(i=>i.note).map((i,k)=>(
                <p key={k} className="fb" style={{fontSize:10.5,color:T.inkSoft,fontStyle:"italic",lineHeight:1.5,marginTop:8}}>{i.name}: {i.note}.</p>
              ))}
            </div>
            );})()}
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
          <div className="no-print" style={{marginTop:28}}>
            <div className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:14}}>Você também pode gostar</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
              {similar.map(p=>(
                <button key={p.id} onClick={()=>onSelectProduct(p.id)} className="hl" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:4,padding:14,display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
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
const ContratoPage = lazy(() => import("./ContratoPage.jsx"));
const PrivacidadePage = lazy(() => import("./PrivacidadePage.jsx"));

/* ========== SEM CULPA-ÔMETRO ========== */
// Referência: sorvete de massa tradicional (média de mercado), por 100 g.
const SORVETE_REF = { kcal:207, sugars:21, protein:3.5 };
function Linha({rotulo, bento, comum, unidade}){
  const max=Math.max(bento,comum,0.001);
  const pb=Math.round(bento/max*100), pc=Math.round(comum/max*100);
  const row=(nome,val,w,cor,strong)=>(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
      <span style={{width:58,fontSize:11,color:strong?T.pistacheDark:T.inkSoft,fontWeight:strong?700:500}}>{nome}</span>
      <div style={{flex:1,background:"#EDE4CF",borderRadius:6,height:18,overflow:"hidden"}}>
        <div style={{width:w+"%",height:"100%",background:cor,transition:"width .6s cubic-bezier(.2,.8,.2,1)"}}/>
      </div>
      <span style={{width:70,textAlign:"right",fontSize:12,fontWeight:strong?700:500,color:strong?T.ink:T.inkSoft}}>{val.toFixed(1)}{unidade}</span>
    </div>
  );
  return(
    <div style={{marginBottom:16}}>
      <div className="fm" style={{fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:T.inkSoft,marginBottom:7}}>{rotulo}</div>
      {row("Bentô",bento,pb,"linear-gradient(90deg,#8FA050,#5C6B3A)",true)}
      {row("Comum",comum,pc,"#C9A98F",false)}
    </div>
  );
}
function CulpaModal({onClose,onDelivery}){
  useModal(onClose);
  const gelatos = PRODUCTS.filter(p=>p.category==="gelato");
  const per100 = (k)=> gelatos.reduce((s,p)=>s+p.nutrition[k]*100/p.serving,0)/gelatos.length;
  const bSug=per100("sugars"), bProt=per100("protein"), bKcal=per100("kcal");
  const cubos = Math.max(0, Math.round((SORVETE_REF.sugars - bSug)/4)); // 1 torrão ≈ 4 g
  const protMais = Math.max(0, bProt - SORVETE_REF.protein);

  function gerarImagem(){
    return new Promise((resolve)=>{
      const c=document.createElement("canvas"); c.width=1080; c.height=1350; const x=c.getContext("2d");
      const g=x.createLinearGradient(0,0,0,1350); g.addColorStop(0,"#222B1A"); g.addColorStop(1,"#0E120B"); x.fillStyle=g; x.fillRect(0,0,1080,1350);
      x.textAlign="center";
      x.fillStyle="#B8C97A"; x.font="700 52px Georgia, serif"; x.fillText("BENTÔ", 540, 150);
      x.fillStyle="#9FB089"; x.font="600 26px Helvetica"; x.fillText("S E M   C U L P A - Ô M E T R O", 540, 200);
      x.fillStyle="#fff"; x.font="800 230px Helvetica"; x.fillText("−"+cubos, 540, 560);
      x.fillStyle="#E9EFDC"; x.font="600 38px Helvetica"; x.fillText("torrões de açúcar a cada 100 g", 540, 625);
      x.fillStyle="#E3C46A"; x.font="800 180px Helvetica"; x.fillText("+"+protMais.toFixed(0)+"g", 540, 900);
      x.fillStyle="#E9EFDC"; x.font="600 38px Helvetica"; x.fillText("de proteína vs sorvete comum", 540, 965);
      x.fillStyle="#B8C97A"; x.font="italic 700 44px Georgia, serif"; x.fillText("Gelato com propósito", 540, 1190);
      x.fillStyle="#9FB089"; x.font="500 30px Helvetica"; x.fillText("bentogelateria.com", 540, 1245);
      c.toBlob(b=>resolve(b),"image/png");
    });
  }
  const msg = `Gelato da Bentô tem ~${cubos} torrões de açúcar a MENOS e +${protMais.toFixed(0)}g de proteína a cada 100 g vs sorvete comum. 🍦`;
  const url = "https://bentogelateria.com";
  async function compartilhar(){
    tk("Compartilhar · Sem culpa-ômetro");
    try{
      const blob = await gerarImagem();
      const file = blob && new File([blob],"bento-sem-culpa.png",{type:"image/png"});
      if(file && navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file],text:msg+" "+url}); return; }
    }catch{}
    try{ if(navigator.share){ await navigator.share({title:"Bentô — sem culpa",text:msg,url}); return; } }catch{}
    try{ await navigator.clipboard.writeText(msg+" "+url); alert("Texto copiado! Cole no seu story ou conversa. 🍦"); }catch{ alert(msg+" "+url); }
  }
  async function baixar(){
    tk("Baixar imagem · Sem culpa-ômetro");
    const blob = await gerarImagem(); if(!blob) return;
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="bento-sem-culpa.png"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }

  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Sem culpa-ômetro" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:8,maxWidth:460,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:"linear-gradient(135deg,#222B1A,#3A472A)",padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:"#B8C97A",textTransform:"uppercase"}}>Inteligência nutricional</div>
            <div className="fd" style={{fontSize:20,color:"#fff",marginTop:2}}>Sem culpa-ômetro 🍦</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.14)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0}}><X size={16}/></button>
        </div>
        <div style={{padding:22}}>
          <div className="fb" style={{fontSize:13,color:T.inkSoft,marginBottom:16,lineHeight:1.5}}>O que você ganha trocando o sorvete comum pelo gelato funcional da Bentô — média da nossa linha, por 100 g:</div>

          <div style={{display:"flex",gap:10,marginBottom:18}}>
            <div style={{flex:1,background:"#EFF5E5",border:"1px solid #CBD9A6",borderRadius:12,padding:"14px 10px",textAlign:"center"}}>
              <div className="fd" style={{fontSize:30,color:T.pistacheDark,lineHeight:1}}>−{cubos}</div>
              <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:4,lineHeight:1.25}}>torrões de açúcar 🧊</div>
            </div>
            <div style={{flex:1,background:"#EAF0F8",border:"1px solid #BFD2EC",borderRadius:12,padding:"14px 10px",textAlign:"center"}}>
              <div className="fd" style={{fontSize:30,color:"#1A4FAA",lineHeight:1}}>+{protMais.toFixed(0)}g</div>
              <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:4,lineHeight:1.25}}>de proteína 💪</div>
            </div>
            <div style={{flex:1,background:"#F6EEDD",border:"1px solid #E0CBA0",borderRadius:12,padding:"14px 10px",textAlign:"center"}}>
              <div className="fd" style={{fontSize:30,color:"#A9831C",lineHeight:1}}>0g</div>
              <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:4,lineHeight:1.25}}>açúcar adicionado 🚫</div>
            </div>
          </div>

          <Linha rotulo="Açúcares (g / 100 g)" bento={bSug} comum={SORVETE_REF.sugars} unidade="g"/>
          <Linha rotulo="Proteína (g / 100 g)" bento={bProt} comum={SORVETE_REF.protein} unidade="g"/>
          <Linha rotulo="Calorias (kcal / 100 g)" bento={bKcal} comum={SORVETE_REF.kcal} unidade=""/>

          <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
            <button onClick={compartilhar} className="fb" style={{flex:1,minWidth:150,background:T.pistacheDark,color:"#fff",border:"none",borderRadius:8,padding:"13px 14px",fontSize:13.5,fontWeight:700,cursor:"pointer"}}>📲 Compartilhar no story</button>
            <button onClick={baixar} className="fb" style={{background:"transparent",color:T.pistacheDark,border:`1px solid ${T.border}`,borderRadius:8,padding:"13px 14px",fontSize:13,cursor:"pointer"}}>⬇️ Baixar imagem</button>
          </div>
          <button onClick={onDelivery} className="fb" style={{width:"100%",marginTop:10,background:"#EA1D2C",color:"#fff",border:"none",borderRadius:8,padding:"13px 14px",fontSize:13.5,fontWeight:700,cursor:"pointer"}}>🗺️ Provar sem culpa — pedir no iFood</button>

          <div className="fb" style={{fontSize:10.5,color:T.inkSoft,textAlign:"center",marginTop:14,lineHeight:1.5}}>Comparativo ilustrativo. “Comum” = sorvete de massa tradicional (média de mercado, ~21 g de açúcar/100 g). Valores Bentô calculados da nossa linha de gelatos.</div>
        </div>
      </div>
    </div>
  );
}

/* ========== ALIADO DA CANETA (análogos de GLP-1) ========== */
function GLP1Modal({onClose,onSelectProduct,onTabelas,onDelivery}){
  useModal(onClose);
  const top = PRODUCTS.filter(p=>p.category==="gelato").slice().sort((a,b)=>b.nutrition.protein-a.nutrition.protein).slice(0,6);
  const maxP = top.length?top[0].nutrition.protein:1;
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Aliado de quem usa GLP-1" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:8,maxWidth:480,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:"linear-gradient(135deg,#2A2238,#3E2F58)",padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:"#D9C7F2",textTransform:"uppercase"}}>Tabelas em foco</div>
            <div className="fd" style={{fontSize:20,color:"#fff",marginTop:2}}>Aliado de quem usa a caneta 💉</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.14)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0}}><X size={16}/></button>
        </div>
        <div style={{padding:22}}>
          <div className="fb" style={{fontSize:13.5,color:T.ink,marginBottom:8,lineHeight:1.55}}>Análogos de <strong>GLP-1</strong> (como semaglutida e tirzepatida) reduzem o apetite. Comendo menos, fica difícil bater a <strong>proteína do dia</strong> — e é ela que protege a sua <strong>massa magra</strong>.</div>
          <div className="fb" style={{fontSize:13.5,color:T.ink,marginBottom:16,lineHeight:1.55}}>O Bentô resolve isso: <strong>muita proteína numa porção pequena</strong>, fácil de comer mesmo sem fome, com <strong>zero açúcar adicionado</strong>.</div>

          <div style={{display:"flex",gap:10,marginBottom:18}}>
            <div style={{flex:1,background:"#EAF0F8",border:"1px solid #BFD2EC",borderRadius:12,padding:"14px 8px",textAlign:"center"}}>
              <div className="fd" style={{fontSize:26,color:"#1A4FAA",lineHeight:1}}>até {maxP}g</div>
              <div className="fb" style={{fontSize:10,color:T.inkSoft,marginTop:4,lineHeight:1.25}}>proteína / bola</div>
            </div>
            <div style={{flex:1,background:"#EFF5E5",border:"1px solid #CBD9A6",borderRadius:12,padding:"14px 8px",textAlign:"center"}}>
              <div className="fd" style={{fontSize:26,color:T.pistacheDark,lineHeight:1}}>0</div>
              <div className="fb" style={{fontSize:10,color:T.inkSoft,marginTop:4,lineHeight:1.25}}>açúcar adicionado</div>
            </div>
            <div style={{flex:1,background:"#F4EEF8",border:"1px solid #D9C7F2",borderRadius:12,padding:"14px 8px",textAlign:"center"}}>
              <div className="fd" style={{fontSize:26,color:"#6A3DA8",lineHeight:1}}>60g</div>
              <div className="fb" style={{fontSize:10,color:T.inkSoft,marginTop:4,lineHeight:1.25}}>porção fácil de comer</div>
            </div>
          </div>

          <div className="fm" style={{fontSize:11,letterSpacing:".12em",textTransform:"uppercase",color:T.inkSoft,marginBottom:8}}>Ranking de proteína</div>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:18}}>
            {top.map(p=>(
              <button key={p.id} onClick={()=>onSelectProduct(p.id)} className="hl" style={{display:"flex",alignItems:"center",gap:10,textAlign:"left",background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px",cursor:"pointer"}}>
                <span style={{fontSize:22,flexShrink:0}}>{p.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="fd" style={{fontSize:14,color:T.ink,lineHeight:1.1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                  <div style={{background:"#E6EAD8",borderRadius:5,height:7,overflow:"hidden",marginTop:5}}><div style={{width:Math.round(p.nutrition.protein/maxP*100)+"%",height:"100%",background:"linear-gradient(90deg,#8FA050,#5C6B3A)"}}/></div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div className="fd" style={{fontSize:16,color:"#1A4FAA",lineHeight:1}}>{p.nutrition.protein}g</div>
                  <div className="fb" style={{fontSize:9,color:T.inkSoft}}>{p.portionLabel}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={onTabelas} className="fb" style={{flex:1,minWidth:150,background:T.pistacheDark,color:"#fff",border:"none",borderRadius:8,padding:"13px 14px",fontSize:13.5,fontWeight:700,cursor:"pointer"}}>📋 Ver todas as tabelas</button>
            <button onClick={onDelivery} className="fb" style={{flex:1,minWidth:150,background:"#EA1D2C",color:"#fff",border:"none",borderRadius:8,padding:"13px 14px",fontSize:13.5,fontWeight:700,cursor:"pointer"}}>🗺️ Pedir no iFood</button>
          </div>

          <div style={{background:"#FBF4E6",border:"1px solid #E8D9B5",borderRadius:10,padding:"12px 14px",marginTop:14}}>
            <div className="fb" style={{fontSize:11,color:"#7A5E1C",lineHeight:1.5}}>⚠️ Conteúdo informativo sobre nutrição — <strong>não é conselho médico</strong> e não substitui o acompanhamento do seu médico ou nutricionista. O uso de medicamentos deve ser sempre orientado por um profissional de saúde.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  const[contrato]=useState(()=>{ // link interno ?contrato=<base64> vindo do orçamento de eventos
    try{
      const p=new URLSearchParams(window.location.search).get("contrato");
      return p?JSON.parse(decodeURIComponent(escape(atob(p.replace(/-/g,"+").replace(/_/g,"/"))))):null;
    }catch{return null;}
  });
  const[privacidade]=useState(()=>{try{return new URLSearchParams(window.location.search).has("privacidade");}catch{return false;}});
  const[view,setView]=useState(()=>{try{const p=new URLSearchParams(window.location.search);return(p.has("tabela")||p.has("tabelas"))?"tabelas":"home";}catch{return "home";}});
  const[category,setCat]=useState(null);
  const[productId,setProd]=useState(null);
  const[showQuiz,setShowQuiz]=useState(false);
  const[showCmp,setShowCmp]=useState(false);
  const[showPote,setShowPote]=useState(false);
  const[showPitch,setShowPitch]=useState(false);
  const[showCardapio,setShowCardapio]=useState(false);
  const[showRevenda,setShowRevenda]=useState(false);
  const[showParceria,setShowParceria]=useState(false);
  const[showDelivery,setShowDelivery]=useState(false);
  const[showFaq,setShowFaq]=useState(false);
  const[showCulpa,setShowCulpa]=useState(false);
  const[showGLP1,setShowGLP1]=useState(false);
  const[showEventos,setShowEventos]=useState(false);
  const[compareIds,setCmpIds]=useState([]);
  const[favorites,setFavs]=useState(()=>{try{return JSON.parse(localStorage.getItem("bento:favs")||"[]");}catch{return[];}});
  useEffect(()=>{try{localStorage.setItem("bento:favs",JSON.stringify(favorites));}catch{}},[favorites]);
  useEffect(()=>{window.scrollTo(0,0);},[view,productId]);
  const goHome=useCallback(()=>{setView("home");setCat(null);setProd(null);},[]);
  const openCat=useCallback((c)=>{setCat(c);setView("list");},[]);
  const openProd=useCallback((id)=>{const p=PRODUCTS.find(x=>x.id===id);if(p){setCat(p.category);tk("Sabor · "+p.name);}setProd(id);setView("detail");},[]);
  const backList=useCallback(()=>{setView(category?"list":"home");setProd(null);},[category]);
  const toggleCmp=useCallback((id)=>setCmpIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<3?[...prev,id]:prev),[]);
  const toggleFav=useCallback((id)=>setFavs(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]),[]);
  if(contrato) return(<><GStyle/><Suspense fallback={null}><ContratoPage data={contrato}/></Suspense></>);
  if(privacidade) return(<><GStyle/><Suspense fallback={null}><PrivacidadePage/></Suspense></>);
  return(
    <div className="shell fb gn" style={{background:T.bg,color:T.ink}}>
      <GStyle/>
      <Header onHome={goHome} compareCount={compareIds.length} onOpenCompare={()=>setShowCmp(true)} onQuiz={()=>setShowQuiz(true)} favorites={favorites}/>
      {view==="home"&&<Home onTabelas={()=>setView("tabelas")} onPitch={()=>setShowPitch(true)} onCardapio={()=>setShowCardapio(true)} onParceria={()=>setShowParceria(true)} onDelivery={()=>setShowDelivery(true)} onFaq={()=>setShowFaq(true)} onEventos={()=>setShowEventos(true)}/>}
      {view==="tabelas"&&<TabelasHub onSelect={openCat} onSelectProduct={openProd} onPote={()=>tk("Conversão · Monte seu pote",()=>setShowPote(true))} onQuiz={()=>setShowQuiz(true)} onBack={goHome} onCulpa={()=>setShowCulpa(true)} onGLP1={()=>setShowGLP1(true)}/>}
      {view==="list"&&<ProductList category={category} onBack={()=>setView("tabelas")} onSelectProduct={openProd} compareIds={compareIds} onToggleCompare={toggleCmp} onOpenCompare={()=>setShowCmp(true)}/>}
      {view==="detail"&&<ProductDetail productId={productId} onBack={backList} onSelectProduct={openProd} favorites={favorites} onToggleFav={()=>toggleFav(productId)} compareIds={compareIds} onToggleCompare={()=>toggleCmp(productId)}/>}
      {showQuiz&&<QuizModal onClose={()=>setShowQuiz(false)} onResult={(id)=>{tk("Conversão · Quiz concluído");setShowQuiz(false);openProd(id);}}/>}
      {showCmp&&<CompareModal ids={compareIds} onClose={()=>setShowCmp(false)} onViewProduct={openProd}/>}
      {showPote&&<PoteBuilder onClose={()=>setShowPote(false)}/>}
      {showPitch&&<PitchDeck onClose={()=>setShowPitch(false)} onCatalog={()=>{setShowPitch(false);openCat("gelato");}}/>}
      {showCardapio&&<CardapioDigital onClose={()=>setShowCardapio(false)}/>}
      {showParceria&&<SejaParceiro onClose={()=>setShowParceria(false)} onForm={()=>setShowRevenda(true)}/>}
      {showRevenda&&<SejaBento onClose={()=>setShowRevenda(false)}/>}
      {showDelivery&&<DeliveryModal onClose={()=>setShowDelivery(false)}/>}
      {showFaq&&<FaqModal onClose={()=>setShowFaq(false)}/>}
      {showCulpa&&<CulpaModal onClose={()=>setShowCulpa(false)} onDelivery={()=>{setShowCulpa(false);setShowDelivery(true);}}/>}
      {showGLP1&&<GLP1Modal onClose={()=>setShowGLP1(false)} onSelectProduct={(id)=>{setShowGLP1(false);openProd(id);}} onTabelas={()=>{setShowGLP1(false);setView("tabelas");}} onDelivery={()=>{setShowGLP1(false);setShowDelivery(true);}}/>}
      {showEventos&&<EventosModal onClose={()=>setShowEventos(false)}/>}
      <footer className="no-print" style={{maxWidth:1152,margin:"0 auto",padding:"24px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",borderTop:`1px solid ${T.border}`}}>
        <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>Bentô · Functional Nutrition · ES · BR</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>tk("Rodapé · Delivery",()=>setShowDelivery(true))} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:"#fff",textTransform:"uppercase",border:"none",cursor:"pointer",background:"#EA1D2C",borderRadius:2,padding:"7px 12px"}}>🛵 Delivery</button>
          <button onClick={()=>tk("Rodapé · Cardápio",()=>setShowCardapio(true))} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.surface,textTransform:"uppercase",border:"none",cursor:"pointer",background:T.ink,borderRadius:2,padding:"7px 12px"}}>📋 Cardápio</button>
          <button onClick={()=>tk("Rodapé · Seja Bentô",()=>setShowParceria(true))} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:"#fff",textTransform:"uppercase",border:"none",cursor:"pointer",background:"#1FA855",borderRadius:2,padding:"7px 12px"}}>🤝 Seja Bentô</button>
          <button onClick={()=>tk("Rodapé · Conheça a Bentô",()=>setShowPitch(true))} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.surface,textTransform:"uppercase",border:"none",cursor:"pointer",background:T.pistacheDark,borderRadius:2,padding:"7px 12px"}}>✦ Conheça a Bentô</button>
          <a href="/tabela-nutricional.csv" download onClick={()=>tk("Download CSV")} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.pistacheDark,textTransform:"uppercase",textDecoration:"none",border:`1px solid ${T.border}`,borderRadius:2,padding:"7px 12px"}}>↓ Tabela nutricional (CSV)</a>
          <a href="/?privacidade=1" className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase",textDecoration:"none",border:`1px solid ${T.border}`,borderRadius:2,padding:"7px 12px"}}>Privacidade</a>
        </div>
        <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>v4.1 · Clean Label</div>
      </footer>
      <Analytics/>
    </div>
  );
}
