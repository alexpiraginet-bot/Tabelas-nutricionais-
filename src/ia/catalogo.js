// O que a IA do site sabe — DERIVADO dos dados oficiais, nunca copiado.
//
// Sabores, alérgicos, alegações, lojas e regras de evento vêm de src/data.js,
// src/lojas.js e src/eventos-regras.js. Se a nutricionista publicar uma tabela
// nova ou o dono mudar o preço do evento, a IA passa a responder com o valor
// novo no mesmo deploy, sem ninguém lembrar de atualizar um "prompt".
//
// Sem JSX e sem nada do navegador: este arquivo roda na função da API
// (api/ia.js) e também no site (cards da conversa e ferramentas WebMCP).
import { PRODUCTS, SHAKES, ALLERGENS, PODE_CONTER, AVISO_POLIOL, sugarClaim, proteinClaim } from "../data.js";
import { LOJAS } from "../lojas.js";
import { EV_FORMATOS, EV_PRECO_PESSOA, EV_MIN, EV_SUGERE, EV_CABE, EV_PERS_ACRESCIMO, EV_PERS_GRANDE, calcEvento } from "../eventos-regras.js";

export const PEDIR_URL = "https://totem.bentogelateria.com/pedir";
export const STUDIO_URL = "https://totem.bentogelateria.com/meu-studio";
export const ZAP = "5527999159995";
export const ZAP_LABEL = "(27) 99915-9995";

const LINHA = { gelato: "Gelato", bentole: "Bentôlé (picolé)", shake: "Shake" };
const n1 = (v) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10)).replace(".", ",");

// Os G dos Bentôlé são os mesmos picolés no dobro do tamanho (data.js gera um a
// partir do outro). Na lista que a IA lê, entram uma vez só, com a observação.
const ehG = (p) => p.category === "bentole" && p.id.endsWith("-g");

export function saborPorId(id) {
  const s = String(id || "");
  return PRODUCTS.find((p) => p.id === s) || SHAKES.find((x) => x.id === s) || null;
}
export const ehShake = (x) => !!(x && SHAKES.includes(x));

// Alérgicos do shake saem da receita: o whey é LEITE, e o líquido escolhido
// soma o dele — com leite de amêndoas, a amêndoa é ingrediente, não traço.
// Proteína vegana (opção de algum shake) não tem alérgicos no cadastro: aí o
// caminho é confirmar com a equipe, nunca supor.
const alergicosDoLiquido = (liquido) => (/amêndoa/i.test(liquido) ? ["AMÊNDOA"] : /leite/i.test(liquido) ? ["LEITE"] : []);
export function alergicosShake(x) {
  const proteina = x.ingredients.find((i) => /soro de leite|whey/i.test(i.name));
  const base = proteina ? ["LEITE"] : [];
  return {
    porLiquido: x.nutrition.map((r) => ({ liquido: r.liquid, contem: [...new Set([...base, ...alergicosDoLiquido(r.liquid)])] })),
    vegana: !!(proteina && /vegan/i.test(proteina.note || "")),
  };
}
// Em uma linha, para card, catálogo da IA e llms.txt.
export function alergicosShakeTexto(x) {
  const { porLiquido, vegana } = alergicosShake(x);
  let t = "LEITE (whey)";
  for (const l of porLiquido) {
    const extra = l.contem.filter((a) => a !== "LEITE");
    if (extra.length) t += `; com ${l.liquido.toLowerCase()}, também ${extra.join(", ")}`;
  }
  if (vegana) t += "; na versão com proteína vegana, confirme os alérgicos com a equipe";
  return t;
}

// Alegações que a marca PODE fazer, calculadas pelas mesmas funções da tabela
// nutricional: a de açúcar é só a da sugarClaim, como manda a política da marca.
export function alegacoes(p) {
  const out = [];
  const s = sugarClaim(p);
  if (s) out.push(s.note ? `${s.label} (${s.note})` : s.label);
  const pr = proteinClaim(p);
  if (pr) out.push(pr);
  return out;
}

