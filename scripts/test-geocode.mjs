// Exercita a evGeocode extraida do modals.jsx contra respostas simuladas do Nominatim.
import { readFileSync } from 'node:fs';
const src = readFileSync('/home/user/Tabelas-nutricionais-/src/modals.jsx','utf8');
const bloco = src.slice(src.indexOf('const EV_MAX_KM'), src.indexOf('function calcEvento(g,'));
const haver = src.match(/function evHaversine[^\n]*\n/)[0];
const LOJAS = [{nome:"Praia do Canto",lat:-20.2947,lng:-40.2925},{nome:"Jardim Camburi",lat:-20.2547,lng:-40.2670}];
const EV_ROTA = 1.3;
globalThis.sessionStorage = { _d:{}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=v;} };

let ultimaURL = '';
let RESPOSTA = [];
globalThis.fetch = async (u) => { ultimaURL = u; return { ok:true, json: async()=>RESPOSTA }; };

const mod = new Function('LOJAS','EV_ROTA', haver + bloco + '\nreturn { evGeocode };')(LOJAS, EV_ROTA);
const ok=(c,m)=>console.log((c?'PASS':'FALHA')+' · '+m);

// 1. a URL agora restringe ao ES
RESPOSTA = [];
await mod.evGeocode('Rua qualquer');
ok(/bounded=1/.test(ultimaURL), 'busca é limitada (bounded=1)');
ok(/viewbox=-41\.95/.test(ultimaURL), 'caixa do Espírito Santo aplicada');
ok(/limit=5/.test(ultimaURL), 'pede 5 candidatos, não 1');
ok(/addressdetails=1/.test(ultimaURL), 'pede detalhes do endereço para conferir o estado');

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
