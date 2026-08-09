// Exercita a evGeocode extraida do modals.jsx contra respostas simuladas do Nominatim.
import { readFileSync } from 'node:fs';
const src = readFileSync('/home/user/Tabelas-nutricionais-/src/modals.jsx','utf8');
const bloco = src.slice(src.indexOf('const EV_MAX_KM'), src.indexOf('function calcEvento(g,'));
const haver = src.match(/function evHaversine[^\n]*\n/)[0];
const LOJAS = [{nome:"Praia do Canto",lat:-20.2947,lng:-40.2925},{nome:"Jardim Camburi",lat:-20.2547,lng:-40.2670}];
const EV_ROTA = 1.3;
globalThis.sessionStorage = { _d:{}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=v;} };

let ultimaURL = '';
let URLS = [];
let RESPOSTA = [];
globalThis.fetch = async (u) => { ultimaURL = u; URLS.push(u); return { ok:true, json: async()=>RESPOSTA }; };

const mod = new Function('LOJAS','EV_ROTA', haver + bloco + '\nreturn { evGeocode };')(LOJAS, EV_ROTA);
const ok=(c,m)=>console.log((c?'PASS':'FALHA')+' · '+m);

// 1. a URL agora restringe ao ES
// Confere a PRIMEIRA busca, não a última: sem resultado no ES, o código faz uma
// segunda busca ampla no Brasil só para descobrir em que estado o endereço fica.
// Olhando `ultimaURL`, o teste inspecionava justamente a busca que NÃO é
// limitada — e acusava falha num comportamento correto.
RESPOSTA = [];
URLS = [];
await mod.evGeocode('Rua qualquer');
const primeira = URLS[0] || '';
ok(/bounded=1/.test(primeira), 'busca é limitada (bounded=1)');
ok(/viewbox=-41\.95/.test(primeira), 'caixa do Espírito Santo aplicada');
ok(/limit=5/.test(primeira), 'pede 5 candidatos, não 1');
ok(/addressdetails=1/.test(primeira), 'pede detalhes do endereço para conferir o estado');
ok(URLS.length===3 && URLS.slice(0,2).every(u=>/bounded=1/.test(u)) && !/bounded=1/.test(URLS[2]),
   'duas tentativas presas ao ES e, só então, UMA busca ampla para descobrir o estado');
ok(/Esp/.test(decodeURIComponent(URLS[1])),
   'a segunda tentativa acrescenta "Espírito Santo" ao endereço');

// 2. resultado FORA do ES é descartado
RESPOSTA = [{lat:"-3.10",lon:"-60.02",display_name:"Rua das Flores, Manaus - AM",address:{state:"Amazonas","ISO3166-2-lvl4":"BR-AM"}}];
let r = await mod.evGeocode('Rua das Flores 100');
ok(r.ok===false, 'endereço em outro estado é RECUSADO (não vira km)');

// 3. resultado no ES, perto: aceito com endereco
RESPOSTA = [{lat:"-20.30",lon:"-40.29",display_name:"Av. N. Sra. da Penha, Praia do Canto, Vitória - ES",address:{state:"Espírito Santo","ISO3166-2-lvl4":"BR-ES"}}];
r = await mod.evGeocode('Av Nossa Senhora da Penha 1000');
ok(r.ok===true && r.km>=1, 'endereço no ES é aceito (km='+r.km+')');
ok(/Praia do Canto/.test(r.endereco||''), 'devolve o endereço casado para a tela mostrar');

// 4. no ES mas absurdamente longe (fora do teto) — nao deveria acontecer com bounded, mas e a rede de seguranca
RESPOSTA = [{lat:"-17.90",lon:"-39.70",display_name:"Divisa norte",address:{state:"Espírito Santo","ISO3166-2-lvl4":"BR-ES"}}];
r = await mod.evGeocode('lugar bem no norte');
console.log('   (norte do ES: ok=' + r.ok + (r.ok?(', km='+r.km):'') + ')');

// 5. o candidato certo NAO e o primeiro da lista
RESPOSTA = [
  {lat:"-19.00",lon:"-40.60",display_name:"Homônimo em Colatina - ES",address:{state:"Espírito Santo","ISO3166-2-lvl4":"BR-ES"}},
  {lat:"-20.31",lon:"-40.30",display_name:"O certo, em Vitória - ES",address:{state:"Espírito Santo","ISO3166-2-lvl4":"BR-ES"}},
];
r = await mod.evGeocode('Rua com homonimo');
ok(/Vitória/.test(r.endereco||''), 'escolhe o candidato mais perto de uma loja, não o primeiro');

