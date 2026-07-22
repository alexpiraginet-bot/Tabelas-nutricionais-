import { useEffect, useRef } from "react";
import { T } from "./shared.jsx";

/* ========== FUNDO-FILME DA HOME (atelier 3D, rolagem-filme A4) ==========
   O filme de 6 legs contínuos (gerado para o mundo 3D da marca) roda ATRÁS
   dos cards existentes: a rolagem da própria home comanda o tempo do vídeo,
   com rolagem reversa de primeira classe. Os cards ficam intactos por cima,
   com leve translucidez iOS aplicada no App/Home.

   Disciplina herdada do controlador A4 do site cinematográfico:
   - fetch same-origin → Blob (currentTime sempre seekável, sem range-request);
   - carrega só o leg ativo ± 1; seeks coalescidos (guarda apenas o último);
   - priming no primeiro toque (iOS libera seek de vídeo mudo após gesto);
   - posters exatos como fallback permanente (primeiro paint e falha de rede);
   - prefers-reduced-motion ou Save-Data = zero download de vídeo, só poster;
   - troca desktop/mobile apenas em mudança real de largura; teardown completo.
   O download dos vídeos só começa em idle (não disputa com o LCP da home). */

const LEGS = 6;
const legSrc = (i, mob) => `/world/leg-${i + 1}${mob ? "-mobile" : ""}.mp4`;
const legPoster = (i, mob) => `/world/leg-${i + 1}${mob ? "-mobile" : ""}-poster.webp`;

// Véu creme por cima do filme: garante contraste do texto/cards em qualquer
// frame (mais denso no topo do hero e no rodapé, mais aberto no meio).
const VEIL =
  "linear-gradient(180deg,rgba(246,241,231,.72),rgba(246,241,231,.38) 26%,rgba(246,241,231,.38) 72%,rgba(246,241,231,.66))";
// Vinheta escura emoldurando as bordas — dá profundidade e, no mobile (filme
// em faixa "contain"), fecha as sobras creme como uma tarja de cinema.
const VIGNETTE =
  "radial-gradient(125% 90% at 50% 44%, transparent 50%, rgba(24,26,17,.16) 78%, rgba(20,22,15,.34))";
// Os legs são landscape (1920×1080). No desktop cobrimos a tela (cover); no
// mobile, cobrir cortaria demais os lados — então mostramos o frame inteiro
// (contain), sem corte horizontal, com o creme+vinheta ao redor.
const fitFor = (mob) => (mob ? "contain" : "cover");

