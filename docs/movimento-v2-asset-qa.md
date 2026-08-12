# Movimento V2 — auditoria do acervo responsivo

## Resultado local

Gate da biblioteca reconstruído em 12 de agosto de 2026 para as 32 famílias editoriais. A auditoria abaixo descreve o estado local atual; não comprova preview remoto nem produção.

## Regra de identidade aplicada

- geometria canônica: `public/movimento/bento-wordmark-gold.png`, sempre sem redesenho;
- superfície escura: dourado oficial;
- superfície clara: verde-escuro Bentô derivado do mesmo alfa e da mesma proporção do master;
- nenhuma assinatura plana é aplicada sobre camiseta, avental ou jaleco fotografado; roupa oficial só entra como referência integral ou em composição que respeite tecido, plano e perspectiva;
- carrinho e painel: assinatura maior, alinhada à frente disponível;
- a aplicação acompanha ângulo, contraste e posição da superfície e nunca cobre rosto ou pescoço;
- marca de prospect não entra no raster.

As cenas com composição determinística do wordmark em superfície frontal controlada são `INF-05`, `INF-10`, `PAR-05`, `PAR-06`, `PAR-12` e `PAR-15`.

## Matriz auditada

| ID | Assunto | Resultado visual local |
| --- | --- | --- |
| INF-HERO | Chegada e acolhimento | PASS — roupas lisas, sem aplicação plana de marca |
| INF-01 | Cenário do lounge | PASS — canal urbano e lounge contemporâneo |
| INF-02 | Transporte executivo | PASS — camisetas claras sem estampa artificial |
| INF-03 | Aulão funcional | PASS — roupa de treino sem estampa artificial |
| INF-04 | Oficina infantil | PASS — picolés integrados à fotografia, sem estampa artificial em jalecos |
| INF-05 | Recovery | PASS — nova cena com anatomia natural; wordmark apenas em biombo frontal |
| INF-06 | Kit e camiseta | PASS — referência oficial preservada integralmente |
| INF-07 | Celebração | PASS — encontro espontâneo, sem marca de prospect |
| INF-08 | Cafés especiais | PASS — dois profissionais, V60 e espresso |
| INF-09 | Café da manhã | PASS — mesa completa e hospitalidade |
| INF-10 | Carrinho Bentô | PASS — assinatura verde no avental e painel frontal |
| INF-11 | Suplementação | PASS — kits em mesa própria, sem claim inventado |
| INF-12 | Skincare e maquiagem | PASS — atendimento profissional em estações dedicadas |
| INF-13 | Oficina adulta | PASS — adultas de avental, equipe de jaleco e picolés em preparo, sem estampa artificial |
| INF-14 | Espaço infantil | PASS — brinquedos minimalistas, crianças acompanhadas |
| PAR-HERO | Estrutura de chegada | PASS — superfícies de marca preservadas |
| PAR-01 | Backdrop | PASS — Bentô e `1 ANO BENTÔ` com áreas `SUA MARCA AQUI` |
| PAR-02 | Mobilidade | PASS — transporte executivo com motorista, sem marca de prospect |
| PAR-03 | Café da manhã | PASS — área funcional para integração futura |
| PAR-04 | Movimento | PASS — camisetas claras sem estampa artificial |
| PAR-05 | Recovery | PASS — nova cena com anatomia natural; wordmark apenas em biombo frontal |
| PAR-06 | Oficina infantil | PASS — painel frontal com wordmark master; jalecos sem estampa plana |
| PAR-07 | Camiseta e região lombar | PASS — referência oficial integral em prancha editorial |
| PAR-08 | Produto real | PASS — lineup Bentô preservado sem redesenho |
| PAR-09 | Backdrop fotográfico | PASS — presença Bentô e áreas de parceiros legíveis |
| PAR-10 | Curadoria | PASS — mesa neutra para proposta |
| PAR-11 | Cafés especiais | PASS — dois baristas e preparo em V60/espresso |
| PAR-12 | Carrinho Bentô | PASS — painel frontal com wordmark master; aventais sem estampa plana |
| PAR-13 | Suplementação | PASS — kits organizados em mesa de marca |
| PAR-14 | Skincare e maquiagem | PASS — equipe profissional em atendimento |
| PAR-15 | Oficina adulta | PASS — bancada frontal identificada; jalecos sem estampa plana |
| PAR-16 | Espaço infantil | PASS — brinquedos minimalistas e acompanhamento adulto |

## Performance e integridade medidas

- 507 arquivos no diretório gerenciado, incluindo `manifest.json`;
- tree hash: `6e4e68f94d223760d58f47968ced7531ba6cd1f856da150314fedb734a8d62f1`;
- manifest hash: `dcfe40bab4834a7b26d296f7ee570760c415ef67f175d7796abc910a8e215ce7`;
- carga inicial AVIF mobile: convidada `40.055 bytes`; parceiros `26.846 bytes`;
- rota AVIF mobile completa: convidada `239.793 bytes`; parceiros `254.648 bytes`;
- maior LQIP: `446 bytes` em `PAR-HERO`;
- `node --test tests/movement-*.test.mjs`: 157 testes aprovados;
- `npm run build`: build aprovado e auditoria determinística reportou 32 famílias.

## Resíduo recuperável da execução paralela

A pasta pública não rastreada `public/movimento/v2 9`, contendo 92 cópias com sufixo ` 2`, foi movida para `/Users/alexteixeira/Documents/Codex/2026-08-12/bento-movimento-cms/work/quarantine-public-v2-9-20260812`. Ela não faz parte do produto e pode ser recuperada até a quarentena ser removida manualmente.

Seis masters com sufixo ` 2` foram movidos para `/Users/alexteixeira/Documents/Codex/2026-08-12/bento-movimento-cms/work/quarantine-master-copies-20260812`. As duas cenas de recovery rejeitadas por anatomia foram preservadas em `/Users/alexteixeira/Documents/Codex/2026-08-12/bento-movimento-cms/work/quarantine-invalid-recovery-20260812`.

## Limites

- A prévia nominal do WhatsApp está implementada localmente e testada, mas ainda não foi ligada à rota pública.
- Nenhum deploy, publicação ou alteração de produção foi executado.
- Render de iPhone emulado `390 × 844`: sem overflow horizontal, sem erro de página e com hero, capítulos e formulário responsivos.
