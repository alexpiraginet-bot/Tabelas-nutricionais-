import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { ArrowLeft, ChevronRight, Search, Leaf, Beaker, Filter, Heart, Scale, X, Sparkles, Target, Printer, Clock } from "lucide-react";
import { PRODUCTS, SHAKES, AVISO_POLIOL, MOOD_META, QUIZ, ALLERGENS, PODE_CONTER, lupaFrontal, proteinClaim } from "./data.js";
import { Analytics } from "@vercel/analytics/react";
import { track } from "@vercel/analytics";
import { tk, T, DECK_URL, BentoLogo, GelatoSVG, PicoleSVG, ProductArt, MoodChip, Chip, MacroBar, useModal, onImgErr, IMG_FB, VD, br, orderIngredients } from "./shared.jsx";

/* ===== Modais e overlays: carregados sob demanda (code-split) ===== */
const QuizModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.QuizModal })));
const CompareModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.CompareModal })));
const FavoritesModal = lazy(() => import("./modals.jsx").then(m => ({ default: m.FavoritesModal })));
const ClubeBento = lazy(() => import("./modals.jsx").then(m => ({ default: m.ClubeBento })));
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

function Header({onHome,compareCount,onOpenCompare,onQuiz,favorites,onOpenFavs}){
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
  "/banners/bytes.webp":[1600,686],"/banners/tabelas.webp":[1600,686],"/banners/delivery.webp":[1600,686],
  "/banners/cardapio.webp":[1600,686],"/banners/eventos.webp":[1600,686],
  "/banners/parceiro.webp":[1600,533],"/banners/conheca.webp":[1600,533],"/banners/carreira.webp":[1600,533],
  "/banners/tab-gelatos.webp":[1600,533],"/banners/tab-bentole.webp":[1600,533],"/banners/tab-shakes.webp":[1600,533],
  "/banners/tab-pote.webp":[1600,533],"/banners/tab-quiz.webp":[1600,533],"/banners/tab-culpa.webp":[1600,533],
  "/banners/tab-glp1.webp":[1600,533],"/banners/tab-proteina.webp":[1600,533],
};

/* Banner grande — família visual única: superfície creme, borda fina bege,
   foto real à esquerda (40%) + informação à direita (60%), selo dourado fosco
   e seta discreta. Sem gradientes/bordas coloridas: "luxo silencioso". */
function PhotoBanner({as="button",href,target,onClick,img,imgPos,selo,title,sub,delay,full,alt,priority}){
  const common={width:"100%",display:"flex",alignItems:"stretch",textAlign:"left",background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,overflow:"hidden",cursor:"pointer",marginTop:14,boxShadow:"0 14px 34px -26px rgba(35,38,25,.55)",padding:0,minHeight:full?0:112,textDecoration:"none"};
  const d=BANNER_DIMS[img];
  // Modo "full": a própria arte já traz selo, título, subtítulo e seta — imagem cobre o card todo.
  const inner=full?(
    <img src={img} alt={alt||title||""} width={d&&d[0]} height={d&&d[1]} loading={priority?"eager":"lazy"} fetchpriority={priority?"high":undefined} decoding={priority?"auto":"async"} onError={onImgErr} style={{display:"block",width:"100%",height:"auto"}}/>
  ):(
    <>
      <div style={{flexBasis:"40%",maxWidth:"40%",flexShrink:0,alignSelf:"stretch",position:"relative",overflow:"hidden"}}>
        <img src={img} alt="" aria-hidden="true" loading="lazy" onError={onImgErr}
          style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:imgPos||"center"}}/>
      </div>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",justifyContent:"center",padding:"15px 8px 15px 18px"}}>
        {selo&&<span className="fm" style={{display:"inline-block",alignSelf:"flex-start",fontSize:8.5,letterSpacing:"0.22em",textTransform:"uppercase",color:T.accent,background:"transparent",border:`1px solid ${T.accent}`,borderRadius:999,padding:"3px 11px",marginBottom:8}}>{selo}</span>}
        <div className="fd" style={{fontSize:"clamp(18px,3vw,22px)",color:T.pistacheDark,lineHeight:1.08,letterSpacing:"-0.01em"}}>{title}</div>
        <div className="fb" style={{fontSize:12.5,color:T.inkSoft,marginTop:4,lineHeight:1.4}}>{sub}</div>
      </div>
      <span aria-hidden="true" style={{display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,alignSelf:"center",margin:"0 14px 0 4px",width:34,height:34,borderRadius:"50%",background:T.pistacheDark,color:T.surface}}><ChevronRight size={18} strokeWidth={2}/></span>
    </>
  );
  if(as==="a") return <a href={href} target={target} rel="noopener" onClick={onClick} className="hl rise" style={{...common,animationDelay:delay}}>{inner}</a>;
  return <button onClick={onClick} className="hl rise" style={{...common,animationDelay:delay}}>{inner}</button>;
}

