/* ============================================================================
   PROTÓTIPO DE MOVIMENTO — Bentô Gelatos
   Página isolada (entrada própria no build): não é linkada no site, não entra
   no bundle da home. Serve para o dono avaliar, no iPhone, o que Framer Motion
   + as diretrizes da skill UI/UX Pro Max mudam de fato.

   Decisões de movimento (guia da skill, §7):
   · tokens únicos de duração/easing (motion-consistency);
   · entra com ease-out, sai com ease-in e ~62% do tempo (exit-faster-than-enter);
   · mola de verdade nos gestos (spring-physics);
   · escalonamento de 40 ms entre irmãos (stagger-sequence);
   · só transform e opacity (transform-performance) — zero reflow;
   · transição de elemento compartilhado entre grade e detalhe (shared-element);
   · tudo interrompível: um toque no meio da animação cancela (interruptible).

   Acessibilidade: alvos ≥44 px (§2), foco visível (§1), modal com Esc + fundo
   clicável (§9 modal-escape), ícones em SVG e nunca emoji (§4 no-emoji-icons).

   Reduzir Movimento (iOS): política já firmada neste projeto — o que é
   comandado pela ROLAGEM continua (é gesto do usuário, como o próprio scroll);
   o que anima sozinho vira estado final imediato, e a transição de elemento
   compartilhado troca por dissolve. Nada some da tela.
   ========================================================================== */
import { useEffect, useRef, useState } from "react";
import {
  LazyMotion, domMax, m, AnimatePresence,
  useScroll, useTransform, useSpring, useReducedMotion, useMotionValue,
} from "framer-motion";
// Ícones escolhidos DENTRO do conjunto que o site já importa (Leaf, Target,
// Search, ChevronRight, X, Clock): assim o protótipo não acrescenta um byte
// sequer ao chunk compartilhado do site. "ChevronLeft" é o mesmo glifo
// espelhado — mantém a família e o traço idênticos (§4 icon-style-consistent).
import { Leaf, Target, Search, ChevronRight, X, Clock } from "lucide-react";
import { T, M, TYPE } from "./tokens.js";
import { VITRINE, TRILHO, CENAS, LOJAS_RESUMO } from "./dados.js";

/* ---------- textura de grão: profundidade sem custo de rede ---------- */
const GRAO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.34'/%3E%3C/svg%3E\")";

/* Poster de 32 px do hero embutido no bundle: pinta a cor certa no primeiro
   frame, antes de qualquer byte de imagem chegar (sem clarão branco). */
const HERO_POSTER = "data:image/webp;base64,UklGRtIAAABXRUJQVlA4IMYAAABwBQCdASogABUAPwFusFErJiSisBgIAWAgCWMAtOsuWqj8aBU2/bJc2Jn1N71qV/CtfuWgAP7hP6MQfAqzzPL4ikRHJJnzv3Hj8gvGrDedtDAl/2aXrcJT6g7jj5G/fjtpGqQ/kRE8jBBqM11LVsoym2X+IapYJWDTqP2Z5BOO7zxI7HvI1/P6PbVZd+zUZpmewaKNnwtuaeHI5OuSPVfUwbziJNZHmF6ofPzA4zubDc9zLFdHbLPdGdyDFSAO1m5KHvt1AAA=";