// Fatos curtos de um sabor — o que a IA recebe ao mostrar um card.
export function fatosSabor(x) {
  if (!x) return null;
  if (ehShake(x)) {
    const agua = x.nutrition.find((r) => /água/i.test(r.liquid)) || x.nutrition[0];
    return {
      id: x.id, nome: x.name, linha: LINHA.shake, porcao: x.sub,
      proteina_g: x.protein, kcal_com_agua: agua.kcal,
      liquidos: x.nutrition.map((r) => `${r.liquid}: ${r.kcal} kcal, ${n1(r.prot)} g proteína`),
      alergicos: alergicosShakeTexto(x),
      alergicos_por_liquido: Object.fromEntries(alergicosShake(x).porLiquido.map((l) => [l.liquido, l.contem])),
      observacao: "Valores calculados por porção, variam com o líquido escolhido.",
    };
  }
  const n = x.nutrition;
  return {
    id: x.id, nome: x.name, linha: LINHA[x.category] || x.category, porcao: x.portionLabel,
    kcal: n.kcal, proteina_g: n.protein, carboidratos_g: n.carbs, acucares_g: n.sugars,
    acucares_adicionados_g: n.addedSugars, gorduras_g: n.fat, gordura_saturada_g: n.satFat,
    fibras_g: n.fiber, sodio_mg: n.sodium,
    contem: ALLERGENS[x.id] || [], contem_lactose: !!x.flags.lactose, contem_gluten: !!x.flags.gluten,
    poliois: x.hasPolyols ? AVISO_POLIOL : null,
    alegacoes: alegacoes(x),
    estimado: !!x.estimated,
  };
}

// Ficha completa: ingredientes, alérgicos e avisos. Usada quando a pessoa
// pergunta o que vai no sabor ou tem alergia.
// Vale para tudo o que sai da loja, shake incluído (é batido no mesmo balcão).
const CONTATO_CRUZADO = { pode_conter: PODE_CONTER, aviso_contato_cruzado: "Produção compartilhada na mesma gelateria: pode conter traços dos alérgicos listados em pode_conter." };

export function fichaSabor(id) {
  const x = saborPorId(id);
  if (!x) return null;
  if (ehShake(x)) return { ...fatosSabor(x), ingredientes: x.ingredients.map((i) => i.note ? `${i.name} (${i.qty}; ${i.note})` : `${i.name} (${i.qty})`), ...CONTATO_CRUZADO };
  return {
    ...fatosSabor(x),
    descricao: x.description,
    ingredientes: x.ingredients.map((i) => (i.note ? `${i.name}: ${i.note}` : i.name)),
    ...CONTATO_CRUZADO,
  };
}

