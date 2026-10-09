// Trava o motor de preço dos três formatos de evento (src/eventos-regras.js).
//
// O que este arquivo protege, em uma frase: o preço por pessoa, a faixa de
// convidados e a equipe de cada formato são combinados com o dono, e mudar
// qualquer um deles por acidente sai caro nos dois sentidos — orçamento abaixo
// do custo ou cliente perdido por preço alto.
import assert from "node:assert/strict";
// As regras moram em src/eventos-regras.js (sem JSX), importadas pelo modal e
// pela IA do site. Antes este teste fatiava o modals.jsx por marcadores de
// texto; agora testa exatamente o módulo que as telas usam.
import { calcEvento, EV_FORMATOS, EV_CABE, EV_MIN, EV_SUGERE, EV_PERS_DE, EV_LIMITE_SABORES } from "../src/eventos-regras.js";

let falhas = 0;
const caso = (nome, fn) => {
  try { fn(); console.log("PASS · " + nome); }
  catch (e) { falhas++; console.log("FALHA · " + nome + "\n         " + e.message); }
};

caso("são três formatos, do menor para o maior", () => {
  assert.deepEqual(EV_FORMATOS.map((f) => f.id), ["caixa", "balcao", "carrinho"]);
});

caso("o preço por pessoa é R$ 27 em qualquer formato", () => {
  // Decisão do dono: o que muda entre formatos é equipe e entrega, não o preço
  // por pessoa. Um formato "mais barato" aqui seria desconto que ninguém deu.
  for (const f of EV_FORMATOS) assert.equal(f.preco, 27, `${f.nome} está a R$ ${f.preco}`);
});

caso("personalização custa +20% abaixo de 100 convidados, e preço cheio a partir de 100", () => {
  const P = "Potinhos ou rótulos personalizados";
  // 40 pessoas: 40 × 2 × R$ 0,50 = 40 → com +20% = 48. Estrutura 200 → 240.
  const q40 = calcEvento(40, "Mix (gelatos + picolés)", [P, "Balcão personalizado"], null, "balcao");
  assert.equal(q40.potinhos, 48, "potinhos sem o acréscimo em quantidade pequena");
  assert.equal(q40.carrinho, 240, "estrutura sem o acréscimo em quantidade pequena");
  assert.equal(q40.persFator, 1.2);
  // 99 ainda é quantidade pequena; 100 já não.
  assert.equal(calcEvento(99, "Gelatos", [P], null, "balcao").potinhos, Math.round(99 * 2 * 0.5 * 1.2));
  const q100 = calcEvento(100, "Mix (gelatos + picolés)", [P, "Carrinho personalizado"], null, "carrinho");
  assert.equal(q100.potinhos, 100, "cobrou acréscimo em quantidade grande");
  assert.equal(q100.carrinho, 200, "cobrou acréscimo na estrutura em quantidade grande");
  assert.equal(q100.persFator, 1);
});

caso("o acréscimo não vaza para o serviço nem para a logística", () => {
  const q = calcEvento(40, "Picolés", ["Potinhos ou rótulos personalizados"], 10, "caixa");
  assert.equal(q.base, 40 * 27, "o serviço por pessoa mudou junto com a personalização");
  assert.equal(q.logistica, 10 * 2 * 2.0, "a logística mudou junto com a personalização");
});

caso("as faixas de convidados são as que o dono definiu", () => {
  const f = Object.fromEntries(EV_FORMATOS.map((x) => [x.id, x]));
  assert.deepEqual([f.caixa.min, f.caixa.max], [20, 60]);
  assert.deepEqual([f.balcao.min, f.balcao.max], [30, 80]);
  assert.equal(f.carrinho.min, 81, "acima de 80 é carrinho direto; 80 ainda é balcão");
  // Faixas não podem se sobrepor no limite: com 80 nas duas, quem abriu no
  // carrinho (padrão 150) e trocou para 80 ficava no carrinho. Codex, PR #241.
  assert.ok(!EV_CABE(f.carrinho, 80), "carrinho aceita 80 convidados — sobrepõe o balcão");
  assert.ok(EV_CABE(f.balcao, 80) && EV_CABE(f.carrinho, 81));
  // Entre 30 e 60 caixa E balcão cabem DE PROPÓSITO: ali a diferença é de
  // serviço (sem atendente × promotora servindo na hora), e isso o cliente
  // escolhe. "Subir de estrutura" é só balcão -> carrinho. Codex pediu para
  // fechar esta sobreposição no PR #241; não é bug, é oferta do dono.
  assert.ok(EV_CABE(f.caixa, 40) && EV_CABE(f.balcao, 40), "caixa e balcão deixaram de coexistir em 40 convidados");
  assert.equal(f.carrinho.max, null, "o carrinho não pode ter teto");
});

