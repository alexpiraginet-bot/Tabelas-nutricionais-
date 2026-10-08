// Bentô IA — a conversa do site.
//
// O texto vem do modelo; tudo o que tem número (card de sabor, comparação,
// loja, orçamento) é montado AQUI, a partir dos dados oficiais do bundle e dos
// ids que o servidor validou. A IA escolhe o que mostrar; quem desenha e
// calcula é o site. Assim um card nunca mostra uma tabela que não existe.
import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, X, ArrowUp, Mic, Square, RotateCcw, MapPin, MessageCircle, ShoppingBag, ChevronRight, CupSoda, Clock, PartyPopper, Truck } from "lucide-react";
import { tk, T, ProductArt, useModal } from "../shared.jsx";
import { ALLERGENS } from "../data.js";
import { LOJAS } from "../lojas.js";
import { saborPorId, ehShake, alegacoes, orcamentoEvento, DESTINOS, PEDIR_URL, STUDIO_URL, ZAP } from "./catalogo.js";
import { SUGESTOES } from "./sugestoes.js";

const CHAVE = "bento:ia:v1";
const MAX_GUARDADAS = 24;

const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (v) => String(Math.round(v * 10) / 10).replace(".", ",");
const zapLink = (msg) => `https://wa.me/${ZAP}${msg ? "?text=" + encodeURIComponent(msg) : ""}`;
const abrir = (url) => { try { window.open(url, "_blank", "noopener"); } catch { /* */ } };
const guardar = (msgs) => { try { sessionStorage.setItem(CHAVE, JSON.stringify(msgs.slice(-MAX_GUARDADAS))); } catch { /* */ } };
const ler = () => { try { const v = JSON.parse(sessionStorage.getItem(CHAVE) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };

// Lê o fluxo SSE do /api/ia e chama onEvento(nome, dados) a cada evento.
async function lerFluxo(resp, onEvento) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const quadro = buf.slice(0, i); buf = buf.slice(i + 2);
      let ev = "message", dados = "";
      for (const linha of quadro.split("\n")) {
        if (linha.startsWith("event: ")) ev = linha.slice(7).trim();
        else if (linha.startsWith("data: ")) dados += linha.slice(6);
      }
      if (!dados) continue;
      try { onEvento(ev, JSON.parse(dados)); } catch { /* quadro corrompido: ignora */ }
    }
  }
}

/* ---------- blocos (UI gerada a partir de ids validados) ---------- */

function Selo({ children }) {
  // Dourado é selo, nunca botão (regra da marca).
  return <span className="fm" style={{ fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: T.accentInk, border: `1px solid ${T.accent}88`, borderRadius: 999, padding: "3px 7px", whiteSpace: "nowrap" }}>{children}</span>;
}
const botao = (primario) => ({
  display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 999, padding: "8px 13px", textDecoration: "none",
  background: primario ? T.pistacheDark : T.surface, color: primario ? T.surface : T.pistacheDark, border: `1px solid ${primario ? T.pistacheDark : T.border}`,
});

