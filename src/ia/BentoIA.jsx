// Bentô IA — a conversa do site.
//
// O texto vem do modelo; tudo o que tem número (card de sabor, comparação,
// loja, orçamento) é montado AQUI, a partir dos dados oficiais do bundle e dos
// ids que o servidor validou. A IA escolhe o que mostrar; quem desenha e
// calcula é o site. Assim um card nunca mostra uma tabela que não existe.
//
// Visual no padrão da marca ("Deep Tech Clean": off-white, pistache, números
// em JetBrains Mono): uma superfície por resposta, linhas finas separando os
// itens em vez de card dentro de card, foto real do produto, um botão
// principal por item. Animação só a que conta o que está acontecendo — e a
// automática respeita "Reduzir Movimento".
import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, X, ArrowUp, Mic, Square, RotateCcw, MapPin, MessageCircle, ShoppingBag, ChevronRight, CupSoda, PartyPopper, Truck, Check, CircleAlert, LoaderCircle, SquarePen } from "lucide-react";
import { tk, T, ProductArt, useModal, useSemFlutuantes } from "../shared.jsx";
import { ALLERGENS } from "../data.js";
import { LOJAS } from "../lojas.js";
import { saborPorId, ehShake, alegacoes, alergicosShakeTexto, calculoShake, orcamentoEvento, DESTINOS, DESTAQUES, PEDIR_URL, STUDIO_URL, ZAP } from "./catalogo.js";
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

/* ---------- linguagem visual (tokens locais sobre os da marca) ---------- */

const linhaFina = `1px solid ${T.borderSoft}`;
const superficie = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" };
const ICONE = { size: 16, strokeWidth: 1.75, "aria-hidden": true };
const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" };
const BOTAO = {
  primario: { ...base, padding: "0 16px", border: "none", background: T.pistacheDark, color: T.surface },
  secundario: { ...base, padding: "0 14px", border: `1px solid ${T.border}`, background: T.surface, color: T.ink },
  texto: { ...base, padding: "0 6px", border: "none", background: "transparent", color: T.pistacheDark },
};
const AVISO_CRUZADO = "Produção compartilhada: pode conter traços de outros alérgicos.";

function Alegacao({ children }) {
  return <span className="fb" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 500, color: T.pistacheDark }}><Check size={13} strokeWidth={2.25} aria-hidden="true" />{children}</span>;
}
function Numero({ valor, rotulo, destaque }) {
  return (
    <span style={{ display: "grid", gap: 1 }}>
      <span className="fm" style={{ fontSize: 15, fontWeight: 500, color: destaque ? T.pistacheDark : T.ink, fontVariantNumeric: "tabular-nums" }}>{valor}</span>
      <span className="fb" style={{ fontSize: 11.5, color: T.inkSoft }}>{rotulo}</span>
    </span>
  );
}
const Foto = ({ x, tam = 76, raio = 14 }) => (
  <span style={{ width: tam, height: tam, borderRadius: raio, overflow: "hidden", flexShrink: 0, background: T.bgWarm, display: "block" }}><ProductArt product={x} size={tam} /></span>
);

/* ---------- blocos (UI gerada a partir de ids validados) ---------- */

// O número que decide a recomendação (a IA escolhe qual; o valor é o do
// catálogo) fica em evidência. Sem escolha, a proteína.
const destaqueValido = (d) => (typeof d === "string" && Object.keys(DESTAQUES).includes(d) ? d : "proteina");

function LinhaShake({ x, destaque }) {
  const kcal = x.nutrition.map((r) => r.kcal);
  const d = destaqueValido(destaque);
  return (
    <div style={{ display: "flex", gap: 14, padding: 16 }}>
      <span aria-hidden="true" style={{ width: 76, height: 76, borderRadius: 14, background: x.color.bg, color: x.color.ink, display: "grid", placeItems: "center", flexShrink: 0 }}><CupSoda size={28} strokeWidth={1.5} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fb" style={{ fontSize: 12, color: T.inkSoft }}>Shake proteico · batido na hora</div>
        <div className="fd" style={{ fontSize: 18, color: T.ink, lineHeight: 1.2, marginTop: 2 }}>{x.name}</div>
        <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
          <Numero valor={`${x.protein} g`} rotulo="proteína" destaque={d !== "kcal"} />
          <Numero valor={`${Math.min(...kcal)}–${Math.max(...kcal)}`} rotulo="kcal, pelo líquido" destaque={d === "kcal"} />
        </div>
        {calculoShake(x) && <div className="fb" style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 8, lineHeight: 1.5 }}>Números com {calculoShake(x).com}; com outra proteína, mudam.</div>}
        <div className="fb" style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 8, lineHeight: 1.5 }}>Contém: {alergicosShakeTexto(x)}</div>
        <div style={{ marginTop: 12 }}>
          <button onClick={() => tk("IA · Card · Pedir", () => abrir(PEDIR_URL))} style={BOTAO.primario}><ShoppingBag {...ICONE} size={15} />Pedir</button>
        </div>
      </div>
    </div>
  );
}

