import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { ArrowLeft, ChevronRight, Search, Leaf, Beaker, Filter, Heart, Scale, X, Sparkles, Target, Printer } from "lucide-react";
import { PRODUCTS, SHAKES, AVISO_POLIOL, MOOD_META, QUIZ, ALLERGENS, PODE_CONTER, lupaFrontal, proteinClaim } from "./data.js";
import { Analytics } from "@vercel/analytics/react";
import { track } from "@vercel/analytics";
import { tk, T, DECK_URL, BentoLogo, GelatoSVG, PicoleSVG, ProductArt, MoodChip, Chip, MacroBar, useModal, onImgErr, IMG_FB, VD, br, orderIngredients } from "./shared.jsx";

/* ===== Modais e overlays: carregados sob demanda (code-split) ===== */
const QuizModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.QuizModal })));
const CompareModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.CompareModal })));
const CardapioDigital = lazy(() => import("./modals.jsx").then(m => ({ default: m.CardapioDigital })));
const SejaParceiro = lazy(() => import("./modals.jsx").then(m => ({ default: m.SejaParceiro })));
const EventosModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.EventosModal })));
const FaqModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.FaqModal })));
const DeliveryModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.DeliveryModal })));
const SejaBento = lazy(() => import("./modals.jsx").then(m => ({ default: m.SejaBento })));
const PoteBuilder = lazy(() => import("./modals.jsx").then(m => ({ default: m.PoteBuilder })));
const PitchDeck = lazy(() => import("./modals.jsx").then(m => ({ default: m.PitchDeck })));
const CulpaModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.CulpaModal })));
const GLP1Modal = lazy(() => import("./modals.jsx").then(m => ({ default: m.GLP1Modal })));