caso("o orçamento online começa em 20 pessoas", () => {
  assert.equal(EV_MIN, 20);
  assert.ok(!EV_CABE(EV_FORMATOS[0], 19), "19 convidados não deveriam caber em nenhum formato");
});

caso("cada tamanho de evento cai no formato certo", () => {
  assert.equal(EV_SUGERE(20), "caixa");
  assert.equal(EV_SUGERE(45), "caixa");
  assert.equal(EV_SUGERE(80), "balcao");
  assert.equal(EV_SUGERE(81), "carrinho", "81 já é carrinho");
  assert.equal(EV_SUGERE(90), "carrinho", "90 convidados não cabem mais no balcão");
  assert.equal(EV_SUGERE(150), "carrinho");
  assert.equal(EV_SUGERE(1000), "carrinho");
});

caso("só o carrinho tem promotora dobrada acima de 300", () => {
  assert.equal(calcEvento(25, "Mix (gelatos + picolés)", [], null, "caixa").promotoras, 0);
  assert.equal(calcEvento(80, "Mix (gelatos + picolés)", [], null, "balcao").promotoras, 1);
  assert.equal(calcEvento(150, "Mix (gelatos + picolés)", [], null, "carrinho").promotoras, 1);
  assert.equal(calcEvento(400, "Mix (gelatos + picolés)", [], null, "carrinho").promotoras, 2);
});

caso("sem atendente o rendimento é em potinho selado; com promotora e cuba, em litros", () => {
  const r = calcEvento(40, "Gelatos", [], null, "caixa").rend;
  assert.match(r, /potinho/, `caixa: "${r}"`);
  assert.doesNotMatch(r, / L de gelato/, `caixa promete gelato servido a granel: "${r}"`);
  // Balcão tem promotora e serve da cuba: a conta é em litros, como o carrinho.
  assert.match(calcEvento(60, "Gelatos", [], null, "balcao").rend, / L de gelato/);
  assert.match(calcEvento(150, "Gelatos", [], null, "carrinho").rend, / L de gelato/);
});

caso("mix na caixa: 1 picolé por pessoa e 1 potinho a cada 2, com 1 sabor de gelato e até 2 de picolé", () => {
  // 30 convidados: 30 picolés + 15 potinhos — não 30 + 30. Combinado com o dono.
  const r = calcEvento(30, "Mix (gelatos + picolés)", [], null, "caixa").rend;
  assert.match(r, /~30 picolés/, `caixa: "${r}"`);
  assert.match(r, /~15 potinhos selados/, `caixa: "${r}"`);
  assert.match(r, /1 sabor de gelato/);
  assert.match(r, /até 2 sabores/);
  // Convidados ímpares arredondam o potinho para cima: ninguém fica sem.
  assert.match(calcEvento(25, "Mix (gelatos + picolés)", [], null, "caixa").rend, /~13 potinhos/);
  assert.equal(calcEvento(30, "Mix (gelatos + picolés)", [], null, "caixa").sabores, 3);
});

caso("o acréscimo de personalização segue a quantidade, não o formato", () => {
  // Carrinho com 90 convidados ainda está abaixo de 100: paga o acréscimo.
  assert.equal(calcEvento(90, "Gelatos", ["Potinhos ou rótulos personalizados"], null, "carrinho").persFator, 1.2);
});

caso("o total soma serviço + logística + personalizações", () => {
  const q = calcEvento(100, "Mix (gelatos + picolés)", ["Balcão personalizado", "Potinhos ou rótulos personalizados"], 30, "balcao");
  assert.equal(q.base, 100 * 27);
  assert.equal(q.potinhos, 100 * 2 * 0.5);
  assert.equal(q.carrinho, 200);
  assert.equal(q.logistica, 30 * 2 * 2.0);
  assert.equal(q.total, q.base + q.potinhos + q.carrinho + q.logistica);
});