/* ---------- etiqueta de seção: ajuda o dono a avaliar cada demo ---------- */
function Etiqueta({ n, titulo, observar }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="fm" style={{ ...TYPE.label, color: T.accent }}>{n}</span>
        <span aria-hidden="true" style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${T.accent}66,transparent)` }} />
      </div>
      <h2 className="fd" style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 27, lineHeight: 1.15, fontWeight: 600, margin: "10px 0 0", letterSpacing: "-0.01em" }}>{titulo}</h2>
      <p className="fm" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: T.inkSoft, margin: "8px 0 0", lineHeight: 1.6 }}>
        ↳ {observar}
      </p>
    </div>
  );
}

/* ---------- botão com resposta de toque (§7 scale-feedback, §2 44px) ---------- */
function Botao({ children, primario = true, onClick, ...rest }) {
  return (
    <m.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={M.press}
      className="fb"
      style={{
        minHeight: 48, display: "inline-flex", alignItems: "center", gap: 9,
        padding: "13px 22px", borderRadius: 999, cursor: "pointer",
        border: primario ? "none" : `1.5px solid ${T.border}`,
        background: primario ? T.pistacheDark : T.surface,
        color: primario ? "#fff" : T.ink,
        fontSize: 15, fontWeight: 600, letterSpacing: "0.01em",
        boxShadow: primario ? "0 14px 30px -18px rgba(35,38,25,.9)" : "none",
      }}
      {...rest}
    >
      {children}
    </m.button>
  );
}

/* =========================== 01 · ABERTURA ===========================
   Fotografia full-bleed que DISSOLVE no creme da página. A queixa antiga
   ("fundo quadrado, não parece que faz parte do ambiente") morre aqui: não
   existe borda: a imagem vira gradiente e o texto nasce dentro do creme
   sólido — contraste garantido, sem véu chapado por cima da foto. */
function HeroFoto() {
  const { scrollY } = useScroll();
  // A foto sobe MENOS que a página e recua de escala: profundidade real.
  // Presa à rolagem, então continua viva com Reduzir Movimento.
  const y = useTransform(scrollY, [0, 700], [0, 130]);
  const escala = useTransform(scrollY, [0, 700], [1.06, 1]);
  const [carregou, setCarregou] = useState(false);

  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", background: T.bgWarm }}>
      {/* Poster de 32 px embutido: cor certa no primeiro frame, sem clarão */}
      <div style={{
        position: "absolute", inset: "-4%", backgroundImage: `url(${HERO_POSTER})`,
        backgroundSize: "cover", backgroundPosition: "center", filter: "blur(24px)",
        opacity: carregou ? 0 : 1, transition: "opacity .5s ease",
      }} />
      {/* Enquadramento por dispositivo. O celular recebe uma foto COMPOSTA em
          retrato (assunto no terço de cima, pedra limpa embaixo, onde o título
          mora) — não uma paisagem cortada. Foi a lição do próprio dono sobre
          renderizar para vertical. */}
      <picture>
        <source media="(max-width: 767px)" srcSet="/atelie/hero-vertical.webp" />
        <m.img
          src="/atelie/hero.webp" alt="" decoding="async" fetchpriority="high"
          onLoad={() => setCarregou(true)}
          style={{
            y, scale: escala, willChange: "transform",
            position: "absolute", inset: "-6% 0 0", width: "100%", height: "112%",
            objectFit: "cover", objectPosition: "center 38%",
            opacity: carregou ? 1 : 0, transition: "opacity .6s ease",
          }}
        />
      </picture>
      {/* A foto vira página: creme sólido embaixo, onde o texto vive */}
      {/* O creme fecha bem antes do texto começar: o título nunca disputa
          legibilidade com a foto (§1 color-contrast 4,5:1 garantido). */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(180deg,rgba(246,241,231,.20) 0%,rgba(246,241,231,.04) 30%,rgba(246,241,231,.55) 54%,rgba(246,241,231,.93) 70%,${T.bg} 78%)`,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(120% 80% at 50% 30%, transparent 45%, rgba(24,26,17,.20))",
      }} />
    </div>
  );
}

