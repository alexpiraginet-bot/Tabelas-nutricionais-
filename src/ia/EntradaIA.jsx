// Entrada da Bentô IA na home: uma barra de pergunta e três atalhos.
// Fica no bundle principal (é leve); o painel da conversa carrega sob demanda.
import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { tk, T } from "../shared.jsx";
import { SUGESTOES } from "./sugestoes.js";

// A IA só aparece quando o servidor diz que está ligada (chave configurada e
// sem IA_DESLIGADA). Sem resposta, some — melhor não oferecer do que oferecer
// e falhar na primeira pergunta.
export function useIAAtiva() {
  const [ativa, setAtiva] = useState(() => { try { const v = sessionStorage.getItem("bento:ia:ativa"); return v == null ? null : v === "1"; } catch { return null; } });
  useEffect(() => {
    let vivo = true;
    fetch("/api/ia", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { const a = !!(j && j.ativa); if (vivo) setAtiva(a); try { sessionStorage.setItem("bento:ia:ativa", a ? "1" : "0"); } catch { /* */ } })
      .catch(() => { if (vivo) setAtiva(false); });
    return () => { vivo = false; };
  }, []);
  return ativa;
}

export default function EntradaIA({ onAbrir }) {
  // Exemplos girando no texto da barra — animação automática, então respeita
  // "Reduzir Movimento" (fica parado no primeiro).
  const [i, setI] = useState(0);
  useEffect(() => {
    let parado = false;
    try { parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* */ }
    if (parado) return;
    const t = setInterval(() => setI((x) => (x + 1) % SUGESTOES.length), 3800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="rise" style={{ width: "100%", maxWidth: 480, marginTop: 18, animationDelay: "170ms" }}>
      <style>{`
        .ia-barra{transition:border-color .2s,box-shadow .2s,transform .2s}
        .ia-barra:hover{border-color:${T.pistache};box-shadow:0 22px 44px -30px rgba(35,38,25,.6)}
        .ia-barra:active{transform:scale(.99)}
        .ia-barra:focus-visible,.ia-atalho:focus-visible{outline:2px solid ${T.pistacheDark};outline-offset:2px}
        .ia-atalho{transition:border-color .2s,background .2s}
        .ia-atalho:hover{border-color:${T.pistache};background:${T.surface}}
        .ia-troca{animation:iaTroca .3s ease-out}
        @keyframes iaTroca{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
        @media(prefers-reduced-motion:reduce){.ia-troca{animation:none}.ia-barra:active{transform:none}}
      `}</style>
      <button onClick={() => tk("Home · Bentô IA · Barra", () => onAbrir(null))} aria-label="Pergunte à Bentô IA"
        className="ia-barra fb" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 62, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: "8px 8px 8px 16px", cursor: "pointer", textAlign: "left", boxShadow: "0 18px 40px -30px rgba(35,38,25,.55)" }}>
        {/* O selo da Bentô marca a IA; o Sparkles já é do quiz e do Clube no site. */}
        <img src="/bento-logo.webp" alt="" width={28} height={28} style={{ borderRadius: "50%", flexShrink: 0, display: "block" }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>Pergunte à Bentô IA</span>
          <span key={i} className="ia-troca" style={{ display: "block", fontSize: 13, color: T.inkSoft, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{SUGESTOES[i].pergunta}</span>
        </span>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 14, background: T.pistacheDark, color: T.surface, display: "grid", placeItems: "center", flexShrink: 0 }}><ArrowUp size={18} strokeWidth={2} /></span>
      </button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {SUGESTOES.slice(0, 3).map(({ rotulo, pergunta, Icone }) => (
          <button key={rotulo} onClick={() => tk("Home · Bentô IA · Sugestão", () => onAbrir(pergunta))} className="fb ia-atalho"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, padding: "0 14px", fontSize: 13, fontWeight: 500, color: T.ink, background: "rgba(255,253,247,.85)", border: `1px solid ${T.border}`, borderRadius: 999, cursor: "pointer" }}>
            <Icone size={14} strokeWidth={1.75} color={T.pistacheDark} aria-hidden="true" />{rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}