function CardSabor({ id, acoes }) {
  const x = saborPorId(id);
  if (!x) return null;
  if (ehShake(x)) {
    const kcal = x.nutrition.map((r) => r.kcal);
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "center", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 12 }}>
        <div aria-hidden="true" style={{ width: 58, height: 58, borderRadius: 12, background: x.color.bg, color: x.color.ink, display: "grid", placeItems: "center", flexShrink: 0 }}><CupSoda size={24} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="fd" style={{ fontSize: 16, color: T.ink, lineHeight: 1.15 }}>{x.name}</div>
          <div className="fb" style={{ fontSize: 12, color: T.inkSoft, marginTop: 3 }}>{x.protein} g de proteína · {Math.min(...kcal)} a {Math.max(...kcal)} kcal conforme o líquido</div>
          <div className="fb" style={{ fontSize: 11, color: T.inkSoft, marginTop: 3 }}>Contém: LEITE (whey)</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => tk("IA · Card · Pedir", () => abrir(PEDIR_URL))} style={botao(true)}><ShoppingBag size={13} />Pedir</button>
          </div>
        </div>
      </div>
    );
  }
  const n = x.nutrition, contem = ALLERGENS[x.id] || [], al = alegacoes(x);
  const acucar = al.find((a) => a.startsWith("SEM ADIÇÃO"));
  const proteina = al.find((a) => /PROTEÍNA/.test(a));
  return (
    <div style={{ display: "flex", gap: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 12 }}>
      <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: T.bgWarm }}><ProductArt product={x} size={64} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="fd" style={{ fontSize: 16, color: T.ink, lineHeight: 1.15 }}>{x.name}</div>
        <div className="fb" style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2 }}>{x.category === "bentole" ? "Bentôlé · " : "Gelato · "}{x.portionLabel}</div>
        <div className="fb" style={{ fontSize: 12.5, color: T.ink, marginTop: 6 }}>
          <strong style={{ color: T.pistacheDark }}>{num(n.protein)} g</strong> proteína · {num(n.kcal)} kcal · {num(n.addedSugars)} g açúc. adic.
        </div>
        {(acucar || proteina) && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
            {acucar && <Selo>Sem adição de açúcares</Selo>}
            {proteina && <Selo>{proteina.toLowerCase().replace(/^./, (c) => c.toUpperCase())}</Selo>}
          </div>
        )}
        <div className="fb" style={{ fontSize: 11, color: T.inkSoft, marginTop: 6, lineHeight: 1.45 }}>
          {contem.length ? "Contém: " + contem.join(", ") : "Sem alérgicos declarados"}
          {acucar && acucar.includes("próprios") ? " · Contém açúcares próprios dos ingredientes." : ""}
          {x.hasPolyols ? " · Pode ter efeito laxativo." : ""}
          {x.estimated ? " · Valores estimados." : ""}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
          <button onClick={() => tk("IA · Card · Ver ficha", () => acoes.ficha(x.id))} style={botao(false)}>Ver ficha<ChevronRight size={13} /></button>
          <button onClick={() => tk("IA · Card · Pedir", () => abrir(PEDIR_URL))} style={botao(true)}><ShoppingBag size={13} />Pedir</button>
        </div>
      </div>
    </div>
  );
}