function Abertura({ reduce }) {
  // Entrada em cascata: cada elemento sobe e revela em sequência de 40 ms.
  // Com Reduzir Movimento, tudo já nasce no lugar (sem "aparecer do nada").
  const pai = {
    oculto: {},
    visivel: { transition: { staggerChildren: reduce ? 0 : M.stagger, delayChildren: reduce ? 0 : 0.1 } },
  };
  const filho = reduce
    ? { oculto: { opacity: 1, y: 0 }, visivel: { opacity: 1, y: 0 } }
    : { oculto: { opacity: 0, y: 22 }, visivel: { opacity: 1, y: 0, transition: M.enter } };

  return (
    // Envelope de largura total (a foto sangra até as bordas da tela) com o
    // texto num container de leitura por dentro. `position:relative` +
    // zIndex 1 no conteúdo garantem que ele pinte ACIMA da foto absoluta.
    <header style={{ position: "relative", overflow: "hidden" }}>
      <HeroFoto />
      <m.div
        variants={pai} initial="oculto" animate="visivel"
        style={{ position: "relative", zIndex: 1, padding: "clamp(280px,50vh,440px) 22px 54px", maxWidth: 720, margin: "0 auto" }}
      >
        <m.div variants={filho} className="fm" style={{ ...TYPE.label, color: T.pistacheDark }}>
          Protótipo · não publicado
        </m.div>

        <m.h1
          variants={filho} className="fd"
          style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: "clamp(40px,11vw,64px)", lineHeight: 1.02, fontWeight: 600, letterSpacing: "-0.025em", margin: "20px 0 0" }}
        >
          Gelato com<br />
          <span style={{ fontStyle: "italic", color: T.pistacheDark }}>propósito</span>
        </m.h1>

        <m.p variants={filho} className="fb" style={{ ...TYPE.body, color: T.inkSoft, margin: "20px 0 0", maxWidth: "34ch" }}>
          Sem adição de açúcares, rico em proteína, rótulo limpo — em Vitória-ES.
        </m.p>

        <m.div variants={filho} style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 30 }}>
          <Botao>Ver cardápio <ChevronRight size={18} strokeWidth={2.25} aria-hidden="true" /></Botao>
          <Botao primario={false}>Nossas lojas</Botao>
        </m.div>

        <m.p variants={filho} className="fm" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: T.inkSoft, marginTop: 34, lineHeight: 1.6 }}>
          ↳ role a página devagar — e depois role de volta para cima
        </m.p>
      </m.div>
    </header>
  );
}

/* =========================== 02 · PILARES =========================== */
const PILARES = [
  { Icone: Leaf, titulo: "Sem adição de açúcares", texto: "O doce vem da receita, não de açúcar por cima." },
  { Icone: Target, titulo: "Rico em proteína", texto: "Sobremesa que joga a favor do seu dia." },
  { Icone: Search, titulo: "Rótulo limpo", texto: "Ficha nutricional publicada de cada item." },
];

function Pilares({ reduce }) {
  return (
    <section style={{ padding: "40px 22px", maxWidth: 720, margin: "0 auto" }}>
      <Etiqueta n="01" titulo="Entrada em cascata" observar="os três blocos entram em sequência, não todos de uma vez — 40 ms de diferença entre eles" />
      <m.ul
        initial="oculto" whileInView="visivel" viewport={{ once: true, amount: 0.25 }}
        variants={{ visivel: { transition: { staggerChildren: reduce ? 0 : M.stagger } } }}
        style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}
      >
        {PILARES.map(({ Icone, titulo, texto }) => (
          <m.li
            key={titulo}
            variants={reduce
              ? { oculto: { opacity: 1, y: 0 }, visivel: { opacity: 1, y: 0 } }
              : { oculto: { opacity: 0, y: 26 }, visivel: { opacity: 1, y: 0, transition: M.enter } }}
            style={{
              display: "flex", gap: 14, alignItems: "flex-start",
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: "18px 18px",
            }}
          >
            <span aria-hidden="true" style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 12, background: T.bgWarm, display: "grid", placeItems: "center", color: T.pistacheDark }}>
              <Icone size={20} strokeWidth={1.75} />
            </span>
            <span>
              <span className="fb" style={{ display: "block", fontSize: 16.5, fontWeight: 700 }}>{titulo}</span>
              <span className="fb" style={{ display: "block", ...TYPE.bodySm, color: T.inkSoft, marginTop: 3 }}>{texto}</span>
            </span>
          </m.li>
        ))}
      </m.ul>
    </section>
  );
}

