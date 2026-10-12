// Trava o comportamento da Bentô IA (lib/ia-motor.js) sem chamar a API: um
// cliente falso faz o papel do Claude e o teste confere o que sai para a tela.
//
// O que protege: a IA só mostra card de sabor que existe, nunca publica
// "zero açúcar" nem alegação para a linha inteira (prompt e llms.txt), usa o
// mesmo cálculo do orçamento de eventos, não afirma entrega sem dado do totem
// e manda de volta ao modelo a volta inteira, sem editar (o pensamento do
// modelo só vale com o histórico intacto).
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { PRODUCTS, SHAKES } from "../src/data.js";
import { EV_PRECO_PESSOA } from "../src/eventos-regras.js";
import {
  conversar, executarFerramenta, historicoParaMensagens, montarSistema, fraseSegura, filtroFrases, frasesSeguras,
  numerosDe, FERRAMENTAS, ErroConversa, sugerirSaboresEvento, sistemaSabores,
} from "../lib/ia-motor.js";
import { alegacoes, fichaSabor, fatosSabor, saborPorId, validarEscolhaSabores, limiteSabores, saboresEvento, vereditoFoco, FOCOS, lojasAgora, alergiasDasNotas, conflitosComAlergias } from "../src/ia/catalogo.js";
import { montarLlmsTxt } from "./generate-llms-txt.mjs";
import { sugestaoEquilibrada } from "../src/ia/catalogo.js";
const sugerirSaboresEventoRegra = (L) => sugestaoEquilibrada(L, { criancas: true });

let falhas = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

// Cliente falso: cada volta é { eventos: [...], final } ou { lanca: erro }.
function clienteFalso(voltas) {
  const pedidos = [];
  return {
    pedidos,
    beta: { messages: { stream(params) {
      pedidos.push(JSON.parse(JSON.stringify(params)));
      const v = voltas.shift();
      if (!v) throw new Error("o teste não previu esta volta");
      const ouvintes = {};
      return {
        on(ev, cb) { (ouvintes[ev] ||= []).push(cb); return this; },
        async finalMessage() {
          if (v.lanca) throw v.lanca;
          for (const e of v.eventos || []) {
            if (e.texto) for (const cb of ouvintes.text || []) cb(e.texto);
            if (e.raw) for (const cb of ouvintes.streamEvent || []) cb(e.raw);
          }
          return { usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100 }, ...v.final };
        },
      };
    } } },
  };
}
function gravador() {
  const ev = [];
  const enviar = (tipo, dados) => ev.push([tipo, dados]);
  // O texto como a tela mostra: "recolher" tira os últimos n caracteres.
  const texto = () => ev.reduce((acc, [t, d]) => (t === "texto" ? acc + d.t : t === "recolher" ? acc.slice(0, Math.max(0, acc.length - d.n)) : acc), "");
  return { ev, enviar, texto };
}
const usoDeFerramenta = (id, name, input) => ({ type: "tool_use", id, name, input });

caso("o prompt traz o catálogo inteiro e nenhuma alegação de açúcar proibida", () => {
  const s = montarSistema();
  for (const p of PRODUCTS.filter((p) => !p.id.endsWith("-g"))) assert.ok(s.includes(p.id), "faltou " + p.id);
  assert.doesNotMatch(s.replace(/Nunca escreva "zero açúcar", "sem açúcar" ou "sem açúcar adicionado"\./, ""),
    /\b(?:zero\s+aç[uú]car(?:es)?|sem\s+aç[uú]car\s+adicionado)\b/i);
  assert.ok(s.includes("R$ " + EV_PRECO_PESSOA + " por pessoa"), "o preço do evento não veio do módulo de regras");
  // Extra Dark, Maracujá e o Chocolate Dubai levam açúcar adicionado: a
  // apresentação da marca não pode prometer "sem adição" para a linha inteira.
  assert.doesNotMatch(s.split("\n")[0], /sem adição de açúcares|com proteína/i);
  // Sonnet/Opus 5.5: texto escrito ENTRE chamadas de ferramenta volta como pensamento
  // oculto. Sem esta regra, a resposta de "a loja está aberta?" sumia quando o
  // modelo chamava um segundo atalho depois de escrever (visto em produção).
  assert.match(s, /Texto escrito entre uma ferramenta e outra não aparece para o cliente/);
  // Cache: o prompt é o mesmo a cada chamada (nada de data/hora dentro dele).
  assert.equal(s, montarSistema());
});

caso("toda ferramenta pede streaming de entrada e valida o que recebe", () => {
  for (const f of FERRAMENTAS) {
    assert.equal(f.eager_input_streaming, true, f.name);
    assert.equal(f.input_schema.additionalProperties, false, f.name);
  }
});

caso("card só sai com id do catálogo; id inventado volta como erro para o modelo", async () => {
  const ok = await executarFerramenta("mostrar_sabores", { ids: ["pacoca", "pacoca", "bentole-pistache-cb"] });
  assert.equal(ok.erro, false);
  assert.deepEqual(ok.bloco, { tipo: "sabores", ids: ["pacoca", "bentole-pistache-cb"] });
  const ruim = await executarFerramenta("mostrar_sabores", { ids: ["sorvete-de-unicornio"] });
  assert.equal(ruim.erro, true);
  assert.equal(ruim.bloco, null);
  assert.match(ruim.resultado, /fora do catálogo/);
  const poucos = await executarFerramenta("comparar_sabores", { ids: ["pacoca"] });
  assert.equal(poucos.erro, true);
  const texto = await executarFerramenta("mostrar_sabores", { ids: "pacoca" });
  assert.equal(texto.erro, true, "string no lugar da lista passou");
});

caso("o número que decide vai em destaque no card (o modelo escolhe qual; o valor é do catálogo)", async () => {
  const r = await executarFerramenta("mostrar_sabores", { ids: ["pacoca"], destaque: "kcal" });
  assert.deepEqual(r.bloco, { tipo: "sabores", ids: ["pacoca"], destaque: "kcal" });
  const ruim = await executarFerramenta("mostrar_sabores", { ids: ["pacoca"], destaque: "<script>" });
  assert.equal(ruim.erro, false);
  assert.deepEqual(ruim.bloco, { tipo: "sabores", ids: ["pacoca"] }, "destaque inventado chegou à tela");
  assert.deepEqual(FERRAMENTAS.find((f) => f.name === "mostrar_sabores").input_schema.properties.destaque.enum,
    ["proteina", "kcal", "acucar_adicionado", "fibras", "carboidratos", "gordura_saturada"]);
  // E o prompt manda usar o destaque em vez de escrever número.
  assert.match(montarSistema(), /passe em destaque o número que decide/);
  assert.match(montarSistema(), /No texto, nenhum algarismo nem número por extenso/);
  assert.doesNotMatch(montarSistema(), /10 g de proteína com 61 kcal/, "o exemplo que pedia número no texto voltou");
});

caso("lente de restrição: o card e o modelo recebem o mesmo veredito, calculado da ficha", async () => {
  const v = (id, f) => vereditoFoco(saborPorId(id), f);
  // Sem lactose não é sem leite (Framboesa Duo).
  assert.deepEqual(v("bentole-framboesa-duo", "lactose"), { tom: "livre", texto: "Sem lactose · contém leite (não serve para alergia ao leite)" });
  assert.equal(v("bentole-framboesa-duo", "leite").tom, "contem");
  assert.equal(v("limao-siciliano", "lactose").texto, "Sem lactose");
  assert.equal(v("pacoca", "amendoim").tom, "contem");
  // Ausência nunca é garantida: sempre "pode haver traços".
  for (const f of ["leite", "gluten", "amendoim", "castanhas"]) {
    for (const p of PRODUCTS) { const r = vereditoFoco(p, f); if (r.tom === "livre" && f !== "lactose") assert.match(r.texto, /pode haver traços/, p.id + " " + f); }
  }
  assert.equal(v("pistache", "gluten").texto, "Contém glúten", "glúten da pasta de pistache (sem trigo na lista) sumiu");
  assert.match(v("bentole-opereta", "castanhas").texto, /^Contém amêndoa/);
  // Shake: a proteína vegana do Açaí manda confirmar, sem afirmar leite nem ausência.
  assert.equal(v("shake-acai-banana", "leite").tom, "confirmar");
  assert.match(v("shake-choco-power", "castanhas").texto, /leite de amêndoas, contém amêndoa/);
  assert.equal(vereditoFoco(saborPorId("pacoca"), "unicornio"), null);
  // Chega ao card (bloco.foco) e ao modelo (veredito) pela ferramenta; foco inventado é ignorado.
  const r = await executarFerramenta("mostrar_sabores", { ids: ["pacoca", "morango"], foco: "amendoim" });
  assert.deepEqual(r.bloco, { tipo: "sabores", ids: ["pacoca", "morango"], foco: "amendoim" });
  assert.deepEqual(JSON.parse(r.resultado).sabores.map((s) => s.veredito), [v("pacoca", "amendoim").texto, v("morango", "amendoim").texto]);
  const fi = await executarFerramenta("ficha_sabor", { id: "bentole-framboesa-duo", foco: "leite" });
  assert.deepEqual(fi.bloco, { tipo: "ficha", id: "bentole-framboesa-duo", foco: "leite" });
  assert.equal(JSON.parse(fi.resultado).veredito, "Contém leite");
  const ruim = await executarFerramenta("mostrar_sabores", { ids: ["pacoca"], foco: "<script>" });
  assert.deepEqual(ruim.bloco, { tipo: "sabores", ids: ["pacoca"] });
  assert.deepEqual(FERRAMENTAS.find((f) => f.name === "mostrar_sabores").input_schema.properties.foco.enum, Object.keys(FOCOS));
  assert.match(montarSistema(), /passe foco em mostrar_sabores ou ficha_sabor/);
});

caso("lojas: o card sabe qual abre primeiro (para dizer \"nenhuma aberta, X abre às…\")", async () => {
  // Segunda 9h em Vitória: Praia do Canto abre às 10h (60 min); Jardim Camburi só amanhã às 11h.
  const ls = lojasAgora(null, new Date("2026-10-05T12:00:00Z"));
  assert.equal(ls.find((l) => l.id === "praia-do-canto").abre_em_min, 60);
  assert.equal(ls.find((l) => l.id === "jardim-camburi").abre_em_min, 26 * 60);
  const r = await executarFerramenta("lojas_agora", {}, { agora: new Date("2026-10-05T12:00:00Z"), carregarEntrega: async () => null });
  assert.deepEqual(r.bloco.lojas.map((l) => l.abre_em_min), [60, 26 * 60]);
});

caso("card além do limite não aparece, e o modelo fica sabendo", async () => {
  const sete = Array.from({ length: 7 }, (_, i) => usoDeFerramenta("t" + i, "mostrar_sabores", { ids: ["pacoca"] }));
  const cliente = clienteFalso([
    { final: { stop_reason: "tool_use", content: sete } },
    { eventos: [{ texto: "Pronto." }], final: { stop_reason: "end_turn", content: [] } },
  ]);
  const g = gravador();
  await conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "tudo" }], enviar: g.enviar });
  assert.equal(g.ev.filter(([t]) => t === "bloco").length, 6);
  const resultados = cliente.pedidos[1].messages[2].content;
  assert.equal(resultados.length, 7, "toda chamada precisa de resultado");
  assert.ok(resultados.slice(0, 6).every((x) => !x.is_error && /"mostrado_na_tela":true/.test(x.content)));
  assert.equal(resultados[6].is_error, true);
  assert.match(resultados[6].content, /NÃO apareceu na tela/);
  assert.doesNotMatch(resultados[6].content, /mostrado_na_tela/);
});

caso("resposta que ficaria vazia (tudo cortado, sem card) vira o atalho da equipe", async () => {
  const cliente = clienteFalso([{ eventos: [{ texto: "Tem 12 g de proteína." }], final: { stop_reason: "end_turn", content: [] } }]);
  const g = gravador();
  const uso = await conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "proteína?" }], enviar: g.enviar });
  assert.equal(uso.frases_cortadas, 1);
  assert.match(g.texto(), /equipe/);
  assert.deepEqual(g.ev.find(([t]) => t === "bloco")[1], { tipo: "atalho", destino: "whatsapp", mensagem: "" });
});

caso("o número de convidados que foi ao orçamento pode ser repetido no texto", async () => {
  // O cliente escreveu por extenso; o modelo passou 50 ao orçamento e o card mostra 50.
  const cliente = clienteFalso([
    { final: { stop_reason: "tool_use", content: [usoDeFerramenta("t1", "orcamento_evento", { convidados: 50 })] } },
    { eventos: [{ texto: "Para 50 convidados, a caixa térmica atende bem. O total é R$ 1.350." }], final: { stop_reason: "end_turn", content: [] } },
  ]);
  const g = gravador();
  await conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "evento para cinquenta pessoas" }], enviar: g.enviar });
  assert.equal(g.texto().trim(), "Para 50 convidados, a caixa térmica atende bem.");
});

caso("status de loja e entrega ao vivo só vai ao texto na resposta em que lojas_agora rodou", async () => {
  const frase = "A Praia do Canto está aberta agora. A entrega é grátis agora. Posso ajudar com mais alguma coisa?";
  // Sem a ferramenta: o modelo afirma de cabeça e as duas frases saem.
  const semFerramenta = clienteFalso([{ eventos: [{ texto: frase }], final: { stop_reason: "end_turn", content: [] } }]);
  const g1 = gravador();
  const uso = await conversar({ client: semFerramenta, mensagens: [{ papel: "cliente", texto: "tá aberta?" }], enviar: g1.enviar });
  assert.equal(g1.texto().trim(), "Posso ajudar com mais alguma coisa?");
  assert.equal(uso.frases_cortadas, 2);
  // Com lojas_agora na mesma resposta: o card de lojas sai e o texto passa.
  const comFerramenta = clienteFalso([
    { final: { stop_reason: "tool_use", content: [usoDeFerramenta("t1", "lojas_agora", {})] } },
    { eventos: [{ texto: "A Praia do Canto está aberta agora." }], final: { stop_reason: "end_turn", content: [] } },
  ]);
  const g2 = gravador();
  await conversar({ client: comFerramenta, mensagens: [{ papel: "cliente", texto: "tá aberta?" }], enviar: g2.enviar,
    ctx: { agora: new Date("2026-10-05T15:00:00Z"), carregarEntrega: async () => null } });
  assert.ok(g2.ev.some(([t, d]) => t === "bloco" && d.tipo === "lojas"));
  assert.equal(g2.texto().trim(), "A Praia do Canto está aberta agora.");
  // E o resto da UI que fala de "abre" não é status de loja.
  assert.equal(fraseSegura("O botão abaixo abre o orçamento já com os convidados.", new Set()), true);
});

caso("negação e efeito terapêutico: \"não é feito com leite\" confere invertido; \"previne cáries\" sai", () => {
  const N = new Set();
  for (const f of [
    "O Pistache não é feito com leite.",                     // a ficha diz que é
    "Pistache previne cáries.",                              // verbo terapêutico, sem condição da lista
    "Pistache reduz o risco de câncer.",
    "Pistache melhora o sono.",
    "Ele previne cáries.",
  ]) assert.equal(fraseSegura(f, N), false, "passou: " + f);
  for (const f of [
    "O Limão Siciliano não é feito com leite.",              // igual à ficha
    "Trata-se de um sabor intenso, o Pistache.",
    "Os benefícios do Clube aparecem no seu perfil.",
    "Pode haver risco de contaminação cruzada; confirme com a equipe.",
  ]) assert.equal(fraseSegura(f, N), true, "barrou: " + f);
});

caso("comparação de nutriente fica no card; status de loja confere com o que lojas_agora devolveu", () => {
  const N = new Set();
  for (const f of ["Pistache é o sabor com menos calorias.", "Limão Siciliano tem mais proteína que Paçoca.", "Ele tem mais proteína.", "O Morango é light."])
    assert.equal(fraseSegura(f, N), false, "passou: " + f);
  for (const f of ["Escolhi pelo que tem mais proteína por caloria; o card mostra o número.", "O Pistache é o mais pedido da casa."])
    assert.equal(fraseSegura(f, N), true, "barrou: " + f);
  // A ferramenta disse: Praia do Canto fechada, sem entrega; Jardim Camburi aberta, entregando e grátis.
  const lojas = { lojas: { tipo: "lojas", lojas: [{ id: "praia-do-canto", aberta: false }, { id: "jardim-camburi", aberta: true }],
    entrega: [{ id: "praia-do-canto", entregando_agora: false, gratis: false }, { id: "jardim-camburi", entregando_agora: true, gratis: true }] } };
  for (const f of ["A Praia do Canto está aberta agora.", "As duas lojas estão abertas.", "A entrega é grátis agora.", "A Praia do Canto está entregando agora.",
    "A Jardim Camburi está com o atendimento suspenso agora.", "A Jardim Camburi está sem atendimento agora.", "A Jardim Camburi suspendeu o atendimento hoje.",   // atendimento suspenso é fechada
    "O atendimento da Jardim Camburi está pausado no momento.", "A Jardim Camburi está fora de atividade agora.", "A Jardim Camburi está sem atividade hoje."])
    assert.equal(fraseSegura(f, N, lojas), false, "passou contra a ferramenta: " + f);
  for (const f of ["A Praia do Canto está fechada agora, mas a Jardim Camburi está aberta.", "A Praia do Canto não está aberta agora.",
    "Na Jardim Camburi a entrega é grátis agora.", "O pedido online mostra na hora se a entrega está disponível.",
    "A Praia do Canto está com o atendimento suspenso agora.", "A Praia do Canto está sem atendimento agora.", "O atendimento da Praia do Canto está suspenso agora.",
    "A Praia do Canto está fora de atividade agora."])
    assert.equal(fraseSegura(f, N, lojas), true, "barrou o que a ferramenta disse: " + f);
  // Sem a ferramenta, status dito como "atendimento suspenso" também sai.
  for (const f of ["A Praia do Canto está com o atendimento suspenso agora.", "Estamos sem atendimento agora.", "A Praia do Canto suspendeu o atendimento.", "A Praia do Canto está fora de atividade agora."])
    assert.equal(fraseSegura(f, N, {}), false, "status sem ferramenta passou: " + f);
  // Sem dados de entrega, nada de "grátis".
  assert.equal(fraseSegura("A entrega é grátis agora.", N, { lojas: { ...lojas.lojas, entrega: null } }), false);
});

