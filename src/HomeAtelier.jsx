// "O Atelier em um objeto" — protótipo da nova home em rolagem narrativa
// (inspiração: oryzo.ai/Lusion — um objeto-herói que persiste pela página).
// Acessível em /?atelier enquanto for protótipo; a home atual fica intacta.
//
// Regras da casa respeitadas: dados 100% reais de src/data.js (nunca inventar),
// fotos de produto reais nos cards, artes oficiais dos banners reutilizadas,
// texto regulatório literal. O herói 3D (turntable) entra como vídeo scrubado
// quando o asset estiver aprovado; até lá, a foto real segura o palco.
import { useEffect, useRef, useState } from "react";
import { PRODUCTS, ALLERGENS, PODE_CONTER, AVISO_POLIOL, proteinClaim, sugarClaim, lupaFrontal } from "./data.js";
import { T, LOJAS, BentoLogo, tk, br, orderIngredients } from "./shared.jsx";

const HERO_ID = "bentole-pistache-cb";
const heroP = PRODUCTS.find(p => p.id === HERO_ID);

// progresso 0..1 de uma seção "pin" (sticky): quanto do trilho já foi rolado.
// Limiar de 0,2% evita re-render em variação subpixel (achado da revisão Codex).
function useSectionProgress(ref) {
  const [p, setP] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const v = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      if (Math.abs(v - last.current) < 0.002 && v !== 0 && v !== 1) return;
      last.current = v;
      setP(v);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);
  return p;
}

const clamp01 = v => Math.min(1, Math.max(0, v));
// janela [a,b] do progresso global → 0..1 local
const win = (p, a, b) => clamp01((p - a) / (b - a));

/* ===== HERÓI-SCRUB: sequência de frames comandada pelo scroll =====
   O giro do Bentôlé (master Sora, 1 volta completa) vira N frames WebP;
   o scroll define o frame-alvo e um lerp por rAF dá o peso/inércia do
   objeto (a sensação oryzo de "obedece o dedo"). Disciplina da casa:
   carrega perto do frame atual primeiro, poster até o 1º frame pronto,
   Save-Data/2g ou falha de rede = fica na foto real (fallback do <img>). */
const HERO_FRAMES = 96;
const heroFrame = (i, mob) => `/atelier/hero${mob ? "-m" : ""}/f${String(i + 1).padStart(3, "0")}.webp`;