/* ==================== 03 · CENAS PRESAS À ROLAGEM ====================
   O pedido do dono, na letra: "as informações vão aparecendo, vão sumindo".
   A rolagem comanda o tempo — para frente E para trás, sem estado preso. */
function Cena({ cena, indice }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // Mola sobre o progresso: tira o "degrau" do scroll do iOS sem atrasar o dedo.
  const p = useSpring(scrollYProgress, { stiffness: 260, damping: 40, mass: 0.35 });

  const y = useTransform(p, [0, 0.5, 1], [80, 0, -80]);
  const escala = useTransform(p, [0, 0.5, 1], [0.9, 1, 0.93]);
  const opacidade = useTransform(p, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const giroX = useTransform(p, [0, 0.5, 1], [10, 0, -8]);
  const desloca = useTransform(p, [0, 1], [indice % 2 ? 26 : -26, indice % 2 ? -26 : 26]);

  return (
    <div ref={ref} style={{ minHeight: "78vh", display: "grid", placeItems: "center", perspective: 1000 }}>
      <m.article
        style={{
          y, scale: escala, opacity: opacidade, rotateX: giroX,
          transformStyle: "preserve-3d", willChange: "transform, opacity",
          width: "100%", background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 24, overflow: "hidden",
          boxShadow: "0 40px 80px -50px rgba(35,38,25,.7)",
        }}
      >
        <div style={{ position: "relative", aspectRatio: "3 / 2", overflow: "hidden", background: T.bgWarm }}>
          {/* A foto anda mais devagar que o card: profundidade de verdade. */}
          <m.img
            src={cena.img} alt="" aria-hidden="true" loading="lazy" decoding="async"
            style={{ y: desloca, width: "100%", height: "112%", objectFit: "cover", willChange: "transform" }}
          />
        </div>
        <div style={{ padding: "20px 20px 24px" }}>
          <span className="fm" style={{ ...TYPE.label, color: T.accent }}>{cena.etiqueta}</span>
          <h3 className="fd" style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 25, fontWeight: 600, lineHeight: 1.2, margin: "9px 0 0" }}>{cena.titulo}</h3>
          <p className="fb" style={{ ...TYPE.body, color: T.inkSoft, margin: "9px 0 0" }}>{cena.texto}</p>
        </div>
      </m.article>
    </div>
  );
}

function Cinema() {
  return (
    <section style={{ padding: "40px 22px 20px", maxWidth: 560, margin: "0 auto" }}>
      <Etiqueta n="02" titulo="Cenas que entram e saem" observar="cada card sobe, ganha foco e sai por cima; a foto anda mais devagar que a moldura. Role para trás: desfaz exatamente igual" />
      {CENAS.map((c, i) => <Cena key={c.id} cena={c} indice={i} />)}
    </section>
  );
}

/* ============ 04 · VITRINE COM ELEMENTO COMPARTILHADO ============
   O pulo do gato do Framer Motion: a mesma foto VOA da grade para o detalhe.
   É o "shared-element transition" do guia (§7) — continuidade espacial:
   o usuário nunca perde de vista de onde a tela nasceu. */
