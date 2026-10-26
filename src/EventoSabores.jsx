// Passo "Sabores" do orçamento de evento (o 3 de 4): navegar por todos os
// sabores, escolher dentro do limite do formato e, se quiser, pedir a
// combinação à Bentô IA.
//
// O limite é fechado de propósito (EV_LIMITE_SABORES, em eventos-regras.js):
// o cliente escolhe dentro do que a operação entrega. A sugestão pronta e a IA
// puxam para combinações simples — chocolate, fruta, opção sem lactose — em
// vez de invenção. Tudo o que a tela mostra de um sabor vem de data.js (via
// saboresEvento); a IA só devolve ids, que o servidor já conferiu.
import { useMemo, useState, useRef, useEffect } from "react";
import { Check, X, LoaderCircle, Baby, MilkOff, Dumbbell, ChevronDown, Undo2 } from "lucide-react";
import { T, tk, ProductArt } from "./shared.jsx";
import { PRODUCTS } from "./data.js";
import { saboresEvento, alergiasDasNotas, conflitosComAlergias } from "./ia/catalogo.js";

// Filtros só na aba de gelatos (os picolés são poucos). "Sem glúten" saiu:
// passava quase tudo; a marca "Contém glúten" no card diz mais.
const FILTROS = [
  { id: "todos", rotulo: "Todos", f: () => true },
  { id: "semLactose", rotulo: "Sem lactose", f: (x) => x.semLactose },
  { id: "crianca", rotulo: "Para crianças", f: (x) => x.crianca },
  { id: "chocolate", rotulo: "Chocolate", f: (x) => x.chocolate },
  { id: "fruta", rotulo: "Frutas", f: (x) => x.fruta },
];
const PREFS = [
  { id: "criancas", rotulo: "Tem crianças", Icone: Baby },
  { id: "semLactose", rotulo: "Intolerância à lactose", Icone: MilkOff },
  { id: "fitness", rotulo: "Público que treina", Icone: Dumbbell },
];
// O selo da Bentô marca o que vem da Bentô IA (o Sparkles já significava
// quiz, Clube e IA ao mesmo tempo no site).
const Selo = ({ tam = 20 }) => <img src="/bento-logo.webp" alt="" width={tam} height={tam} style={{ borderRadius: "50%", flexShrink: 0, display: "block" }} />;

const produto = (id) => PRODUCTS.find((p) => p.id === id);
const plural = (n, um, varios) => (n === 1 ? um : varios);

// radio: filtro (escolha única) é rádio para o leitor de tela; preferência é liga-desliga.
function Chip({ ativo, onClick, children, radio = false }) {
  return (
    <button type="button" onClick={onClick} {...(radio ? { role: "radio", "aria-checked": ativo } : { "aria-pressed": ativo })} className="fb"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 500,
        border: `1px solid ${ativo ? T.pistacheDark : T.border}`, background: ativo ? T.pistacheDark : T.surface, color: ativo ? T.surface : T.ink, transition: "background .15s, color .15s, border-color .15s" }}>
      {children}
    </button>
  );
}