caso("alergia: menção à condição não é afirmação; sem nome, o sujeito são os cards da resposta", () => {
  const N = new Set(), semLactose = { sabores: ["limao-siciliano", "extra-dark", "maracuja", "bentole-framboesa-duo"] }, semAmendoim = { sabores: ["morango", "limao-siciliano", "bentole-framboesa-duo"] };
  for (const [f, ctx] of [
    ["Separei quatro opções sem lactose; o card diz sabor por sabor.", semLactose],
    ["Os quatro são sem lactose.", semLactose],
    ["Nenhum deles leva amendoim.", semAmendoim],
    ["Para alergia a amendoim, separei quatro opções.", semAmendoim],
    ["Temos uma opção vegana.", { sabores: ["extra-dark"] }],
    ["O Framboesa Duo é sem lactose, mas leva leite zero lactose: serve para intolerância, não para alergia ao leite.", {}],
    ["Para alergia ao leite, só o Limão Siciliano, o Maracujá e o Extra Dark não levam leite.", {}],
    ["Para quem tem alergia a amendoim, Limão Siciliano, Extra Dark, Morango e Baunilha não levam amendoim na receita.", {}],
    ["Se a alergia for a amendoim, evite o Paçoca e o Snickers.", {}],
    ["Quem tem alergia a castanhas deve evitar o Pistache e a Avelã.", {}],
    ["O Pistache contém pistache e leite.", {}],
    ["Todos os gelatos têm leite, menos o Limão Siciliano, o Maracujá e o Extra Dark.", {}],
    ["Com whey, o Shake Açaí com Banana contém leite; com a proteína vegana, confirme com a equipe.", {}],
    ["O Shake Açaí com Banana pode ser feito com água, leite A2 integral ou leite de amêndoas.", {}],
    ["Sim, temos uma opção vegana: o Extra Dark, feito com base vegana e bebida de amêndoa.", {}],
    ["O Extra Dark é a única opção vegana, com cacau 100% e bebida de amêndoa.", {}],
    ["Para alergia grave, recomendo falar com a equipe.", {}],
    ["Se você tem alergia a leite, pode confirmar com a equipe antes de pedir.", {}],
    // Shake com veredito "confirmar": ausência de leite só com proteína vegana E
    // líquido sem leite nomeados, e confirmando com a equipe.
    ["O Shake Açaí com Banana não contém leite se você escolher proteína vegana e água; confirme com a equipe.", {}],
    ["Com proteína vegana e leite de amêndoas, o Shake Açaí com Banana não leva leite; confirme com a equipe.", {}],
    // "Sensibilidade a leite" é condição como "alergia a leite".
    ["O Limão Siciliano serve para quem tem sensibilidade a leite.", {}],
    ["Quem tem sensibilidade a leite deve evitar o Morango.", {}],
    // Nome + referência às opções da tela: os dois juntos são o sujeito; sem a
    // referência, vale o nome; numeral igual à contagem de nomes é dos nomes.
    ["Assim como o Limão Siciliano, estas opções não levam leite.", { sabores: ["maracuja", "extra-dark"] }],
    ["Só o Limão Siciliano, o Maracujá e o Extra Dark não levam leite.", { sabores: ["limao-siciliano", "extra-dark", "maracuja", "bentole-framboesa-duo"] }],
    ["Esses dois, Limão Siciliano e Maracujá, não levam leite.", { sabores: ["morango"] }],
    // "Não precisa evitar" é adequação; "contém leite" do shake exige confirmar de
    // verdade; o que vem depois da exceção fala da exceção (ou de todos, com "nenhum").
    ["Quem tem alergia a leite não precisa evitar o Limão Siciliano.", {}],
    ["O Shake Açaí com Banana contém leite; confirme com a equipe antes de pedir.", {}],
    ["Todos têm leite, menos o Limão Siciliano, que é sorbet e não leva leite.", { sabores: ["pistache", "limao-siciliano"] }],
    ["Todos têm leite, menos o Limão Siciliano; nenhum deles leva amendoim.", { sabores: ["pistache", "limao-siciliano"] }],
    ["Para alergia grave, o melhor é falar direto com a equipe.", {}],
    ["Estas opções não têm leite, inclusive o Limão Siciliano, menos o Pistache.", { sabores: ["maracuja", "limao-siciliano", "pistache"] }],
    // Escolhas do shake na oração da afirmação; a confirmação pode vir na outra.
    ["Com proteína vegana e água, o Shake Açaí com Banana não contém leite; confirme com a equipe.", {}],
    ["O Pistache foi preparado com leite.", {}],
    // Alérgico solto e vegano com o card como sujeito; "contém leite" do shake só com whey/leite A2 nomeado.
    ["Esta opção leva um toque de leite.", { sabores: ["pistache"] }],
    ["Essas opções são sem lactose.", { sabores: ["limao-siciliano", "maracuja"] }],
    ["Esta opção não é vegana.", { sabores: ["pistache"] }],
    ["O Pistache não é considerado vegano.", {}],
    ["Com whey, o Shake Açaí com Banana sempre contém leite, não importa o líquido.", {}],
    ["O Shake Açaí com Banana contém lactose com whey comum e leite A2 integral.", {}],
    ["Para alergia grave, não deixe de confirmar com a equipe.", {}],                                                 // dupla negação é afirmação
    ["Com proteína vegana e água, o Shake Açaí com Banana não contém leite; fale com a equipe antes de pedir.", {}],  // contato com propósito de conferir
    ["Com proteína vegana e água, o Shake Açaí com Banana não contém leite; pergunte à equipe sobre a proteína.", {}],
    ["Se tiver alergia, pode falar com a equipe antes.", {}],                                                          // conversa com moldura de conselho
    // Adequação em palavras novas é conferida; afirmações por oração.
    ["O Limão Siciliano é perfeito para quem tem alergia a leite; confirme com a equipe antes de consumir.", {}],
    ["O Limão Siciliano não contém leite; o Morango contém leite.", {}],
    ["O Paçoca contém amendoim; o Snickers também.", {}],
    ["O Pistache não só contém leite, como é cremoso.", {}],                                                           // "não só" afirma
    ["O Pistache não deixa de ser feito com leite.", {}],                                                              // dupla negação afirma
    ["Para alergia a leite: o Limão Siciliano é perfeito; confirme com a equipe.", {}],
    ["O Shake Açaí com Banana contém leite; confirme com a equipe se a proteína é whey.", {}],                        // objeto da confirmação é ingrediente
    ["O Pistache não é mais vegano.", {}],                                                                            // negação de vegano em forma contínua
    ["Todos têm leite, menos o Limão Siciliano.", { sabores: ["pistache", "limao-siciliano"] }],
    ["O Limão Siciliano não contém leite e o Morango contém leite.", {}],                                             // " e " + sabor depois de afirmação abre oração
    ["O Limão Siciliano e o Maracujá não levam leite.", {}],                                                          // sujeito composto continua um só
    ["Assim como o Limão Siciliano, ambas não contêm leite.", { sabores: ["maracuja", "extra-dark"] }],
    // Castanhas no shake vêm do líquido: com o líquido nomeado, vale o líquido.
    ["Com leite de amêndoas, quem tem alergia a castanhas deve evitar o Shake Açaí com Banana.", {}],
    ["Quem tem alergia a castanhas deve evitar o Shake Açaí com Banana.", {}],                                        // sem líquido: o agregado do card
    ["Com água, o Shake Açaí com Banana não contém castanhas.", {}],
    // Cada predicado vale por si e na própria oração; cada oração de "vegano" idem;
    // "evitar o sabor" em frase de alergia é conselho, não terapia.
    ["O Morango não é indicado para alergia a leite; o Limão Siciliano é indicado para alergia a leite.", {}],
    ["Quem tem alergia a leite deve evitar o Morango, mas pode pedir o Limão Siciliano.", {}],
    ["O Limão Siciliano é indicado para alergia a leite; evite o Morango.", {}],
    ["O Pistache não é vegano; o Extra Dark é vegano.", {}],
    ["O Extra Dark é vegano, mas o Pistache não.", {}],
    ["O Pistache não é vegano, mas o Extra Dark sim.", {}],
    ["Temos uma opção vegana: o Extra Dark.", {}],
    ["Alergia a castanhas: evitar o Pistache e a Avelã.", {}],
    ["Quem tem alergia a castanhas deve evitar tudo com castanhas, como o Pistache.", {}],
    ["O Shake Açaí com Banana contém leite; confirme com a equipe se o Shake Açaí com Banana leva whey.", {}],         // confirmação sobre o próprio shake
    ["O Limão Siciliano não surpreende, mas não contém leite.", {}],                                                  // a negação de outra oração não entra
    ["O Limão Siciliano nunca foi feito com leite.", {}],
    ["Com whey e água ou leite de amêndoas, o Shake Açaí com Banana contém leite.", {}],                             // whey firme: o líquido não muda o leite
    ["Com whey ou leite A2 integral, o Shake Açaí com Banana contém leite.", {}],
    ["O Pistache não é vegano e o Extra Dark é vegano.", {}],                                                         // " e " + sabor depois de afirmação abre oração
    ["O Extra Dark é vegano e o Pistache não.", {}],
    ["O Limão Siciliano de forma alguma contém leite.", {}],                                                          // negação idiomática
    ["Não, o Morango contém leite.", {}],                                                                             // "não" interjeição afirma
    ["O Pistache nunca foi vegano.", {}],
    ["Esta opção não pode ser considerada vegana.", { sabores: ["pistache"] }],                                       // negação com modal
    ["O Pistache não parece vegano.", {}],
    ["Não, o Extra Dark é vegano.", {}],                                                                              // interjeição afirma
    ["Todos os gelatos têm leite, menos o Limão Siciliano, o Maracujá e o Extra Dark.", { sabores: ["limao-siciliano", "extra-dark"] }], // "todos os gelatos" é a linha, não o card
    ["Todos os sabores do card não levam leite.", { sabores: ["limao-siciliano", "extra-dark"] }],                    // "do card" é a tela
    ["Nenhum deles é vegano.", { sabores: ["pistache", "morango"] }],                                                 // quantificador negativo
    ["Nem o Pistache nem o Morango são veganos.", {}],
    ["Todos não contêm leite, menos o Morango; o Pistache é delicioso.", { sabores: ["limao-siciliano", "morango"] }], // a exceção é só a da própria oração
    ["Para quem tem alergia a castanhas, o Pistache deve ser evitado.", {}],                                          // passiva: o sabor é sujeito, mas é conselho
    ["O Extra Dark não deixa de ser vegano.", {}],                                                                    // dupla negação afirma
    ["Esta opção não contém leite.", { sabores: ["limao-siciliano"] }],                                              // sujeito da tela herda o card
    ["Não contém leite.", { sabores: ["limao-siciliano"] }],
    ["A receita não leva leite.", { sabores: ["limao-siciliano"] }],
    ["O Limão Siciliano não contém leite e Pistache contém leite.", {}],                                            // "Pistache" sem artigo com verbo próprio é sujeito
    ["Nenhuma opção deixou de ser vegana.", { sabores: ["extra-dark"] }],                                             // dupla negação com quantificador: todas continuam
    ["Para você, esta opção não contém leite.", { sabores: ["limao-siciliano"] }],                                   // sujeito da tela depois da introdução
    ["Além disso, a receita não leva leite.", { sabores: ["limao-siciliano"] }],
    ["Para quem tem alergia a leite, o Morango deve ser evitado.", {}],
    ["O Limão Siciliano é delicioso; esta opção não contém leite.", {}],                                             // sujeito da tela na oração da afirmação
    ["O Extra Dark é delicioso; essa opção é vegana.", {}],
    ["Opções sem leite: Limão Siciliano, Maracujá e Extra Dark.", {}],                                               // nome solto da tela
    ["A boa notícia é que o Limão Siciliano não contém leite.", {}],                                                 // moldura "X é que…"
    ["A melhor opção sem leite é o Limão Siciliano.", {}],                                                           // modificador entre artigo e nome
    ["O delicioso Limão Siciliano não contém leite.", {}],
    ["O Limão Siciliano que você escolheu não contém leite.", {}],
    ["Quem tem alergia a leite pode escolher o Limão Siciliano.", {}],
    ["Nem todos contêm leite.", { sabores: ["limao-siciliano", "pistache"] }],                                       // parcial: uns com, outros sem
    ["Nem todas são sem leite.", { sabores: ["limao-siciliano", "pistache"] }],
    ["Nem todos são veganos.", { sabores: ["extra-dark", "pistache"] }],
    ["A equipe confirma que o Pistache contém leite.", {}],                                                          // nome neutro que reporta
    ["O rótulo diz que não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Nossa loja tem opções sem lactose.", { sabores: ["limao-siciliano", "extra-dark"] }],                          // nome neutro que oferece
    ["A Bentô tem opções veganas.", { sabores: ["extra-dark"] }],
    ["Minha recomendação é o Limão Siciliano, que não contém leite.", {}],                                           // nome neutro que apresenta
    ["Na receita não vai leite.", { sabores: ["limao-siciliano"] }],                                                 // tópico da tela
    ["No cone, o Limão Siciliano não contém leite.", {}],                                                            // tópico cede ao sujeito próprio
    ["Para as crianças, esta opção é tranquila: não contém amendoim.", { sabores: ["limao-siciliano"] }],
    ["Com proteína vegana e leite A2 integral, o Shake Açaí com Banana contém leite.", {}],                          // adjetivo colado no tópico não é predicado
    ["Para celíacos, não contém glúten.", { sabores: ["limao-siciliano"] }],
    ["Na receita original não vai leite.", { sabores: ["limao-siciliano"] }],                                        // tópico com modificador, da tela
    ["No cone artesanal, o Limão Siciliano não contém leite.", {}],
    ["O Extra Dark não leva leite e é cacau 100%.", {}],                                                             // descritor afirmado depois da coordenação
    ["Esta opção é cacau 100%.", { sabores: ["extra-dark"] }],
    ["Só um deles contém leite.", { sabores: ["limao-siciliano", "pistache"] }],                                     // exclusivo: a conta confere
    ["Só o Pistache contém leite.", { sabores: ["limao-siciliano", "pistache"] }],
    ["Só o Limão Siciliano não contém leite.", { sabores: ["limao-siciliano", "pistache"] }],
    ["Dois deles não contêm leite.", { sabores: ["limao-siciliano", "maracuja", "pistache"] }],
    ["Só um deles é vegano.", { sabores: ["extra-dark", "pistache"] }],
    ["Só o Extra Dark é vegano.", { sabores: ["extra-dark", "pistache", "morango"] }],
    ["É falso que esta opção contém leite.", { sabores: ["limao-siciliano"] }],                                     // moldura de falsidade nega o predicado
    ["É falso que esta opção não contém leite.", { sabores: ["pistache"] }],
    ["É falso que o Pistache seja vegano.", {}],
    ["No máximo um deles contém leite.", { sabores: ["limao-siciliano", "pistache"] }],                              // cardinalidade com limite
    ["Pelo menos um deles contém leite.", { sabores: ["morango", "pistache"] }],
    ["Mais de um deles contém leite.", { sabores: ["morango", "pistache"] }],
    ["Não contém leite esta opção.", { sabores: ["limao-siciliano"] }],                                              // sujeito posposto da tela
    ["É sem leite o Limão Siciliano.", {}],
    ["Não contém leite, segundo a equipe.", { sabores: ["limao-siciliano"] }],
    ["Para alergia a leite, pode pedir à vontade.", { sabores: ["limao-siciliano"] }],
    ["Para alergia a leite, evite esse sabor.", { sabores: ["pistache"] }],
    ["É vegano o Extra Dark.", {}],                                                                                   // cópula no começo, sujeito posposto
    ["É livre de leite esta opção.", { sabores: ["limao-siciliano"] }],
    ["O Limão Siciliano não é verdadeiramente feito com leite.", {}],                                                // negação atravessa advérbio
    ["Limão Siciliano: não contém leite.", {}],                                                                       // título antes de ":"
    ["Resposta curta: não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Extra Dark: é vegano.", {}],
    ["O Pistache contém leite, então não serve para alergia ao leite.", {}],                                       // sem restrição, segue
    ["O Limão Siciliano não contém leite; se tiver dúvida, confirme com a equipe.", {}],                           // condição sobre a pessoa não restringe
    ["O Limão Siciliano não contém leite, mas confirme com a equipe.", {}],
    ["O Limão Siciliano pode ser pedido se você for alérgico a leite.", {}],
    ["Evite o Pistache se tiver alergia a castanhas.", {}],
    ["O Framboesa Duo leva leite, só que zero lactose.", {}],
    ["O Shake Açaí com Banana não contém leite se você escolher proteína vegana e água; confirme com a equipe.", {}], // escolha do shake é documentada
    ["Entre os três, só o Limão Siciliano não contém leite.", { sabores: ["limao-siciliano", "pistache", "morango"] }], // partitivo: o conjunto, não o sujeito
    ["Entre eles, só o Limão Siciliano não contém leite.", { sabores: ["limao-siciliano", "pistache", "morango"] }],
    ["Dos três, só o Extra Dark é vegano.", { sabores: ["extra-dark", "pistache", "morango"] }],
    ["Em relação ao Limão Siciliano, não contém leite.", {}],                                                       // introdutor composto com sabor
    ["Quanto a esse sabor, não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Em relação ao cone, o Limão Siciliano não contém leite.", {}],
    ["Em resumo, não contém leite.", { sabores: ["limao-siciliano"] }],                                             // locução adverbial não é tópico
    ["Em relação à alergia, não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Só um deles não contém leite.", { sabores: ["limao-siciliano", "pistache", "limao-siciliano"] }],            // id repetido conta uma vez
    ["O Pistache sempre contém leite.", {}],                                                                        // "sempre" afirma; frequência parcial sai
    ["O Limão Siciliano nunca contém leite.", {}],
    ["O Extra Dark é sempre vegano.", {}],
    ["Esta opção: cacau 100%.", { sabores: ["extra-dark"] }],                                                       // título da tela dá o sujeito ao descritor
    ["Extra Dark: cacau 100%.", {}],
    ["Resposta curta: cacau 100%.", { sabores: ["extra-dark"] }],
    ["Exatamente dois deles contêm leite.", { sabores: ["morango", "pistache"] }],                                  // contagem exata igual ao total
    ["Dois deles contêm leite.", { sabores: ["morango", "pistache"] }],
    ["Exatamente um deles é vegano.", { sabores: ["extra-dark"] }],
    ["Metade deles não contém leite.", { sabores: ["pistache", "morango", "limao-siciliano", "maracuja"] }],         // proporção confere a conta
    ["A maioria contém leite.", { sabores: ["pistache", "morango", "limao-siciliano"] }],
    ["Quase todos contêm leite.", { sabores: ["pistache", "morango", "limao-siciliano"] }],
    ["Alguns não contêm leite.", { sabores: ["pistache", "morango", "limao-siciliano"] }],
    ["Um terço deles não contém leite.", { sabores: ["pistache", "morango", "limao-siciliano"] }],
    ["Metade deles é vegana.", { sabores: ["extra-dark", "pistache"] }],
    ["A maioria não é vegana.", { sabores: ["extra-dark", "pistache", "morango"] }],
    ["Recomendo o Limão Siciliano, que não contém leite.", {}],                                                     // relativa com sabor como antecedente
    ["O Limão Siciliano, que não contém leite, vai bem no cone.", {}],
    ["O Limão Siciliano é uma opção que não contém leite.", {}],
    ["Lembre que o Limão Siciliano não contém leite.", {}],                                                         // "que" conjunção não é relativa
    ["A equipe confirma que o Limão Siciliano não contém leite.", {}],
    ["Vale dizer que não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Recomendo o Extra Dark, que é vegano.", {}],
    ["O Limão Siciliano jamais poderia vir a ser feito com leite.", {}],                                            // negação atravessa a cadeia de auxiliares
    ["O Limão Siciliano não vai acabar sendo feito com leite.", {}],
    ["O Pistache jamais poderia vir a ser vegano.", {}],
    ["O Limão Siciliano é um gelato sem leite.", {}],                                                               // predicativo depois de cópula é o sujeito
    ["O Limão Siciliano é uma opção sem leite.", {}],
    ["Temos opções sem leite.", { sabores: ["limao-siciliano"] }],
    ["Para quem quer um sabor sem leite, o Limão Siciliano serve.", {}],
    ["O Limão Siciliano, sem leite, vai bem no cone.", {}],
    ["Posso garantir que o Limão Siciliano não contém leite.", {}],                                                 // completiva com sabor como sujeito
    ["Posso garantir que esta opção não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Vale lembrar que nenhum deles contém leite.", { sabores: ["limao-siciliano", "maracuja"] }],
    ["O que importa é que o Limão Siciliano não contém leite.", {}],
    ["Posso garantir que o Extra Dark é vegano.", {}],
    ["Se você for alérgico a leite, o Limão Siciliano não contém leite.", {}],                                      // condição sobre a pessoa antes da afirmação
    ["Para quem tem alergia a leite, o Limão Siciliano não contém leite.", {}],
    ["Recomendo o Limão Siciliano; ele não contém leite.", {}],                                                     // pronome retoma o sabor
    ["Separei esta opção; ela não contém leite.", { sabores: ["limao-siciliano"] }],
    ["O Limão Siciliano vem num potinho; ele não contém leite.", {}],
    ["Recomendo o Extra Dark; ele é vegano.", {}],
    ["Posso garantir que o Extra Dark é cacau 100%.", {}],                                                          // completiva com o sabor como sujeito do descritor
    ["Recomendo o Limão Siciliano; por isso, ele não contém leite.", {}],                                           // conectivo antes do pronome
    ["Separei esta opção; sendo assim, ela não contém leite.", { sabores: ["limao-siciliano"] }],
    ["O Limão Siciliano é leve; além disso, ele não contém leite.", {}],
    ["Recomendo o Extra Dark; por isso, ele é vegano.", {}],
    ["Posso garantir que o Pistache contém leite.", {}],                                                           // moldura afirmativa segue
    ["Não tem fila, e garanto que o Pistache contém leite.", {}],                                                  // a negação não é da moldura
    ["O Pistache não leva amendoim e garanto que contém leite.", {}],
    ["Temos sabor sem leite.", { sabores: ["limao-siciliano"] }],                                                   // nome sem artigo que é produto/tela segue
    ["Separei sabores sem leite.", { sabores: ["limao-siciliano"] }],
    ["O Extra Dark é um gelato vegano.", {}],                                                                       // predicativo depois de cópula
    ["O Extra Dark é o sabor vegano da casa.", {}],
    ["Temos uma opção vegana.", { sabores: ["extra-dark"] }],
    ["Temos sabor vegano.", { sabores: ["extra-dark"] }],
    ["O Pistache com certeza contém leite.", {}],                                                                  // certeza não é incerteza
    ["O Pistache deve ser evitado por quem tem alergia a leite.", {}],                                             // "deve ser evitado" não é "deve conter"
    ["Temos sabor sem leite; ele é o Limão Siciliano.", { sabores: ["limao-siciliano"] }],
    ["Recomendo o Limão Siciliano; este não contém leite.", {}],                                                   // demonstrativo retoma o sabor
    ["Separei esta opção; esta não contém leite.", { sabores: ["limao-siciliano"] }],
    ["O Limão Siciliano está sem leite.", {}],                                                                     // "está" verbo segue
    ["O Extra Dark é sempre cacau 100%.", {}],
    ["O Extra Dark continua cacau 100%.", {}],
    ["O Limão Siciliano é a segunda opção sem leite.", {}],                                                       // ordinal não é dia da semana
    ["A segunda opção não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Hoje o Limão Siciliano não contém leite.", {}],
    ["O Pistache sempre contém leite.", {}],
    ["O Limão Siciliano nunca contém leite.", {}],
    ["O Extra Dark é sempre vegano.", {}],
    ["O Pistache foi feito com leite.", {}],                                                                       // pretérito perfeito descreve a receita atual
    ["O Limão Siciliano continua sem leite.", {}],
    ["O Extra Dark continua vegano.", {}],
    ["Temos também sabor sem leite.", { sabores: ["limao-siciliano"] }],                                            // advérbio antes de nome de produto segue
    ["O Limão Siciliano é também um gelato sem leite.", {}],
    ["Temos ainda uma opção vegana.", { sabores: ["extra-dark"] }],
    ["O Limão Siciliano é um gelato também sem leite.", {}],                                                       // advérbio antes do predicativo segue
    ["O Extra Dark é um gelato também vegano.", {}],
    ["O Extra Dark sempre foi vegano.", {}],                                                                       // "sempre foi" cobre o agora
    ["Ele não contém leite.", { anterior: "Recomendo o Limão Siciliano." }],                                        // pronome resolvido na frase anterior
    ["Ele não contém leite.", { sabores: ["limao-siciliano"], anterior: "Recomendo o Limão Siciliano." }],
    ["Ela não contém leite.", { sabores: ["limao-siciliano"], anterior: "Separei esta opção para você." }],
    ["Ele é vegano.", { anterior: "Recomendo o Extra Dark." }],
    ["Esta opção não contém leite.", { sabores: ["limao-siciliano"], anterior: "Esta opção vem com uma cobertura." }],
    ["O Extra Dark é um gelato de cacau 100%.", {}],
    ["Temos, como cortesia, sabor sem leite.", { sabores: ["limao-siciliano"] }],                                   // parêntese antes de nome de produto segue
    ["O Limão Siciliano é, sem dúvida, um gelato sem leite.", {}],
    ["O Limão Siciliano é a melhor opção sem leite.", {}],                                                         // modificador entre o artigo e o predicativo
    ["O Limão Siciliano é um bom gelato sem leite.", {}],
    ["O Extra Dark é mesmo vegano.", {}],
    ["Recomendo o Limão Siciliano; o mesmo não contém leite.", {}],                                                // anáfora nominal com antecedente de produto
    ["Recomendo o Extra Dark; o mesmo é vegano.", {}],
    ["Separei esta opção; a mesma não contém leite.", { sabores: ["limao-siciliano"] }],
    ["O Limão Siciliano não contém leite, e o mesmo vale para o Maracujá.", {}],
    ["O Limão Siciliano não contém leite; a mesma regra vale para o Maracujá.", {}],
    ["O Limão Siciliano é um gelato de chocolate sem leite.", {}],                                                 // núcleo "gelato" é da tela; depois de cópula, predicativo
    ["Esta opção é uma bola de gelato sem leite.", { sabores: ["limao-siciliano"] }],
    ["Boa noite! O Pistache contém leite.", {}],                                                                   // "noite" sem preposição não é período
    ["Tudo que mostrei não contém leite.", { sabores: ["limao-siciliano"] }],                                      // indefinido com apresentação é a tela
    ["Tudo o que está na tela não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Algo que não contém leite: o Limão Siciliano.", {}],                                                         // a relativa é a própria alegação
    ["O Limão Siciliano, que certamente não contém leite, é refrescante.", {}],                                     // advérbio na relativa do próprio sabor
    ["Temos o Limão Siciliano e o Maracujá sem leite.", {}],
    ["Incluímos o Limão Siciliano, que não contém leite.", {}],                                                    // primeira pessoa do plural com o sabor como objeto
    ["Oferecemos opções sem leite.", { sabores: ["limao-siciliano"] }],
    ["O Limão Siciliano, que com certeza não contém leite, é refrescante.", {}],                                   // locução adverbial na relativa do próprio sabor
    ["Recomendo o Limão Siciliano; de fato, ele não contém leite.", {}],
    ["Na receita, não contém leite.", { sabores: ["limao-siciliano"] }],                                           // tópico da tela segue nos cards
    ["Na dúvida, não contém leite.", { sabores: ["limao-siciliano"] }],                                            // neutro de discurso: sem sujeito
    ["No pedido, o Limão Siciliano não contém leite.", {}],
    ["Na loja, temos opções sem leite.", { sabores: ["limao-siciliano"] }],
    ["Fornecemos opções sem leite.", { sabores: ["limao-siciliano"] }],                                            // objeto da tela segue
    ["O Limão Siciliano é cremoso e também sem leite.", {}],
    ["A equipe desta loja confirma que o Limão Siciliano não contém leite.", {}],                                 // complemento com relato não é composição
    ["Os atendentes desta loja confirmam que o Limão Siciliano não contém leite.", {}],                           // nome neutro com cara de adjetivo é nome
    ["Opção artesanal não contém leite.", { sabores: ["limao-siciliano"] }],                                       // nome solto da tela com adjetivo
    ["Cone artesanal acompanha esta opção, que não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Correto, não contém leite.", { sabores: ["limao-siciliano"] }],                                              // interjeição não é nome solto
    ["Confirmado, sem leite.", { sabores: ["limao-siciliano"] }],
    ["Resposta curta: não contém leite.", { sabores: ["limao-siciliano"] }],
    ["É servida esta opção sem leite.", { sabores: ["limao-siciliano"] }],                                        // particípio depois da cópula não é nome solto
    ["É servido sem leite.", { sabores: ["limao-siciliano"] }],
    ["São servidas opções sem leite.", { sabores: ["limao-siciliano"] }],
    ["Vem sem leite.", { sabores: ["limao-siciliano"] }],
    ["Existe opção sem leite.", { sabores: ["limao-siciliano"] }],
    ["Adicione esta opção sem leite.", { sabores: ["limao-siciliano"] }],                                         // imperativo não é nome solto
    ["Aproveite, não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Confira: sem leite.", { sabores: ["limao-siciliano"] }],
    ["Peça sem medo, não contém leite.", { sabores: ["limao-siciliano"] }],                                       // "peça" não é "pecã"
    ["Peça pelo WhatsApp.", { sabores: ["limao-siciliano"] }],
    ["Não contém pecã.", { sabores: ["limao-siciliano"] }],
    ["Pode ser incluída esta opção sem leite.", { sabores: ["limao-siciliano"] }],                                // passiva depois de modal: com artigo, o artigo cuida
    ["Pode ser servido sem leite.", { sabores: ["limao-siciliano"] }],
    ["Podem ser servidas opções sem leite.", { sabores: ["limao-siciliano"] }],
    ["Pode ser considerada vegana.", { sabores: ["extra-dark"] }],
    ["Pode vir sem leite.", { sabores: ["limao-siciliano"] }],
    ["Poderá ser incluída esta opção sem leite.", { sabores: ["limao-siciliano"] }],                              // modal no futuro
    ["Poderá ser considerada vegana.", { sabores: ["extra-dark"] }],
    ["Tal opção não contém leite.", { sabores: ["limao-siciliano"] }],                                            // "tal" é determinante
    ["Tal como o Limão Siciliano, esta opção não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Mesma coisa: não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Outra opção não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Opção acompanha o pedido e não contém leite.", { sabores: ["limao-siciliano"] }],                           // verbo de objeto depois do sujeito fecha a busca
    ["Esta opção acompanha o pedido e não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Posso garantir que esta opção não contém leite.", { sabores: ["limao-siciliano"] }],                        // modal em 1ª pessoa não é nome solto
    ["Sempre acompanha esta opção e não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Complemento a resposta: esta opção não contém leite.", { sabores: ["limao-siciliano"] }],                  // "complemento" verbo segue verbo
    ["Garanto que não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Vem junto e não contém leite.", { sabores: ["limao-siciliano"] }],
    ["O Extra Dark é plant-based.", {}],                                                                           // "plant-based" com hífen é vegano
    ["Esta opção inclui tanto cobertura quanto cone, e não contém leite.", { sabores: ["limao-siciliano"] }],       // a coordenação é do objeto; a afirmação é da opção
    ["Tanto o Limão Siciliano quanto o Maracujá não contêm leite.", {}],
  ]) assert.equal(fraseSegura(f, N, ctx), true, "barrou: " + f);
  for (const [f, ctx] of [
    ["Separei opções sem lactose.", { sabores: ["pistache", "limao-siciliano"] }],   // um dos cards tem lactose
    ["Nenhum deles leva amendoim.", { sabores: ["pacoca", "morango"] }],
    ["Para alergia a amendoim, separei quatro opções.", { sabores: ["pacoca", "morango"] }],
    ["Separei opções sem lactose.", {}],                                            // sem card e sem nome
    ["Quem tem alergia a castanhas deve evitar o Pistache, a Avelã e o Paçoca.", {}], // Paçoca: amendoim, não castanha
    ["O Shake Açaí com Banana contém leite.", {}],                                  // depende da proteína: diga com o quê
    ["O Shake Açaí com Banana não contém leite.", {}],
    ["No Pistache não há leite.", {}],
    ["O Pistache abre mão do leite.", {}],
    ["O Limão Siciliano leva um toque de leite.", {}],
    ["Quem tem alergia pode ficar tranquilo.", {}],
    ["Temos uma opção vegana.", { sabores: ["extra-dark", "pistache"] }],
    ["O Shake Açaí com Banana não contém leite se você escolher proteína vegana; confirme com a equipe.", {}],       // a vegana vai com leite A2 integral também
    ["O Shake Açaí com Banana não contém leite com proteína vegana e leite A2 integral; confirme com a equipe.", {}],
    ["Com proteína vegana e água ou leite A2 integral, o Shake Açaí com Banana não leva leite; confirme com a equipe.", {}],
    ["O Shake Açaí com Banana não contém leite se você escolher proteína vegana e água.", {}],                       // sem confirmar com a equipe
    ["O Shake Açaí com Banana não contém leite com proteína vegana e água; nossa equipe prepara na hora.", {}],      // "equipe" sem confirmar
    ["O Shake Frutas Vermelhas não contém leite com proteína vegana e água; confirme com a equipe.", {}],            // esse shake não tem a vegana
    ["O Morango serve para quem tem sensibilidade a leite.", {}],                                                      // Morango contém leite
    ["Para quem tem sensibilidade a lactose, o Pistache é tranquilo.", {}],
    ["Assim como o Limão Siciliano, estas opções não levam leite.", { sabores: ["morango"] }],                        // "estas opções" é o card, e o Morango tem leite
    ["Assim como o Extra Dark, essas opções são veganas.", { sabores: ["pistache"] }],
    ["Assim como o Extra Dark, essas opções são cacau 100%.", { sabores: ["pistache"] }],
    ["Quem tem alergia a leite não deve evitar o Morango.", {}],                                                      // negação em "evitar": Morango tem leite
    ["O Shake Açaí com Banana contém leite; nossa equipe prepara na hora.", {}],                                      // "equipe" sem confirmar
    ["Para alergia grave ao leite, o Pistache é feito pela nossa equipe.", {}],
    ["Todos têm leite, menos o Limão Siciliano, que contém castanhas.", { sabores: ["pistache", "limao-siciliano"] }], // a oração depois da exceção é da exceção
    ["Todos têm leite, menos o Limão Siciliano; nenhum deles leva amendoim.", { sabores: ["pacoca", "limao-siciliano"] }],
    ["Estas opções não têm leite, inclusive o Limão Siciliano, menos o Pistache.", { sabores: ["morango", "limao-siciliano", "pistache"] }], // nome antes da exceção + "estas opções": os cards entram, e o Morango tem leite
    ["Com whey, o Shake Açaí com Banana não contém leite; com proteína vegana e água, confirme com a equipe.", {}],  // a vegana e a água estão na outra oração; whey na da afirmação
    ["O Shake Açaí com Banana contém leite; com whey fica mais cremoso.", {}],                                      // o whey não qualifica a afirmação da outra oração
    ["O Pistache deixou de ser preparado com leite.", {}],                                                           // cessação: a composição citada é a que saiu
    ["O Pistache parou de levar um toque de leite.", {}],
    ["Esta opção dispensa leite.", { sabores: ["morango"] }],                                                        // forma não reconhecida com o card como sujeito: Morango tem leite
    ["Essas opções abrem mão do leite.", { sabores: ["morango", "pistache"] }],
    ["Esta opção leva um toque de leite.", { sabores: ["limao-siciliano"] }],
    ["Essas opções são isentas de lácteos.", { sabores: ["morango"] }],
    ["Esta opção não é só vegana.", { sabores: ["pistache"] }],                                                       // "não é só" afirma vegano
    ["O Shake Açaí com Banana sempre contém leite, não importa o líquido.", {}],                                      // sem whey/leite A2 nomeado: com a vegana e água não é verdade
    ["O Shake Açaí com Banana contém lactose com whey zero lactose e água.", {}],                                   // whey zero lactose não é prova de lactose
    ["Para alergia grave, não fale com a equipe.", {}],                                                               // mandar não falar com a equipe em frase de alergia sai
    ["Com proteína vegana e água, o Shake Açaí com Banana não contém leite; não precisa confirmar com a equipe.", {}],
    ["Para alergia a amendoim, o Limão Siciliano serve e você nem precisa perguntar à equipe.", {}],
    ["Com proteína vegana e água, o Shake Açaí com Banana não contém leite; avise a equipe que vai pedir.", {}],      // contato sem conferir nada
    ["Com proteína vegana e água, o Shake Açaí com Banana não contém leite; mande mensagem para a equipe.", {}],
    ["O Shake Açaí com Banana contém leite; avise a equipe.", {}],
    ["Com proteína vegana e água, o Shake Açaí com Banana não contém leite; fale com a equipe sobre o horário.", {}],  // conversa sobre outra coisa
    ["O Morango é perfeito para quem tem alergia a leite; confirme com a equipe antes de consumir.", {}],              // a confirmação não valida a adequação falsa
    ["O Morango é ideal para quem tem alergia a leite.", {}],
    ["O Morango não contém leite; o Limão Siciliano contém leite.", {}],
    ["O Limão Siciliano não contém leite; o Morango também.", {}],                                                     // "também" entra na afirmação anterior
    ["O Limão Siciliano não só contém leite; ele também é refrescante.", {}],                                          // "não só" não é negação
    ["Para alergia a leite: o Morango é perfeito; confirme com a equipe.", {}],                                        // condição + sabor sem afirmação conferida, em qualquer oração
    ["Se tiver alergia a leite, confirme com a equipe antes de pedir o Pistache.", {}],                                // idem: negar por padrão
    ["O Extra Dark não é mais vegano.", {}],                                                                          // nega vegano num sabor vegano
    ["O Extra Dark deixou de ser vegano.", {}],
    ["O Shake Açaí com Banana contém leite; confirme com a equipe se a promoção vale.", {}],                          // confirmação sobre outra coisa
    ["Todos têm leite; entre meus favoritos, menos o Limão Siciliano.", { sabores: ["pistache", "limao-siciliano"] }], // exceção de outra oração não qualifica
    ["O Morango não contém leite e o Limão Siciliano contém leite.", {}],
    ["Assim como o Limão Siciliano, ambas não contêm leite.", { sabores: ["morango", "baunilha"] }],                 // "ambas" é o card
    ["Com whey e água, quem tem alergia a castanhas deve evitar o Shake Açaí com Banana.", {}],                       // água não tem castanha
    ["Com leite de amêndoas, o Shake Açaí com Banana não contém castanhas.", {}],
    ["O Morango não é indicado para alergia a leite; o Pistache é indicado para alergia a leite.", {}],             // o segundo predicado também confere
    ["Quem tem alergia a leite deve evitar o Limão Siciliano, mas pode pedir o Morango.", {}],
    ["O Morango é indicado para alergia a leite; evite o Limão Siciliano.", {}],
    ["O Pistache deixou de ser vegano; o Limão Siciliano é vegano.", {}],                                           // polaridade por oração
    ["O Extra Dark é vegano; o Pistache também é vegano.", {}],
    ["O Pistache não é vegano; o Extra Dark também.", {}],
    ["Temos uma opção vegana: o Pistache.", {}],
    ["O Extra Dark evita cáries; quem tem alergia a castanhas deve evitá-lo.", {}],                                 // terapia numa oração, conselho na outra
    ["Quem tem alergia a castanhas deve evitá-lo; o Extra Dark evita cáries.", {}],
    ["Quem tem alergia a castanhas deve evitar o Pistache, mas o Extra Dark evita cáries.", {}],
    ["Quem tem alergia a castanhas deve evitar o Pistache; o Extra Dark melhora o humor.", {}],
    ["O Shake Açaí com Banana contém leite; confirme com a equipe se o Pistache contém castanhas.", {}],              // confirmação presa a outro sabor
    ["O Shake Açaí com Banana contém leite, confirme com a equipe se o Pistache tem castanhas.", {}],
    ["Com proteína vegana e água, o Shake Açaí com Banana não contém leite; confirme com a equipe se o Pistache contém castanhas.", {}],
    ["O Limão Siciliano não surpreende, mas contém leite.", {}],                                                      // "não surpreende" não nega "contém"
    ["O Limão Siciliano não decepciona e contém leite.", {}],
    ["O Morango não é um sabor feito com leite.", {}],                                                                // negação com nome genérico no meio
    ["Com whey ou proteína vegana e água, o Shake Açaí com Banana contém leite.", {}],                               // o ramo vegano não tem leite
    ["Com proteína vegana e leite A2 integral ou água, o Shake Açaí com Banana contém leite.", {}],
    ["Com whey ou proteína vegana, o Shake Açaí com Banana contém lactose.", {}],
    ["O Pistache deixou de ser vegano e o Limão Siciliano é vegano.", {}],                                           // a segunda afirmação também confere
    ["O Extra Dark é vegano e o Pistache também.", {}],
    ["O Morango de forma alguma contém leite.", {}],                                                                  // negação idiomática
    ["O Morango em hipótese alguma contém leite.", {}],
    ["De forma alguma o Morango contém leite.", {}],
    ["O Extra Dark nunca foi vegano.", {}],
    ["Nem mesmo o Extra Dark é vegano.", {}],
    ["Com água ou leite de amêndoas, o Shake Açaí com Banana contém castanhas.", {}],                                // o ramo da água não tem castanha
    ["Com água ou leite de amêndoas, o Shake Açaí com Banana não contém castanhas.", {}],
    ["Com whey comum ou whey zero lactose, o Shake Açaí com Banana contém lactose.", {}],
    ["Esta opção não pode ser considerada vegana.", { sabores: ["extra-dark"] }],                                     // nega o vegano do card
    ["Esta opção não parece ser vegana.", { sabores: ["extra-dark"] }],
    ["O Extra Dark não chega a ser vegano.", {}],
    ["Não dá para chamar o Extra Dark de vegano.", {}],                                                                // negação não reconhecida perto de "vegano": sai
    ["Todos os gelatos não contêm leite.", { sabores: ["limao-siciliano", "extra-dark"] }],                           // linha inteira: há gelato com leite
    ["Os picolés não contêm leite.", { sabores: ["limao-siciliano", "extra-dark"] }],
    ["Nenhum gelato leva amendoim.", { sabores: ["limao-siciliano", "extra-dark"] }],
    ["Nenhuma opção é vegana.", { sabores: ["extra-dark"] }],                                                         // quantificador negativo nega o vegano do card
    ["Nenhum deles é vegano.", { sabores: ["extra-dark"] }],
    ["Nem o Extra Dark é vegano.", {}],
    ["Todos não contêm leite, menos o Morango; o Pistache é delicioso.", { sabores: ["limao-siciliano", "morango", "pistache"] }], // o Pistache não é exceção
    ["Com whey ou a opção de proteína vegana e água, o Shake Açaí com Banana contém leite.", {}],                    // modificador dentro da disjunção
    ["Com a opção de proteína vegana ou whey, o Shake Açaí com Banana contém leite.", {}],
    ["Para quem tem alergia a leite, o Morango evita leite.", {}],                                                   // o sabor como sujeito de "evitar" diz o contrário
    ["Para quem tem alergia a leite, o Limão Siciliano evita leite.", {}],
    ["O Pistache não deixa de ser vegano.", {}],                                                                      // dupla negação: afirma vegano num sabor com leite
    ["O Pistache não parou de ser vegano.", {}],
    ["O cone não contém leite.", { sabores: ["limao-siciliano"] }],                                                   // sujeito estranho ao catálogo não herda o card
    ["A cobertura não contém leite.", { sabores: ["limao-siciliano"] }],
    ["A casquinha é sem glúten.", { sabores: ["limao-siciliano"] }],
    ["O Limão Siciliano não contém leite e Pistache não contém leite.", {}],                                        // o Pistache tem leite
    ["Nenhuma opção deixou de ser vegana.", { sabores: ["limao-siciliano"] }],                                        // o Limão não é vegano
    ["Nenhum deles parou de ser vegano.", { sabores: ["limao-siciliano"] }],
    ["Para você, o cone não contém leite.", { sabores: ["limao-siciliano"] }],                                        // sujeito estranho depois da introdução
    ["Além disso, a cobertura não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Para quem tem alergia a leite, o Morango por sua composição evita leite.", {}],                                // sabor sujeito de "evitar", com modificador no meio
    ["Hoje, o topping não é vegano.", { sabores: ["extra-dark"] }],
    ["O Limão Siciliano é delicioso; o cone não contém leite.", {}],                                                  // sujeito estranho na oração da afirmação
    ["A cobertura do Limão Siciliano não contém leite.", {}],
    ["O Extra Dark é delicioso; o cone é vegano.", {}],
    ["Cone não contém leite.", { sabores: ["limao-siciliano"] }],                                                     // nome solto estranho, sem artigo
    ["Cobertura não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Casquinha de chocolate contém leite.", { sabores: ["limao-siciliano"] }],
    ["O cone que acompanha o Limão Siciliano não contém leite.", {}],                                                // a relativa não devolve o sujeito ao catálogo
    ["O cone e o Limão Siciliano não contêm leite.", {}],
    ["O Limão Siciliano e o cone não contêm leite.", {}],
    ["A boa notícia é que o cone não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Quem tem alergia a leite pode escolher o cone.", { sabores: ["limao-siciliano"] }],                             // objeto estranho da adequação
    ["Nem todos contêm leite.", { sabores: ["morango", "pistache"] }],                                               // parcial com todos iguais
    ["Nem todos contêm leite.", { sabores: ["limao-siciliano", "maracuja"] }],
    ["Não são todos que contêm leite.", { sabores: ["morango", "pistache"] }],
    ["Nem todos são veganos.", { sabores: ["extra-dark"] }],
    ["Meu pedido não contém leite.", { sabores: ["limao-siciliano"] }],                                              // nome neutro que encabeça a composição
    ["Seu pedido pode conter leite.", { sabores: ["limao-siciliano"] }],
    ["Seu pedido sai sem leite.", { sabores: ["limao-siciliano"] }],
    ["Meu pedido e o Limão Siciliano não contêm leite.", {}],
    ["A loja é segura para alérgicos a leite.", { sabores: ["limao-siciliano"] }],
    ["No cone, não contém leite.", { sabores: ["limao-siciliano"] }],                                                // tópico preposicionado estranho
    ["Na casquinha não vai leite.", { sabores: ["limao-siciliano"] }],
    ["Na calda não vai leite.", { sabores: ["limao-siciliano"] }],
    ["No topping, não é vegano.", { sabores: ["extra-dark"] }],
    ["No cone artesanal, não vai leite.", { sabores: ["limao-siciliano"] }],                                         // tópico com modificador
    ["Na nossa casquinha crocante, não vai leite.", { sabores: ["limao-siciliano"] }],
    ["Na casquinha de chocolate não vai leite.", { sabores: ["limao-siciliano"] }],
    ["O Extra Dark não é cacau 100%.", {}],                                                                          // descritor só na afirmação
    ["O Extra Dark deixou de ser cacau 100%.", {}],
    ["É falso que o Extra Dark seja cacau 100%.", {}],
    ["Esta opção não é cacau 100%.", { sabores: ["extra-dark"] }],
    ["Só um deles contém leite.", { sabores: ["morango", "pistache"] }],                                             // exclusivo com os dois com leite
    ["Só um deles contém leite.", { sabores: ["limao-siciliano", "maracuja"] }],
    ["Só um deles contém leite.", { sabores: ["pistache"] }],
    ["Só o Pistache contém leite.", { sabores: ["morango", "pistache"] }],
    ["Só o Limão Siciliano não contém leite.", { sabores: ["limao-siciliano", "maracuja"] }],
    ["Só o Limão Siciliano não contém leite.", {}],                                                                  // no catálogo, outros também não têm
    ["Só o Pistache é vegano.", { sabores: ["extra-dark", "pistache"] }],
    ["É falso que esta opção contém leite.", { sabores: ["pistache"] }],                                             // a falsidade nega: Pistache contém
    ["É falso que o Extra Dark seja vegano.", {}],
    ["É falso que esta opção seja indicada para alérgicos a leite.", { sabores: ["limao-siciliano"] }],
    ["No máximo um deles contém leite.", { sabores: ["morango", "pistache"] }],                                      // dois com leite: o limite é falso
    ["Até um deles contém leite.", { sabores: ["morango", "pistache"] }],
    ["Pelo menos um deles contém leite.", { sabores: ["limao-siciliano", "maracuja"] }],
    ["Menos de dois deles contêm leite.", { sabores: ["morango", "pistache"] }],
    ["Não contém leite o cone.", { sabores: ["limao-siciliano"] }],                                                  // sujeito posposto estranho
    ["Sem leite é o cone.", { sabores: ["limao-siciliano"] }],
    ["Não é vegano o topping.", { sabores: ["extra-dark"] }],
    ["Para alergia a leite, não evite o cone.", { sabores: ["limao-siciliano"] }],                                    // objeto estranho do evitar
    ["Para alergia a leite, evite a casquinha.", { sabores: ["limao-siciliano"] }],
    ["É vegano o cone.", { sabores: ["extra-dark"] }],                                                               // cópula no começo, sujeito posposto estranho
    ["É livre de leite o cone.", { sabores: ["extra-dark"] }],
    ["O Pistache não é verdadeiramente feito com leite.", {}],                                                       // a negação atravessa o advérbio
    ["O Extra Dark não é verdadeiramente vegano.", {}],
    ["Cone: não contém leite.", { sabores: ["limao-siciliano"] }],                                                   // título estranho antes de ":"
    ["Cone: é vegano.", { sabores: ["extra-dark"] }],
    ["O Pistache contém leite somente se você pedir com cobertura.", {}],                                           // restrição que a ficha não documenta
    ["O Pistache contém leite só na versão tradicional.", {}],
    ["O Pistache contém leite apenas quando servido com cobertura.", {}],
    ["O Pistache contém leite, a menos que peça a versão vegana.", {}],
    ["O Pistache contém leite, exceto se pedir sem cobertura.", {}],
    ["O Pistache contém leite se vier com cobertura.", {}],
    ["O Pistache contém leite, dependendo da versão.", {}],
    ["O Pistache só contém leite.", {}],
    ["O Pistache contém leite, mas só se pedir com cobertura.", {}],
    ["O Limão Siciliano não contém leite, só se pedir com cobertura.", {}],
    ["O Limão Siciliano não contém leite, exceto na versão com cobertura.", {}],
    ["O Limão Siciliano é indicado para alergia a leite só se pedir sem cobertura.", {}],
    ["Evite o Pistache, a menos que peça sem castanhas.", {}],
    ["O Extra Dark é vegano só na versão sem cobertura.", {}],
    ["O Extra Dark só é vegano se pedir sem cobertura.", {}],
    ["Em relação ao cone, não contém leite.", { sabores: ["limao-siciliano"] }],                                    // introdutor composto mantém o sujeito estranho
    ["Quanto ao cone, não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Com relação ao cone, não contém leite.", { sabores: ["limao-siciliano"] }],
    ["No caso do cone, não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Falando do cone, não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Quanto ao cone, é vegano.", { sabores: ["extra-dark"] }],
    ["Dois deles não contêm leite.", { sabores: ["limao-siciliano", "pistache", "limao-siciliano"] }],             // id repetido não conta duas vezes
    ["Os dois não contêm leite.", { sabores: ["limao-siciliano", "pistache", "limao-siciliano"] }],
    ["O Pistache nem sempre contém leite.", {}],                                                                    // frequência é restrição: a ficha é incondicional
    ["O Pistache raramente contém leite.", {}],
    ["O Pistache contém leite ocasionalmente.", {}],
    ["O Pistache quase sempre contém leite.", {}],
    ["O Pistache geralmente contém leite.", {}],
    ["Normalmente o Pistache contém leite.", {}],
    ["O Pistache contém leite na maioria das vezes.", {}],
    ["O Limão Siciliano nem sempre é livre de leite.", {}],
    ["O Extra Dark nem sempre é vegano.", {}],
    ["O Extra Dark é vegano na maioria das vezes.", {}],
    ["Em geral, não contém leite.", { sabores: ["limao-siciliano"] }],
    ["No geral, os quatro não têm lactose.", { sabores: ["limao-siciliano", "extra-dark", "maracuja", "bentole-framboesa-duo"] }],
    ["Cone: cacau 100%.", { sabores: ["extra-dark"] }],                                                             // título estranho: o descritor não escapa da régua
    ["Cobertura: cacau 100%.", { sabores: ["extra-dark"] }],
    ["Exatamente dois deles contêm leite.", { sabores: ["morango", "limao-siciliano"] }],
    ["Só dois deles contêm leite.", { sabores: ["morango", "pistache"] }],                                          // "só" pede sobra
    ["Metade deles contém leite.", { sabores: ["pistache", "morango"] }],                                           // proporção: os dois contêm
    ["A maioria contém leite.", { sabores: ["pistache", "morango"] }],
    ["A minoria contém leite.", { sabores: ["pistache", "morango", "limao-siciliano"] }],
    ["Alguns deles contêm leite.", { sabores: ["pistache", "morango"] }],
    ["Poucos contêm leite.", { sabores: ["pistache", "morango", "limao-siciliano"] }],
    ["Metade deles é vegana.", { sabores: ["extra-dark", "pistache", "morango"] }],
    ["A maioria é vegana.", { sabores: ["extra-dark", "pistache", "morango"] }],
    ["O Limão Siciliano vai no cone, que não contém leite.", {}],                                                   // relativa: o antecedente estranho é o sujeito
    ["O Limão Siciliano vem com a cobertura, que não contém leite.", {}],
    ["O Limão Siciliano vai no cone artesanal, que não leva leite.", {}],
    ["O Limão Siciliano vai no cone, o qual não contém leite.", {}],
    ["Vai no cone, que não contém leite.", { sabores: ["limao-siciliano"] }],
    ["O Extra Dark vai no cone, que é vegano.", {}],
    ["O Extra Dark vai na casquinha, que não é feita com leite.", {}],
    ["O Pistache jamais poderia vir a ser feito com leite.", {}],                                                   // cadeia de auxiliares: a negação chega ao predicado
    ["O Pistache nunca vai chegar a ser feito com leite.", {}],
    ["O Pistache não vai acabar sendo feito com leite.", {}],
    ["Esta opção jamais poderia vir a ser feita com leite.", { sabores: ["pistache"] }],
    ["O Extra Dark jamais poderia vir a ser vegano.", {}],
    ["Esta opção vem com um cone sem leite.", { sabores: ["limao-siciliano"] }],                                    // forma adjetiva qualifica o nome logo antes
    ["O Limão Siciliano vem com um cone sem leite.", {}],
    ["O Limão Siciliano vai no cone sem leite.", {}],
    ["Pode pedir o Limão Siciliano com cobertura sem leite.", {}],
    ["O Limão Siciliano vem com um cone artesanal sem leite.", {}],
    ["O Limão Siciliano vem com um cone feito com leite.", {}],
    ["O cone sem leite é ótimo.", { sabores: ["limao-siciliano"] }],
    ["Posso garantir que o cone não contém leite.", { sabores: ["limao-siciliano"] }],                              // completiva: o sujeito é o cone
    ["É certo que o cone não contém leite.", { sabores: ["limao-siciliano"] }],
    ["A equipe confirma que o cone não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Não sei se o cone contém leite.", { sabores: ["limao-siciliano"] }],
    ["Posso garantir que o cone é vegano.", { sabores: ["extra-dark"] }],
    ["O cone que acompanha o Limão Siciliano não contém leite.", {}],                                               // "que" relativo não abre completiva
    ["Somente se pedir com cobertura, o Pistache contém leite.", {}],                                               // restrição antes da afirmação
    ["Só na versão tradicional, o Pistache contém leite.", {}],
    ["Apenas quando servido com cobertura, o Pistache contém leite.", {}],
    ["Se pedir sem cobertura, o Limão Siciliano não contém leite.", {}],
    ["Somente se for servido no pote, o Extra Dark é vegano.", {}],
    ["Dependendo da versão, o Pistache contém leite.", {}],
    ["O Limão Siciliano vem com uma cobertura; ela não contém leite.", {}],                                         // pronome retoma a cobertura, não o sabor
    ["O Limão Siciliano vem com uma cobertura e ela não contém leite.", {}],
    ["Esta opção vem com um cone; ele não contém leite.", { sabores: ["limao-siciliano"] }],
    ["O Extra Dark vem com uma cobertura; ela é vegana.", {}],
    ["O Extra Dark vai no cone, que é cacau 100%.", {}],                                                            // descritor com sujeito local estranho
    ["Posso garantir que o cone é cacau 100%.", { sabores: ["extra-dark"] }],
    ["A cobertura do Extra Dark é cacau 100%.", {}],
    ["O Extra Dark vem com uma cobertura; ela é cacau 100%.", {}],
    ["Esta opção vem com uma cobertura; por isso, ela não contém leite.", { sabores: ["limao-siciliano"] }],       // conectivo de mais de uma palavra não esconde o antecedente
    ["O Limão Siciliano vem com uma cobertura, portanto ela não contém leite.", {}],
    ["O Limão Siciliano vem com uma cobertura, o que significa que ela não contém leite.", {}],
    ["O Limão Siciliano vem com uma cobertura; ou seja, ela não contém leite.", {}],
    ["O Extra Dark vem com uma cobertura; por isso, ela é vegana.", {}],
    ["O Extra Dark vem com uma cobertura; por isso, ela é cacau 100%.", {}],
    ["Não se pode dizer que o Pistache contém leite.", {}],                                                        // moldura de relato negada: recusa a ficha
    ["Não posso garantir que o Pistache contém leite.", {}],
    ["Não dá para afirmar que o Pistache contém leite.", {}],
    ["Não é certo que o Pistache contém leite.", {}],
    ["Ninguém pode dizer que o Pistache contém leite.", {}],
    ["Não sei se o Pistache contém leite.", {}],
    ["Isso não quer dizer que o Pistache contém leite.", {}],
    ["Não se pode dizer que o Limão Siciliano não contém leite.", {}],
    ["Não se pode dizer que esta opção contém leite.", { sabores: ["pistache"] }],
    ["Não posso garantir que o Extra Dark é vegano.", {}],
    ["Esta opção inclui cobertura sem leite.", { sabores: ["limao-siciliano"] }],                                   // nome sem artigo em posição de objeto
    ["O Limão Siciliano inclui cobertura sem leite.", {}],
    ["O Limão Siciliano acompanha cone sem leite.", {}],
    ["O Limão Siciliano traz calda sem leite.", {}],
    ["O Extra Dark inclui um cone vegano.", {}],                                                                    // vegano preso ao nome de objeto
    ["O Extra Dark inclui cone vegano.", {}],
    ["O Extra Dark vem com uma cobertura vegana.", {}],
    ["O Extra Dark acompanha calda vegana.", {}],
    ["Esta opção inclui um cone vegano.", { sabores: ["extra-dark"] }],
    ["O Extra Dark vai no cone vegano.", {}],
    ["Esta opção inclui cobertura; ela não contém leite.", { sabores: ["limao-siciliano"] }],                      // antecedente sem artigo em posição de objeto
    ["O Limão Siciliano acompanha cone e ele não contém leite.", {}],
    ["O Limão Siciliano inclui cobertura, que não contém leite.", {}],
    ["O Extra Dark inclui cone; ele é vegano.", {}],
    ["O Extra Dark inclui cone, que é vegano.", {}],
    ["Possivelmente o Pistache contém leite.", {}],                                                                // incerteza rebaixa a ficha
    ["O Pistache aparentemente contém leite.", {}],
    ["É incerto se o Pistache contém leite.", {}],
    ["Talvez o Pistache contenha leite.", {}],
    ["O Pistache pode conter leite.", {}],
    ["Parece que o Pistache contém leite.", {}],
    ["Supostamente o Limão Siciliano não contém leite.", {}],
    ["Provavelmente esta opção contém leite.", { sabores: ["pistache"] }],
    ["O Extra Dark provavelmente é vegano.", {}],
    ["O Extra Dark pode ser vegano.", {}],
    ["Esta opção tem uma cobertura; esta não contém leite.", { sabores: ["limao-siciliano"] }],                    // "esta" demonstrativo retoma a cobertura
    ["O Limão Siciliano vem com uma cobertura e esta não contém leite.", {}],
    ["O Limão Siciliano vem com uma cobertura; por isso, esta não contém leite.", {}],
    ["O Extra Dark vem com uma cobertura; esta é vegana.", {}],
    ["O Extra Dark vem com uma cobertura; esta é cacau 100%.", {}],
    ["O Extra Dark é cacau 100% somente na versão tradicional.", {}],                                             // qualificador no descritor
    ["Só na versão tradicional, o Extra Dark é cacau 100%.", {}],
    ["O Extra Dark talvez seja cacau 100%.", {}],
    ["O Extra Dark será cacau 100%.", {}],
    ["O Extra Dark era cacau 100%.", {}],
    ["O Extra Dark nem sempre é cacau 100%.", {}],
    ["Não posso garantir que o Extra Dark é cacau 100%.", {}],
    ["Esta opção talvez seja cacau 100%.", { sabores: ["extra-dark"] }],
    ["O Pistache contém leite apenas aos sábados.", {}],                                                           // calendário na alegação
    ["O Extra Dark é vegano apenas aos sábados.", {}],
    ["O Pistache contém leite de segunda a sexta.", {}],
    ["Aos domingos o Limão Siciliano não contém leite.", {}],
    ["O Extra Dark é vegano só no verão.", {}],
    ["O Pistache contém leite nos feriados.", {}],
    ["O Limão Siciliano não contém leite nesta semana.", {}],
    ["Esta opção não contém leite aos sábados.", { sabores: ["limao-siciliano"] }],
    ["O Pistache contém leite esporadicamente.", {}],                                                              // frequência dita de outros jeitos
    ["O Pistache dificilmente contém leite.", {}],
    ["O Pistache raras vezes contém leite.", {}],
    ["O Pistache contém leite com frequência.", {}],
    ["O Pistache contém leite periodicamente.", {}],
    ["Esporadicamente, esta opção contém leite.", { sabores: ["pistache"] }],
    ["O Extra Dark dificilmente é vegano.", {}],
    ["O Extra Dark é vegano esporadicamente.", {}],
    ["O Pistache era feito com leite.", {}],                                                                       // tempo que não é o de agora
    ["O Pistache será feito com leite.", {}],
    ["O Pistache vai ser feito com leite.", {}],
    ["O Limão Siciliano era sem leite.", {}],
    ["O Limão Siciliano passou a ser feito sem leite.", {}],
    ["Esta opção era feita com leite.", { sabores: ["pistache"] }],
    ["O Extra Dark era vegano.", {}],
    ["O Extra Dark será vegano.", {}],
    ["Esta opção inclui também cobertura sem leite.", { sabores: ["limao-siciliano"] }],                            // advérbio entre o verbo e o objeto
    ["O Limão Siciliano inclui ainda cobertura sem leite.", {}],
    ["O Limão Siciliano traz junto cobertura sem leite.", {}],
    ["O Extra Dark inclui também cone vegano.", {}],
    ["Esta opção inclui também cobertura; ela não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Com whey, o Shake Açaí com Banana contém leite somente aos sábados.", {}],                                   // a escolha do shake não dispensa o resto
    ["Com whey, o Shake Açaí com Banana raramente contém leite.", {}],
    ["Com whey, o Shake Açaí com Banana contém leite só se pedir com cobertura.", {}],
    ["Com whey, o Shake Açaí com Banana era feito com leite.", {}],
    ["Esta opção inclui um cone também sem leite.", { sabores: ["limao-siciliano"] }],                             // advérbio entre o nome e a alegação
    ["O Limão Siciliano vem com um cone já sem leite.", {}],
    ["O Extra Dark inclui um cone também vegano.", {}],
    ["Até o ano passado, o Extra Dark foi vegano.", {}],                                                           // vegano no passado ou no futuro
    ["O Extra Dark continuará vegano no futuro.", {}],
    ["O Extra Dark foi vegano.", {}],
    ["O Extra Dark seguirá vegano.", {}],
    ["O Extra Dark é vegano no futuro.", {}],
    ["No passado, o Extra Dark era vegano.", {}],
    ["Ela não contém leite.", { sabores: ["limao-siciliano"], anterior: "Esta opção vem com uma cobertura." }],      // o antecedente está na frase anterior e é estranho
    ["Ele não contém leite.", { sabores: ["limao-siciliano"], anterior: "O Limão Siciliano vai no cone." }],
    ["Ele não contém leite.", { sabores: ["limao-siciliano"], anterior: "Recomendo o Pistache." }],                 // o sabor da anterior é o sujeito, não o card
    ["Ela é vegana.", { sabores: ["extra-dark"], anterior: "O Extra Dark vem com uma cobertura." }],
    ["Ele é vegano.", { sabores: ["extra-dark"], anterior: "Recomendo o Pistache." }],
    ["Ela é cacau 100%.", { sabores: ["extra-dark"], anterior: "O Extra Dark vem com uma cobertura." }],
    ["Ela não contém leite.", { sabores: ["limao-siciliano"] }],                                                     // pronome solto não herda o card
    ["Esta não contém leite.", { sabores: ["limao-siciliano"] }],
    ["O Extra Dark inclui um cone de cacau 100%.", {}],                                                             // descritor preso ao nome de objeto
    ["O Extra Dark tem uma cobertura de cacau 100%.", {}],
    ["Com whey, o Shake Açaí com Banana contém leite somente se pedir com cobertura e água.", {}],                 // a água no fim não dispensa a cobertura
    ["O Limão Siciliano inclui, como cortesia, cobertura sem leite.", {}],                                          // parêntese entre o verbo e o objeto
    ["Esta opção inclui, como cortesia, cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["O Extra Dark inclui, como cortesia, cobertura vegana.", {}],
    ["O Limão Siciliano traz, de brinde, cobertura sem leite.", {}],
    ["Esta opção inclui um adicional sem leite.", { sabores: ["limao-siciliano"] }],                               // nome com forma de adjetivo é o nome
    ["Esta opção inclui um adicional vegano.", { sabores: ["extra-dark"] }],
    ["O Limão Siciliano vem com um ingrediente sem leite.", {}],
    ["O Limão Siciliano vai num recipiente sem leite.", {}],
    ["O Extra Dark vem com um acompanhante vegano.", {}],
    ["O Limão Siciliano inclui adicional sem leite.", {}],
    ["Esta opção inclui um bom adicional sem leite.", { sabores: ["limao-siciliano"] }],                           // o artigo antes do modificador
    ["O Limão Siciliano vem com um bom cone sem leite.", {}],
    ["Esta opção inclui um adicional, que não contém leite.", { sabores: ["limao-siciliano"] }],                   // relativa e pronome com o mesmo nome
    ["O Limão Siciliano inclui um adicional; ele não contém leite.", {}],
    ["O Limão Siciliano inclui cobertura; a mesma não contém leite.", { sabores: ["limao-siciliano"] }],           // anáfora nominal: "a mesma" é a cobertura
    ["O Extra Dark inclui cobertura; a mesma é vegana.", { sabores: ["extra-dark"] }],
    ["O Extra Dark inclui um cone; o mesmo é vegano.", {}],
    ["O Limão Siciliano vem com uma cobertura; esta última não contém leite.", {}],
    ["O Limão Siciliano vem com uma cobertura; a mesma também não contém leite.", {}],
    ["A mesma não contém leite.", { sabores: ["limao-siciliano"] }],
    ["O Limão Siciliano inclui, como um brinde, cobertura sem leite.", {}],                                        // parêntese com artigo
    ["Esta opção inclui, como um brinde, cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["O Extra Dark inclui, como um brinde, cobertura vegana.", {}],
    ["O Limão Siciliano inclui, como um brinde especial, cobertura sem leite.", {}],
    ["Esta opção inclui uma cobertura de chocolate sem leite.", { sabores: ["limao-siciliano"] }],                // "chocolate" no complemento não é o sabor: o núcleo é a cobertura
    ["O Extra Dark inclui uma cobertura de chocolate vegana.", {}],
    ["O Limão Siciliano vem com calda de pistache sem leite.", {}],
    ["O Limão Siciliano vai num cone de baunilha sem leite.", {}],
    ["O Limão Siciliano vem num cone feito de chocolate sem leite.", {}],
    ["O Limão Siciliano vem num cone à base de chocolate sem leite.", {}],
    ["Esta opção inclui uma cobertura de chocolate; ela não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Esta opção inclui uma cobertura de chocolate, que não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Esta opção inclui chocolate sem leite.", { sabores: ["limao-siciliano"] }],                                 // palavra de nome solta como objeto é ingrediente
    ["Pode pedir o Limão Siciliano com cobertura sem leite.", {}],
    ["O Pistache contém leite à noite.", {}],                                                                       // período do dia é restrição: a ficha vale o dia inteiro
    ["O Pistache contém leite em dias alternados.", {}],                                                           // revezamento também: nos outros dias seria o contrário
    ["O Extra Dark é vegano dia sim, dia não.", {}],
    ["O Limão Siciliano não contém leite a cada dois dias.", {}],
    ["O Pistache contém leite uma vez por semana.", {}],
    ["Dia sim, dia não, o Extra Dark é vegano.", {}],
    ["O Pistache contém leite pela manhã.", {}],
    ["O Pistache contém leite de madrugada.", {}],
    ["O Pistache contém leite ao meio-dia.", {}],
    ["O Pistache contém leite no horário do almoço.", {}],
    ["O Pistache contém leite durante o dia.", {}],
    ["Pela manhã, o Pistache contém leite.", {}],
    ["O Limão Siciliano não contém leite à noite.", {}],
    ["O Extra Dark é vegano à noite.", {}],
    ["O Extra Dark é vegano pela manhã.", {}],
    ["O Extra Dark é cacau 100% à noite.", {}],
    ["Algo que vem junto não contém leite.", { sabores: ["limao-siciliano"] }],                                    // indefinido com relativa de outra coisa é estranho
    ["Algo que acompanha o Limão Siciliano não contém leite.", {}],
    ["Algo não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Algo que vem junto é vegano.", { sabores: ["extra-dark"] }],
    ["Tudo que vem junto não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Esta opção vem com uma cobertura que certamente não contém leite.", { sabores: ["limao-siciliano"] }],       // advérbio dentro da relativa não solta o antecedente
    ["O Extra Dark vem com um cone que certamente é vegano.", {}],
    ["O Limão Siciliano vem com uma cobertura; ela certamente não contém leite.", {}],
    ["Esta opção inclui cobertura e cone sem leite.", { sabores: ["limao-siciliano"] }],                            // coordenação de objetos sem artigo
    ["Esta opção inclui cobertura e cone vegano.", { sabores: ["extra-dark"] }],
    ["O Limão Siciliano vem com cone e cobertura sem leite.", {}],
    ["Incluímos cobertura sem leite.", { sabores: ["limao-siciliano"] }],                                          // verbo de objeto na primeira pessoa do plural e no gerúndio
    ["Incluímos cobertura vegana.", { sabores: ["extra-dark"] }],
    ["Trazemos calda sem leite.", { sabores: ["limao-siciliano"] }],
    ["O Limão Siciliano vem incluindo cobertura sem leite.", {}],
    ["Incluo cobertura sem leite.", { sabores: ["limao-siciliano"] }],                                             // primeira pessoa do singular
    ["Ofereço cobertura vegana.", { sabores: ["extra-dark"] }],
    ["Esta opção vem com uma cobertura que com certeza não contém leite.", { sabores: ["limao-siciliano"] }],      // locução adverbial entre o "que" e a alegação
    ["O Extra Dark vem com uma cobertura que sem dúvida é vegana.", {}],
    ["O Limão Siciliano vem com uma cobertura que, na verdade, não contém leite.", {}],
    ["O Limão Siciliano vem com uma cobertura; ela, sem dúvida, não contém leite.", {}],
    ["No pedido, não contém leite.", { sabores: ["limao-siciliano"] }],                                            // tópico neutro recipiente da composição é estranho
    ["No seu pedido, não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Na loja, não contém leite.", { sabores: ["limao-siciliano"] }],
    ["No pedido, é vegano.", { sabores: ["extra-dark"] }],
    ["Fornecemos cobertura sem leite.", { sabores: ["limao-siciliano"] }],                                         // "fornecer" e outros verbos de objeto
    ["Esta opção fornece cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["Providenciamos cobertura sem leite.", { sabores: ["limao-siciliano"] }],                                     // verbo pela forma (-amos)
    ["Preparou cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["Esta opção inclui cobertura e também cone sem leite.", { sabores: ["limao-siciliano"] }],                    // advérbio entre o "e" e o segundo objeto
    ["Esta opção inclui cobertura e também cone vegano.", { sabores: ["extra-dark"] }],
    ["O pedido desta opção não contém leite.", { sabores: ["limao-siciliano"] }],                                 // complemento depois do nome neutro
    ["O pedido do Extra Dark é vegano.", {}],
    ["O pedido com cobertura não contém leite.", { sabores: ["limao-siciliano"] }],
    ["O pedido dela é vegano.", { sabores: ["extra-dark"] }],
    ["No pedido desta opção não vai leite.", { sabores: ["limao-siciliano"] }],                                   // tópico com complemento contraído
    ["Cobertura artesanal não contém leite.", { sabores: ["limao-siciliano"] }],                                  // nome solto com adjetivo posposto
    ["Cone artesanal é vegano.", { sabores: ["extra-dark"] }],
    ["Cone crocante de chocolate não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Casquinha artesanal da casa é vegana.", { sabores: ["extra-dark"] }],
    ["Cone sem leite acompanha esta opção.", { sabores: ["limao-siciliano"] }],                                   // "sem" + alérgeno depois do nome solto é a alegação
    ["Cobertura artesanal sem leite.", { sabores: ["limao-siciliano"] }],
    ["É fornecida cobertura sem leite.", { sabores: ["limao-siciliano"] }],                                       // passiva com sujeito posposto sem artigo
    ["É servido cone sem leite.", { sabores: ["limao-siciliano"] }],
    ["É servido cone vegano.", { sabores: ["extra-dark"] }],
    ["É vegano cone.", { sabores: ["extra-dark"] }],
    ["Vem cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["Há cone sem leite.", { sabores: ["limao-siciliano"] }],
    ["Adicione cobertura sem leite.", { sabores: ["limao-siciliano"] }],                                          // imperativo de verbo de objeto
    ["Forneça cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["Sirva cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["Coloque cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["Adicione cone vegano.", { sabores: ["extra-dark"] }],
    ["Contém pecã.", { sabores: ["limao-siciliano"] }],                                                           // "pecã" continua castanha
    ["Leva PECÃ.", { sabores: ["limao-siciliano"] }],
    ["Pode ser incluída cobertura sem leite.", { sabores: ["limao-siciliano"] }],                                 // passiva depois de modal, sujeito posposto sem artigo
    ["Pode ser incluída cobertura vegana.", { sabores: ["extra-dark"] }],
    ["Deve ser servido cone vegano.", { sabores: ["extra-dark"] }],
    ["Costuma ser servida cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["Pode vir cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["Poderá ser incluída cobertura sem leite.", { sabores: ["limao-siciliano"] }],                               // modal no futuro e no imperfeito
    ["Deverá ser incluída cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["Poderá ser incluída cobertura vegana.", { sabores: ["extra-dark"] }],
    ["Costumava ser servida cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["Tal cobertura não contém leite.", { sabores: ["limao-siciliano"] }],                                        // "tal" é determinante
    ["Tal cobertura é vegana.", { sabores: ["extra-dark"] }],
    ["Tais coberturas não contêm leite.", { sabores: ["limao-siciliano"] }],
    ["Referida cobertura não contém leite.", { sabores: ["limao-siciliano"] }],                                   // modificador sem artigo antes do nome
    ["Citada cobertura é vegana.", { sabores: ["extra-dark"] }],
    ["Inclui tal cobertura sem leite.", { sabores: ["limao-siciliano"] }],
    ["Cobertura acompanha esta opção e não contém leite.", { sabores: ["limao-siciliano"] }],                      // nome solto + verbo de objeto é sujeito
    ["Cone acompanha esta opção e é vegano.", { sabores: ["extra-dark"] }],
    ["Cobertura vem junto e não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Cobertura artesanal acompanha esta opção e não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Complemento não contém leite.", { sabores: ["limao-siciliano"] }],                                          // "complemento" é nome, não "eu complemento"
    ["Complemento é vegano.", { sabores: ["extra-dark"] }],
    ["Complemento: não contém leite.", { sabores: ["limao-siciliano"] }],
    ["Complemento acompanha esta opção e não contém leite.", { sabores: ["limao-siciliano"] }],
    ["O Pistache é plant-based.", {}],                                                                             // "plant-based" com hífen
    ["Esta opção é plant-based.", { sabores: ["limao-siciliano"] }],
    ["Esta opção inclui tanto cobertura quanto cone sem leite.", { sabores: ["limao-siciliano"] }],                // coordenação correlativa do objeto
    ["Esta opção inclui tanto cobertura quanto cone vegano.", { sabores: ["extra-dark"] }],
    ["Esta opção inclui cobertura bem como cone sem leite.", { sabores: ["limao-siciliano"] }],
    ["Esta opção inclui cobertura, assim como cone sem leite.", { sabores: ["limao-siciliano"] }],
  ]) assert.equal(fraseSegura(f, N, ctx), false, "passou: " + f);
  // Horário e "funcionando" com o bloco de lojas; "o pedido online mostra" sem a ferramenta.
  const lojas = { lojas: { tipo: "lojas", lojas: [{ id: "praia-do-canto", aberta: true, hoje: "10h às 19h", abre: null, fecha_as: "19h" }, { id: "jardim-camburi", aberta: false, hoje: "fechada hoje", abre: "amanhã às 11h", fecha_as: null }], entrega: null } };
  for (const f of ["A Praia do Canto está aberta agora e fecha às 19h.", "A Jardim Camburi está fechada hoje; abre amanhã às 11h.", "A Praia do Canto está funcionando agora."])
    assert.equal(fraseSegura(f, N, lojas), true, "barrou: " + f);
  for (const f of ["A Praia do Canto fecha às 20h.", "A Jardim Camburi abre amanhã às 10h.", "A Jardim Camburi está funcionando agora.",
    "A Praia do Canto abre às 10h e reabre às 19h."])                          // "reabre" é abertura, e o card não tem abertura às 19h
    assert.equal(fraseSegura(f, N, lojas), false, "passou: " + f);
  assert.equal(fraseSegura("A Praia do Canto abre às 10h e fecha às 19h.", N, lojas), true);
  // Com o card de lojas, só algarismo dentro de um horário completo escapa da política de número.
  for (const f of ["Preço:50 reais.", "Proteína:20 g.", "São 6 litros de gelato.", "Na Praia do Canto, seu pedido fica pronto às 10h.",
    "A Praia do Canto abre às 10h; seu pedido fica pronto às 19h."]) assert.equal(fraseSegura(f, N, lojas), false, "passou: " + f);   // a pista "abre" é de outra oração
  assert.equal(fraseSegura("Horário da Praia do Canto: das 10h às 19h.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto fecha às 19:00.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto não fecha às 19h.", N, lojas), false, "o contrário do card passou");
  // Duas lojas coordenadas por "e" são um sujeito só: o horário tem de valer para as duas.
  const duas = (praia, jardim) => ({ lojas: { tipo: "lojas", lojas: [{ id: "praia-do-canto", aberta: true, hoje: praia, abre: null, fecha_as: praia.split(" às ")[1] }, { id: "jardim-camburi", aberta: true, hoje: jardim, abre: null, fecha_as: jardim.split(" às ")[1] }], entrega: null } });
  assert.equal(fraseSegura("A Praia do Canto e a Jardim Camburi abrem às 10h.", N, duas("11h às 19h", "10h às 19h")), false, "a primeira loja abre às 11h");
  assert.equal(fraseSegura("A Praia do Canto e a Jardim Camburi abrem às 10h.", N, duas("10h às 19h", "10h às 19h")), true);
  assert.equal(fraseSegura("A Praia do Canto abre às 10h e a Jardim Camburi abre às 11h.", N, duas("10h às 19h", "11h às 19h")), true);
  assert.equal(fraseSegura("A Praia do Canto abre às 10h e a Jardim Camburi abre às 11h.", N, duas("10h às 19h", "10h às 19h")), false);
  // Sujeito genérico ("as lojas", "abrimos") é todas as lojas, mesmo com outra oração nomeando uma.
  assert.equal(fraseSegura("As lojas abrem às 10h; a Praia do Canto está aberta agora.", N, duas("10h às 19h", "11h às 19h")), false, "a Jardim Camburi abre às 11h");
  assert.equal(fraseSegura("As lojas abrem às 10h; a Praia do Canto está aberta agora.", N, duas("10h às 19h", "10h às 19h")), true);
  assert.equal(fraseSegura("Abrimos às 10h; a Praia do Canto está aberta agora.", N, duas("10h às 19h", "11h às 19h")), false);
  assert.equal(fraseSegura("As lojas estão abertas; a Praia do Canto fecha às 19h.", N, lojas), false, "a Jardim Camburi está fechada");
  assert.equal(fraseSegura("A Praia do Canto está aberta agora; abre às 10h.", N, duas("10h às 19h", "11h às 19h")), true, "sem sujeito, a oração fala da loja citada");
  // Negação junto do predicado de status: "não só está aberta" e "não tem fila e está aberta" afirmam.
  assert.equal(fraseSegura("A Praia do Canto não só está aberta agora.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi não só está aberta agora.", N, lojas), false, "'não só' afirma, e a Jardim Camburi está fechada");
  assert.equal(fraseSegura("A Jardim Camburi não tem fila e está aberta agora.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto não tem fila e está aberta agora.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi não está aberta agora.", N, lojas), true);
  assert.equal(fraseSegura("Nenhuma loja está aberta agora.", N, lojas), false, "a Praia do Canto está aberta");
  const todasFechadas = { lojas: { tipo: "lojas", lojas: [{ id: "praia-do-canto", aberta: false, hoje: "fechada hoje", abre: "amanhã às 10h", fecha_as: null }, { id: "jardim-camburi", aberta: false, hoje: "fechada hoje", abre: "amanhã às 11h", fecha_as: null }], entrega: null } };
  assert.equal(fraseSegura("Nenhuma loja está aberta agora.", N, todasFechadas), true);
  assert.equal(fraseSegura("A Praia do Canto não está mais aberta.", N, todasFechadas), true);
  // "Horário" sozinho não é pista de horário de loja.
  assert.equal(fraseSegura("O horário de retirada na Praia do Canto é às 10h.", N, lojas), false, "'horário de retirada' não é horário de loja");
  assert.equal(fraseSegura("O horário de funcionamento da Praia do Canto é das 10h às 19h.", N, lojas), true);
  assert.equal(fraseSegura("O horário da Praia do Canto é 10h às 19h.", N, lojas), true);
  assert.equal(fraseSegura("Nosso horário hoje é das 10h às 19h.", N, lojas), false, "a Jardim Camburi está fechada hoje");
  assert.equal(fraseSegura("A Jardim Camburi de forma alguma está aberta agora.", N, lojas), true, "negação idiomática nega");
  assert.equal(fraseSegura("A Praia do Canto de forma alguma está aberta agora.", N, lojas), false);
  // "A outra loja" é a que a frase não nomeou; "a outra também/não" ecoa o status anterior.
  assert.equal(fraseSegura("A Praia do Canto está aberta agora; a outra loja abre às 10h.", N, duas("10h às 19h", "11h às 19h")), false, "'a outra loja' é a Jardim Camburi, que abre às 11h");
  assert.equal(fraseSegura("A Praia do Canto está aberta agora; a outra loja abre às 11h.", N, duas("10h às 19h", "11h às 19h")), true);
  assert.equal(fraseSegura("A Praia do Canto está aberta agora; a outra está fechada.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi está fechada hoje; a outra abre às 10h.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi está fechada hoje; a outra também.", N, lojas), false, "a Praia do Canto está aberta");
  assert.equal(fraseSegura("A Jardim Camburi está fechada hoje; a outra não.", N, lojas), true);
  // "Nenhuma loja" também nega o horário.
  assert.equal(fraseSegura("Nenhuma loja abre às 10h.", N, duas("10h às 19h", "10h às 19h")), false, "'nenhuma' nega o horário");
  assert.equal(fraseSegura("Nenhuma das lojas fecha às 19h.", N, duas("10h às 19h", "10h às 19h")), false);
  assert.equal(fraseSegura("Nenhuma loja abre amanhã.", N, lojas), false, "a Jardim Camburi abre amanhã");
  // Entrega: cada pista confere o próprio campo com a própria polaridade.
  const LOJAS_IDS = ["praia-do-canto", "jardim-camburi"];
  const entrega = (entregando, gratis) => ({ lojas: { tipo: "lojas", lojas: LOJAS_IDS.map((id) => ({ id, aberta: true, hoje: "10h às 19h", abre: null, fecha_as: "19h" })), entrega: LOJAS_IDS.map((id) => ({ id, oferece_entrega: true, entregando_agora: entregando, gratis })) } });
  assert.equal(fraseSegura("A entrega não é grátis e está disponível agora.", N, entrega(false, false)), false, "a disponibilidade também confere");
  assert.equal(fraseSegura("A entrega não é grátis e não está disponível agora.", N, entrega(false, false)), true);
  assert.equal(fraseSegura("A entrega não é grátis agora.", N, entrega(true, false)), true, "'agora' junto de 'grátis' é só tempo");
  assert.equal(fraseSegura("A entrega é grátis agora.", N, entrega(true, false)), false);
  assert.equal(fraseSegura("A entrega está disponível agora.", N, entrega(false, false)), false);
  // Oração coordenada sem repetir "entrega" herda a entrega da anterior.
  assert.equal(fraseSegura("A entrega está disponível agora, mas é grátis.", N, entrega(true, false)), false, "o grátis depois do 'mas' herda a entrega");
  assert.equal(fraseSegura("A entrega está disponível agora, mas não é grátis.", N, entrega(true, false)), true);
  assert.equal(fraseSegura("Estamos entregando agora, mas sem taxa.", N, entrega(true, false)), false);
  assert.equal(fraseSegura("A entrega está disponível agora, mas é grátis.", N, entrega(true, true)), true);
  // Grátis dito de outro jeito e cobrança dita confere com o mesmo campo do totem.
  assert.equal(fraseSegura("A entrega está sem custo agora.", N, entrega(true, false)), false, "'sem custo' é grátis");
  assert.equal(fraseSegura("A entrega está sem custo agora.", N, entrega(true, true)), true);
  assert.equal(fraseSegura("A entrega é de graça agora.", N, entrega(true, false)), false);
  assert.equal(fraseSegura("A entrega fica por nossa conta agora.", N, entrega(true, false)), false);
  assert.equal(fraseSegura("A entrega está disponível agora, mas sem custo.", N, entrega(true, false)), false);
  assert.equal(fraseSegura("A entrega tem taxa agora.", N, entrega(true, true)), false, "'tem taxa' com o totem grátis sai");
  assert.equal(fraseSegura("A entrega tem taxa agora.", N, entrega(true, false)), true);
  assert.equal(fraseSegura("Não cobramos frete agora.", N, entrega(true, false)), false);
  assert.equal(fraseSegura("Não cobramos frete agora.", N, entrega(true, true)), true);
  // Indisponibilidade dita e cessação conferem com a entrega do totem.
  assert.equal(fraseSegura("A entrega está indisponível agora.", N, entrega(true, false)), false, "'indisponível' nega a entrega");
  assert.equal(fraseSegura("A entrega está indisponível agora.", N, entrega(false, false)), true);
  assert.equal(fraseSegura("A entrega está suspensa agora.", N, entrega(true, false)), false);
  assert.equal(fraseSegura("A entrega deixou de estar disponível.", N, entrega(true, false)), false);
  assert.equal(fraseSegura("A entrega não deixou de estar disponível.", N, entrega(true, false)), true);
  assert.equal(fraseSegura("A entrega está indisponível agora.", N, {}), false, "sem a ferramenta, indisponível também sai");
  // Entrega sem loja nomeada na oração vale para todas as lojas; âncora ("dela") prende à loja da frase.
  const entregaMista = { lojas: { tipo: "lojas", lojas: LOJAS_IDS.map((id) => ({ id, aberta: true, hoje: "10h às 19h", abre: null, fecha_as: "19h" })), entrega: [{ id: "praia-do-canto", oferece_entrega: true, entregando_agora: true, gratis: false }, { id: "jardim-camburi", oferece_entrega: true, entregando_agora: false, gratis: false }] } };
  assert.equal(fraseSegura("As entregas estão disponíveis agora; a Praia do Canto está aberta.", N, entregaMista), false, "a Jardim Camburi não está entregando");
  assert.equal(fraseSegura("A Praia do Canto está aberta e entregando agora.", N, entregaMista), true);
  assert.equal(fraseSegura("A Praia do Canto está aberta; a entrega dela está disponível agora.", N, entregaMista), true);
  // A pista depois da hora não atravessa vírgula/subordinada; modal entre a negação e o verbo nega.
  assert.equal(fraseSegura("Seu pedido na Praia do Canto fica pronto às 10h, quando a loja abre.", N, lojas), false, "o 'abre' da subordinada não governa o 10h");
  assert.equal(fraseSegura("Horário da Praia do Canto: 10h às 19h.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto abre às 10h, quando a cidade acorda.", N, lojas), true);
  assert.equal(fraseSegura("Hoje a Praia do Canto não irá abrir às 10h.", N, lojas), false, "'não irá abrir' nega");
  assert.equal(fraseSegura("A Praia do Canto não pretende abrir às 10h.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto não vai conseguir abrir às 10h.", N, lojas), false);
  // Hora por extenso vira algarismo e confere como ele, só com contexto de horário.
  assert.equal(fraseSegura("A Praia do Canto abre ao meio-dia.", N, lojas), false, "meio-dia é 12h");
  assert.equal(fraseSegura("A Praia do Canto fecha à meia-noite.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto abre às onze.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto abre às nove e meia.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto abre às dez.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto abre às dez e fecha às sete da noite.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto abre às onze.", N, {}), false, "sem o card, hora por extenso é número como outro qualquer");
  assert.equal(fraseSegura("Para um evento ao meio-dia, sugiro a caixa térmica.", N, {}), true, "sem contexto de horário fica como está");
  // A pista antes da hora também para no subordinador; vírgula + coordenação mantém a elipse de loja.
  assert.equal(fraseSegura("A Praia do Canto abre quando seu pedido fica pronto às 10h.", N, lojas), false, "o 'abre' antes do 'quando' não governa o 10h");
  assert.equal(fraseSegura("A Praia do Canto avisa que abre às 10h.", N, lojas), true);
  assert.equal(fraseSegura("Hoje, a Praia do Canto abre às 10h.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto abre às 10h e fecha às 19h.", N, lojas), true);
  // "Atendendo", "em funcionamento" dizem aberta; cessação nega o status e o horário.
  assert.equal(fraseSegura("A Jardim Camburi está atendendo agora.", N, todasFechadas), false, "'atendendo' é aberta");
  assert.equal(fraseSegura("A Jardim Camburi está em funcionamento agora.", N, todasFechadas), false);
  assert.equal(fraseSegura("A Praia do Canto está atendendo agora.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi está atendendo agora.", N, {}), false, "sem a ferramenta, status sai");
  assert.equal(fraseSegura("A Praia do Canto deixou de estar aberta.", N, lojas), false, "cessação nega o status");
  assert.equal(fraseSegura("A Praia do Canto não deixou de estar aberta.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto deixou de abrir às 10h.", N, lojas), false, "cessação nega o horário");
  // Período que a ferramenta não cobre não se confere com o bloco de hoje.
  assert.equal(fraseSegura("A Praia do Canto abriu ontem às 10h.", N, lojas), false, "'ontem' não é coberto pela ferramenta");
  assert.equal(fraseSegura("Ontem a Praia do Canto fechou às 19h.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto estava aberta ontem.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto abre às 10h na semana que vem.", N, lojas), false);
  assert.equal(fraseSegura("No feriado a Praia do Canto abre às 10h.", N, lojas), false);
  assert.equal(fraseSegura("Hoje a Praia do Canto abriu às 10h.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto abre daqui a dois dias às 10h.", N, lojas), false, "período relativo não é coberto");
  assert.equal(fraseSegura("A Praia do Canto abre todos os dias às 10h.", N, lojas), false, "hábito não é coberto");
  assert.equal(fraseSegura("A Praia do Canto costuma abrir às 10h.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto fecha daqui a pouco, às 19h.", N, lojas), true);
  // Parcial, cardinal e exclusiva no status e no horário das lojas.
  assert.equal(fraseSegura("Nem todas as lojas estão abertas agora.", N, lojas), true, "uma aberta e uma fechada: 'nem todas' é verdade");
  assert.equal(fraseSegura("Nem todas as lojas estão abertas agora.", N, duas("10h às 19h", "11h às 19h")), false, "as duas abertas: 'nem todas' é falso");
  assert.equal(fraseSegura("Nem todas as lojas estão abertas agora.", N, todasFechadas), false);
  assert.equal(fraseSegura("Só uma das lojas está aberta agora.", N, lojas), true);
  assert.equal(fraseSegura("Só uma das lojas está aberta agora.", N, duas("10h às 19h", "11h às 19h")), false);
  assert.equal(fraseSegura("Exatamente duas lojas estão abertas agora.", N, duas("10h às 19h", "11h às 19h")), true, "contagem exata igual ao total é verdade");
  assert.equal(fraseSegura("Exatamente duas lojas estão abertas agora.", N, lojas), false);
  assert.equal(fraseSegura("Exatamente uma loja está aberta agora.", N, lojas), true);
  assert.equal(fraseSegura("Só duas lojas estão abertas agora.", N, duas("10h às 19h", "11h às 19h")), false, "'só' pede sobra");
  assert.equal(fraseSegura("Metade das lojas está aberta agora.", N, lojas), true, "proporção no status");
  assert.equal(fraseSegura("Metade das lojas está aberta agora.", N, duas("10h às 19h", "11h às 19h")), false);
  // Futuro ou modal sem data só confere com a próxima abertura do bloco.
  const fechadaHoje = { lojas: { tipo: "lojas", lojas: [{ id: "praia-do-canto", aberta: false, hoje: "10h às 19h", abre: "hoje às 10h", fecha_as: null }, { id: "jardim-camburi", aberta: false, hoje: "fechada hoje", abre: "amanhã às 11h", fecha_as: null }], entrega: null } };
  assert.equal(fraseSegura("A Praia do Canto abrirá às 10h.", N, lojas), false, "loja já aberta: o horário de hoje não sustenta abertura futura");
  assert.equal(fraseSegura("A Praia do Canto vai abrir às 10h.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto pode abrir às 10h.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto vai abrir às 10h.", N, fechadaHoje), true, "abre hoje às 10h: a abertura futura é a do bloco");
  assert.equal(fraseSegura("A Praia do Canto vai abrir às 11h.", N, fechadaHoje), false);
  assert.equal(fraseSegura("A Jardim Camburi vai abrir amanhã às 11h.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto vai fechar às 19h.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto vai fechar às 20h.", N, lojas), false);
  assert.equal(fraseSegura("Só a Praia do Canto está aberta agora.", N, lojas), true);
  assert.equal(fraseSegura("Só a Praia do Canto está aberta agora.", N, duas("10h às 19h", "11h às 19h")), false);
  assert.equal(fraseSegura("No máximo uma das lojas está aberta agora.", N, lojas), true);
  assert.equal(fraseSegura("No máximo uma das lojas está aberta agora.", N, duas("10h às 19h", "11h às 19h")), false);
  assert.equal(fraseSegura("É falso que a Praia do Canto esteja aberta agora.", N, lojas), false, "a falsidade nega o status");
  assert.equal(fraseSegura("É falso que a Praia do Canto abra às 10h.", N, lojas), false);
  assert.equal(fraseSegura("É falso que a entrega esteja disponível agora.", N, entrega(true, false)), false);
  // Dia da semana depois da hora, com "na": confere com a próxima abertura.
  assert.equal(fraseSegura("A Jardim Camburi abre às 8h na segunda-feira.", N, todasFechadas), false, "o dia depois da hora conta");
  assert.equal(fraseSegura("A Jardim Camburi abre às 11h amanhã.", N, todasFechadas), true);
  assert.equal(fraseSegura("Nem todas as lojas abrem às 10h.", N, duas("10h às 19h", "11h às 19h")), true);
  assert.equal(fraseSegura("Só a Praia do Canto abre às 10h.", N, duas("10h às 19h", "11h às 19h")), true);
  assert.equal(fraseSegura("Só a Praia do Canto abre às 10h.", N, duas("10h às 19h", "10h às 19h")), false);
  // Oração coordenada precisa da própria pista de horário; a elipse de loja herda o verbo.
  assert.equal(fraseSegura("A Praia do Canto abre às 10h, e seu pedido fica pronto às 19h.", N, lojas), false, "a coordenada não empresta o 'abre'");
  assert.equal(fraseSegura("A Praia do Canto abre às 10h e seu pedido fica pronto às 19h.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto funciona entre 10h e 19h.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto abre às 10h e a Jardim Camburi às 11h.", N, duas("10h às 19h", "11h às 19h")), true, "elipse de loja herda o verbo");
  assert.equal(fraseSegura("Sem dados de entrega agora: o pedido online mostra na hora se está disponível.", N), true);
  assert.equal(fraseSegura("A Praia do Canto fecha às 19h.", N), false, "horário sem o card de lojas");
  // Hora E minuto: com o card dizendo 19h45, "19:59" e "19h" saem.
  const meia = { lojas: { tipo: "lojas", lojas: [{ id: "praia-do-canto", aberta: true, hoje: "10h30 às 19h45", abre: null, fecha_as: "19h45" }], entrega: null } };
  for (const f of ["A Praia do Canto fecha às 19h45.", "A Praia do Canto fecha às 19:45.", "A Praia do Canto abre às 10h30 e fecha às 19h45."]) assert.equal(fraseSegura(f, N, meia), true, "barrou: " + f);
  for (const f of ["A Praia do Canto fecha às 19:59.", "A Praia do Canto fecha às 19h.", "A Praia do Canto abre às 10h."]) assert.equal(fraseSegura(f, N, meia), false, "passou: " + f);
  // Papel certo: 19h45 é fechamento, 10h30 é abertura.
  for (const f of ["A Praia do Canto abre às 19h45.", "A Praia do Canto fecha às 10h30.", "A Praia do Canto fica aberta até as 10h30."]) assert.equal(fraseSegura(f, N, meia), false, "passou: " + f);
  for (const f of ["A Praia do Canto funciona das 10h30 às 19h45.", "A Praia do Canto fica aberta até as 19h45.", "Hoje a Praia do Canto abre às 10h30 e fecha às 19h45."]) assert.equal(fraseSegura(f, N, meia), true, "barrou: " + f);
  // Dia certo: hora com "amanhã" ou dia da semana só confere com a próxima abertura do bloco, no dia dela.
  const fechada = (abre, hoje = "10h às 19h") => ({ lojas: { tipo: "lojas", lojas: [{ id: "jardim-camburi", aberta: false, hoje, abre, fecha_as: null }], entrega: null } });
  for (const [f, b] of [
    ["A Jardim Camburi abre amanhã às 8h.", fechada("amanhã às 8h")], ["A Jardim Camburi abre às 8h.", fechada("amanhã às 8h")],
    ["A Jardim Camburi fechou às 19h; abre amanhã às 8h.", fechada("amanhã às 8h")], ["A Jardim Camburi abriu hoje às 10h e fechou às 19h.", fechada("amanhã às 8h")],
    ["A Jardim Camburi abre hoje às 10h.", fechada("hoje às 10h")], ["A Jardim Camburi abre na segunda-feira, às 11h.", fechada("segunda às 11h", "fechada hoje")],
    ["A Jardim Camburi abre às 11h de amanhã.", fechada("amanhã às 11h", "fechada hoje")],
  ]) assert.equal(fraseSegura(f, N, b), true, "barrou: " + f);
  for (const [f, b] of [
    ["A Jardim Camburi abre amanhã às 10h.", fechada("amanhã às 8h")],            // 10h é o horário de hoje, não o de amanhã
    ["A Jardim Camburi abre segunda às 8h.", fechada("amanhã às 8h")],            // dia errado
    ["Amanhã a Jardim Camburi fecha às 19h.", fechada("amanhã às 8h")],           // o bloco não diz o fechamento de amanhã
    ["A Jardim Camburi abre amanhã às 10h.", fechada("hoje às 10h")],
    ["A Jardim Camburi abre amanhã.", fechada("segunda às 11h", "fechada hoje")], // sem hora, o dia também tem de bater
    ["A Jardim Camburi abre às 10h de amanhã.", fechada("amanhã às 11h", "fechada hoje")],
    ["A Jardim Camburi não abre amanhã às 8h.", fechada("amanhã às 8h")],         // o contrário do card
    ["A Jardim Camburi não abre amanhã.", fechada("amanhã às 8h")],
    ["Amanhã a Jardim Camburi não abre.", fechada("amanhã às 8h")],
  ]) assert.equal(fraseSegura(f, N, b), false, "passou: " + f);
  // Descritor com número do catálogo só no sabor que o tem.
  assert.equal(fraseSegura("O Pistache é cacau 100%.", N), false, "cacau 100% é do Extra Dark, não do Pistache");
  assert.equal(fraseSegura("O Extra Dark é cacau intenso 100%.", N), true);
  assert.equal(fraseSegura("Temos opções com cacau 100%.", N, { sabores: ["extra-dark"] }), true);
  assert.equal(fraseSegura("Temos opções com cacau 100%.", N), false, "sem sabor nem card");
  // Exceção com cards: o "todos" é o resto dos cards, não só a exceção; sem card nem linha, não há o que conferir.
  assert.equal(fraseSegura("Todos têm leite, menos o Limão Siciliano.", N, { sabores: ["limao-siciliano", "maracuja"] }), false, "Maracujá também não tem leite");
  assert.equal(fraseSegura("Todos têm leite, menos o Limão Siciliano e o Maracujá.", N, { sabores: ["limao-siciliano", "maracuja", "pistache"] }), true);
  assert.equal(fraseSegura("Todos têm leite, menos o Limão Siciliano.", N), false, "sem card e sem linha: 'todos' não se confere");
  assert.equal(fraseSegura("Todos os gelatos têm leite, menos o Limão Siciliano.", N), false, "Maracujá e Extra Dark também não têm");
  // Condição com dois alérgicos: os dois entram na afirmação.
  assert.equal(fraseSegura("Estas opções servem para alérgicos a amendoim e leite.", N, { sabores: ["morango"] }), false, "Morango tem leite");
  assert.equal(fraseSegura("Estas opções servem para alérgicos a amendoim e leite.", N, { sabores: ["limao-siciliano"] }), true);
  // Oferta de entrega confere com oferece_entrega; "só retirada" e "sem entrega" com entregando_agora.
  const oferta = (praia, jardim) => ({ lojas: { tipo: "lojas", lojas: LOJAS_IDS.map((id) => ({ id, aberta: true, hoje: "10h às 19h", abre: null, fecha_as: "19h" })), entrega: [{ id: "praia-do-canto", ...praia }, { id: "jardim-camburi", ...jardim }] } });
  const SIM = { oferece_entrega: true, entregando_agora: true, gratis: true }, NAO = { oferece_entrega: false, entregando_agora: false, gratis: false }, FORA = { oferece_entrega: true, entregando_agora: false, gratis: false };
  assert.equal(fraseSegura("A Praia do Canto oferece entrega.", N, oferta(NAO, NAO)), false, "'oferece entrega' confere com o totem");
  assert.equal(fraseSegura("A Praia do Canto oferece entrega.", N, oferta(SIM, SIM)), true);
  assert.equal(fraseSegura("A Praia do Canto oferece entrega.", N, {}), false, "sem a ferramenta, a oferta sai");
  assert.equal(fraseSegura("A Praia do Canto oferece entrega.", N, lojas), false, "bloco sem entrega: a oferta sai");
  assert.equal(fraseSegura("A Praia do Canto não oferece entrega.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("A Jardim Camburi não faz entrega, só retirada.", N, oferta(SIM, NAO)), true);
  assert.equal(fraseSegura("As duas lojas oferecem entrega.", N, oferta(SIM, NAO)), false);
  assert.equal(fraseSegura("Só a Praia do Canto oferece entrega.", N, oferta(SIM, NAO)), true);
  assert.equal(fraseSegura("Só a Praia do Canto oferece entrega.", N, oferta(SIM, SIM)), false, "a Jardim Camburi também oferece");
  assert.equal(fraseSegura("Temos delivery nas duas lojas.", N, oferta(SIM, NAO)), false);
  assert.equal(fraseSegura("Entregamos nas duas lojas.", N, oferta(SIM, NAO)), false);
  assert.equal(fraseSegura("A Jardim Camburi entrega em casa.", N, oferta(SIM, NAO)), false);
  assert.equal(fraseSegura("A Praia do Canto oferece entrega, mas não está entregando agora.", N, oferta(FORA, FORA)), true);
  assert.equal(fraseSegura("A Jardim Camburi oferece entrega, mas não está entregando agora.", N, oferta(SIM, FORA)), true, "depois do 'mas' o sujeito é a loja da oração anterior");
  assert.equal(fraseSegura("A Jardim Camburi não tem entrega agora.", N, oferta(FORA, FORA)), true, "oferta negada só de agora é entregando_agora");
  assert.equal(fraseSegura("A Jardim Camburi não tem entrega agora.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("Na Jardim Camburi é só retirada.", N, oferta(SIM, FORA)), true);
  assert.equal(fraseSegura("Na Jardim Camburi é só retirada.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("A Jardim Camburi está sem entrega.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("Não tem taxa de entrega agora.", N, oferta(SIM, SIM)), true, "'não tem taxa' nega a taxa, não a oferta");
  assert.equal(fraseSegura("Não tem entrega grátis agora.", N, oferta({ ...SIM, gratis: false }, { ...SIM, gratis: false })), true);
  assert.equal(fraseSegura("Não cobramos a entrega agora.", N, oferta(SIM, SIM)), true);
  assert.equal(fraseSegura("Não cobramos a entrega agora.", N, oferta({ ...SIM, gratis: false }, { ...SIM, gratis: false })), false);
  // Período que o bloco não cobre também vale para a entrega; status em outro dia idem.
  assert.equal(fraseSegura("A entrega será grátis amanhã.", N, oferta(SIM, SIM)), false, "'amanhã' não é coberto");
  assert.equal(fraseSegura("A entrega foi grátis ontem.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("A entrega é grátis todos os dias.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("A entrega será grátis.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("A entrega estará disponível no sábado.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("A entrega é grátis hoje.", N, oferta(SIM, SIM)), true);
  assert.equal(fraseSegura("A entrega está disponível agora e é grátis.", N, oferta(SIM, SIM)), true);
  assert.equal(fraseSegura("A Praia do Canto estará aberta amanhã.", N, oferta(SIM, SIM)), false, "status em outro dia não se confere");
  assert.equal(fraseSegura("A Praia do Canto estará fechada amanhã.", N, todasFechadas), false);
  assert.equal(fraseSegura("A Jardim Camburi está fechada hoje e abre amanhã às 11h.", N, lojas), true);
  // Entrega paga dita sem o nome da taxa confere com o grátis; sem o bloco, sai.
  assert.equal(fraseSegura("A entrega é paga.", N, oferta(SIM, SIM)), false, "'é paga' com o totem grátis sai");
  assert.equal(fraseSegura("A entrega é paga.", N, oferta({ ...SIM, gratis: false }, { ...SIM, gratis: false })), true);
  assert.equal(fraseSegura("A entrega é paga.", N, {}), false, "sem a ferramenta, cobrança sai");
  assert.equal(fraseSegura("A entrega é de graça.", N, {}), false, "sem a ferramenta, grátis dito de outro jeito sai");
  assert.equal(fraseSegura("O frete é cortesia.", N, {}), false);
  assert.equal(fraseSegura("A entrega sai por conta da casa.", N, {}), false);
  assert.equal(fraseSegura("A entrega é de graça.", N, oferta(SIM, SIM)), true);
  assert.equal(fraseSegura("O frete é cortesia.", N, oferta({ ...SIM, gratis: false }, { ...SIM, gratis: false })), false);
  assert.equal(fraseSegura("O orçamento do evento sai por nossa conta.", N, {}), true, "sem entrega na oração não é promessa de frete");
  assert.equal(fraseSegura("O delivery é pago.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("A entrega tem cobrança.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("A entrega não é paga.", N, oferta(SIM, SIM)), true);
  assert.equal(fraseSegura("A entrega é cobrada à parte.", N, oferta(SIM, SIM)), false);
  // Fechada dita de outro jeito, só com loja na oração.
  assert.equal(fraseSegura("A Praia do Canto está encerrada agora.", N, lojas), false, "'encerrada' com a loja aberta sai");
  assert.equal(fraseSegura("A Praia do Canto está encerrada agora.", N, {}), false, "sem a ferramenta, status sai");
  assert.equal(fraseSegura("A Jardim Camburi está encerrada agora.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto está fora de funcionamento.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto já fechou.", N, lojas), false);
  assert.equal(fraseSegura("A Jardim Camburi já fechou por hoje.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto não está encerrada.", N, lojas), true);
  assert.equal(fraseSegura("A pré-venda está encerrada.", N, lojas), true, "'encerrada' sem loja na oração não é status");
  // Quantificador na entrega confere com a contagem das lojas; status em tempo que o bloco não cobre sai.
  assert.equal(fraseSegura("Só uma das lojas oferece entrega.", N, oferta(SIM, SIM)), false, "'só uma' com as duas oferecendo sai");
  assert.equal(fraseSegura("Só uma das lojas oferece entrega.", N, oferta(SIM, NAO)), true);
  assert.equal(fraseSegura("Exatamente uma loja oferece entrega.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("Metade das lojas oferece entrega.", N, oferta(SIM, NAO)), true);
  assert.equal(fraseSegura("Metade das lojas oferece entrega.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("Nem todas as lojas oferecem entrega.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("Nem todas as lojas oferecem entrega.", N, oferta(SIM, NAO)), true);
  assert.equal(fraseSegura("A Praia do Canto estava aberta.", N, lojas), false, "passado não é o que o bloco diz");
  assert.equal(fraseSegura("A Praia do Canto ficará aberta.", N, lojas), false, "futuro sem hora verificada sai");
  assert.equal(fraseSegura("A Jardim Camburi ficará fechada.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto estará aberta até as 19h.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto estará aberta até as 20h.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto continua aberta.", N, lojas), true);
  // Dia da semana recorrente ("aos sábados", "todo sábado", "de segunda a sexta") é período que o bloco não cobre.
  assert.equal(fraseSegura("A Praia do Canto abre às 10h somente aos sábados.", N, lojas), false, "escala semanal não está no bloco");
  assert.equal(fraseSegura("A Praia do Canto abre às 10h às segundas-feiras.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto abre às 10h todos os sábados.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto abre às 10h de segunda a sexta.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto está aberta aos domingos.", N, lojas), false);
  assert.equal(fraseSegura("A entrega é grátis aos sábados.", N, oferta(SIM, SIM)), false);
  assert.equal(fraseSegura("A Praia do Canto abre às 10h hoje.", N, lojas), true);
  // Aberta dita com verbo ("abre agora", "está abrindo", "já abriu", "atende agora", "acabou de abrir") confere com o bloco.
  assert.equal(fraseSegura("A Jardim Camburi abre agora.", N, lojas), false, "'abre agora' com a loja fechada sai");
  assert.equal(fraseSegura("A Jardim Camburi está abrindo agora.", N, lojas), false);
  assert.equal(fraseSegura("A Jardim Camburi já abriu.", N, lojas), false);
  assert.equal(fraseSegura("A Jardim Camburi atende agora.", N, lojas), false);
  assert.equal(fraseSegura("A Jardim Camburi acabou de abrir.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto já abriu.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto atende agora.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi ainda não abriu.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi abre agora.", N, {}), false, "sem a ferramenta, status sai");
  assert.equal(fraseSegura("A Jardim Camburi já abriu.", N, {}), false);
  assert.equal(fraseSegura("A Jardim Camburi funciona agora.", N, lojas), false, "'funciona agora' com a loja fechada sai");
  assert.equal(fraseSegura("A Jardim Camburi não funciona agora.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto funciona agora.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto não funciona agora.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto funciona agora.", N, {}), false, "sem a ferramenta, status sai");
  assert.equal(fraseSegura("A Praia do Canto funciona das 10h às 19h.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi está operacional agora.", N, lojas), false, "'operacional' com a loja fechada sai");
  assert.equal(fraseSegura("A Jardim Camburi está em pleno funcionamento.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto está operacional agora.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi não está operacional agora.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto está operacional agora.", N, {}), false, "sem a ferramenta, status sai");
  assert.equal(fraseSegura("A Jardim Camburi está em atendimento agora.", N, lojas), false, "'em atendimento' com a loja fechada sai");
  assert.equal(fraseSegura("A Praia do Canto está em atendimento agora.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi não está em atendimento agora.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto está em atendimento agora.", N, {}), false);
  assert.equal(fraseSegura("A Jardim Camburi está em horário de funcionamento agora.", N, lojas), false, "'em horário de funcionamento' com a loja fechada sai");
  assert.equal(fraseSegura("A Jardim Camburi está dentro do horário de funcionamento.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto está em horário de funcionamento agora.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi está fora do horário de funcionamento.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto está fora do horário de funcionamento.", N, lojas), false);
  // "Fora do expediente" é fechada; "em expediente" é aberta — os dois conferem com o bloco e saem sem ele.
  assert.equal(fraseSegura("A Praia do Canto está fora do expediente agora.", N, lojas), false, "'fora do expediente' com a loja aberta sai");
  assert.equal(fraseSegura("A Jardim Camburi está fora do expediente agora.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi não está fora do expediente agora.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto está em expediente agora.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi está em expediente.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto está fora do expediente agora.", N, {}), false);
  assert.equal(fraseSegura("A Praia do Canto está fora do expediente.", N, {}), false);
  assert.equal(fraseSegura("A Praia do Canto está em expediente agora.", N, {}), false);
  // "Recebendo/aceitando clientes ou pedidos" é aberta também na guarda sem ferramenta.
  assert.equal(fraseSegura("A Praia do Canto está recebendo clientes agora.", N, {}), false);
  assert.equal(fraseSegura("A Praia do Canto está recebendo pedidos.", N, {}), false);
  assert.equal(fraseSegura("A Praia do Canto está aceitando pedidos agora.", N, {}), false);
  assert.equal(fraseSegura("A Praia do Canto está recebendo clientes agora.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi está aceitando pedidos agora.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto está recebendo encomendas agora.", N, {}), false);
  assert.equal(fraseSegura("A Jardim Camburi está aceitando encomendas agora.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto está recebendo encomendas agora.", N, lojas), true);
  // Verbo finito ("aceita pedidos agora", "recebe encomendas neste momento") é status como o gerúndio; sem "agora" é oferta, não status.
  assert.equal(fraseSegura("A Praia do Canto aceita pedidos agora.", N, {}), false);
  assert.equal(fraseSegura("A Praia do Canto recebe encomendas agora.", N, {}), false);
  assert.equal(fraseSegura("A Jardim Camburi aceita pedidos agora.", N, lojas), false);
  assert.equal(fraseSegura("A Jardim Camburi recebe clientes neste momento.", N, lojas), false);
  assert.equal(fraseSegura("A Praia do Canto aceita pedidos agora.", N, lojas), true);
  assert.equal(fraseSegura("A Jardim Camburi não aceita pedidos agora.", N, lojas), true);
  assert.equal(fraseSegura("A Praia do Canto aceita pedidos pelo site.", N, lojas), true);
  // Primeira pessoa do plural ("funcionamos agora", "estamos funcionando", "já fechamos") é status de todas as lojas.
  assert.equal(fraseSegura("Funcionamos agora.", N, {}), false);
  assert.equal(fraseSegura("Estamos funcionando.", N, {}), false);
  assert.equal(fraseSegura("Já fechamos.", N, {}), false);
  assert.equal(fraseSegura("Funcionamos agora.", N, lojas), false, "'funcionamos agora' com uma loja fechada sai");
  assert.equal(fraseSegura("Já fechamos.", N, lojas), false, "'já fechamos' com uma loja aberta sai");
  assert.equal(fraseSegura("A Praia do Canto está em horário de funcionamento agora.", N, {}), false);
  // O nome da loja dentro do complemento de outro nome não faz dela o sujeito do horário.
  assert.equal(fraseSegura("A cozinha da Praia do Canto fecha às 19h.", N, lojas), false, "a cozinha não é a loja");
  assert.equal(fraseSegura("O evento na Praia do Canto termina às 19h.", N, lojas), false);
  assert.equal(fraseSegura("A cozinha da Praia do Canto está aberta agora.", N, lojas), false);
  assert.equal(fraseSegura("A loja da Praia do Canto fecha às 19h.", N, lojas), true);
  assert.equal(fraseSegura("Nossa loja na Praia do Canto fecha às 19h.", N, lojas), true);
});

caso("texto todo cortado com card na tela ganha uma linha; cards de sabores viram sujeito no conversar", async () => {
  const cliente = clienteFalso([
    { final: { stop_reason: "tool_use", content: [usoDeFerramenta("t1", "mostrar_sabores", { ids: ["extra-dark"], destaque: "kcal" })] } },
    { eventos: [{ texto: "O Extra Dark tem 100 kcal." }], final: { stop_reason: "end_turn", content: [] } },
  ]);
  const g = gravador();
  const uso = await conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "tem opção vegana?" }], enviar: g.enviar });
  assert.equal(uso.frases_cortadas, 1);
  assert.equal(g.texto().trim(), "A resposta está no card, com os dados oficiais.");
  const c2 = clienteFalso([
    { final: { stop_reason: "tool_use", content: [usoDeFerramenta("t1", "mostrar_sabores", { ids: ["extra-dark"], destaque: "kcal" })] } },
    { eventos: [{ texto: "Temos uma opção vegana." }], final: { stop_reason: "end_turn", content: [] } },
  ]);
  const g2 = gravador();
  await conversar({ client: c2, mensagens: [{ papel: "cliente", texto: "tem opção vegana?" }], enviar: g2.enviar });
  assert.equal(g2.texto().trim(), "Temos uma opção vegana.");
});

caso("llms.txt lista cada picolé G com a própria ficha", () => {
  const txt = montarLlmsTxt();
  assert.doesNotMatch(txt, /valores em dobro/);
  assert.match(txt, /- Framboesa Duo G \(110 g \(picolé G\)\): 174 kcal/);
});

caso("resposta interrompida vai marcada no histórico (falha ou parada pelo cliente)", () => {
  const m = historicoParaMensagens([
    { papel: "cliente", texto: "quero proteína" },
    { papel: "ia", texto: "O Paçoca é", blocos: [{ tipo: "sabores", ids: ["pacoca"] }], interrompida: "falha" },
    { papel: "cliente", texto: "e sem lactose?" },
    { papel: "ia", texto: "Separei", interrompida: "parada" },
    { papel: "cliente", texto: "ok" },
    { papel: "ia", texto: "Completa", interrompida: "__proto__" },
    { papel: "cliente", texto: "e agora?" },
  ]);
  assert.match(m[1].content, /\[Na tela: sabores: pacoca\]\n\[Esta resposta foi interrompida por uma falha antes do fim\.\]$/);
  assert.match(m[3].content, /\[O cliente parou esta resposta antes do fim\.\]$/);
  assert.equal(m[5].content, "Completa", "marca desconhecida entrou no histórico");
});

caso("shake não entra na comparação por porção: volta como erro e o caminho é mostrar_sabores", async () => {
  const r = await executarFerramenta("comparar_sabores", { ids: ["pacoca", "shake-choco-power"] });
  assert.equal(r.erro, true);
  assert.equal(r.bloco, null, "comparação com shake chegou à tela");
  assert.match(r.resultado, /shake-choco-power/);
  assert.match(r.resultado, /mostrar_sabores/);
  assert.match(FERRAMENTAS.find((f) => f.name === "comparar_sabores").description, /Shakes não entram/);
  const ok = await executarFerramenta("mostrar_sabores", { ids: ["pacoca", "shake-choco-power"] });
  assert.deepEqual(ok.bloco, { tipo: "sabores", ids: ["pacoca", "shake-choco-power"] });
  const doisGelatos = await executarFerramenta("comparar_sabores", { ids: ["pacoca", "pistache"] });
  assert.deepEqual(doisGelatos.bloco, { tipo: "comparar", ids: ["pacoca", "pistache"] });
});

caso("llms.txt não publica horário de loja (a equipe muda pelo painel; o arquivo é estático)", () => {
  const txt = montarLlmsTxt();
  assert.doesNotMatch(txt, /Horário:|\b\d{1,2}h(?:\d{2})?\b/, "horário fixo no llms.txt");
  assert.match(txt, /Horário de hoje[^\n]*Bentô IA/);
});

caso("llms.txt só faz alegação de açúcar na linha do sabor que tem a alegação", () => {
  const linhas = montarLlmsTxt().split("\n");
  const sabores = PRODUCTS;
  // Nome sozinho não identifica: há Chocolate Dubai gelato e Bentôlé. A porção desempata.
  const saborDaLinha = (l) => sabores.find((p) => l.startsWith(`- ${p.name} (${p.portionLabel}):`));
  for (const l of linhas.filter((x) => /sem adição de açúcares/i.test(x))) {
    const p = saborDaLinha(l);
    assert.ok(p, "alegação de açúcar fora da linha de um sabor: " + l.slice(0, 140));
    assert.ok(alegacoes(p).some((a) => a.startsWith("SEM ADIÇÃO")), p.name + " ganhou alegação que não tem");
  }
  for (const p of sabores.filter((x) => x.nutrition.addedSugars > 0)) {
    const l = linhas.find((x) => saborDaLinha(x) === p);
    assert.ok(l, p.name + " sumiu do llms.txt");
    assert.doesNotMatch(l, /sem adição/i, p.name + " tem açúcar adicionado e saiu com alegação");
  }
  assert.doesNotMatch(linhas.join("\n"), /\b(?:zero\s+aç[uú]car(?:es)?|sem\s+aç[uú]car\s+adicionado)\b/i);
});

caso("ficha de shake traz o aviso de produção compartilhada, como a dos outros sabores", async () => {
  const gelato = fichaSabor("pacoca"), shake = fichaSabor("shake-choco-power");
  assert.ok(gelato.pode_conter.length > 0);
  assert.deepEqual(shake.pode_conter, gelato.pode_conter);
  assert.equal(shake.aviso_contato_cruzado, gelato.aviso_contato_cruzado);
  const r = JSON.parse((await executarFerramenta("ficha_sabor", { id: "shake-choco-power" })).resultado);
  assert.deepEqual(r.pode_conter, gelato.pode_conter, "a IA recebeu ficha de shake sem o pode conter");
});

caso("alérgicos do shake: proteína e líquido separados; a versão vegana não vira LEITE", async () => {
  for (const s of SHAKES) {
    const f = fatosSabor(s);
    // A proteína whey é LEITE; o líquido soma os dele (amêndoa é ingrediente, não traço).
    assert.deepEqual(f.alergicos_da_proteina.whey, ["LEITE"], s.id);
    for (const r of s.nutrition) {
      const liq = f.alergicos_do_liquido[r.liquid];
      assert.ok(Array.isArray(liq), `${s.id} sem alérgicos do líquido ${r.liquid}`);
      assert.equal(liq.includes("AMÊNDOA"), /amêndoa/i.test(r.liquid), `${s.id} com ${r.liquid}`);
      assert.equal(liq.includes("LEITE"), /^leite (?!de amêndoas)/i.test(r.liquid), `${s.id} com ${r.liquid}`);
    }
    if (s.nutrition.some((r) => /amêndoa/i.test(r.liquid))) assert.match(f.alergicos, /com leite de amêndoas, também AMÊNDOA/, s.id);
  }
  // Açaí tem proteína vegana como opção, sem alérgicos no cadastro: o LEITE
  // fica preso à escolha do whey (nada de "contém LEITE" incondicional) e a
  // vegana manda confirmar com a equipe — nem LEITE, nem "sem alérgicos".
  const acai = fatosSabor(saborPorId("shake-acai-banana"));
  assert.match(acai.alergicos_da_proteina.vegana, /confirmar com a equipe/);
  assert.doesNotMatch(acai.alergicos, /^LEITE/, "o açaí ainda abre com LEITE para todo mundo");
  assert.match(acai.alergicos, /^com whey, LEITE; com proteína vegana, alérgicos não cadastrados: confirme com a equipe/);
  assert.match(acai.alergicos, /com leite A2 integral, também LEITE/, "com a vegana, o LEITE do líquido sumiu");
  assert.deepEqual(acai.alergicos_do_liquido["Água"], []);
  // Shake só com whey continua "LEITE (whey)" para todo mundo.
  assert.match(fatosSabor(saborPorId("shake-choco-power")).alergicos, /^LEITE \(whey\)/);
  // Chega ao modelo (ficha), ao prompt e ao llms.txt.
  const r = JSON.parse((await executarFerramenta("ficha_sabor", { id: "shake-choco-power" })).resultado);
  assert.deepEqual(r.alergicos_do_liquido["Leite de amêndoas"], ["AMÊNDOA"]);
  assert.deepEqual(r.alergicos_da_proteina, { whey: ["LEITE"] });
  assert.match(montarSistema(), /shake-choco-power \|[^\n]*também AMÊNDOA/);
  assert.match(montarSistema(), /shake-acai-banana \|[^\n]*com proteína vegana, alérgicos não cadastrados/);
  assert.match(montarLlmsTxt(), /Shake Choco Power:[^\n]*também AMÊNDOA/);
  assert.match(montarLlmsTxt(), /Shake Açaí com Banana:[^\n]*Alérgicos: com whey, LEITE; com proteína vegana/);
});

caso("macros do Shake Açaí valem para a proteína do cálculo, e todo mundo diz qual", async () => {
  const acai = fatosSabor(saborPorId("shake-acai-banana"));
  assert.equal(acai.valores_calculados_com, "whey de coco hidrolisado/isolado");
  assert.match(acai.observacao, /mudam com outro tipo de proteína \(hidrolisado, tradicional, zero lactose ou vegano\)/);
  // Shake de proteína única não ganha a ressalva.
  for (const id of ["shake-frutas-vermelhas", "shake-morango-maracuja", "shake-choco-power"]) {
    assert.equal(fatosSabor(saborPorId(id)).valores_calculados_com, undefined, id);
  }
  assert.match(montarSistema(), /shake-acai-banana \|[^\n]*\(valores com whey de coco hidrolisado\/isolado; com outra proteína/);
  assert.match(montarLlmsTxt(), /Shake Açaí com Banana:[^\n]*\(valores com whey de coco hidrolisado\/isolado; com outra proteína/);
  const ficha = JSON.parse((await executarFerramenta("ficha_sabor", { id: "shake-acai-banana" })).resultado);
  assert.equal(ficha.valores_calculados_com, "whey de coco hidrolisado/isolado");
});

caso("proteína do shake muda com o líquido: ninguém mostra um número só", () => {
  for (const s of SHAKES) {
    const f = fatosSabor(s);
    assert.equal(f.proteina_g, undefined, s.id + " voltou a ter proteína única");
    const agua = s.nutrition.find((r) => /água/i.test(r.liquid));
    assert.equal(f.proteina_g_com_agua, agua.prot, s.id);
    assert.match(f.proteina_g_faixa, /conforme o líquido$/);
  }
  assert.equal(fatosSabor(saborPorId("shake-frutas-vermelhas")).proteina_g_faixa, "23,7 a 28,6, conforme o líquido");
  assert.match(montarLlmsTxt(), /Shake Frutas Vermelhas: 23,7 a 28,6 g de proteína, conforme o líquido/);
});

caso("WebMCP: orçamento abaixo do mínimo não abre um formulário com outro número", async () => {
  const { registrarFerramentasWebMCP } = await import("../src/ia/webmcp.js");
  const { EV_MIN } = await import("../src/eventos-regras.js");
  const tools = {};
  const docAntes = globalThis.document;
  globalThis.document = { modelContext: { registerTool(f) { tools[f.name] = f; } } };
  const abertos = [];
  try {
    registrarFerramentasWebMCP({ current: { abrirOrcamento: (n) => abertos.push(n), abrirSabor() {}, perguntar() {} } });
    const t = tools.abrir_orcamento_evento;
    assert.equal(t.inputSchema.properties.convidados.minimum, EV_MIN);
    const pouco = JSON.parse((await t.execute({ convidados: 10 })).content[0].text);
    assert.equal(pouco.aberto, false);
    assert.match(pouco.orientacao, /WhatsApp/);
    assert.deepEqual(abertos, [], "abriu o orçamento (que viraria 150 convidados)");
    const ok = JSON.parse((await t.execute({ convidados: 45 })).content[0].text);
    assert.deepEqual(ok, { aberto: true, convidados: 45 });
    assert.deepEqual(abertos, [45]);
  } finally {
    if (docAntes === undefined) delete globalThis.document; else globalThis.document = docAntes;
  }
});

caso("o orçamento de evento é o do motor oficial", async () => {
  const r = await executarFerramenta("orcamento_evento", { convidados: 45 });
  const o = JSON.parse(r.resultado);
  assert.deepEqual(r.bloco, { tipo: "evento", convidados: 45, produtos: "Mix (gelatos + picolés)", abaixo: false });
  assert.deepEqual(o.formatos.map((f) => f.id), ["caixa", "balcao"]);
  assert.equal(o.formatos[0].subtotal_servico, 45 * EV_PRECO_PESSOA);
  assert.equal(o.formatos.find((f) => f.sugerido).id, "caixa");
  const pouco = await executarFerramenta("orcamento_evento", { convidados: 12 });
  assert.equal(JSON.parse(pouco.resultado).abaixo_do_minimo, true);
  assert.equal(pouco.bloco.abaixo, true);
  assert.equal((await executarFerramenta("orcamento_evento", { convidados: "muitos" })).erro, true);
});

caso("sem resposta do totem a IA não afirma nada sobre entrega", async () => {
  // Segunda-feira, 9h em Vitória: Praia do Canto abre às 10h; Jardim Camburi não abre segunda.
  const agora = new Date("2026-10-05T12:00:00Z");
  const r = await executarFerramenta("lojas_agora", {}, { agora, carregarEntrega: async () => { throw new Error("fora do ar"); } });
  const d = JSON.parse(r.resultado);
  assert.match(String(d.entrega), /sem dados/);
  assert.equal(r.bloco.entrega, null);
  const praia = d.lojas.find((l) => l.id === "praia-do-canto"), jc = d.lojas.find((l) => l.id === "jardim-camburi");
  assert.equal(praia.aberta, false);
  assert.equal(praia.abre, "hoje às 10h");
  assert.equal(jc.hoje, "fechada hoje");
  assert.equal(jc.abre, "amanhã às 11h");
  // Com o totem respondendo: formato real (chaves com underscore, raio em km,
  // prazo e mínimo). Grátis só vale para loja que entrega.
  const totem = async () => ({
    praia_do_canto: { entrega: true, gratis: true, raioKm: 7, pedidoMinimo: 60, prazoEntrega: { modo: "prazo", minutos: 25 } },
    jardim_camburi: { entrega: false, gratis: true },
  });
  const entregaAs = async (iso, extra = {}) => JSON.parse((await executarFerramenta("lojas_agora", {}, { agora: new Date(iso), carregarEntrega: totem, ...extra })).resultado).entrega;
  const praiaAs = async (iso, extra) => (await entregaAs(iso, extra)).find((x) => x.id === "praia-do-canto");
  // 9h de segunda: loja fechada. Oferece entrega, mas não está entregando, e nada de grátis.
  const fechada = await praiaAs("2026-10-05T12:00:00Z");
  assert.equal(fechada.oferece_entrega, true);
  assert.equal(fechada.entregando_agora, false);
  assert.equal(fechada.gratis, false, "grátis anunciado com a loja fechada");
  assert.equal(fechada.horario_entrega, "11h às 20h");
  assert.match(fechada.agora_nao_porque, /loja fechada/);
  // 10h30 de segunda: loja ABERTA (abre às 10h), mas antes da janela das 11h — o caso do Codex.
  const cedo = await praiaAs("2026-10-05T13:30:00Z");
  assert.equal(cedo.entregando_agora, false, "entrega anunciada antes das 11h");
  assert.equal(cedo.gratis, false);
  assert.match(cedo.agora_nao_porque, /fora do horário de entrega/);
  // 12h de segunda: aberta e na janela — agora sim, com grátis, raio, mínimo e prazo.
  assert.deepEqual(await praiaAs("2026-10-05T15:00:00Z"), {
    id: "praia-do-canto", oferece_entrega: true, horario_entrega: "11h às 20h", entregando_agora: true,
    gratis: true, raio_km: 7, pedido_minimo: 60, prazo_min: 25,
  });
  // Janela mandada pelo totem vale por cima do padrão (10h30 dentro de 10h–22h).
  const totemJanela = async () => ({ praia_do_canto: { entrega: true, horario: { abre: 10, fecha: 22 } } });
  const r4 = JSON.parse((await executarFerramenta("lojas_agora", {}, { agora: new Date("2026-10-05T13:30:00Z"), carregarEntrega: totemJanela })).resultado);
  assert.equal(r4.entrega.find((x) => x.id === "praia-do-canto").entregando_agora, true);
  const jcEntrega = (await entregaAs("2026-10-07T15:00:00Z")).find((x) => x.id === "jardim-camburi");
  assert.deepEqual(jcEntrega, { id: "jardim-camburi", oferece_entrega: false, horario_entrega: null, entregando_agora: false, gratis: false, raio_km: null, pedido_minimo: null, prazo_min: null });
  // A regra mora em src/lojas.js, a mesma que o site usa (não há uma segunda cópia no App).
  const app = await import("node:fs").then((fs) => fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8"));
  assert.match(app, /import \{ janelaEntrega as janelaDe \} from "\.\/lojas\.js"/);
  assert.doesNotMatch(app, /JANELA_PADRAO\s*=/);
  // O horário editado no painel vale por cima do código.
  const r3 = await executarFerramenta("lojas_agora", {}, { agora, overridesLojas: { "praia-do-canto": { dias: { 1: [8, 20] } } } });
  assert.equal(JSON.parse(r3.resultado).lojas.find((l) => l.id === "praia-do-canto").aberta, true);
});

caso("atalho só para destino conhecido", async () => {
  assert.equal((await executarFerramenta("mostrar_atalho", { destino: "pedir" })).bloco.destino, "pedir");
  assert.equal((await executarFerramenta("mostrar_atalho", { destino: "https://golpe.example" })).erro, true);
  const z = await executarFerramenta("mostrar_atalho", { destino: "whatsapp", mensagem_whatsapp: "Olá!\u0007 Quero 30 caixas" });
  assert.equal(z.bloco.mensagem, "Olá! Quero 30 caixas");
});

caso("alegação de açúcar: forma proibida sai inteira (nunca vira a aprovada); a aprovada só com sabor que a tem", () => {
  const N = new Set();
  // O exemplo do Codex: reescrever daria ao Extra Dark (açúcar adicionado) uma alegação falsa.
  for (const f of [
    "O Extra Dark é zero açúcar.", "É zero açúcar.", "O Morango é sem açúcar adicionado.", "Não leva açúcar nenhum.",
    "É livre de açúcar.", "Tem baixo teor de açúcar.",
    "O Extra Dark é sem adição de açúcares.",                        // não tem a alegação
    "O Choco Dubai é sem adição de açúcares.",                       // apelido de quem não tem
    "O Morango e o Maracujá são sem adição de açúcares.",            // um dos dois não tem
    "O Shake Choco Power é sem adição de açúcares.",                 // shake não tem alegação
    "Nossos gelatos são sem adição de açúcares.",                    // linha inteira: proibido
    "Todos são sem adição de açúcares.",                             // sem nome, não dá para conferir
  ]) assert.equal(fraseSegura(f, N), false, "passou: " + f);
  for (const f of [
    "O Morango é sem adição de açúcares e contém açúcares próprios dos ingredientes.",
    "O Bentôlé Pistache e Chocolate Branco é sem adição de açúcares.",
    "Contém açúcares próprios dos ingredientes.",
    "O Limão Siciliano é refrescante e sem lactose.",
  ]) assert.equal(fraseSegura(f, N), true, "barrou: " + f);
  // Em streaming, partida entre pedaços: some a frase, o resto chega.
  const f = filtroFrases(N);
  let s = "";
  for (const d of ["Ele é ótimo. O Extra Dark é ze", "ro açú", "car e leve", " demais. Peça hoje."]) s += f.push(d);
  s += f.fim();
  assert.equal(s, "Ele é ótimo. Peça hoje.");
});

caso("alegação de proteína: só com o nome de um sabor que a tem (como a de açúcar)", () => {
  const N = new Set();
  for (const f of [
    "O Limão Siciliano tem alto teor de proteína.",          // 1,2 g: sem alegação nenhuma
    "O Morango tem alto teor de proteína.",                  // é só fonte
    "Nossos gelatos são ricos em proteína.",                 // linha inteira
    "O Chocolate Dubai tem alto teor de proteína.",          // gelato é alto, Bentôlé é só fonte: ambíguo
    "O Shake Choco Power tem alto teor de proteína.",        // shake não tem alegação calculada
    "O Paçoca e o Limão Siciliano são fonte de proteína.",   // um dos dois não é
  ]) assert.equal(fraseSegura(f, N), false, "passou: " + f);
  for (const f of [
    "O Paçoca tem alto teor de proteína.",
    "O Morango é fonte de proteína.",
    "O Bentôlé Pistache e Chocolate Branco é fonte de proteína.",
  ]) assert.equal(fraseSegura(f, N), true, "barrou: " + f);
});

caso("alergia no texto: só citando o sabor e igual ao veredito do card; ausência de traços nunca", () => {
  const N = new Set();
  for (const f of [
    "O Limão Siciliano contém leite.",                       // a ficha diz que não
    "O Pistache & Choco Branco não contém leite.",           // a ficha diz que sim
    "O Framboesa Duo não tem leite.",                        // sem lactose não é sem leite
    "O Morango não tem traços de amendoim.",                 // traço nunca se garante
    "Separei opções sem amendoim.",                          // sem nome: não há o que conferir
    "O Paçoca é seguro para alérgicos a amendoim.",
    "Todos esses servem para celíacos.",
    "O Paçoca e o Morango contêm amendoim.",                 // um dos dois não
    "O Limão Siciliano contém pistache.",                    // "Pistache" é sabor E castanha
    "O Morango contém avelã.",
    "O Pistache pode ser consumido por alérgicos a leite.",  // passiva: a ficha diz que contém
    "O Limão Siciliano contém derivados de leite.",
    "O Pistache é tranquilo para alérgicos a leite.",        // forma não reconhecida: nega por padrão
    "Ele pode ser consumido por alérgicos a leite.",         // sem nome, falando de alergia
    "O Limão Siciliano foi preparado com leite.",            // composição com sabor que NÃO contém: sai
    "O Pistache é livre de lácteos.",                        // sinônimo de leite
    "O Pistache não contém caseína.",
    "O Pistache é livre de proteína animal.",                // ausência não reconhecida, de sabor citado
    "O Limão Siciliano não leva corante.",
  ]) assert.equal(fraseSegura(f, N), false, "passou: " + f);
  for (const f of [
    "O Pistache & Choco Branco contém leite.",
    "O Paçoca contém amendoim e a produção é compartilhada, então pode haver traços de outros alérgicos.",
    "O Framboesa Duo é sem lactose.",
    "O Limão Siciliano não leva leite, mas a produção é compartilhada.",
    "Sem o Pistache & Choco Branco, sobram outras opções.",   // "sem" + nome não é alegação
    "O Doce de Leite contém leite.",                         // o nome do sabor não conta como alérgico
    "O Limão Siciliano não contém pistache.",
    "O mix leva o Pistache e o Morango.",                    // com artigo, é o sabor citado
    "O Pistache contém derivados de leite.",
    "O Limão Siciliano serve para alérgicos a leite.",       // igual à ficha
    "Se você tem alergia a leite, confirme com a equipe antes de pedir.",
    "Com leite A2 fica mais cremoso.",                       // sem sabor e sem falar de alergia
    "O Limão Siciliano é livre de lácteos.",                 // igual à ficha
    "O Pistache foi preparado com leite.",                   // composição com sabor que contém: verdade conferível
    "Sem dúvida, o Pistache é o mais pedido.",
    "Os shakes podem ser feitos com água, leite A2 integral ou leite de amêndoas.",
    "Para alergia grave, fale com a equipe antes de consumir.",
  ]) assert.equal(fraseSegura(f, N), true, "barrou: " + f);
  // No streaming, a frase errada some e a certa segue.
  assert.equal(frasesSeguras("O Limão Siciliano contém leite. O card mostra a ficha.", N), "O card mostra a ficha.");
});

caso("açúcar e vegano negam por padrão: paráfrase sai, vegano só o que data.js marca", () => {
  const N = new Set();
  for (const f of [
    "Extra Dark não possui adição de açúcar.",               // paráfrase da forma aprovada
    "Extra Dark não recebe açúcar na receita.",
    "O Extra Dark tem pouco açúcar.",
    "O Extra Dark nunca leva açúcar.",
    "Pistache é vegano.",                                    // contém leite
    "Pistache é adequado para veganos.",
    "O Extra Dark e o Pistache são veganos.",
    "Temos opções veganas.",                                 // sem nome: não há o que conferir
    "O Pistache é feito com proteína vegana.",
  ]) assert.equal(fraseSegura(f, N), false, "passou: " + f);
  for (const f of [
    "O Extra Dark é vegano.",                                // o sub de data.js diz vegano
    "O Pistache não é vegano.",
    "O Shake Açaí com Banana tem opção de proteína vegana.", // opção de proteína do shake
  ]) assert.equal(fraseSegura(f, N), true, "barrou: " + f);
});

caso("saúde e soja: alegação terapêutica sai; soja conferida, alérgico sem cadastro nunca confere", () => {
  const N = new Set();
  for (const f of [
    "Pistache ajuda a controlar a glicemia.",
    "Pistache ajuda a emagrecer.",
    "Pistache é indicado para diabéticos.",
    "É indicado para diabéticos.",                           // sem nome, mas alega adequação
    "O Brigadeiro não utiliza soja.",                        // a ficha diz SOJA
    "O Brigadeiro pode ser consumido por quem evita soja.",
    "O Brigadeiro não contém ovo.",                          // ovo não está no cadastro: nada confere
    "O Shake Choco Power não tem soja.",                     // shake sem cadastro de soja
  ]) assert.equal(fraseSegura(f, N), false, "passou: " + f);
  for (const f of [
    "Quem usa caneta de GLP-1 deve confirmar com o médico.",
    "Se você tem diabetes, converse com seu médico antes.",
    "O Brigadeiro contém soja.",
    "O Extra Dark pode ter efeito laxativo para quem tem intestino sensível.",
  ]) assert.equal(fraseSegura(f, N), true, "barrou: " + f);
});

caso("número no texto só se o cliente escreveu: tabela, preço e horário ficam no card", () => {
  const N = numerosDe("Quanto fica um evento para 1.500 pessoas? E para 80?");
  for (const f of [
    "Para 80 convidados, o balcão atende bem.", "Para 1500 convidados, o carrinho é o formato.",
    "Fale com a equipe no WhatsApp (27) 99915-9995.",               // o número oficial, idêntico
    "Quem usa caneta de GLP-1 deve confirmar com o médico.", "Com leite A2 fica mais cremoso.",
  ]) assert.equal(fraseSegura(f, N), true, "barrou: " + f);
  for (const f of [
    "O Pistache tem 10 g de proteína.", "Custa R$ 27 por pessoa.", "Para 80 convidados o total é R$ 2.160.",
    "Abre amanhã às 13h.", "Fica pronto em dez minutos.", "Tem doze gramas de proteína.",
    "Fale no (27) 99915-9996.", "São 6 litros de gelato.",
  ]) assert.equal(fraseSegura(f, N), false, "passou: " + f);
  // O número do cliente só volta como contagem de gente, nunca como dado.
  const vinte = numerosDe("Quero um evento para 20 pessoas");
  assert.equal(fraseSegura("Para 20 pessoas, a caixa térmica atende.", vinte), true);
  assert.equal(fraseSegura("O Pistache tem 20 g de proteína.", vinte), false, "o 20 do evento virou dado de tabela");
  assert.equal(fraseSegura("Custa R$ 20.", vinte), false);
  // "2.160": o ponto de milhar não é fim de frase.
  const fl = filtroFrases(numerosDe("80 convidados"));
  let s = "";
  for (const d of ["Para 8", "0 convidados, o bal", "cão atende. O total fica em R$ 2.1", "60. Chame a equipe."]) s += fl.push(d);
  s += fl.fim();
  assert.equal(s, "Para 80 convidados, o balcão atende. Chame a equipe.");
  // Quebra de parágrafo depois de frase cortada fica (o texto não gruda).
  const fp = filtroFrases(new Set());
  assert.equal(fp.push("Tem 10 g.\n\nO card mostra tudo.") + fp.fim(), "\n\nO card mostra tudo.");
});

caso("histórico do navegador é saneado: começa no cliente, sem controle, com nota do que estava na tela", () => {
  const m = historicoParaMensagens([
    { papel: "ia", texto: "Oi! Sou a Bentô IA." },
    { papel: "cliente", texto: "quero proteína" },
    { papel: "ia", texto: "Separei estes:", blocos: [{ tipo: "sabores", ids: ["pacoca", "id-falso"] }, { tipo: "<script>" }] },
    { papel: "cliente", texto: "e o primeiro tem lactose?\u0000" },
  ]);
  assert.equal(m[0].role, "user");
  assert.equal(m.length, 3);
  assert.match(m[1].content, /\[Na tela: sabores: pacoca\]/);
  assert.doesNotMatch(m[1].content, /id-falso|script/);
  assert.equal(m[2].content, "e o primeiro tem lactose?");
  assert.throws(() => historicoParaMensagens([]), ErroConversa);
  assert.throws(() => historicoParaMensagens([{ papel: "cliente", texto: "   " }]), ErroConversa);
  assert.throws(() => historicoParaMensagens([{ papel: "cliente", texto: "oi" }, { papel: "ia", texto: "olá" }]), ErroConversa);
  assert.equal(historicoParaMensagens([{ papel: "cliente", texto: "x".repeat(5000) }])[0].content.length, 600);
});

caso("uma conversa com ferramenta: card, texto corrigido e a volta devolvida sem edição", async () => {
  const pensamento = { type: "thinking", thinking: "", signature: "assinatura-opaca" };
  const cliente = clienteFalso([
    { eventos: [{ raw: { type: "content_block_start", content_block: { type: "tool_use", name: "mostrar_sabores" } } }],
      final: { stop_reason: "tool_use", content: [pensamento, usoDeFerramenta("t1", "mostrar_sabores", { ids: ["pacoca", "bentole-pistache-cb"] })] } },
    { eventos: [{ texto: "Os dois são ótimos no pós-treino. E são zero" }, { texto: " açúcar. O Paçoca tem 9 g de proteína." }],
      final: { stop_reason: "end_turn", content: [{ type: "text", text: "..." }] } },
  ]);
  const g = gravador();
  const uso = await conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "algo pós-treino?" }], enviar: g.enviar });
  assert.deepEqual(g.ev.filter(([t]) => t === "bloco").map(([, d]) => d), [{ tipo: "sabores", ids: ["pacoca", "bentole-pistache-cb"] }]);
  assert.ok(g.ev.some(([t]) => t === "status"));
  // A frase com alegação proibida e a com número saem; o resto chega.
  assert.equal(g.texto().trim(), "Os dois são ótimos no pós-treino.");
  assert.equal(uso.frases_cortadas, 2);
  assert.equal(uso.voltas, 2);
  const [p1, p2] = cliente.pedidos;
  assert.equal(p1.model, "claude-sonnet-5-5");
  assert.deepEqual(p1.output_config, { effort: "low" });
  assert.equal(p1.fallbacks, "default");
  assert.deepEqual(p1.betas, ["server-side-fallback-2026-07-01"]);
  assert.deepEqual(p1.system[0].cache_control, { type: "ephemeral" });
  assert.equal(p1.thinking, undefined, "pensamento fica no padrão adaptativo; desligado dá 400 no Sonnet/Opus 5.5");
  // A segunda chamada leva a volta anterior INTEIRA (pensamento + ferramenta) e todos os resultados numa mensagem.
  assert.deepEqual(p2.messages[1], { role: "assistant", content: [pensamento, usoDeFerramenta("t1", "mostrar_sabores", { ids: ["pacoca", "bentole-pistache-cb"] })] });
  assert.equal(p2.messages[2].role, "user");
  assert.equal(p2.messages[2].content[0].tool_use_id, "t1");
  assert.deepEqual(p2.messages.slice(0, 1), p1.messages);
});

caso("preâmbulo antes da ferramenta sai da tela; fica só a resposta", async () => {
  // Sonnet 5.5 às vezes anuncia ("Vou mostrar os cards.") antes de chamar a
  // ferramenta, e depois responde de verdade: sem recolher, sairia repetido.
  const cliente = clienteFalso([
    { eventos: [{ texto: "Sabores sem lactose: Limão e Maracujá. Vou mostrar os cards." }], final: { stop_reason: "tool_use", content: [{ type: "text", text: "Sabores sem lactose: Limão e Maracujá. Vou mostrar os cards." }, usoDeFerramenta("t1", "mostrar_sabores", { ids: ["limao-siciliano", "maracuja"] })] } },
    { eventos: [{ texto: "O Limão e o Maracujá não levam lactose." }], final: { stop_reason: "end_turn", content: [{ type: "text", text: "O Limão e o Maracujá não levam lactose." }] } },
  ]);
  const g = gravador();
  await conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "sem lactose?" }], enviar: g.enviar });
  assert.equal(g.texto(), "O Limão e o Maracujá não levam lactose.");
  const rec = g.ev.find(([t]) => t === "recolher");
  assert.ok(rec, "o preâmbulo não foi recolhido");
  assert.equal(rec[1].n, "Sabores sem lactose: Limão e Maracujá. Vou mostrar os cards.".length);
  // E a regra está no prompt (a trava do código é a rede de segurança).
  assert.match(montarSistema(), /sem escrever nada antes delas/);
  assert.match(montarSistema(), /card de evento já traz o botão do orçamento/);
});

caso("pronome da resposta não resolve no preâmbulo recolhido", async () => {
  // "Vou verificar o Limão." some da tela com o recolher; a resposta "Ele não
  // contém leite." ao lado do card do Pistache não pode herdar o Limão escondido.
  const cliente = clienteFalso([
    { eventos: [{ texto: "Vou verificar o Limão Siciliano." }], final: { stop_reason: "tool_use", content: [{ type: "text", text: "Vou verificar o Limão Siciliano." }, usoDeFerramenta("t1", "mostrar_sabores", { ids: ["pistache"] })] } },
    { eventos: [{ texto: "Ele não contém leite." }], final: { stop_reason: "end_turn", content: [{ type: "text", text: "Ele não contém leite." }] } },
  ]);
  const g = gravador();
  const uso = await conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "o limão tem leite?" }], enviar: g.enviar });
  assert.equal(uso.frases_cortadas, 1, "a frase com o pronome herdou o preâmbulo recolhido");
  assert.doesNotMatch(g.texto(), /não contém leite/);
  assert.match(g.texto(), /A resposta está no card/);
  // Sem recolher (a resposta vem na mesma volta do nome), o pronome resolve no nome.
  const cliente2 = clienteFalso([
    { final: { stop_reason: "tool_use", content: [usoDeFerramenta("t1", "mostrar_sabores", { ids: ["limao-siciliano"] })] } },
    { eventos: [{ texto: "Recomendo o Limão Siciliano. Ele não contém leite." }], final: { stop_reason: "end_turn", content: [{ type: "text", text: "Recomendo o Limão Siciliano. Ele não contém leite." }] } },
  ]);
  const g2 = gravador();
  const uso2 = await conversar({ client: cliente2, mensagens: [{ papel: "cliente", texto: "o limão tem leite?" }], enviar: g2.enviar });
  assert.equal(uso2.frases_cortadas, 0);
  assert.equal(g2.texto().trim(), "Recomendo o Limão Siciliano. Ele não contém leite.");
});

caso("frase cortada não vira antecedente: o pronome resolve na última frase que foi para a tela", () => {
  const N = new Set(), LI = { sabores: ["limao-siciliano"] };
  // "O Pistache custa 99 reais." sai pelo número; o "Ele" não pode apontar para ele.
  assert.equal(frasesSeguras("O Pistache custa 99 reais. Ele contém leite.", N, () => {}, LI), "");
  assert.equal(frasesSeguras("O Pistache custa 99 reais. Ele não contém leite.", N, () => {}, LI), "");
  // A frase cortada no meio não apaga a anterior que ficou: o leitor vê "Recomendo o Limão. Ele não contém leite."
  assert.equal(frasesSeguras("Recomendo o Limão Siciliano. Custa 99 reais. Ele não contém leite.", N, () => {}, {}), "Recomendo o Limão Siciliano. Ele não contém leite.");
  assert.equal(frasesSeguras("Recomendo o Limão Siciliano. O Pistache custa 99 reais. Ele contém leite.", N, () => {}, {}), "Recomendo o Limão Siciliano.");
});

caso("frase sem sujeito herda a cadeia das anteriores: pronome resolvido na frase de antes", () => {
  const N = new Set(), LI = { sabores: ["limao-siciliano"] }, ED = { sabores: ["extra-dark"] };
  // "Ela" é a cobertura; "Não contém leite." continua falando dela, não do Limão.
  assert.equal(frasesSeguras("O Limão Siciliano inclui uma cobertura. Ela é artesanal. Não contém leite.", N, () => {}, LI), "O Limão Siciliano inclui uma cobertura. Ela é artesanal.");
  assert.equal(frasesSeguras("O Extra Dark inclui um cone. Ele é crocante. É vegano.", N, () => {}, ED), "O Extra Dark inclui um cone. Ele é crocante.");
  assert.equal(frasesSeguras("O cone é crocante. Não contém leite.", N, () => {}, LI), "O cone é crocante.");
  // Cadeia que termina no sabor: a frase sem sujeito é dele, mesmo sem card.
  assert.equal(frasesSeguras("Recomendo o Limão Siciliano. Não contém leite.", N, () => {}, {}), "Recomendo o Limão Siciliano. Não contém leite.");
  assert.equal(frasesSeguras("Recomendo o Limão Siciliano. Ele é ótimo. Ele não contém leite.", N, () => {}, {}), "Recomendo o Limão Siciliano. Ele é ótimo. Ele não contém leite.");
  assert.equal(frasesSeguras("O Limão Siciliano inclui uma cobertura. Não contém leite.", N, () => {}, LI), "O Limão Siciliano inclui uma cobertura. Não contém leite.");
  // Frase com sujeito próprio abre cadeia nova.
  assert.equal(frasesSeguras("O Limão Siciliano inclui uma cobertura. Ela é artesanal. Esta opção não contém leite.", N, () => {}, LI), "O Limão Siciliano inclui uma cobertura. Ela é artesanal. Esta opção não contém leite.");
  assert.equal(frasesSeguras("Separei esta opção para você. Não contém leite.", N, () => {}, LI), "Separei esta opção para você. Não contém leite.");
  // Mais de uma frase sem sujeito no meio ("Combina perfeitamente.", "Vale a
  // pena."): a cadeia continua até o pronome resolvido — a cobertura.
  assert.equal(frasesSeguras("O Limão Siciliano inclui uma cobertura. Ela é artesanal. Combina perfeitamente. Não contém leite.", N, () => {}, LI), "O Limão Siciliano inclui uma cobertura. Ela é artesanal. Combina perfeitamente.");
  assert.equal(frasesSeguras("O Limão Siciliano inclui uma cobertura. Ela é artesanal. Combina perfeitamente. Vale a pena. Não contém leite.", N, () => {}, LI), "O Limão Siciliano inclui uma cobertura. Ela é artesanal. Combina perfeitamente. Vale a pena.");
  assert.equal(frasesSeguras("Esta opção vem com uma cobertura. Ela é artesanal. Combina perfeitamente. Não contém leite.", N, () => {}, LI), "Esta opção vem com uma cobertura. Ela é artesanal. Combina perfeitamente.");
  // Sem pronome, a cadeia é do sabor; "vale a pena" não é sujeito.
  assert.equal(frasesSeguras("O Limão Siciliano é leve. Combina perfeitamente. Não contém leite.", N, () => {}, {}), "O Limão Siciliano é leve. Combina perfeitamente. Não contém leite.");
  assert.equal(frasesSeguras("O Limão Siciliano é ótimo. Vale a pena. Não contém leite.", N, () => {}, {}), "O Limão Siciliano é ótimo. Vale a pena. Não contém leite.");
  assert.equal(frasesSeguras("Vale a pena experimentar. Não contém leite.", N, () => {}, LI), "Vale a pena experimentar. Não contém leite.");
  // "Tal cobertura" tem sujeito próprio: a cobertura, estranha.
  assert.equal(frasesSeguras("O Limão Siciliano inclui uma cobertura. Tal cobertura não contém leite.", N, () => {}, LI), "O Limão Siciliano inclui uma cobertura.");
  assert.equal(frasesSeguras("O Extra Dark inclui uma cobertura. Tal cobertura é vegana.", N, () => {}, ED), "O Extra Dark inclui uma cobertura.");
  // Nome solto com verbo de objeto abre a cadeia pela cobertura.
  assert.equal(frasesSeguras("Cobertura acompanha esta opção. Não contém leite.", N, () => {}, LI), "Cobertura acompanha esta opção.");
  assert.equal(frasesSeguras("Cobertura acompanha esta opção. Esta opção não contém leite.", N, () => {}, LI), "Cobertura acompanha esta opção. Esta opção não contém leite.");
});

caso("recusa vira conversa com a equipe, não erro", async () => {
  const cliente = clienteFalso([{ final: { stop_reason: "refusal", content: [] } }]);
  const g = gravador();
  await conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "?" }], enviar: g.enviar });
  assert.match(g.texto(), /WhatsApp/);
  assert.deepEqual(g.ev.find(([t]) => t === "bloco")[1], { tipo: "atalho", destino: "whatsapp", mensagem: "" });
});

caso("modelo que não para de chamar ferramenta é cortado", async () => {
  const volta = () => ({ final: { stop_reason: "tool_use", content: [usoDeFerramenta("t", "lojas_agora", {})] } });
  const cliente = clienteFalso([volta(), volta(), volta(), volta(), volta()]);
  const g = gravador();
  const uso = await conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "?" }], enviar: g.enviar, ctx: { carregarEntrega: async () => null } });
  assert.equal(uso.voltas, 5);
  assert.match(g.texto(), /pergunta(r)? de novo/);
  assert.ok(g.ev.filter(([t]) => t === "bloco").length <= 6);
});

