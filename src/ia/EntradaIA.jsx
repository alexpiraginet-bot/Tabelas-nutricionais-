// Entrada da Bentô IA na home: uma barra de pergunta com exemplos.
// Fica no bundle principal (é leve); o painel da conversa carrega sob demanda.
import { useState, useEffect } from "react";
import { Sparkles, ArrowUp } from "lucide-react";
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
    <div className="rise" style={{ width: "100%", maxWidth: 460, marginTop: 16, animationDelay: "170ms" }}>
      <button onClick={() => tk("Home · Bentô IA · Barra", () => onAbrir(null))} aria-label="Pergunte à Bentô IA"
        className="hl fb" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, padding: "8px 8px 8px 10px", cursor: "pointer", textAlign: "left", boxShadow: "0 14px 34px -24px rgba(35,38,25,.55)" }}>
        <span style={{ width: 34, height: 34, borderRadius: "50%", background: T.pistacheDark, color: T.surface, display: "grid", placeItems: "center", flexShrink: 0 }}><Sparkles size={15} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.ink }}>Pergunte à Bentô IA</span>
          <span key={i} className="fade" style={{ display: "block", fontSize: 12, color: T.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{SUGESTOES[i]}</span>
        </span>
        <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", background: T.bgWarm, color: T.pistacheDark, display: "grid", placeItems: "center", flexShrink: 0 }}><ArrowUp size={15} /></span>
      </button>
      <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 8, paddingBottom: 2 }}>
        {SUGESTOES.slice(0, 3).map((s) => (
          <button key={s} onClick={() => tk("Home · Bentô IA · Sugestão", () => onAbrir(s))} className="fb"
            style={{ flexShrink: 0, fontSize: 11.5, color: T.pistacheDark, background: "rgba(255,253,247,.8)", border: `1px solid ${T.border}`, borderRadius: 999, padding: "6px 11px", cursor: "pointer", whiteSpace: "nowrap" }}>{s}</button>
        ))}
      </div>
    </div>
  );
}
