# Histórico e trilha de auditoria (02/07/2026 — PRs #161 a #171)

Registro do trabalho que originou este sistema, para contexto de quem for
mantê-lo no app de indústria.

## Linha do tempo

| PR | Entrega |
|---|---|
| #161 | Reescrita **brand-free** das listas de ingredientes dos 24 SKUs (RDC 727/2022): marcas → denominação técnica; ordem decrescente por quantidade; primeiras auditorias (Lattíssimo, Gianduiella, Doce de leite Zero Veneza); polióis por composição (não por categoria); textos de marketing sem marcas |
| #162 | Pistache MEC3 auditada (**contém glúten** — Lei 10.674), biscoito black, mix de castanhas por espécie (RDC 26/2015), Limão com suco concentrado (Base Limone 50 descontinuada) |
| #163 | Bases oficiais Ice Cream Mix (FRUTA 300 p/ leite × **Vegana** p/ sorbets + Extra Dark); Extra Dark reformulado com bebida vegetal de amêndoa (**correção de alérgenos**: declarava "não contém" e passou a declarar AMÊNDOA); Cookies & Cream descontinuado |
| #164 | Creme de pistache Aromitalia ESP-4361BR auditado ("COLORIDO ARTIFICIALMENTE"); bebida = só amêndoa (caju é "pode conter"); gramatura 2 L/receita |
| #165 | Link do painel de fichas no admin |
| #166 | Fichas mobile (coluna única) + admin/Eventos em tópicos por WhatsApp |
| #167 | Artes novas (banner Tabelas + push "Sem culpa") |
| #168/#169 | Todas as abas do admin no padrão de cards verticais |
| #170 | **Bentôlé G** (6 SKUs 2×) + painel premium com categorias + **ficha padrão indústria** + **dossiê ANVISA** |
| #171 | **Editor de insumos e receitas (ChefPro)**: TACO oficial embarcada, seed auditado, anexo de fichas, cálculo automático |

## Decisões de compliance relevantes (com fonte)

1. **Franuí**: cobertura Lukau zero lactose → produto ZERO LACTOSE mas
   "CONTÉM LEITE" (proteína láctea) e SOJA. Advertência de polióis aplicada.
2. **"Chocolate 70%" não existia**: as barras Lukau são coberturas (gordura
   vegetal + cacau em pó, sem massa de cacau) → renomeadas "cobertura sabor
   chocolate meio amargo/ao leite/branco".
3. **Pasta de pistache MEC3 "100%"** na verdade tem corante clorofila INS 141(i)
   e declara **CONTÉM GLÚTEN** → sabores Pistache e Pistache & Choco Branco
   declaram glúten.
4. **Ninho com Nutella não tem avelã**: a Gianduiella 50 é cacau + edulcorantes
   + aroma (sem avelã/leite/soja) → alérgenos corrigidos para só LEITE
   (leite em pó + whey) e marketing ajustado ("sabor gianduia").
5. **Doce de leite**: o insumo é a versão ZERO da Veneza (o Tradicional tem
   açúcar — não confundir na compra).
6. **Leite** das receitas = **leite em pó desnatado** (produção, 02/07/2026).
7. **Todos os SKUs contêm polióis** (maltitol em algum insumo) → advertência
   laxativa na linha inteira.
8. **PODE CONTER global** (16 itens): LEITE, OVOS, AMENDOIM, AMÊNDOA, AVELÃ,
   CASTANHA-DE-CAJU, CASTANHA-DO-PARÁ, MACADÂMIA, NOZES, PECÃ, PISTACHE, TRIGO,
   CENTEIO, CEVADA, AVEIA, SOJA — união dos "pode conter" das fichas.

## Pendências em aberto (na data do export)

- Macros de: whey WPH, Lattíssimo, Gianduiella 50, doce de leite Veneza Zero,
  base de picolé, kadaif, mix de castanhas, colágeno (fichas sem tabela
  capturada ou sem ficha) — anexar páginas de tabela nutricional no módulo
  Insumos.
- INS do "emulsificante" das duas bases Ice Cream Mix (cobrar fornecedor).
- "COLORIDO ARTIFICIALMENTE" nos produtos com creme de pistache — validar
  com o responsável técnico.
- SKUs `estimated` (Extra Dark, Limão e os 10 sabores por analogia + Bentôlé G
  herdados): análise laboratorial antes do rótulo definitivo.
- Ficha oficial Lowçucar do biscoito black (histórico — sabor descontinuado).
