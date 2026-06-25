// Página de carreiras "Estamos contratando" (?vagas). Carregada sob demanda (lazy).
// Cadastro de candidatos: grava em /api/vaga (Redis + Telegram) e oferece atalho no WhatsApp.
import { useState, useMemo } from "react";
import { T, tk, BentoLogo } from "./shared.jsx";

const WHATS = "5527999159995"; // DDI+DDD+número, só dígitos

// ===== VAGAS ABERTAS (edite aqui para adicionar/trocar funções) =====
// Cada vaga: { cargo, unidades:[...], desc? }. Para abrir uma vaga rápida sem
// mexer no código, use o link: /?vagas=NomeDaVaga  (e, opcional, &unidades=A,B)
const VAGAS = [
  { cargo: "Atendente", unidades: ["Jardim Camburi", "Praia do Canto"] },
];
const TODAS_UNIDADES = ["Jardim Camburi", "Praia do Canto"];

const DISPON = ["Manhã", "Tarde", "Noite", "Integral", "Flexível"];
const BENEFICIOS = [
  ["🩺", "Plano de saúde"],
  ["🦷", "Plano odontológico"],
  ["🛵", "iFood Benefícios"],
  ["🏋️", "Wellhub (Gympass)"],
  ["✨", "Bonificações extras"],
];