// 6. falha nao e guardada em cache
RESPOSTA = [];
await mod.evGeocode('endereco ruim');
ok(!globalThis.sessionStorage._d['bento:geo:endereco ruim'], 'falha NÃO é guardada (permite corrigir e tentar de novo)');

// ---------- A EQUAÇÃO ----------
// O preço é uma conta, e conta se confere com o resultado na mão. Cada caso
// abaixo tem o valor calculado FORA do código; se a fórmula mudar sem querer,
// o número aqui denuncia.
console.log('\n--- a equação do orçamento ---');
const calc = new Function('EV_POTINHO','EV_CARRINHO','EV_KM_RATE',
  src.slice(src.indexOf('function calcEvento('), src.indexOf('export function EventosModal')) + '\nreturn calcEvento;'
)(0.5, 200, 2.0);

// 100 pessoas, nada personalizado, 20 km:
//   serviço   100 × 27 = 2.700
//   logística  20 × 2 × 2,00 = 80
//   total     2.780
let e = calc(100, 'Mix (gelatos + picolés)', [], 20);
ok(e.base === 2700, 'serviço = 27 × convidados (100 -> 2.700)');
ok(e.logistica === 80, 'logística = km × 2 (ida e volta) × R$ 2,00 (20 km -> 80)');
ok(e.total === 2780, 'total fecha: 2.700 + 80 = ' + e.total);

// 137 pessoas com potinhos: 137 × 2 × R$ 0,50 = 137,00 exatos. É o único ponto
// da conta com centavo, e onde erro de ponto flutuante apareceria: (n×2) é par,
// e par × 0,5 é sempre inteiro exato.
e = calc(137, 'Gelatos', ['Potinhos personalizados'], 13);
ok(e.potinhos === 137, 'potinhos = convidados exatos, sem centavo perdido (137)');
ok(Number.isInteger(e.total), 'total continua inteiro — sem resíduo de ponto flutuante');
ok(e.total === 137*27 + 137 + 52, 'total fecha: 3.699 + 137 + 52 = ' + e.total);

e = calc(80, 'Picolés', ['Carrinho personalizado'], null);
ok(e.carrinho === 200, 'carrinho personalizado é fixo em 200, não por pessoa');
ok(e.logistica === null && e.total === 80*27 + 200,
   'sem distância, a logística NÃO entra no total (fica a combinar): ' + e.total);

e = calc(90, 'Mix (gelatos + picolés)', ['Outra personalização'], null);
ok(e.persACombinar.length === 1, 'personalização sem tabela fica "a combinar", não vira zero silencioso');

ok(calc(300,'Gelatos',[],null).promotoras === 1, '300 convidados: 1 promotora');
ok(calc(301,'Gelatos',[],null).promotoras === 2, '301 convidados: 2 promotoras');
ok(calc(301,'Gelatos',[],null).corporativo === true, 'acima de 300 marca como corporativo');
ok(calc(70,'Gelatos',[],null).sabores === 3, '70 convidados: 3 sabores (70 × 6 ÷ 150)');
ok(calc(150,'Gelatos',[],null).sabores === 6, '150+: teto de 6 sabores');

ok(/15 L de gelato/.test(calc(100,'Gelatos',[],null).rend), 'Gelatos: 150 ml/pessoa (100 -> 15 L)');
ok(/200 picolés/.test(calc(100,'Picolés',[],null).rend), 'Picolés: 2 por pessoa (100 -> 200)');
ok(/8 L de gelato/.test(calc(100,'Mix (gelatos + picolés)',[],null).rend), 'Mix: 75 ml/pessoa (100 -> ~8 L)');

let faixaOk = true;
for (const km of [1,7,23,100,320]) if (calc(70,'Gelatos',[],km).logistica !== km*4) faixaOk = false;
ok(faixaOk, 'logística = 4 × km em toda a faixa (1, 7, 23, 100 e 320 km)');

