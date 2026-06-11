import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ArrowLeft, ChevronRight, Search, Leaf, Beaker, Filter, Heart, Scale, X, Sparkles, Target, Printer } from "lucide-react";
import { PRODUCTS, AVISO_POLIOL, MOOD_META, QUIZ, ALLERGENS, PODE_CONTER, lupaFrontal, proteinClaim } from "./data.js";

const T = {
  bg:"#F1ECDD",bgWarm:"#EAE3CE",surface:"#FBF8EE",
  ink:"#1F2317",inkSoft:"#5A5E4E",
  pistache:"#8B9D5A",pistacheDark:"#5C6B3A",
  border:"#D9D2BD",borderSoft:"#E5DFCB",accent:"#C4A882",
};

// Apresentação institucional da marca (pitch deck no Gamma)
const DECK_URL = "/Bento-Functional-Nutrition.pdf";


function BentoLogo({size=120}){
  return <img src="/bento-logo.png" alt="Bentô Functional Nutrition" width={size} height={size} style={{display:"block",borderRadius:"50%"}}/>;
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
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[onClose]);
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
                ? <div style={{width:62,height:62,borderRadius:8,overflow:"hidden",flexShrink:0,border:"1px solid rgba(201,168,106,0.25)"}}><img src={it.img} alt={it.name} width={62} height={62} loading="lazy" style={{objectFit:"cover",display:"block"}}/></div>
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