caso("sem km, o total não inventa logística", () => {
  const q = calcEvento(50, "Picolés", [], null, "caixa");
  assert.equal(q.logistica, null);
  assert.equal(q.total, q.base);
});

caso("o rótulo antigo de personalização continua valendo", () => {
  // Orçamento fechado antes dos três formatos guardou "Carrinho personalizado".
  // Se o novo código só reconhecesse "Balcão personalizado", o item sumiria da
  // conta e o mesmo evento reabriria R$ 200 mais barato.
  const q = calcEvento(150, "Mix (gelatos + picolés)", ["Carrinho personalizado"], null, "carrinho");
  assert.equal(q.carrinho, 200, "o rótulo antigo deixou de somar");
  const p = calcEvento(150, "Mix (gelatos + picolés)", ["Potinhos personalizados"], null, "carrinho");
  assert.equal(p.potinhos, 150, "o rótulo antigo de potinhos deixou de somar");
});

caso("a caixa térmica não oferece personalizar estrutura que ela não tem", () => {
  assert.ok(!EV_PERS_DE("caixa").some((x) => /personalizado$/.test(x) && /Carrinho|Balcão/.test(x)));
  assert.ok(EV_PERS_DE("balcao").includes("Balcão personalizado"));
  assert.ok(EV_PERS_DE("carrinho").includes("Carrinho personalizado"));
});

caso("nenhum evento sai com menos de 3 sabores onde o produto é envasado", () => {
  assert.ok(calcEvento(20, "Mix (gelatos + picolés)", [], null, "caixa").sabores >= 3);
  assert.equal(calcEvento(150, "Mix (gelatos + picolés)", [], null, "carrinho").sabores, 6);
});

caso("a escolha de sabores respeita o limite de cada formato", () => {
  const M = "Mix (gelatos + picolés)";
  // Caixa com mix é fechada: 1 sabor de gelato (potinhos) e até 2 de picolé.
  for (const n of [20, 30, 45, 60]) assert.deepEqual(EV_LIMITE_SABORES(n, M, "caixa"), { gelatos: 1, picoles: 2, total: 3 }, `caixa ${n}`);
  assert.deepEqual(EV_LIMITE_SABORES(40, "Picolés", "caixa"), { gelatos: 0, picoles: 3, total: 3 });
  assert.deepEqual(EV_LIMITE_SABORES(40, "Gelatos", "caixa"), { gelatos: 3, picoles: 0, total: 3 });
  // Servidos com mix: o total se divide, e a sobra vai para o gelato.
  assert.deepEqual(EV_LIMITE_SABORES(30, M, "balcao"), { gelatos: 1, picoles: 1, total: 2 });
  assert.deepEqual(EV_LIMITE_SABORES(80, M, "balcao"), { gelatos: 2, picoles: 1, total: 3 });
  assert.deepEqual(EV_LIMITE_SABORES(150, M, "carrinho"), { gelatos: 3, picoles: 3, total: 6 });
  assert.deepEqual(EV_LIMITE_SABORES(400, "Gelatos", "carrinho"), { gelatos: 6, picoles: 0, total: 6 });
  // Nunca promete mais sabores do que o orçamento diz ("até N sabores").
  for (const f of EV_FORMATOS) for (const tipo of [M, "Gelatos", "Picolés"]) for (const n of [20, 30, 50, 60, 80, 81, 120, 150, 300]) {
    if (!EV_CABE(f, n)) continue;
    const l = EV_LIMITE_SABORES(n, tipo, f.id), q = calcEvento(n, tipo, [], null, f.id);
    assert.equal(l.gelatos + l.picoles, l.total, `${f.id} ${tipo} ${n}`);
    assert.ok(l.total <= q.sabores, `${f.id} ${tipo} ${n}: ${l.total} sabores para "até ${q.sabores}"`);
    if (tipo === M) assert.ok(l.gelatos >= 1 && l.picoles >= 1, `${f.id} mix ${n} sem uma das linhas`);
  }
});

console.log(falhas ? `\n${falhas} FALHA(S)` : "\nEventos: todos os casos passaram.");
process.exit(falhas ? 1 : 0);