function HeroScrub({ t, style }) {
  const canvasRef = useRef(null);
  const rootRef = useRef(null);
  const state = useRef({ imgs: [], ok: [], cur: 0, raf: 0, alive: true, visible: true, failed: 0, ready: false, gen: 0, lastDrawn: -1 });
  const [useFallback, setUseFallback] = useState(() => {
    try {
      const c = navigator.connection || {};
      return !!(c.saveData || c.effectiveType === "2g" || c.effectiveType === "slow-2g");
    } catch { return false; }
  });
  // variante desktop/mobile como estado: cruzar o breakpoint reinicia a
  // sequência na resolução certa (achado Codex — antes ficava fixa)
  const [mob, setMob] = useState(() => {
    try { return window.innerWidth < 768; } catch { return false; }
  });
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    const onResize = () => setMob(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (useFallback) return;
    const s = state.current;
    const myGen = ++s.gen; // invalida onload de variante antiga após resize
    s.alive = true; s.imgs = []; s.ok = []; s.failed = 0; s.lastDrawn = -1;
    const cv = canvasRef.current;
    const ctx = cv ? cv.getContext("2d") : null;
    if (!ctx) return;

    // pausa o rAF quando o palco sai da tela (seções seguintes da página)
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; }, { threshold: 0 })
      : null;
    if (io && rootRef.current) io.observe(rootRef.current);

    const draw = (img, idx) => {
      if (!img || !img.naturalWidth || idx === s.lastDrawn) return;
      if (cv.width !== img.naturalWidth) { cv.width = img.naturalWidth; cv.height = img.naturalHeight; }
      ctx.drawImage(img, 0, 0);
      s.lastDrawn = idx;
      if (!s.ready) { s.ready = true; cv.style.opacity = "1"; }
    };
    const load = (i) => {
      if (i < 0 || i >= HERO_FRAMES || s.imgs[i]) return;
      const im = new Image();
      im.decoding = "async";
      im.onload = () => { if (myGen === s.gen) s.ok[i] = true; };
      im.onerror = () => { if (myGen === s.gen) { s.failed++; if (s.failed > 6 && !s.ready) setUseFallback(true); } };
      im.src = heroFrame(i, mob);
      s.imgs[i] = im;
    };
    // 1ª leva: frame 0 + esqueleto esparso (1 a cada 8) para resposta imediata
    load(0);
    for (let i = 0; i < HERO_FRAMES; i += 8) load(i);

    const tick = () => {
      if (!s.alive) return;
      if (!s.visible) { s.raf = requestAnimationFrame(tick); return; }
      const target = clamp01(tRef.current) * (HERO_FRAMES - 1);
      // inércia: persegue o alvo (0.14 ≈ peso físico sem parecer atrasado)
      s.cur += (target - s.cur) * 0.14;
      const i = Math.round(s.cur);
      // completa a vizinhança do frame atual (o esqueleto vira giro contínuo)
      for (let d = 0; d <= 4; d++) { load(i + d); load(i - d); }
      // desenha o carregado mais próximo do frame exato (desempate por distância real)
      let best = -1;
      for (let d = 0; d < HERO_FRAMES; d++) {
        const hi = s.ok[i + d] ? i + d : -1, lo = s.ok[i - d] ? i - d : -1;
        if (hi >= 0 && lo >= 0) { best = Math.abs(hi - s.cur) <= Math.abs(lo - s.cur) ? hi : lo; break; }
        if (hi >= 0) { best = hi; break; }
        if (lo >= 0) { best = lo; break; }
      }
      if (best >= 0) draw(s.imgs[best], best);
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
    return () => {
      s.alive = false;
      cancelAnimationFrame(s.raf);
      if (io) io.disconnect();
      s.imgs.forEach(im => { if (im) { im.onload = null; im.onerror = null; } });
    };
  }, [useFallback, mob]);

  if (useFallback) return <img src={heroP.image} alt={heroP.name} style={style} />;
  return (
    <div ref={rootRef} style={{ ...style, position: "relative", overflow: "hidden", background: "#EFE0C8" }} role="img" aria-label={heroP.name}>
      <img src={heroFrame(0, mob)} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0, transition: "opacity .3s ease" }} />
    </div>
  );
}

function Eyebrow({ children }) {
  return <div className="fm" style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: T.accent }}>{children}</div>;
}

