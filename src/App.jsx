import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
// Rolagem-cinema (motion.dev): valores presos ao scroll, sem re-render por
// frame. Três usos, todos sobre CONTEÚDO REAL — nada de enfeite solto:
//   · parallax DENTRO das artes fotográficas dos banners (profundidade
//     editorial: a foto viaja mais devagar que a moldura);
//   · o hero recua em profundidade quando o filme de fundo assume;
//   · o trilho do filme: os 6 capítulos do vídeo viram navegação real.
// Regra da casa: movimento comandado pela rolagem NUNCA desliga — Reduce
// Motion corta animação autônoma, não gesto do usuário (ver CLAUDE.md).
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from "motion/react";
import { ArrowLeft, ChevronRight, Search, Leaf, Beaker, Filter, Heart, Scale, X, Sparkles, Target, Printer, Clock } from "lucide-react";
import { PRODUCTS, SHAKES, AVISO_POLIOL, MOOD_META, QUIZ, ALLERGENS, PODE_CONTER, lupaFrontal, proteinClaim, sugarClaim } from "./data.js";
import { Analytics } from "@vercel/analytics/react";
import { track } from "@vercel/analytics";
import { tk, T, LOJAS, PEDIR_URL, ENTREGA_ESTADO_URL, distanciaM, DECK_URL, BentoLogo, GelatoSVG, PicoleSVG, ProductArt, MoodChip, Chip, MacroBar, useModal, onImgErr, IMG_FB, VD, br, orderIngredients } from "./shared.jsx";
import WorldFundo from "./WorldFundo.jsx";
// Movimento cinematográfico de rolagem para os cards REAIS da home:
// entrada/saída 3D contínua presa ao scroll (nos dois sentidos). Escreve
// direto no DOM (sem re-render). Reduced-motion: estático.
function CardMotion({children,style}){
  const ref=useRef(null);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    let raf=0;
    const update=()=>{
      raf=0;
      const r=el.getBoundingClientRect();
      const vh=window.innerHeight;
      if(r.bottom<-140||r.top>vh+140)return;
      const pr=Math.min(1,Math.max(0,(vh-r.top)/(vh+r.height)));
      const c=(pr-0.5)*2;
      const e=Math.sign(c)*Math.pow(Math.abs(c),1.25);
      el.style.transform=`perspective(1000px) translateY(${(-e*110).toFixed(1)}px) rotateX(${(-e*10).toFixed(2)}deg) scale(${(1-Math.min(.1,Math.abs(e)*.1)).toFixed(3)})`;
      el.style.opacity=Math.min(1,Math.max(.15,1-Math.max(0,Math.abs(c)-0.38)*1.6)).toFixed(2);
    };
    const on=()=>{if(!raf)raf=requestAnimationFrame(update);};
    window.addEventListener("scroll",on,{passive:true});
    window.addEventListener("resize",on);
    update();
    return()=>{window.removeEventListener("scroll",on);window.removeEventListener("resize",on);if(raf)cancelAnimationFrame(raf);};
  },[]);
  return <div ref={ref} style={{...style,willChange:"transform,opacity",transformStyle:"preserve-3d"}}>{children}</div>;
}

/* ===== Modais e overlays: carregados sob demanda (code-split) ===== */
const QuizModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.QuizModal })));
const CompareModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.CompareModal })));
const FavoritesModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.FavoritesModal })));
const ClubeBento = lazy(() => import("./modals.jsx").then(m => ({ default: m.ClubeBento })));
const CardapioDigital = lazy(() => import("./modals.jsx").then(m => ({ default: m.CardapioDigital })));
const SejaParceiro = lazy(() => import("./modals.jsx").then(m => ({ default: m.SejaParceiro })));
const EventosModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.EventosModal })));
const FaqModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.FaqModal })));
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
.hdr{position:sticky;top:0;z-index:40;backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%)}
/* vidro fosco estilo iOS — usado nos painéis que flutuam sobre o filme da home */
.glass{background:rgba(255,253,247,var(--vidro,.62));backdrop-filter:blur(22px) saturate(170%);-webkit-backdrop-filter:blur(22px) saturate(170%);border:1px solid rgba(255,255,255,.55)}
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

