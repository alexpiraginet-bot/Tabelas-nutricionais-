// Sobe a função serverless com um Redis falso (mesma semântica dos comandos usados)
import http from 'node:http';
const db = new Map(), lists = new Map();
const srvKV = http.createServer((req,res)=>{
  let b=''; req.on('data',c=>b+=c); req.on('end',()=>{
    const exec = (cmd)=>{
      const [op,...a]=cmd;
      switch(String(op).toUpperCase()){
        case 'SET': db.set(a[0],a[1]); return 'OK';
        case 'GET': return db.has(a[0])?db.get(a[0]):null;
        case 'DEL': db.delete(a[0]); return 1;
        case 'LPUSH': { const l=lists.get(a[0])||[]; l.unshift(a[1]); lists.set(a[0],l); return l.length; }
        case 'RPUSH': { const l=lists.get(a[0])||[]; l.push(a[1]); lists.set(a[0],l); return l.length; }
        case 'LTRIM': { const l=lists.get(a[0])||[]; lists.set(a[0],l.slice(a[1],a[2]+1)); return 'OK'; }
        case 'LRANGE': { const l=lists.get(a[0])||[]; return l.slice(a[1], a[2]===-1?undefined:a[2]+1); }
        default: return null;
      }
    };
    const body = JSON.parse(b||'[]');
    const isPipe = req.url.includes('/pipeline');
    res.setHeader('content-type','application/json');
    res.end(JSON.stringify(isPipe ? body.map(c=>({result:exec(c)})) : {result:exec(body)}));
  });
});
await new Promise(r=>srvKV.listen(0,r));
process.env.KV_REST_API_URL = 'http://127.0.0.1:'+srvKV.address().port;
process.env.KV_REST_API_TOKEN = 'x';
process.env.PANEL_KEY = 'senha-de-teste';

const { default: handler } = await import('../api/contrato.js');

function chamar({method='GET', query={}, body=null, auth=null, ip='201.10.20.30'}){
  return new Promise((resolve)=>{
    const req = { method, query, body, headers:{ 'x-forwarded-for': ip, 'user-agent':'TesteAgent/1.0' } };
    if (auth) req.headers.authorization = 'Bearer '+auth;
    const res = { statusCode:200, _j:null,
      setHeader(){}, status(c){ this.statusCode=c; return this; },
      json(j){ this._j=j; resolve({ status:this.statusCode, body:j }); },
      end(){ resolve({ status:this.statusCode, body:null }); } };
    handler(req,res);
  });
}
const ok=(c,m)=>console.log((c?'PASS':'FALHA')+' · '+m);

// 1. criar sem senha
let r = await chamar({method:'POST', body:{acao:'criar', nome:'X', subtotal:100}});
ok(r.status===401, 'criar sem senha -> 401');

// 2. criar com senha
r = await chamar({method:'POST', auth:'senha-de-teste', body:{
  acao:'criar', nome:'Maria Teste', doc:'123.456.789-00', email:'m@t.com',
  data:'20/12/2026', local:'Praia do Canto', convidados:80, subtotal:2000, desconto:150 }});
ok(r.status===200 && r.body.ok && r.body.token && r.body.hash, 'criar com senha -> token + hash');
const token = r.body.token, hash = r.body.hash, id = r.body.id;
ok(token.length>=40, 'token tem entropia alta ('+token.length+' chars)');

// 3. abrir pelo token
r = await chamar({query:{t:token}});
ok(r.status===200 && r.body.snapshot.total===1850, 'abre e o total vem CONGELADO do servidor (1850)');
ok(r.body.snapshot.entrada===925 && r.body.snapshot.saldo===925, 'entrada/saldo congelados (925/925)');
ok(!('tokenHash' in r.body), 'tokenHash nao vaza para o cliente');

// 4. token errado
r = await chamar({query:{t:'token-inventado'}});
ok(r.status===404, 'token invalido -> 404');

// 5. assinar sem os aceites
r = await chamar({method:'POST', body:{acao:'assinar', token, nomeDigitado:'Maria Teste', hashVisto:hash}});
ok(r.status===400, 'assinar sem aceites -> 400');

// 6. assinar com hash divergente (contrato mudou no caminho)
r = await chamar({method:'POST', body:{acao:'assinar', token, aceiteConteudo:true, aceiteCancelamento:true,
  nomeDigitado:'Maria Teste', hashVisto:'hash-de-outro-texto'}});
ok(r.status===409, 'assinar com hash divergente -> 409 (recusa)');

// 7. assinar de verdade
r = await chamar({method:'POST', body:{acao:'assinar', token, aceiteConteudo:true, aceiteCancelamento:true,
  nomeDigitado:'Maria Teste', hashVisto:hash, rolouAteOFim:true, segundosNaPagina:95, tela:'430x932', fuso:'America/Sao_Paulo'}});