caso("JSON de ferramenta ilegível refaz a volta; erro da API sobe", async () => {
  const cliente = clienteFalso([
    { lanca: new Anthropic.AnthropicError("Unable to parse tool parameter JSON from model.") },
    { eventos: [{ texto: "Pronto, aqui está." }], final: { stop_reason: "end_turn", content: [] } },
  ]);
  const g = gravador();
  await conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "oi" }], enviar: g.enviar });
  assert.equal(g.texto(), "Pronto, aqui está.");
  const caiu = clienteFalso([{ lanca: new Anthropic.RateLimitError(429, {}, "limite", new Headers()) }]);
  await assert.rejects(conversar({ client: caiu, mensagens: [{ papel: "cliente", texto: "oi" }], enviar: () => {} }), Anthropic.RateLimitError);
});

caso("volta que já mostrou texto não é refeita (a frase sairia duas vezes)", async () => {
  // A volta emite texto e SÓ ENTÃO o SDK falha ao montar a resposta.
  const cliente = { beta: { messages: {} } };
  cliente.beta.messages.stream = function () {
    const ouvintes = {};
    return {
      on(ev, cb) { (ouvintes[ev] ||= []).push(cb); return this; },
      async finalMessage() {
        for (const cb of ouvintes.text || []) cb("Começando a responder e ");
        throw new Anthropic.AnthropicError("Unable to parse tool parameter JSON from model.");
      },
    };
  };
  await assert.rejects(conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "oi" }], enviar: () => {} }), Anthropic.AnthropicError);
});