function Comparacao({ ids }) {
  const ps = ids.map(saborPorId).filter((p) => p && !ehShake(p));
  if (ps.length < 2) return <>{ids.map((id) => <CardSabor key={id} id={id} acoes={{ ficha: () => {} }} />)}</>;
  const linhas = [
    ["Porção", (p) => p.portionLabel.replace(/ \(.*\)/, "")],
    ["Calorias", (p) => num(p.nutrition.kcal) + " kcal", "min", (p) => p.nutrition.kcal],
    ["Proteína", (p) => num(p.nutrition.protein) + " g", "max", (p) => p.nutrition.protein],
    ["Carboidratos", (p) => num(p.nutrition.carbs) + " g"],
    ["Açúcares adic.", (p) => num(p.nutrition.addedSugars) + " g"],
    ["Gord. saturada", (p) => num(p.nutrition.satFat) + " g"],
    ["Fibras", (p) => num(p.nutrition.fiber) + " g"],
    ["Lactose", (p) => (p.flags.lactose ? "contém" : "não contém")],
  ];
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflowX: "auto" }}>
      <table className="fb" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 500, color: T.inkSoft }}>Por porção</th>
            {ps.map((p) => <th key={p.id} className="fd" style={{ textAlign: "left", padding: "10px 8px", fontWeight: 400, fontSize: 13.5, color: T.ink, minWidth: 92 }}>{p.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.map(([rot, f, melhor, val]) => {
            const vals = val ? ps.map(val) : null;
            const alvo = vals ? (melhor === "max" ? Math.max(...vals) : Math.min(...vals)) : null;
            return (
              <tr key={rot} style={{ borderTop: `1px solid ${T.borderSoft}` }}>
                <td style={{ padding: "8px 12px", color: T.inkSoft, whiteSpace: "nowrap" }}>{rot}</td>
                {ps.map((p, i) => <td key={p.id} style={{ padding: "8px", color: vals && vals[i] === alvo ? T.pistacheDark : T.ink, fontWeight: vals && vals[i] === alvo ? 700 : 400 }}>{f(p)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Ficha({ id, acoes }) {
  const x = saborPorId(id);
  if (!x || ehShake(x)) return id ? <CardSabor id={id} acoes={acoes} /> : null;
  const contem = ALLERGENS[x.id] || [];
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
      <div className="fm" style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: T.inkSoft }}>Ficha · {x.name}</div>
      <div className="fb" style={{ fontSize: 13, color: T.ink, marginTop: 8, lineHeight: 1.5 }}>
        <strong>{contem.length ? "Alérgicos: contém " + contem.join(", ") + "." : "Sem alérgicos de declaração obrigatória."}</strong>
        <div style={{ marginTop: 4 }}>{x.flags.lactose ? "Contém lactose" : "Não contém lactose"} · {x.flags.gluten ? "contém glúten" : "não contém glúten"}.</div>
        {x.hasPolyols && <div style={{ marginTop: 4 }}>Contém polióis: este produto pode ter efeito laxativo.</div>}
        <div style={{ marginTop: 4, color: T.inkSoft, fontSize: 12 }}>Produção compartilhada: pode conter traços de outros alérgicos.</div>
      </div>
      <button onClick={() => tk("IA · Ficha · Abrir", () => acoes.ficha(x.id))} style={{ ...botao(false), marginTop: 10 }}>Abrir ficha completa<ChevronRight size={13} /></button>
    </div>
  );
}

function Lojas({ bloco }) {
  const estado = Array.isArray(bloco.lojas) ? bloco.lojas : [];
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {LOJAS.map((l) => {
        const s = estado.find((x) => x && x.id === l.id);
        const e = Array.isArray(bloco.entrega) ? bloco.entrega.find((x) => x && x.id === l.id) : null;
        return (
          <div key={l.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div className="fd" style={{ fontSize: 15.5, color: T.ink }}>Bentô {l.nome}</div>
              {s && <span className="fm" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 8px", borderRadius: 999, background: s.aberta ? "#E5EBD3" : T.bgWarm, color: s.aberta ? T.pistacheDark : T.inkSoft }}>{s.aberta ? "Aberta agora" : "Fechada"}</span>}
            </div>
            {s && <div className="fb" style={{ fontSize: 12, color: T.inkSoft, marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}><Clock size={12} />{s.aberta ? `Hoje até ${s.fecha_as}` : s.abre ? `Abre ${s.abre}` : `Hoje: ${s.hoje}`}</div>}
            <div className="fb" style={{ fontSize: 12, color: T.inkSoft, marginTop: 3 }}>{l.endereco}</div>
            {e && e.entrega === true && (
              <div className="fb" style={{ fontSize: 12, color: T.pistacheDark, marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}><Truck size={12} />Entrega própria{e.gratis ? (e.raio_km ? ` grátis até ${num(e.raio_km)} km` : " grátis") : e.raio_km ? ` até ${num(e.raio_km)} km` : ""}{e.pedido_minimo ? ` · mínimo ${brl(e.pedido_minimo)}` : ""}{e.prazo_min ? ` · ~${e.prazo_min} min` : ""}</div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
              <a href={l.maps} target="_blank" rel="noopener noreferrer" onClick={() => tk("IA · Loja · Mapa")} style={botao(false)}><MapPin size={13} />Como chegar</a>
              <a href={zapLink("")} target="_blank" rel="noopener noreferrer" onClick={() => tk("IA · Loja · WhatsApp")} style={botao(false)}><MessageCircle size={13} />WhatsApp</a>
              <button onClick={() => tk("IA · Loja · Pedir", () => abrir(PEDIR_URL))} style={botao(true)}><ShoppingBag size={13} />Pedir online</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Evento({ bloco, acoes }) {
  const o = orcamentoEvento(bloco.convidados, bloco.produtos);
  if (!o) return null;
  if (o.abaixo_do_minimo) {
    return (
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
        <div className="fb" style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>Para {o.convidados} pessoas o orçamento é feito pela equipe (o online começa em {o.minimo_online} convidados).</div>
        <a href={zapLink(`Olá! Quero um orçamento de evento para ${o.convidados} pessoas.`)} target="_blank" rel="noopener noreferrer" onClick={() => tk("IA · Evento · WhatsApp")} style={{ ...botao(true), marginTop: 10 }}><MessageCircle size={13} />Pedir pelo WhatsApp</a>
      </div>
    );
  }
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
      <div className="fm" style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: T.inkSoft }}>Evento · {o.convidados} convidados</div>
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {o.formatos.map((f) => (
          <div key={f.id} style={{ border: `1px solid ${f.sugerido ? T.pistacheDark : T.borderSoft}`, borderRadius: 12, padding: "10px 12px", background: f.sugerido ? "#F1F4E8" : T.bg }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <div className="fd" style={{ fontSize: 15, color: T.ink }}>{f.nome}</div>
              <div className="fb" style={{ fontSize: 14, fontWeight: 700, color: T.pistacheDark, whiteSpace: "nowrap" }}>{brl(f.subtotal_servico)}</div>
            </div>
            <div className="fb" style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 3, lineHeight: 1.45 }}>{brl(f.servico_por_pessoa)} por pessoa · {f.servico}</div>
            <div className="fb" style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2, lineHeight: 1.45 }}>{f.rendimento}</div>
          </div>
        ))}
      </div>
      <div className="fb" style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 8, lineHeight: 1.45 }}>Fora do subtotal: logística (pelo endereço) e personalização, se quiser.</div>
      <button onClick={() => tk("IA · Evento · Abrir orçamento", () => acoes.eventos(o.convidados))} style={{ ...botao(true), marginTop: 10 }}><PartyPopper size={13} />Montar orçamento com {o.convidados} convidados</button>
    </div>
  );
}

function Atalho({ bloco, acoes }) {
  const d = DESTINOS[bloco.destino];
  if (!d) return null;
  const ir = () => {
    tk("IA · Atalho · " + bloco.destino);
    if (bloco.destino === "pedir" || bloco.destino === "cardapio") abrir(PEDIR_URL);
    else if (bloco.destino === "studio") abrir(STUDIO_URL);
    else if (bloco.destino === "eventos") acoes.eventos(null);
    else if (bloco.destino === "tabelas") acoes.tabelas();
    else if (bloco.destino === "seja-bento") window.location.href = "/seja-bento";
    else if (bloco.destino === "vagas") window.location.href = "/?vagas";
    else if (bloco.destino === "whatsapp") abrir(zapLink(bloco.mensagem || ""));
  };
  return (
    <button onClick={ir} className="fb" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "11px 12px", cursor: "pointer" }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: T.pistacheDark, color: T.surface, display: "grid", placeItems: "center", flexShrink: 0 }}>{bloco.destino === "whatsapp" ? <MessageCircle size={15} /> : <ChevronRight size={16} />}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink }}>{d.rotulo}</span>
        <span style={{ display: "block", fontSize: 11.5, color: T.inkSoft, marginTop: 1 }}>{d.desc}</span>
      </span>
    </button>
  );
}

function Bloco({ b, acoes }) {
  if (!b || typeof b !== "object") return null;
  if (b.tipo === "sabores" && Array.isArray(b.ids)) return <div style={{ display: "grid", gap: 8 }}>{b.ids.map((id) => <CardSabor key={id} id={id} acoes={acoes} />)}</div>;
  if (b.tipo === "comparar" && Array.isArray(b.ids)) return <Comparacao ids={b.ids} />;
  if (b.tipo === "ficha") return <Ficha id={b.id} acoes={acoes} />;
  if (b.tipo === "lojas") return <Lojas bloco={b} />;
  if (b.tipo === "evento") return <Evento bloco={b} acoes={acoes} />;
  if (b.tipo === "atalho") return <Atalho bloco={b} acoes={acoes} />;
  return null;
}

// Uma resposta da IA: texto (do modelo) + blocos (montados aqui).
function Resposta({ m, vivo, acoes }) {
  return (
    <div style={{ display: "grid", gap: 8, maxWidth: "100%" }}>
      {m.texto ? <div className="fb" style={{ fontSize: 14.5, color: T.ink, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.texto}</div> : null}
      {vivo && m.status && (
        <div className="fb" role="status" style={{ fontSize: 12.5, color: T.inkSoft, display: "flex", alignItems: "center", gap: 7 }}>
          <span className="ia-pontos" aria-hidden="true"><i /><i /><i /></span>{m.status}
        </div>
      )}
      {(m.blocos || []).map((b, i) => <Bloco key={i} b={b} acoes={acoes} />)}
    </div>
  );
}

/* ---------- o painel ---------- */

export default function BentoIA({ onClose, pergunta, focar, onFicha, onEventos, onTabelas }) {
  useModal(onClose);
  const [msgs, setMsgs] = useState(ler);
  const [atual, setAtual] = useState(null);      // resposta em andamento: { texto, blocos, status }
  const [erro, setErro] = useState(null);
  const [entrada, setEntrada] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [altura, setAltura] = useState(null);
  const lista = useRef(null), campo = useRef(null), ctrl = useRef(null), rec = useRef(null), enviouInicial = useRef(false);
  const ocupado = !!atual;

  // Teclado do celular: o painel acompanha a área visível (senão a caixa de
  // texto fica atrás do teclado no iPhone).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    // O iOS também desloca a área visível ao abrir o teclado (offsetTop).
    const f = () => setAltura(window.innerWidth < 640 ? { h: Math.round(vv.height), top: Math.round(vv.offsetTop) } : null);
    f(); vv.addEventListener("resize", f); vv.addEventListener("scroll", f);
    return () => { vv.removeEventListener("resize", f); vv.removeEventListener("scroll", f); };
  }, []);
  useEffect(() => () => { try { ctrl.current && ctrl.current.abort(); } catch { /* */ } try { rec.current && rec.current.abort(); } catch { /* */ } }, []);
  // Os botões flutuantes (horários, suporte, selo da Lex, avisos do Clube)
  // ficam por cima da caixa de texto no celular e tapam o botão de enviar.
  // Somem enquanto a conversa está aberta e voltam ao fechar.
  useEffect(() => {
    const h = document.documentElement;
    h.classList.add("ia-aberta");
    return () => h.classList.remove("ia-aberta");
  }, []);
  useEffect(() => { const el = lista.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, atual, erro]);

  const enviar = useCallback(async (texto) => {
    const t = String(texto || "").trim().slice(0, 600);
    if (!t || ctrl.current) return;
    tk("IA · Pergunta");
    setErro(null); setEntrada("");
    const historico = [...msgs, { papel: "cliente", texto: t }];
    setMsgs(historico); guardar(historico);
    const resposta = { texto: "", blocos: [], status: "Pensando…" };
    setAtual({ ...resposta });
    const c = new AbortController(); ctrl.current = c;
    try {
      const r = await fetch("/api/ia", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: c.signal,
        body: JSON.stringify({ mensagens: historico.slice(-16) }),
      });
      if (!r.ok || !(r.headers.get("content-type") || "").includes("text/event-stream")) {
        const j = await r.json().catch(() => null);
        throw new Error((j && j.erro) || "A Bentô IA não respondeu agora. Tente de novo em instantes.");
      }
      let falha = null;
      await lerFluxo(r, (ev, d) => {
        if (ev === "texto" && typeof d.t === "string") { resposta.texto += d.t; resposta.status = null; }
        else if (ev === "bloco") resposta.blocos.push(d);
        else if (ev === "status" && typeof d.texto === "string") resposta.status = d.texto;
        else if (ev === "erro") falha = d.msg || "Algo deu errado.";
        setAtual({ ...resposta, blocos: [...resposta.blocos] });
      });
      if (falha && !resposta.texto && !resposta.blocos.length) throw new Error(falha);
      const final = [...historico, { papel: "ia", texto: resposta.texto.trim() || (falha || ""), blocos: resposta.blocos }];
      setMsgs(final); guardar(final);
    } catch (e) {
      if (e && e.name === "AbortError") return;
      setErro(String((e && e.message) || "Sem conexão agora. Tente de novo."));
    } finally {
      ctrl.current = null; setAtual(null);
    }
  }, [msgs]);

  // Pergunta que veio da home (chip) ou do link ?ia=...: envia ao abrir.
  useEffect(() => {
    if (enviouInicial.current) return;
    enviouInicial.current = true;
    if (pergunta) enviar(pergunta);
    else if (focar) setTimeout(() => { try { campo.current && campo.current.focus(); } catch { /* */ } }, 60);
  }, [pergunta, focar, enviar]);

  const novaConversa = () => {
    try { ctrl.current && ctrl.current.abort(); } catch { /* */ }
    tk("IA · Nova conversa");
    setMsgs([]); setAtual(null); setErro(null); guardar([]);
  };
  const tentarDeNovo = () => {
    const ult = [...msgs].reverse().find((m) => m.papel === "cliente");
    if (!ult) return;
    const sem = msgs.slice(0, msgs.lastIndexOf(ult));
    setMsgs(sem); guardar(sem); setErro(null);
    setTimeout(() => enviar(ult.texto), 0);
  };

  // Ditado por voz (quando o navegador tem): preenche a caixa, a pessoa revisa e envia.
  const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const falar = () => {
    if (!SR) return;
    if (ouvindo) { try { rec.current && rec.current.stop(); } catch { /* */ } return; }
    try {
      const r = new SR(); rec.current = r;
      r.lang = "pt-BR"; r.interimResults = true; r.continuous = false;
      const base = entrada ? entrada.trim() + " " : "";
      r.onresult = (ev) => { let t = ""; for (const res of ev.results) t += res[0].transcript; setEntrada((base + t).slice(0, 600)); };
      r.onend = () => { setOuvindo(false); rec.current = null; };
      r.onerror = () => { setOuvindo(false); rec.current = null; };
      r.start(); setOuvindo(true); tk("IA · Voz");
    } catch { setOuvindo(false); }
  };

  const acoes = {
    ficha: (id) => onFicha && onFicha(id),
    eventos: (n) => onEventos && onEventos(n),
    tabelas: () => onTabelas && onTabelas(),
  };

  return (
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Bentô IA" style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(31,35,23,0.62)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
      <style>{`
        .ia-painel{position:absolute;left:0;right:0;bottom:0;top:0;display:flex;flex-direction:column;background:${T.bg};overflow:hidden}
        /* Centralizado com margin:auto, não com transform: a animação de entrada
           (.rise) termina em transform:none e desfaria a centralização. */
        @media(min-width:640px){.ia-painel{margin:auto;width:min(560px,calc(100vw - 32px));height:min(780px,calc(100vh - 48px));border-radius:20px;border:1px solid ${T.border};box-shadow:0 30px 80px -30px rgba(0,0,0,.45)}}
        .ia-pontos{display:inline-flex;gap:3px}.ia-pontos i{width:5px;height:5px;border-radius:50%;background:${T.pistache};animation:iaP 1.2s infinite ease-in-out}
        .ia-pontos i:nth-child(2){animation-delay:.15s}.ia-pontos i:nth-child(3){animation-delay:.3s}
        @keyframes iaP{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
        @media(prefers-reduced-motion:reduce){.ia-pontos i{animation:none;opacity:.6}}
        .ia-campo{resize:none;border:none;outline:none;background:transparent;width:100%;font:inherit;font-size:15px;line-height:1.45;color:${T.ink};max-height:120px}
        .ia-campo::placeholder{color:${T.inkSoft}}
        html.ia-aberta [data-alex-hub-support],html.ia-aberta [data-lex-cta],html.ia-aberta [data-flutuante]{display:none!important}
      `}</style>
      <div className="ia-painel rise" onClick={(e) => e.stopPropagation()} style={altura ? { height: altura.h, top: altura.top, bottom: "auto" } : undefined}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
          <span style={{ width: 34, height: 34, borderRadius: "50%", background: T.pistacheDark, color: T.surface, display: "grid", placeItems: "center", flexShrink: 0 }}><Sparkles size={16} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fd" style={{ fontSize: 17, color: T.ink, lineHeight: 1.1 }}>Bentô IA</div>
            <div className="fb" style={{ fontSize: 11, color: T.inkSoft, marginTop: 2 }}>Responde com o cardápio e as tabelas oficiais</div>
          </div>
          {(msgs.length > 0 || ocupado) && <button onClick={novaConversa} aria-label="Nova conversa" title="Nova conversa" style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${T.border}`, background: T.surface, color: T.inkSoft, display: "grid", placeItems: "center" }}><RotateCcw size={15} /></button>}
          <button onClick={onClose} aria-label="Fechar" style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${T.border}`, background: T.surface, color: T.ink, display: "grid", placeItems: "center" }}><X size={16} /></button>
        </div>

        <div ref={lista} style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "16px 14px 8px", display: "grid", alignContent: "start", gap: 14 }}>
          {msgs.length === 0 && !ocupado && (
            <div className="fade">
              <div className="fd" style={{ fontSize: 22, color: T.ink, lineHeight: 1.2 }}>Oi! O que você quer sentir hoje?</div>
              <p className="fb" style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, marginTop: 6 }}>Eu conheço todos os sabores, as tabelas nutricionais, as lojas e os eventos da Bentô. Pergunte do seu jeito.</p>
              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                {SUGESTOES.map((s) => (
                  <button key={s} onClick={() => tk("IA · Sugestão", () => enviar(s))} className="fb hl" style={{ textAlign: "left", fontSize: 13.5, color: T.ink, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "11px 13px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    {s}<ChevronRight size={15} style={{ color: T.pistacheDark, flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => m.papel === "cliente"
            ? <div key={i} className="fb" style={{ justifySelf: "end", maxWidth: "85%", background: T.pistacheDark, color: T.surface, fontSize: 14.5, lineHeight: 1.45, padding: "9px 13px", borderRadius: "16px 16px 4px 16px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.texto}</div>
            : <Resposta key={i} m={m} acoes={acoes} />)}
          {atual && <Resposta m={atual} vivo acoes={acoes} />}
          {erro && (
            <div className="fb" role="alert" style={{ fontSize: 13, color: "#7A3A0A", background: "#F7E7D6", border: "1px solid #E8C9A6", borderRadius: 12, padding: "10px 12px", lineHeight: 1.5 }}>
              {erro}
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <button onClick={tentarDeNovo} style={botao(false)}><RotateCcw size={13} />Tentar de novo</button>
                <a href={zapLink("")} target="_blank" rel="noopener noreferrer" style={botao(true)}><MessageCircle size={13} />WhatsApp</a>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "8px 12px calc(10px + env(safe-area-inset-bottom))", borderTop: `1px solid ${T.border}`, background: T.surface }}>
          <form onSubmit={(e) => { e.preventDefault(); enviar(entrada); }} style={{ display: "flex", alignItems: "flex-end", gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 18, padding: "8px 8px 8px 14px" }}>
            <textarea ref={campo} className="ia-campo fb" rows={1} value={entrada} maxLength={600} aria-label="Sua pergunta para a Bentô IA"
              placeholder={ouvindo ? "Pode falar…" : "Pergunte sobre sabores, lojas, eventos…"}
              onChange={(e) => { setEntrada(e.target.value); const el = e.target; el.style.height = "auto"; el.style.height = Math.min(120, el.scrollHeight) + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); enviar(entrada); } }} />
            {SR && <button type="button" onClick={falar} aria-label={ouvindo ? "Parar de ouvir" : "Falar a pergunta"} aria-pressed={ouvindo} style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${T.border}`, background: ouvindo ? "#F2E2C5" : T.surface, color: ouvindo ? "#7A5320" : T.inkSoft, display: "grid", placeItems: "center", flexShrink: 0 }}>{ouvindo ? <Square size={13} /> : <Mic size={15} />}</button>}
            <button type="submit" disabled={ocupado || !entrada.trim()} aria-label="Enviar pergunta" style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: ocupado || !entrada.trim() ? T.border : T.pistacheDark, color: T.surface, display: "grid", placeItems: "center", flexShrink: 0, cursor: ocupado || !entrada.trim() ? "default" : "pointer" }}><ArrowUp size={17} /></button>
          </form>
          <div className="fb" style={{ fontSize: 10.5, color: T.inkSoft, textAlign: "center", marginTop: 6, lineHeight: 1.4 }}>
            Respostas de IA com os dados oficiais da Bentô. Alergia grave? Confirme com a equipe. <a href="/?privacidade=1" target="_blank" rel="noopener noreferrer" style={{ color: T.pistacheDark }}>Privacidade</a>
          </div>
        </div>
      </div>
    </div>
  );
}