ok(r.status===200 && r.body.ok, 'assinatura registrada');

// 8. assinar de novo
r = await chamar({method:'POST', body:{acao:'assinar', token, aceiteConteudo:true, aceiteCancelamento:true,
  nomeDigitado:'Outra Pessoa', hashVisto:hash}});
ok(r.status===404 || r.status===409, 'link de uso unico: segunda assinatura recusada ('+r.status+')');

// 9. dossie no painel
r = await chamar({query:{id}, auth:'senha-de-teste'});
const a = r.body.contrato.assinatura;
ok(r.status===200 && a && a.ip==='201.10.20.30' && a.nomeDigitado==='Maria Teste', 'dossie tem IP e nome');
ok(a.leitura.rolouAteOFim===true && a.leitura.segundosNaPagina===95, 'dossie tem trilha de leitura');
ok(a.hashAssinado===hash, 'dossie amarra a assinatura ao hash do texto');
ok(!('tokenHash' in r.body.contrato), 'tokenHash nao vaza nem para o painel');
ok(r.body.eventos.length>=3, 'cadeia append-only: '+r.body.eventos.length+' eventos ('+r.body.eventos.map(e=>e.tipo).join(', ')+')');

// 10. dossie sem senha
r = await chamar({query:{id}});
ok(r.status===401 || r.status===404, 'dossie sem senha nao abre ('+r.status+')');


// ---------- ajuste do cliente + motor de IA ----------
console.log('\n--- ajuste antes de assinar ---');
let r2 = await chamar({method:'POST', auth:'senha-de-teste', body:{
  acao:'criar', nome:'Empresa Kuruma', doc:'11.222.333/0001-44', subtotal:5000,
  data:'10/09/2026', local:'Sede' }});
const id2 = r2.body.id, tok2 = r2.body.token;
ok(r2.status===200, 'contrato novo criado');

r2 = await chamar({method:'POST', body:{acao:'pedir-ajuste', token:tok2, pedido:'x'}});
ok(r2.status===400, 'pedido vazio -> 400');

r2 = await chamar({method:'POST', body:{acao:'pedir-ajuste', token:tok2,
  pedido:'Pagamento integral por deposito bancario em ate 15 dias apos a NF, sem sinal.'}});
ok(r2.status===200, 'cliente consegue pedir ajuste');

r2 = await chamar({query:{id:id2}, auth:'senha-de-teste'});
ok(r2.body.contrato.status==='ajuste-pedido' && /15 dias/.test(r2.body.contrato.ajustePedido.pedido),
   'pedido fica gravado no contrato');
ok(r2.body.eventos.some(e=>e.tipo==='pedido-ajuste'), 'pedido entra na cadeia de eventos');

console.log('\n--- aplicar ajuste gera VERSAO NOVA ---');
const antes = r2.body.contrato.hash;
r2 = await chamar({method:'POST', auth:'senha-de-teste', body:{acao:'aplicar-ajuste', id:id2,
  pagamento:'Pagamento integral, por deposito bancario, em ate 15 (quinze) dias apos o envio da nota fiscal.',
  clausulas:[{titulo:'NOTA FISCAL', texto:'A CONTRATADA emitira NF em ate 2 dias uteis apos o evento.'}],
  // tentativa de adulterar dinheiro pelo corpo — tem de ser IGNORADA
  subtotal: 999999, nome:'Outro Nome'}});
ok(r2.status===200 && r2.body.versao===2, 'versao 2 criada');
const id3 = r2.body.id, tok3 = r2.body.token;
ok(r2.body.hash !== antes, 'hash mudou com o texto novo');

r2 = await chamar({query:{id:id3}, auth:'senha-de-teste'});
ok(r2.body.contrato.snapshot.subtotal===5000, 'VALOR do corpo foi ignorado (segue 5000)');
ok(r2.body.contrato.snapshot.nome==='Empresa Kuruma', 'NOME do corpo foi ignorado');
ok(/15 \(quinze\) dias/.test(r2.body.contrato.snapshot.pagamento), 'pagamento acordado gravado');
ok(r2.body.contrato.snapshot.clausulas.length===1, 'clausula especial gravada');
ok(r2.body.contrato.substitui===id2, 'aponta para a versao anterior');

r2 = await chamar({query:{id:id2}, auth:'senha-de-teste'});
ok(r2.body.contrato.status==='substituido', 'versao antiga marcada como substituida');
r2 = await chamar({query:{t:tok2}});
ok(r2.status===404, 'link da versao antiga morreu');
r2 = await chamar({query:{t:tok3}});
ok(r2.status===200 && /15 \(quinze\)/.test(r2.body.snapshot.pagamento), 'link novo abre com o pagamento acordado');

