// Com o banco fora do ar, a captura NÃO pode sumir.
//
// POR QUE ESTE ARQUIVO EXISTE: em 08/08/2026 o Redis passou a recusar comandos
// por cota. Todo formulário do site — orçamento de evento, pré-venda, vaga,
// seja-Bentô — gravava no banco PRIMEIRO e avisava no Telegram DEPOIS. Com o
// banco recusando, o erro caía no catch de fora, a resposta saía 204 (sucesso)
// e o contato sumia dos dois lugares. O cliente achava que tinha mandado, e
// ninguém nunca soube que ele existiu.
//
// O que este teste trava: com o banco recusando TUDO, o aviso ainda sai, e sai
// com o alerta de que não foi gravado.
import http from "node:http";
import net from "node:net";

const ok = (c, m) => console.log((c ? "PASS" : "FALHA") + " · " + m);
const porta = () => new Promise((r) => {
  const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); });
});

// Redis que aceita tudo, ou que recusa tudo — a chave do teste.
let RECUSANDO = false;
const gravados = [];
const pKV = await porta();
const kv = http.createServer((q, s) => {
  let b = ""; q.on("data", (c) => (b += c)); q.on("end", () => {
    if (RECUSANDO) {
      s.statusCode = 400; s.setHeader("content-type", "application/json");
      s.end(JSON.stringify({ error: "ERR max requests limit exceeded. Limit: 500000, Usage: 500000" }));
      return;
    }
    const corpo = JSON.parse(b || "[]");
    const pipeline = q.url.includes("/pipeline");
    // guarda o que foi gravado: é como o teste confere o que chega no painel
    for (const c of (pipeline ? corpo : [corpo])) if (String(c[0]).toUpperCase() === "LPUSH") gravados.push(c[2]);
    s.setHeader("content-type", "application/json");
    s.end(JSON.stringify(pipeline ? corpo.map(() => ({ result: 1 })) : { result: 1 }));
  });
});
await new Promise((r) => kv.listen(pKV, r));

// Telegram de mentira: guarda o que foi enviado.
const enviados = [];
const pTg = await porta();
const tg = http.createServer((q, s) => {
  let b = ""; q.on("data", (c) => (b += c)); q.on("end", () => {
    try { enviados.push(JSON.parse(b).text); } catch { /* */ }
    s.setHeader("content-type", "application/json"); s.end('{"ok":true}');
  });
});
await new Promise((r) => tg.listen(pTg, r));

process.env.KV_REST_API_URL = "http://127.0.0.1:" + pKV;
process.env.KV_REST_API_TOKEN = "x";
process.env.TELEGRAM_BOT_TOKEN = "tok";
process.env.TELEGRAM_CHAT_ID = "1";
process.env.PANEL_KEY = "senha-de-teste";

// O lib/telegram.js aponta para api.telegram.org; aqui o fetch é desviado para
// o servidor de mentira sem tocar no código de produção.
const fetchReal = globalThis.fetch;
globalThis.fetch = (u, o) => fetchReal(String(u).replace(/^https:\/\/api\.telegram\.org\/bot[^/]+/, "http://127.0.0.1:" + pTg), o);

const chama = (mod, body, extra) => new Promise((resolve) => {
  const req = { method: "POST", query: {}, body, headers: { "content-type": "application/json",
    origin: "https://bentogelateria.com", host: "bentogelateria.com", "x-forwarded-for": "201.1.2.3", ...extra } };
  const res = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this; },
                json(j) { resolve({ status: this.statusCode, body: j }); },
                end() { resolve({ status: this.statusCode }); } };
  mod(req, res);
});

const { default: lead } = await import("../api/lead.js");

// ---------- banco OK: grava e avisa, sem alerta ----------
enviados.length = 0;
let r = await chama(lead, { nome: "Cliente Bom", phone: "27999998888", cidade: "Vitória",
                            data: "20/12/2026", local: "Praia do Canto", convidados: 80, total: 3000 });