// notas: controlada pelo orçamento — o que a pessoa conta aqui (alergia, idade
// das crianças) segue para as observações do pedido, e não morre neste passo.
// rodape: os botões do orçamento (voltar, continuar), que ficam no rodapé fixo
// junto com os contadores — ao alcance do polegar, com a grade inteira acima.
export default function EventoSabores({ evento, limites, valor, onChange, iaAtiva, notas = "", onNotas = () => {}, onEquipeEscolhe, rodape = null }) {
  const todos = useMemo(() => saboresEvento(), []);
  const linhas = [limites.gelatos > 0 && "gelato", limites.picoles > 0 && "picole"].filter(Boolean);
  const [linha, setLinha] = useState(linhas[0]);
  const [filtro, setFiltro] = useState("todos");
  const [prefs, setPrefs] = useState({ criancas: false, semLactose: false, fitness: false });
  const [abrirIA, setAbrirIA] = useState(() => !!String(notas).trim());
  const [carregando, setCarregando] = useState(false);
  const [erroIA, setErroIA] = useState(null);
  const [aviso, setAviso] = useState(null);
  // Escolha que a sugestão da IA substituiu: "Desfazer" devolve.
  const [antesDaIA, setAntesDaIA] = useState(null);
  const resumo = useRef(null);

  const escolhidos = { gelato: valor.gelatos || [], picole: valor.picoles || [] };
  const max = { gelato: limites.gelatos, picole: limites.picoles };
  const chave = { gelato: "gelatos", picole: "picoles" };

  const alterar = (l, ids) => { setAviso(null); setAntesDaIA(null); onChange({ gelatos: escolhidos.gelato, picoles: escolhidos.picole, [chave[l]]: ids, origem: "cliente", motivo: null }); };
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

  // Pedido em andamento morre com o passo: quem já seguiu para o contrato não
  // pode ter a escolha trocada por uma sugestão que chegou depois.
  const pedido = useRef(null);
  useEffect(() => () => { try { pedido.current && pedido.current.abort(); } catch { /* */ } }, []);
  const pedirIA = async () => {
    try { pedido.current && pedido.current.abort(); } catch { /* */ }
    const c = new AbortController(); pedido.current = c;
    setCarregando(true); setErroIA(null); setAviso(null);
    tk("Eventos · Sabores · Sugestão da IA");
    try {
      const r = await fetch("/api/ia", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: c.signal,
        body: JSON.stringify({ modo: "sabores-evento", evento: { convidados: evento.convidados, tipo: evento.tipo, formato: evento.formato }, prefs, notas: notas.trim().slice(0, 300) }),
      });
      const j = await r.json().catch(() => null);
      if (c.signal.aborted) return;
      if (!r.ok || !j || !j.ok) throw new Error((j && j.erro) || "Não consegui sugerir agora. Escolha abaixo ou tente de novo.");
      setAntesDaIA({ gelatos: escolhidos.gelato, picoles: escolhidos.picole, origem: valor.origem, motivo: valor.motivo });
      onChange({ gelatos: j.gelatos, picoles: j.picoles, origem: j.origem, motivo: j.motivo });
      // A combinação nova aparece no resumo, acima: leva a pessoa até ela.
      try {
        const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        resumo.current && resumo.current.scrollIntoView({ block: "start", behavior: parado ? "auto" : "smooth" });
      } catch { /* */ }
    } catch (e) {
      if (c.signal.aborted) return;
      setErroIA(String((e && e.message) || "Sem conexão agora. Tente de novo."));
    } finally {
      if (pedido.current === c) { pedido.current = null; if (!c.signal.aborted) setCarregando(false); }
    }
  };
  const desfazer = () => { if (!antesDaIA) return; tk("Eventos · Sabores · Desfazer sugestão"); onChange(antesDaIA); setAntesDaIA(null); };

  const filtroAtivo = linha === "gelato" ? filtro : "todos";
  const lista = todos.filter((x) => x.linha === linha && (FILTROS.find((f) => f.id === filtroAtivo) || FILTROS[0]).f(x));
  const g = limites.gelatos, pc = limites.picoles;
  const regra = g && pc
    ? `${g} ${plural(g, "sabor de gelato", "sabores de gelato")} e até ${pc} de picolé`
    : g ? `${g} ${plural(g, "sabor de gelato", "sabores de gelato")}` : `${pc} ${plural(pc, "sabor de picolé", "sabores de picolé")}`;
  const completa = linhas.every((l) => escolhidos[l].length > 0);
  // Escolha que bate com a alergia escrita nas observações: avisa na hora.
  const conflitos = conflitosComAlergias({ gelatos: escolhidos.gelato, picoles: escolhidos.picole }, alergiasDasNotas(notas));

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <div className="fd" style={{ fontSize: 22, color: T.ink, lineHeight: 1.2 }}>Sabores do seu evento</div>
        <div className="fb" style={{ fontSize: 13.5, color: T.inkSoft, marginTop: 6, lineHeight: 1.5 }}>
          {evento.formatoNome} · {evento.convidados} convidados. Escolha até {regra}.
        </div>
      </div>

      {/* A combinação já vem montada: o resumo vem primeiro e diz que está pronta. */}
      <section ref={resumo} aria-label="Sua combinação" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", scrollMarginTop: 90 }}>
        <div className="fb" style={{ padding: "14px 16px 0", fontSize: 15, fontWeight: 600, color: T.ink }}>Sua combinação</div>
        <div className="fb" style={{ padding: "2px 16px 0", fontSize: 13, color: completa ? T.pistacheDark : T.inkSoft, lineHeight: 1.5 }}>
          {completa ? "Pronta. Pode continuar ou trocar sabores na lista abaixo." : "Falta escolher: veja na lista abaixo."}
        </div>
        {conflitos.length > 0 && (
          <div className="fb" role="alert" style={{ margin: "12px 16px 0", padding: "12px 14px", borderRadius: 12, border: `1px solid ${T.alertaBorda}`, background: T.alertaBg, fontSize: 13.5, color: T.alerta, lineHeight: 1.5 }}>
            <strong style={{ fontWeight: 600 }}>{conflitos.map((c) => `${c.nome} contém ${c.alergia}`).join(" · ")}.</strong> Você avisou alergia a isso: troque o sabor ou confirme com a equipe.
          </div>
        )}
        {valor.motivo && (
          <div className="fb" aria-live="polite" style={{ display: "flex", gap: 10, margin: "12px 16px 0", padding: "12px 14px", borderRadius: 12, background: T.bg }}>
            <Selo tam={20} />
            <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5, flex: 1, minWidth: 0 }}>
              <strong style={{ fontWeight: 600 }}>{valor.origem === "ia" ? "Sugestão da Bentô IA" : "Sugestão da Bentô"}.</strong> {valor.motivo}
              {antesDaIA && (
                <button type="button" onClick={desfazer} className="fb" style={{ display: "inline-flex", alignItems: "center", gap: 5, minHeight: 32, marginLeft: 6, padding: "0 6px", border: "none", background: "transparent", color: T.pistacheDark, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Undo2 size={14} strokeWidth={1.75} aria-hidden="true" />Desfazer
                </button>
              )}
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
                        <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: T.bgWarm }}><ProductArt product={p} size={40} /></span>
                        <span className="fb" style={{ flex: 1, minWidth: 0, fontSize: 14.5, color: T.ink }}>{p.name}</span>
                        <button type="button" onClick={() => alterar(l, escolhidos[l].filter((x) => x !== id))} aria-label={`Tirar ${p.name}`}
                          style={{ width: 44, height: 44, borderRadius: 10, border: "none", background: "transparent", color: T.inkSoft, display: "grid", placeItems: "center", cursor: "pointer" }}>
                          <X size={16} strokeWidth={1.75} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>
        ))}
        <div className="fb" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", padding: "8px 16px 10px" }}>
          <span style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5 }}>A equipe confirma a disponibilidade dos sabores para a data.</span>
          {onEquipeEscolhe && <button type="button" onClick={onEquipeEscolhe} className="fb" style={{ minHeight: 44, padding: "0 4px", border: "none", background: "transparent", color: T.pistacheDark, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Prefiro que a Bentô escolha</button>}
        </div>
      </section>

      {iaAtiva && (
        <section aria-label="Ajustar com a Bentô IA" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 16 }}>
          <button type="button" aria-expanded={abrirIA} aria-controls="ev-ia" onClick={() => setAbrirIA((v) => !v)} className="fb"
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 16px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", borderRadius: 16 }}>
            <Selo tam={26} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: T.ink }}>Ajustar com a Bentô IA</span>
              <span style={{ display: "block", fontSize: 12.5, color: T.inkSoft, marginTop: 1, lineHeight: 1.4 }}>Conte quem vai ao evento e ela sugere outra combinação</span>
            </span>
            <ChevronDown size={18} strokeWidth={1.75} color={T.inkSoft} aria-hidden="true" style={{ flexShrink: 0, transform: abrirIA ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {abrirIA && (
            <div id="ev-ia" style={{ padding: "0 16px 16px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PREFS.map(({ id, rotulo, Icone }) => (
                  <Chip key={id} ativo={prefs[id]} onClick={() => setPrefs((p) => ({ ...p, [id]: !p[id] }))}>
                    <Icone size={15} strokeWidth={1.75} aria-hidden="true" />{rotulo}
                  </Chip>
                ))}
              </div>
              <label className="fb" htmlFor="ev-sabores-notas" style={{ display: "block", fontSize: 12.5, color: T.inkSoft, marginTop: 12, marginBottom: 6 }}>Algo mais que a gente deva saber? (opcional)</label>
              <textarea id="ev-sabores-notas" className="fb ev-campo" rows={2} value={notas} maxLength={300} onChange={(e) => onNotas(e.target.value)}
                aria-describedby="ev-sabores-notas-ajuda" placeholder="Ex.: aniversário de 6 anos, um convidado alérgico a amendoim" />
              <div id="ev-sabores-notas-ajuda" className="fb" style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 6, lineHeight: 1.45 }}>Vai junto nas observações do orçamento, para a equipe ver.</div>
              <button type="button" onClick={pedirIA} disabled={carregando} className="fb"
                style={{ marginTop: 12, minHeight: 44, padding: "0 18px", borderRadius: 12, border: "none", background: carregando ? T.border : T.pistacheDark, color: carregando ? T.inkSoft : T.surface, fontSize: 14.5, fontWeight: 600, cursor: carregando ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                {carregando ? <><LoaderCircle size={16} className="ev-gira" aria-hidden="true" />Montando a combinação…</> : "Sugerir combinação"}
              </button>
              {erroIA && <div className="fb" role="alert" style={{ fontSize: 13, color: T.alerta, marginTop: 10, lineHeight: 1.5 }}>{erroIA}</div>}
            </div>
          )}
        </section>
      )}

      <section aria-label="Todos os sabores">
        <div className="fb" style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Todos os sabores</div>
        {linhas.length > 1 && (
          <div role="tablist" aria-label="Linha" style={{ display: "inline-flex", marginTop: 10, padding: 3, background: T.bgWarm, borderRadius: 12 }}>
            {linhas.map((l) => (
              <button key={l} type="button" role="tab" aria-selected={linha === l} onClick={() => { setLinha(l); setAviso(null); }} className="fb"
                style={{ minHeight: 44, padding: "0 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600,
                  background: linha === l ? T.surface : "transparent", color: linha === l ? T.ink : T.inkSoft, boxShadow: linha === l ? "0 1px 2px rgba(35,38,25,.12)" : "none" }}>
                {l === "gelato" ? "Gelatos" : "Picolés"}
              </button>
            ))}
          </div>
        )}
        {linha === "gelato" && (
          <div role="radiogroup" aria-label="Filtrar gelatos" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {FILTROS.map((f) => <Chip key={f.id} radio ativo={filtro === f.id} onClick={() => setFiltro(f.id)}>{f.rotulo}</Chip>)}
          </div>
        )}
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
                    <span aria-hidden="true" style={{ display: "block", aspectRatio: "1 / 1", background: T.bgWarm }}><ProductArt product={p} size="100%" /></span>
                    {sel && <span aria-hidden="true" style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", background: T.pistacheDark, color: T.surface, display: "grid", placeItems: "center" }}><Check size={15} strokeWidth={2.25} /></span>}
                    <span style={{ display: "block", padding: "10px 12px 12px" }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.25 }}>{x.nome}</span>
                      <span style={{ display: "block", fontSize: 12, color: T.inkSoft, marginTop: 4, lineHeight: 1.35 }}>
                        {/* Sem lactose não é sem leite (Framboesa Duo): quem tem alergia ao leite precisa ver. */}
                        {[x.semLactose && (x.semLeite ? "Sem lactose" : "Sem lactose · contém leite"), x.nozes && "Tem castanha ou amendoim", !x.semGluten && "Contém glúten", !x.semLactose && !x.nozes && x.semGluten && x.sub].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
      </section>

      {/* Rodapé fixo: contadores, aviso de limite e os botões do orçamento,
          sempre à vista enquanto a pessoa percorre a grade. */}
      <div className="ev-rodape" style={{ position: "sticky", bottom: 0, zIndex: 1, margin: "0 -22px -22px", padding: "12px 22px calc(14px + env(safe-area-inset-bottom))", background: T.surface, borderTop: `1px solid ${T.border}`, boxShadow: "0 -12px 24px -20px rgba(35,38,25,.45)" }}>
        <div className="fb" role="status" aria-live="polite" style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 14px", fontSize: 13, color: T.inkSoft, marginBottom: 10 }}>
          {linhas.map((l) => (
            <span key={l}>{l === "gelato" ? "Gelato" : "Picolé"} <span className="fm" style={{ fontWeight: 600, color: escolhidos[l].length ? T.pistacheDark : T.ink, fontVariantNumeric: "tabular-nums" }}>{escolhidos[l].length}/{max[l]}</span></span>
          ))}
          {aviso && <span style={{ flexBasis: "100%", color: T.accentInk, fontWeight: 600 }}>{aviso}</span>}
        </div>
        {rodape}
      </div>
      <style>{`
        .ev-sabor:focus-visible{outline:2px solid ${T.pistacheDark};outline-offset:2px}
        .ev-campo{display:block;width:100%;box-sizing:border-box;min-height:64px;padding:10px 12px;border-radius:12px;border:1px solid ${T.border};background:${T.surface};color:${T.ink};font-size:16px;line-height:1.4;resize:none;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
        .ev-campo:focus{border-color:${T.pistacheDark};box-shadow:0 0 0 3px rgba(70,88,58,.18)}
        .ev-gira{animation:evGira .9s linear infinite}
        @keyframes evGira{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion:reduce){.ev-gira{animation:none}}
      `}</style>
    </div>
  );
}