const TRIO = ["proteina", "kcal", "acucar_adicionado"];

function LinhaSabor({ id, acoes, destaque }) {
  const x = saborPorId(id);
  if (!x) return null;
  if (ehShake(x)) return <LinhaShake x={x} destaque={destaque} />;
  const n = x.nutrition, contem = ALLERGENS[x.id] || [], al = alegacoes(x);
  // Sempre três números; um destaque fora do trio entra na frente dele.
  const d = destaqueValido(destaque);
  const numeros = TRIO.includes(d) ? TRIO : [d, "proteina", "kcal"];
  const acucar = al.find((a) => a.startsWith("SEM ADIÇÃO"));
  const proteina = al.find((a) => /PROTEÍNA/.test(a));
  return (
    <div style={{ display: "flex", gap: 14, padding: 16 }}>
      <Foto x={x} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fb" style={{ fontSize: 12, color: T.inkSoft }}>{x.category === "bentole" ? "Picolé Bentôlé" : "Gelato"} · {x.portionLabel.replace(/ \(.*\)/, "")}</div>
        <div className="fd" style={{ fontSize: 18, color: T.ink, lineHeight: 1.2, marginTop: 2 }}>{x.name}</div>
        <div style={{ display: "flex", gap: 18, marginTop: 10, flexWrap: "wrap" }}>
          {numeros.map((k) => {
            const m = DESTAQUES[k];
            return <Numero key={k} valor={num(n[m.campo]) + (m.unidade ? " " + m.unidade : "")} rotulo={m.rotulo} destaque={k === d} />;
          })}
        </div>
        {(acucar || proteina) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 10 }}>
            {acucar && <Alegacao>Sem adição de açúcares</Alegacao>}
            {proteina && <Alegacao>{proteina.toLowerCase().replace(/^./, (c) => c.toUpperCase())}</Alegacao>}
          </div>
        )}
        <div className="fb" style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 8, lineHeight: 1.5 }}>
          {contem.length ? "Contém: " + contem.join(", ") : "Sem alérgicos declarados"}
          {acucar && acucar.includes("próprios") ? " · Contém açúcares próprios dos ingredientes." : ""}
          {x.hasPolyols ? " · Pode ter efeito laxativo." : ""}
          {x.estimated ? " · Valores estimados." : ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={() => tk("IA · Card · Pedir", () => abrir(PEDIR_URL))} style={BOTAO.primario}><ShoppingBag {...ICONE} size={15} />Pedir</button>
          <button onClick={() => tk("IA · Card · Ver ficha", () => acoes.ficha(x.id))} style={BOTAO.texto}>Ver ficha<ChevronRight {...ICONE} size={15} /></button>
        </div>
      </div>
    </div>
  );
}

// Vários sabores numa superfície só, separados por linha fina.
function Grupo({ children }) {
  const itens = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return <div style={superficie}>{itens.map((c, i) => <div key={i} style={{ borderTop: i ? linhaFina : "none" }}>{c}</div>)}</div>;
}