caso("falha no meio entrega o texto retido antes de subir o erro", async () => {
  const cliente = { beta: { messages: { stream() {
    const ouvintes = {};
    return {
      on(ev, cb) { (ouvintes[ev] ||= []).push(cb); return this; },
      async finalMessage() {
        for (const cb of ouvintes.text || []) cb("O Pistache é ótimo e bem leve demais");
        throw new Anthropic.APIConnectionError({ message: "terminated" });
      },
    };
  } } } };
  const g = gravador();
  await assert.rejects(conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "oi" }], enviar: g.enviar }), Anthropic.APIError);
  assert.equal(g.texto(), "O Pistache é ótimo e bem leve demais");
});

caso("resposta cortada no limite de tokens sobe como erro, com o que chegou na tela", async () => {
  const cortada = clienteFalso([{ eventos: [{ texto: "Os dois são ótimos no pós-treino, e o Pistache tem" }], final: { stop_reason: "max_tokens", content: [{ type: "text", text: "Os dois são ótimos no pós-treino, e o Pistache tem" }] } }]);
  const g = gravador();
  await assert.rejects(conversar({ client: cortada, mensagens: [{ papel: "cliente", texto: "oi" }], enviar: g.enviar }), /max_tokens/);
  assert.equal(g.texto(), "Os dois são ótimos no pós-treino, e o Pistache tem");
  // Orçamento gasto só com pensamento: nada escrito também é falha, não resposta em branco.
  const so = clienteFalso([{ eventos: [], final: { stop_reason: "max_tokens", content: [{ type: "thinking", thinking: "", signature: "x" }] } }]);
  await assert.rejects(conversar({ client: so, mensagens: [{ papel: "cliente", texto: "oi" }], enviar: gravador().enviar }), /max_tokens/);
});

