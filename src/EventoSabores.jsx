// Passo "Sabores" do orçamento de evento (o 3 de 4): navegar por todos os
// sabores, escolher dentro do limite do formato e, se quiser, pedir a
// combinação à Bentô IA.
//
// O limite é fechado de propósito (EV_LIMITE_SABORES, em eventos-regras.js):
// o cliente escolhe dentro do que a operação entrega. A sugestão pronta e a IA
// puxam para combinações simples — chocolate, fruta, opção sem lactose — em
// vez de invenção. Tudo o que a tela mostra de um sabor vem de data.js (via
// saboresEvento); a IA só devolve ids, que o servidor já conferiu.
import { useMemo, useState } from "react";
import { Sparkles, Check, X, LoaderCircle, Baby, MilkOff, Dumbbell } from "lucide-react";
import { T, tk, ProductArt } from "./shared.jsx";
import { PRODUCTS } from "./data.js";
import { saboresEvento } from "./ia/catalogo.js";

const FILTROS = [
  { id: "todos", rotulo: "Todos", f: () => true },
  { id: "semLactose", rotulo: "Sem lactose", f: (x) => x.semLactose },
  { id: "crianca", rotulo: "Para crianças", f: (x) => x.crianca },
  { id: "chocolate", rotulo: "Chocolate", f: (x) => x.chocolate },
  { id: "fruta", rotulo: "Frutas", f: (x) => x.fruta },
  { id: "semGluten", rotulo: "Sem glúten", f: (x) => x.semGluten },
];
const PREFS = [
  { id: "criancas", rotulo: "Tem crianças", Icone: Baby },
  { id: "semLactose", rotulo: "Intolerância à lactose", Icone: MilkOff },
  { id: "fitness", rotulo: "Público que treina", Icone: Dumbbell },
];

const produto = (id) => PRODUCTS.find((p) => p.id === id);
const plural = (n, um, varios) => (n === 1 ? um : varios);

function Chip({ ativo, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={ativo} className="fb"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "0 12px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 500,
        border: `1px solid ${ativo ? T.pistacheDark : T.border}`, background: ativo ? T.pistacheDark : T.surface, color: ativo ? T.surface : T.ink, transition: "background .15s, color .15s, border-color .15s" }}>
      {children}
    </button>
  );
}

