// Contratos de evento: geração pelo painel, assinatura pelo cliente dentro do
// site, e o dossiê de prova guardado por nós.
//
// PROBLEMA QUE ISTO RESOLVE
// Antes, o contrato inteiro viajava dentro da URL (?contrato=<base64>) e a
// página era editável ao vivo. Quer dizer: qualquer pessoa com o link montava um
// contrato com o valor que quisesse, e nada ficava registrado. Assinar aquilo
// não provava nada, porque o texto assinado vinha do próprio signatário.
//
// AGORA o contrato NASCE AQUI, no servidor, antes de existir link. O texto é
// congelado num snapshot, recebe um hash SHA-256, e a partir daí é imutável: o
// link de assinatura carrega o snapshot gravado, nunca dados vindos da URL.
//
// O QUE SUSTENTA A ASSINATURA (do mais forte ao mais fraco)
//   1. snapshot congelado + hash — prova QUAL texto foi assinado;
//   2. hora do SERVIDOR — nunca a do aparelho do cliente, que ele controla;
//   3. IP e navegador de quem assinou;
//   4. trilha de leitura (rolou até o fim? quanto tempo ficou?);
//   5. aceites explícitos e separados, um deles só para o cancelamento.
// A cadeia de eventos é append-only: assinar não altera o contrato, acrescenta
// um evento. Nada aqui apaga ou reescreve o que já foi gravado.
//
// LIMITE HONESTO DESTA FASE: quem tem o link pode assinar. O que amarra a
// assinatura à PESSOA é o código de verificação (OTP) da fase seguinte, que
// depende de um canal de envio que o projeto ainda não tem. Até lá, isto é
// assinatura por posse do link — muito melhor que hoje, e não é o suficiente
// para um contrato de valor alto ser incontestável.
import crypto from "node:crypto";

function findKV() {
  let url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  let token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    for (const k of Object.keys(process.env)) {
      if (!url && /REST_API_URL$/.test(k)) url = process.env[k];
      if (!token && /REST_API_TOKEN$/.test(k) && !/READ_ONLY/.test(k)) token = process.env[k];
    }
  }
  return { url, token };
}
const { url: KV_URL, token: KV_TOKEN } = findKV();
const PANEL_KEY = process.env.PANEL_KEY;

const MAX_CONTRATOS = 2000;      // teto do índice; o documento em si nunca é apagado
const VALIDADE_DIAS = 30;        // depois disso o link não assina mais (mas o contrato fica)

async function kv(args) {
  const r = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  return (await r.json().catch(() => ({}))).result;
}
async function kvPipe(cmds) {
  const r = await fetch(KV_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error("kv " + r.status);
  return r.json();
}

function autorizado(req) {
  const h = req.headers.authorization || "";
  const k = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!k || !PANEL_KEY) return false;
  const a = Buffer.from(String(k)), b = Buffer.from(String(PANEL_KEY));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- saneamento ----------
const texto = (s, max) => {
  let o = "";
  for (const ch of String(s ?? "")) if (ch.codePointAt(0) >= 32) o += ch;
  return o.replace(/[<>]/g, "").trim().slice(0, max);
};
const numero = (v, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
};

// JSON canônico: chaves ordenadas, para o hash ser reprodutível. Sem isto,
// {a,b} e {b,a} — mesmo conteúdo — dariam hashes diferentes e a prova cairia.
function canonico(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonico).join(",") + "]";
  return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonico(v[k])).join(",") + "}";
}
const sha256 = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");
// Compara nomes sem se perder em acento, caixa ou espaço duplo.
const normaliza = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/\s+/g, " ").trim();