function Header({onHome,compareCount,onOpenCompare,onQuiz,favorites,onOpenFavs}){
  return(
    <header className="hdr no-print" style={{background:`${T.bg}C9`,borderBottom:`1px solid ${T.border}`}}>
      <div style={{maxWidth:1152,margin:"0 auto",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <button onClick={onHome} aria-label="Início" style={{display:"flex",alignItems:"center",gap:12,background:"none",border:"none"}}>
          <BentoLogo size={38}/>
          <div style={{lineHeight:1.3,textAlign:"left"}}>
            <div className="fd" style={{fontSize:14,color:T.ink}}>Bentô</div>
            <div className="fm" style={{fontSize:8,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>Functional Nutrition</div>
          </div>
        </button>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {favorites.length>0&&(
            <button onClick={onOpenFavs} aria-label={`Abrir meus ${favorites.length} favoritos`} className="fm" style={{display:"flex",alignItems:"center",gap:5,fontSize:9,letterSpacing:"0.14em",color:T.pistacheDark,textTransform:"uppercase",background:T.bgWarm,border:`1px solid ${T.border}`,borderRadius:999,padding:"8px 13px",cursor:"pointer"}}>
              <Heart size={12} fill={T.pistacheDark} style={{color:T.pistacheDark}}/> {favorites.length}
            </button>
          )}
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


/* ========== HOME (LAUNCHER) ========== */

/* Dimensões reais das artes (px) — reservam o espaço do banner e zeram o CLS
   sem cortar a imagem (a proporção é a da própria arte). */
const BANNER_DIMS={
  "/banners/studio.webp":[1600,686],"/banners/bytes.webp":[1600,686],"/banners/tabelas.webp":[1600,533],
  "/banners/cardapio.webp":[1600,686],"/banners/eventos.webp":[1600,686],
  "/banners/parceiro.webp":[1600,533],"/banners/conheca.webp":[1600,533],"/banners/carreira.webp":[1600,533],
  "/banners/tab-gelatos.webp":[1600,533],"/banners/tab-bentole.webp":[1600,533],"/banners/tab-shakes.webp":[1600,533],
  "/banners/tab-pote.webp":[1600,533],"/banners/tab-quiz.webp":[1600,533],"/banners/tab-culpa.webp":[1600,533],
  "/banners/tab-glp1.webp":[1600,533],"/banners/tab-proteina.webp":[1600,533],
};

/* Banner grande — família visual única: superfície creme, borda fina bege,
   foto real à esquerda (40%) + informação à direita (60%), selo dourado fosco
   e seta discreta. Sem gradientes/bordas coloridas: "luxo silencioso". */
function PhotoBanner({as="button",href,target,onClick,img,imgPos,selo,title,sub,delay,full,alt,priority,gap}){
  // Parallax editorial DENTRO da moldura: enquanto o card cruza a tela, a
  // fotografia viaja um pouco mais devagar — o olho lê profundidade, como em
  // editorial impresso. O movimento vem da arte real, não de enfeite por cima.
  const parRef=useRef(null);
  const{scrollYProgress}=useScroll({target:parRef,offset:["start end","end start"]});
  // Translucidez iOS sutil: o card deixa o filme de fundo "respirar" pelas
  // bordas e pela arte (92%) sem lavar as artes oficiais dos banners.
  // "gap" maior na home abre o vão entre cards para o filme 3D aparecer na rolagem.
  // A borda do card era creme (rgba(228,220,201,.78)) e cada arte ainda trazia a
  // sua própria moldura creme por dentro — davam duas molduras claras em volta da
  // foto. No card de arte cheia, a borda passa a ser o mesmo filete dourado das
  // artes: uma linha só, contínua, com a imagem chegando até ela.
  const common={width:"100%",display:"flex",alignItems:"stretch",textAlign:"left",background:"rgba(255,253,247,.72)",border:`1px solid ${full?"rgba(201,162,74,.5)":"rgba(228,220,201,.78)"}`,borderRadius:18,overflow:"hidden",cursor:"pointer",marginTop:gap||14,boxShadow:"0 14px 34px -26px rgba(35,38,25,.55)",padding:0,minHeight:full?0:112,textDecoration:"none"};
  const d=BANNER_DIMS[img];
  // Modo "full": a própria arte já traz selo, título, subtítulo e seta — imagem cobre o card todo.
  // O scale come a moldura creme que cada arte traz desenhada e o
  // `overflow:hidden` do card apara o excesso.
  //
  // Por que 9% e não 6%: o corte é proporcional a CADA eixo. Com 6%, uma arte de
  // 1600×533 perdia 48 px na horizontal mas só 16 px na vertical — justo onde o
  // filete dourado está desenhado. Resultado: sobravam riscos dourados em cima e
  // embaixo enquanto os cantos e as laterais eram cortados, e a curva não
  // fechava. Com 9% são 72 px na horizontal e 24 px na vertical: o filete
  // desenhado some de vez, e quem faz a moldura é a borda do card — que curva
  // certo nos quatro cantos, porque é uma borda de CSS de verdade.
  //
  // O parallax pede folga a mais: 1.16 de escala deixa 8% de sobra vertical de
  // cada lado; transladando no máximo 3.2%, ainda restam os mesmos ~4.5% que o
  // 1.09 original tinha para esconder o filete desenhado. A conta fecha — a
  // moldura nunca aparece, em nenhum ponto do percurso.
  const parY=useTransform(scrollYProgress,[0,1],["-3.2%","3.2%"]);
  const parYCol=useTransform(scrollYProgress,[0,1],["-4%","4%"]);
  const inner=full?(
    <motion.img src={img} alt={alt||title||""} width={d&&d[0]} height={d&&d[1]} loading={priority?"eager":"lazy"} fetchpriority={priority?"high":undefined} decoding={priority?"auto":"async"} onError={onImgErr} style={{display:"block",width:"100%",height:"auto",scale:1.16,y:parY,willChange:"transform"}}/>
  ):(
    <>
      <div style={{flexBasis:"40%",maxWidth:"40%",flexShrink:0,alignSelf:"stretch",position:"relative",overflow:"hidden"}}>
        <motion.img src={img} alt="" aria-hidden="true" loading="lazy" onError={onImgErr}
          style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:imgPos||"center",scale:1.14,y:parYCol,willChange:"transform"}}/>
      </div>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",justifyContent:"center",padding:"15px 8px 15px 18px"}}>
        {selo&&<span className="fm" style={{display:"inline-block",alignSelf:"flex-start",fontSize:8.5,letterSpacing:"0.22em",textTransform:"uppercase",color:T.accent,background:"transparent",border:`1px solid ${T.accent}`,borderRadius:999,padding:"3px 11px",marginBottom:8}}>{selo}</span>}
        <div className="fd" style={{fontSize:"clamp(18px,3vw,22px)",color:T.pistacheDark,lineHeight:1.08,letterSpacing:"-0.01em"}}>{title}</div>
        <div className="fb" style={{fontSize:12.5,color:T.inkSoft,marginTop:4,lineHeight:1.4}}>{sub}</div>
      </div>
      <span aria-hidden="true" style={{display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,alignSelf:"center",margin:"0 14px 0 4px",width:34,height:34,borderRadius:"50%",background:T.pistacheDark,color:T.surface}}><ChevronRight size={18} strokeWidth={2}/></span>
    </>
  );
  if(as==="a") return <a ref={parRef} href={href} target={target} rel="noopener" onClick={onClick} className="hl rise" style={{...common,animationDelay:delay}}>{inner}</a>;
  return <button ref={parRef} onClick={onClick} className="hl rise" style={{...common,animationDelay:delay}}>{inner}</button>;
}

/* ========== HERO EM PROFUNDIDADE ==========
   Ao rolar para dentro do filme, o painel de vidro do hero recua: sobe mais
   devagar que a página, encolhe de leve e cede o palco ao atelier 3D. Preso ao
   scroll nos dois sentidos — rolar de volta traz o hero de volta, quadro a
   quadro, como o próprio filme de fundo. */
function HeroRecede({children}){
  const ref=useRef(null);
  const{scrollYProgress}=useScroll({target:ref,offset:["start start","end start"]});
  const y=useTransform(scrollYProgress,[0,1],[0,72]);          // fica para trás: profundidade
  const scale=useTransform(scrollYProgress,[0,1],[1,.93]);
  // A mola aqui não é estética: ela força a opacidade pelo caminho JS. Sem ela,
  // o motion entrega a opacidade ao ScrollTimeline NATIVO, que reverte ao valor
  // base quando o alvo sai do range — enquanto o transform (JS) congela no
  // estado final. Dois canais, dois finais diferentes. A mola unifica o canal;
  // e é rabeira de gesto, não animação autônoma: parou a rolagem, ela assenta.
  const opacity=useSpring(useTransform(scrollYProgress,[0,.9],[1,.22]),{stiffness:300,damping:36});
  return <motion.div ref={ref} style={{width:"100%",y,scale,opacity,transformOrigin:"50% 100%",willChange:"transform,opacity"}}>{children}</motion.div>;
}

/* ========== TRILHO DO FILME ==========
   O fundo da home é um filme real de 6 capítulos comandado pela rolagem
   (WorldFundo mapeia o progresso da página linearmente sobre os 6 legs — a
   mesma conta de lá vale aqui, e é por isso que o trilho é VERDADEIRO, não um
   progresso decorativo). Este trilho dá corpo a isso: mostra em que capítulo o
   filme está e leva a qualquer um deles com um toque. Desktop apenas — no
   celular a coluna já é estreita demais para um trilho lateral. */
function FilmRail(){
  const[on,setOn]=useState(false);
  useEffect(()=>{
    const mq=window.matchMedia("(min-width: 1080px)");
    const f=()=>setOn(mq.matches);
    f();mq.addEventListener("change",f);
    return()=>mq.removeEventListener("change",f);
  },[]);
  const{scrollYProgress}=useScroll();
  // A mola suaviza o cursor do trilho sem soltá-lo do dedo: é rabeira de gesto,
  // não animação autônoma — parada a rolagem, ela assenta e silencia.
  const suave=useSpring(scrollYProgress,{stiffness:170,damping:30,mass:.4});
  const cursorTop=useTransform(suave,v=>`${(v*100).toFixed(2)}%`);
  const[leg,setLeg]=useState(0);
  useMotionValueEvent(scrollYProgress,"change",(v)=>{
    const l=Math.min(5,Math.floor(v*6));
    setLeg((p)=>p===l?p:l);
  });
  if(!on) return null;
  const vai=(i)=>{
    const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    window.scrollTo({top:((i+0.5)/6)*max,behavior:"smooth"});
  };
  return(
    <div style={{position:"fixed",right:22,top:"50%",transform:"translateY(-50%)",zIndex:40,display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
      <span className="fm" style={{fontSize:8.5,letterSpacing:"0.3em",textTransform:"uppercase",color:T.inkSoft,writingMode:"vertical-rl"}}>filme do ateliê</span>
      <div style={{position:"relative",width:1,height:168,background:"rgba(58,69,40,.22)"}}>
        <motion.span aria-hidden="true" style={{position:"absolute",left:-2.5,top:cursorTop,width:6,height:6,marginTop:-3,borderRadius:"50%",background:T.accent,boxShadow:"0 0 0 3px rgba(201,162,74,.22)"}}/>
        {Array.from({length:6},(_,i)=>(
          <button key={i} onClick={()=>{tk("Home · Trilho do filme · Cap "+(i+1));vai(i);}}
            aria-label={`Ir ao capítulo ${i+1} do filme`}
            style={{position:"absolute",left:-13,top:`${((i+0.5)/6)*100}%`,width:27,height:16,marginTop:-8,padding:0,background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{display:"block",width:leg===i?15:9,height:1,background:leg===i?T.pistacheDark:"rgba(58,69,40,.4)",transition:"width .3s cubic-bezier(.2,.8,.2,1), background .3s"}}/>
          </button>
        ))}
      </div>
      <span className="fm" style={{fontSize:9,letterSpacing:"0.14em",color:T.pistacheDark}}>0{leg+1}<span style={{color:T.inkSoft}}>/06</span></span>
    </div>
  );
}

// ⭐ Banners da home em ordem dinâmica: o 1º card ("destaque") é escolhido no
// painel admin (Visão geral → Destaque da home) e servido por /api/destaque.
// Sem escolha salva, EVENTOS abre a home. O valor fica em localStorage para
// visitas seguintes renderizarem já na ordem certa (sem salto de layout).
const DESTAQUE_PADRAO="eventos";
/* ===== CONFIG EDITÁVEL DO SITE (painel → /api/site-config) =====
   Horários das lojas, banners, push e opacidades. O CÓDIGO é o padrão e a
   config só sobrescreve: campo ausente ou API fora do ar = site igual ao que
   está aqui. Impossível apagar a home editando errado.
   Não confundir com /api/delivery/estado: aquilo é regra de entrega e mora no
   totem; isto é conteúdo e aparência do site. */
// Opacidades do painel viram variáveis CSS no <html>: o véu do filme e a
// vinheta são lidos pelo WorldFundo, o vidro pela classe .glass.
function useVisual(cfg){
  useEffect(()=>{
    const v=(cfg&&cfg.visual)||null; if(!v) return;
    const r=document.documentElement.style;
    if(typeof v.vidro==="number")   r.setProperty("--vidro",String(v.vidro));
    if(typeof v.veu==="number")     r.setProperty("--veu",String(v.veu));
    if(typeof v.vinheta==="number") r.setProperty("--vinheta",String(v.vinheta));
  },[cfg]);
}

function useSiteConfig(){
  const[cfg,setCfg]=useState(null);
  useEffect(()=>{
    let vivo=true;
    fetch("/api/site-config",{cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(j=>{ if(vivo&&j&&typeof j==="object") setCfg(j); })
      .catch(()=>{});
    return()=>{vivo=false;};
  },[]);
  return cfg;
}
// O card da loja mostra "resumo" (texto agrupado), mas o painel edita "dias"
// (usado no aberta/fechada). Sem derivar um do outro, mudar o horário no painel
// não mudaria o texto na tela. Então: se veio "dias" do painel, o resumo é
// recalculado a partir dele, agrupando dias seguidos de mesmo horário.
const DIA_ROT=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const hhmm=(h)=>{const i=Math.floor(h),m=Math.round((h-i)*60);return String(i).padStart(2,"0")+(m?("h"+String(m).padStart(2,"0")):"h");};
function resumoDeDias(dias){
  const ordem=[1,2,3,4,5,6,0];                     // segunda → domingo
  const txt=(d)=>{const r=dias[d];return r?`${hhmm(r[0])}–${hhmm(r[1])}`:"fechado";};
  const out=[]; let i=0;
  while(i<ordem.length){
    let j=i; while(j+1<ordem.length&&txt(ordem[j+1])===txt(ordem[i])) j++;
    const rot=i===j?DIA_ROT[ordem[i]]:`${DIA_ROT[ordem[i]]} a ${DIA_ROT[ordem[j]]}`;
    out.push([rot,txt(ordem[i])]); i=j+1;
  }
  return out;
}

// Lojas com o horário do painel por cima do que está em shared.jsx
function lojasComConfig(cfg){
  const over=cfg&&cfg.lojas;
  if(!over) return LOJAS;
  return LOJAS.map(l=>{
    const o=over[l.id];
    if(!o) return l;
    const dias=o.dias?{...l.dias,...o.dias}:l.dias;
    const resumo=o.resumo||(o.dias?resumoDeDias(dias):l.resumo);
    return {...l,dias,resumo};
  });
}

const ORDEM_PADRAO=["eventos","studio","bytes","tabelas","cardapio","parceiro","conheca","carreira","creators"];
// ordem dos banners com o destaque do painel (compartilhado pelas duas homes)
function useDestaqueOrdem(){
  const[destaque,setDestaque]=useState(()=>{try{const v=localStorage.getItem("bento:destaque");return ORDEM_PADRAO.includes(v)?v:DESTAQUE_PADRAO}catch{return DESTAQUE_PADRAO}});
  useEffect(()=>{
    fetch("/api/destaque",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{
      if(j&&j.destaque&&ORDEM_PADRAO.includes(j.destaque)&&j.destaque!==destaque){
        try{localStorage.setItem("bento:destaque",j.destaque)}catch{/* */}
        setDestaque(j.destaque);
      }
    }).catch(()=>{});
  },[]); // roda 1× por visita; "destaque" inicial vem do localStorage de propósito
  return [destaque,...ORDEM_PADRAO.filter(id=>id!==destaque)];
}
// Aplica o que o painel definiu: ordem própria, cards ocultos e troca de arte.
function ordemComConfig(ordem,cfg){
  const b=(cfg&&cfg.banners)||{};
  let fila=Array.isArray(b.ordem)&&b.ordem.length?b.ordem.filter(id=>ordem.includes(id)):ordem;
  if(Array.isArray(b.ocultos)&&b.ocultos.length) fila=fila.filter(id=>!b.ocultos.includes(id));
  return fila.length?fila:ordem;   // nunca devolve home sem card nenhum
}
const arteDoBanner=(cfg,id,padrao)=>((cfg&&cfg.banners&&cfg.banners.imagens&&cfg.banners.imagens[id])||padrao);
/* Hora de Vitória e loja aberta agora — usados pela entrega e pelo balão de
   horários; ficam aqui em cima porque a área de entrega precisa deles. */
function nowSP(){
  try{
    const p=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Sao_Paulo",weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());
    const wd={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[p.find(x=>x.type==="weekday").value];
    const h=+p.find(x=>x.type==="hour").value, m=+p.find(x=>x.type==="minute").value;
    return {wd, cur:h+m/60};
  }catch{ const d=new Date(); return {wd:d.getDay(), cur:d.getHours()+d.getMinutes()/60}; }
}

const abertaAgora=(dias,wd,cur)=>{ const r=dias[wd]; return !!(r&&cur>=r[0]&&cur<r[1]); };

/* ===== ESTADO DA ENTREGA — lido do totem, nunca decidido aqui =====
   O totem é a fonte única (raio, centro, entrega grátis, quais lojas entregam).
   O site só lê. Regra de ouro: sem resposta do endpoint, o site NÃO afirma nada
   sobre entrega — não anuncia grátis, não promete raio. O link de pedir continua
   valendo, porque quem responde o que está disponível é o próprio totem. Assim é
   impossível o site dizer "grátis" enquanto o pedido cobra. */
function useEntregaEstado(){
  const[cfg,setCfg]=useState(null);
  useEffect(()=>{
    let vivo=true;
    fetch(ENTREGA_ESTADO_URL,{cache:"no-store",mode:"cors"})
      .then(r=>r.ok?r.json():null)
      .then(j=>{ if(vivo&&j&&typeof j==="object") setCfg(j); })
      .catch(()=>{}); // totem fora do ar ou endpoint ainda não publicado: segue calado
    return()=>{vivo=false;};
  },[]);
  return cfg;
}
// Aceita mapa por id ou lista com id. O totem usa underscore nas chaves
// (praia_do_canto) e o site usa hífen no id da loja (praia-do-canto) — por isso
// a comparação normaliza os dois lados antes de casar.
const chaveLoja=(x)=>String(x||"").toLowerCase().replace(/[-_\s]+/g,"-");
function estadoDaLoja(cfg,id){
  if(!cfg) return null;
  const fonte=cfg.lojas||cfg.stores||cfg;
  const alvo=chaveLoja(id);
  if(Array.isArray(fonte)){
    const e=fonte.find(x=>x&&(chaveLoja(x.id)===alvo||chaveLoja(x.loja)===alvo));
    return e&&typeof e==="object"?e:null;
  }
  const k=Object.keys(fonte).find(k=>chaveLoja(k)===alvo);
  const e=k?fonte[k]:null;
  return e&&typeof e==="object"?e:null;
}
const temEntrega=(e)=>!!(e&&(e.entregaPropria??e.entrega??e.ativo));
// O totem manda o raio em QUILÔMETROS (raioKm); aceito metros também.
const raioDe=(e)=>{
  if(!e) return 0;
  const km=Number(e.raioKm??e.raio_km);
  if(Number.isFinite(km)&&km>0) return Math.round(km*1000);
  return Number(e.raioM??e.raio_m??e.raioMetros)||0;
};
/* Janela de entrega. A casa não entrega antes das 11h nem depois das 20h, então
   fora disso o site não oferece entrega — só retirada e iFood.
   O horário é regra de negócio e, como o resto, deveria vir do totem: se o
   endpoint mandar horario:{abre,fecha}, é ele que vale. O padrão abaixo existe
   só enquanto o campo não for exposto lá — quando for, some daqui. */
const JANELA_PADRAO={abre:11,fecha:20};
const janelaDe=(e)=>{
  const h=e&&(e.horario||e.janela);
  const abre=Number(h&&(h.abre??h.inicio??h.open));
  const fecha=Number(h&&(h.fecha??h.fim??h.close));
  return Number.isFinite(abre)&&Number.isFinite(fecha)&&fecha>abre?{abre,fecha}:JANELA_PADRAO;
};
// Hora de Vitória (America/Sao_Paulo) — não a do aparelho do cliente, que pode
// estar em qualquer fuso.
function horaVitoria(){
  try{
    const f=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",hour:"numeric",minute:"numeric",hour12:false});
    const p=Object.fromEntries(f.formatToParts(new Date()).map(x=>[x.type,x.value]));
    return Number(p.hour)+Number(p.minute)/60;
  }catch{ const d=new Date(); return d.getHours()+d.getMinutes()/60; }
}
/* Reavalia a janela com o tempo: sem isto, quem abriu a página às 19h58
   continuaria vendo entrega disponível às 20h01. 30s é folgado para um limite
   que muda de hora em hora e não pesa nada. */
function useMinuto(){
  const[,tique]=useState(0);
  useEffect(()=>{ const t=setInterval(()=>tique(n=>n+1),30000); return()=>clearInterval(t); },[]);
}
const noHorario=(e)=>{ const j=janelaDe(e), h=horaVitoria(); return h>=j.abre&&h<j.fecha; };
// Entrega disponível AGORA = a loja entrega E estamos dentro da janela.
const entregaAgora=(e)=>temEntrega(e)&&noHorario(e);
const faixaHorario=(e)=>{ const j=janelaDe(e); return `${String(j.abre).padStart(2,"0")}h às ${String(j.fecha).padStart(2,"0")}h`; };

const centroDe=(e)=>{
  const c=e&&(e.centro||e.center);
  return c&&Number.isFinite(Number(c.lat))&&Number.isFinite(Number(c.lng))?{lat:Number(c.lat),lng:Number(c.lng)}:null;
};

/* Confere se o endereço do cliente cai dentro da área da loja. A conta roda no
   próprio navegador — nenhuma localização sai do aparelho. Quem fica fora não
   perde a saída: recebe o iFood ali mesmo, papel que o marketplace passou a ter.
   Só aparece quando o totem informou raio e centro. */
function AreaEntrega({loja,estado}){
  useMinuto();
  // O iFood NÃO funciona quando a loja está fechada — então fora do horário de
  // funcionamento nem ele é oferecido como saída.
  const{wd,cur}=nowSP();
  const lojaAberta=abertaAgora(loja.dias,wd,cur);
  const[res,setRes]=useState(null);
  const[msg,setMsg]=useState("");
  const raio=raioDe(estado), centro=centroDe(estado);
  const conferir=()=>{
    if(!navigator.geolocation){setMsg("Seu navegador não permite localização — chame no WhatsApp que a gente confere.");return;}
    setMsg("Localizando…");setRes(null);
    navigator.geolocation.getCurrentPosition(pos=>{
      const{latitude:la,longitude:lo}=pos.coords;
      const d=distanciaM(centro.lat,centro.lng,la,lo);
      const dentro=d<=raio;
      setRes({dentro,km:(d/1000).toFixed(1).replace(".",",")});
      setMsg("");
      tk("Entrega · Conferiu área · "+(dentro?"dentro":"fora"));
    },()=>setMsg("Não consegui pegar sua localização — chame no WhatsApp que a gente confere."),{timeout:8000});
  };
  if(!temEntrega(estado)) return null;
  if(!raio||!centro) return null;   // dentro do horário, mas sem área definida
  const km=(raio/1000).toFixed(1).replace(".",",");
  return(
    <div style={{marginTop:12,padding:"12px 14px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:12}}>
      <div className="fb" style={{fontSize:12.5,color:T.ink,lineHeight:1.5}}>
        🛵 <b>Nossa entrega chega a {km} km</b> a partir desta loja, das {faixaHorario(estado)}.
      </div>
      {/* Fora do horário a informação CONTINUA na tela — quem chega de
          madrugada precisa saber que existe entrega e qual é a área. Só ganha
          o aviso de que agora não é hora; o bloqueio do pedido é do totem. */}
      {/* Loja fechada manda em tudo: sem porta aberta não há entrega, retirada
          nem iFood — mesmo que a janela de entrega já tenha começado (domingo
          abre ao meio-dia e a janela abre às 11h). */}
      {(!lojaAberta||!noHorario(estado))&&(
        <div className="fb" style={{fontSize:11.5,color:T.inkSoft,marginTop:6,lineHeight:1.45}}>
          {lojaAberta
            ? <>Agora estamos fora do horário de entrega — dá para retirar na loja{loja.ifood?" ou pedir pelo iFood":""}.</>
            : <>Agora estamos fora do horário — a loja está fechada e a entrega, o iFood e a retirada voltam no próximo horário de funcionamento.</>}
        </div>
      )}
      <button onClick={conferir} className="fm" style={{marginTop:9,fontSize:9.5,letterSpacing:"0.12em",textTransform:"uppercase",background:"transparent",color:T.pistacheDark,border:`1px solid ${T.pistacheDark}`,borderRadius:999,padding:"8px 14px",cursor:"pointer"}}>
        Entrega no meu endereço?
      </button>
      {msg&&<div className="fb" style={{fontSize:11.5,color:T.inkSoft,marginTop:8}}>{msg}</div>}
      {res&&(res.dentro?(
        <div role="status" style={{marginTop:8}}>
          <div className="fb" style={{fontSize:12.5,lineHeight:1.5,color:T.pistacheDark,fontWeight:700}}>
            Sim! Você está a {res.km} km da loja — dentro da nossa área de entrega.
          </div>
          {/* Confirmar a área e não ter para onde ir era um beco sem saída: quem
              descobre que é atendido precisa do caminho do pedido ali mesmo. Só
              aparece com a loja ABERTA e dentro da janela — porta fechada não
              entrega, mesmo que a janela de entrega já tenha começado. */}
          {lojaAberta&&noHorario(estado)&&
            <a href={PEDIR_URL} target="_blank" rel="noopener" onClick={()=>tk("Entrega · Dentro da área · Pedir · "+loja.nome)}
              className="fm" style={{display:"inline-block",marginTop:9,fontSize:9.5,letterSpacing:"0.12em",textTransform:"uppercase",background:T.pistacheDark,color:T.surface,border:"none",borderRadius:999,padding:"9px 15px",textDecoration:"none"}}>
              Pedir com entrega
            </a>}
        </div>
      ):(
        <div role="status" style={{marginTop:8}}>
          <div className="fb" style={{fontSize:12.5,color:T.inkSoft,lineHeight:1.5}}>
            Você está a {res.km} km, fora da nossa entrega própria.{lojaAberta?" Dá para retirar na loja — ou receber pelo iFood:":" A loja está fechada agora; volte no horário de funcionamento para retirar ou pedir pelo iFood."}
          </div>
          {lojaAberta&&loja.ifood&&<a href={loja.ifood} target="_blank" rel="noopener" onClick={()=>tk("Entrega · Fora de área · iFood · "+loja.nome)}
            className="fm" style={{display:"inline-block",marginTop:9,fontSize:9.5,letterSpacing:"0.12em",textTransform:"uppercase",background:T.ink,color:T.bg,border:"none",borderRadius:999,padding:"9px 15px",textDecoration:"none"}}>
            Pedir pelo iFood
          </a>}
        </div>
      ))}
    </div>
  );
}

/* Selo de entrega grátis — aceso pelo admin do TOTEM, jamais por aqui. */
function FaixaEntregaGratis({cfg}){
  useMinuto();
  if(!cfg) return null;
  const fonte=cfg.lojas||cfg.stores||cfg;
  const lista=Array.isArray(fonte)?fonte:Object.values(fonte).filter(v=>v&&typeof v==="object");
  const gratis=lista.find(e=>temEntrega(e)&&(e.gratis??e.entregaGratis??e.free));
  if(!gratis) return null;
  const texto=String(gratis.texto||gratis.selo||"Entrega grátis").slice(0,60);
  return(
    <div className="rise fb" role="status" style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:9,
      background:T.ink,color:T.bg,border:"1px solid #C9A24A",borderRadius:999,padding:"11px 18px",marginTop:14,
      fontSize:13,fontWeight:600,letterSpacing:"0.01em",textAlign:"center",animationDelay:"210ms"}}>
      <Sparkles size={15} aria-hidden="true" style={{color:"#C9A24A",flexShrink:0}}/>
      <span>{texto}</span>
    </div>
  );
}

function bannersDe({onTabelas,onPitch,onParceria,onDelivery,onEventos,onVagas}){
  return{
    studio:{img:"/banners/studio.webp",as:"a",href:"https://totem.bentogelateria.com/meu-studio",tkName:"Bentô Meu Studio · Abrir",
      alt:"Bentô Meu Studio — crie uma pequena edição personalizada de Bentôlés com sabor e rótulo comemorativo"},
    bytes:{img:"/banners/bytes.webp",as:"a",href:"/bytes/",target:"_blank",tkName:"Lançamento · BentôBytes",
      alt:"BentôBytes — sabores especiais em edição limitada: Pistache Perfeito, Chocolate Dubai e Opereta"},
    tabelas:{img:"/banners/tabelas.webp",action:onTabelas,tkName:"Tabelas Nutricionais",
      alt:"Tabelas nutricionais — gelatos, picolés, monte seu pote e quiz de sabores"},
    // Canal de pedido da casa: abre a escolha de loja e de lá segue para o
    // nosso /pedir (entrega pela nossa equipe ou retirada, pagamento no Pix).
    // O antigo banner "Delivery / Nos encontre" saiu junto com o iFood — os
    // endereços seguem na seção "Venha nos visitar", no fim da home.
    cardapio:{img:"/banners/cardapio.webp",action:onDelivery,tkName:"Entrega própria e retirada",
      alt:"Entrega própria e retirada em loja — peça no site e escolha como receber"},
    eventos:{img:"/banners/eventos.webp",action:onEventos,tkName:"Nos leve para seu evento",
      alt:"Nos leve para seu evento — estrutura completa e orçamento online na hora: casamentos, festas e corporativo"},
    parceiro:{img:"/banners/parceiro.webp",action:onParceria,tkName:"Seja um parceiro",
      alt:"Seja um parceiro ou futuro franqueado — revenda e expanda a Bentô"},
    conheca:{img:"/banners/conheca.webp",action:onPitch,tkName:"Conheça a Bentô + FAQ",
      alt:"Conheça a Bentô e FAQ — nossa proposta, sabores, diferenciais e perguntas frequentes"},
    carreira:{img:"/banners/carreira.webp",action:onVagas,tkName:"Vagas · Estamos contratando",
      alt:"Trabalhe conosco — faça parte do time Bentô, veja vagas e cadastre-se"},
    // Comunidade Creator: a candidatura, a análise e o extrato moram no totem —
    // aqui é só a porta de entrada, como o Meu Studio.
    creators:{img:"/banners/creators.webp",as:"a",href:"https://totem.bentogelateria.com/creators/cadastro",target:"_blank",
      tkName:"Creators · Cadastro",
      alt:"Seja creator Bentô — candidate-se à comunidade de creators: crédito na loja, campanhas e extrato transparente"},
  };
}

/* HOME OFICIAL — o filme do atelier ao fundo + cards de vidro reais, agora
   com movimento cinematográfico de entrada/saída na rolagem (CardMotion). */
function Home({onTabelas,onPitch,onParceria,onDelivery,onEventos,onVagas,quiz,onQuizFicha,onQuizRefazer,onClube,clubeEarned}){
  const verCardapio=()=>window.open("https://totem.bentogelateria.com/pedir","_blank","noopener");
  const site=useSiteConfig();
  const ordem=ordemComConfig(useDestaqueOrdem(),site);
  const entregaEstado=useEntregaEstado();
  const BANNERS=bannersDe({onTabelas,onPitch,onParceria,onDelivery,onEventos,onVagas});
  return(
    <div className="fade">
      <FilmRail/>
      <section style={{minHeight:"calc(100svh - 64px)",maxWidth:760,margin:"0 auto",padding:"34px 20px 40px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",textAlign:"center"}}>
        {/* Hero premium — painel de vidro iOS flutuando sobre o filme do atelier.
            HeroRecede: ao rolar, o painel recua em profundidade e o filme assume. */}
        <HeroRecede>
        <div className="glass" style={{width:"100%",borderRadius:28,padding:"28px 18px 26px",display:"flex",flexDirection:"column",alignItems:"center",boxShadow:"0 24px 60px -38px rgba(35,38,25,.45)"}}>
        <div className="rise"><BentoLogo size={84}/></div>
        <h1 className="fd rise" style={{fontSize:"clamp(28px,5.2vw,48px)",lineHeight:1.04,color:T.ink,marginTop:16,fontWeight:400,letterSpacing:"-0.02em",animationDelay:"50ms"}}>
          Gelato com <em style={{color:T.pistacheDark,fontStyle:"italic"}}>propósito</em>
        </h1>
        <p className="fb rise" style={{maxWidth:400,margin:"10px auto 0",color:T.inkSoft,fontSize:13.5,lineHeight:1.6,animationDelay:"100ms"}}>
          Sobremesas funcionais com estética premium. Sem adição de açúcares, alto padrão nutricional.
        </p>
        <div className="rise" style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:20,animationDelay:"150ms"}}>
          <button onClick={()=>tk("Ver cardápio",verCardapio)} className="fb" style={{background:T.pistacheDark,color:T.surface,border:"none",borderRadius:999,padding:"12px 22px",fontSize:13,fontWeight:500,cursor:"pointer",letterSpacing:"0.01em"}}>Ver cardápio</button>
          <button onClick={()=>tk("Tabelas & sabores",onTabelas)} className="fb" style={{background:"transparent",color:T.ink,border:`1px solid ${T.border}`,borderRadius:999,padding:"12px 22px",fontSize:13,fontWeight:500,cursor:"pointer"}}>Tabelas & sabores</button>
        </div>

        {/* Clube Bentô — entrada do hub de missões/conquistas/recompensas */}
        <button onClick={()=>tk("Clube Bentô · Abrir",onClube)} className="rise hl fb" style={{display:"flex",alignItems:"center",gap:9,marginTop:14,background:T.ink,color:T.bg,border:"1px solid #C9A24A",borderRadius:999,padding:"10px 18px",fontSize:12.5,fontWeight:600,cursor:"pointer",animationDelay:"180ms"}}>
          <Sparkles size={14} style={{color:"#C9A24A"}}/>
          <span>Clube Bentô</span>
          <span className="fm" style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"#C9A24A"}}>{clubeEarned>0?`${clubeEarned}/5 conquistas`:"comece sua missão"}</span>
          <ChevronRight size={14} style={{color:"#C9A24A"}}/>
        </button>

        {/* Resultado salvo do quiz — razão de retorno */}
        {quiz&&(
          <div className="rise" style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",justifyContent:"center",marginTop:14,background:T.surface,border:`1px solid ${T.border}`,borderRadius:999,padding:"7px 9px 7px 16px",animationDelay:"200ms"}}>
            <span className="fb" style={{fontSize:12.5,color:T.inkSoft}}>Seu sabor ideal: <strong style={{color:T.pistacheDark}}>{quiz.name}</strong></span>
            <button onClick={()=>tk("Home · Quiz salvo · Ver ficha",()=>onQuizFicha(quiz.id))} className="fm" style={{fontSize:9.5,letterSpacing:"0.1em",textTransform:"uppercase",background:T.pistacheDark,color:"#fff",border:"none",borderRadius:999,padding:"7px 12px",cursor:"pointer"}}>Ver ficha</button>
            <button onClick={()=>tk("Home · Quiz salvo · Refazer",onQuizRefazer)} className="fm" style={{fontSize:9.5,letterSpacing:"0.1em",textTransform:"uppercase",background:"transparent",color:T.inkSoft,border:`1px solid ${T.border}`,borderRadius:999,padding:"7px 12px",cursor:"pointer"}}>Refazer</button>
          </div>
        )}
        </div>
        </HeroRecede>

        <FaixaEntregaGratis cfg={entregaEstado}/>

        <div style={{width:"100%",marginTop:26}}>
          {ordem.map((id,i)=>{
            const b=BANNERS[id];if(!b)return null;
            return <CardMotion key={id}><PhotoBanner full img={arteDoBanner(site,id,b.img)} alt={b.alt} delay={(60+i*45)+"ms"} priority={i===0} gap={i===0?0:52}
              {...(b.as==="a"?{as:"a",href:b.href,target:b.target,onClick:()=>tk(b.tkName)}:{onClick:()=>tk(b.tkName,b.action)})}/></CardMotion>;
          })}
        </div>

        <CardMotion style={{width:"100%"}}><VisitSection/></CardMotion>
        <CardMotion style={{width:"100%"}}><SejaBentoFinal/></CardMotion>
      </section>
    </div>
  );
}

/* ========== HOME OFICIAL — experiência-atelier (estilo oryzo) ==========
   Cenas cinematográficas (HeroStage/Anatomia/Prova de HomeAtelier.jsx) +
   TUDO que a home clássica tinha: CTAs, Clube, quiz salvo, banners na ordem
   do destaque do painel, Venha nos visitar e Seja Bentô. A clássica segue
   em /?classic. */
/* ========== CARD FINAL — REVENDA / FRANQUIA (funil /seja-bento) ==========
   Fecha a home com a chamada de conversão para quem quer revender ou abrir
   franquia: leva ao questionário adaptativo em /seja-bento (proposta sob
   medida). Selo dourado (sinal premium), ação em pistache (regra da marca:
   dourado é selo, nunca botão). */
function SejaBentoFinal(){
  return(
    <a href="/seja-bento" onClick={()=>tk("Home · Seja Bentô · Card final")}
      className="hl rise" style={{display:"block",width:"100%",marginTop:40,textDecoration:"none",
        borderRadius:24,padding:"clamp(26px,4vw,38px) clamp(20px,4vw,32px)",textAlign:"center",
        background:"rgba(255,253,247,.72)",backdropFilter:"blur(22px) saturate(170%)",WebkitBackdropFilter:"blur(22px) saturate(170%)",
        border:`1px solid ${T.accent}66`,boxShadow:"0 24px 60px -38px rgba(35,38,25,.5)"}}>
      <span className="fm" style={{fontSize:10,letterSpacing:"0.28em",textTransform:"uppercase",color:T.accentInk}}>Revenda · Franquia · Parceria</span>
      <h2 className="fd" style={{fontSize:"clamp(24px,4.6vw,34px)",color:T.ink,margin:"10px 0 8px",lineHeight:1.1}}>
        Quer crescer com a <em style={{color:T.pistacheDark,fontStyle:"italic"}}>Bentô</em>?
      </h2>
      <p className="fb" style={{fontSize:14,color:T.inkSoft,lineHeight:1.6,maxWidth:470,margin:"0 auto 18px"}}>
        Revenda em seu estabelecimento ou abra uma franquia. Responda um questionário rápido e receba uma proposta sob medida para o seu perfil.
      </p>
      <span className="fb" style={{display:"inline-flex",alignItems:"center",gap:8,background:T.pistacheDark,color:T.surface,borderRadius:999,padding:"13px 26px",fontSize:14,fontWeight:600}}>
        Responder questionário <ChevronRight size={17} strokeWidth={2}/>
      </span>
    </a>
  );
}

/* ========== VENHA NOS VISITAR (lojas + mapa, fim da home) ========== */
// Fonte única: LOJAS (src/shared.jsx) — mesma usada pelo Delivery e pelo
// banner de horários. Endereços = os do JSON-LD de SEO do index.html.
function VisitSection(){
  const site=useSiteConfig();
  // Lê o estado da entrega direto do totem: a seção é usada fora da Home,
  // então não dá para depender de prop vinda de cima.
  const entregaEstado=useEntregaEstado();
  const lojas=lojasComConfig(site);
  const[cur,setCur]=useState(lojas[0].id);
  const l=lojas.find(x=>x.id===cur)||lojas[0];
  const btn=(primary)=>({display:"inline-flex",alignItems:"center",gap:6,fontSize:11,letterSpacing:"0.14em",textTransform:"uppercase",textDecoration:"none",cursor:"pointer",borderRadius:10,padding:"10px 16px",fontWeight:600,
    background:primary?T.pistacheDark:T.surface,color:primary?T.surface:T.pistacheDark,border:`1px solid ${primary?T.pistacheDark:T.border}`});
  return(
    <div style={{width:"100%",marginTop:40}}>
      <div className="fm" style={{fontSize:10,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase",textAlign:"center"}}>Nossas lojas · Vitória-ES</div>
      <h2 className="fd" style={{fontSize:"clamp(24px,4.6vw,34px)",color:T.ink,textAlign:"center",margin:"6px 0 14px"}}>Venha nos visitar</h2>
      {/* seletor de loja */}
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:14}}>
        {lojas.map(v=>(
          <button key={v.id} onClick={()=>{setCur(v.id);tk("Visite · "+v.nome);}}
            className="fm" aria-pressed={v.id===cur}
            style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",cursor:"pointer",borderRadius:999,padding:"9px 18px",
              background:v.id===cur?T.pistacheDark:"rgba(255,253,247,.66)",color:v.id===cur?T.surface:T.pistacheDark,
              border:`1px solid ${v.id===cur?T.pistacheDark:"rgba(228,220,201,.8)"}`}}>
            {v.nome}
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:14,alignItems:"stretch"}}>
        {/* mapa — embed público do Google (sem chave), centrado no pino da loja */}
        <div style={{borderRadius:18,overflow:"hidden",border:`1px solid ${T.border}`,minHeight:300,boxShadow:"0 14px 34px -26px rgba(35,38,25,.55)"}}>
          <iframe key={l.id} title={"Mapa — Bentô "+l.nome} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${l.lat},${l.lng}&z=16&hl=pt-BR&output=embed`}
            style={{display:"block",width:"100%",height:"100%",minHeight:300,border:0}} allowFullScreen/>
        </div>
        {/* cartão da loja — vidro iOS sobre o filme */}
        <div className="glass" style={{borderRadius:18,padding:"22px 22px 20px",boxShadow:"0 14px 34px -26px rgba(35,38,25,.55)",display:"flex",flexDirection:"column",gap:12,textAlign:"left"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <h3 className="fd" style={{fontSize:22,color:T.pistacheDark,margin:0,textTransform:"uppercase",letterSpacing:"0.04em"}}>Vitória — {l.nome}</h3>
            <span className="fm" style={{fontSize:9,letterSpacing:"0.2em",background:T.accentInk,color:T.surface,borderRadius:999,padding:"5px 12px",textTransform:"uppercase"}}>Loja</span>
          </div>
          <div className="fb" style={{fontSize:14,color:T.ink,lineHeight:1.55}}>
            📍 {l.endereco||<>Bairro {l.bairro} — toque em <b>Ver no Google Maps</b> para o endereço e a rota exatos.</>}
          </div>
          <a href={"https://wa.me/"+l.zap} target="_blank" rel="noopener" onClick={()=>tk("Visite · WhatsApp")}
            className="fb" style={{fontSize:14,color:T.pistacheDark,textDecoration:"none"}}>💬 WhatsApp: <b>{l.zapLabel}</b></a>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:"4px 12px"}}>
            {l.resumo.map(([d,h])=>(
              <div key={d} className="fb" style={{fontSize:12.5,color:h==="fechado"?T.inkSoft:T.ink}}>
                <span className="fm" style={{fontSize:9,letterSpacing:"0.15em",color:T.inkSoft,textTransform:"uppercase"}}>{d}</span><br/>{h}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:"auto"}}>
            <a href={l.maps} target="_blank" rel="noopener" onClick={()=>tk("Visite · Google Maps")} className="fm" style={btn(true)}>Ver no Google Maps</a>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`} target="_blank" rel="noopener" onClick={()=>tk("Visite · Rota")} className="fm" style={btn(false)}>Como chegar</a>
            {/* Pedir online vale sempre: quem responde o que está disponível é o
                próprio totem. O iFood só aparece aqui na loja que NÃO tem entrega
                nossa — para quem tem, ele surge apenas no resultado "fora da área"
                do verificador, que é o papel combinado para o marketplace. */}
            <a href={PEDIR_URL} target="_blank" rel="noopener" onClick={()=>tk("Visite · Pedido próprio · "+l.nome)} className="fm" style={btn(false)}>Pedir online</a>
            {!temEntrega(estadoDaLoja(entregaEstado,l.id))&&l.ifood&&
              <a href={l.ifood} target="_blank" rel="noopener" onClick={()=>tk("Visite · iFood · "+l.nome)} className="fm" style={btn(false)}>iFood</a>}
          </div>
          <AreaEntrega loja={l} estado={estadoDaLoja(entregaEstado,l.id)}/>
        </div>
      </div>
    </div>
  );
}

/* ========== TABELAS (HUB DE PRODUTOS/FERRAMENTAS) ========== */

function TabelasHub({onSelect,onShakes,onPote,onQuiz,onBack,onCulpa,onGLP1}){
  const tools=[
    {title:"Gelatos",onClick:()=>onSelect("gelato"),img:"/banners/tab-gelatos.webp",alt:"Gelatos — 18 sabores, ficha nutricional completa"},
    {title:"Bentôlé",onClick:()=>onSelect("bentole"),img:"/banners/tab-bentole.webp",alt:"Bentôlé — 6 picolés, ficha por sabor"},
    {title:"Shakes",onClick:onShakes,img:"/banners/tab-shakes.webp",alt:"Shakes — 4 shakes proteicos, tabela e ingredientes"},
    {title:"Monte seu pote",onClick:onPote,img:"/banners/tab-pote.webp",alt:"Monte seu pote — combine 2 sabores, calorias e proteína"},
    {title:"Qual é o meu sabor?",onClick:onQuiz,img:"/banners/tab-quiz.webp",alt:"Qual é o meu sabor? — quiz rápido de 3 perguntas"},
    {title:"Sem culpa-ômetro",onClick:onCulpa,img:"/banners/tab-culpa.webp",alt:"Sem culpa-ômetro — quanto açúcar você economiza vs sorvete comum"},
    {title:"Tá na caneta? (GLP-1)",onClick:onGLP1,img:"/banners/tab-glp1.webp",alt:"Tá na caneta? Proteína em porção pequena pra pouco apetite — para quem usa GLP-1"},
    {title:"Mais ricos em proteína",onClick:()=>onSelect("gelato"),img:"/banners/tab-proteina.webp",alt:"Mais ricos em proteína — veja os sabores com mais proteína por porção"},
  ];
  return(
    <div className="fade">
      <section style={{maxWidth:1000,margin:"0 auto",padding:"24px 24px 40px"}}>
        <button onClick={onBack} className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.inkSoft,textTransform:"uppercase",background:"none",border:"none",display:"flex",alignItems:"center",gap:6,marginBottom:18,cursor:"pointer"}}><ArrowLeft size={13}/>Início</button>
        <div className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:8}}>Tabelas Nutricionais</div>
        <h1 className="fd" style={{fontSize:"clamp(30px,5vw,52px)",lineHeight:1,color:T.ink,fontWeight:400,letterSpacing:"-0.02em"}}>Explore os produtos</h1>
        <p className="fb" style={{fontSize:14,color:T.inkSoft,marginTop:8,maxWidth:560,lineHeight:1.5}}>Fichas nutricionais completas, calculadora de pote e o quiz de sabores.</p>

        <div style={{maxWidth:760,margin:"22px auto 0"}}>
          {tools.map((t,i)=>(
            <PhotoBanner key={t.title} full onClick={()=>tk(t.title,t.onClick)} img={t.img} alt={t.alt} delay={`${i*45}ms`}/>
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
      <div style={{background:T.bgWarm,padding:"16px 18px",borderBottom:`1px solid ${T.border}`}}>
        <div className="fm" style={{fontSize:8.5,letterSpacing:"0.18em",textTransform:"uppercase",color:T.pistacheDark}}>{s.code} · Proteico</div>
        <div className="fd" style={{fontSize:20,color:T.ink,lineHeight:1.1,marginTop:2}}>{s.name}</div>
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
            <button onClick={()=>tk("Conversão · Pedido próprio · Shakes",onDelivery)} className="fb" style={{background:T.pistacheDark,color:"#fff",border:"none",borderRadius:12,padding:"14px 26px",fontSize:15,fontWeight:600,cursor:"pointer"}}>Pedir um shake</button>
          </div>
        )}
        <p className="fb" style={{fontSize:11,color:T.inkSoft,marginTop:22,lineHeight:1.5,maxWidth:820}}>Valores <strong>calculados</strong> a partir dos rótulos oficiais do whey utilizado (por 30 g) somados aos valores da tabela <strong>TACO</strong> (UNICAMP) e <strong>USDA</strong> dos demais ingredientes. São estimativas de cálculo por porção e podem variar conforme o lote, o ponto da fruta, a marca do líquido e o tipo de whey escolhido. O leite de amêndoas usado é o sem açúcar. Não substituem a análise laboratorial do produto final.</p>
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
          {p.nutrition.addedSugars===0&&<Chip tone="good">Sem Adição de Açúcares</Chip>}
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

function ProductDetail({productId,onBack,onSelectProduct,favorites,onToggleFav,compareIds,onToggleCompare,onCulpa}){
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
                <button onClick={onToggleFav} aria-label={isFav?"Remover dos favoritos":"Adicionar aos favoritos"} style={{background:isFav?"#FFEDED":T.bgWarm,border:`1px solid ${isFav?"#E8A0A0":T.border}`,borderRadius:"50%",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",color:isFav?"#C04040":T.inkSoft}}><Heart size={14} fill={isFav?"#C04040":"none"}/></button>
                <button onClick={onToggleCompare} style={{background:inCmp?"#E5EBD3":T.bgWarm,border:`1px solid ${inCmp?T.pistacheDark:T.border}`,borderRadius:"50%",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",color:inCmp?T.pistacheDark:T.inkSoft}}><Scale size={14}/></button>
              </div>
              <div className="fm" style={{fontSize:9,letterSpacing:"0.28em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:6}}>{product.category==="gelato"?"Gelato · Vitrine":"Picolé · Bentôlé"}</div>
              <h1 className="fd" style={{fontSize:"clamp(26px,4vw,42px)",lineHeight:1,color:T.ink,fontWeight:400,letterSpacing:"-0.015em"}}>{product.name}</h1>
              {product.sub&&<p className="fb" style={{fontSize:13,color:T.inkSoft,marginTop:6}}>{product.sub}</p>}
              <div style={{display:"flex",justifyContent:"center",margin:"18px 0"}}><ProductArt product={product} size={210}/></div>
              <p className="fb" style={{fontSize:13.5,color:T.inkSoft,lineHeight:1.6}}>{product.description}</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",marginTop:14}}>{product.moods.map(m=><MoodChip key={m} mood={m}/>)}</div>
              <div className="hd" style={{margin:"16px 0"}}/>
              {/* Alegações nutricionais — nomenclatura RDC 54/2012 (açúcares, proteína, fibras) */}
              <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
                <Chip tone={product.flags.gluten?"warn":"good"}>{product.flags.gluten?"Contém Glúten":"Não Contém Glúten"}</Chip>
                {!product.flags.lactose&&<Chip tone="good">Zero Lactose</Chip>}
                {sugarClaim(product)&&<Chip tone="good">Sem Adição de Açúcares</Chip>}
                {claim&&<Chip tone="good">{claim}</Chip>}
                {n.fiber*100/product.serving>=6?<Chip tone="good">Alto Teor de Fibras</Chip>:n.fiber*100/product.serving>=3?<Chip tone="good">Fonte de Fibras</Chip>:null}
              </div>
              {/* Frase complementar OBRIGATÓRIA junto à alegação (RDC 54/2012) quando há açúcares próprios */}
              {sugarClaim(product)?.note&&(
                <p className="fb" style={{fontSize:11,color:T.inkSoft,fontStyle:"italic",marginTop:8,lineHeight:1.4}}>{sugarClaim(product).note}</p>
              )}
              {onCulpa&&product.category==="gelato"&&(
                <button onClick={()=>tk("Ficha · Sem culpa-ômetro",onCulpa)} className="fm no-print" style={{marginTop:14,fontSize:9.5,letterSpacing:"0.14em",textTransform:"uppercase",background:"transparent",color:T.pistacheDark,border:`1px solid ${T.pistacheDark}`,borderRadius:999,padding:"9px 16px",cursor:"pointer"}}>Sem culpa-ômetro · vs sorvete comum →</button>
              )}
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
                <p className="fb" style={{fontSize:10.5,color:T.inkSoft,lineHeight:1.5}}>*Percentual de valores diários fornecidos pela porção (dieta de 2.000 kcal — IN 75/2020).</p>
                <p className="fb" style={{fontSize:10,color:T.inkSoft,lineHeight:1.5,marginTop:4}}>Tabela nutricional conforme <strong>RDC 429/2020</strong> e <strong>IN 75/2020</strong> · alegações nutricionais conforme <strong>RDC 54/2012</strong> (ANVISA).</p>
                {product.hasPolyols&&(
                <p className="fb" style={{fontSize:10.5,color:"#6B5010",lineHeight:1.5,marginTop:6,paddingTop:6,borderTop:`1px dashed #D4B840`}}>
                  Contém polióis. <strong>{AVISO_POLIOL}</strong> <span style={{opacity:.75}}>(RDC 727/2022, art. 25)</span>
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
// Assinatura do cliente: só o TOKEN vem na URL — o contrato vem do servidor.
const AssinaturaPage = lazy(() => import("./AssinaturaPage.jsx"));

const PrivacidadePage = lazy(() => import("./PrivacidadePage.jsx"));


const TermosPage = lazy(() => import("./TermosPage.jsx"));
const PortfolioPage = lazy(() => import("./PortfolioPage.jsx"));
const TrabalhePage = lazy(() => import("./TrabalhePage.jsx"));

/* ========== SEM CULPA-ÔMETRO ========== */
// Referência: sorvete de massa tradicional (média de mercado), por 100 g.

// Intro "Sem culpa" ao entrar nas Tabelas: comparativo Bentô × sorvete comum (números reais, 1x por sessão).
function TabelasIntro({onClose}){
  // Card de campanha (arte estática em /banners/push-culpa.webp). Ambas as ações
  // do design ("Pular ✕" e "Ver as fichas →") fecham o modal — um alvo único.
  // Números impressos na arte: Pistache 60 g · 0 g açúcar adic. · 10 g proteína ·
  // 130 kcal — manter em sincronia com src/data.js ao regravar a arte.
  return(
    <div className="fade" role="dialog" aria-modal="true" aria-label="Bentô comparado ao sorvete comum" onClick={onClose} style={{position:"fixed",inset:0,zIndex:250,background:"rgba(31,35,23,0.55)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
      <button className="rise gn" onClick={onClose} aria-label="Bentô × sorvete comum: sem adição de açúcares e quase 5 vezes mais proteína. Toque para ver as fichas." style={{background:"none",border:"none",padding:0,cursor:"pointer",maxWidth:520,width:"100%"}}>
        <img src="/banners/push-culpa.webp" alt="" width={1120} height={1400} style={{display:"block",width:"100%",height:"auto",maxHeight:"92dvh",objectFit:"contain",borderRadius:20,boxShadow:"0 24px 60px rgba(31,35,23,.35)"}}/>
      </button>
    </div>
  );
}


/* ========== MINIS FLUTUANTES (casquinhas e picolés gerados por IA) ==========
   Imagens premium geradas via gpt-image-1 com fundo TRANSPARENTE
   (public/treats/*.webp, 14-18KB cada), vagando em parallax ENTRE o
   filme de fundo e os cards (z -1, depois do WorldFundo no DOM): cada
   mini tem velocidade, giro, profundidade (blur) e opacidade próprios;
   recicla ao sair da tela — a rolagem comanda (sempre ativa); só o
   balanço ocioso respeita reduced-motion. aria-hidden, sem hit. */
const TREAT_CFG=[
  // [asset, esq%, topo(vh), tam, parallax, rotBase, blur, opacidade]
  ["picole-pistache",    4,  18, 52, .16, -14, 0,   .62],
  ["casquinha-morango", 86,  34, 60, .24,  10, 0,   .68],
  ["picole-morango",    79,  70, 40, .10,  18, 1.2, .5 ],
  ["casquinha-creme",    7,  92, 44, .20,  -8, .8,  .56],
  ["picole-morango",    89, 118, 54, .14,   6, 0,   .62],
  ["casquinha-pistache", 3, 142, 36, .27, -16, 1.4, .46],
  ["picole-pistache",   82, 168, 48, .19,  12, .6,  .56],
  ["casquinha-pistache",10, 190, 56, .12,  -6, 0,   .62],
];
function FloatingTreats(){
  const ref=useRef(null);
  const[reduced]=useState(()=>{try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches;}catch{return false;}});
  useEffect(()=>{
    const root=ref.current;if(!root)return;
    const els=[...root.children];
    let raf=0,alive=true;
    const paint=(now)=>{
      const sy=window.scrollY,vh=window.innerHeight;
      const span=vh+300;
      els.forEach((el,i)=>{
        const c=TREAT_CFG[i];
        let y=(c[2]/100)*vh - sy*c[4];
        y=((y%span)+span)%span-150;                       // recicla verticalmente
        const bob=reduced?0:Math.sin(now/1500+i*1.7)*6;   // respiração ociosa
        const rot=c[5]+sy*0.012*(i%2?1:-1);               // giro preso ao scroll
        el.style.transform=`translate3d(0,${(y+bob).toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg)`;
      });
    };
    if(reduced){
      // sem bob não há animação autônoma: atualiza só por evento (Codex #195)
      const on=()=>{if(!raf)raf=requestAnimationFrame((n)=>{raf=0;paint(n);});};
      window.addEventListener("scroll",on,{passive:true});
      window.addEventListener("resize",on);
      paint(0);
      return()=>{window.removeEventListener("scroll",on);window.removeEventListener("resize",on);if(raf)cancelAnimationFrame(raf);};
    }
    const loop=(now)=>{
      if(!alive)return;
      if(!document.hidden)paint(now);
      raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(loop);
    return()=>{alive=false;cancelAnimationFrame(raf);};
  },[reduced]);
  return(
    <div ref={ref} aria-hidden="true" style={{position:"fixed",inset:0,zIndex:-1,pointerEvents:"none",overflow:"hidden"}}>
      {TREAT_CFG.map((c,i)=>(
        <div key={i} style={{position:"absolute",top:0,left:c[1]+"%",width:c[3],opacity:c[7],filter:c[6]?`blur(${c[6]}px)`:undefined,willChange:"transform"}}>
          <img src={`/treats/${c[0]}.webp`} alt="" loading="lazy" decoding="async" style={{display:"block",width:"100%",height:"auto"}}/>
        </div>
      ))}
    </div>
  );
}

/* ========== PUSH DE CAMPANHA — ENTREGA GRÁTIS (home, 1x por sessão) ==========
   Substitui o push da vaga de Social Media, encerrado.
   Só aparece quando o TOTEM diz que há entrega grátis ativa — o site não
   anuncia promoção por conta própria. Desligou lá, some daqui (até 15s, que é
   o cache do endpoint). O texto é DOM sobre a arte, não está queimado na
   imagem: muda sem depender de gerar arte nova.
   Tocar leva ao pedido; o ✕ dispensa e não volta na mesma sessão. */
function EntregaPush({site}){
  useMinuto();
  const cfg=useEntregaEstado();
  const pc=(site&&site.push)||null;
  const[open,setOpen]=useState(false);
  const gratis=(()=>{
    if(!cfg) return null;
    const fonte=cfg.lojas||cfg.stores||cfg;
    const lista=Array.isArray(fonte)?fonte:Object.values(fonte).filter(v=>v&&typeof v==="object");
    return lista.find(e=>entregaAgora(e)&&(e.gratis??e.entregaGratis??e.free))||null;
  })();
  // O painel decide QUAL push aparece. "entrega" continua amarrado ao totem:
  // só abre se houver entrega grátis de verdade. "lancamento" é texto livre da
  // equipe e não depende de estado nenhum. "nenhum" desliga.
  const tipo=pc?pc.tipo:"entrega";
  const mostra=tipo==="lancamento"?true:(tipo==="entrega"?!!gratis:false);
  useEffect(()=>{
    if(!mostra) return;
    try{ if(sessionStorage.getItem("bento:push:"+tipo)) return; }catch{/* */}
    const t=setTimeout(()=>{
      try{ sessionStorage.setItem("bento:push:"+tipo,"1"); }catch{/* */}
      setOpen(true);
    },2600);
    return()=>clearTimeout(t);
  },[mostra,tipo]);
  const fechar=useCallback(()=>setOpen(false),[]);
  // cruzou as 20h (ou desligaram o grátis) com o push aberto: ele se recolhe
  useEffect(()=>{ if(!mostra) setOpen(false); },[mostra]);
  return open?<EntregaPushModal onClose={fechar} pc={pc}/>:null;
}
// Arte padrão por tipo de push: a cena de entrega só serve ao push de entrega.
// Num "lancamento" sem imagem escolhida no painel, a sacola seria fora de assunto.
const ARTE_PUSH={entrega:{src:"/banners/push-entrega.webp",w:1400,h:842},
                 lancamento:{src:"/banners/cardapio.webp",w:1600,h:686}};
function EntregaPushModal({onClose:fechar,pc}){
  useModal(fechar);
  const arte=ARTE_PUSH[(pc&&pc.tipo)]||ARTE_PUSH.entrega;
  const t={etiqueta:(pc&&pc.etiqueta)||"Por tempo limitado",
           titulo:(pc&&pc.titulo)||"Entrega grátis em Vitória",
           linha:(pc&&pc.linha)||"Praia do Canto e região. Peça pelo site e a entrega é por nossa conta.",
           botao:(pc&&pc.botao)||"Pedir agora →",
           href:(pc&&pc.href)||PEDIR_URL,
           imagem:(pc&&pc.imagem)||arte.src};
  const ir=()=>{ tk("Push · "+t.titulo); try{window.open(t.href,"_blank","noopener");}catch{/* */} fechar(); };
  return(
    <div className="fade no-print" role="dialog" aria-modal="true" aria-label={t.titulo} onClick={fechar}
      style={{position:"fixed",inset:0,zIndex:420,background:"rgba(31,35,23,0.55)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
      <div className="rise" style={{position:"relative",maxWidth:430,width:"100%"}} onClick={(e)=>e.stopPropagation()}>
        <button onClick={ir} className="fb" style={{display:"block",width:"100%",padding:0,border:"none",cursor:"pointer",textAlign:"left",
          borderRadius:22,overflow:"hidden",background:T.surface,boxShadow:"0 24px 60px rgba(31,35,23,.35)"}}>
          <span style={{display:"block",position:"relative"}}>
            <img src={t.imagem} width={arte.w} height={arte.h} alt=""
              style={{display:"block",width:"100%",height:"auto",objectFit:"cover"}}/>
          </span>
          <span style={{display:"block",padding:"18px 20px 20px",background:T.ink,color:T.bg}}>
            <span className="fm" style={{display:"block",fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",color:"#C9A24A"}}>{t.etiqueta}</span>
            <span className="fd" style={{display:"block",fontFamily:"'Fraunces',Georgia,serif",fontSize:26,lineHeight:1.15,fontWeight:600,marginTop:8}}>
              {t.titulo}
            </span>
            <span className="fb" style={{display:"block",fontSize:13.5,color:"#CFC9B4",marginTop:7,lineHeight:1.5}}>
              {t.linha}
            </span>
            <span className="fb" style={{display:"inline-block",marginTop:14,background:"#C9A24A",color:T.ink,borderRadius:999,padding:"11px 20px",fontSize:14,fontWeight:700}}>
              {t.botao}
            </span>
          </span>
        </button>
        <button onClick={fechar} aria-label="Fechar"
          style={{position:"absolute",top:10,right:10,width:38,height:38,borderRadius:"50%",border:"none",cursor:"pointer",
            background:"rgba(31,35,23,.55)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"}}>
          <X size={19}/>
        </button>
      </div>
    </div>
  );
}

/* ========== HORÁRIOS DAS LOJAS (banner flutuante) ========== */
// derivado da fonte única LOJAS (src/shared.jsx) — dias/resumo vivem lá
// derivado da fonte única LOJAS, com o horário do painel por cima quando houver
const horariosDe=(cfg)=>lojasComConfig(cfg).map(l=>({loja:l.nome,dias:l.dias,resumo:l.resumo}));
function StoreHours(){
  const site=useSiteConfig();
  const[open,setOpen]=useState(false);
  const{wd,cur}=useMemo(()=>nowSP(),[]);
  const HORARIOS=useMemo(()=>horariosDe(site),[site]);
  const anyOpen=HORARIOS.some(s=>abertaAgora(s.dias,wd,cur));
  return(
    <div className="no-print" style={{position:"fixed",right:16,bottom:16,zIndex:130,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10,maxWidth:"calc(100vw - 32px)"}}>
      {open&&(
        <div className="rise" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,boxShadow:"0 26px 64px -30px rgba(35,38,25,.55)",padding:"16px 18px",width:308,maxWidth:"calc(100vw - 32px)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div className="fm" style={{fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",color:T.pistacheDark}}>Horários das lojas</div>
            <button onClick={()=>setOpen(false)} aria-label="Fechar" style={{background:"none",border:"none",color:T.inkSoft,cursor:"pointer",lineHeight:0,padding:0}}><X size={16}/></button>
          </div>
          {HORARIOS.map(s=>{const ab=abertaAgora(s.dias,wd,cur);return(
            <div key={s.loja} style={{padding:"11px 0",borderTop:`1px solid ${T.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                <div className="fd" style={{fontSize:15.5,color:T.ink}}>{s.loja}</div>
                <span className="fm" style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:700,color:ab?"#2E7D32":"#A46A6A",background:ab?"#E7F1E4":"#F3E9E7",borderRadius:999,padding:"3px 9px"}}>{ab?"Aberta agora":"Fechada"}</span>
              </div>
              <div style={{marginTop:6}}>
                {s.resumo.map(([d,h])=>(
                  <div key={d} className="fb" style={{display:"flex",justifyContent:"space-between",fontSize:12.5,padding:"2px 0"}}>
                    <span style={{color:T.inkSoft}}>{d}</span>
                    <span style={{color:h==="fechado"?T.inkSoft:T.ink,fontWeight:h==="fechado"?400:500}}>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          );})}
          <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:8,lineHeight:1.4}}>Vitória/ES · fusos e feriados podem variar.</div>
        </div>
      )}
      <button onClick={()=>setOpen(o=>!o)} aria-label="Horários das lojas" className="fb hl" style={{display:"flex",alignItems:"center",gap:9,background:T.pistacheDark,color:"#fff",border:"none",borderRadius:999,padding:"12px 18px",fontSize:13.5,fontWeight:600,cursor:"pointer",boxShadow:"0 16px 32px -14px rgba(70,88,58,.65)"}}>
        <Clock size={16}/>
        <span>Horários</span>
        <span style={{width:9,height:9,borderRadius:"50%",background:anyOpen?"#8BE79A":"#E4A6A6",boxShadow:anyOpen?"0 0 0 3px rgba(139,231,154,.28)":"none"}}/>
      </button>
    </div>
  );
}

/* ========== CONQUISTAS (selos locais, sem backend) ========== */
const BADGES=[
  {id:"sommelier",icon:Target,title:"Sommelier Bentô",desc:"Completou o quiz de sabor"},
  {id:"explorador",icon:Search,title:"Explorador",desc:"Viu 5 fichas de sabores"},
  {id:"colecionador",icon:Heart,title:"Colecionador",desc:"Guardou 3 favoritos"},
  {id:"mestre-pote",icon:Beaker,title:"Mestre do Pote",desc:"Montou um pote com 20g+ de proteína"},
  {id:"sem-culpa",icon:Sparkles,title:"Sem Culpa",desc:"Compartilhou a Bentô no story"},
];

export default function App(){
  const[assinar]=useState(()=>{ // link do cliente ?assinar=<token>
    try{ return new URLSearchParams(window.location.search).get("assinar")||null; }catch{ return null; }
  });
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
  const[showCardapio,setShowCardapio]=useState(()=>{try{return new URLSearchParams(window.location.search).has("cardapio");}catch{return false;}});
  const[showRevenda,setShowRevenda]=useState(false);
  const[showParceria,setShowParceria]=useState(()=>{try{const p=new URLSearchParams(window.location.search);return p.has("parceria")||p.has("franquia");}catch{return false;}});
  // Pedido próprio: só a loja Praia do Canto atende online hoje, então não há
  // escolha de loja — o botão leva direto para a tela de pedido.
  // bentogelateria.com/pedir é o link curto (redirect no vercel.json).
  // Todo caminho de pedido do site vai DIRETO para a tela de pedido. Já existiu
  // aqui um seletor de loja, e ele saiu: o /pedir já pergunta a loja e se é
  // entrega ou retirada, então o seletor fazia o cliente responder duas vezes a
  // mesma coisa. Se um dia precisar de escolha antes, ela tem de substituir a
  // pergunta do totem — não somar a ela.
  const abrirPedido=useCallback(()=>{ tk("Pedido · Abriu tela de pedido"); try{window.open(PEDIR_URL,"_blank","noopener");}catch{/* */} },[]);
  const[showFaq,setShowFaq]=useState(false);
  const[showCulpa,setShowCulpa]=useState(false);
  const[showGLP1,setShowGLP1]=useState(false);
  const[showEventos,setShowEventos]=useState(()=>{try{return new URLSearchParams(window.location.search).has("eventos");}catch{return false;}});
  const[compareIds,setCmpIds]=useState(()=>{try{return JSON.parse(localStorage.getItem("bento:cmp")||"[]");}catch{return[];}});
  useEffect(()=>{try{localStorage.setItem("bento:cmp",JSON.stringify(compareIds));}catch{}},[compareIds]);
  const[tabIntro,setTabIntro]=useState(()=>{try{return !sessionStorage.getItem("bento:tabIntro");}catch{return true;}});
  const fecharTabIntro=useCallback(()=>{setTabIntro(false);try{sessionStorage.setItem("bento:tabIntro","1");}catch{}},[]);
  const[favorites,setFavs]=useState(()=>{try{return JSON.parse(localStorage.getItem("bento:favs")||"[]");}catch{return[];}});
  useEffect(()=>{try{localStorage.setItem("bento:favs",JSON.stringify(favorites));}catch{}},[favorites]);
  const[showFavs,setShowFavs]=useState(false);
  // Último resultado do quiz — persiste e vira card "Seu sabor" na home (razão de retorno).
  const[quizResult,setQuizResult]=useState(()=>{try{return JSON.parse(localStorage.getItem("bento:quiz")||"null");}catch{return null;}});
  useEffect(()=>{try{quizResult?localStorage.setItem("bento:quiz",JSON.stringify(quizResult)):localStorage.removeItem("bento:quiz");}catch{}},[quizResult]);
  // Conquistas: persistem em localStorage; modais disparam window event "bento:achieve".
  const[badges,setBadges]=useState(()=>{try{return JSON.parse(localStorage.getItem("bento:badges")||"[]");}catch{return[];}});
  const[toastBadge,setToastBadge]=useState(null);
  const awardBadge=useCallback((id)=>{
    setBadges(prev=>{
      if(prev.includes(id))return prev;
      const b=BADGES.find(x=>x.id===id); if(!b)return prev;
      const next=[...prev,id];
      try{localStorage.setItem("bento:badges",JSON.stringify(next));}catch{}
      tk("Conquista · "+b.title);
      setToastBadge(b); setTimeout(()=>setToastBadge(null),3800);
      return next;
    });
  },[]);
  useEffect(()=>{const h=(e)=>awardBadge(e.detail);window.addEventListener("bento:achieve",h);return()=>window.removeEventListener("bento:achieve",h);},[awardBadge]);
  useEffect(()=>{if(favorites.length>=3)awardBadge("colecionador");},[favorites,awardBadge]);
  const[culpaProdId,setCulpaProdId]=useState(null);
  const[showClube,setShowClube]=useState(false);
  // Indique-e-ganhe: guarda ?amigo=CODE e um id anônimo do visitante (dedupe da indicação).
  useEffect(()=>{try{
    const c=new URLSearchParams(window.location.search).get("amigo");
    if(c)localStorage.setItem("bento:amigo",c.toUpperCase().replace(/[^A-Z0-9]/g,""));
    if(!localStorage.getItem("bento:vid"))localStorage.setItem("bento:vid",((crypto&&crypto.randomUUID)?crypto.randomUUID():String(Math.random()).slice(2)+Date.now().toString(36)));
  }catch{/* */}},[]);
  const registrarIndicacao=useCallback(()=>{try{
    const amigo=localStorage.getItem("bento:amigo");
    if(!amigo||localStorage.getItem("bento:amigo:ok"))return;
    fetch("/api/clube",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"indicacao",ref:amigo,visitor:localStorage.getItem("bento:vid")||""}),keepalive:true})
      .then(r=>r.json()).then(j=>{if(j&&j.ok){localStorage.setItem("bento:amigo:ok","1");tk("Clube · Indicação registrada");}}).catch(()=>{});
  }catch{/* */}},[]);
  // Onboarding do Clube: 1 toast de boas-vindas com a primeira missão (1x por pessoa).
  useEffect(()=>{
    try{
      if(localStorage.getItem("bento:clube:hello"))return;
      localStorage.setItem("bento:clube:hello","1");
      const t=setTimeout(()=>{setToastBadge({icon:Sparkles,kicker:"Clube Bentô",title:"Primeira missão: descubra seu sabor ideal"});setTimeout(()=>setToastBadge(null),5200);},1800);
      return()=>clearTimeout(t);
    }catch{/* */}
  },[]);
  useEffect(()=>{window.scrollTo(0,0);},[view,productId]);
  // Algum overlay aberto? (inclui os que abrem por querystring: ?cardapio,
  // ?eventos, ?delivery, ?parceria…) Usado para não empilhar o push de campanha.
  const siteCfg=useSiteConfig();
  useVisual(siteCfg);
  const overlayAberto=showQuiz||showCmp||showFavs||showClube||showPote||showPitch||showCardapio||showParceria||showRevenda||showFaq||showCulpa||showGLP1||showEventos;
  const goHome=useCallback(()=>{setView("home");setCat(null);setProd(null);},[]);
  const openCat=useCallback((c)=>{setCat(c);setView("list");},[]);
  const openProd=useCallback((id)=>{const p=PRODUCTS.find(x=>x.id===id);if(p){setCat(p.category);tk("Sabor · "+p.name);try{const n=(Number(localStorage.getItem("bento:fichas"))||0)+1;localStorage.setItem("bento:fichas",String(n));if(n>=5)awardBadge("explorador");}catch{}}setProd(id);setView("detail");},[awardBadge]);
  const backList=useCallback(()=>{setView(category?"list":"home");setProd(null);},[category]);
  const toggleCmp=useCallback((id)=>setCmpIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<3?[...prev,id]:prev),[]);
  const toggleFav=useCallback((id)=>setFavs(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]),[]);
  // A assinatura vem ANTES do contrato interno: se as duas chaves vierem na URL,
  // vale a do cliente, que é a que carrega o texto congelado do servidor.
  if(assinar) return(<><GStyle/><Suspense fallback={null}><AssinaturaPage token={assinar}/></Suspense></>);
  if(contrato) return(<><GStyle/><Suspense fallback={null}><ContratoPage data={contrato}/></Suspense></>);
  if(privacidade) return(<><GStyle/><Suspense fallback={null}><PrivacidadePage/></Suspense></>);
  if(termos) return(<><GStyle/><Suspense fallback={null}><TermosPage/></Suspense></>);
  if(portfolio) return(<><GStyle/><Suspense fallback={null}><PortfolioPage/></Suspense></>);
  if(vagas) return(<><GStyle/><Suspense fallback={null}><TrabalhePage/></Suspense></>);
  return(
    <div className="shell fb gn" style={{background:view==="home"?"transparent":T.bg,color:T.ink}}>
      <GStyle/>
      {/* filme 3D do atelier atrás dos cards da home (rolagem = tempo do filme) */}
      {view==="home"&&<WorldFundo/>}
      {view==="home"&&<FloatingTreats/>}
      <Header onHome={goHome} compareCount={compareIds.length} onOpenCompare={()=>setShowCmp(true)} onQuiz={()=>setShowQuiz(true)} favorites={favorites} onOpenFavs={()=>{tk("Favoritos · Abrir coleção");setShowFavs(true);}}/>
      {view==="home"&&(<Home onTabelas={()=>setView("tabelas")} onPitch={()=>setShowPitch(true)} onCardapio={()=>setShowCardapio(true)} onParceria={()=>setShowParceria(true)} onDelivery={abrirPedido} onFaq={()=>setShowFaq(true)} onEventos={()=>setShowEventos(true)} onVagas={()=>{window.location.href="/?vagas";}} quiz={quizResult&&PRODUCTS.some(p=>p.id===quizResult.id)?quizResult:null} onQuizFicha={openProd} onQuizRefazer={()=>setShowQuiz(true)} onClube={()=>setShowClube(true)} clubeEarned={badges.length}/>)}
      {view==="tabelas"&&<TabelasHub onSelect={openCat} onSelectProduct={openProd} onShakes={()=>{tk("Tabelas · Shakes");setView("shakes");}} onPote={()=>tk("Conversão · Monte seu pote",()=>setShowPote(true))} onQuiz={()=>setShowQuiz(true)} onBack={goHome} onCulpa={()=>setShowCulpa(true)} onGLP1={()=>setShowGLP1(true)}/>}
      {view==="tabelas"&&tabIntro&&<TabelasIntro onClose={fecharTabIntro}/>}
      {view==="shakes"&&<ShakesPage onBack={()=>setView("tabelas")} onDelivery={abrirPedido}/>}
      {view==="list"&&<ProductList category={category} onBack={()=>setView("tabelas")} onSelectProduct={openProd} compareIds={compareIds} onToggleCompare={toggleCmp} onOpenCompare={()=>setShowCmp(true)}/>}
      {view==="detail"&&<ProductDetail productId={productId} onBack={backList} onSelectProduct={openProd} favorites={favorites} onToggleFav={()=>toggleFav(productId)} compareIds={compareIds} onToggleCompare={()=>toggleCmp(productId)} onCulpa={()=>{setCulpaProdId(productId);setShowCulpa(true);}}/>}
      <Suspense fallback={null}>
      {showQuiz&&<QuizModal onClose={()=>setShowQuiz(false)} onResult={(id)=>{tk("Conversão · Quiz concluído");setShowQuiz(false);openProd(id);}} onDelivery={()=>{setShowQuiz(false);abrirPedido();}} onSaved={(r)=>{setQuizResult(r);awardBadge("sommelier");registrarIndicacao();}}/>}
      {showCmp&&<CompareModal ids={compareIds} onClose={()=>setShowCmp(false)} onViewProduct={openProd}/>}
      {showFavs&&<FavoritesModal ids={favorites} onClose={()=>setShowFavs(false)} onViewProduct={(id)=>{setShowFavs(false);openProd(id);}} onCompare={(ids)=>{setCmpIds(ids);setShowFavs(false);setShowCmp(true);}} onDelivery={()=>{setShowFavs(false);abrirPedido();}} onToggleFav={toggleFav} badgeList={BADGES.map(b=>({id:b.id,icon:b.icon,title:b.title,desc:b.desc,earned:badges.includes(b.id)}))}/>}
      {showClube&&(()=>{
        const albumCount=(()=>{try{return JSON.parse(localStorage.getItem("bento:album")||"[]").length;}catch{return 0;}})();
        const fichasN=(()=>{try{return Number(localStorage.getItem("bento:fichas"))||0;}catch{return 0;}})();
        const missions=[
          {t:"Descubra seu sabor ideal (quiz)",done:!!quizResult,go:()=>{setShowClube(false);setShowQuiz(true);}},
          {t:"Explore 5 fichas de sabores",done:fichasN>=5||badges.includes("explorador"),go:()=>{setShowClube(false);setView("tabelas");}},
          {t:"Guarde 3 sabores favoritos",done:favorites.length>=3,go:()=>{setShowClube(false);setView("tabelas");}},
          {t:"Monte um pote com 20g+ de proteína",done:badges.includes("mestre-pote"),go:()=>{setShowClube(false);setShowPote(true);}},
          {t:"Compartilhe a Bentô no story",done:badges.includes("sem-culpa"),go:()=>{setShowClube(false);setShowCulpa(true);}},
          {t:"Complete o álbum da Copa (10 figurinhas)",done:albumCount>=10,go:()=>{window.open("https://totem.bentogelateria.com/album","_blank","noopener");}},
        ];
        const onMerged=(st)=>{
          if(!st)return;
          if(Array.isArray(st.badges)&&st.badges.length)setBadges(prev=>{const nx=[...new Set([...prev,...st.badges.filter(id=>BADGES.some(b=>b.id===id))])];try{localStorage.setItem("bento:badges",JSON.stringify(nx));}catch{}return nx;});
          if(st.quiz&&st.quiz.id&&PRODUCTS.some(p=>p.id===st.quiz.id))setQuizResult(prev=>(!prev||((st.quiz.ts||0)>=(prev.ts||0)))?st.quiz:prev);
          if(Array.isArray(st.album)&&st.album.length){try{const cur=JSON.parse(localStorage.getItem("bento:album")||"[]");localStorage.setItem("bento:album",JSON.stringify([...new Set([...cur,...st.album])]));}catch{}}
          if(st.fichas){try{const cur=Number(localStorage.getItem("bento:fichas"))||0;localStorage.setItem("bento:fichas",String(Math.max(cur,Number(st.fichas)||0)));}catch{}}
          if(Array.isArray(st.favs)&&st.favs.length)setFavs(prev=>[...new Set([...prev,...st.favs.filter(id=>PRODUCTS.some(p=>p.id===id))])]);
        };
        return <ClubeBento onClose={()=>setShowClube(false)} quiz={quizResult&&PRODUCTS.some(p=>p.id===quizResult.id)?quizResult:null} albumCount={albumCount} missions={missions} onMerged={onMerged} badgeList={BADGES.map(b=>({id:b.id,icon:b.icon,title:b.title,desc:b.desc,earned:badges.includes(b.id)}))}/>;
      })()}
      {showPote&&<PoteBuilder onClose={()=>setShowPote(false)} onDelivery={()=>{setShowPote(false);abrirPedido();}}/>}
      {showPitch&&<PitchDeck onClose={()=>setShowPitch(false)} onCatalog={()=>{setShowPitch(false);openCat("gelato");}} onFaq={()=>{setShowPitch(false);setShowFaq(true);}}/>}
      {showCardapio&&<CardapioDigital onClose={()=>setShowCardapio(false)}/>}
      {showParceria&&<SejaParceiro onClose={()=>setShowParceria(false)} onForm={()=>setShowRevenda(true)}/>}
      {showRevenda&&<SejaBento onClose={()=>setShowRevenda(false)}/>}
            {showFaq&&<FaqModal onClose={()=>setShowFaq(false)}/>}
      {showCulpa&&<CulpaModal productId={culpaProdId} onClose={()=>{setShowCulpa(false);setCulpaProdId(null);}} onDelivery={()=>{setShowCulpa(false);abrirPedido();}}/>}
      {showGLP1&&<GLP1Modal onClose={()=>setShowGLP1(false)} onSelectProduct={(id)=>{setShowGLP1(false);openProd(id);}} onTabelas={()=>{setShowGLP1(false);setView("tabelas");}} onDelivery={()=>{setShowGLP1(false);abrirPedido();}}/>}
      {showEventos&&<EventosModal onClose={()=>setShowEventos(false)}/>}
      </Suspense>
      <footer className="no-print" style={{maxWidth:1152,margin:"0 auto",padding:"24px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",borderTop:`1px solid ${T.border}`,background:view==="home"?"rgba(246,241,231,.7)":"transparent",backdropFilter:view==="home"?"blur(18px) saturate(150%)":undefined,WebkitBackdropFilter:view==="home"?"blur(18px) saturate(150%)":undefined}}>
        <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>Bentô · Functional Nutrition · ES · BR</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
          <button onClick={()=>tk("Rodapé · Pedido próprio",abrirPedido)} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.pistacheDark,textTransform:"uppercase",cursor:"pointer",background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>Pedir</button>
          <button onClick={()=>tk("Rodapé · Cardápio",()=>setShowCardapio(true))} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.pistacheDark,textTransform:"uppercase",cursor:"pointer",background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>Cardápio</button>
          <button onClick={()=>tk("Rodapé · Seja Bentô",()=>setShowParceria(true))} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.pistacheDark,textTransform:"uppercase",cursor:"pointer",background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>Seja Bentô</button>
          <a href="/?vagas" onClick={()=>tk("Rodapé · Vagas")} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.pistacheDark,textTransform:"uppercase",textDecoration:"none",background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>Trabalhe conosco</a>
          <button onClick={()=>tk("Rodapé · Conheça a Bentô",()=>setShowPitch(true))} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.pistacheDark,textTransform:"uppercase",cursor:"pointer",background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>Conheça a Bentô</button>
          <a href="/tabela-nutricional.csv" download onClick={()=>tk("Download CSV")} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase",textDecoration:"none",background:"transparent",border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>Tabela (CSV)</a>
          <a href="/?privacidade=1" className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase",textDecoration:"none",background:"transparent",border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>Privacidade</a>
          <a href="/?termos=1" className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase",textDecoration:"none",background:"transparent",border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>Termos</a>
          <a href="/?portfolio=1" onClick={()=>tk("Rodapé · Portfólio")} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase",textDecoration:"none",background:"transparent",border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>Portfólio</a>
        </div>
        <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>v4.1 · Clean Label</div>
        <div style={{width:"100%",borderTop:`1px solid ${T.border}`,paddingTop:12,marginTop:4}}>
          <p className="fb" style={{fontSize:10,color:T.inkSoft,lineHeight:1.5,margin:0,textAlign:"center"}}>© {new Date().getFullYear()} ABB Gelateria Ltda · Bentô Gelatos — CNPJ 61.590.463/0001-45. Todos os direitos reservados. Conteúdo, layout e marca protegidos (Leis 9.610/98 e 9.279/96); cópia ou reprodução proibida. Veja os <a href="/?termos=1" style={{color:T.pistacheDark,textDecoration:"underline"}}>Termos</a>.</p>
        </div>
      </footer>
      {toastBadge&&(()=>{const TI=toastBadge.icon;return(
        <div className="rise no-print" role="status" style={{position:"fixed",top:74,left:"50%",transform:"translateX(-50%)",zIndex:400,display:"flex",alignItems:"center",gap:10,background:T.ink,color:T.bg,border:"1px solid #C9A24A",borderRadius:999,padding:"10px 18px",boxShadow:"0 18px 40px -18px rgba(0,0,0,.5)",maxWidth:"calc(100vw - 30px)"}}>
          {TI?<TI size={16} style={{color:"#C9A24A",flexShrink:0}}/>:null}
          <div style={{textAlign:"left",minWidth:0}}>
            <div className="fm" style={{fontSize:8.5,letterSpacing:"0.18em",textTransform:"uppercase",color:"#C9A24A"}}>{toastBadge.kicker||"Conquista desbloqueada"}</div>
            <div className="fb" style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{toastBadge.title}</div>
          </div>
        </div>
      );})()}
      {/* o push nunca monta sobre outro overlay: dois useModal disputariam o Esc
          (fechando o modal de baixo junto) e a arte cobriria o conteúdo aberto.
          Com todos fechados, o timer recomeça e o push aparece normalmente. */}
      {view==="home"&&!overlayAberto&&<EntregaPush site={siteCfg}/>}
      <StoreHours/>
      <Analytics/>
    </div>
  );
}
