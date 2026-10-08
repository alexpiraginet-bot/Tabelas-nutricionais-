// Trava o comportamento da Bentô IA (lib/ia-motor.js) sem chamar a API: um
// cliente falso faz o papel do Claude e o teste confere o que sai para a tela.
//
// O que protege: a IA só mostra card de sabor que existe, nunca publica
// "zero açúcar" nem alegação para a linha inteira (prompt e llms.txt), usa o
// mesmo cálculo do orçamento de eventos, não afirma entrega sem dado do totem
// e manda de volta ao modelo a volta inteira, sem editar (o pensamento do
// Opus 5.5 só vale com o histórico intacto).
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { PRODUCTS, SHAKES } from "../src/data.js";
import { EV_PRECO_PESSOA } from "../src/eventos-regras.js";
import {
  conversar, executarFerramenta, historicoParaMensagens, montarSistema, corrigirAlegacoes,
  filtroAlegacoes, FERRAMENTAS, ErroConversa,
} from "../lib/ia-motor.js";
import { alegacoes, fichaSabor, fatosSabor, saborPorId } from "../src/ia/catalogo.js";
import { montarLlmsTxt } from "./generate-llms-txt.mjs";

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
  const texto = () => ev.filter(([t]) => t === "texto").map(([, d]) => d.t).join("");
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
  // Opus 5.5: texto escrito ENTRE chamadas de ferramenta volta como pensamento
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

caso("alérgicos do shake seguem o líquido: com leite de amêndoas, AMÊNDOA é ingrediente", async () => {
  for (const s of SHAKES) {
    const f = fatosSabor(s);
    for (const r of s.nutrition) {
      const contem = f.alergicos_por_liquido[r.liquid];
      assert.ok(contem && contem.includes("LEITE"), `${s.id} com ${r.liquid}: faltou o LEITE do whey`);
      assert.equal(contem.includes("AMÊNDOA"), /amêndoa/i.test(r.liquid), `${s.id} com ${r.liquid}`);
    }
    if (s.nutrition.some((r) => /amêndoa/i.test(r.liquid))) assert.match(f.alergicos, /com leite de amêndoas, também AMÊNDOA/, s.id);
  }
  // Proteína vegana não tem alérgicos no cadastro: manda confirmar, não supõe.
  assert.match(fatosSabor(saborPorId("shake-acai-banana")).alergicos, /proteína vegana, confirme os alérgicos com a equipe/);
  // Chega ao modelo (ficha), ao prompt e ao llms.txt.
  const r = JSON.parse((await executarFerramenta("ficha_sabor", { id: "shake-choco-power" })).resultado);
  assert.deepEqual(r.alergicos_por_liquido["Leite de amêndoas"], ["LEITE", "AMÊNDOA"]);
  assert.match(montarSistema(), /shake-choco-power \|[^\n]*também AMÊNDOA/);
  assert.match(montarLlmsTxt(), /Shake Choco Power:[^\n]*também amêndoa/);
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
  // Com o totem respondendo, grátis só vale para loja que entrega.
  // Formato real do totem (chaves com underscore, raio em km, prazo e mínimo).
  const r2 = await executarFerramenta("lojas_agora", {}, { agora, carregarEntrega: async () => ({
    praia_do_canto: { entrega: true, gratis: false, raioKm: 7, pedidoMinimo: 60, prazoEntrega: { modo: "prazo", minutos: 25 } },
    jardim_camburi: { entrega: false, gratis: true },
  }) });
  const e2 = JSON.parse(r2.resultado).entrega;
  assert.deepEqual(e2.find((x) => x.id === "praia-do-canto"), { id: "praia-do-canto", entrega: true, gratis: false, raio_km: 7, pedido_minimo: 60, prazo_min: 25 });
  assert.deepEqual(e2.find((x) => x.id === "jardim-camburi"), { id: "jardim-camburi", entrega: false, gratis: false, raio_km: null, pedido_minimo: null, prazo_min: null });
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

caso("'zero açúcar' nunca chega à tela, nem partido entre pedaços", () => {
  assert.equal(corrigirAlegacoes("É zero açúcar."), "É sem adição de açúcares.");
  assert.equal(corrigirAlegacoes("Sem açúcar adicionado"), "Sem adição de açúcares");
  assert.equal(corrigirAlegacoes("Contém açúcares próprios dos ingredientes."), "Contém açúcares próprios dos ingredientes.");
  const f = filtroAlegacoes();
  let s = "";
  for (const d of ["Ele é ze", "ro açú", "car e leve", " demais."]) s += f.push(d);
  s += f.fim();
  assert.equal(s, "Ele é sem adição de açúcares e leve demais.");
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
    { eventos: [{ texto: "Os dois são ótimos no pós-treino e são zero" }, { texto: " açúcar." }],
      final: { stop_reason: "end_turn", content: [{ type: "text", text: "..." }] } },
  ]);
  const g = gravador();
  const uso = await conversar({ client: cliente, mensagens: [{ papel: "cliente", texto: "algo pós-treino?" }], enviar: g.enviar });
  assert.deepEqual(g.ev.filter(([t]) => t === "bloco").map(([, d]) => d), [{ tipo: "sabores", ids: ["pacoca", "bentole-pistache-cb"] }]);
  assert.ok(g.ev.some(([t]) => t === "status"));
  assert.equal(g.texto(), "Os dois são ótimos no pós-treino e são sem adição de açúcares.");
  assert.equal(uso.voltas, 2);
  const [p1, p2] = cliente.pedidos;
  assert.equal(p1.model, "claude-opus-5-5");
  assert.deepEqual(p1.output_config, { effort: "low" });
  assert.equal(p1.fallbacks, "default");
  assert.deepEqual(p1.betas, ["server-side-fallback-2026-07-01"]);
  assert.deepEqual(p1.system[0].cache_control, { type: "ephemeral" });
  assert.equal(p1.thinking, undefined, "Opus 5.5 recusa thinking desligado; não mande o campo");
  // A segunda chamada leva a volta anterior INTEIRA (pensamento + ferramenta) e todos os resultados numa mensagem.
  assert.deepEqual(p2.messages[1], { role: "assistant", content: [pensamento, usoDeFerramenta("t1", "mostrar_sabores", { ids: ["pacoca", "bentole-pistache-cb"] })] });
  assert.equal(p2.messages[2].role, "user");
  assert.equal(p2.messages[2].content[0].tool_use_id, "t1");
  assert.deepEqual(p2.messages.slice(0, 1), p1.messages);
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