// Cliente falso para a sugestão de sabores (chamada única, sem streaming).
function clienteCreate(respostas) {
  const pedidos = [];
  return { pedidos, beta: { messages: { async create(params) {
    pedidos.push(JSON.parse(JSON.stringify(params)));
    const r = respostas.shift();
    if (!r) throw new Error("o teste não previu esta chamada");
    if (r.lanca) throw r.lanca;
    return { usage: { input_tokens: 50, output_tokens: 20, cache_read_input_tokens: 1500 }, stop_reason: "tool_use", ...r };
  } } } };
}
const escolha = (id, input) => ({ content: [{ type: "tool_use", id, name: "escolher_sabores", input }] });
const EV_CAIXA = { convidados: 45, tipo: "Mix (gelatos + picolés)", formato: "caixa" };

caso("sugestão de sabores: a IA só escolhe ids, dentro do limite; o texto passa pelo filtro", async () => {
  const c = clienteCreate([escolha("s1", { gelatos: ["brigadeiro"], picoles: ["bentole-prestigio", "bentole-framboesa-duo"], motivo: "Chocolate agrada as crianças. E é zero açúcar." })]);
  const r = await sugerirSaboresEvento({ client: c, evento: EV_CAIXA, prefs: { criancas: true } });
  assert.equal(r.origem, "ia");
  assert.deepEqual([r.gelatos, r.picoles], [["brigadeiro"], ["bentole-prestigio", "bentole-framboesa-duo"]]);
  assert.deepEqual(r.limites, { gelatos: 1, picoles: 2, total: 3 });
  assert.equal(r.motivo, "Chocolate agrada as crianças.", "só a frase com a alegação devia sair (e nunca virar \"sem adição\")");
  // Motivo que cai inteiro na revisão (número de tabela) dá lugar ao da regra.
  const sóNumero = await sugerirSaboresEvento({ client: clienteCreate([escolha("s9", { gelatos: ["brigadeiro"], picoles: ["bentole-prestigio"], motivo: "Rende 30 potinhos com 9 g de proteína." })]), evento: EV_CAIXA, prefs: { criancas: true } });
  assert.equal(sóNumero.origem, "ia");
  assert.match(sóNumero.motivo, /pensada para criança/);
  assert.equal(sóNumero.uso.frases_cortadas, 1);
  const p = c.pedidos[0];
  assert.equal(p.model, "claude-sonnet-5-5");
  assert.deepEqual(p.output_config, { effort: "low" });
  assert.equal(p.tool_choice, undefined, "tool_choice forçado dá 400 nos modelos 5.5");
  assert.deepEqual(p.system[0].cache_control, { type: "ephemeral" });
  assert.match(p.messages[0].content, /45 convidados · Caixa térmica/);
  assert.match(p.messages[0].content, /até 1 sabor\(es\) de gelato e até 2 de picolé/);
  assert.match(p.messages[0].content, /Tem crianças/);
  // O prompt fixo (vai para o cache) tem o catálogo inteiro e separa lactose de leite.
  const sist = sistemaSabores();
  for (const x of saboresEvento()) assert.ok(sist.includes(x.id), "faltou " + x.id);
  assert.match(sist, /Alergia ao leite é outra coisa/);
});