// O snapshot é TUDO que o contrato afirma. Depois de gravado, não muda mais:
// o valor não é recalculado na hora de exibir, é lido daqui.
function montaSnapshot(body) {
  const itens = Array.isArray(body.itens) ? body.itens.slice(0, 40).map((i) => ({
    nome: texto(i && i.nome, 120),
    qtd: numero(i && i.qtd, 0, 100000),
    valor: numero(i && i.valor, 0, 10000000),
  })).filter((i) => i.nome) : [];

  const subtotal = numero(body.subtotal, 0, 10000000);
  const desconto = Math.min(subtotal, numero(body.desconto, 0, 10000000));
  const total = Math.round((subtotal - desconto) * 100) / 100;
  // MESMA conta do ContratoPage (Math.round(total/2)). Se aqui e lá divergirem,
  // o documento exibido mostra um valor e o snapshot afirma outro — e é o
  // snapshot que o hash cobre. Duas fórmulas para o mesmo número é bug esperando.
  const entrada = Math.round(total / 2);

  return {
    versao: 1,
    // partes
    nome: texto(body.nome, 160),
    doc: texto(body.doc, 32),
    email: texto(body.email, 160),
    zap: texto(body.zap, 40),
    empresa: texto(body.empresa, 160),
    // evento
    data: texto(body.data, 20),
    local: texto(body.local, 240),
    horario: texto(body.horario, 60),
    convidados: numero(body.convidados, 0, 100000),
    itens,
    // dinheiro — congelado, nunca recalculado na exibição
    subtotal, desconto, descMotivo: texto(body.descMotivo, 120),
    total, entrada, saldo: Math.round((total - entrada) * 100) / 100,
    // subtotal é o que o ContratoPage recebe como `total` (ele aplica o desconto)
    observacoes: texto(body.observacoes, 2000),
    // origem: qual orçamento gerou este contrato. Serve para o dossiê mostrar
    // que o valor assinado é o mesmo que o cliente recebeu no orçamento.
    leadTs: numero(body.leadTs, 0, 1e15) || null,
    // Pagamento ACORDADO. Vazio = vale o padrão 50/50 escrito no contrato.
    // Cliente empresa costuma pagar integral, por depósito, contra nota, com
    // prazo — e o contrato precisa dizer o que foi combinado, não o padrão.
    pagamento: texto(body.pagamento, 1200),
    // Cláusulas negociadas com este cliente, numeradas 6.1, 6.2… no documento.
    clausulas: Array.isArray(body.clausulas) ? body.clausulas.slice(0, 12).map((c) => ({
      titulo: texto(c && c.titulo, 80),
      texto: texto(c && c.texto, 1800),
    })).filter((c) => c.texto) : [],
  };
}

// Uma versão ASSINÁVEL nascida de um contrato que já existe. São dois casos, e a
// diferença entre eles importa:
//
//  · contrato VIVO (aguardando / ajuste-pedido) — o novo SUBSTITUI o anterior:
//    a versão antiga é encerrada e o link dela morre. Dois textos assináveis do
//    mesmo contrato circulando é o começo de uma discussão sobre qual valia.
//  · contrato de HISTÓRICO (importado) — o registro antigo FICA COMO ESTÁ. Ele é
//    a prova do que já existia; virar rascunho do que está sendo negociado agora
//    apagaria justamente o histórico que a importação existiu para criar. O novo
//    nasce derivado dele, e o antigo só ganha o apontamento.
function derivar(antigo, ajustes, req) {
  const base = antigo.snapshot;
  const a = ajustes || {};
  // Texto vazio vindo do ajuste é tratado como "não mexeu", nunca como "apague".
  // A IA recebe o pagamento atual e é instruída a manter o que não foi pedido;
  // se ainda assim devolver vazio, ela ESQUECEU — e apagar em silêncio uma
  // condição de pagamento já acordada é bem pior que ignorar a omissão.
  const snapshot = montaSnapshot({
    ...base,
    subtotal: base.subtotal, desconto: base.desconto,
    pagamento: texto(a.pagamento, 1200) || base.pagamento,
    clausulas: Array.isArray(a.clausulas) && a.clausulas.length ? a.clausulas : base.clausulas,
  });
  const historico = antigo.status === "importado";
  const agora = new Date();
  const em = agora.toISOString();
  const token = crypto.randomBytes(32).toString("base64url");
  const novo = {
    id: crypto.randomBytes(9).toString("base64url"),
    criadoEm: em,
    expiraEm: agora.getTime() + VALIDADE_DIAS * 86400000,
    status: "aguardando",
    snapshot,
    hash: sha256(canonico(snapshot)),
    tokenHash: sha256(token),
    versao: historico ? 1 : (antigo.versao || 1) + 1,
  };
  if (historico) novo.derivadoDe = antigo.id;
  else novo.substitui = antigo.id;

  const cmds = [
    ["SET", "contrato:" + novo.id, JSON.stringify(novo)],
    ["SET", "contrato:tok:" + novo.tokenHash, novo.id],
    ["EXPIRE", "contrato:tok:" + novo.tokenHash, VALIDADE_DIAS * 86400],
    ["LPUSH", "contratos", novo.id],
    ["LTRIM", "contratos", 0, MAX_CONTRATOS - 1],
    ["RPUSH", "contrato:" + novo.id + ":eventos", JSON.stringify({
      tipo: "criacao", em, ip: ip(req), hash: novo.hash,
      nota: historico
        ? "versão assinável gerada a partir do contrato de histórico " + antigo.id
        : "versão " + novo.versao + ", substitui " + antigo.id,
    })],
  ];
  if (historico) {
    cmds.push(["SET", "contrato:" + antigo.id, JSON.stringify({
      ...antigo, derivados: [...(antigo.derivados || []), novo.id],
    })]);
    cmds.push(["RPUSH", "contrato:" + antigo.id + ":eventos", JSON.stringify({
      tipo: "derivacao", em, paraContrato: novo.id,
      nota: "gerada versão assinável; este registro de histórico permanece inalterado",
    })]);
  } else {
    cmds.push(["SET", "contrato:" + antigo.id, JSON.stringify({ ...antigo, status: "substituido", substituidoPor: novo.id })]);
    cmds.push(["RPUSH", "contrato:" + antigo.id + ":eventos", JSON.stringify({ tipo: "substituicao", em, porContrato: novo.id })]);
    if (antigo.tokenHash) cmds.push(["DEL", "contrato:tok:" + antigo.tokenHash]);
  }
  return { novo, token, cmds, historico };
}

