# Regras regulatórias codificadas no sistema

Referência consolidada das regras aplicadas pelo painel, pelo gerador de fichas
e pelo prompt da análise de IA. Cada regra cita a norma e ONDE está implementada.

## RDC 727/2022 + IN 75/2020 — rotulagem geral e tabela nutricional
- **Lista de ingredientes em ordem decrescente de quantidade** na receita
  (art. 22). Impl.: `orderIngredients()`/`ordered()` — quantidade não numérica
  ("a confirmar") preserva a posição da receita em vez de virar zero.
- **Ingrediente composto** com composição declarada entre parênteses.
  Impl.: campo `composicao` do insumo/nota do ingrediente.
- **Aditivos com função + nome ou INS** (ex.: "emulsificante lecitina de
  girassol (INS 322(i))"). Pendência conhecida: "emulsificante" genérico nas
  bases Ice Cream Mix — cobrar do fornecedor.
- **Tabela nutricional 100 g | porção | %VD** (IN 75/2020). VDs usados:
  kcal 2000 · carb 300 g · açúc. adicionados 50 g · prot 50 g · gord 65 g ·
  sat 20 g · fibra 25 g · sódio 2000 mg.
- **Advertência de polióis** (art. 25): "Este produto pode ter efeito
  laxativo." Impl.: `hasPolyols` detectado pela composição auditada dos insumos
  (maltitol/sorbitol em QUALQUER insumo, não pela categoria) — hoje TODOS os
  SKUs contêm polióis.
- **Declaração de lactose**: derivada dos alérgenos LEITE, com exceção
  codificada para insumos zero lactose com proteína láctea (ex.: Franuí —
  "CONTÉM LEITE" + "NÃO CONTÉM LACTOSE").

## RDC 26/2015 — alergênicos
- "ALÉRGICOS: CONTÉM …" em caixa alta; **castanhas por espécie**
  (amêndoa, castanha-do-pará, castanha-de-caju… — nunca "castanhas" genérico).
- "PODE CONTER …" para contato cruzado — o global da produção é a união dos
  "pode conter" das fichas dos insumos (o mais extenso: pasta de pistache MEC3).
- Lei 10.674/2003 (glúten) é **binária**: se a ficha do insumo declara "CONTÉM
  GLÚTEN" (mesmo sem trigo na composição, caso MEC3), o produto declara glúten.
  Impl.: exceção `CONTEM_GLUTEN_PELA_PASTA_PISTACHE` no site.

## RDC 429/2020 — rotulagem frontal (lupa)
Por 100 g (sólidos): açúcares adicionados ≥ 15 g · gordura saturada ≥ 6 g ·
sódio ≥ 600 mg. Impl.: `lupaFrontal()`.

## RDC 54/2012 — alegações nutricionais
- **"ZERO AÇÚCARES"**: sem adição E ≤ 0,5 g açúcares totais/100 g.
- **"SEM ADIÇÃO DE AÇÚCARES"**: nenhuma adição no processo; com açúcares
  próprios, acompanha "Contém açúcares próprios dos ingredientes."
- Qualquer adição (mesmo 0,1 g vinda de insumo açucarado) → **sem alegação**.
- Proteína: "FONTE" ≥ 6 g/porção · "ALTO TEOR" ≥ 12 g/porção.
- No módulo Receitas, claims são **suspensos** se algum insumo está sem macros
  (soma parcial) — proteção contra alegação indevida.

## Denominações — armadilhas codificadas
- **"Leite" é exclusivo de produto de origem animal** → vegetal = "bebida
  vegetal de amêndoa" (nunca "leite de amêndoas").
- **Sem massa de cacau + gordura vegetal ≠ "chocolate"** → "cobertura sabor
  chocolate …" (caso das barras Lukau).
- **Nomes de marca de terceiros não pertencem à lista de ingredientes**
  (Piracanjuba, Lukau, Veneza, Lattíssimo… → denominação técnica; a marca fica
  na `fonte` do insumo, para rastreabilidade interna).
- **"COLORIDO ARTIFICIALMENTE"**: exigido pela ficha do creme de pistache
  Aromitalia nos produtos que o usam (Dubai gelato e picolé) — validar com RT.

## Proibições e alertas críticos
- **ALULOSE é proibida pela ANVISA** — presença em qualquer lista = achado
  crítico (checado pela IA; ausente de todas as fichas auditadas).
- **Dextrose/maltodextrina ocultas** em carriers invalidam "sem adição de
  açúcares" — verificada em toda ficha de fornecedor auditada (nenhuma tinha
  dextrose; maltodextrina só no biscoito descontinuado — não é açúcar pela
  IN 75, mas registrada).
- **Macros `estimated`** (calculados por analogia ou fórmula nova) →
  "não usar em rótulo sem análise laboratorial" (CSV e ficha marcam).
- **Colágeno hidrolisado é de origem ANIMAL** → produto com colágeno nunca
  recebe claim "vegano" (Limão e Maracujá têm colágeno; vegano só o Extra Dark).

## Fontes de dados aceitas (hierarquia)
1. **Ficha técnica/rótulo do fornecedor** (arquivada em docs/fichas-fornecedores/)
2. **TACO 4ª ed.** (NEPA/UNICAMP) para alimentos in natura/commodities —
   não traz açúcares/polióis/trans (ficam pendentes)
3. **Cadastro manual** com fonte citada
4. Sem fonte → campo vazio/pendente. **Nunca inventar valor.**
