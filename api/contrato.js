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
  };
}

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
      const [doc, eventos] = await Promise.all([kv(["GET", "contrato:" + id]), kv(["LRANGE", "contrato:" + id + ":eventos", 0, 200])]);
      if (!doc) { res.status(404).json({ ok: false, error: "Contrato não encontrado." }); return; }
      const c = JSON.parse(doc);
      delete c.tokenHash;   // nunca sai daqui, nem para o painel
      res.status(200).json({ ok: true, contrato: c, eventos: (eventos || []).map((e) => JSON.parse(e)) });
      return;
    }
    const ids = (await kv(["LRANGE", "contratos", 0, 199])) || [];
    if (!ids.length) { res.status(200).json({ ok: true, contratos: [] }); return; }
    const docs = await kvPipe(ids.map((i) => ["GET", "contrato:" + i]));
    const contratos = docs.map((d) => { try { return JSON.parse(d.result); } catch { return null; } })
      .filter(Boolean)
      .map((c) => ({ id: c.id, criadoEm: c.criadoEm, status: c.status, hash: c.hash,
                     nome: c.snapshot.nome, data: c.snapshot.data, total: c.snapshot.total,
                     assinadoEm: c.assinadoEm || null }));
    res.status(200).json({ ok: true, contratos });
    return;
  }

  // ---------- cliente: abre o contrato pelo token ----------
  if (req.method === "GET" && req.query.t) {
    const token = texto(req.query.t, 64);
    const id = await kv(["GET", "contrato:tok:" + sha256(token)]);
    if (!id) { res.status(404).json({ ok: false, error: "Link inválido ou expirado." }); return; }
    const doc = await kv(["GET", "contrato:" + id]);
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
      ["LPUSH", "contratos", id],
      ["LTRIM", "contratos", 0, MAX_CONTRATOS - 1],
      ["RPUSH", "contrato:" + id + ":eventos", JSON.stringify({
        tipo: "criacao", em: agora.toISOString(), ip: ip(req), hash: doc.hash,
      })],
    ]);
    res.status(200).json({ ok: true, id, hash: doc.hash, token, expiraEm: doc.expiraEm });
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
    };
    const atualizado = { ...c, status: "assinado", assinadoEm: em, assinatura };
    await kvPipe([
      ["SET", "contrato:" + id, JSON.stringify(atualizado)],
      ["RPUSH", "contrato:" + id + ":eventos", JSON.stringify({ tipo: "assinatura", ...assinatura })],
      ["DEL", "contrato:tok:" + c.tokenHash],   // link de uso único: assinou, queima
    ]);
    res.status(200).json({ ok: true, assinadoEm: em, hash: c.hash });
    return;
  }

  res.status(400).json({ ok: false, error: "Ação desconhecida." });
}