function GStyle(){return(<style>{`
.fd{font-family:'Fraunces',Georgia,serif}
.fb{font-family:'DM Sans',system-ui,sans-serif}
.fm{font-family:'JetBrains Mono',ui-monospace,monospace}
.fade{animation:fade .35s ease both}
.rise{animation:rise .45s cubic-bezier(.2,.8,.2,1) both}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.hl{transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s,border-color .2s}
.hl:hover{transform:translateY(-3px);border-color:${T.accent};box-shadow:0 18px 44px -20px rgba(70,88,58,.30)}
.hd{background-image:linear-gradient(90deg,${T.border} 50%,transparent 0);background-size:6px 1px;background-repeat:repeat-x;height:1px}
.gn{position:relative}
.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none}
/* superfície premium lisa (textura 'lab' removida no refresh visual) */
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
            <button onClick={onOpenCompare} className="fb" aria-label={`Comparar ${compareCount} sabores`} style={{background:T.bgWarm,color:T.ink,border:`1px solid ${T.border}`,borderRadius:999,padding:"9px 15px",fontSize:12,display:"flex",alignItems:"center",gap:6,position:"relative"}}>
              <Scale size={13}/><span className="fm" style={{fontSize:9,letterSpacing:"0.14em"}}>Comparar</span>
              <span style={{position:"absolute",top:-6,right:-6,background:T.pistacheDark,color:T.surface,borderRadius:"50%",width:18,height:18,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>{compareCount}</span>
            </button>
          )}
          <button onClick={onQuiz} className="fb" style={{background:T.pistacheDark,color:T.surface,border:"none",borderRadius:999,padding:"10px 17px",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:6}}>
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
      <button onClick={()=>tk(t.title,t.onClick)} className="hl rise" style={{position:"relative",overflow:"hidden",width:"100%",border:`1px solid ${t.bd||"#0d0a16"}`,borderRadius:16,padding:0,minHeight:122,cursor:"pointer",animationDelay:`${delay}ms`}}>
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
    <button onClick={()=>tk(t.title,t.onClick)} className="hl rise" style={{background:t.bg,border:`1px solid ${t.bd}`,borderRadius:16,padding:"18px 14px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:7,minHeight:122,cursor:"pointer",animationDelay:`${delay}ms`}}>
      {t.art||<span style={{fontSize:30,lineHeight:1}}>{t.emoji}</span>}
      <div className="fd" style={{fontSize:16,lineHeight:1.1,color:t.fg}}>{t.title}</div>
      <div className="fb" style={{fontSize:11,lineHeight:1.3,color:t.fg===T.bg?`${T.bg}BB`:T.inkSoft}}>{t.sub}</div>
      {t.badge&&<span className="fm" style={{marginTop:5,fontSize:9,letterSpacing:"0.04em",fontWeight:700,color:"#fff",background:"#6B4FA0",borderRadius:999,padding:"3px 10px"}}>{t.badge}</span>}
    </button>
  );
}

/* ========== HOME (LAUNCHER) ========== */

function Home({onTabelas,onCardapio,onPitch,onParceria,onDelivery,onFaq,onEventos,onVagas}){
  const tiles=[
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
          Sabor de sobremesa, ficha de suplemento. Zero açúcar adicionado · rico em proteína · rótulo limpo.
        </p>

        <div style={{width:"100%",marginTop:22}}>
          {/* Banner de lançamento BentôBytes → subdomínio de eventos */}
          <a href="https://eventos.bentogelateria.com" target="_blank" rel="noopener" onClick={()=>tk("Lançamento · BentôBytes")} className="hl rise" style={{textDecoration:"none",width:"100%",display:"flex",alignItems:"center",gap:14,textAlign:"left",background:"linear-gradient(135deg,#16241A 0%,#2C3A22 100%)",border:`1px solid ${T.accent}`,borderRadius:18,padding:"13px 18px",cursor:"pointer",marginBottom:12,boxShadow:"0 12px 30px -16px rgba(20,36,26,.7)"}}>
            <span style={{fontSize:30,lineHeight:1,flexShrink:0}}>🍫</span>
            <div style={{flex:1,minWidth:0}}>
              <span className="fm" style={{display:"inline-block",fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"#16241A",background:T.accent,borderRadius:999,padding:"2px 9px",marginBottom:4}}>✦ Novo · Lançamento</span>
              <div className="fd" style={{fontSize:"clamp(18px,3.2vw,22px)",color:"#FFFDF7",lineHeight:1.05}}>BentôBytes está chegando</div>
              <div className="fb" style={{fontSize:12,color:"#D9E0CC",marginTop:2,lineHeight:1.3}}>Sábado 27/06 nas duas lojas · pré-venda sexta na Praia do Canto · veja a contagem regressiva</div>
            </div>
            <span className="fd" style={{fontSize:22,color:T.accent,flexShrink:0}}>→</span>
          </a>
          {/* Botão principal: Tabelas */}
          <button onClick={()=>tk("Tabelas Nutricionais",onTabelas)} className="hl rise" style={{width:"100%",display:"flex",alignItems:"center",gap:14,textAlign:"left",background:"linear-gradient(135deg,#EEF4DF 0%,#E1ECC8 100%)",border:"1px solid #BCCE8E",borderLeft:`4px solid ${T.pistacheDark}`,borderRadius:18,padding:"12px 18px",cursor:"pointer",animationDelay:"120ms",boxShadow:"0 10px 28px -16px rgba(74,90,34,.5)"}}>
            <div style={{display:"flex",gap:2,flexShrink:0}}>
              <GelatoSVG p={{base:"#B8C97A",mid:"#8FA050",deep:"#4A5A22",swirl:"#2E3812",hl:"#DCE8A8"}} size={46} id="hg"/>
              <PicoleSVG p={{base:"#D85A6E",mid:"#A8334A",deep:"#5C1422",swirl:"#F2E7D0",hl:"#FFB0BE"}} size={40} id="hp"/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div className="fm" style={{display:"inline-block",fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"#fff",background:T.pistacheDark,borderRadius:999,padding:"2px 9px",marginBottom:5}}>A sobremesa que você pode repetir</div>
              <div className="fd" style={{fontSize:"clamp(19px,3.2vw,24px)",color:T.ink,lineHeight:1.05}}>Tabelas Nutricionais</div>
              <div className="fb" style={{fontSize:12,color:T.inkSoft,marginTop:2,lineHeight:1.3}}>Gelatos, picolés, monte seu pote e quiz de sabores.</div>
            </div>
            <span className="fd" style={{fontSize:24,color:T.pistacheDark,flexShrink:0}}>→</span>
          </button>

          {/* Banner Delivery / Nos encontre (iFood + endereços das lojas) */}
          <button onClick={()=>tk("Delivery / Nos encontre",onDelivery)} className="hl rise" style={{width:"100%",display:"flex",alignItems:"center",gap:14,textAlign:"left",background:"linear-gradient(135deg,#FBE7E3 0%,#F6D2CB 100%)",border:"1px solid #E79A8E",borderLeft:"4px solid #EA1D2C",borderRadius:18,padding:"12px 20px 12px 14px",cursor:"pointer",marginTop:12,animationDelay:"150ms",boxShadow:"0 10px 28px -16px rgba(234,29,44,.5)"}}>
            <span style={{fontSize:30,lineHeight:1,flexShrink:0}}>🛵</span>
            <div style={{flex:1,minWidth:0}}>
              <span className="fm" style={{display:"inline-block",fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"#fff",background:"#EA1D2C",borderRadius:999,padding:"2px 9px",marginBottom:4}}>🗺️ iFood + endereços</span>
              <div className="fd" style={{fontSize:"clamp(18px,3.2vw,22px)",color:T.ink,lineHeight:1.05}}>Delivery <span style={{color:"#C2384A"}}>/</span> Nos encontre</div>
              <div className="fb" style={{fontSize:12,color:T.inkSoft,marginTop:2,lineHeight:1.3}}>Peça no iFood ou veja onde estamos — Praia do Canto e Jardim Camburi.</div>
            </div>
            <span className="fd" style={{fontSize:22,color:"#EA1D2C",flexShrink:0}}>→</span>
          </button>

          {/* Linha 1 de funções */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginTop:12}}>
            {tiles.slice(0,2).map((t,i)=>(
              <Tile key={t.title} t={t} delay={160+i*45}/>
            ))}
          </div>

          {/* Banner Eventos */}
          <button onClick={()=>tk("Nos leve para seu evento",onEventos)} className="hl rise" style={{width:"100%",display:"flex",alignItems:"center",gap:14,textAlign:"left",background:"linear-gradient(135deg,#F8EFD8 0%,#EFDFB8 100%)",border:"1px solid #D3B57E",borderLeft:"4px solid #A9831C",borderRadius:18,padding:"12px 20px 12px 12px",cursor:"pointer",marginTop:12,animationDelay:"250ms",boxShadow:"0 10px 28px -16px rgba(169,131,28,.5)"}}>
            <img src="/eventos/carrinho-1-thumb.webp" alt="" aria-hidden="true" loading="lazy" style={{width:54,height:54,objectFit:"cover",borderRadius:14,flexShrink:0,border:"1px solid #DCC494"}} onError={onImgErr} />
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

          {/* Banner Vagas — Estamos contratando */}
          <button onClick={()=>tk("Vagas · Estamos contratando",onVagas)} className="hl rise" style={{width:"100%",display:"flex",alignItems:"center",gap:14,textAlign:"left",background:`linear-gradient(135deg,${T.surface} 0%,${T.bgWarm} 100%)`,border:`1px solid ${T.accent}`,borderLeft:`4px solid ${T.pistacheDark}`,borderRadius:18,padding:"12px 20px 12px 14px",cursor:"pointer",marginTop:12,animationDelay:"430ms",boxShadow:"0 10px 28px -16px rgba(70,88,58,.5)"}}>
            <span style={{fontSize:30,lineHeight:1,flexShrink:0}}>💼</span>
            <div style={{flex:1,minWidth:0}}>
              <span className="fm" style={{display:"inline-block",fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"#fff",background:T.pistacheDark,borderRadius:999,padding:"2px 9px",marginBottom:4}}>💚 Estamos contratando</span>
              <div className="fd" style={{fontSize:"clamp(17px,3vw,21px)",color:T.ink,lineHeight:1.1}}>Trabalhe conosco</div>
              <div className="fb" style={{fontSize:12,color:T.inkSoft,marginTop:2,lineHeight:1.3}}>Vaga de Atendente · Jardim Camburi e Praia do Canto · cadastre seu interesse</div>
            </div>
            <span className="fd" style={{fontSize:22,color:T.pistacheDark,flexShrink:0}}>→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

/* ========== TABELAS (HUB DE PRODUTOS/FERRAMENTAS) ========== */

function TabelasHub({onSelect,onSelectProduct,onShakes,onPote,onQuiz,onBack,onCulpa,onGLP1}){
  const counts={gelato:PRODUCTS.filter(p=>p.category==="gelato").length,bentole:PRODUCTS.filter(p=>p.category==="bentole").length};
  const topProt=PRODUCTS.slice().sort((a,b)=>b.nutrition.protein-a.nutrition.protein).slice(0,4);
  const tools=[
    {title:"Gelatos",sub:`${counts.gelato} sabores · ficha completa`,onClick:()=>onSelect("gelato"),art:<GelatoSVG p={{base:"#B8C97A",mid:"#8FA050",deep:"#4A5A22",swirl:"#2E3812",hl:"#DCE8A8"}} size={64} id="tg"/>},
    {title:"Bentôlé",sub:`${counts.bentole} picolés · ficha por sabor`,onClick:()=>onSelect("bentole"),art:<PicoleSVG p={{base:"#D85A6E",mid:"#A8334A",deep:"#5C1422",swirl:"#F2E7D0",hl:"#FFB0BE"}} size={64} id="tp"/>},
    {title:"Shakes",sub:`${SHAKES.length} shakes proteicos · tabela e ingredientes`,onClick:onShakes,emoji:"🥤"},
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
            <button key={t.title} onClick={t.onClick} className="hl rise" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"20px",textAlign:"left",display:"flex",alignItems:"center",gap:14,cursor:"pointer",animationDelay:`${i*45}ms`}}>
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
          <button onClick={()=>tk("Sem culpa-ômetro",onCulpa)} className="hl rise" style={{textAlign:"left",background:"linear-gradient(135deg,#222B1A,#3A472A)",border:"1px solid #3A472A",borderRadius:14,padding:"18px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:34,flexShrink:0}}>🍦</span>
            <div style={{flex:1,minWidth:0}}>
              <div className="fm" style={{fontSize:8.5,letterSpacing:"0.18em",textTransform:"uppercase",color:"#B8C97A"}}>Compare & compartilhe</div>
              <div className="fd" style={{fontSize:19,color:"#fff",lineHeight:1.1,marginTop:3}}>Sem culpa-ômetro</div>
              <div className="fb" style={{fontSize:11.5,color:"rgba(255,255,255,.8)",marginTop:3,lineHeight:1.3}}>Quanto açúcar você economiza vs sorvete comum</div>
            </div>
            <span className="fd" style={{fontSize:20,color:"#B8C97A",flexShrink:0}}>→</span>
          </button>
          <button onClick={()=>tk("Aliado da caneta (GLP-1)",onGLP1)} className="hl rise" style={{textAlign:"left",background:"linear-gradient(135deg,#2A2238,#3E2F58)",border:"1px solid #463A5F",borderRadius:14,padding:"18px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
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
            <button key={p.id} className="hl" style={{textAlign:"left",background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:14,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>onSelectProduct(p.id)}>
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

/* ========== SHAKES (linha proteica · só tabela e ingredientes) ========== */

function ShakeCard({s,delay}){
  return(
    <div className="rise hl" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden",animationDelay:`${delay}ms`,display:"flex",flexDirection:"column"}}>
      <div style={{background:s.color.bg,padding:"16px 18px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:34,lineHeight:1}}>{s.emoji}</span>
        <div style={{flex:1,minWidth:0}}>
          <div className="fm" style={{fontSize:8.5,letterSpacing:"0.18em",textTransform:"uppercase",color:s.color.ink,opacity:.8}}>{s.code} · Proteico</div>
          <div className="fd" style={{fontSize:20,color:s.color.ink,lineHeight:1.1,marginTop:2}}>{s.name}</div>
        </div>
      </div>
      <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:16,flex:1}}>
        <p className="fb" style={{fontSize:12.5,color:T.inkSoft,lineHeight:1.5,margin:0}}>{s.description}</p>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1,background:T.bg,borderRadius:12,padding:"10px 8px",textAlign:"center"}}>
            <div className="fd" style={{fontSize:22,color:T.pistacheDark,fontWeight:500,lineHeight:1}}>{s.protein}g</div>
            <div className="fm" style={{fontSize:8.5,letterSpacing:"0.14em",color:T.inkSoft,textTransform:"uppercase",marginTop:4}}>Proteína · c/ água</div>
          </div>
          <div style={{flex:2,background:T.bg,borderRadius:12,padding:"10px 12px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
            <div className="fb" style={{fontSize:12,color:T.ink,lineHeight:1.3}}>{s.sub}</div>
            <div className="fm" style={{fontSize:8.5,letterSpacing:"0.14em",color:T.inkSoft,textTransform:"uppercase",marginTop:4}}>Preparo {s.prep}</div>
          </div>
        </div>
        <div>
          <div className="fm" style={{fontSize:9,letterSpacing:"0.18em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:8}}>Ingredientes</div>
          {s.ingredients.map((ing,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,padding:"6px 0",borderTop:i?`1px solid ${T.border}`:"none"}}>
              <div style={{minWidth:0}}>
                <div className="fb" style={{fontSize:13,color:T.ink}}>{ing.name}</div>
                {ing.note&&<div className="fb" style={{fontSize:10.5,color:T.inkSoft,lineHeight:1.3,marginTop:1}}>{ing.note}</div>}
              </div>
              <div className="fm" style={{fontSize:12.5,color:T.ink,fontWeight:500,whiteSpace:"nowrap"}}>{ing.qty}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="fm" style={{fontSize:9,letterSpacing:"0.18em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:8}}>Tabela nutricional <span style={{color:T.inkSoft}}>· por porção · por líquido</span></div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead>
                <tr>
                  <th className="fm" style={{textAlign:"left",fontWeight:500,color:T.inkSoft,fontSize:9,letterSpacing:"0.08em",textTransform:"uppercase",padding:"0 6px 6px 0"}}></th>
                  {s.nutrition.map((n,i)=>(
                    <th key={i} className="fm" style={{textAlign:"right",fontWeight:500,color:T.ink,fontSize:9.5,letterSpacing:"0.04em",padding:"0 0 6px 6px",whiteSpace:"nowrap"}}>{n.liquid}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[["Valor energético","kcal","kcal"],["Carboidratos","carb","g"],["Proteínas","prot","g"],["Gorduras totais","fat","g"],["Gord. saturadas","sat","g"],["Fibra alimentar","fiber","g"],["Sódio","na","mg"]].map(([label,key,unit],r)=>(
                  <tr key={key} style={{borderTop:`1px solid ${T.border}`}}>
                    <td className="fb" style={{textAlign:"left",color:T.ink,padding:"6px 6px 6px 0"}}>{label}</td>
                    {s.nutrition.map((n,i)=>(
                      <td key={i} className="fm" style={{textAlign:"right",color:T.ink,fontWeight:key==="kcal"||key==="prot"?600:400,padding:"6px 0 6px 6px",whiteSpace:"nowrap"}}>{n[key]}{unit==="kcal"?"":unit==="mg"?" mg":" g"}{unit==="kcal"?" kcal":""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShakesPage({onBack,onDelivery}){
  return(
    <div className="fade">
      <div style={{maxWidth:1152,margin:"0 auto",padding:"28px 24px 0"}}>
        <button onClick={onBack} className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.inkSoft,textTransform:"uppercase",background:"none",border:"none",display:"flex",alignItems:"center",gap:6,marginBottom:20,cursor:"pointer"}}><ArrowLeft size={13}/>Voltar</button>
        <div className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:8}}>03 / Linha Proteica</div>
        <h1 className="fd" style={{fontSize:"clamp(36px,5vw,58px)",lineHeight:1,color:T.ink,fontWeight:400,letterSpacing:"-0.02em"}}>Shakes</h1>
        <p className="fb" style={{fontSize:13,color:T.inkSoft,marginTop:6,maxWidth:620,lineHeight:1.5}}>Shakes proteicos batidos na hora. A tabela mostra os valores por porção para cada opção de líquido — proteína e calorias variam conforme a escolha.</p>
      </div>
      <div style={{maxWidth:1152,margin:"0 auto",padding:"22px 24px 8px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
          {SHAKES.map((s,i)=><ShakeCard key={s.id} s={s} delay={i*45}/>)}
        </div>
        {onDelivery&&(
          <div style={{marginTop:22,display:"flex",justifyContent:"center"}}>
            <button onClick={()=>tk("Conversão · iFood · Shakes",onDelivery)} className="fb" style={{background:"#EA1D2C",color:"#fff",border:"none",borderRadius:12,padding:"14px 26px",fontSize:15,fontWeight:700,cursor:"pointer"}}>🛵 Pedir um shake no iFood</button>
          </div>
        )}
        <p className="fb" style={{fontSize:11,color:T.inkSoft,marginTop:22,lineHeight:1.5,maxWidth:820}}>Valores <strong>calculados</strong> a partir dos rótulos oficiais do whey True (truesource/vivatrue, por 30 g) somados aos valores da tabela <strong>TACO</strong> (UNICAMP) e <strong>USDA</strong> dos demais ingredientes. São estimativas de cálculo por porção e podem variar conforme o lote, o ponto da fruta, a marca do líquido e o tipo de whey escolhido. O leite de amêndoas usado é o sem açúcar. Não substituem a análise laboratorial do produto final.</p>
      </div>
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
          <div style={{display:"flex",alignItems:"center",gap:8,background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,padding:"8px 12px",minWidth:190}}>
            <Search size={13} style={{color:T.inkSoft}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar sabor…" className="fb" style={{background:"transparent",border:"none",fontSize:13,color:T.ink,width:"100%"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
          <Filter size={12} style={{color:T.inkSoft}}/>
          {[{id:"all",l:"Todos"},{id:"prot9",l:"Proteína ≥ 9g"},{id:"kcal100",l:"< 100 kcal"},{id:"nogluten",l:"Sem glúten"},{id:"nolactose",l:"Sem lactose"}].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} className="fm" style={{fontSize:10,letterSpacing:"0.14em",padding:"6px 12px",borderRadius:9,textTransform:"uppercase",background:filter===f.id?T.pistacheDark:"transparent",color:filter===f.id?T.surface:T.inkSoft,border:`1px solid ${filter===f.id?T.pistacheDark:T.border}`}}>{f.l}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20,alignItems:"center"}}>
          <button onClick={()=>setMoodF(null)} className="fm" style={{fontSize:9,letterSpacing:"0.14em",padding:"5px 10px",borderRadius:9,textTransform:"uppercase",background:!moodF?T.ink:"transparent",color:!moodF?T.surface:T.inkSoft,border:`1px solid ${!moodF?T.ink:T.border}`}}>Todos os momentos</button>
          {allMoods.map(m=>{const mm=MOOD_META[m];if(!mm)return null;const a=moodF===m;return(<button key={m} onClick={()=>setMoodF(a?null:m)} className="fm" style={{fontSize:9,letterSpacing:"0.1em",padding:"5px 10px",borderRadius:9,background:a?mm.bg:"transparent",color:a?mm.color:T.inkSoft,border:`1px solid ${a?mm.color:T.border}`}}>{mm.icon} {mm.label}</button>);})}
        </div>
        {compareIds.length>0&&(
          <div style={{background:T.bgWarm,border:`1px solid ${T.border}`,borderRadius:9,padding:"10px 16px",marginBottom:18,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <span className="fb" style={{fontSize:13,color:T.ink}}><Scale size={13} style={{display:"inline",marginRight:6}}/>{compareIds.length} sabor{compareIds.length>1?"es":""} para comparar</span>
            <button onClick={onOpenCompare} className="fb" style={{background:T.pistacheDark,color:T.surface,border:"none",borderRadius:9,padding:"7px 14px",fontSize:12,fontWeight:500}}>Comparar agora</button>
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
    <div className="rise hl" style={{background:T.surface,border:`1px solid ${inCompare?T.pistacheDark:T.border}`,borderRadius:10,overflow:"hidden",animationDelay:`${delay}ms`,display:"flex",flexDirection:"column"}}>
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
          <button onClick={onClick} className="fb" style={{flex:1,padding:"10px 0",background:T.pistacheDark,color:T.surface,border:"none",borderRadius:9,fontSize:12,fontWeight:500}}>Ver ficha completa</button>
          <button onClick={e=>{e.stopPropagation();onToggleCompare();}} aria-label={inCompare?"Remover da comparação":canCompare?"Adicionar à comparação":"Máximo de 3 sabores"} style={{width:44,height:44,border:`1px solid ${inCompare?T.pistacheDark:T.border}`,borderRadius:9,background:inCompare?T.pistacheDark:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:inCompare?T.surface:T.inkSoft,opacity:(!inCompare&&!canCompare)?0.4:1}}><Scale size={14}/></button>
        </div>
        <div style={{display:"flex",gap:5,marginTop:10,flexWrap:"wrap"}}>
          <Chip tone={p.flags.gluten?"warn":"good"}>{p.flags.gluten?"Contém Glúten":"Não Contém Glúten"}</Chip>
          {!p.flags.lactose&&<Chip tone="good">Zero Lactose</Chip>}
          {proteinClaim(p)&&<Chip tone="good">{proteinClaim(p)}</Chip>}
          {p.nutrition.addedSugars===0&&<Chip tone="good">Sem Açúcar Adicionado</Chip>}
          {p.estimated&&<Chip tone="neutral">Macros Estimados</Chip>}
        </div>
        {lupaFrontal(p).map(l=>(
          <div key={l} style={{marginTop:8,display:"inline-flex",alignSelf:"flex-start",alignItems:"center",gap:6,background:"#232619",color:"#fff",borderRadius:9,padding:"5px 9px"}}>
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
          <button onClick={()=>window.print()} className="fm" style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",background:T.ink,color:T.bg,border:"none",borderRadius:9,padding:"9px 16px",display:"flex",alignItems:"center",gap:7}}><Printer size={13}/>Imprimir / PDF</button>
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
            <div style={{background:`linear-gradient(160deg,${T.bgWarm},${T.surface})`,border:`1px solid ${T.border}`,borderRadius:10,padding:26,textAlign:"center",position:"relative"}}>
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
                    <div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#232619",color:"#fff",border:"2px solid #232619",borderRadius:12,padding:"8px 12px",minWidth:96}}>
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
            <div className="no-print" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><Target size={14} style={{color:T.pistacheDark}}/><h3 className="fm" style={{fontSize:10,letterSpacing:"0.25em",color:T.ink,textTransform:"uppercase"}}>Calculadora de proteína</h3></div>
              <div className="fb" style={{fontSize:13,color:T.inkSoft,marginBottom:10}}>Qual é sua meta diária de proteína?</div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <input type="range" min={30} max={250} value={protGoal} onChange={e=>setProtGoal(Number(e.target.value))} style={{flex:1,accentColor:T.pistacheDark}}/>
                <span className="fm" style={{fontSize:13,color:T.ink,minWidth:55}}>{protGoal}g</span>
              </div>
              <div style={{background:`${T.pistacheDark}18`,border:`1px solid ${T.pistacheDark}40`,borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
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
            <div className="gn nutri-print" style={{background:T.surface,border:`1px solid ${T.ink}`,borderRadius:10,overflow:"hidden"}}>
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
            <div className="nutri-print" style={{background:"#fff",border:`2px solid #232619`,borderRadius:10,padding:"14px 18px"}}>
              <div className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase",marginBottom:6}}>Informação ao alérgico · RDC 26/2015</div>
              <div className="fb" style={{fontSize:13,color:"#232619",fontWeight:700,lineHeight:1.5,textTransform:"uppercase"}}>
                {allergens.length>0?`Alérgicos: contém ${allergens.join(", ")}.`:"Alérgicos: não contém alérgenos de declaração obrigatória."}
              </div>
              <div className="fb" style={{fontSize:12,color:"#5A4A08",fontWeight:600,lineHeight:1.5,textTransform:"uppercase",marginTop:4}}>
                Alérgicos: pode conter {PODE_CONTER.join(", ")}.
              </div>
              <div className="fb" style={{fontSize:13,color:"#232619",fontWeight:700,marginTop:8,textTransform:"uppercase"}}>
                {product.flags.gluten?"Contém glúten.":"Não contém glúten."}
              </div>
            </div>
            {/* Ingredientes */}
            {(()=>{const ordered=orderIngredients(product.ingredients);return(
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><Leaf size={14} style={{color:T.pistacheDark}}/><h3 className="fm" style={{fontSize:10,letterSpacing:"0.25em",color:T.ink,textTransform:"uppercase"}}>Ingredientes</h3></div>
              <p className="fb" style={{fontSize:13,color:T.ink,lineHeight:1.6}}>{ordered.map(i=>i.name).join(", ")}.</p>
              {ordered.filter(i=>i.note).map((i,k)=>(
                <p key={k} className="fb" style={{fontSize:10.5,color:T.inkSoft,fontStyle:"italic",lineHeight:1.5,marginTop:8}}>{i.name}: {i.note}.</p>
              ))}
            </div>
            );})()}
            {/* Ficha */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:20}}>
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
                <button key={p.id} onClick={()=>onSelectProduct(p.id)} className="hl" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:14,display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
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

const TermosPage = lazy(() => import("./TermosPage.jsx"));
const PortfolioPage = lazy(() => import("./PortfolioPage.jsx"));
const TrabalhePage = lazy(() => import("./TrabalhePage.jsx"));

/* ========== SEM CULPA-ÔMETRO ========== */
// Referência: sorvete de massa tradicional (média de mercado), por 100 g.

// Intro "Sem culpa" ao entrar nas Tabelas: comparativo Bentô × sorvete comum (números reais, 1x por sessão).
function TabelasIntro({onClose}){
  // Comparação no nosso best-seller (Pistache), por PORÇÃO real de 60 g — números reais.
  const pis=useMemo(()=>PRODUCTS.find(p=>p.id==="pistache"),[]);
  const s=pis.serving/100; // sorvete comum (média de mercado, por 100 g) reescalado p/ a mesma porção
  const ref={kcal:Math.round(207*s),sugars:Math.round(21*s),protein:3.5*s};
  const data=[
    {l:"Açúcar adicionado · por porção",bento:pis.nutrition.addedSugars,comum:ref.sugars,dec:0,note:"zero açúcar adicionado · só o natural do leite/fruta"},
    {l:"Proteína · por porção",bento:pis.nutrition.protein,comum:ref.protein,dec:1,note:"quase 5× mais · whey WPH"},
  ];
  const reduce=useMemo(()=>{try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches;}catch{return false;}},[]);
  const[go,setGo]=useState(reduce);
  useEffect(()=>{if(reduce)return;const t=setTimeout(()=>setGo(true),90);return()=>clearTimeout(t);},[reduce]);
  const Bar=({val,max,color,delay})=>{const pct=Math.max(4,Math.round(val/max*100));return(
    <div style={{flex:1,background:T.borderSoft,borderRadius:14,height:24,overflow:"hidden"}}>
      <div style={{height:"100%",width:(go?pct:4)+"%",background:color,borderRadius:14,transition:reduce?"none":`width .9s cubic-bezier(.2,.8,.2,1) ${delay}s`}}/>
    </div>);};
  return(
    <div className="fade" role="dialog" aria-modal="true" aria-label="Bentô comparado ao sorvete comum" onClick={onClose} style={{position:"fixed",inset:0,zIndex:250,background:"rgba(31,35,23,0.55)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:18,maxWidth:560,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`,padding:"24px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div className="fm" style={{fontSize:10,letterSpacing:"0.24em",textTransform:"uppercase",color:T.pistacheDark}}>Sem culpa</div>
          <button onClick={onClose} className="fm" style={{background:"none",border:"none",color:T.inkSoft,fontSize:12,cursor:"pointer",letterSpacing:"0.08em"}}>Pular ✕</button>
        </div>
        <h2 className="fd" style={{fontSize:30,color:T.ink,margin:"2px 0 4px",lineHeight:1.1,fontWeight:500}}>Bentô <span style={{color:T.pistacheDark}}>×</span> sorvete comum</h2>
        <p className="fb" style={{fontSize:13.5,color:T.inkSoft,marginBottom:18,lineHeight:1.45}}>A mesma sobremesa, outra ficha. No nosso Pistache (best-seller), por porção de {pis.portionLabel}:</p>
        {data.map((m,i)=>(
          <div key={m.l} style={{marginBottom:16}}>
            <div className="fm" style={{fontSize:10.5,letterSpacing:"0.1em",textTransform:"uppercase",color:T.inkSoft,marginBottom:8}}>{m.l}</div>
            {[["Bentô",m.bento,"linear-gradient(90deg,#8FA050,#46583A)",true],["Comum",m.comum,"#C9A98F",false]].map(([nome,val,color,strong],j)=>(
              <div key={nome} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <span className="fm" style={{width:54,fontSize:11,color:strong?T.pistacheDark:T.inkSoft,fontWeight:strong?700:500}}>{nome}</span>
                <Bar val={val} max={Math.max(m.bento,m.comum)} color={color} delay={i*0.12+j*0.08}/>
                <span className="fb" style={{width:62,textAlign:"right",fontSize:13,fontWeight:strong?700:500,color:strong?T.ink:T.inkSoft}}>{val.toLocaleString("pt-BR",{minimumFractionDigits:m.dec,maximumFractionDigits:m.dec})}</span>
              </div>
            ))}
            <div className="fb" style={{fontSize:11.5,color:T.pistacheDark,marginTop:4,fontWeight:600}}>{m.note}</div>
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:12,background:T.bg,border:`1px solid ${T.borderSoft}`,borderRadius:14,padding:"12px 14px",marginTop:2,marginBottom:6}}>
          <div className="fd" style={{fontSize:30,color:T.pistacheDark,fontWeight:600,lineHeight:1,whiteSpace:"nowrap"}}>{pis.nutrition.kcal} kcal</div>
          <div className="fb" style={{fontSize:12,color:T.inkSoft,lineHeight:1.35}}>por porção de {pis.portionLabel} — leve, <b style={{color:T.ink}}>sem açúcar adicionado</b> e com {pis.nutrition.protein} g de proteína.</div>
        </div>
        <button onClick={onClose} className="fb" style={{width:"100%",marginTop:8,padding:"14px",borderRadius:12,border:"none",background:T.pistacheDark,color:T.surface,fontSize:15,fontWeight:600,cursor:"pointer"}}>Ver as fichas →</button>
        <p className="fb" style={{fontSize:10.5,color:T.inkSoft,textAlign:"center",marginTop:10,lineHeight:1.4}}>Bentô Pistache (porção de {pis.portionLabel}) · sorvete comum como referência de mercado, na mesma porção.</p>
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
  const[termos]=useState(()=>{try{return new URLSearchParams(window.location.search).has("termos");}catch{return false;}});
  const[portfolio]=useState(()=>{try{return new URLSearchParams(window.location.search).has("portfolio");}catch{return false;}});
  const[vagas]=useState(()=>{try{return new URLSearchParams(window.location.search).has("vagas");}catch{return false;}});
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
  const[showDelivery,setShowDelivery]=useState(()=>{try{return new URLSearchParams(window.location.search).has("delivery");}catch{return false;}});
  const[showFaq,setShowFaq]=useState(false);
  const[showCulpa,setShowCulpa]=useState(false);
  const[showGLP1,setShowGLP1]=useState(false);
  const[showEventos,setShowEventos]=useState(()=>{try{return new URLSearchParams(window.location.search).has("eventos");}catch{return false;}});
  const[compareIds,setCmpIds]=useState([]);
  const[tabIntro,setTabIntro]=useState(()=>{try{return !sessionStorage.getItem("bento:tabIntro");}catch{return true;}});
  const fecharTabIntro=useCallback(()=>{setTabIntro(false);try{sessionStorage.setItem("bento:tabIntro","1");}catch{}},[]);
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
  if(termos) return(<><GStyle/><Suspense fallback={null}><TermosPage/></Suspense></>);
  if(portfolio) return(<><GStyle/><Suspense fallback={null}><PortfolioPage/></Suspense></>);
  if(vagas) return(<><GStyle/><Suspense fallback={null}><TrabalhePage/></Suspense></>);
  return(
    <div className="shell fb gn" style={{background:T.bg,color:T.ink}}>
      <GStyle/>
      <Header onHome={goHome} compareCount={compareIds.length} onOpenCompare={()=>setShowCmp(true)} onQuiz={()=>setShowQuiz(true)} favorites={favorites}/>
      {view==="home"&&<Home onTabelas={()=>setView("tabelas")} onPitch={()=>setShowPitch(true)} onCardapio={()=>setShowCardapio(true)} onParceria={()=>setShowParceria(true)} onDelivery={()=>setShowDelivery(true)} onFaq={()=>setShowFaq(true)} onEventos={()=>setShowEventos(true)} onVagas={()=>{window.location.href="/?vagas";}}/>}
      {view==="tabelas"&&<TabelasHub onSelect={openCat} onSelectProduct={openProd} onShakes={()=>{tk("Tabelas · Shakes");setView("shakes");}} onPote={()=>tk("Conversão · Monte seu pote",()=>setShowPote(true))} onQuiz={()=>setShowQuiz(true)} onBack={goHome} onCulpa={()=>setShowCulpa(true)} onGLP1={()=>setShowGLP1(true)}/>}
      {view==="tabelas"&&tabIntro&&<TabelasIntro onClose={fecharTabIntro}/>}
      {view==="shakes"&&<ShakesPage onBack={()=>setView("tabelas")} onDelivery={()=>{setShowDelivery(true);}}/>}
      {view==="list"&&<ProductList category={category} onBack={()=>setView("tabelas")} onSelectProduct={openProd} compareIds={compareIds} onToggleCompare={toggleCmp} onOpenCompare={()=>setShowCmp(true)}/>}
      {view==="detail"&&<ProductDetail productId={productId} onBack={backList} onSelectProduct={openProd} favorites={favorites} onToggleFav={()=>toggleFav(productId)} compareIds={compareIds} onToggleCompare={()=>toggleCmp(productId)}/>}
      <Suspense fallback={null}>
      {showQuiz&&<QuizModal onClose={()=>setShowQuiz(false)} onResult={(id)=>{tk("Conversão · Quiz concluído");setShowQuiz(false);openProd(id);}} onDelivery={()=>{setShowQuiz(false);setShowDelivery(true);}}/>}
      {showCmp&&<CompareModal ids={compareIds} onClose={()=>setShowCmp(false)} onViewProduct={openProd}/>}
      {showPote&&<PoteBuilder onClose={()=>setShowPote(false)} onDelivery={()=>{setShowPote(false);setShowDelivery(true);}}/>}
      {showPitch&&<PitchDeck onClose={()=>setShowPitch(false)} onCatalog={()=>{setShowPitch(false);openCat("gelato");}}/>}
      {showCardapio&&<CardapioDigital onClose={()=>setShowCardapio(false)}/>}
      {showParceria&&<SejaParceiro onClose={()=>setShowParceria(false)} onForm={()=>setShowRevenda(true)}/>}
      {showRevenda&&<SejaBento onClose={()=>setShowRevenda(false)}/>}
      {showDelivery&&<DeliveryModal onClose={()=>setShowDelivery(false)}/>}
      {showFaq&&<FaqModal onClose={()=>setShowFaq(false)}/>}
      {showCulpa&&<CulpaModal onClose={()=>setShowCulpa(false)} onDelivery={()=>{setShowCulpa(false);setShowDelivery(true);}}/>}
      {showGLP1&&<GLP1Modal onClose={()=>setShowGLP1(false)} onSelectProduct={(id)=>{setShowGLP1(false);openProd(id);}} onTabelas={()=>{setShowGLP1(false);setView("tabelas");}} onDelivery={()=>{setShowGLP1(false);setShowDelivery(true);}}/>}
      {showEventos&&<EventosModal onClose={()=>setShowEventos(false)}/>}
      </Suspense>
      <footer className="no-print" style={{maxWidth:1152,margin:"0 auto",padding:"24px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",borderTop:`1px solid ${T.border}`}}>
        <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>Bentô · Functional Nutrition · ES · BR</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>tk("Rodapé · Delivery",()=>setShowDelivery(true))} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:"#fff",textTransform:"uppercase",border:"none",cursor:"pointer",background:"#EA1D2C",borderRadius:9,padding:"7px 12px"}}>🛵 Delivery</button>
          <button onClick={()=>tk("Rodapé · Cardápio",()=>setShowCardapio(true))} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.surface,textTransform:"uppercase",border:"none",cursor:"pointer",background:T.ink,borderRadius:9,padding:"7px 12px"}}>📋 Cardápio</button>
          <button onClick={()=>tk("Rodapé · Seja Bentô",()=>setShowParceria(true))} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:"#fff",textTransform:"uppercase",border:"none",cursor:"pointer",background:"#1FA855",borderRadius:9,padding:"7px 12px"}}>🤝 Seja Bentô</button>
          <a href="/?vagas" onClick={()=>tk("Rodapé · Vagas")} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:"#fff",textTransform:"uppercase",textDecoration:"none",background:T.pistacheDark,borderRadius:9,padding:"7px 12px"}}>💼 Trabalhe conosco</a>
          <button onClick={()=>tk("Rodapé · Conheça a Bentô",()=>setShowPitch(true))} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.surface,textTransform:"uppercase",border:"none",cursor:"pointer",background:T.pistacheDark,borderRadius:9,padding:"7px 12px"}}>✦ Conheça a Bentô</button>
          <a href="/tabela-nutricional.csv" download onClick={()=>tk("Download CSV")} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.pistacheDark,textTransform:"uppercase",textDecoration:"none",border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>↓ Tabela nutricional (CSV)</a>
          <a href="/?privacidade=1" className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase",textDecoration:"none",border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>Privacidade</a>
          <a href="/?termos=1" className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase",textDecoration:"none",border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>Termos</a>
          <a href="/?portfolio=1" onClick={()=>tk("Rodapé · Portfólio")} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.pistacheDark,textTransform:"uppercase",textDecoration:"none",border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>📄 Portfólio</a>
        </div>
        <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>v4.1 · Clean Label</div>
        <div style={{width:"100%",borderTop:`1px solid ${T.border}`,paddingTop:12,marginTop:4}}>
          <p className="fb" style={{fontSize:10,color:T.inkSoft,lineHeight:1.5,margin:0,textAlign:"center"}}>© {new Date().getFullYear()} ABB Gelateria Ltda · Bentô Gelatos — CNPJ 61.590.463/0001-45. Todos os direitos reservados. Conteúdo, layout e marca protegidos (Leis 9.610/98 e 9.279/96); cópia ou reprodução proibida. Veja os <a href="/?termos=1" style={{color:T.pistacheDark,textDecoration:"underline"}}>Termos</a>.</p>
        </div>
      </footer>
      <Analytics/>
    </div>
  );
}

