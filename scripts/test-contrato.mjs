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

srvKV.close();