caso("sugestão inválida volta ao modelo com o erro; sem conserto, sai a sugestão equilibrada", async () => {
  // Passou do limite (2 gelatos na caixa) e inventou id: volta como erro.
  const c = clienteCreate([
    escolha("s1", { gelatos: ["brigadeiro", "morango"], picoles: ["picole-unicornio"], motivo: "x" }),
    escolha("s2", { gelatos: ["morango"], picoles: ["bentole-prestigio"], motivo: "Morango e chocolate agradam a todos." }),
  ]);
  const r = await sugerirSaboresEvento({ client: c, evento: EV_CAIXA });
  assert.equal(r.origem, "ia");
  assert.deepEqual([r.gelatos, r.picoles], [["morango"], ["bentole-prestigio"]]);
  const volta = c.pedidos[1].messages[2].content[0];
  assert.equal(volta.is_error, true);
  assert.match(volta.content, /no máximo 1 sabor\(es\) de gelato/);
  assert.match(volta.content, /picole-unicornio não é um picolé do catálogo/);
  // Duas inválidas, API fora do ar ou resposta sem ferramenta: a regra responde.
  for (const respostas of [
    [escolha("a", { gelatos: [], picoles: [], motivo: "" }), escolha("b", { gelatos: ["x"], picoles: [], motivo: "" })],
    [{ lanca: new Anthropic.APIConnectionError({ message: "fora" }) }],
    [{ content: [{ type: "text", text: "Sugiro brigadeiro." }], stop_reason: "end_turn" }],
  ]) {
    const rr = await sugerirSaboresEvento({ client: clienteCreate(respostas), evento: EV_CAIXA, prefs: { semLactose: true } });
    assert.equal(rr.origem, "regra");
    assert.ok(validarEscolhaSabores(rr, limiteSabores(45, EV_CAIXA.tipo, "caixa")).ok, "a sugestão da regra saiu fora do limite");
    assert.ok(rr.gelatos.concat(rr.picoles).some((id) => saboresEvento().find((x) => x.id === id).semLactose), "pediu sem lactose e não veio nenhum");
  }
  await assert.rejects(sugerirSaboresEvento({ client: clienteCreate([]), evento: { convidados: "muitos" } }), ErroConversa);
});