function Vitrine({ reduce }) {
  const [aberto, setAberto] = useState(null);
  const fecharRef = useRef(null);
  const item = VITRINE.find((p) => p.id === aberto);

  // Modal: Esc fecha, rolagem do fundo trava, foco vai para o botão fechar.
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => { if (e.key === "Escape") setAberto(null); };
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => fecharRef.current?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = antes;
      clearTimeout(t);
    };
  }, [aberto]);

  // Com Reduzir Movimento, o elemento não "voa": dissolve (recomendação Apple).
  const elo = (prefixo, id) => (reduce ? undefined : `${prefixo}-${id}`);

  return (
    <section style={{ padding: "40px 22px", maxWidth: 720, margin: "0 auto" }}>
      <Etiqueta n="03" titulo="A foto voa para o detalhe" observar="toque em um produto: a mesma imagem viaja da grade para a tela cheia. Toque fora, aperte Esc ou arraste para baixo para voltar" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
        {VITRINE.map((p) => (
          <m.button
            key={p.id}
            layoutId={elo("cartao", p.id)}
            onClick={() => setAberto(p.id)}
            whileTap={{ scale: 0.97 }}
            transition={M.press}
            aria-label={`Ver detalhes de ${p.nome}`}
            style={{
              // Coluna esticada: o preço vai para o rodapé do card e todos os
              // preços da linha alinham, mesmo com título de 1 ou 2 linhas.
              display: "flex", flexDirection: "column", height: "100%",
              textAlign: "left", padding: 0, cursor: "pointer",
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18,
              overflow: "hidden", minHeight: 44,
            }}
          >
            {/* Mesma proporção do detalhe (4/3): o voo da foto não distorce no
                meio do caminho — e o corte evita a tarja preta das fotos de
                embalagem, que são originalmente letterboxed. */}
            <m.div layoutId={elo("moldura", p.id)} style={{ aspectRatio: "4 / 3", overflow: "hidden", background: T.bgWarm }}>
              <m.img layoutId={elo("foto", p.id)} src={p.img} alt="" aria-hidden="true" loading="lazy" decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </m.div>
            <m.div layoutId={elo("texto", p.id)} style={{ flex: 1, display: "flex", flexDirection: "column", padding: "11px 12px 13px" }}>
              <span className="fm" style={{ ...TYPE.label, fontSize: 9.5, color: T.accent }}>{p.cat}</span>
              <span className="fb" style={{ display: "block", fontSize: 14.5, fontWeight: 700, lineHeight: 1.3, marginTop: 5 }}>{p.nome}</span>
              {/* marginTop:auto encosta o preço no rodapé — linha alinhada */}
              <span className="fb" style={{ display: "block", fontSize: 13.5, color: T.pistacheDark, fontWeight: 700, marginTop: "auto", paddingTop: 6, fontVariantNumeric: "tabular-nums" }}>R$ {p.preco}</span>
            </m.div>
          </m.button>
        ))}
      </div>

      <AnimatePresence>
        {item && (
          <m.div
            key="fundo"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: M.exit }}
            transition={M.enter}
            onClick={() => setAberto(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center",
              padding: "max(18px,env(safe-area-inset-top)) 18px max(18px,env(safe-area-inset-bottom))",
              // Véu forte o bastante para isolar o conteúdo (§ scrim 40–60%)
              background: "rgba(24,26,17,.52)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
            }}
          >
            <m.div
              layoutId={elo("cartao", item.id)}
              role="dialog" aria-modal="true" aria-label={item.nome}
              onClick={(e) => e.stopPropagation()}
              drag={reduce ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 620) setAberto(null); }}
              style={{
                width: "100%", maxWidth: 420, background: T.surface,
                border: `1px solid ${T.border}`, borderRadius: 26, overflow: "hidden",
                boxShadow: "0 50px 90px -40px rgba(0,0,0,.6)", cursor: reduce ? "default" : "grab",
              }}
            >
              <m.div layoutId={elo("moldura", item.id)} style={{ position: "relative", aspectRatio: "4 / 3", overflow: "hidden", background: T.bgWarm }}>
                <m.img layoutId={elo("foto", item.id)} src={item.img} alt={item.nome}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <m.button
                  ref={fecharRef}
                  type="button" onClick={() => setAberto(null)} aria-label="Fechar"
                  whileTap={{ scale: 0.92 }} transition={M.press}
                  initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.12 } }}
                  style={{
                    position: "absolute", top: 12, right: 12, width: 44, height: 44, borderRadius: 999,
                    display: "grid", placeItems: "center", cursor: "pointer",
                    background: "rgba(255,253,247,.94)", border: `1px solid ${T.border}`, color: T.ink,
                  }}
                >
                  <X size={19} strokeWidth={2} aria-hidden="true" />
                </m.button>
              </m.div>

              <m.div layoutId={elo("texto", item.id)} style={{ padding: "18px 20px 22px" }}>
                <span className="fm" style={{ ...TYPE.label, fontSize: 9.5, color: T.accent }}>{item.cat}</span>
                <h3 className="fd" style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 600, lineHeight: 1.2, margin: "8px 0 0" }}>{item.nome}</h3>
                <p className="fb" style={{ ...TYPE.bodySm, color: T.inkSoft, margin: "7px 0 0" }}>{item.info}</p>
                <p className="fb" style={{ fontSize: 22, fontWeight: 700, color: T.pistacheDark, margin: "14px 0 0", fontVariantNumeric: "tabular-nums" }}>R$ {item.preco}</p>
              </m.div>

              {/* Conteúdo que só existe no detalhe entra DEPOIS do voo terminar */}
              <m.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.16, ...M.enter } }}
                style={{ padding: "0 20px 22px" }}
              >
                {/* Ação REAL da marca: toda ficha nutricional é publicada.
                    Nada de botão de carrinho — o site não tem checkout. */}
                <Botao onClick={() => setAberto(null)}>Ver ficha nutricional <ChevronRight size={18} strokeWidth={2.25} aria-hidden="true" /></Botao>
              </m.div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ==================== 05 · TRILHO COM ARRASTE ====================
   Física de mola no dedo (§7 gesture-feedback) + botões visíveis, porque o
   guia proíbe função que só existe por gesto (§2 gesture-alternative). */