// Tabela por porção só para gelatos e Bentôlé: o shake muda com o líquido. O
// motor já recusa shake na comparação; se algum chegar, vira card abaixo da
// tabela — nada some e todo botão funciona.
function Comparacao({ ids, acoes }) {
  const xs = ids.map(saborPorId).filter(Boolean);
  const ps = xs.filter((p) => !ehShake(p));
  const cards = (lista) => lista.map((x) => <LinhaSabor key={x.id} id={x.id} acoes={acoes} />);
  if (ps.length < 2) return <Grupo>{cards(xs)}</Grupo>;
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
  const tabela = (
    <div style={{ overflowX: "auto" }}>
      <table className="fb" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Comparação por porção</caption>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: "left", padding: "14px 12px 12px 16px", fontWeight: 500, fontSize: 12, color: T.inkSoft, verticalAlign: "top" }}>Por porção</th>
            {ps.map((p) => (
              <th key={p.id} scope="col" style={{ textAlign: "left", padding: "14px 12px 12px 8px", fontWeight: 400, minWidth: 84, verticalAlign: "top" }}>
                <Foto x={p} tam={40} raio={10} />
                <span className="fd" style={{ display: "block", fontSize: 14.5, color: T.ink, lineHeight: 1.2, marginTop: 8 }}>{p.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map(([rot, f, melhor, val]) => {
            const vals = val ? ps.map(val) : null;
            const alvo = vals ? (melhor === "max" ? Math.max(...vals) : Math.min(...vals)) : null;
            return (
              <tr key={rot} style={{ borderTop: linhaFina }}>
                <th scope="row" style={{ textAlign: "left", padding: "9px 12px 9px 16px", color: T.inkSoft, fontWeight: 400, whiteSpace: "nowrap" }}>{rot}</th>
                {ps.map((p, i) => {
                  const top = vals && vals[i] === alvo;
                  return (
                    <td key={p.id} className="fm" style={{ padding: "9px 12px 9px 8px", fontSize: 13, color: top ? T.pistacheDark : T.ink, fontWeight: top ? 600 : 400, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {f(p)}{top && <span className="fb" style={{ fontSize: 10.5, fontWeight: 600, marginLeft: 6 }}>{melhor === "max" ? "maior" : "menor"}</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
  const shakes = xs.filter(ehShake);
  return shakes.length ? <div style={{ display: "grid", gap: 10 }}><div style={superficie}>{tabela}</div><Grupo>{cards(shakes)}</Grupo></div> : <div style={superficie}>{tabela}</div>;
}

function Ficha({ id, acoes }) {
  const x = saborPorId(id);
  if (!x) return null;
  if (ehShake(x)) {
    return (
      <div style={superficie}>
        <LinhaShake x={x} />
        <div className="fb" style={{ fontSize: 12.5, color: T.inkSoft, padding: "12px 16px", borderTop: linhaFina, lineHeight: 1.5 }}>{AVISO_CRUZADO}</div>
      </div>
    );
  }
  const contem = ALLERGENS[x.id] || [];
  const itens = [
    ["Contém", contem.length ? contem.join(", ") : "Nenhum alérgico de declaração obrigatória", true],
    ["Lactose", x.flags.lactose ? "Contém" : "Não contém"],
    ["Glúten", x.flags.gluten ? "Contém" : "Não contém"],
    x.hasPolyols && ["Polióis", "Contém: pode ter efeito laxativo"],
  ].filter(Boolean);
  return (
    <div style={{ ...superficie, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Foto x={x} tam={48} raio={12} />
        <div style={{ minWidth: 0 }}>
          <div className="fd" style={{ fontSize: 18, color: T.ink, lineHeight: 1.2 }}>{x.name}</div>
          <div className="fb" style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 2 }}>Alérgicos e restrições</div>
        </div>
      </div>
      <dl className="fb" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: "14px 0 0", fontSize: 14 }}>
        {itens.map(([r, v, forte]) => (
          <div key={r} style={{ display: "contents" }}>
            <dt style={{ color: T.inkSoft }}>{r}</dt>
            <dd style={{ margin: 0, color: T.ink, fontWeight: forte ? 600 : 400 }}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="fb" style={{ fontSize: 12.5, color: T.inkSoft, margin: "12px 0 0", lineHeight: 1.5 }}>{AVISO_CRUZADO}</p>
      <button onClick={() => tk("IA · Ficha · Abrir", () => acoes.ficha(x.id))} style={{ ...BOTAO.texto, marginTop: 6, marginLeft: -6 }}>Abrir ficha completa<ChevronRight {...ICONE} size={15} /></button>
    </div>
  );
}

// Aberta agora, horário de hoje e entrega valem para o momento da pergunta, e
// a conversa fica guardada na aba. Passado este tempo o card mostra só o fixo
// (endereço e botões) e pede para perguntar de novo: sem dado fresco, não
// afirma nada (a mesma regra de ouro da entrega).
const VALIDADE_LOJAS = 5 * 60 * 1000;

// "Oferece entrega" não é "entregando agora": fora da janela de entrega (ou com
// a loja fechada) a linha diz quando volta, e sem "grátis" — como o selo do site.
function textoEntrega(e) {
  const raio = e.raio_km ? ` até ${num(e.raio_km)} km` : "";
  if (e.entregando_agora) return `Entrega ${e.gratis ? "grátis " : ""}agora${raio}${e.pedido_minimo ? ` · mínimo ${brl(e.pedido_minimo)}` : ""}${e.prazo_min ? ` · ~${e.prazo_min} min` : ""}`;
  return `Entrega${raio}${e.horario_entrega ? `, das ${e.horario_entrega}` : ""} · ${/fechada/.test(e.agora_nao_porque || "") ? "volta quando a loja abrir" : "agora, só retirada"}`;
}

function Lojas({ bloco }) {
  const em = typeof bloco.em === "number" ? bloco.em : 0;
  const [vivo, setVivo] = useState(() => Date.now() - em < VALIDADE_LOJAS);
  useEffect(() => {
    if (!vivo) return undefined;
    const t = setTimeout(() => setVivo(false), Math.max(0, em + VALIDADE_LOJAS - Date.now()));
    return () => clearTimeout(t);
  }, [vivo, em]);
  const estado = vivo && Array.isArray(bloco.lojas) ? bloco.lojas : [];
  const entrega = vivo && Array.isArray(bloco.entrega) ? bloco.entrega : [];
  return (
    <div style={superficie}>
      {LOJAS.map((l, i) => {
        const s = estado.find((x) => x && x.id === l.id);
        const e = entrega.find((x) => x && x.id === l.id);
        return (
          <div key={l.id} style={{ padding: 16, borderTop: i ? linhaFina : "none" }}>
            <div className="fd" style={{ fontSize: 17, color: T.ink, lineHeight: 1.2 }}>Bentô {l.nome}</div>
            {s && (
              <div className="fb" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 13.5, color: T.ink, flexWrap: "wrap" }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: s.aberta ? "#4C8A3A" : "#B5AC98", flexShrink: 0 }} />
                <strong style={{ fontWeight: 600 }}>{s.aberta ? "Aberta agora" : "Fechada"}</strong>
                <span style={{ color: T.inkSoft }}>{s.aberta ? `até ${s.fecha_as}` : s.abre ? `abre ${s.abre}` : `hoje ${s.hoje}`}</span>
              </div>
            )}
            <div className="fb" style={{ fontSize: 13, color: T.inkSoft, marginTop: 4, lineHeight: 1.5 }}>{l.endereco}</div>
            {e && e.oferece_entrega === true && (
              <div className="fb" style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 6, fontSize: 13, lineHeight: 1.45, color: e.entregando_agora ? T.pistacheDark : T.inkSoft }}>
                <Truck {...ICONE} size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{textoEntrega(e)}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={() => tk("IA · Loja · Pedir", () => abrir(PEDIR_URL))} style={BOTAO.primario}><ShoppingBag {...ICONE} size={15} />Pedir online</button>
              <a href={l.maps} target="_blank" rel="noopener noreferrer" onClick={() => tk("IA · Loja · Mapa")} style={BOTAO.secundario}><MapPin {...ICONE} size={15} />Como chegar</a>
              <a href={zapLink("")} target="_blank" rel="noopener noreferrer" onClick={() => tk("IA · Loja · WhatsApp")} style={BOTAO.secundario}><MessageCircle {...ICONE} size={15} />WhatsApp</a>
            </div>
          </div>
        );
      })}
      {!vivo && <div className="fb" style={{ fontSize: 12.5, color: T.inkSoft, padding: "12px 16px", borderTop: linhaFina, lineHeight: 1.5 }}>Horário de hoje e entrega mudam ao longo do dia: pergunte de novo para ver como está agora.</div>}
    </div>
  );
}

function Evento({ bloco, acoes }) {
  const o = orcamentoEvento(bloco.convidados, bloco.produtos);
  if (!o) return null;
  if (o.abaixo_do_minimo) {
    return (
      <div style={{ ...superficie, padding: 16 }}>
        <div className="fb" style={{ fontSize: 14, color: T.ink, lineHeight: 1.55 }}>Para {o.convidados} pessoas o orçamento é feito pela equipe (o online começa em {o.minimo_online} convidados).</div>
        <a href={zapLink(`Olá! Quero um orçamento de evento para ${o.convidados} pessoas.`)} target="_blank" rel="noopener noreferrer" onClick={() => tk("IA · Evento · WhatsApp")} style={{ ...BOTAO.primario, marginTop: 12 }}><MessageCircle {...ICONE} size={15} />Pedir pelo WhatsApp</a>
      </div>
    );
  }
  const porPessoa = o.formatos.length ? o.formatos[0].servico_por_pessoa : null;
  return (
    <div style={superficie}>
      <div style={{ padding: "16px 16px 14px" }}>
        <div className="fd" style={{ fontSize: 19, color: T.ink, lineHeight: 1.2 }}>Evento para {o.convidados} convidados</div>
        {porPessoa != null && <div className="fb" style={{ fontSize: 13, color: T.inkSoft, marginTop: 4 }}>{brl(porPessoa)} por pessoa, em qualquer formato</div>}
      </div>
      {o.formatos.map((f) => (
        <div key={f.id} style={{ padding: "13px 16px", borderTop: linhaFina }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
              <span className="fd" style={{ fontSize: 16, color: T.ink }}>{f.nome}</span>
              {f.sugerido && <span className="fb" style={{ fontSize: 12, fontWeight: 600, color: T.pistacheDark }}>Recomendado</span>}
            </span>
            <span className="fm" style={{ fontSize: 15, fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{brl(f.subtotal_servico)}</span>
          </div>
          <div className="fb" style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4, lineHeight: 1.45 }}>{f.servico}</div>
          <div className="fb" style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 2, lineHeight: 1.45 }}>{f.rendimento}</div>
        </div>
      ))}
      <div style={{ padding: 16, borderTop: linhaFina }}>
        <div className="fb" style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5 }}>Logística (pelo endereço) e personalização entram no orçamento online. Lá você também escolhe os sabores.</div>
        <button onClick={() => tk("IA · Evento · Abrir orçamento", () => acoes.eventos(o.convidados))} style={{ ...BOTAO.primario, width: "100%", minHeight: 46, marginTop: 12 }}><PartyPopper {...ICONE} size={16} />Montar orçamento com {o.convidados} convidados</button>
      </div>
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
    <button onClick={ir} className="fb ia-linha" style={{ ...superficie, display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "14px 16px", cursor: "pointer", minHeight: 64 }}>
      {bloco.destino === "whatsapp" && <MessageCircle {...ICONE} size={18} color={T.pistacheDark} style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: T.ink }}>{d.rotulo}</span>
        <span style={{ display: "block", fontSize: 12.5, color: T.inkSoft, marginTop: 2, lineHeight: 1.45 }}>{d.desc}</span>
      </span>
      <ChevronRight {...ICONE} size={18} color={T.inkSoft} style={{ flexShrink: 0 }} />
    </button>
  );
}

function Bloco({ b, acoes }) {
  if (!b || typeof b !== "object") return null;
  if (b.tipo === "sabores" && Array.isArray(b.ids)) {
    const ids = b.ids.filter((id) => saborPorId(id));   // conversa antiga guardada pode citar sabor que saiu do cardápio
    return ids.length ? <Grupo>{ids.map((id) => <LinhaSabor key={id} id={id} acoes={acoes} destaque={b.destaque} />)}</Grupo> : null;
  }
  if (b.tipo === "comparar" && Array.isArray(b.ids)) return <Comparacao ids={b.ids} acoes={acoes} />;
  if (b.tipo === "ficha") return <Ficha id={b.id} acoes={acoes} />;
  if (b.tipo === "lojas") return <Lojas key={b.em || 0} bloco={b} />;
  if (b.tipo === "evento") return <Evento bloco={b} acoes={acoes} />;
  if (b.tipo === "atalho") return <Atalho bloco={b} acoes={acoes} />;
  return null;
}

// Enquanto a ferramenta roda, a forma do card que vai chegar (esqueleto) no
// lugar de pontinhos pulando: a pessoa vê o que está sendo montado.
function Esqueleto({ status }) {
  const tipo = /sabores|ficha/i.test(status) ? "sabor" : /Comparando/i.test(status) ? "tabela" : /lojas/i.test(status) ? "loja" : /evento/i.test(status) ? "evento" : null;
  if (!tipo) return null;
  const barra = (w, h = 12, r = 6) => <span className="ia-brilho" style={{ display: "block", width: w, height: h, borderRadius: r }} />;
  return (
    <div aria-hidden="true" style={{ ...superficie, padding: 16, display: "flex", gap: 14 }}>
      {tipo === "sabor" && <span className="ia-brilho" style={{ width: 76, height: 76, borderRadius: 14, flexShrink: 0 }} />}
      <span style={{ flex: 1, display: "grid", gap: 10, alignContent: "start" }}>
        {barra("38%", 10)}{barra("62%", 16)}{barra("84%")}{tipo !== "sabor" && barra("70%")}
      </span>
    </div>
  );
}

// Uma resposta da IA: texto (do modelo) + blocos (montados aqui).
// Resposta que não terminou continua marcada depois de fechar e abrir o painel
// (a falha da vez é o quadro de "Tentar de novo"; aviso=false nela).
function Resposta({ m, vivo, acoes, aviso = true }) {
  return (
    <div className="ia-entra" style={{ display: "grid", gap: 12, maxWidth: "100%" }}>
      {m.texto ? <div className="fb" style={{ fontSize: 15.5, color: T.ink, lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.texto}</div> : null}
      {(m.blocos || []).map((b, i) => <Bloco key={i} b={b} acoes={acoes} />)}
      {aviso && !vivo && (m.interrompida === "falha" || m.interrompida === "parada") && (
        <div className="fb" style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.5 }}>{m.interrompida === "parada" ? "Você parou esta resposta antes do fim." : "Esta resposta foi interrompida antes do fim."}</div>
      )}
      {vivo && m.status && (
        <>
          <div className="fb" role="status" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: T.inkSoft }}>
            <LoaderCircle size={15} strokeWidth={2} className="ia-gira" aria-hidden="true" />{m.status}
          </div>
          <Esqueleto status={m.status} />
        </>
      )}
    </div>
  );
}

/* ---------- o painel ---------- */

const IMAGENS_ABERTURA = ["bentole-pistache-cb", "morango", "bentole-framboesa-duo"];
const iconeBotao = { width: 44, height: 44, borderRadius: 12, border: "none", background: "transparent", color: T.ink, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 };

export default function BentoIA({ onClose, pergunta, focar, onFicha, onEventos, onTabelas }) {
  useModal(onClose);
  useSemFlutuantes();
  const [msgs, setMsgs] = useState(ler);
  const [atual, setAtual] = useState(null);      // resposta em andamento: { texto, blocos, status }
  // Conversa guardada que termina numa pergunta sem resposta (o painel fechou
  // no meio) ou numa resposta que falhou pela metade: mostra a falha com
  // "Tentar de novo", em vez de uma pergunta solta ou de algo que parece completo.
  const [erro, setErro] = useState(() => {
    const ult = !pergunta && msgs.length ? msgs[msgs.length - 1] : null;
    if (!ult) return null;
    if (ult.papel === "cliente") return "A resposta não chegou. Tente de novo.";
    return ult.interrompida === "falha" ? "A resposta foi interrompida. Tente de novo." : null;
  });
  const [entrada, setEntrada] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [altura, setAltura] = useState(null);
  const lista = useRef(null), campo = useRef(null), ctrl = useRef(null), rec = useRef(null), enviouInicial = useRef(false), motivoAbort = useRef(null);
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
  useEffect(() => { const el = lista.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, atual, erro]);

  // base: histórico de onde a pergunta parte. "Tentar de novo" passa a conversa
  // já sem a pergunta que falhou — ler o estado aqui pegaria a versão antiga
  // (a deste render) e a pergunta apareceria duas vezes.
  const enviar = useCallback(async (texto, base) => {
    const t = String(texto || "").trim().slice(0, 600);
    if (!t || ctrl.current) return;
    tk("IA · Pergunta");
    setErro(null); setEntrada("");
    if (campo.current) campo.current.style.height = "auto";
    // Pergunta que ficou sem resposta (falhou antes de qualquer texto, ou o
    // painel fechou no meio) não vai junto com a próxima: no servidor as duas
    // virariam uma mensagem só, e a velha seria reenviada sem a pessoa saber.
    let anterior = Array.isArray(base) ? base : msgs;
    while (anterior.length && anterior[anterior.length - 1].papel === "cliente") anterior = anterior.slice(0, -1);
    const historico = [...anterior, { papel: "cliente", texto: t }];
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
      let falha = null, terminou = false;
      await lerFluxo(r, (ev, d) => {
        if (ev === "texto" && typeof d.t === "string") { resposta.texto += d.t; resposta.status = null; }
        else if (ev === "bloco") resposta.blocos.push(d && d.tipo === "lojas" ? { ...d, em: Date.now() } : d);
        else if (ev === "status" && typeof d.texto === "string") resposta.status = d.texto;
        // Preâmbulo de uma volta que acabou chamando ferramenta: sai da tela.
        else if (ev === "recolher" && Number.isFinite(d.n)) resposta.texto = resposta.texto.slice(0, Math.max(0, resposta.texto.length - d.n));
        else if (ev === "erro") falha = d.msg || "Algo deu errado.";
        else if (ev === "fim") terminou = true;
        setAtual({ ...resposta, blocos: [...resposta.blocos] });
      });
      // Fluxo que acabou sem "fim" (conexão caiu no meio) também é falha.
      if (!falha && !terminou) falha = "A resposta foi interrompida. Tente de novo.";
      if (falha && !resposta.texto.trim() && !resposta.blocos.length) throw new Error(falha);
      // O que chegou fica na tela, mas a falha aparece com "Tentar de novo" —
      // uma resposta pela metade não pode parecer completa. A marca vai junto
      // para a aba (reabrir o painel mostra a falha de novo) e para a próxima
      // pergunta (o servidor avisa o modelo de que ela não terminou).
      const final = [...historico, { papel: "ia", texto: resposta.texto.trim(), blocos: resposta.blocos, ...(falha ? { interrompida: "falha" } : {}) }];
      setMsgs(final); guardar(final);
      if (falha) setErro(falha);
    } catch (e) {
      if (e && e.name === "AbortError") {
        // "Parar" é escolha da pessoa: o que já chegou fica como resposta; sem
        // nada, a pergunta fica com o "Tentar de novo". Fechar o painel ou
        // começar outra conversa também abortam, e aí não há o que mostrar.
        if (motivoAbort.current === "parar") {
          if (resposta.texto.trim() || resposta.blocos.length) {
            const final = [...historico, { papel: "ia", texto: resposta.texto.trim(), blocos: resposta.blocos, interrompida: "parada" }];
            setMsgs(final); guardar(final);
          } else setErro("Você parou a resposta.");
        }
        return;
      }
      setErro(String((e && e.message) || "Sem conexão agora. Tente de novo."));
    } finally {
      ctrl.current = null; motivoAbort.current = null; setAtual(null);
    }
  }, [msgs]);

  // Pergunta que veio da home (chip) ou do link ?ia=...: envia ao abrir. Por
  // timer, não direto: o StrictMode do desenvolvimento monta, desmonta e monta
  // de novo, e a desmontagem cancelaria um pedido já no ar sem reenviar. Assim
  // ela cancela só o timer, e a montagem que fica é a que envia.
  useEffect(() => {
    if (enviouInicial.current) return undefined;
    const t = setTimeout(() => {
      enviouInicial.current = true;
      if (pergunta) enviar(pergunta);
      else if (focar) { try { campo.current && campo.current.focus(); } catch { /* */ } }
    }, pergunta ? 0 : 60);
    return () => clearTimeout(t);
  }, [pergunta, focar, enviar]);

  const parar = () => { motivoAbort.current = "parar"; tk("IA · Parar"); try { ctrl.current && ctrl.current.abort(); } catch { /* */ } };
  const novaConversa = () => {
    try { ctrl.current && ctrl.current.abort(); } catch { /* */ }
    tk("IA · Nova conversa");
    setMsgs([]); setAtual(null); setErro(null); guardar([]);
  };
  const tentarDeNovo = () => {
    // Refaz a última pergunta a partir da conversa SEM ela (e sem a resposta
    // pela metade que veio depois, se houver).
    const i = msgs.map((m) => m.papel).lastIndexOf("cliente");
    if (i < 0) return;
    setErro(null);
    enviar(msgs[i].texto, msgs.slice(0, i));
  };

  // Ditado por voz (quando o navegador tem): preenche a caixa, a pessoa revisa e envia.
  const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const falar = () => {
    if (!SR) return;
    if (ouvindo) { try { rec.current && rec.current.stop(); } catch { /* */ } return; }
    try {
      const r = new SR(); rec.current = r;
      r.lang = "pt-BR"; r.interimResults = true; r.continuous = false;
      const base0 = entrada ? entrada.trim() + " " : "";
      r.onresult = (ev) => { let t = ""; for (const res of ev.results) t += res[0].transcript; setEntrada((base0 + t).slice(0, 600)); };
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
  const vazio = msgs.length === 0 && !ocupado;

  return (
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Bentô IA" style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(28,32,20,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
      <style>{`
        .ia-painel{position:absolute;inset:0;display:flex;flex-direction:column;background:${T.bg};overflow:hidden;animation:iaSobe .28s cubic-bezier(.2,.8,.2,1) both}
        /* Centralizado com margin:auto, não com transform: a animação de
           entrada termina em transform:none e desfaria a centralização. */
        @media(min-width:640px){.ia-painel{margin:auto;width:min(600px,calc(100vw - 32px));height:min(820px,calc(100vh - 48px));border-radius:24px;border:1px solid ${T.border};box-shadow:0 40px 100px -40px rgba(20,24,14,.55);animation-name:iaSurge}}
        @keyframes iaSobe{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes iaSurge{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}
        .ia-entra{animation:iaEntra .24s ease-out both}
        @keyframes iaEntra{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .ia-gira{animation:iaGira .9s linear infinite}
        @keyframes iaGira{to{transform:rotate(360deg)}}
        .ia-brilho{display:block;background:linear-gradient(90deg,${T.borderSoft} 0%,${T.bgWarm} 50%,${T.borderSoft} 100%);background-size:200% 100%;animation:iaBrilho 1.4s linear infinite}
        @keyframes iaBrilho{to{background-position:-200% 0}}
        @media(prefers-reduced-motion:reduce){.ia-painel,.ia-entra{animation:none}.ia-gira,.ia-brilho{animation:none}}
        .ia-campo{resize:none;border:none;outline:none;background:transparent;width:100%;font:inherit;font-size:16px;line-height:1.45;color:${T.ink};max-height:132px;padding:9px 0}
        .ia-campo::placeholder{color:${T.inkSoft}}
        .ia-caixa{transition:border-color .2s,box-shadow .2s}
        .ia-caixa:focus-within{border-color:${T.pistacheDark};box-shadow:0 0 0 3px rgba(70,88,58,.14)}
        .ia-icone:hover{background:${T.bgWarm}}
        .ia-chip{transition:border-color .2s,background .2s}
        .ia-chip:hover,.ia-linha:hover{border-color:${T.pistache}}
        .ia-painel button:focus-visible,.ia-painel a:focus-visible{outline:2px solid ${T.pistacheDark};outline-offset:2px}
      `}</style>
      <div className="ia-painel" onClick={(e) => e.stopPropagation()} style={altura ? { height: altura.h, top: altura.top, bottom: "auto" } : undefined}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px 10px 16px", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
          <img src="/bento-logo.webp" alt="" width={36} height={36} style={{ borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="fd" style={{ margin: 0, fontSize: 18, fontWeight: 400, color: T.ink, lineHeight: 1.15 }}>Bentô IA</h2>
            <div className="fb" style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>Cardápio e tabelas oficiais da Bentô</div>
          </div>
          {(msgs.length > 0 || ocupado) && <button onClick={novaConversa} aria-label="Nova conversa" title="Nova conversa" className="ia-icone" style={iconeBotao}><SquarePen size={19} strokeWidth={1.75} /></button>}
          <button onClick={onClose} aria-label="Fechar" className="ia-icone" style={iconeBotao}><X size={21} strokeWidth={1.75} /></button>
        </header>

        <div ref={lista} role="log" aria-live="polite" aria-busy={ocupado} aria-label="Conversa" style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "20px 16px 12px", display: "flex", flexDirection: "column", gap: 18 }}>
          {vazio && (
            <div className="ia-entra" style={{ margin: "auto 0", display: "grid", justifyItems: "center", textAlign: "center", padding: "8px 4px 16px" }}>
              <div aria-hidden="true" style={{ display: "flex" }}>
                {IMAGENS_ABERTURA.map((id, i) => {
                  const x = saborPorId(id);
                  return x ? <span key={id} style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", border: `3px solid ${T.bg}`, marginLeft: i ? -14 : 0, boxShadow: "0 8px 18px -12px rgba(35,38,25,.55)", background: T.bgWarm }}><ProductArt product={x} size={64} /></span> : null;
                })}
              </div>
              <h3 className="fd" style={{ fontSize: 26, fontWeight: 400, lineHeight: 1.15, color: T.ink, margin: "18px 0 0" }}>Pergunte sobre qualquer sabor</h3>
              <p className="fb" style={{ fontSize: 14.5, color: T.inkSoft, lineHeight: 1.55, margin: "8px 0 0", maxWidth: 360 }}>Tabelas nutricionais, alérgicos, lojas e eventos, sempre com os dados oficiais da Bentô.</p>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 22, maxWidth: 440 }}>
                {SUGESTOES.map(({ rotulo, pergunta: p, Icone }) => (
                  <button key={rotulo} onClick={() => tk("IA · Sugestão", () => enviar(p))} className="fb ia-chip"
                    style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 40, padding: "0 14px", borderRadius: 999, border: `1px solid ${T.border}`, background: T.surface, color: T.ink, fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}>
                    <Icone size={15} strokeWidth={1.75} color={T.pistacheDark} aria-hidden="true" />{rotulo}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* A resposta em andamento entra na mesma lista, na posição que vai
              ocupar: ao terminar, o React reaproveita o mesmo elemento, e a
              resposta inteira não pisca refazendo a animação de entrada. */}
          {(atual ? [...msgs, atual] : msgs).map((m, i) => m.papel === "cliente"
            ? <div key={i} className="fb ia-entra" style={{ alignSelf: "flex-end", maxWidth: "84%", background: T.pistacheDark, color: T.surface, fontSize: 15, lineHeight: 1.5, padding: "10px 14px", borderRadius: "18px 18px 6px 18px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.texto}</div>
            : <Resposta key={i} m={m} vivo={m === atual} acoes={acoes} aviso={!(erro && i === msgs.length - 1)} />)}
          {erro && (
            <div role="alert" className="ia-entra" style={{ ...superficie, padding: "14px 16px", display: "flex", gap: 12 }}>
              <CircleAlert size={18} strokeWidth={1.75} color="#9A4A12" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fb" style={{ fontSize: 14, color: T.ink, lineHeight: 1.5 }}>{erro}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button onClick={tentarDeNovo} style={BOTAO.secundario}><RotateCcw {...ICONE} size={15} />Tentar de novo</button>
                  <a href={zapLink("")} target="_blank" rel="noopener noreferrer" style={BOTAO.texto}><MessageCircle {...ICONE} size={15} />Falar no WhatsApp</a>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "10px 12px calc(10px + env(safe-area-inset-bottom))", background: T.bg }}>
          <form onSubmit={(e) => { e.preventDefault(); enviar(entrada); }} className="ia-caixa" style={{ display: "flex", alignItems: "flex-end", gap: 4, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: "5px 5px 5px 16px", boxShadow: "0 1px 2px rgba(35,38,25,.06)" }}>
            <textarea ref={campo} className="ia-campo fb" rows={1} value={entrada} maxLength={600} aria-label="Sua pergunta para a Bentô IA"
              placeholder={ouvindo ? "Pode falar…" : "Escreva sua pergunta"}
              onChange={(e) => { setEntrada(e.target.value); const el = e.target; el.style.height = "auto"; el.style.height = Math.min(132, el.scrollHeight) + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); enviar(entrada); } }} />
            {SR && !ocupado && <button type="button" onClick={falar} aria-label={ouvindo ? "Parar de ouvir" : "Falar a pergunta"} aria-pressed={ouvindo} className="ia-icone"
              style={{ ...iconeBotao, width: 40, height: 40, borderRadius: "50%", background: ouvindo ? "#F2E2C5" : "transparent", color: ouvindo ? "#7A5320" : T.inkSoft }}>{ouvindo ? <Square size={14} strokeWidth={2} /> : <Mic size={18} strokeWidth={1.75} />}</button>}
            {ocupado
              ? <button type="button" onClick={parar} aria-label="Parar resposta" title="Parar" style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: T.ink, color: T.surface, display: "grid", placeItems: "center", flexShrink: 0, cursor: "pointer" }}><Square size={13} strokeWidth={2.25} fill="currentColor" /></button>
              : <button type="submit" disabled={!entrada.trim()} aria-label="Enviar pergunta" style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: entrada.trim() ? T.pistacheDark : T.border, color: T.surface, display: "grid", placeItems: "center", flexShrink: 0, cursor: entrada.trim() ? "pointer" : "default", transition: "background .2s" }}><ArrowUp size={18} strokeWidth={2} /></button>}
          </form>
          <p className="fb" style={{ fontSize: 11.5, color: T.inkSoft, textAlign: "center", margin: "8px 0 0", lineHeight: 1.4 }}>
            <Sparkles size={11} strokeWidth={1.75} aria-hidden="true" style={{ verticalAlign: "-1px", marginRight: 4 }} />Dados oficiais da Bentô · Alergia grave? Confirme com a equipe · <a href="/?privacidade=1" target="_blank" rel="noopener noreferrer" style={{ color: T.pistacheDark }}>Privacidade</a>
          </p>
        </div>
      </div>
    </div>
  );
}