caso("alergia escrita nas observações exclui o sabor — na regra e na escolha da IA", async () => {
  assert.deepEqual(alergiasDasNotas("um convidado alérgico a amendoim"), ["amendoim"]);
  assert.deepEqual(alergiasDasNotas("as crianças adoram pistache"), [], "gosto não é alergia");
  assert.deepEqual(alergiasDasNotas("criança com APLV"), ["leite"]);
  // Só o alérgico da oração com a marca (ou da lista colada nela) vale; negação não exclui.
  for (const [nota, esperado] of [
    ["um convidado alérgico a leite; os demais adoram pistache", ["leite"]],
    ["um convidado alérgico a leite, os demais adoram pistache", ["leite"]],
    ["não há alergia a amendoim", []],
    ["ninguém tem alergia, as crianças adoram paçoca", []],
    ["alergia: amendoim, castanhas e leite", ["amendoim", "castanhas", "leite"]],
    ["Amendoim e castanhas: alergia grave", ["amendoim", "castanhas"]],
    ["não come glúten porque é celíaca", ["gluten"]],
    ["intolerância à lactose e alergia a amendoim", ["amendoim"]],
  ]) assert.deepEqual(alergiasDasNotas(nota), esperado, nota);
  const EV ={ convidados: 150, tipo: "Mix (gelatos + picolés)", formato: "carrinho" };
  // API fora do ar: a regra responde sem Paçoca nem Snickers e diz por quê.
  const r = await sugerirSaboresEvento({ client: clienteCreate([{ lanca: new Anthropic.APIConnectionError({ message: "fora" }) }]), evento: EV, notas: "um convidado alérgico a amendoim" });
  assert.equal(r.origem, "regra");
  assert.deepEqual(conflitosComAlergias(r, ["amendoim"]), [], "a regra trouxe sabor com amendoim");
  assert.match(r.motivo, /sem amendoim, como você avisou/);
  // Alergia ao leite: não há picolé sem leite; a linha fica vazia e o motivo manda falar com a equipe.
  const l = await sugerirSaboresEvento({ client: clienteCreate([{ lanca: new Anthropic.APIConnectionError({ message: "fora" }) }]), evento: EV, notas: "criança com APLV, alergia a leite" });
  assert.deepEqual(l.picoles, []);
  assert.ok(l.gelatos.length > 0 && conflitosComAlergias(l, ["leite"]).length === 0);
  assert.match(l.motivo, /não há picolé sem esse ingrediente/);
  // A IA escolhe Paçoca mesmo avisada: volta como erro e, sem conserto, sai a regra.
  const c = clienteCreate([
    escolha("a1", { gelatos: ["pacoca", "morango"], picoles: ["bentole-prestigio"], motivo: "Clássicos." }),
    escolha("a2", { gelatos: ["pacoca"], picoles: ["bentole-snickers"], motivo: "Clássicos." }),
  ]);
  const ia = await sugerirSaboresEvento({ client: c, evento: EV, notas: "um convidado alérgico a amendoim" });
  assert.match(c.pedidos[0].messages[0].content, /Alergia avisada: amendoim/);
  assert.match(c.pedidos[1].messages[2].content[0].content, /pacoca contém amendoim/);
  assert.equal(ia.origem, "regra");
  assert.deepEqual(conflitosComAlergias(ia, ["amendoim"]), []);
});