console.log('\n--- travas ---');
r2 = await chamar({method:'POST', body:{acao:'ia-propor', id:id3, instrucao:'muda tudo'}});
ok(r2.status===401, 'ia-propor sem senha -> 401');
r2 = await chamar({method:'POST', body:{acao:'aplicar-ajuste', id:id3, pagamento:'x'}});
ok(r2.status===401, 'aplicar-ajuste sem senha -> 401');


// ---------- reemitir o link ----------
console.log('\n--- reemitir link de assinatura ---');
let r3 = await chamar({method:'POST', auth:'senha-de-teste', body:{
  acao:'criar', nome:'V.M. Comercio', doc:'11.222.333/0001-44', subtotal:2000, data:'20/08/2026'}});
const idR = r3.body.id, tokR = r3.body.token, hashR = r3.body.hash;

r3 = await chamar({method:'POST', body:{acao:'novo-link', id:idR}});
ok(r3.status===401, 'reemitir sem senha -> 401');

r3 = await chamar({method:'POST', auth:'senha-de-teste', body:{acao:'novo-link', id:idR}});
ok(r3.status===200 && r3.body.token && r3.body.token!==tokR, 'reemite um token NOVO');
ok(r3.body.hash===hashR, 'hash continua o MESMO (documento não mudou)');
const tokNovo = r3.body.token;

r3 = await chamar({query:{t:tokR}});
ok(r3.status===404, 'link antigo morreu na hora');
r3 = await chamar({query:{t:tokNovo}});
ok(r3.status===200 && r3.body.hash===hashR, 'link novo abre o mesmo contrato');

r3 = await chamar({query:{id:idR}, auth:'senha-de-teste'});
ok(r3.body.eventos.some(e=>e.tipo==='novo-link'), 'reemissão fica registrada na cadeia');

// assinado nao reemite
await chamar({method:'POST', body:{acao:'assinar', token:tokNovo, aceiteConteudo:true, aceiteCancelamento:true,
  nomeDigitado:'Fulano Teste', hashVisto:hashR}});
r3 = await chamar({method:'POST', auth:'senha-de-teste', body:{acao:'novo-link', id:idR}});
ok(r3.status===409, 'contrato assinado não reemite link');


// ---------- auditoria: caminhos em que dinheiro ou identidade poderiam mudar ----------
console.log('\n--- auditoria de adulteração ---');
let aud = await chamar({method:'POST', auth:'senha-de-teste', body:{
  acao:'criar', nome:'Cliente Original', doc:'111.222.333-44', subtotal:1000, data:'01/01/2027'}});
const aid = aud.body.id, atok = aud.body.token, ahash = aud.body.hash;

// 1. pedir-ajuste é PÚBLICO: pode injetar campo extra e mudar o contrato?
aud = await chamar({method:'POST', body:{acao:'pedir-ajuste', token:atok,
  pedido:'preciso mudar a forma de pagamento',
  subtotal:99999, nome:'Invasor', pagamento:'de graça', status:'assinado'}});
ok(aud.status===200, 'pedido de ajuste aceito');
let det = await chamar({query:{id:aid}, auth:'senha-de-teste'});
ok(det.body.contrato.snapshot.subtotal===1000, 'pedir-ajuste (público) NÃO altera valor');
ok(det.body.contrato.snapshot.nome==='Cliente Original', 'pedir-ajuste NÃO altera nome');
ok(det.body.contrato.status==='ajuste-pedido', 'pedir-ajuste NÃO consegue marcar como assinado');
ok(det.body.contrato.hash===ahash, 'hash intacto depois de pedido público');

// 2. assinar é PÚBLICO: pode injetar campos?
// Contrato NOVO: o anterior está com ajuste pedido e, desde a correção da
// auditoria, isso trava a assinatura de propósito.
let lim = await chamar({method:'POST', auth:'senha-de-teste', body:{
  acao:'criar', nome:'Cliente Limpo', doc:'111.222.333-44', subtotal:1000, data:'01/01/2027'}});
const lid = lim.body.id, ltok = lim.body.token, lhash = lim.body.hash;
aud = await chamar({method:'POST', body:{acao:'assinar', token:ltok, aceiteConteudo:true, aceiteCancelamento:true,
  nomeDigitado:'Cliente Limpo', hashVisto:lhash,
  subtotal:88888, snapshot:{total:1}, hash:'forjado', status:'aguardando'}});
det = await chamar({query:{id:lid}, auth:'senha-de-teste'});
ok(det.body.contrato.snapshot.subtotal===1000, 'assinar (público) NÃO altera valor');
ok(det.body.contrato.hash===lhash, 'assinar NÃO consegue forjar o hash');
ok(det.body.contrato.status==='assinado', 'assinatura registrada');