ok(r.status === 204, "banco de pé: responde 204 ao site");
ok(enviados.length === 1, "e manda UM aviso no Telegram");
ok(!/NÃO FOI GRAVADO/.test(enviados[0] || ""), "sem alerta de falha, porque gravou mesmo");
ok(/Cliente Bom/.test(enviados[0] || "") && /27999998888/.test(enviados[0] || ""), "com nome e telefone");

// ---------- banco RECUSANDO: o lead não pode sumir ----------
RECUSANDO = true;
enviados.length = 0;
r = await chama(lead, { nome: "Cliente do Apagão", phone: "27988887777", cidade: "Vila Velha",
                        data: "05/01/2027", local: "Jardim da Penha", convidados: 120, total: 5400 });
ok(enviados.length === 1, "banco recusando: o aviso SAI mesmo assim");
const m = enviados[0] || "";
ok(/NÃO FOI GRAVADO NO PAINEL/.test(m), "e vem com o alerta em cima");
ok(/Responda por aqui/.test(m), "dizendo que aquele aviso é o único registro");
ok(/Cliente do Apagão/.test(m) && /27988887777/.test(m), "com o contato inteiro — nome e telefone");
ok(/5\.400|5400/.test(m), "e o valor do orçamento");

// ---------- Telegram também fora: aí sim está perdido, e ninguém finge ----------
// (documenta o limite honesto: sem os dois canais, não há o que fazer)
process.env.TELEGRAM_BOT_TOKEN = "";
enviados.length = 0;
r = await chama(lead, { nome: "Sem Saida", phone: "27977776666", cidade: "Serra" });
ok(enviados.length === 0 && r.status === 204,
   "sem banco E sem Telegram não há o que salvar — é o limite conhecido, não um bug escondido");

// ---------- evento FORA do ES: bloqueado, mas o contato fica ----------
// Fora do estado NÃO sai orçamento — regra do dono. Mas recusar o orçamento e
// jogar fora o telefone são duas coisas, e antes elas aconteciam juntas sem
// ninguém ter decidido a segunda. Agora o contato é guardado, sem valor, e o
// aviso diz claramente que foi bloqueado.
process.env.TELEGRAM_BOT_TOKEN = "tok";
RECUSANDO = false;
enviados.length = 0;
gravados.length = 0;
r = await chama(lead, { stage: "fora-do-es", nome: "Cerimonial Minas", phone: "31988887777",
                        cidade: "Belo Horizonte", data: "18/07/2027",
                        local: "Rua das Flores, Belo Horizonte", convidados: 200,
                        km: 470, fora: true, uf: "Minas Gerais" });
ok(r.status === 204, "contato de fora do ES é guardado (o orçamento foi bloqueado antes)");
const gravado = gravados.length ? JSON.parse(gravados[0]) : null;
ok(!!gravado && gravado.fora === true, "o lead é gravado com a marca fora=true");
ok(!!gravado && gravado.uf === "Minas Gerais", "e com o estado, para a equipe saber de onde é");
ok(!!gravado && gravado.nome === "Cerimonial Minas" && gravado.phone.includes("31988887777"),
   "com nome e telefone inteiros — é justamente o contato que se perdia");
const av = enviados[0] || "";
ok(/FORA DO ES/.test(av) && /Minas Gerais/.test(av), "o aviso no celular abre com FORA DO ES · Minas Gerais");
ok(/orçamento BLOQUEADO/.test(av), "e diz que o orçamento foi bloqueado, é só o contato");
ok(/470 km/.test(av), "com a distância medida, para dar para julgar a exceção");

// evento normal não pode ganhar a marca por engano
enviados.length = 0; gravados.length = 0;
await chama(lead, { nome: "Festa Vitória", phone: "27977776666", cidade: "Vitória",
                    local: "Praia do Canto", convidados: 100, total: 3000, km: 8 });
const normal = gravados.length ? JSON.parse(gravados[0]) : null;
ok(!!normal && normal.fora === false, "evento no ES continua sem a marca");
ok(!/FORA DO ES/.test(enviados[0] || ""), "e o aviso dele não leva o alerta");

kv.close(); tg.close();

console.log("\nCaptura: com o banco fora, o contato ainda chega no celular.");