// Lista compacta de todo o cardápio para o prompt da IA. Determinística (mesma
// ordem, mesmo texto) para o cache de prompt funcionar entre conversas.
export function catalogoTexto() {
  const linhas = [];
  linhas.push("SABORES (porção · kcal · proteína · carboidratos · açúcares (adicionados) · gorduras (saturada) · fibras · sódio · contém · perfis · alegações)");
  for (const p of PRODUCTS) {
    if (ehG(p)) continue;
    const n = p.nutrition;
    const temG = p.category === "bentole" && PRODUCTS.some((g) => g.id === p.id + "-g");
    const contem = (ALLERGENS[p.id] || []).join(", ") || "nenhum alérgico declarado";
    const flags = [p.flags.lactose ? "contém lactose" : "sem lactose", p.flags.gluten ? "contém glúten" : "sem glúten"];
    if (p.hasPolyols) flags.push("contém polióis (aviso laxativo)");
    if (p.estimated) flags.push("valores ESTIMADOS");
    linhas.push(
      `- ${p.id} | ${p.name} | ${LINHA[p.category]} | ${p.sub} | ${p.portionLabel} · ${n1(n.kcal)} kcal · ${n1(n.protein)} g prot · ${n1(n.carbs)} g carb · ${n1(n.sugars)} g açúc (${n1(n.addedSugars)} g adic) · ${n1(n.fat)} g gord (${n1(n.satFat)} g sat) · ${n1(n.fiber)} g fibra · ${n1(n.sodium)} mg sódio | contém: ${contem} | ${flags.join("; ")} | perfis: ${p.moods.join(", ")} | ${alegacoes(p).join("; ") || "sem alegação"}${temG ? " | também em G (" + (p.serving * 2) + " g, valores em dobro, id " + p.id + "-g)" : ""}`
    );
    linhas.push(`  ${p.description}`);
  }
  linhas.push("");
  linhas.push("SHAKES (batidos na hora, whey + fruta/cacau, líquido à escolha; os alérgicos mudam com o líquido)");
  for (const s of SHAKES) {
    linhas.push(`- ${s.id} | ${s.name} | ${s.sub} | ${s.nutrition.map((r) => `${r.liquid}: ${r.kcal} kcal, ${n1(r.prot)} g prot`).join(" · ")} | contém: ${alergicosShakeTexto(s)}`);
    linhas.push(`  ${s.description}`);
  }
  linhas.push("");
  linhas.push(`ALÉRGICOS — "pode conter" (produção compartilhada, vale para todos): ${PODE_CONTER.join(", ")}.`);
  linhas.push("");
  linhas.push("LOJAS (horário padrão; o horário de hoje e se está aberta vêm da ferramenta lojas_agora)");
  for (const l of LOJAS) {
    linhas.push(`- ${l.id} | Bentô ${l.nome} | ${l.endereco} | ${l.resumo.map(([d, h]) => d + " " + h).join(", ")} | WhatsApp ${l.zapLabel}`);
  }
  linhas.push("");
  linhas.push(`EVENTOS — R$ ${EV_PRECO_PESSOA} por pessoa em qualquer formato; logística e personalização são linhas à parte. Orçamento online a partir de ${EV_MIN} convidados.`);
  for (const f of EV_FORMATOS) {
    linhas.push(`- ${f.nome} (${f.max == null ? f.min + "+" : f.min + " a " + f.max} convidados) · ${f.servico} · ${f.resumo}`);
  }
  linhas.push(`Personalização (potinhos/rótulos, estrutura) custa ${Math.round(EV_PERS_ACRESCIMO * 100)}% a mais abaixo de ${EV_PERS_GRANDE} convidados.`);
  return linhas.join("\n");
}

/* ---------- lojas: horário de hoje, aberta agora ---------- */

const DIA_ROT = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const hh = (h) => { const i = Math.floor(h), m = Math.round((h - i) * 60); return i + "h" + (m ? String(m).padStart(2, "0") : ""); };

// Hora de Vitória (America/Sao_Paulo) — não a do servidor nem a do aparelho.
export function agoraSP(d = new Date()) {
  try {
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
    const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.find((x) => x.type === "weekday").value];
    const h = +p.find((x) => x.type === "hour").value % 24, m = +p.find((x) => x.type === "minute").value;
    return { wd, cur: h + m / 60 };
  } catch { return { wd: d.getDay(), cur: d.getHours() + d.getMinutes() / 60 }; }
}

// overrides = site:config.lojas (o horário que a equipe edita no painel).
// O código é o padrão; a config só sobrescreve — mesma regra do site.
export function lojasAgora(overrides, d = new Date()) {
  const { wd, cur } = agoraSP(d);
  return LOJAS.map((l) => {
    const o = overrides && overrides[l.id];
    const dias = o && o.dias ? { ...l.dias, ...o.dias } : l.dias;
    const r = dias[wd];
    const aberta = !!(r && cur >= r[0] && cur < r[1]);
    let proxima = null;
    if (!aberta) {
      for (let k = 0; k < 7; k++) {
        const dia = (wd + k) % 7, rr = dias[dia];
        if (rr && (k > 0 || cur < rr[0])) { proxima = (k === 0 ? "hoje" : k === 1 ? "amanhã" : DIA_ROT[dia]) + " às " + hh(rr[0]); break; }
      }
    }
    return {
      id: l.id, nome: "Bentô " + l.nome, aberta,
      hoje: r ? `${hh(r[0])} às ${hh(r[1])}` : "fechada hoje",
      fecha_as: aberta ? hh(r[1]) : null,
      abre: proxima,
      endereco: l.endereco, whatsapp: l.zapLabel,
    };
  });
}