function Trilho({ reduce }) {
  const viewport = useRef(null);
  const faixa = useRef(null);
  const x = useMotionValue(0);
  const [limite, setLimite] = useState(0);

  useEffect(() => {
    const medir = () => {
      if (!viewport.current || !faixa.current) return;
      setLimite(Math.max(0, faixa.current.scrollWidth - viewport.current.offsetWidth));
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  const PASSO = 232;
  const andar = (dir) => {
    const alvo = Math.min(0, Math.max(-limite, x.get() - dir * PASSO));
    // animate() via style: mantemos a mola do próprio motion value
    x.stop();
    const inicio = x.get(), delta = alvo - inicio, t0 = performance.now();
    const dur = reduce ? 0 : 420;
    const passo = (t) => {
      const k = dur === 0 ? 1 : Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3); // ease-out cúbico
      x.set(inicio + delta * e);
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };

  return (
    <section style={{ padding: "40px 0", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ padding: "0 22px" }}>
        <Etiqueta n="04" titulo="Arraste com física" observar="puxe o trilho e solte: ele desacelera como um objeto de verdade e resiste na ponta. As setas fazem o mesmo para quem não arrasta" />
      </div>

      <div ref={viewport} style={{ overflow: "hidden", padding: "4px 22px 6px" }}>
        <m.div
          ref={faixa}
          drag="x" dragConstraints={{ left: -limite, right: 0 }} dragElastic={0.14}
          dragMomentum={!reduce}
          style={{ x, display: "flex", gap: 12, cursor: "grab", touchAction: "pan-y" }}
          whileTap={{ cursor: "grabbing" }}
        >
          {TRILHO.map((p) => (
            <m.article
              key={p.id}
              whileTap={{ scale: 0.98 }} transition={M.press}
              style={{ flex: "0 0 220px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden" }}
            >
              <div style={{ aspectRatio: "4 / 3", overflow: "hidden", background: T.bgWarm }}>
                <img src={p.img} alt={p.nome} loading="lazy" decoding="async" draggable="false"
                  style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
              </div>
              <div style={{ padding: "12px 13px 15px" }}>
                <span className="fb" style={{ display: "block", fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>{p.nome}</span>
                <span className="fb" style={{ display: "block", fontSize: 12.5, color: T.inkSoft, marginTop: 4, lineHeight: 1.45 }}>{p.info}</span>
                <span className="fb" style={{ display: "block", fontSize: 14, fontWeight: 700, color: T.pistacheDark, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>R$ {p.preco}</span>
              </div>
            </m.article>
          ))}
        </m.div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "14px 22px 0" }}>
        {[[-1, "Anterior"], [1, "Próximo"]].map(([dir, rot]) => (
          <m.button
            key={rot} type="button" onClick={() => andar(dir)} aria-label={rot}
            whileTap={{ scale: 0.92 }} transition={M.press}
            style={{ width: 46, height: 46, borderRadius: 999, display: "grid", placeItems: "center", cursor: "pointer", background: T.surface, border: `1.5px solid ${T.border}`, color: T.ink }}
          >
            <ChevronRight size={19} strokeWidth={2} aria-hidden="true" style={{ transform: dir < 0 ? "scaleX(-1)" : "none" }} />
          </m.button>
        ))}
      </div>
    </section>
  );
}

/* =========================== 06 · FECHO =========================== */
function Fecho({ reduce }) {
  return (
    <section style={{ padding: "40px 22px 90px", maxWidth: 720, margin: "0 auto" }}>
      <Etiqueta n="05" titulo="Fecho" observar="mesmo ritmo de entrada do começo — o produto inteiro se move com a mesma assinatura" />
      <m.div
        initial={reduce ? false : { opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0, transition: M.enter }}
        viewport={{ once: true, amount: 0.3 }}
        style={{ background: T.ink, borderRadius: 26, padding: "28px 24px 30px", color: T.bg, position: "relative", overflow: "hidden" }}
      >
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: GRAO, opacity: 0.28, mixBlendMode: "overlay", pointerEvents: "none" }} />
        <span className="fm" style={{ ...TYPE.label, color: T.accent }}>Venha nos visitar</span>
        <h3 className="fd" style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 28, fontWeight: 600, lineHeight: 1.18, margin: "10px 0 0" }}>
          Duas casas em Vitória
        </h3>
        <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0", display: "grid", gap: 10 }}>
          {LOJAS_RESUMO.map((l) => (
            <li key={l.nome} style={{ display: "flex", gap: 11, alignItems: "flex-start", borderTop: "1px solid rgba(246,241,231,.16)", paddingTop: 12 }}>
              <Clock size={18} strokeWidth={1.75} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: T.accent }} />
              <span>
                <span className="fb" style={{ display: "block", fontSize: 15.5, fontWeight: 700 }}>{l.nome}</span>
                <span className="fb" style={{ display: "block", fontSize: 13, color: "#CFC9B4", marginTop: 2 }}>{l.bairro} · {l.horario}</span>
              </span>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 22 }}>
          <Botao>Como chegar <ChevronRight size={18} strokeWidth={2.25} aria-hidden="true" /></Botao>
        </div>
      </m.div>

      <p className="fm" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: T.inkSoft, textAlign: "center", marginTop: 30, lineHeight: 1.7 }}>
        Protótipo interno · Bentô Gelatos — ABB Gelateria Ltda<br />não indexado e não linkado no site
      </p>
    </section>
  );
}

/* =========================== PÁGINA =========================== */
export default function Proto() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const barra = useSpring(scrollYProgress, { stiffness: 200, damping: 40, mass: 0.3 });

  return (
    <LazyMotion features={domMax} strict>
      {/* Barra de progresso: presa à rolagem, logo continua viva com Reduzir Movimento */}
      <m.div
        aria-hidden="true"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 200,
          transformOrigin: "0% 50%", scaleX: barra,
          background: `linear-gradient(90deg,${T.pistacheDark},${T.accent})`,
        }}
      />
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: -1, backgroundImage: GRAO, opacity: 0.5, pointerEvents: "none" }} />

      <main>
        <Abertura reduce={reduce} />
        <Pilares reduce={reduce} />
        <Cinema />
        <Vitrine reduce={reduce} />
        <Trilho reduce={reduce} />
        <Fecho reduce={reduce} />
      </main>
    </LazyMotion>
  );
}