/* ===== 1+2. HERO + O OBJETO: palco sticky, número gigantes por scroll ===== */
function HeroStage() {
  const trackRef = useRef(null);
  const p = useSectionProgress(trackRef);
  // reduced-motion: sem pin longo nem transformações — versão estática única
  const [reduced] = useState(() => {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
  });
  // proteinClaim → string · sugarClaim → {label, note}: normaliza para texto
  const sc = sugarClaim(heroP);
  const claims = [proteinClaim(heroP), sc && sc.label].filter(Boolean);
  if (reduced) {
    return (
      <section style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center", gap: 18 }}>
        <BentoLogo size={54} />
        <h1 className="fd" style={{ fontSize: "clamp(38px,8vw,84px)", lineHeight: 0.98, color: T.ink, fontWeight: 400, letterSpacing: "-0.02em", margin: 0 }}>
          Gelato com <em style={{ color: T.pistacheDark, fontStyle: "italic" }}>propósito</em>
        </h1>
        <img src={heroP.image} alt={heroP.name} style={{ width: "min(38vh,74vw)", aspectRatio: "1", objectFit: "cover", borderRadius: 28 }} />
        <div className="fb" style={{ fontSize: 17, color: T.ink }}>
          <b style={{ color: T.pistacheDark }}>{br(heroP.nutrition.protein)} g de proteína</b> · {br(heroP.nutrition.kcal)} kcal · 0 açúcar adicionado
        </div>
      </section>
    );
  }
  // fases: 0-.22 título · .25-.5 proteína · .5-.75 kcal · .75-1 zero açúcar
  const metricas = [
    { v: br(heroP.nutrition.protein) + " g", l: "de proteína por picolé", a: 0.26, b: 0.5 },
    { v: br(heroP.nutrition.kcal) + " kcal", l: "no mini de " + heroP.serving + " g", a: 0.5, b: 0.74 },
    { v: "0", l: "açúcar adicionado", a: 0.74, b: 0.97 },
  ];
  const rot = p * 340; // rotação simulada até o vídeo-herói entrar (scrub real depois)
  return (
    // svh (viewport "pequeno", estável): a barra do Safari mobile não muda a
    // altura do trilho/palco durante a rolagem — sem saltos no sticky (Codex).
    <section ref={trackRef} style={{ position: "relative", height: "420svh" }}>
      <div style={{ position: "sticky", top: 0, height: "100svh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* objeto-herói: 1 volta completa do Bentôlé ao longo de TODO o palco —
            o scroll comanda o giro (HeroScrub) com inércia */}
        <HeroScrub t={p}
          style={{
            width: "min(46vh, 78vw)", aspectRatio: "1", borderRadius: 28,
            boxShadow: "0 60px 120px -60px rgba(35,38,25,.55)",
            transform: `rotate(${-4 + rot * 0.012}deg) scale(${1 + win(p, 0, 0.25) * 0.06})`,
          }} />
        {/* título de abertura */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 20px calc(7dvh + env(safe-area-inset-bottom))", textAlign: "center", opacity: 1 - win(p, 0.1, 0.22), pointerEvents: p > 0.2 ? "none" : "auto" }}>
          <BentoLogo size={54} />
          <h1 className="fd" style={{ fontSize: "clamp(38px,8vw,84px)", lineHeight: 0.98, color: T.ink, fontWeight: 400, letterSpacing: "-0.02em", margin: "14px 0 8px" }}>
            Gelato com<br /><em style={{ color: T.pistacheDark, fontStyle: "italic" }}>propósito</em>
          </h1>
          <div className="fm" style={{ fontSize: 10, letterSpacing: "0.26em", textTransform: "uppercase", color: T.inkSoft, marginTop: 10 }}>role para conhecer ↓</div>
        </div>
        {/* métricas gigantes (dados reais do data.js) */}
        {metricas.map(m => {
          const o = clamp01(win(p, m.a, m.a + 0.07) - win(p, m.b - 0.04, m.b));
          return (
            <div key={m.l} aria-hidden={o < 0.5} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 20px 8dvh", textAlign: "center", opacity: o, transform: `translateY(${(1 - o) * 22}px)`, pointerEvents: "none" }}>
              <div className="fd" style={{ fontSize: "clamp(64px,13vw,150px)", lineHeight: 1, color: T.pistacheDark, textShadow: "0 2px 30px rgba(246,241,231,.9)" }}>{m.v}</div>
              <div className="fb" style={{ fontSize: "clamp(15px,2.4vw,21px)", color: T.ink, marginTop: 6, background: "rgba(255,253,247,.72)", borderRadius: 999, padding: "6px 18px" }}>{m.l}</div>
            </div>
          );
        })}
        {/* selo do sabor no fim do palco */}
        <div style={{ position: "absolute", top: "calc(16px + env(safe-area-inset-top))", left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, opacity: win(p, 0.22, 0.3), pointerEvents: "none", flexWrap: "wrap", padding: "0 14px" }}>
          <span className="fm" style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", background: T.ink, color: T.bg, borderRadius: 999, padding: "8px 16px" }}>Bentôlé · {heroP.name}</span>
          {claims.map(c => <span key={c} className="fm" style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", background: "rgba(255,253,247,.8)", border: `1px solid ${T.border}`, color: T.pistacheDark, borderRadius: 999, padding: "8px 16px" }}>{c}</span>)}
        </div>
      </div>
    </section>
  );
}

/* ===== 3. ANATOMIA: as camadas do objeto, ingredientes reais ===== */
function Anatomia() {
  // Camadas com os NOMES LITERAIS dos ingredientes da receita (data.js).
  // "pistaches inteiros" vem da copy oficial do produto (sub/description).
  // ingredients[0] = base já reformulada em runtime (Base Funcional ZERO,
  // sem maltitol/sorbitol — por isso sem advertência laxativa pela base).
  const base = heroP.ingredients[0];
  const camadas = [
    { t: "Cobertura", d: "Cobertura sabor chocolate branco zero lactose, com pistaches inteiros." },
    { t: "Recheio", d: "Pasta de pistache e pasta sabor leite." },
    { t: base.name, d: base.note + "." },
  ];
  return (
    <section style={{ maxWidth: 1040, margin: "0 auto", padding: "14dvh 20px 10dvh" }}>
      <Eyebrow>Anatomia do Bentôlé</Eyebrow>
      <h2 className="fd" style={{ fontSize: "clamp(30px,5.4vw,52px)", color: T.ink, margin: "10px 0 6px", lineHeight: 1.02 }}>
        Três camadas.<br />Nenhum segredo.
      </h2>
      {/* claim restrito à BASE: o produto completo tem polióis em outros
          insumos (pasta sabor leite/cobertura) e exibe o AVISO_POLIOL na
          ficha da seção A Prova (achado da review Codex no PR #187). */}
      <p className="fb" style={{ fontSize: 15.5, color: T.inkSoft, maxWidth: 560, lineHeight: 1.6 }}>
        Todo picolé da linha nasce da mesma base — reformulada sem maltitol e sem sorbitol na composição da própria base.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14, marginTop: 26 }}>
        {camadas.map((c, i) => (
          <div key={c.t} className="hl" style={{ background: "rgba(255,253,247,.8)", border: `1px solid ${T.border}`, borderRadius: 18, padding: "22px 20px" }}>
            <div className="fm" style={{ fontSize: 10, letterSpacing: "0.24em", color: T.accent }}>{String(i + 1).padStart(2, "0")}</div>
            <div className="fd" style={{ fontSize: 22, color: T.pistacheDark, margin: "6px 0 6px" }}>{c.t}</div>
            <div className="fb" style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55 }}>{c.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ===== 4. A PROVA: ficha científica (dados literais, estilo paper) ===== */
function Prova() {
  const n = heroP.nutrition;
  const linhas = [
    ["Valor energético", br(n.kcal) + " kcal"], ["Carboidratos", br(n.carbs) + " g"],
    ["Açúcares totais", br(n.sugars) + " g"], ["Açúcares adicionados", br(n.addedSugars) + " g"],
    ["Proteínas", br(n.protein) + " g"], ["Gorduras totais", br(n.fat) + " g"],
    ["Gorduras saturadas", br(n.satFat) + " g"], ["Fibras", br(n.fiber) + " g"],
    ["Sódio", br(n.sodium) + " mg"],
  ];
  const ings = orderIngredients(heroP.ingredients);
  const alerg = ALLERGENS[HERO_ID] || [];
  const lupa = lupaFrontal(heroP);
  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "6dvh 20px 12dvh" }}>
      <div className="gn" style={{ position: "relative", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: "30px 26px", boxShadow: "0 30px 70px -46px rgba(35,38,25,.5)" }}>
        <div style={{ position: "absolute", inset: 10, border: `1px solid ${T.accent}44`, borderRadius: 16, pointerEvents: "none" }} />
        <Eyebrow>A prova · porção de {heroP.portionLabel}</Eyebrow>
        <h2 className="fd" style={{ fontSize: "clamp(26px,4.4vw,38px)", color: T.ink, margin: "8px 0 16px" }}>Transparência é o ingrediente principal</h2>
        <table className="fm" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <tbody>
            {linhas.map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: "8px 4px", borderTop: `1px solid ${T.border}`, color: T.inkSoft }}>{k}</td>
                <td style={{ padding: "8px 4px", borderTop: `1px solid ${T.border}`, textAlign: "right", color: T.ink, fontVariantNumeric: "tabular-nums" }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {lupa.length > 0 && <div className="fm" style={{ fontSize: 11, marginTop: 12, color: T.ink }}>LUPA FRONTAL: {lupa.join(" · ")}</div>}
        <p className="fb" style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.65, marginTop: 14 }}>
          <b style={{ color: T.ink }}>INGREDIENTES:</b> {ings.map(i => i.note ? `${i.name} (${i.note})` : i.name).join(", ")}.
        </p>
        {alerg.length > 0 && <p className="fb" style={{ fontSize: 12.5, color: T.ink, marginTop: 8 }}><b>ALÉRGICOS: CONTÉM {alerg.join(", ")}.</b></p>}
        <p className="fb" style={{ fontSize: 12.5, color: T.ink, marginTop: 4 }}><b>PODE CONTER {PODE_CONTER.join(", ")}.</b></p>
        {/* declarações binárias (Lei 10.674) + advertência de polióis (RDC 727/2022,
            art. 25) — mesmos textos literais da ficha oficial do produto */}
        <p className="fb" style={{ fontSize: 12.5, color: T.ink, marginTop: 4 }}>
          <b>{heroP.flags.gluten ? "Contém glúten." : "Não contém glúten."}</b> {heroP.flags.lactose ? <b>Contém lactose.</b> : null}
        </p>
        {heroP.hasPolyols && (
          <p className="fb" style={{ fontSize: 12.5, color: "#6B5010", lineHeight: 1.55, marginTop: 8, paddingTop: 8, borderTop: "1px dashed #D4B840" }}>
            Contém polióis. <strong>{AVISO_POLIOL}</strong> <span style={{ opacity: .75 }}>(RDC 727/2022, art. 25)</span>
          </p>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <a href="/?tabelas" onClick={() => tk("Atelier · Ver tabelas")} className="fm" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", background: T.pistacheDark, color: T.surface, borderRadius: 999, padding: "12px 22px", textDecoration: "none" }}>Todas as tabelas →</a>
        </div>
      </div>
    </section>
  );
}

/* ===== 5. A LINHA: os cards oficiais da home (artes reais preservadas) ===== */
const CATALOGO = [
  { img: "/banners/eventos.webp", href: "/?eventos", alt: "Nos leve para seu evento — estrutura completa e orçamento online na hora" },
  { img: "/banners/bytes.webp", href: "/bytes/", alt: "BentôBytes — sabores especiais em edição limitada" },
  { img: "/banners/tabelas.webp", href: "/?tabelas", alt: "Tabelas nutricionais — gelatos, picolés, monte seu pote e quiz" },
  { img: "/banners/cardapio.webp", href: "https://totem.bentogelateria.com/pedir", alt: "Entrega própria e retirada em loja" },
  { img: "/banners/delivery.webp", href: "/?delivery", alt: "Delivery — iFood, Praia do Canto e Jardim Camburi" },
  { img: "/banners/parceiro.webp", href: "/?parceria", alt: "Seja um parceiro ou futuro franqueado" },
  { img: "/banners/conheca.webp", href: "/?cardapio", alt: "Conheça a Bentô + FAQ" },
  { img: "/banners/carreira.webp", href: "/?vagas", alt: "Trabalhe conosco — vagas abertas" },
];
function Linha() {
  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "4dvh 20px 8dvh" }}>
      <Eyebrow>O universo Bentô</Eyebrow>
      <h2 className="fd" style={{ fontSize: "clamp(28px,5vw,46px)", color: T.ink, margin: "10px 0 18px" }}>Escolha por onde continuar</h2>
      {CATALOGO.map((c, i) => (
        <a key={c.img} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener"
          onClick={() => tk("Atelier · Card · " + c.alt.slice(0, 24))} className="hl"
          style={{ display: "block", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(228,220,201,.8)", background: "rgba(255,253,247,.72)", marginTop: i === 0 ? 0 : 40, boxShadow: "0 14px 34px -26px rgba(35,38,25,.55)" }}>
          <img src={c.img} alt={c.alt} loading="lazy" decoding="async" style={{ display: "block", width: "100%", height: "auto", opacity: 0.94 }} />
        </a>
      ))}
    </section>
  );
}

/* ===== 6. O MUNDO: lojas reais (LOJAS de shared.jsx) ===== */
function Mundo() {
  return (
    <section style={{ maxWidth: 900, margin: "0 auto", padding: "4dvh 20px 10dvh", textAlign: "center" }}>
      <Eyebrow>Vitória-ES</Eyebrow>
      <h2 className="fd" style={{ fontSize: "clamp(28px,5vw,46px)", color: T.ink, margin: "10px 0 18px" }}>Venha nos visitar</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 14, textAlign: "left" }}>
        {LOJAS.map(l => (
          <div key={l.id} style={{ background: "rgba(255,253,247,.8)", border: `1px solid ${T.border}`, borderRadius: 18, padding: "20px 20px 18px" }}>
            <div className="fd" style={{ fontSize: 20, color: T.pistacheDark }}>{l.nome}</div>
            <div className="fb" style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5, margin: "8px 0 12px" }}>📍 {l.endereco || "Bairro " + l.bairro}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href={l.maps} target="_blank" rel="noopener" className="fm" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", background: T.pistacheDark, color: T.surface, borderRadius: 10, padding: "10px 14px", textDecoration: "none" }}>Google Maps</a>
              <a href={l.ifood} target="_blank" rel="noopener" className="fm" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", background: T.surface, color: T.pistacheDark, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", textDecoration: "none" }}>iFood</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ===== 7. FINAL ===== */
function Final() {
  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px 12dvh", textAlign: "center" }}>
      <a href="/seja-bento" onClick={() => tk("Atelier · Seja Bentô")}
        className="hl" style={{ display: "block", borderRadius: 24, padding: "34px 24px", textDecoration: "none", background: "rgba(255,253,247,.8)", border: `1px solid ${T.accent}66`, boxShadow: "0 24px 60px -38px rgba(35,38,25,.5)" }}>
        <Eyebrow>Revenda · Franquia · Parceria</Eyebrow>
        <div className="fd" style={{ fontSize: "clamp(24px,4.6vw,34px)", color: T.ink, margin: "10px 0 8px" }}>Quer crescer com a <em style={{ color: T.pistacheDark, fontStyle: "italic" }}>Bentô</em>?</div>
        <span className="fb" style={{ display: "inline-flex", marginTop: 8, background: T.pistacheDark, color: T.surface, borderRadius: 999, padding: "12px 24px", fontSize: 14, fontWeight: 600 }}>Responder questionário →</span>
      </a>
      <p className="fb" style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 26, lineHeight: 1.6 }}>
        © {new Date().getFullYear()} ABB Gelateria Ltda · Bentô Gelatos — CNPJ 61.590.463/0001-45. <a href="/" style={{ color: T.pistacheDark }}>← Voltar à home atual</a>
      </p>
    </section>
  );
}

export default function HomeAtelier() {
  return (
    <div className="fb" style={{ background: T.bg, color: T.ink, minHeight: "100dvh" }}>
      <HeroStage />
      <Anatomia />
      <Prova />
      <Linha />
      <Mundo />
      <Final />
    </div>
  );
}