export default function EventoSabores({ evento, limites, valor, onChange, iaAtiva }) {
  const todos = useMemo(() => saboresEvento(), []);
  const linhas = [limites.gelatos > 0 && "gelato", limites.picoles > 0 && "picole"].filter(Boolean);
  const [linha, setLinha] = useState(linhas[0]);
  const [filtro, setFiltro] = useState("todos");
  const [prefs, setPrefs] = useState({ criancas: false, semLactose: false, fitness: false });
  const [notas, setNotas] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erroIA, setErroIA] = useState(null);
  const [aviso, setAviso] = useState(null);

  const escolhidos = { gelato: valor.gelatos || [], picole: valor.picoles || [] };
  const max = { gelato: limites.gelatos, picole: limites.picoles };
  const chave = { gelato: "gelatos", picole: "picoles" };

  const alterar = (l, ids) => { setAviso(null); onChange({ gelatos: escolhidos.gelato, picoles: escolhidos.picole, [chave[l]]: ids, origem: "cliente", motivo: null }); };
  const alternar = (x) => {
    const l = x.linha, atual = escolhidos[l];
    if (atual.includes(x.id)) { alterar(l, atual.filter((id) => id !== x.id)); return; }
    // Uma vaga só: tocar em outro sabor troca, como um botão de opção.
    if (max[l] === 1) { alterar(l, [x.id]); return; }
    if (atual.length >= max[l]) {
      setAviso(`Você já escolheu ${max[l]} ${l === "gelato" ? "gelatos" : "picolés"}. Tire um para trocar.`);
      return;
    }
    alterar(l, [...atual, x.id]);
  };

  const pedirIA = async () => {
    setCarregando(true); setErroIA(null); setAviso(null);
    tk("Eventos · Sabores · Sugestão da IA");
    try {
      const r = await fetch("/api/ia", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo: "sabores-evento", evento: { convidados: evento.convidados, tipo: evento.tipo, formato: evento.formato }, prefs, notas: notas.trim().slice(0, 300) }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || !j.ok) throw new Error((j && j.erro) || "Não consegui sugerir agora. Escolha abaixo ou tente de novo.");
      onChange({ gelatos: j.gelatos, picoles: j.picoles, origem: j.origem, motivo: j.motivo });
    } catch (e) {
      setErroIA(String((e && e.message) || "Sem conexão agora. Tente de novo."));
    } finally {
      setCarregando(false);
    }
  };

  const lista = todos.filter((x) => x.linha === linha && (FILTROS.find((f) => f.id === filtro) || FILTROS[0]).f(x));
  const g = limites.gelatos, pc = limites.picoles;
  const regra = g && pc
    ? `${g} ${plural(g, "sabor de gelato", "sabores de gelato")} e até ${pc} de picolé`
    : g ? `${g} ${plural(g, "sabor de gelato", "sabores de gelato")}` : `${pc} ${plural(pc, "sabor de picolé", "sabores de picolé")}`;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <div className="fd" style={{ fontSize: 22, color: T.ink, lineHeight: 1.2 }}>Sabores do seu evento</div>
        <div className="fb" style={{ fontSize: 13.5, color: T.inkSoft, marginTop: 6, lineHeight: 1.5 }}>
          {evento.formatoNome} · {evento.convidados} convidados. Escolha até {regra}.
        </div>
      </div>

      {iaAtiva && (
        <section aria-label="Montar com a Bentô IA" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} strokeWidth={1.75} color={T.pistacheDark} aria-hidden="true" />
            <span className="fb" style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Monte com a Bentô IA</span>
          </div>
          <p className="fb" style={{ fontSize: 13, color: T.inkSoft, margin: "4px 0 0", lineHeight: 1.5 }}>Conte quem vai ao evento e a IA sugere a combinação, dentro do que o seu formato leva.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {PREFS.map(({ id, rotulo, Icone }) => (
              <Chip key={id} ativo={prefs[id]} onClick={() => setPrefs((p) => ({ ...p, [id]: !p[id] }))}>
                <Icone size={15} strokeWidth={1.75} aria-hidden="true" />{rotulo}
              </Chip>
            ))}
          </div>
          <label className="fb" htmlFor="ev-sabores-notas" style={{ display: "block", fontSize: 12.5, color: T.inkSoft, marginTop: 12, marginBottom: 6 }}>Algo mais que a gente deva saber? (opcional)</label>
          <textarea id="ev-sabores-notas" className="fb" rows={2} value={notas} maxLength={300} onChange={(e) => setNotas(e.target.value)}
            placeholder="Ex.: aniversário de 6 anos, um convidado alérgico a amendoim"
            style={{ width: "100%", boxSizing: "border-box", minHeight: 64, padding: "10px 12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.surface, color: T.ink, fontSize: 16, lineHeight: 1.4, outline: "none", resize: "none", fontFamily: "inherit" }} />
          <button type="button" onClick={pedirIA} disabled={carregando} className="fb"
            style={{ marginTop: 12, minHeight: 44, padding: "0 18px", borderRadius: 12, border: "none", background: carregando ? T.border : T.pistacheDark, color: carregando ? T.inkSoft : T.surface, fontSize: 14.5, fontWeight: 600, cursor: carregando ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {carregando ? <><LoaderCircle size={16} className="ev-gira" aria-hidden="true" />Montando a combinação…</> : <><Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />Sugerir combinação</>}
          </button>
          {erroIA && <div className="fb" role="alert" style={{ fontSize: 13, color: "#8A3B12", marginTop: 10, lineHeight: 1.5 }}>{erroIA}</div>}
        </section>
      )}

      <section aria-label="Sua escolha" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
        {valor.motivo && (
          <div className="fb" aria-live="polite" style={{ display: "flex", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${T.borderSoft}`, background: "#F4F6EC" }}>
            <Sparkles size={16} strokeWidth={1.75} color={T.pistacheDark} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>
              <strong style={{ fontWeight: 600 }}>{valor.origem === "ia" ? "Sugestão da Bentô IA" : "Sugestão da Bentô"}.</strong> {valor.motivo}
            </div>
          </div>
        )}
        {linhas.map((l) => (
          <div key={l} style={{ padding: "14px 16px", borderBottom: `1px solid ${T.borderSoft}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="fb" style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{l === "gelato" ? "Gelato" : "Picolé"}</span>
              <span className="fm" style={{ fontSize: 12, color: T.inkSoft, fontVariantNumeric: "tabular-nums" }}>{escolhidos[l].length} de {max[l]}</span>
            </div>
            {escolhidos[l].length === 0
              ? <div className="fb" style={{ fontSize: 13, color: T.inkSoft, marginTop: 8 }}>Nenhum ainda — escolha abaixo.</div>
              : (
                <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 8 }}>
                  {escolhidos[l].map((id) => {
                    const p = produto(id);
                    if (!p) return null;
                    return (
                      <li key={id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: T.bgWarm }}><ProductArt product={p} size={40} /></span>
                        <span className="fb" style={{ flex: 1, minWidth: 0, fontSize: 14.5, color: T.ink }}>{p.name}</span>
                        <button type="button" onClick={() => alterar(l, escolhidos[l].filter((x) => x !== id))} aria-label={`Tirar ${p.name}`}
                          style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "transparent", color: T.inkSoft, display: "grid", placeItems: "center", cursor: "pointer" }}>
                          <X size={16} strokeWidth={1.75} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>
        ))}
        <div className="fb" style={{ fontSize: 12, color: T.inkSoft, padding: "10px 16px", lineHeight: 1.5 }}>A equipe confirma a disponibilidade dos sabores para a data.</div>
      </section>

      <section aria-label="Todos os sabores">
        <div className="fb" style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Todos os sabores</div>
        {linhas.length > 1 && (
          <div role="tablist" aria-label="Linha" style={{ display: "inline-flex", marginTop: 10, padding: 3, background: T.bgWarm, borderRadius: 12 }}>
            {linhas.map((l) => (
              <button key={l} type="button" role="tab" aria-selected={linha === l} onClick={() => { setLinha(l); setAviso(null); }} className="fb"
                style={{ minHeight: 38, padding: "0 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600,
                  background: linha === l ? T.surface : "transparent", color: linha === l ? T.ink : T.inkSoft, boxShadow: linha === l ? "0 1px 2px rgba(35,38,25,.12)" : "none" }}>
                {l === "gelato" ? "Gelatos" : "Picolés"}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {FILTROS.map((f) => <Chip key={f.id} ativo={filtro === f.id} onClick={() => setFiltro(f.id)}>{f.rotulo}</Chip>)}
        </div>
        {aviso && <div className="fb" role="status" style={{ fontSize: 13, color: T.accentInk, marginTop: 10 }}>{aviso}</div>}
        {lista.length === 0
          ? <div className="fb" style={{ fontSize: 13.5, color: T.inkSoft, marginTop: 14 }}>Nenhum {linha === "gelato" ? "gelato" : "picolé"} com esse filtro.</div>
          : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginTop: 12 }}>
              {lista.map((x) => {
                const p = produto(x.id);
                const sel = escolhidos[x.linha].includes(x.id);
                const cheio = !sel && max[x.linha] > 1 && escolhidos[x.linha].length >= max[x.linha];
                return (
                  <button key={x.id} type="button" onClick={() => alternar(x)} aria-pressed={sel} aria-disabled={cheio}
                    className="fb ev-sabor" style={{ position: "relative", textAlign: "left", padding: 0, borderRadius: 14, cursor: "pointer", overflow: "hidden",
                      background: T.surface, border: `${sel ? 2 : 1}px solid ${sel ? T.pistacheDark : T.border}`, opacity: cheio ? 0.5 : 1 }}>
                    <span style={{ display: "block", aspectRatio: "1 / 1", background: T.bgWarm }}><ProductArt product={p} size="100%" /></span>
                    {sel && <span aria-hidden="true" style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", background: T.pistacheDark, color: T.surface, display: "grid", placeItems: "center" }}><Check size={15} strokeWidth={2.25} /></span>}
                    <span style={{ display: "block", padding: "10px 12px 12px" }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.25 }}>{x.nome}</span>
                      <span style={{ display: "block", fontSize: 12, color: T.inkSoft, marginTop: 4, lineHeight: 1.35 }}>
                        {[x.semLactose && "Sem lactose", x.nozes && "Tem castanha ou amendoim", !x.semLactose && !x.nozes && x.sub].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
      </section>
      <style>{`
        .ev-sabor:focus-visible{outline:2px solid ${T.pistacheDark};outline-offset:2px}
        .ev-gira{animation:evGira .9s linear infinite}
        @keyframes evGira{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion:reduce){.ev-gira{animation:none}}
      `}</style>
    </div>
  );
}
