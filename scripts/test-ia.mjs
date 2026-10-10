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
  const sabores = PRODUCTS.filter((p) => !(p.category === "bentole" && p.id.endsWith("-g")));
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
    "O Pistache foi preparado com leite.",
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
