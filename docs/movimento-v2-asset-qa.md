# Movimento V2 — auditoria do acervo responsivo

## Resultado

Gate da biblioteca aprovado em 12 de agosto de 2026. As contact sheets finais contêm as 19 famílias distintas, sem coqueiros, praia ou morro e com continuidade visual do lounge junto ao canal urbano. A prancha de `PAR-07` ganhou enquadramento editorial branco e dourado próprio, preservando a camiseta oficial inteira e diferenciando-a de `INF-06`; a personalização nominal do parceiro permanece uma camada HTML externa a ser avaliada no render responsivo da Task 8.

## Fontes canônicas compostas

- wordmark: `public/movimento/bento-wordmark-gold.png`, sem redesenho, somente em `INF-HERO`, `INF-03` e `PAR-04`;
- camiseta: `public/movimento/camiseta-referencia.jpg`, apresentada integralmente em `INF-06` e `PAR-07`;
- lineup: `public/movimento/picoles-lineup-real.jpg`, apresentado integralmente em `PAR-08`;
- picolé da oficina: `public/treats/picole-pistache.webp`, composto em escala plausível sobre as bandejas de `INF-04` e `PAR-06`.

## Matriz auditada

| ID | Direção e assunto | Resultado visual |
| --- | --- | --- |
| INF-HERO | Chegada e acolhimento, portrait e landscape nativos | PASS — wordmarks oficiais apenas nas frentes visíveis; nenhum rosto ou costas coberto |
| INF-01 | Chegada individual no deck | PASS — roupa de treino, canal urbano, sem pseudo-marca |
| INF-02 | Acolhimento em grupo | PASS — grupo natural, roupas lisas, sem coqueiro |
| INF-03 | Aulão funcional | PASS — ação plausível e wordmarks oficiais compostos |
| INF-04 | Oficina de decoração de picolés | PASS — duas unidades reais deitadas nas bandejas, crianças acompanhadas |
| INF-05 | Recovery | PASS — cuidado natural, activewear neutro |
| INF-06 | Camiseta da influenciadora | PASS — frente, costas e legenda preservadas por `contain` no mobile |
| INF-07 | Celebração | PASS — encontro espontâneo e família visual distinta |
| PAR-HERO | Chegada para proposta | PASS — painel neutro, sem logo de prospect, portrait e landscape nativos |
| PAR-01 | Backdrop modular | PASS — estrutura neutra branca e dourada |
| PAR-02 | Veículo premium estacionado | PASS — veículo sem marca ou promessa de transporte confirmado |
| PAR-03 | Café da manhã | PASS — serviço natural, superfícies neutras para visualização |
| PAR-04 | Movimento e materiais | PASS — ação plausível e wordmarks oficiais compostos |
| PAR-05 | Estação de recovery | PASS — equipamento e painéis neutros |
| PAR-06 | Oficina patrocinável | PASS — três unidades reais deitadas nas três bandejas |
| PAR-07 | Camiseta e região lombar | PASS da biblioteca — referência integral em prancha branca e dourada exclusiva; callout HTML ainda exige QA renderizado |
| PAR-08 | Lineup real Bentô | PASS — lineup completo preservado por `contain`, inclusive no mobile |
| PAR-09 | Backdrop vazio | PASS — painel vazio; personalização é somente HTML |
| PAR-10 | Mesa de curadoria | PASS — composição neutra sem pseudo-logo |

## Provas de crop

- mobile: `/tmp/bento-movement-v2-contact-sheet-mobile.jpg`;
- desktop: `/tmp/bento-movement-v2-contact-sheet-desktop.jpg`;
- especiais em detalhe: `/tmp/bento-movement-v2-previews/`.

Os caminhos `/tmp` são evidências locais transitórias, não artefatos do produto. A biblioteca pública contém somente derivados AVIF, WebP, JPEG e `manifest.json`.

## Performance e determinismo

- 299 outputs gerenciados; nenhum duplicado com sufixo ` 2` permaneceu;
- tree hash nas duas execuções finais: `ab6c4c8295981e305e4fbe3d676a0f066da3084751aff6d56146f565ab9fa30f`;
- manifest hash nas duas execuções finais: `9f0f34019064e874b0ab3a4c5db8f583f49699f9c23a487f3dd60b4f6ce73fe8`;
- carga inicial AVIF mobile (hero + primeiro capítulo): influenciadora `68.546 bytes`; parceiros `48.734 bytes`;
- rota AVIF mobile completa: influenciadora `219.702 bytes`; parceiros `280.046 bytes`;
- maior LQIP: `446 bytes`, abaixo do limite de 1.536 bytes;
- nenhum upscale: capítulos chegam a `752 × 940`; heroes mobile chegam a `768 × 1365`.

Os hashes acima são reproduzíveis, sem newline final no digest da árvore, com:

```bash
node --input-type=module - <<'NODE'
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
const directory = 'public/movimento/v2';
const filenames = (await readdir(directory)).sort();
const lines = [];
for (const filename of filenames) {
  const digest = createHash('sha256').update(await readFile(`${directory}/${filename}`)).digest('hex');
  lines.push(`${digest}  ${filename}`);
}
console.log('tree', createHash('sha256').update(lines.join('\n')).digest('hex'));
console.log('manifest', createHash('sha256').update(await readFile(`${directory}/manifest.json`)).digest('hex'));
NODE
```

As 38 rendições JPEG máximas (mobile e desktop das 19 famílias) possuem hashes únicos. O disclosure usa `#5f5a50`, com contraste medido de `6,852:1` sobre branco e `6,145:1` sobre `#f7f2e9`.

## Limites do gate

O preload estático do hero ativo e a avaliação visual do callout personalizado pertencem às páginas/render da Task 8. O preload tardio criado em `useEffect` foi removido porque começava depois da descoberta normal da imagem e não representava ganho real.