// ---------- distinguir FORA DO ES de NAO LOCALIZEI ----------
console.log('\n--- fora do estado vs nao localizado ---');
let chamadas = 0;
const RESPOSTAS = [];
globalThis.fetch = async (u) => { ultimaURL = u; chamadas++; return { ok:true, json: async()=>RESPOSTAS[chamadas-1] || [] }; };

// caso A: nada no ES, mas o Brasil inteiro acha em Minas -> BLOQUEIA
chamadas = 0; RESPOSTAS.length = 0;
RESPOSTAS.push([], [], [{lat:"-19.92",lon:"-43.94",display_name:"Av. Afonso Pena, Belo Horizonte - MG",address:{state:"Minas Gerais","ISO3166-2-lvl4":"BR-MG"}}]);
r = await mod.evGeocode('Av Afonso Pena 1000 Belo Horizonte');
ok(r.ok===false && r.fora===true, 'endereço de MG: marcado como FORA (bloqueia)');
ok(/Minas/.test(r.uf||''), 'diz o estado encontrado: ' + r.uf);
ok(/Belo Horizonte/.test(r.endereco||''), 'diz o endereço encontrado, para o cliente corrigir se errou');

// caso B: nada em lugar nenhum -> NAO bloqueia
chamadas = 0; RESPOSTAS.length = 0;
RESPOSTAS.push([], [], []);
r = await mod.evGeocode('salao do ze sem endereco');
ok(r.ok===false && !r.fora, 'endereço não localizado NÃO é bloqueado (equipe confirma)');

// caso C: rede cai na segunda busca -> NAO bloqueia
chamadas = 0; RESPOSTAS.length = 0;
globalThis.fetch = async () => { chamadas++; if(chamadas>=3) throw new Error('rede'); return { ok:true, json: async()=>[] }; };
r = await mod.evGeocode('endereco com rede ruim');
ok(r.ok===false && !r.fora, 'falha de rede NÃO bloqueia o cliente');

// ---------- fora do ES: PERTO tem preço, LONGE tem distância ----------
// A conta de R$/km foi feita para bate-volta. Até EV_MAX_KM ela vale igual do
// outro lado da divisa — recusar preço para uma cidade a 90 km só porque a
// placa mudou de estado era jogar fora uma conta que estava certa. Acima disso
// a fórmula não vale (pernoite, dias de equipe), e aí o honesto é dizer a
// distância e orçar à parte.
console.log('\n--- fora do ES: perto x longe ---');

// Muniz Freire/MG-ish: ~100 km em linha reta de Vitória, ainda bate-volta
RESPOSTA = []; URLS = [];
let perto = null;
{
  let n = 0;
  globalThis.fetch = async (u) => { ultimaURL = u; URLS.push(u); n++;
    return { ok:true, json: async () => n <= 2 ? [] : [{lat:"-20.60",lon:"-41.20",display_name:"Centro, Manhuaçu - MG",
      address:{state:"Minas Gerais","ISO3166-2-lvl4":"BR-MG"}}] }; };
  perto = await mod.evGeocode('Centro, Manhuacu');
}
ok(perto.fora === true, 'cidade de MG perto: continua marcada como fora do estado');
ok(perto.km != null && perto.km > 0, 'mas AGORA tem distância medida (' + perto.km + ' km)');
ok(perto.ok === true, 'e dentro do bate-volta o preço FECHA (ok=true)');
ok(perto.loja, 'sabendo de qual loja sai: ' + perto.loja);
ok(calc(100,'Gelatos',[],perto.km).logistica === perto.km * 4,
   'a logística dela entra na conta: ' + (perto.km*4));

// Manaus: longe demais para a fórmula valer
{
  let n = 0;
  globalThis.fetch = async (u) => { ultimaURL = u; URLS.push(u); n++;
    return { ok:true, json: async () => n <= 2 ? [] : [{lat:"-3.10",lon:"-60.02",display_name:"Centro, Manaus - AM",
      address:{state:"Amazonas","ISO3166-2-lvl4":"BR-AM"}}] }; };
  const longe = await mod.evGeocode('Centro, Manaus');
  ok(longe.fora === true && longe.km != null, 'Manaus: fora e com distância medida (' + longe.km + ' km)');
  ok(longe.ok === false, 'mas o preço NÃO fecha — a fórmula de bate-volta não vale a essa distância');
  ok(longe.km > 2000, 'a distância é real, não um teto inventado (' + longe.km + ' km)');
}