function Home({onTabelas,onCardapio,onPitch,onParceria,onDelivery,onFaq,onEventos,onVagas,quiz,onQuizFicha,onQuizRefazer,onClube,clubeEarned}){
  const verCardapio=()=>window.open("https://totem.bentogelateria.com/pedir","_blank","noopener");
  return(
    <div className="fade">
      <section style={{minHeight:"calc(100svh - 64px)",maxWidth:760,margin:"0 auto",padding:"34px 20px 40px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",textAlign:"center"}}>
        {/* Hero premium */}
        <div className="rise"><BentoLogo size={84}/></div>
        <h1 className="fd rise" style={{fontSize:"clamp(28px,5.2vw,48px)",lineHeight:1.04,color:T.ink,marginTop:16,fontWeight:400,letterSpacing:"-0.02em",animationDelay:"50ms"}}>
          Gelato com <em style={{color:T.pistacheDark,fontStyle:"italic"}}>propósito</em>
        </h1>
        <p className="fb rise" style={{maxWidth:400,margin:"10px auto 0",color:T.inkSoft,fontSize:13.5,lineHeight:1.6,animationDelay:"100ms"}}>
          Sobremesas funcionais com estética premium. Zero açúcar adicionado, alto padrão nutricional.
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

        <div style={{width:"100%",marginTop:34}}>
          {/* Álbum Digital da Copa — card clicável (link externo, nova aba) */}
          <a href="https://totem.bentogelateria.com/album" target="_blank" rel="noopener" onClick={()=>tk("Álbum da Copa")}
            aria-label="Acesse o álbum digital da Copa Bentô" className="hl rise"
            style={{display:"block",overflow:"hidden",borderRadius:18,border:`1px solid ${T.border}`,boxShadow:"0 14px 34px -26px rgba(35,38,25,.55)",textDecoration:"none"}}>
            <img src="/buttons/album-copa-card.webp" alt="Acesse o álbum digital da Copa Bentô — colecione os 10 sabores oficiais"
              width={1600} height={800} loading="eager" fetchpriority="high" onError={onImgErr}
              style={{display:"block",width:"100%",height:"auto"}}/>
          </a>
          <AlbumProgress/>

          {/* BentôBytes — arte completa (selo, título, ícones e seta já na imagem) */}
          <PhotoBanner full as="a" href="/bytes/" target="_blank" onClick={()=>tk("Lançamento · BentôBytes")}
            img="/banners/bytes.webp" alt="BentôBytes — sabores especiais em edição limitada: Pistache Perfeito, Chocolate Dubai e Opereta"
            delay="60ms"/>

          {/* Tabelas nutricionais — arte completa (selo, título, ícones e seta já na imagem) */}
          <PhotoBanner full onClick={()=>tk("Tabelas Nutricionais",onTabelas)}
            img="/banners/tabelas.webp" alt="Tabelas nutricionais — gelatos, picolés, monte seu pote e quiz de sabores"
            delay="80ms"/>

          {/* Cardápio / Entrega própria + Retirada — arte completa · ação comercial principal */}
          <PhotoBanner full as="a" href="https://totem.bentogelateria.com/pedir" target="_blank" onClick={()=>tk("Cardápio")}
            img="/banners/cardapio.webp" alt="Entrega própria e retirada em loja — peça no site e escolha como receber"
            delay="120ms"/>

          {/* Delivery / Nos encontre — arte completa (selo, título, ícones e seta já na imagem) */}
          <PhotoBanner full onClick={()=>tk("Delivery / Nos encontre",onDelivery)}
            img="/banners/delivery.webp" alt="Delivery / Nos encontre — peça no iFood ou veja onde estamos: Praia do Canto e Jardim Camburi"
            delay="150ms"/>

          {/* Eventos — arte completa (selo, título, ícones e seta já na imagem) */}
          <PhotoBanner full onClick={()=>tk("Nos leve para seu evento",onEventos)}
            img="/banners/eventos.webp" alt="Nos leve para seu evento — estrutura completa e orçamento online na hora: casamentos, festas e corporativo"
            delay="200ms"/>

          {/* Seja um parceiro — arte completa (selo, título, ícones e seta já na imagem) */}
          <PhotoBanner full onClick={()=>tk("Seja um parceiro",onParceria)}
            img="/banners/parceiro.webp" alt="Seja um parceiro ou futuro franqueado — revenda e expanda a Bentô"
            delay="250ms"/>

          {/* Conheça a Bentô + FAQ — acesso único: abre o "Conheça" e de lá leva às Dúvidas */}
          <PhotoBanner full onClick={()=>tk("Conheça a Bentô + FAQ",onPitch)}
            img="/banners/conheca.webp" alt="Conheça a Bentô e FAQ — nossa proposta, sabores, diferenciais e perguntas frequentes"
            delay="300ms"/>

          {/* Carreira — arte completa (selo, título, ícones e seta já na imagem) · último card */}
          <PhotoBanner full onClick={()=>tk("Vagas · Estamos contratando",onVagas)}
            img="/banners/carreira.webp" alt="Trabalhe conosco — faça parte do time Bentô, veja vagas e cadastre-se"
            delay="430ms"/>
        </div>
      </section>
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
            <button onClick={()=>tk("Conversão · iFood · Shakes",onDelivery)} className="fb" style={{background:T.pistacheDark,color:"#fff",border:"none",borderRadius:12,padding:"14px 26px",fontSize:15,fontWeight:600,cursor:"pointer"}}>Pedir um shake no iFood</button>
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
              <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
                <Chip tone={product.flags.gluten?"warn":"good"}>{product.flags.gluten?"Contém Glúten":"Não Contém Glúten"}</Chip>
                {!product.flags.lactose&&<Chip tone="good">Zero Lactose</Chip>}
                {n.addedSugars===0&&<Chip tone="good">Sem Açúcar Adicionado</Chip>}
                {claim&&<Chip tone="good">{claim}</Chip>}
                {n.fiber>=5&&<Chip tone="good">Alto em Fibras</Chip>}
              </div>
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

/* ========== HORÁRIOS DAS LOJAS (banner flutuante) ========== */
// dias: 0=Dom … 6=Sáb · [abre, fecha] em horas (24h) · null = fechado
const HORARIOS=[
  {loja:"Praia do Canto", dias:{0:[12,17],1:[10,19],2:[8,20],3:[8,20],4:[8,20],5:[8,20],6:[10,20]},
    resumo:[["Seg","10h–19h"],["Ter a Sex","08h–20h"],["Sáb","10h–20h"],["Dom","12h–17h"]]},
  {loja:"Jardim Camburi", dias:{0:[12,17],1:null,2:[11,19],3:[11,19],4:[11,19],5:[11,19],6:[12,20]},
    resumo:[["Seg","fechado"],["Ter a Sex","11h–19h"],["Sáb","12h–20h"],["Dom","12h–17h"]]},
];
function nowSP(){
  try{
    const p=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Sao_Paulo",weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());
    const wd={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[p.find(x=>x.type==="weekday").value];
    const h=+p.find(x=>x.type==="hour").value, m=+p.find(x=>x.type==="minute").value;
    return {wd, cur:h+m/60};
  }catch{ const d=new Date(); return {wd:d.getDay(), cur:d.getHours()+d.getMinutes()/60}; }
}
const abertaAgora=(dias,wd,cur)=>{ const r=dias[wd]; return !!(r&&cur>=r[0]&&cur<r[1]); };
function StoreHours(){
  const[open,setOpen]=useState(false);
  const{wd,cur}=useMemo(()=>nowSP(),[]);
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

/* ========== PROGRESSO DO ÁLBUM DA COPA (autodeclarado, localStorage) ========== */
function AlbumProgress(){
  const[got,setGot]=useState(()=>{try{return JSON.parse(localStorage.getItem("bento:album")||"[]");}catch{return[];}});
  const[open,setOpen]=useState(false);
  useEffect(()=>{try{localStorage.setItem("bento:album",JSON.stringify(got));}catch{}},[got]);
  const toggle=(n)=>{setGot(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n]);};
  const done=got.length;
  return(
    <div className="rise" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,marginTop:8,padding:"10px 14px",animationDelay:"90ms"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span className="fm" style={{fontSize:9.5,letterSpacing:"0.14em",textTransform:"uppercase",color:T.pistacheDark,whiteSpace:"nowrap"}}>Meu álbum</span>
        <div style={{flex:1,height:7,background:T.bgWarm,borderRadius:999,overflow:"hidden"}} role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={10} aria-label={`Álbum da Copa: ${done} de 10 figurinhas`}>
          <div style={{height:"100%",width:`${done*10}%`,background:`linear-gradient(90deg,${T.accent},${T.pistacheDark})`,transition:"width .4s cubic-bezier(.2,.8,.2,1)"}}/>
        </div>
        <span className="fm" style={{fontSize:11,color:T.ink,fontWeight:600,whiteSpace:"nowrap"}}>{done}/10</span>
        <button onClick={()=>{setOpen(o=>!o);if(!open)tk("Álbum · Marcar figurinhas");}} className="fm" style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",background:open?T.pistacheDark:"transparent",color:open?"#fff":T.pistacheDark,border:`1px solid ${open?T.pistacheDark:T.border}`,borderRadius:999,padding:"6px 11px",cursor:"pointer",whiteSpace:"nowrap"}}>{open?"Pronto":"Marcar"}</button>
      </div>
      {open&&(
        <div style={{marginTop:10}}>
          <div className="fb" style={{fontSize:11,color:T.inkSoft,marginBottom:8}}>Toque nas figurinhas que você já colecionou:</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
            {Array.from({length:10},(_,i)=>i+1).map(n=>{const on=got.includes(n);return(
              <button key={n} onClick={()=>toggle(n)} aria-pressed={on} aria-label={`Figurinha ${n}${on?" colecionada":""}`} className="fm" style={{width:34,height:34,borderRadius:"50%",border:`2px solid ${on?T.accent:T.border}`,background:on?T.pistacheDark:T.bg,color:on?"#F2E7C8":T.inkSoft,fontSize:12,fontWeight:700,cursor:"pointer"}}>{n}</button>
            );})}
          </div>
        </div>
      )}
      {done===10&&<div className="fb" style={{fontSize:11.5,color:T.pistacheDark,fontWeight:600,textAlign:"center",marginTop:8}}>Álbum completo! Mostre na loja e comemore com a gente.</div>}
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
  const[showCardapio,setShowCardapio]=useState(()=>{try{return new URLSearchParams(window.location.search).has("cardapio");}catch{return false;}});
  const[showRevenda,setShowRevenda]=useState(false);
  const[showParceria,setShowParceria]=useState(()=>{try{const p=new URLSearchParams(window.location.search);return p.has("parceria")||p.has("franquia");}catch{return false;}});
  const[showDelivery,setShowDelivery]=useState(()=>{try{return new URLSearchParams(window.location.search).has("delivery");}catch{return false;}});
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
  const goHome=useCallback(()=>{setView("home");setCat(null);setProd(null);},[]);
  const openCat=useCallback((c)=>{setCat(c);setView("list");},[]);
  const openProd=useCallback((id)=>{const p=PRODUCTS.find(x=>x.id===id);if(p){setCat(p.category);tk("Sabor · "+p.name);try{const n=(Number(localStorage.getItem("bento:fichas"))||0)+1;localStorage.setItem("bento:fichas",String(n));if(n>=5)awardBadge("explorador");}catch{}}setProd(id);setView("detail");},[awardBadge]);
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
      <Header onHome={goHome} compareCount={compareIds.length} onOpenCompare={()=>setShowCmp(true)} onQuiz={()=>setShowQuiz(true)} favorites={favorites} onOpenFavs={()=>{tk("Favoritos · Abrir coleção");setShowFavs(true);}}/>
      {view==="home"&&<Home onTabelas={()=>setView("tabelas")} onPitch={()=>setShowPitch(true)} onCardapio={()=>setShowCardapio(true)} onParceria={()=>setShowParceria(true)} onDelivery={()=>setShowDelivery(true)} onFaq={()=>setShowFaq(true)} onEventos={()=>setShowEventos(true)} onVagas={()=>{window.location.href="/?vagas";}} quiz={quizResult&&PRODUCTS.some(p=>p.id===quizResult.id)?quizResult:null} onQuizFicha={openProd} onQuizRefazer={()=>setShowQuiz(true)} onClube={()=>setShowClube(true)} clubeEarned={badges.length}/>}
      {view==="tabelas"&&<TabelasHub onSelect={openCat} onSelectProduct={openProd} onShakes={()=>{tk("Tabelas · Shakes");setView("shakes");}} onPote={()=>tk("Conversão · Monte seu pote",()=>setShowPote(true))} onQuiz={()=>setShowQuiz(true)} onBack={goHome} onCulpa={()=>setShowCulpa(true)} onGLP1={()=>setShowGLP1(true)}/>}
      {view==="tabelas"&&tabIntro&&<TabelasIntro onClose={fecharTabIntro}/>}
      {view==="shakes"&&<ShakesPage onBack={()=>setView("tabelas")} onDelivery={()=>{setShowDelivery(true);}}/>}
      {view==="list"&&<ProductList category={category} onBack={()=>setView("tabelas")} onSelectProduct={openProd} compareIds={compareIds} onToggleCompare={toggleCmp} onOpenCompare={()=>setShowCmp(true)}/>}
      {view==="detail"&&<ProductDetail productId={productId} onBack={backList} onSelectProduct={openProd} favorites={favorites} onToggleFav={()=>toggleFav(productId)} compareIds={compareIds} onToggleCompare={()=>toggleCmp(productId)} onCulpa={()=>{setCulpaProdId(productId);setShowCulpa(true);}}/>}
      <Suspense fallback={null}>
      {showQuiz&&<QuizModal onClose={()=>setShowQuiz(false)} onResult={(id)=>{tk("Conversão · Quiz concluído");setShowQuiz(false);openProd(id);}} onDelivery={()=>{setShowQuiz(false);setShowDelivery(true);}} onSaved={(r)=>{setQuizResult(r);awardBadge("sommelier");}}/>}
      {showCmp&&<CompareModal ids={compareIds} onClose={()=>setShowCmp(false)} onViewProduct={openProd}/>}
      {showFavs&&<FavoritesModal ids={favorites} onClose={()=>setShowFavs(false)} onViewProduct={(id)=>{setShowFavs(false);openProd(id);}} onCompare={(ids)=>{setCmpIds(ids);setShowFavs(false);setShowCmp(true);}} onDelivery={()=>{setShowFavs(false);setShowDelivery(true);}} onToggleFav={toggleFav} badgeList={BADGES.map(b=>({icon:b.icon,title:b.title,desc:b.desc,earned:badges.includes(b.id)}))}/>}
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
        return <ClubeBento onClose={()=>setShowClube(false)} quiz={quizResult&&PRODUCTS.some(p=>p.id===quizResult.id)?quizResult:null} albumCount={albumCount} missions={missions} badgeList={BADGES.map(b=>({icon:b.icon,title:b.title,desc:b.desc,earned:badges.includes(b.id)}))}/>;
      })()}
      {showPote&&<PoteBuilder onClose={()=>setShowPote(false)} onDelivery={()=>{setShowPote(false);setShowDelivery(true);}}/>}
      {showPitch&&<PitchDeck onClose={()=>setShowPitch(false)} onCatalog={()=>{setShowPitch(false);openCat("gelato");}} onFaq={()=>{setShowPitch(false);setShowFaq(true);}}/>}
      {showCardapio&&<CardapioDigital onClose={()=>setShowCardapio(false)}/>}
      {showParceria&&<SejaParceiro onClose={()=>setShowParceria(false)} onForm={()=>setShowRevenda(true)}/>}
      {showRevenda&&<SejaBento onClose={()=>setShowRevenda(false)}/>}
      {showDelivery&&<DeliveryModal onClose={()=>setShowDelivery(false)}/>}
      {showFaq&&<FaqModal onClose={()=>setShowFaq(false)}/>}
      {showCulpa&&<CulpaModal productId={culpaProdId} onClose={()=>{setShowCulpa(false);setCulpaProdId(null);}} onDelivery={()=>{setShowCulpa(false);setShowDelivery(true);}}/>}
      {showGLP1&&<GLP1Modal onClose={()=>setShowGLP1(false)} onSelectProduct={(id)=>{setShowGLP1(false);openProd(id);}} onTabelas={()=>{setShowGLP1(false);setView("tabelas");}} onDelivery={()=>{setShowGLP1(false);setShowDelivery(true);}}/>}
      {showEventos&&<EventosModal onClose={()=>setShowEventos(false)}/>}
      </Suspense>
      <footer className="no-print" style={{maxWidth:1152,margin:"0 auto",padding:"24px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",borderTop:`1px solid ${T.border}`}}>
        <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.inkSoft,textTransform:"uppercase"}}>Bentô · Functional Nutrition · ES · BR</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
          <button onClick={()=>tk("Rodapé · Delivery",()=>setShowDelivery(true))} className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.pistacheDark,textTransform:"uppercase",cursor:"pointer",background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 12px"}}>Delivery</button>
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
      <StoreHours/>
      <Analytics/>
    </div>
  );
}