/* ========== SEJA BENTÔ (REVENDA / FRANQUIA) ========== */
const WHATS_REVENDA="5527999159995"; // DDI+DDD+número, só dígitos
function SejaBento({onClose}){
  const[form,setForm]=useState({interesse:"Revendedor",nome:"",zap:"",cidade:"",ponto:"",msg:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const ok=form.nome.trim()&&form.zap.replace(/\D/g,"").length>=10&&form.cidade.trim();
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
    window.open(`https://wa.me/${WHATS_REVENDA}?text=${encodeURIComponent(linhas.join("\n"))}`,"_blank");
  };
  const inp={width:"100%",padding:"11px 12px",borderRadius:4,border:`1px solid ${T.border}`,background:T.bg,color:T.ink,fontSize:14,outline:"none",boxSizing:"border-box"};
  const lab={fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:T.inkSoft,display:"block",marginBottom:5,marginTop:14};
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Seja um revendedor ou franqueado" style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
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
          <span className="fm" style={lab}>Tenho interesse em ser</span>
          <div style={{display:"flex",gap:8}}>
            {["Revendedor","Franqueado"].map(o=>(
              <button key={o} onClick={()=>set("interesse",o)} className="fb" style={{flex:1,padding:"11px",borderRadius:4,border:`1px solid ${form.interesse===o?T.pistacheDark:T.border}`,background:form.interesse===o?T.pistacheDark:"transparent",color:form.interesse===o?T.surface:T.ink,fontSize:13,fontWeight:500}}>{o}</button>
            ))}
          </div>
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
          <button onClick={enviar} disabled={!ok} className="fb" style={{width:"100%",marginTop:18,padding:"14px",borderRadius:4,border:"none",background:ok?"#25D366":T.border,color:ok?"#fff":T.inkSoft,fontSize:15,fontWeight:600,cursor:ok?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
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
  useEffect(()=>{
    const h=e=>{if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();go(1);}else if(e.key==="ArrowLeft")go(-1);else if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[go,onClose]);
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

/* ========== HOME ========== */
function Home({onSelect,onSelectProduct,onQuiz,onPote,onPitch,onCardapio,onRevenda}){
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
          <button onClick={onPote} className="fb" style={{background:"transparent",color:T.ink,border:`1px solid ${T.border}`,borderRadius:4,padding:"13px 22px",fontSize:14,display:"flex",alignItems:"center",gap:6}}>
            🍦 Monte seu pote
          </button>
          <button onClick={onCardapio} className="fb" style={{background:"transparent",color:T.ink,border:`1px solid ${T.border}`,borderRadius:4,padding:"13px 22px",fontSize:14,display:"flex",alignItems:"center",gap:6}}>
            📋 Cardápio
          </button>
          <button onClick={onPitch} className="fb" style={{background:T.ink,color:T.bg,border:"none",borderRadius:4,padding:"13px 22px",fontSize:14,fontWeight:500,display:"flex",alignItems:"center",gap:8}}>
            <Sparkles size={15}/>Conheça a Bentô
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
        <button onClick={onPote} className="hl" style={{background:T.ink,border:"none",borderRadius:4,padding:22,display:"flex",flexDirection:"column",justifyContent:"center",textAlign:"left"}}>
          <span style={{fontSize:34,marginBottom:12}}>🍦</span>
          <div className="fd" style={{fontSize:24,color:T.bg,lineHeight:1.2}}>Monte seu<br/>pote</div>
          <div className="fb" style={{fontSize:12,color:`${T.bg}99`,marginTop:8}}>2 sabores · P 120g ou M 170g · calorias e proteína</div>
        </button>
      </section>

      <section style={{maxWidth:1152,margin:"0 auto",padding:"0 24px 20px"}}>
        <div className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:14}}>⚡ Mais ricos em proteína</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
          {topProt.map(p=>(
            <button key={p.id} className="hl" style={{textAlign:"left",background:T.surface,border:`1px solid ${T.border}`,borderRadius:4,padding:14,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>onSelectProduct(p.id)}>
              <ProductArt product={p} size={72}/>
              <div>
                <div className="fd" style={{fontSize:16,color:T.ink}}>{p.name}</div>
                <div className="fm" style={{fontSize:18,color:T.pistacheDark,fontWeight:500,marginTop:4}}>{p.nutrition.protein}g</div>
                <div className="fm" style={{fontSize:9,color:T.inkSoft,letterSpacing:"0.18em",textTransform:"uppercase"}}>proteína · {p.nutrition.kcal} kcal</div>
                <div style={{marginTop:6,display:"flex",gap:4}}>{p.moods.slice(0,1).map(m=><MoodChip key={m} mood={m} small/>)}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section style={{maxWidth:1152,margin:"0 auto",padding:"0 24px 40px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
        {[{icon:"🧬",title:"Whey WPH",desc:"Proteína hidrolisada de alta biodisponibilidade"},{icon:"🌿",title:"Base FRUTA 300 ZERO",desc:"Zero açúcar · adoçada com polióis e fibras"},{icon:"0️⃣",title:"Sem açúcar adicionado",desc:"Sem sacarose adicionada à formulação"},{icon:"🧪",title:"Formulação técnica",desc:"Balanço PAC/POD calibrado para textura perfeita"}].map(b=>(
          <div key={b.title} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:4,padding:16}}>
            <div style={{fontSize:24,marginBottom:8}}>{b.icon}</div>
            <div className="fd" style={{fontSize:15,color:T.ink,marginBottom:4}}>{b.title}</div>
            <div className="fb" style={{fontSize:12,color:T.inkSoft,lineHeight:1.4}}>{b.desc}</div>
          </div>
        ))}
      </section>

      <section style={{maxWidth:1152,margin:"0 auto",padding:"0 24px 48px"}}>
        <div style={{background:T.ink,borderRadius:6,padding:"32px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:18,flexWrap:"wrap"}}>
          <div style={{minWidth:240,flex:1}}>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.pistache,textTransform:"uppercase",marginBottom:8}}>Expansão · Revenda &amp; Franquia</div>
            <div className="fd" style={{fontSize:"clamp(22px,3.4vw,32px)",color:T.bg,lineHeight:1.15}}>Leve a Bentô para a sua cidade</div>
            <div className="fb" style={{fontSize:13,color:`${T.bg}AA`,marginTop:8,maxWidth:480,lineHeight:1.5}}>Quer revender nossos gelatos e picolés proteicos ou abrir a sua unidade? Fale direto com a gente pelo WhatsApp.</div>
          </div>
          <button onClick={onRevenda} className="fb" style={{background:"#25D366",color:"#fff",border:"none",borderRadius:4,padding:"15px 26px",fontSize:15,fontWeight:600,display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
            🤝 Quero ser Bentô
          </button>
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
              {product.hasPolyols&&(
              <div style={{marginTop:16,display:"flex",alignItems:"flex-start",gap:10,background:"#FDF8EC",border:"1px solid #D4B840",borderRadius:3,padding:"12px 14px",textAlign:"left"}}>
                <span style={{fontSize:18,flexShrink:0,marginTop:1}} aria-hidden="true">⚠️</span>
                <div>
                  <div className="fm" style={{fontSize:9,letterSpacing:"0.22em",textTransform:"uppercase",color:"#7A6210",marginBottom:4}}>Advertência · Polióis</div>
                  <div className="fb" style={{fontSize:12.5,color:"#5A4A08",lineHeight:1.55}}>
                    Contém <strong>polióis</strong> (maltitol e sorbitol), provenientes da {product.ingredients[0].name}. <strong>{AVISO_POLIOL}</strong>
                  </div>
                </div>
              </div>
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
export default function App(){
  const[view,setView]=useState("home");
  const[category,setCat]=useState(null);
  const[productId,setProd]=useState(null);
  const[showQuiz,setShowQuiz]=useState(false);
  const[showCmp,setShowCmp]=useState(false);
  const[showPote,setShowPote]=useState(false);
  const[showPitch,setShowPitch]=useState(false);
  const[showCardapio,setShowCardapio]=useState(false);
  const[showRevenda,setShowRevenda]=useState(false);
  const[compareIds,setCmpIds]=useState([]);
  const[favorites,setFavs]=useState(()=>{try{return JSON.parse(localStorage.getItem("bento:favs")||"[]");}catch{return[];}});
  useEffect(()=>{try{localStorage.setItem("bento:favs",JSON.stringify(favorites));}catch{}},[favorites]);
  useEffect(()=>{window.scrollTo(0,0);},[view,productId]);
  const goHome=useCallback(()=>{setView("home");setCat(null);setProd(null);},[]);
  const openCat=useCallback((c)=>{setCat(c);setView("list");},[]);
  const openProd=useCallback((id)=>{const p=PRODUCTS.find(x=>x.id===id);if(p)setCat(p.category);setProd(id);setView("detail");},[]);
  const backList=useCallback(()=>{setView(category?"list":"home");setProd(null);},[category]);
  const toggleCmp=useCallback((id)=>setCmpIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<3?[...prev,id]:prev),[]);
  const toggleFav=useCallback((id)=>setFavs(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]),[]);
  return(
    <div className="shell fb gn" style={{background:T.bg,color:T.ink}}>
      <GStyle/>
      <Header onHome={goHome} compareCount={compareIds.length} onOpenCompare={()=>setShowCmp(true)} onQuiz={()=>setShowQuiz(true)} favorites={favorites}/>
      {view==="home"&&<Home onSelect={openCat} onSelectProduct={openProd} onQuiz={()=>setShowQuiz(true)} onPote={()=>setShowPote(true)} onPitch={()=>setShowPitch(true)} onCardapio={()=>setShowCardapio(true)} onRevenda={()=>setShowRevenda(true)}/>}
      {view==="list"&&<ProductList category={category} onBack={goHome} onSelectProduct={openProd} compareIds={compareIds} onToggleCompare={toggleCmp} onOpenCompare={()=>setShowCmp(true)}/>}
      {view==="detail"&&<ProductDetail productId={productId} onBack={backList} onSelectProduct={openProd} favorites={favorites} onToggleFav={()=>toggleFav(productId)} compareIds={compareIds} onToggleCompare={()=>toggleCmp(productId)}/>}
      {showQuiz&&<QuizModal onClose={()=>setShowQuiz(false)} onResult={(id)=>{setShowQuiz(false);openProd(id);}}/>}
      {showCmp&&<CompareModal ids={compareIds} onClose={()=>setShowCmp(false)} onViewProduct={openProd}/>}
      {showPote&&<PoteBuilder onClose={()=>setShowPote(false)}/>}
      {showPitch&&<PitchDeck onClose={()=>setShowPitch(false)} onCatalog={()=>{setShowPitch(false);openCat("gelato");}}/>}
      {showCardapio&&<CardapioDigital onClose={()=>setShowCardapio(false)}/>}
      {showRevenda&&<SejaBento onClose={()=>setShowRevenda(false)}/>}
      <footer className="no-print" style={{maxWidth:1152,margin:"0 auto",padding:"24px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",borderTop:`1px solid ${T.border}`}}>
        <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>Bentô · Functional Nutrition · ES · BR</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setShowCardapio(true)} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.surface,textTransform:"uppercase",border:"none",cursor:"pointer",background:T.ink,borderRadius:2,padding:"7px 12px"}}>📋 Cardápio</button>
          <button onClick={()=>setShowRevenda(true)} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:"#fff",textTransform:"uppercase",border:"none",cursor:"pointer",background:"#1FA855",borderRadius:2,padding:"7px 12px"}}>🤝 Seja Bentô</button>
          <button onClick={()=>setShowPitch(true)} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.surface,textTransform:"uppercase",border:"none",cursor:"pointer",background:T.pistacheDark,borderRadius:2,padding:"7px 12px"}}>✦ Conheça a Bentô</button>
          <a href="/tabela-nutricional.csv" download className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.pistacheDark,textTransform:"uppercase",textDecoration:"none",border:`1px solid ${T.border}`,borderRadius:2,padding:"7px 12px"}}>↓ Tabela nutricional (CSV)</a>
        </div>
        <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>v4.1 · Clean Label</div>
      </footer>
    </div>
  );
}