// 3. contrato assinado: nenhuma ação de escrita passa
for (const acao of ['aplicar-ajuste','novo-link','ia-propor']) {
  const r = await chamar({method:'POST', auth:'senha-de-teste', body:{acao, id:lid, instrucao:'x', pagamento:'y'}});
  ok(r.status===409 || r.status===503, 'contrato assinado recusa "'+acao+'" ('+r.status+')');
}
aud = await chamar({method:'POST', body:{acao:'pedir-ajuste', token:ltok, pedido:'quero mudar agora'}});
ok(aud.status===404 || a.status===409, 'assinado recusa pedido de ajuste ('+aud.status+')');

// 4. token de um contrato não abre outro
let out2 = await chamar({method:'POST', auth:'senha-de-teste', body:{acao:'criar', nome:'Outro', subtotal:500}});
const btok = out2.body.token;
let vis = await chamar({query:{t:btok}});
ok(vis.body.snapshot.nome==='Outro', 'cada token abre só o seu contrato');
ok(vis.body.snapshot.subtotal===500, 'e com os valores dele');


// ---------- correções da auditoria ----------
console.log('\n--- achados da auditoria, corrigidos ---');
let z = await chamar({method:'POST', auth:'senha-de-teste', body:{acao:'criar', nome:'Ana Paula Souza', doc:'529.982.247-25', subtotal:3000}});
const zid = z.body.id, ztok = z.body.token, zhash = z.body.hash;

// 1. pedido de ajuste trava a assinatura (a tela promete isso)
await chamar({method:'POST', body:{acao:'pedir-ajuste', token:ztok, pedido:'quero mudar o pagamento'}});
z = await chamar({method:'POST', body:{acao:'assinar', token:ztok, aceiteConteudo:true, aceiteCancelamento:true,
  nomeDigitado:'Ana Paula Souza', hashVisto:zhash}});
ok(z.status===409, 'com ajuste pedido, NÃO deixa assinar (a tela prometia isso)');

// 2. reemitir mata o link anterior de verdade
let w = await chamar({method:'POST', auth:'senha-de-teste', body:{acao:'criar', nome:'Bruno Lima', doc:'529.982.247-25', subtotal:1500}});
const wid = w.body.id, wtok1 = w.body.hash && w.body.token;
w = await chamar({method:'POST', auth:'senha-de-teste', body:{acao:'novo-link', id:wid}});
const wtok2 = w.body.token;
w = await chamar({method:'POST', body:{acao:'assinar', token:wtok1, aceiteConteudo:true, aceiteCancelamento:true,
  nomeDigitado:'Bruno Lima', hashVisto:w.body.hash}});
ok(w.status===404 || w.status===409, 'link antigo NÃO assina depois da reemissão ('+w.status+')');

// 3. assinatura dupla: a segunda bate no portão
let d1 = await chamar({query:{t:wtok2}});
let s1 = await chamar({method:'POST', body:{acao:'assinar', token:wtok2, aceiteConteudo:true, aceiteCancelamento:true,
  nomeDigitado:'Bruno Lima', hashVisto:d1.body.hash}});
let s2 = await chamar({method:'POST', body:{acao:'assinar', token:wtok2, aceiteConteudo:true, aceiteCancelamento:true,
  nomeDigitado:'Outra Pessoa', hashVisto:d1.body.hash}});
ok(s1.status===200 && s2.status!==200, 'só a PRIMEIRA assinatura passa ('+s1.status+' depois '+s2.status+')');

// 4. divergencia de nome fica registrada
let v2 = await chamar({method:'POST', auth:'senha-de-teste', body:{acao:'criar', nome:'Carla Menezes', doc:'529.982.247-25', subtotal:800}});
const vtok = v2.body.token, vhash = v2.body.hash, vid = v2.body.id;
await chamar({method:'POST', body:{acao:'assinar', token:vtok, aceiteConteudo:true, aceiteCancelamento:true,
  nomeDigitado:'Fulano Qualquer', hashVisto:vhash}});
v2 = await chamar({query:{id:vid}, auth:'senha-de-teste'});
ok(v2.body.contrato.assinatura.nomeConfere===false, 'nome divergente é MARCADO no dossiê');
ok(v2.body.contrato.assinatura.nomeEsperado==='Carla Menezes', 'dossiê guarda quem deveria ter assinado');

// 5. nome igual com acento/caixa diferente NAO e falso alarme
let u = await chamar({method:'POST', auth:'senha-de-teste', body:{acao:'criar', nome:'José Antônio Nóbrega', doc:'529.982.247-25', subtotal:900}});
await chamar({method:'POST', body:{acao:'assinar', token:u.body.token, aceiteConteudo:true, aceiteCancelamento:true,
  nomeDigitado:'  jose antonio  nobrega ', hashVisto:u.body.hash}});
u = await chamar({query:{id:u.body.id}, auth:'senha-de-teste'});
ok(u.body.contrato.assinatura.nomeConfere===true, 'acento e caixa não geram alarme falso');

srvKV.close();