caso("preferência marcada é promessa: a IA não devolve combinação só com lactose nem castanha para criança", async () => {
  const EV = { convidados: 45, tipo: "Mix (gelatos + picolés)", formato: "caixa" };
  // Intolerância à lactose: a primeira escolha, só com lactose, volta como erro; a segunda, com opção sem lactose, passa.
  const c = clienteCreate([
    escolha("a1", { gelatos: ["pistache"], picoles: ["bentole-prestigio", "bentole-snickers"], motivo: "Clássicos." }),
    escolha("a2", { gelatos: ["limao-siciliano"], picoles: ["bentole-framboesa-duo", "bentole-prestigio"], motivo: "Com opção sem lactose." }),
  ]);
  const r = await sugerirSaboresEvento({ client: c, evento: EV, prefs: { semLactose: true } });
  assert.match(c.pedidos[1].messages[2].content[0].content, /sem lactose/);
  assert.equal(r.origem, "ia");
  assert.deepEqual(r.gelatos, ["limao-siciliano"]);
  // Crianças: Paçoca volta como erro; sem conserto, sai a regra, sem castanha nem amendoim.
  const c2 = clienteCreate([
    escolha("b1", { gelatos: ["pacoca"], picoles: ["bentole-prestigio", "bentole-framboesa-duo"], motivo: "Clássicos." }),
    escolha("b2", { gelatos: ["pacoca"], picoles: ["bentole-prestigio", "bentole-framboesa-duo"], motivo: "Clássicos." }),
  ]);
  const k = await sugerirSaboresEvento({ client: c2, evento: EV, prefs: { criancas: true } });
  assert.match(c2.pedidos[1].messages[2].content[0].content, /não é bom para criança/);
  assert.equal(k.origem, "regra");
  assert.ok(k.gelatos.concat(k.picoles).every((id) => saboresEvento().find((x) => x.id === id).crianca));
  // Café também não é para criança, mesmo sem castanha.
  const c3 = clienteCreate([escolha("c1", { gelatos: ["cafe"], picoles: ["bentole-prestigio", "bentole-framboesa-duo"], motivo: "Clássicos." }), escolha("c2", { gelatos: ["cafe"], picoles: ["bentole-prestigio", "bentole-framboesa-duo"], motivo: "Clássicos." })]);
  const k3 = await sugerirSaboresEvento({ client: c3, evento: EV, prefs: { criancas: true } });
  assert.match(c3.pedidos[1].messages[2].content[0].content, /cafe não é bom para criança/);
  assert.equal(k3.origem, "regra");
  // "Sem lactose" marcado e alergia a soja: o único picolé sem lactose (Framboesa Duo) sai, e a
  // regra deixa a linha vazia em vez de devolver um picolé com lactose — na regra e na reserva da IA.
  assert.deepEqual(sugestaoEquilibrada(limiteSabores(45, EV.tipo, "caixa"), { semLactose: true, alergias: ["soja"] }).picoles, []);
  const c4 = clienteCreate([
    escolha("d1", { gelatos: ["limao-siciliano"], picoles: ["bentole-opereta"], motivo: "Sem soja." }),
    escolha("d2", { gelatos: ["limao-siciliano"], picoles: ["bentole-opereta"], motivo: "Sem soja." }),
  ]);
  const s4 = await sugerirSaboresEvento({ client: c4, evento: EV, notas: "um convidado alérgico a soja", prefs: { semLactose: true } });
  assert.match(c4.pedidos[1].messages[2].content[0].content, /nenhum picolé escolhido é sem lactose/);
  assert.equal(s4.origem, "regra");
  assert.deepEqual(s4.picoles, [], "a reserva devolveu picolé com lactose com 'sem lactose' marcado");
  assert.ok(s4.gelatos.length && s4.gelatos.every((id) => saboresEvento().find((x) => x.id === id).semLactose));
  assert.match(s4.motivo, /Não há picolé sem lactose e sem soja no cardápio: a equipe monta essa parte com você/);
  // Só a alergia (sem "sem lactose"): a mensagem de antes continua.
  const s5 = await sugerirSaboresEvento({ client: clienteCreate([{ lanca: new Anthropic.APIConnectionError({ message: "fora" }) }]), evento: EV, notas: "criança com APLV, alergia a leite" });
  assert.match(s5.motivo, /não há picolé sem esse ingrediente/);
});

caso("shake: veredito de leite e lactose olha a proteína E o líquido", () => {
  const acaiLeite = vereditoFoco(saborPorId("shake-acai-banana"), "leite").texto;
  assert.match(acaiLeite, /^Com whey ou com leite A2 integral, contém leite; com proteína vegana e um líquido sem leite, confirme com a equipe$/);
  assert.match(vereditoFoco(saborPorId("shake-acai-banana"), "lactose").texto, /com whey zero lactose ou proteína vegana e um líquido sem leite/);
});

caso("sugestão para festa infantil (sem IA) só traz sabor bom para criança", () => {
  for (const [n, formato] of [[45, "caixa"], [80, "balcao"], [200, "carrinho"]]) {
    const L = limiteSabores(n, "Mix (gelatos + picolés)", formato);
    const r = sugerirSaboresEventoRegra(L);
    for (const id of r.gelatos.concat(r.picoles)) {
      const x = saboresEvento().find((s) => s.id === id);
      assert.ok(x.crianca && !x.nozes, `${id} não é para criança (${formato})`);
    }
  }
});

caso("cota do site só conta pergunta que passou no limite do IP; chave do IP morre na meia-noite", async () => {
  // Upstash falso em memória (só os comandos que a função usa).
  const banco = new Map(), validade = new Map();
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, op) => {
    assert.match(String(url), /\/pipeline$/);
    const res = JSON.parse(op.body).map(([cmd, k, v]) => {
      if (cmd === "INCR") { banco.set(k, (banco.get(k) || 0) + 1); return { result: banco.get(k) }; }
      if (cmd === "EXPIRE") { validade.set(k, Math.floor(Date.now() / 1000) + Number(v)); return { result: 1 }; }
      if (cmd === "EXPIREAT") { validade.set(k, Number(v)); return { result: 1 }; }
      if (cmd === "GET") return { result: banco.has(k) ? String(banco.get(k)) : null };
      throw new Error("comando inesperado " + cmd);
    });
    return new Response(JSON.stringify(res), { status: 200 });
  };
  process.env.KV_REST_API_URL = "https://kv.teste";
  process.env.KV_REST_API_TOKEN = "token-teste";
  try {
    const { limitesEConfig, fimDoDiaSP } = await import("../api/ia.js");
    const r = [];
    for (let i = 0; i < 20; i++) r.push(await limitesEConfig("203.0.113.9"));
    assert.equal(r.filter((x) => x.ok).length, 15, "o limite de rajada por IP mudou");
    assert.ok(r.slice(15).every((x) => x.motivo === "ip"));
    const dia = [...banco.keys()].find((k) => k.startsWith("ia:dia:"));
    assert.equal(banco.get(dia), 15, "pedido recusado pelo IP gastou a cota do site");
    const chaveIp = [...banco.keys()].find((k) => k.startsWith("ia:rldia:"));
    const agora = Math.floor(Date.now() / 1000);
    assert.ok(validade.get(chaveIp) > agora && validade.get(chaveIp) - agora <= 86400, "chave diária do IP vive mais de um dia");
    assert.equal(validade.get(chaveIp), fimDoDiaSP(chaveIp.split(":")[2]));
    assert.equal(fimDoDiaSP("2026-10-08"), Date.parse("2026-10-09T03:00:00Z") / 1000);
  } finally {
    globalThis.fetch = fetchOriginal;
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  }
});

// Depois do caso da cota: api/ia.js lê o banco na importação, e este caso não
// pode chegar nele (para antes, nas checagens de origem e de tipo).
caso("só a própria origem (ou bentogelateria.com) e só JSON chegam à IA", async () => {
  const { default: handler } = await import("../api/ia.js");
  const chamar = async (headers) => {
    const res = {
      statusCode: 0, corpo: null,
      setHeader() {}, writeHead() {}, write() {}, end() {}, on() {},
      status(c) { this.statusCode = c; return this; },
      json(o) { this.corpo = o; return this; },
    };
    await handler({ method: "POST", headers, body: { mensagens: [{ papel: "cliente", texto: "oi" }] } }, res);
    return res.statusCode;
  };
  const json = { "content-type": "application/json" };
  const desligada = process.env.IA_DESLIGADA;
  process.env.IA_DESLIGADA = "1"; // quem passa das checagens para no 503, sem rede
  try {
    // Página qualquer na Vercel (o ataque do Codex): fora.
    assert.equal(await chamar({ ...json, origin: "https://golpe.vercel.app", host: "bentogelateria.com" }), 403);
    assert.equal(await chamar({ ...json, origin: "https://tabelas-nutricionais-x-outro-lexprojects.vercel.app", host: "bentogelateria.com" }), 403);
    assert.equal(await chamar({ ...json, host: "bentogelateria.com" }), 403, "pedido sem origem passou");
    assert.equal(await chamar({ ...json, origin: "null", host: "bentogelateria.com" }), 403);
    // text/plain é pedido "simples" (sem preflight): recusado mesmo da origem certa.
    assert.equal(await chamar({ "content-type": "text/plain", origin: "https://bentogelateria.com", host: "bentogelateria.com" }), 415);
    // Sugestão de sabores com evento malformado: 400 antes de gastar cota.
    const ruim = { statusCode: 0, setHeader() {}, writeHead() {}, write() {}, end() {}, on() {}, status(c) { this.statusCode = c; return this; }, json() { return this; } };
    delete process.env.IA_DESLIGADA; process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "chave-falsa";
    await handler({ method: "POST", headers: { ...json, origin: "https://bentogelateria.com", host: "bentogelateria.com" }, body: { modo: "sabores-evento", evento: { convidados: "muitos" } } }, ruim);
    assert.equal(ruim.statusCode, 400, "sabores-evento malformado não deu 400");
    process.env.IA_DESLIGADA = "1";
    // Site, www, subdomínio nosso, o preview na própria origem e o dev local passam.
    assert.equal(await chamar({ ...json, origin: "https://bentogelateria.com", host: "bentogelateria.com" }), 503);
    assert.equal(await chamar({ ...json, origin: "https://www.bentogelateria.com", "x-forwarded-host": "www.bentogelateria.com", host: "interno" }), 503);
    const preview = "tabelas-nutricionais-git-claude-x-lexprojects.vercel.app";
    assert.equal(await chamar({ ...json, origin: "https://" + preview, "x-forwarded-host": preview }), 503);
    assert.equal(await chamar({ "content-type": "application/json; charset=utf-8", origin: "http://127.0.0.1:4142", host: "127.0.0.1:4142" }), 503);
  } finally {
    if (desligada === undefined) delete process.env.IA_DESLIGADA; else process.env.IA_DESLIGADA = desligada;
  }
});

for (const [nome, fn] of casos) {
  try { await fn(); console.log("PASS · " + nome); }
  catch (e) { falhas++; console.log("FALHA · " + nome + "\n         " + (e && e.message)); }
}
console.log(falhas ? `\n${falhas} FALHA(S)` : "\nBentô IA: todos os casos passaram.");
process.exit(falhas ? 1 : 0);