function maskPhone(v) {
  const d = String(v).replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Monta a lista de vagas combinando a config fixa + parâmetros da URL.
function vagasFromURL() {
  try {
    const p = new URLSearchParams(window.location.search);
    const raw = p.get("vagas"); // pode ser "", "1" ou o nome do cargo
    const cargoParam = (p.get("cargo") || (raw && raw !== "1" ? raw : "")).trim();
    if (!cargoParam) return VAGAS;
    const uParam = (p.get("unidades") || "").split(",").map((s) => s.trim()).filter(Boolean);
    const exists = VAGAS.find((v) => v.cargo.toLowerCase() === cargoParam.toLowerCase());
    if (exists) {
      // reordena para a vaga do link aparecer primeiro (pré-selecionada)
      return [exists, ...VAGAS.filter((v) => v !== exists)];
    }
    return [{ cargo: cargoParam, unidades: uParam.length ? uParam : TODAS_UNIDADES }, ...VAGAS];
  } catch {
    return VAGAS;
  }
}

export default function TrabalhePage() {
  const vagas = useMemo(vagasFromURL, []);
  const [vi, setVi] = useState(0);            // índice da vaga selecionada
  const vaga = vagas[vi] || vagas[0];
  const unidadeOpts = useMemo(() => {
    const u = (vaga.unidades && vaga.unidades.length ? vaga.unidades : TODAS_UNIDADES).slice();
    return u.length > 1 ? [...u, "Tanto faz / as duas"] : u;
  }, [vaga]);

  const [f, setF] = useState({ nome: "", phone: "", unidade: "", idade: "", bairro: "", disponibilidade: "", experiencia: "", sobre: "", consent: false });
  const [sent, setSent] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  // ao trocar de vaga, zera a unidade se ela não existir mais nas opções
  const pickVaga = (i) => { setVi(i); setF((s) => ({ ...s, unidade: "" })); };
  // unidade efetiva: se a vaga só tem uma, assume-a
  const unidadeFinal = f.unidade || (unidadeOpts.length === 1 ? unidadeOpts[0] : "");
  const phoneOk = f.phone.replace(/\D/g, "").length >= 10;
  const ok = f.nome.trim() && phoneOk && unidadeFinal && f.consent;

  const resumoWA = () => {
    const l = [
      "*Candidatura — Vagas Bentô* 💼",
      `*Vaga:* ${vaga.cargo}`,
      `*Nome:* ${f.nome.trim()}`,
      `*WhatsApp:* ${f.phone.trim()}`,
      unidadeFinal && `*Unidade:* ${unidadeFinal}`,
      f.idade && `*Idade:* ${f.idade}`,
      f.bairro && `*Bairro:* ${f.bairro.trim()}`,
      f.disponibilidade && `*Disponibilidade:* ${f.disponibilidade}`,
      f.experiencia.trim() && `*Experiência:* ${f.experiencia.trim()}`,
      f.sobre.trim() && `*Sobre mim:* ${f.sobre.trim()}`,
    ].filter(Boolean);
    return l.join("\n");
  };

  const enviar = () => {
    if (!ok) return;
    tk("Conversão · Candidatura vaga");
    try {
      fetch("/api/vaga", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
        body: JSON.stringify({ nome: f.nome.trim(), phone: f.phone.trim(), cargo: vaga.cargo, unidade: unidadeFinal, idade: f.idade, bairro: f.bairro.trim(), disponibilidade: f.disponibilidade, experiencia: f.experiencia.trim(), sobre: f.sobre.trim() }) });
    } catch {}
    setSent(true);
  };
  const falarWhats = () => window.open(`https://wa.me/${WHATS}?text=${encodeURIComponent(resumoWA())}`, "_blank", "noopener,noreferrer");

  const lbl = { display: "block", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 6 };
  const inp = { width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.surface, color: T.ink, fontSize: 15, fontFamily: "'DM Sans',system-ui,sans-serif", outline: "none" };
  const unidadesLabel = (vaga.unidades && vaga.unidades.length ? vaga.unidades : TODAS_UNIDADES);

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, color: T.ink, fontFamily: "'DM Sans',system-ui,sans-serif", padding: "22px 14px 60px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* moldura premium */}
        <div className="gn" style={{ position: "relative", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, overflow: "hidden", boxShadow: "0 30px 70px -40px rgba(70,88,58,.5)" }}>
          <div style={{ position: "absolute", inset: 10, border: `1px solid ${T.accent}55`, borderRadius: 16, pointerEvents: "none" }} />
          <div style={{ position: "relative", padding: "34px 26px 30px" }}>
            <a href="/" onClick={() => tk("Vagas · Voltar ao site")} style={{ position: "absolute", top: 16, left: 18, fontSize: 12, color: T.inkSoft, textDecoration: "none" }}>← Site</a>
            <div style={{ textAlign: "center" }}>
              <BentoLogo size={66} />
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: "0.3em", color: T.accent, textTransform: "uppercase", marginTop: 14 }}>Trabalhe com a gente</div>
              <h1 className="fd" style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: "clamp(34px,9vw,52px)", lineHeight: 0.98, color: T.ink, fontWeight: 600, margin: "8px 0 0", letterSpacing: "-0.01em" }}>
                Estamos<br />contratando
              </h1>
              <div className="fd" style={{ fontFamily: "'Fraunces',Georgia,serif", fontStyle: "italic", fontSize: 28, color: T.pistacheDark, marginTop: 12 }}>{vaga.cargo}</div>
              {vagas.length > 1 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 14 }}>
                  {vagas.map((v, i) => {
                    const a = i === vi;
                    return <button key={v.cargo} type="button" onClick={() => pickVaga(i)} className="fb" style={{ padding: "8px 14px", borderRadius: 999, border: `1.5px solid ${a ? T.pistacheDark : T.border}`, background: a ? T.pistacheDark : T.surface, color: a ? "#fff" : T.ink, fontSize: 13, fontWeight: a ? 700 : 500, cursor: "pointer" }}>{v.cargo}</button>;
                  })}
                </div>
              )}
            </div>

            {/* unidades + benefícios */}
            <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
              <div>
                <div style={lbl}>📍 {unidadesLabel.length > 1 ? "Unidades" : "Unidade"}</div>
                <div className="fb" style={{ fontSize: 15, color: T.ink }}>{unidadesLabel.map((u, i) => <span key={u}>{i > 0 && <span style={{ color: T.accent }}> · </span>}{u}</span>)}</div>
              </div>
              <div>
                <div style={lbl}>📅 Dias de trabalho</div>
                <div className="fb" style={{ fontSize: 15, color: T.ink }}>Terça a domingo <span className="fb" style={{ fontSize: 12.5, color: T.inkSoft }}>(folga às segundas)</span></div>
              </div>
              <div>
                <div style={lbl}>🎁 Benefícios</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
                  {BENEFICIOS.map(([ic, b]) => (
                    <span key={b} className="fb" style={{ fontSize: 13, color: T.ink, background: T.bgWarm, border: `1px solid ${T.borderSoft}`, borderRadius: 999, padding: "7px 13px" }}>{ic} {b}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: T.borderSoft, margin: "26px 0 22px" }} />

            {sent ? (
              <div style={{ textAlign: "center", padding: "10px 4px 6px" }}>
                <div style={{ fontSize: 46 }}>🎉</div>
                <h2 className="fd" style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, color: T.ink, fontWeight: 600, margin: "8px 0 6px" }}>Candidatura recebida!</h2>
                <p className="fb" style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.5, maxWidth: 420, margin: "0 auto" }}>
                  Obrigado, {f.nome.trim().split(" ")[0]}! Seu cadastro para <b>{vaga.cargo}</b> chegou pra gente. Se o perfil casar com a vaga, a equipe entra em contato pelo seu WhatsApp. 💛
                </p>
                <button onClick={falarWhats} className="fb" style={{ marginTop: 18, background: "#1FA855", color: "#fff", border: "none", borderRadius: 999, padding: "14px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>📲 Adiantar pelo WhatsApp</button>
                <div style={{ marginTop: 14 }}><a href="/" className="fb" style={{ fontSize: 13, color: T.pistacheDark, textDecoration: "underline" }}>Voltar ao site</a></div>
              </div>
            ) : (
              <>
                <div className="fd" style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, color: T.ink, fontWeight: 600, marginBottom: 14 }}>Cadastre seu interesse</div>
                <div style={{ display: "grid", gap: 14 }}>
                  <div>
                    <label style={lbl}>Nome completo *</label>
                    <input value={f.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Seu nome" style={inp} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={lbl}>WhatsApp *</label>
                      <input value={f.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} inputMode="tel" placeholder="(27) 99999-9999" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Idade</label>
                      <input value={f.idade} onChange={(e) => set("idade", e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="opcional" style={inp} />
                    </div>
                  </div>
                  {unidadeOpts.length > 1 && (
                    <div>
                      <label style={lbl}>Unidade de interesse *</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {unidadeOpts.map((u) => {
                          const a = f.unidade === u;
                          return <button key={u} type="button" onClick={() => set("unidade", u)} className="fb" style={{ flex: "1 1 30%", minWidth: 120, padding: "11px 10px", borderRadius: 12, border: `1.5px solid ${a ? T.pistacheDark : T.border}`, background: a ? T.pistacheDark : T.surface, color: a ? "#fff" : T.ink, fontSize: 13, fontWeight: a ? 700 : 500, cursor: "pointer" }}>{u}</button>;
                        })}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={lbl}>Bairro onde mora</label>
                      <input value={f.bairro} onChange={(e) => set("bairro", e.target.value)} placeholder="opcional" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Disponibilidade</label>
                      <select value={f.disponibilidade} onChange={(e) => set("disponibilidade", e.target.value)} style={{ ...inp, appearance: "none" }}>
                        <option value="">Selecione…</option>
                        {DISPON.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Experiência anterior</label>
                    <input value={f.experiencia} onChange={(e) => set("experiencia", e.target.value)} placeholder="Ex.: atendimento, caixa, food service… (opcional)" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Conte um pouco sobre você</label>
                    <textarea value={f.sobre} onChange={(e) => set("sobre", e.target.value)} rows={3} placeholder="Por que quer fazer parte do time Bentô? (opcional)" style={{ ...inp, resize: "vertical" }} />
                  </div>
                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                    <input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, accentColor: T.pistacheDark, flexShrink: 0 }} />
                    <span className="fb" style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.45 }}>Autorizo a Bentô a guardar e usar meus dados para contato sobre processos seletivos, conforme a <a href="/?privacidade=1" style={{ color: T.pistacheDark }}>Política de Privacidade</a>.</span>
                  </label>
                  <button onClick={enviar} disabled={!ok} className="fb" style={{ marginTop: 4, width: "100%", padding: "16px", borderRadius: 999, border: "none", background: ok ? T.pistacheDark : T.border, color: ok ? "#fff" : T.inkSoft, fontSize: 16, fontWeight: 700, cursor: ok ? "pointer" : "not-allowed", letterSpacing: "0.02em" }}>
                    Clique e cadastre-se →
                  </button>
                  <div className="fb" style={{ textAlign: "center", fontSize: 12, color: T.accent, fontWeight: 600 }}>✦ Faça parte do time Bentô</div>
                </div>
              </>
            )}
          </div>
        </div>
        <p className="fb" style={{ textAlign: "center", fontSize: 10.5, color: T.inkSoft, marginTop: 14, lineHeight: 1.5 }}>
          Bentô Gelatos · ABB Gelateria Ltda · Vitória–ES — vagas para Jardim Camburi e Praia do Canto.
        </p>
      </div>
    </div>
  );
}