export default function WorldFundo() {
  const stageRef = useRef(null);
  const posterRef = useRef(null);
  const veilRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current, posterEl = posterRef.current, veilEl = veilRef.current;
    if (!stage || !posterEl || !veilEl) return;
    let mob = window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;
    posterEl.src = legPoster(0, mob);
    posterEl.style.objectFit = fitFor(mob);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    if (reduced || saveData) return; // poster estático basta; nenhum vídeo baixa

    const videos = new Map();
    const blobs = new Map(); // retidos para rolagem reversa sem re-download
    const loading = new Set();
    const pending = new Map(); // seek coalescido por leg (só o último vale)
    const seekedHandlers = new Map();
    const aborters = [];
    let raf = 0, primed = false, cur = 0, started = false, lastW = window.innerWidth;
    let gen = 0; // epoch: invalida callbacks de fetch de um breakpoint antigo após resize

    const applyActive = () => {
      const v = videos.get(cur);
      const ready = !!v && v.readyState >= 2;
      videos.forEach((vid, i) => { vid.style.opacity = i === cur && ready ? "1" : "0"; });
      const want = legPoster(cur, mob);
      if (!posterEl.src.endsWith(want)) posterEl.src = want;
      posterEl.style.opacity = ready ? "0" : "1";
    };

    const seek = (i, t) => {
      const v = videos.get(i);
      if (!v || !Number.isFinite(v.duration) || v.duration === 0) { pending.set(i, t); return; }
      const target = Math.min(v.duration - 0.033, Math.max(0, t * v.duration));
      if (v.seeking) { pending.set(i, target / v.duration); return; }
      pending.delete(i);
      try { v.currentTime = target; } catch { /* estado transitório: poster cobre */ }
    };

    const ensure = (i) => {
      if (i < 0 || i >= LEGS || videos.has(i) || loading.has(i)) return;
      loading.add(i);
      const myGen = gen; // se o breakpoint trocar durante o download, este fetch fica órfão
      const ac = new AbortController();
      aborters.push(ac);
      fetch(legSrc(i, mob), { signal: ac.signal })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then((b) => {
          if (myGen !== gen) return; // breakpoint mudou: descarta o vídeo da resolução antiga
          const url = URL.createObjectURL(b);
          blobs.set(i, url);
          const v = document.createElement("video");
          v.muted = true;
          v.playsInline = true;
          v.preload = "auto";
          v.setAttribute("playsinline", "");
          v.setAttribute("aria-hidden", "true");
          Object.assign(v.style, {
            position: "absolute", inset: "0", width: "100%", height: "100%",
            objectFit: fitFor(mob), objectPosition: "center", opacity: "0",
            transition: "opacity .35s ease",
          });
          v.src = url;
          // Ao terminar de carregar: se há um seek pendente (scroll ≠ 0 ou parado
          // antes do load), aplica-o e deixa o onSeeked revelar no frame certo —
          // sem seek pendente, revela direto. Evita o flash de frame 0 sobre o poster.
          const onLoaded = () => {
            if (v.readyState < 2) return;
            const t = pending.get(i);
            if (t !== undefined) seek(i, t);
            else requestAnimationFrame(applyActive);
          };
          v.addEventListener("loadeddata", onLoaded);
          const onSeeked = () => {
            const t = pending.get(i);
            if (t !== undefined) { seek(i, t); return; } // coalesceu outro seek: persegue o último
            requestAnimationFrame(applyActive);          // frame correto pintado → poster→vídeo
          };
          seekedHandlers.set(i, onSeeked);
          v.addEventListener("seeked", onSeeked);
          videos.set(i, v);
          stage.insertBefore(v, posterEl);
          if (primed) v.play().then(() => v.pause()).catch(() => {});
          const t = pending.get(i);
          if (t !== undefined) seek(i, t);
        })
        .catch(() => { /* falhou/abortado: fica no poster, sem retry loop */ })
        .finally(() => { if (myGen === gen) loading.delete(i); }); // não mexe no loading do novo breakpoint
    };

    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      const f = Math.min(LEGS - 1e-6, p * LEGS);
      const seg = Math.floor(f);
      if (seg !== cur) { cur = seg; applyActive(); }
      if (started) { ensure(seg); ensure(seg - 1); ensure(seg + 1); seek(seg, f - seg); }
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };

    // iOS: o primeiro gesto "arma" os vídeos mudos; depois a rolagem manda
    const prime = () => {
      if (primed) return;
      primed = true;
      videos.forEach((v) => { v.play().then(() => v.pause()).catch(() => {}); });
    };

    // troca desktop/mobile só em mudança real de largura (resize de altura
    // pelo chrome de URL do navegador mobile é ignorado)
    const onResize = () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      mob = window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;
      gen++;                              // invalida os callbacks dos fetches em voo do breakpoint antigo
      aborters.forEach((a) => a.abort()); // cancela downloads em andamento (resolução que não vale mais)
      aborters.length = 0;
      loading.clear();                    // libera ensure() a rebaixar tudo no novo breakpoint
      videos.forEach((v, i) => {
        v.removeEventListener("seeked", seekedHandlers.get(i));
        v.remove();
        const url = blobs.get(i);
        if (url) URL.revokeObjectURL(url);
      });
      videos.clear(); blobs.clear(); seekedHandlers.clear(); pending.clear();
      posterEl.style.opacity = "1";
      posterEl.style.objectFit = fitFor(mob);
      posterEl.src = legPoster(cur, mob);
      onScroll();
    };

    const start = () => { started = true; update(); };
    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 2500 })
      : setTimeout(start, 1200);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.addEventListener("pointerdown", prime, { once: true, passive: true });
    window.addEventListener("touchstart", prime, { once: true, passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("touchstart", prime);
      if (raf) cancelAnimationFrame(raf);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idleId); else clearTimeout(idleId);
      aborters.forEach((a) => a.abort());
      videos.forEach((v, i) => { v.removeEventListener("seeked", seekedHandlers.get(i)); v.remove(); });
      blobs.forEach((u) => URL.revokeObjectURL(u));
      videos.clear(); blobs.clear(); seekedHandlers.clear();
    };
  }, []);

  return (
    <div ref={stageRef} aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: -1, overflow: "hidden", pointerEvents: "none", background: T.bgWarm }}>
      <img ref={posterRef} alt="" decoding="async"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transition: "opacity .35s ease" }} />
      <div ref={veilRef} style={{ position: "absolute", inset: 0, background: VEIL }} />
      <div style={{ position: "absolute", inset: 0, background: VIGNETTE }} />
    </div>
  );
}