// A contra-assinatura mora em CHAVE PRÓPRIA, fora do documento do contrato — ver
// a ação "assinar-contratada" para o porquê.
const chaveContratada = (id) => "contrato:" + id + ":contratada";
const leContratada = (v) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };

const ip = (req) => texto((req.headers["x-forwarded-for"] || "").split(",")[0] || "", 64);
const ua = (req) => texto(req.headers["user-agent"] || "", 300);

function corpo(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  return b && typeof b === "object" ? b : {};
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ ok: false, error: "Banco não configurado." }); return; }

  // ---------- painel: lista e detalhe ----------
  if (req.method === "GET" && (req.query.listar !== undefined || req.query.id)) {
    if (!autorizado(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
    if (req.query.id) {
      const id = texto(req.query.id, 40);
      const [doc, eventos, contratada] = await Promise.all([
        kv(["GET", "contrato:" + id]),
        kv(["LRANGE", "contrato:" + id + ":eventos", 0, 200]),
        kv(["GET", chaveContratada(id)]),
      ]);
      if (!doc) { res.status(404).json({ ok: false, error: "Contrato não encontrado." }); return; }
      const c = JSON.parse(doc);
      delete c.tokenHash;   // nunca sai daqui, nem para o painel
      c.assinaturaContratada = leContratada(contratada);
      res.status(200).json({ ok: true, contrato: c, eventos: (eventos || []).map((e) => JSON.parse(e)) });
      return;
    }
    const ids = (await kv(["LRANGE", "contratos", 0, 199])) || [];
    if (!ids.length) { res.status(200).json({ ok: true, contratos: [] }); return; }
    // Duas leituras por contrato, uma viagem só: a lista precisa mostrar quem
    // ainda está esperando a assinatura da Bentô sem abrir dossiê por dossiê.
    const rs = await kvPipe(ids.flatMap((i) => [["GET", "contrato:" + i], ["GET", chaveContratada(i)]]));
    const contratos = [];
    ids.forEach((_, n) => {
      let c = null;
      try { c = JSON.parse(rs[n * 2].result); } catch { c = null; }
      if (!c || !c.snapshot) return;
      contratos.push({ id: c.id, criadoEm: c.criadoEm, status: c.status, hash: c.hash,
                       nome: c.snapshot.nome, data: c.snapshot.data, total: c.snapshot.total,
                       assinadoEm: c.assinadoEm || null,
                       contratada: !!leContratada(rs[n * 2 + 1].result) });
    });
    res.status(200).json({ ok: true, contratos });
    return;
  }

  // ---------- cliente: abre o contrato pelo token ----------
  if (req.method === "GET" && req.query.t) {
    const token = texto(req.query.t, 64);
    const id = await kv(["GET", "contrato:tok:" + sha256(token)]);
    if (!id) { res.status(404).json({ ok: false, error: "Link inválido ou expirado." }); return; }
    const [doc, contratada] = await Promise.all([kv(["GET", "contrato:" + id]), kv(["GET", chaveContratada(id)])]);
    if (!doc) { res.status(404).json({ ok: false, error: "Contrato não encontrado." }); return; }
    const c = JSON.parse(doc);
    const expirado = Date.now() > c.expiraEm;
    // registra a abertura — faz parte da trilha
    await kv(["RPUSH", "contrato:" + id + ":eventos", JSON.stringify({
      tipo: "abertura", em: new Date().toISOString(), ip: ip(req), ua: ua(req),
    })]).catch(() => {});
    res.status(200).json({
      ok: true, id: c.id, snapshot: c.snapshot, hash: c.hash,
      status: c.status, expirado, assinadoEm: c.assinadoEm || null,
      assinatura: c.assinatura || null,
      // O cliente vê que a Bentô já conferiu e assinou: é o que a cláusula 9ª
      // promete, e sem isto a promessa ficava só no texto.
      assinaturaContratada: leContratada(contratada),
    });
    return;
  }

  if (req.method !== "POST") { res.status(405).end(); return; }
  const body = corpo(req);

  // ---------- painel: cria o contrato ----------
  if (body.acao === "criar") {
    if (!autorizado(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
    const snapshot = montaSnapshot(body);
    if (!snapshot.nome || !snapshot.total) {
      res.status(400).json({ ok: false, error: "Contrato precisa ao menos de nome do contratante e valor total." });
      return;
    }
    const id = crypto.randomBytes(9).toString("base64url");        // 12 chars
    const token = crypto.randomBytes(32).toString("base64url");    // 43 chars, ~256 bits
    const agora = new Date();
    const doc = {
      id,
      criadoEm: agora.toISOString(),
      expiraEm: agora.getTime() + VALIDADE_DIAS * 86400000,
      status: "aguardando",
      snapshot,
      // o hash cobre o snapshot inteiro: muda uma vírgula, muda o hash
      hash: sha256(canonico(snapshot)),
      tokenHash: sha256(token),   // o token cru NUNCA é gravado
    };
    await kvPipe([
      ["SET", "contrato:" + id, JSON.stringify(doc)],
      ["SET", "contrato:tok:" + doc.tokenHash, id],
      // TTL no índice: vencido o prazo, o token deixa de LER o snapshot também.
      // Sem isto, `expiraEm` só barrava a assinatura e os dados do cliente
      // continuavam acessíveis por quem tivesse o link antigo.
      ["EXPIRE", "contrato:tok:" + doc.tokenHash, VALIDADE_DIAS * 86400],
      ["LPUSH", "contratos", id],
      ["LTRIM", "contratos", 0, MAX_CONTRATOS - 1],
      ["RPUSH", "contrato:" + id + ":eventos", JSON.stringify({
        tipo: "criacao", em: agora.toISOString(), ip: ip(req), hash: doc.hash,
      })],
    ]);
    res.status(200).json({ ok: true, id, hash: doc.hash, token, expiraEm: doc.expiraEm });
    return;
  }

  // ---------- cliente: pede ajuste antes de assinar ----------
  // Sem isto, quem discorda de uma cláusula só tem o WhatsApp — e o pedido se
  // perde fora do registro. Aqui ele fica anexado ao contrato, com hora e IP:
  // se depois houver discussão, está gravado o que o cliente pediu e quando.
  // NÃO altera nada sozinho: só marca o contrato como "ajuste pedido" e avisa a
  // equipe. Quem decide e quem aprova é gente.
  if (body.acao === "pedir-ajuste") {
    const token = texto(body.token, 64);
    const pedido = texto(body.pedido, 2000);
    if (!token || pedido.length < 5) { res.status(400).json({ ok: false, error: "Descreva o que precisa mudar." }); return; }
    const id = await kv(["GET", "contrato:tok:" + sha256(token)]);
    if (!id) { res.status(404).json({ ok: false, error: "Link inválido ou expirado." }); return; }
    const doc = await kv(["GET", "contrato:" + id]);
    if (!doc) { res.status(404).json({ ok: false, error: "Contrato não encontrado." }); return; }
    const c = JSON.parse(doc);
    if (c.status === "assinado") { res.status(409).json({ ok: false, error: "Este contrato já foi assinado." }); return; }
    const em = new Date().toISOString();
    await kvPipe([
      ["SET", "contrato:" + id, JSON.stringify({ ...c, status: "ajuste-pedido", ajustePedido: { em, pedido } })],
      ["RPUSH", "contrato:" + id + ":eventos", JSON.stringify({ tipo: "pedido-ajuste", em, pedido, ip: ip(req), ua: ua(req) })],
    ]);
    res.status(200).json({ ok: true, em });
    return;
  }

  // ---------- painel: reemite o link de assinatura ----------
  // O token só existe hasheado, de propósito — ninguém recupera o link antigo,
  // nem quem tem acesso ao banco. O efeito colateral é que, perdido o link, o
  // contrato ficava preso: registrado, aguardando, e sem meio de ser enviado.
  //
  // Reemitir gera um token NOVO para o MESMO contrato. O documento não muda e o
  // hash continua o mesmo — é a prova de que o texto é o mesmo. O link anterior
  // morre na hora, então um link vazado ou mandado para a pessoa errada se
  // resolve por aqui.
  if (body.acao === "novo-link") {
    if (!autorizado(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
    const id = texto(body.id, 40);
    const doc = await kv(["GET", "contrato:" + id]);
    if (!doc) { res.status(404).json({ ok: false, error: "Contrato não encontrado." }); return; }
    const c = JSON.parse(doc);
    if (c.status === "assinado") { res.status(409).json({ ok: false, error: "Este contrato já foi assinado — não precisa de link." }); return; }
    if (c.status === "substituido") { res.status(409).json({ ok: false, error: "Esta versão foi substituída. Use a versão nova." }); return; }
    // Contrato de histórico nunca teve link — mas recusar aqui deixava a equipe
    // sem saída justamente quando ela queria o óbvio: reaproveitar um contrato
    // antigo. Em vez de negar, GERA a versão assinável e devolve o link dela.
    // O registro importado continua intocado; quem assina é a versão nova.
    if (c.status === "importado") {
      const d = derivar(c, null, req);
      await kvPipe(d.cmds);
      res.status(200).json({ ok: true, token: d.token, id: d.novo.id, hash: d.novo.hash, derivado: true, de: c.id });
      return;
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const agora = new Date();
    const cmds = [
      ["SET", "contrato:" + id, JSON.stringify({
        ...c, tokenHash: sha256(token),
        expiraEm: agora.getTime() + VALIDADE_DIAS * 86400000,   // o prazo reconta
      })],
      ["SET", "contrato:tok:" + sha256(token), id],
      ["EXPIRE", "contrato:tok:" + sha256(token), VALIDADE_DIAS * 86400],
      ["RPUSH", "contrato:" + id + ":eventos", JSON.stringify({
        tipo: "novo-link", em: agora.toISOString(), ip: ip(req),
        nota: "link reemitido; o anterior deixou de valer",
      })],
    ];
    if (c.tokenHash) cmds.push(["DEL", "contrato:tok:" + c.tokenHash]);
    await kvPipe(cmds);
    res.status(200).json({ ok: true, token, hash: c.hash });
    return;
  }

  // ---------- painel: motor de IA propõe o ajuste (NÃO aplica) ----------
  // Regra que não se negocia: a IA só redige TEXTO de pagamento e de cláusulas.
  // Ela nunca encosta em valor, data, nome ou CPF — esses vêm do orçamento. E a
  // proposta volta para a tela; quem grava o contrato é a equipe, num segundo
  // clique. Contrato assinado não entra aqui de jeito nenhum.
  if (body.acao === "ia-propor") {
    if (!autorizado(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
    const id = texto(body.id, 40);
    const instrucao = texto(body.instrucao, 2000);
    if (!id || instrucao.length < 3) { res.status(400).json({ ok: false, error: "Diga o que deve mudar." }); return; }
    const doc = await kv(["GET", "contrato:" + id]);
    if (!doc) { res.status(404).json({ ok: false, error: "Contrato não encontrado." }); return; }
    const c = JSON.parse(doc);
    // O estado do contrato é checado ANTES da chave da IA, de propósito: para
    // quem está com uma versão morta na tela, "esta versão foi substituída" é a
    // resposta útil; "configure a ANTHROPIC_API_KEY" manda arrumar a coisa errada.
    if (c.status === "assinado") { res.status(409).json({ ok: false, error: "Contrato assinado não pode ser alterado." }); return; }
    // Recusar só na hora de APLICAR era cruel: a equipe escrevia a instrução,
    // esperava a IA redigir, aprovava — e só então descobria que aquela versão
    // estava morta. O "não" tem de vir antes do trabalho, não depois.
    if (c.status === "substituido") { res.status(409).json({ ok: false, error: "Esta versão já foi substituída. Ajuste a versão atual." }); return; }
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({ ok: false, error: "Configure ANTHROPIC_API_KEY na Vercel para usar o ajuste por IA." });
      return;
    }

    const atual = {
      pagamento: c.snapshot.pagamento || "(padrão: 50% na assinatura, 50% até 7 dias antes do evento, via Pix)",
      clausulas: c.snapshot.clausulas || [],
      total: c.snapshot.total, entrada: c.snapshot.entrada, saldo: c.snapshot.saldo,
      cliente: c.snapshot.nome, evento: c.snapshot.data,
    };
    const sistema = [
      "Você redige cláusulas de contrato de prestação de serviço de buffet de gelato, no Brasil, para a ABB Gelateria (Bentô).",
      "Devolve SOMENTE JSON, sem cercas de código, no formato:",
      '{"pagamento":"<texto da cláusula de pagamento>","clausulas":[{"titulo":"<TÍTULO CURTO EM MAIÚSCULAS>","texto":"<texto>"}],"resumo":"<o que você mudou, em 1-2 frases>","alertas":["<risco jurídico ou comercial, se houver>"]}',
      "REGRAS ABSOLUTAS:",
      "1. NUNCA invente ou altere valores em reais, datas do evento, nomes ou documentos. Se a instrução pedir isso, ignore e registre em alertas.",
      "2. Escreva em português do Brasil, tom formal de contrato, direto, sem floreio.",
      "3. Se a instrução criar risco (ex.: renunciar a garantia do consumidor, prazo abusivo), redija assim mesmo mas AVISE em alertas.",
      "4. Se a instrução for vaga demais para virar cláusula, devolva pagamento/clausulas inalterados e explique em alertas.",
      "5. Mantenha as cláusulas existentes que a instrução não mandou mudar.",
    ].join("\n");
    const prompt = [
      "CONTRATO ATUAL (só as partes que você pode mexer):",
      JSON.stringify(atual, null, 2),
      "",
      "INSTRUÇÃO DA EQUIPE:",
      instrucao,
    ].join("\n");

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-8", max_tokens: 3000, system: sistema,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const j = await r.json();
      const txt = (((j.content || [])[0] || {}).text || "").trim().replace(/^```(?:json)?|```$/g, "").trim();
      let proposta;
      try { proposta = JSON.parse(txt); } catch { proposta = null; }
      if (!proposta || typeof proposta !== "object") {
        res.status(200).json({ ok: false, error: "A IA não devolveu um ajuste utilizável. Tente reescrever a instrução." });
        return;
      }
      // Sanea a proposta ANTES de mostrar: o que volta da IA é texto de fora.
      res.status(200).json({
        ok: true,
        proposta: {
          pagamento: texto(proposta.pagamento, 1200),
          clausulas: Array.isArray(proposta.clausulas) ? proposta.clausulas.slice(0, 12).map((x) => ({
            titulo: texto(x && x.titulo, 80), texto: texto(x && x.texto, 1800),
          })).filter((x) => x.texto) : [],
          resumo: texto(proposta.resumo, 400),
          alertas: Array.isArray(proposta.alertas) ? proposta.alertas.slice(0, 6).map((a) => texto(a, 300)).filter(Boolean) : [],
        },
      });
    } catch (e) {
      res.status(502).json({ ok: false, error: "Falha ao falar com a IA: " + String(e.message || e).slice(0, 120) });
    }
    return;
  }

  // ---------- painel: aplica o ajuste gerando uma VERSÃO NOVA ----------
  // Não edita o contrato no lugar: cria outro, com hash e link próprios, e
  // aponta para o anterior. O texto que o cliente viu ontem continua existindo —
  // é isso que permite dizer, depois, o que foi proposto e o que foi aceito.
  //
  // Contrato de histórico (importado) também passa por aqui: a IA propunha o
  // ajuste e a aplicação recusava, então o ajuste morria na tela e nenhum link
  // saía. Agora ele vira uma versão assinável nova, e o registro antigo fica.
  if (body.acao === "aplicar-ajuste") {
    if (!autorizado(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
    const id = texto(body.id, 40);
    const doc = await kv(["GET", "contrato:" + id]);
    if (!doc) { res.status(404).json({ ok: false, error: "Contrato não encontrado." }); return; }
    const antigo = JSON.parse(doc);
    if (antigo.status === "assinado") { res.status(409).json({ ok: false, error: "Contrato assinado não pode ser alterado." }); return; }
    // Partir de versão morta ressuscitaria texto antigo ou criaria dois ramos
    // assináveis do mesmo contrato.
    if (antigo.status === "substituido") { res.status(409).json({ ok: false, error: "Esta versão já foi substituída. Ajuste a versão atual." }); return; }

    // Dinheiro e partes vêm SEMPRE do contrato anterior, nunca do que chegou no
    // corpo. Só pagamento e cláusulas podem mudar.
    const d = derivar(antigo, { pagamento: body.pagamento, clausulas: body.clausulas }, req);
    await kvPipe(d.cmds);
    res.status(200).json({ ok: true, id: d.novo.id, token: d.token, hash: d.novo.hash,
                           versao: d.novo.versao, derivado: d.historico, de: d.historico ? antigo.id : undefined });
    return;
  }

  // ---------- painel: a CONTRATADA assina (contra-assinatura da Bentô) ----------
  // O documento SEMPRE disse que as duas partes assinam, e a cláusula 9ª chega a
  // descrever a ordem — só que quem tinha como assinar era o cliente, sozinho.
  // Instrumento de prova que afirma uma coisa e registra outra é pior do que um
  // que não afirma nada: a primeira coisa que a outra parte faz numa disputa é
  // apontar a diferença.
  //
  // Grava em CHAVE PRÓPRIA, fora do documento do contrato, e não por capricho:
  // se as duas assinaturas escrevessem no mesmo registro, uma contra-assinatura
  // feita no painel no mesmo instante em que o cliente assina sobrescreveria a
  // assinatura dele com uma leitura velha — apagando justamente a prova que
  // interessa. Chaves separadas não colidem, e o SETNX ainda garante uma só.
  if (body.acao === "assinar-contratada") {
    if (!autorizado(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
    const id = texto(body.id, 40);
    const porNome = texto(body.porNome, 160);
    const porCargo = texto(body.porCargo, 80) || "Representante legal";
    if (porNome.length < 3) { res.status(400).json({ ok: false, error: "Diga quem está assinando pela Bentô." }); return; }
    const doc = await kv(["GET", "contrato:" + id]);
    if (!doc) { res.status(404).json({ ok: false, error: "Contrato não encontrado." }); return; }
    const c = JSON.parse(doc);
    if (c.status === "substituido") { res.status(409).json({ ok: false, error: "Esta versão foi substituída — assine a versão atual." }); return; }
    if (c.status === "importado") { res.status(409).json({ ok: false, error: "Contrato de histórico não recebe assinatura aqui. Gere a versão assinável e assine nela." }); return; }
    // Assinar é declarar que se conferiu ESTE texto. Se a tela estava velha, o
    // que a pessoa leu não é o que está gravado — e a assinatura cobriria outro
    // documento. Mesma trava que o cliente tem.
    const hashVisto = texto(body.hashVisto, 80);
    if (hashVisto && hashVisto !== c.hash) {
      res.status(409).json({ ok: false, error: "O contrato mudou desde que esta tela abriu. Recarregue e confira de novo." });
      return;
    }
    const em = new Date().toISOString();      // hora do SERVIDOR, como a do cliente
    const assinatura = { em, porNome, porCargo, ip: ip(req), ua: ua(req), hashAssinado: c.hash, via: "painel" };
    const primeiro = await kv(["SETNX", chaveContratada(id), JSON.stringify(assinatura)]);
    if (Number(primeiro) !== 1) { res.status(409).json({ ok: false, error: "Este contrato já foi assinado pela CONTRATADA." }); return; }
    await kv(["RPUSH", "contrato:" + id + ":eventos", JSON.stringify({ tipo: "assinatura-contratada", ...assinatura })]).catch(() => {});
    res.status(200).json({ ok: true, em, porNome, porCargo });
    return;
  }

  // ---------- painel: importa contratos já emitidos pelo caminho antigo ----------
  // Os contratos anteriores viviam só no link ?contrato=<base64> guardado no
  // lead: nunca foram registrados. Trazê-los para cá dá histórico à aba sem
  // FINGIR que foram assinados aqui — entram com status "importado" e SEM link
  // de assinatura. Se a equipe quiser colher assinatura de um deles, gera um
  // contrato novo pelo orçamento; este fica como registro do que já existia.
  if (body.acao === "importar") {
    if (!autorizado(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
    const lista = Array.isArray(body.leads) ? body.leads.slice(0, 200) : [];
    if (!lista.length) { res.status(400).json({ ok: false, error: "Nada para importar." }); return; }

    // já importados antes? não duplica
    const jaVistos = new Set(((await kv(["LRANGE", "contratos:importados", 0, 4999])) || []).map(String));
    const novos = [];
    for (const l of lista) {
      const ts = String(numero(l && l.leadTs, 0, 1e15) || 0);
      if (!ts || ts === "0" || jaVistos.has(ts)) continue;
      const snapshot = montaSnapshot({ ...l, leadTs: ts });
      if (!snapshot.nome || !snapshot.total) continue;
      const id = crypto.randomBytes(9).toString("base64url");
      const criadoEm = new Date(Number(ts)).toISOString();
      novos.push({
        id, criadoEm, expiraEm: 0,
        status: "importado",           // nunca "aguardando": não há link para assinar
        snapshot, hash: sha256(canonico(snapshot)),
      });
      jaVistos.add(ts);
    }
    // Devolve SEMPRE a contagem completa. "0 importados" pode significar coisas
    // muito diferentes — tudo já registrado, ou tudo sem nome/valor — e sem
    // discriminar isso o painel só sabia dizer "não deu", que não ajuda ninguém.
    const jaRegistrados = lista.filter((l) => {
      const ts = String(numero(l && l.leadTs, 0, 1e15) || 0);
      return ts !== "0" && !novos.some((c) => String(c.snapshot.leadTs) === ts);
    }).length;
    const semDados = lista.filter((l) => !texto(l && l.nome, 160) || !numero(l && l.subtotal, 0, 1e7)).length;
    if (!novos.length) {
      res.status(200).json({ ok: true, importados: 0, recebidos: lista.length, jaRegistrados, semDados });
      return;
    }

    const cmds = [];
    for (const c of novos) {
      cmds.push(["SET", "contrato:" + c.id, JSON.stringify(c)]);
      cmds.push(["LPUSH", "contratos", c.id]);
      cmds.push(["RPUSH", "contratos:importados", String(c.snapshot.leadTs)]);
      cmds.push(["RPUSH", "contrato:" + c.id + ":eventos", JSON.stringify({
        tipo: "importacao", em: new Date().toISOString(), ip: ip(req),
        nota: "emitido pelo fluxo antigo (link em base64), sem registro de assinatura",
      })]);
    }
    cmds.push(["LTRIM", "contratos", 0, MAX_CONTRATOS - 1]);
    await kvPipe(cmds);
    res.status(200).json({ ok: true, importados: novos.length, recebidos: lista.length, jaRegistrados, semDados });
    return;
  }

  // ---------- cliente: assina ----------
  if (body.acao === "assinar") {
    const token = texto(body.token, 64);
    if (!token) { res.status(400).json({ ok: false, error: "Link inválido." }); return; }
    const id = await kv(["GET", "contrato:tok:" + sha256(token)]);
    if (!id) { res.status(404).json({ ok: false, error: "Link inválido ou expirado." }); return; }
    const doc = await kv(["GET", "contrato:" + id]);
    if (!doc) { res.status(404).json({ ok: false, error: "Contrato não encontrado." }); return; }
    const c = JSON.parse(doc);

    // Assinado é assinado: não se assina de novo, não se sobrescreve.
    if (c.status === "assinado") { res.status(409).json({ ok: false, error: "Este contrato já foi assinado." }); return; }
    // A tela diz ao cliente que o link "fica parado" enquanto o ajuste é
    // analisado. Se a API deixasse assinar assim mesmo, seria promessa quebrada —
    // e ele assinaria justamente o texto que contestou.
    if (c.status === "ajuste-pedido") { res.status(409).json({ ok: false, error: "Você pediu um ajuste neste contrato. Nossa equipe está analisando e envia a versão nova." }); return; }
    if (c.status === "substituido") { res.status(409).json({ ok: false, error: "Esta versão foi substituída. Peça o link atualizado à equipe." }); return; }
    // O token que resolveu tem de ser o token ATUAL. Sem esta comparação, uma
    // reemissão concorrente poderia deixar um link revogado ainda assinando.
    if (sha256(token) !== c.tokenHash) { res.status(409).json({ ok: false, error: "Este link foi substituído. Peça o link atual à equipe." }); return; }
    if (Date.now() > c.expiraEm) { res.status(410).json({ ok: false, error: "Este link expirou. Peça um novo à equipe." }); return; }

    // Aceites separados: o do conteúdo e o da cláusula de cancelamento. Um "li e
    // aceito" genérico não rebate o "não foi isso que eu aceitei".
    if (body.aceiteConteudo !== true || body.aceiteCancelamento !== true) {
      res.status(400).json({ ok: false, error: "É preciso marcar os dois aceites." });
      return;
    }
    const nomeDigitado = texto(body.nomeDigitado, 160);
    if (nomeDigitado.length < 3) { res.status(400).json({ ok: false, error: "Digite seu nome completo." }); return; }

    // O cliente confirma o hash que ele viu. Se não bater com o gravado, alguém
    // mexeu no caminho — recusa em vez de registrar assinatura de outro texto.
    if (texto(body.hashVisto, 80) !== c.hash) {
      res.status(409).json({ ok: false, error: "O contrato mudou desde que você abriu. Recarregue a página." });
      return;
    }

    const em = new Date().toISOString();   // hora do SERVIDOR, sempre
    const assinatura = {
      em, nomeDigitado,
      ip: ip(req), ua: ua(req),
      aceiteConteudo: true, aceiteCancelamento: true,
      // trilha declarada pelo cliente: vale como indício, não como prova dura —
      // por isso fica marcada como "informado pelo navegador".
      leitura: {
        rolouAteOFim: body.rolouAteOFim === true,
        segundosNaPagina: numero(body.segundosNaPagina, 0, 86400),
        tela: texto(body.tela, 24),
        fuso: texto(body.fuso, 60),
        origem: "informado pelo navegador",
      },
      hashAssinado: c.hash,
      // Guardamos o nome ESPERADO junto do digitado. Exigir igualdade seria
      // hostil (abreviação, nome de casada), mas a divergência precisa ser
      // visível: é ela que levanta a pergunta certa numa disputa.
      nomeEsperado: c.snapshot.nome || "",
      nomeConfere: normaliza(nomeDigitado) === normaliza(c.snapshot.nome || ""),
    };
    // Portão ATÔMICO contra assinatura simultânea: DEL devolve 1 só para quem
    // chegou primeiro. Checar o status e depois gravar seria uma janela em que
    // duas requisições passariam pelas duas leituras antes de qualquer escrita.
    const portao = await kv(["DEL", "contrato:tok:" + c.tokenHash]);
    if (Number(portao) !== 1) { res.status(409).json({ ok: false, error: "Este contrato acabou de ser assinado ou o link foi substituído." }); return; }

    const atualizado = { ...c, status: "assinado", assinadoEm: em, assinatura };
    await kvPipe([
      ["SET", "contrato:" + id, JSON.stringify(atualizado)],
      ["RPUSH", "contrato:" + id + ":eventos", JSON.stringify({ tipo: "assinatura", ...assinatura })],
    ]);
    res.status(200).json({ ok: true, assinadoEm: em, hash: c.hash });
    return;
  }

  res.status(400).json({ ok: false, error: "Ação desconhecida." });
}