// Estado da entrega, lido do TOTEM (fonte única). Sem resposta do endpoint, a
// IA não afirma nada sobre entrega — mesma regra de ouro do site.
const chaveLoja = (x) => String(x || "").toLowerCase().replace(/[-_\s]+/g, "-");
export function entregaPorLoja(cfg) {
  if (!cfg || typeof cfg !== "object") return null;
  const fonte = cfg.lojas || cfg.stores || cfg;
  return LOJAS.map((l) => {
    let e = null;
    if (Array.isArray(fonte)) e = fonte.find((x) => x && (chaveLoja(x.id) === l.id || chaveLoja(x.loja) === l.id)) || null;
    else { const k = Object.keys(fonte).find((k) => chaveLoja(k) === l.id); e = k ? fonte[k] : null; }
    if (!e || typeof e !== "object") return { id: l.id, entrega: null };
    const entrega = !!(e.entregaPropria ?? e.entrega ?? e.ativo);
    const km = Number(e.raioKm ?? e.raio_km);
    // Grátis só vale para loja que ENTREGA (o totem já mandou grátis em loja
    // sem entrega; o site ignora de propósito, e a IA também).
    const minimo = Number(e.pedidoMinimo ?? e.pedido_minimo);
    const prazo = e.prazoEntrega && e.prazoEntrega.modo === "prazo" ? Number(e.prazoEntrega.minutos) : NaN;
    return {
      id: l.id, entrega, gratis: entrega ? !!e.gratis : false,
      raio_km: entrega && Number.isFinite(km) && km > 0 ? km : null,
      pedido_minimo: entrega && Number.isFinite(minimo) && minimo > 0 ? minimo : null,
      prazo_min: entrega && Number.isFinite(prazo) && prazo > 0 ? prazo : null,
    };
  });
}

/* ---------- eventos: o mesmo cálculo do orçamento oficial ---------- */

export const EV_TIPOS = ["Mix (gelatos + picolés)", "Gelatos", "Picolés"];

export function orcamentoEvento(convidados, tipo) {
  const n = Math.round(Number(convidados));
  const t = EV_TIPOS.includes(tipo) ? tipo : EV_TIPOS[0];
  if (!Number.isFinite(n) || n < 1) return null;
  if (n < EV_MIN) return { convidados: n, abaixo_do_minimo: true, minimo_online: EV_MIN, orientacao: "Abaixo do mínimo do orçamento online o atendimento é pelo WhatsApp." };
  const sugerido = EV_SUGERE(n);
  const formatos = EV_FORMATOS.filter((f) => EV_CABE(f, n)).map((f) => {
    const q = calcEvento(n, t, [], null, f.id);
    return { id: f.id, nome: f.nome, servico: f.servico, servico_por_pessoa: f.preco, subtotal_servico: q.base, rendimento: q.rend, ate_sabores: q.sabores, promotoras: q.promotoras, sugerido: f.id === sugerido };
  });
  return {
    convidados: n, tipo: t, formatos,
    fora_do_subtotal: ["logística (calculada pelo endereço no orçamento online)", `personalização opcional (+${Math.round(EV_PERS_ACRESCIMO * 100)}% abaixo de ${EV_PERS_GRANDE} convidados)`],
    corporativo: n > 300,
  };
}

/* ---------- atalhos que a IA pode oferecer (lista fechada) ---------- */

export const DESTINOS = {
  pedir: { rotulo: "Fazer pedido", desc: "Pedido online: entrega da nossa equipe ou retirada na loja, pagamento no Pix." },
  cardapio: { rotulo: "Ver cardápio", desc: "Cardápio com preços e o que está disponível hoje." },
  eventos: { rotulo: "Orçamento de evento", desc: "Orçamento online de evento (caixa térmica, balcão ou carrinho)." },
  studio: { rotulo: "Bentô Meu Studio", desc: "Edições personalizadas com a sua marca: 10 mini ou 8 mega, rótulo comemorativo incluído." },
  "seja-bento": { rotulo: "Seja Bentô", desc: "Revenda ou franquia: questionário com proposta sob medida." },
  vagas: { rotulo: "Trabalhe conosco", desc: "Vagas abertas na Bentô." },
  tabelas: { rotulo: "Tabelas nutricionais", desc: "Todas as fichas e tabelas dos sabores." },
  whatsapp: { rotulo: "Falar com a equipe", desc: `WhatsApp ${ZAP_LABEL}.` },
};
