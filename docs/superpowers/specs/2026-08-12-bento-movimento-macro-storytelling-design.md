# Bentô em Movimento - Narrativa macro, motion e prova social

**Status:** direção aprovada por Alex em 12 de agosto de 2026; especificação escrita aguardando revisão final

**Rotas:** `/movimento`, `/movimento/parceiros` e `/movimento/convite/:token`

**Evento:** primeiro aniversário da Bentô Gelatos, sábado, 12 de setembro de 2026, Le Buffet Lounge, Vitória/ES

**Referências:** apresentação Gran Cave Wellness enviada por Alex, site Movimento atual, especificação canônica de convites/parcerias e PDF `Creators / Influencers - Evento` de 11 de agosto de 2026

## 1. Objetivo

Transformar as apresentações do Movimento em uma narrativa editorial mais curta, ampla e persuasiva. A página deve comunicar a experiência inteira em poucos grandes momentos, usar motion comandado pela rolagem para conduzir o olhar e permitir aprofundamento por toque sem obrigar o visitante a percorrer 14 ou 16 telas de tamanho integral.

O redesign não reduz o acervo nem a capacidade editorial. As 30 cenas secundárias existentes continuam disponíveis e editáveis no CMS; passam a funcionar como conteúdo interno de cinco territórios macro.

## 2. Decisão central

A experiência pública terá três camadas:

1. **Hero:** Bentô soberana, nome pessoal ou empresa em destaque quando o link for individual e CTA persistente já existente.
2. **Visão macro:** cinco territórios editoriais apresentados por uma composição sticky no desktop e uma sequência compacta no mobile.
3. **Aprofundamento opcional:** cada território abre um painel com suas imagens, informações e oportunidades de marca.

O visitante entende a proposta pela camada macro. Abrir detalhes é sempre opcional. Nenhum texto importante fica escondido apenas em hover.

## 3. Os cinco territórios

### 01 - Chegada

Reúne cenário, acolhimento, assinatura de chegada e mobilidade premium. Na proposta de parceiros, este é o território principal para uma marca automotiva.

- Destaque macro: chegada ao Le Buffet Lounge junto à marina urbana.
- Detalhes: recepção, credenciamento, transporte executivo e primeira entrega.
- Link profundo permitido: `#chegada` e `#mobilidade`.
- Em convite pessoal de parceiro, o painel usa a empresa resolvida pelo link: `Como {Empresa} pode assinar a chegada.`
- Nenhum logo é inventado. Até existir arquivo oficial aprovado, usa-se somente o nome tipográfico da empresa.

### 02 - Movimento

Reúne o aulão funcional, acessórios em uso, camiseta e suplementação.

- Personal aprovado: **Jonatas Correa**, conforme a referência visual e a confirmação de Alex.
- Destaque macro: `A manhã começa em movimento.`
- Detalhes: aulão, garrafa/toalha, camiseta oficial e kits de suplementação.
- O nome do personal é conteúdo factual em HTML, nunca parte de imagem gerada.

### 03 - Hospitalidade

Reúne cafés especiais, café da manhã, carrinho Bentô e sabores.

- Destaque macro: `Hospitalidade para fazer as pessoas ficarem.`
- Detalhes: dois profissionais, V60, espresso, mesa de café da manhã, carrinho real e serviço de gelato.
- A marca existente no carrinho é preservada. Aplicações de parceiro dependem de mockup individual aprovado.

### 04 - Cuidado

Reúne recovery, skincare, maquiagem e atenção às famílias.

- Destaque macro: `Cuidado que continua depois do treino.`
- Detalhes: macas de massagem, equipe profissional, estação de skincare/maquiagem e entretenimento infantil minimalista.
- Sem promessas clínicas, terapêuticas ou de resultado.

### 05 - Criação e memória

Reúne oficinas, kits, produto, backdrop e registro editorial.

- Destaque macro: `O que se vive também pode acompanhar.`
- Detalhes: oficina adulta, oficina infantil, kits, cocriação responsável, backdrop, captação e quatro participações.
- O wordmark Bentô vem exclusivamente do master oficial.

## 4. Arquitetura de interação

### Desktop

- Um palco visual ocupa aproximadamente 52% da largura e permanece sticky dentro da narrativa.
- A coluna editorial percorre os cinco territórios; cada um ocupa entre 50 e 65% da altura útil, suficiente para leitura sem criar uma nova página por assunto.
- `IntersectionObserver` define o território ativo.
- A imagem principal troca por crossfade e deslocamento máximo de 16 px.
- Contador `01 / 05`, título e linha de progresso acompanham o território ativo.
- No máximo duas camadas visuais são animadas ao mesmo tempo.

### Mobile

- Não há scroll-jacking, carrossel obrigatório nem seção presa por vários viewports.
- Cada território aparece como bloco compacto com uma imagem dominante, título, resumo e botão `Explorar`.
- A entrada em viewport realça número, título e imagem; a rolagem nativa nunca é bloqueada.
- O painel de detalhes abre como bottom sheet de até `100dvh`, com safe area, rolagem interna e fechamento explícito.

### Painel de detalhes

- Desktop: painel lateral direito com largura limitada a 720 px.
- Mobile: bottom sheet.
- Ação de abertura usa botão real com mínimo de 44 x 44 px e `aria-expanded`.
- O painel possui título acessível, foco inicial, trava de foco, `Escape`, restauração de foco e bloqueio de rolagem do documento.
- Somente o conteúdo do painel aberto é montado e suas imagens são carregadas sob demanda.
- Hashes seguros permitem abrir um território diretamente sem incluir token, nome ou outra informação pessoal.

## 5. Motion

O motion deve explicar hierarquia, não decorar a página.

- Troca de território: crossfade de 320 a 420 ms e deslocamento curto com curva de saída.
- Entrada de título: opacidade e `translateY` de 12 a 16 px.
- Imagem: escala máxima de `1.025`; sem zoom contínuo.
- Indicador: progresso acompanha a troca de território, não cada pixel da página.
- Painel: nasce do botão acionado e mantém continuidade espacial.
- Animações usam apenas `transform` e `opacity`; não animam largura, altura, `top` ou `left`.
- Nenhuma animação automática infinita.
- Conforme a regra canônica do repositório, movimento comandado diretamente pela rolagem permanece ativo com `prefers-reduced-motion`; nesse modo, stagger, escala e qualquer movimento autônomo são eliminados, mantendo apenas a troca de estado necessária para indicar o tópico atual.
- Implementação sem nova dependência de produção: React, CSS e `IntersectionObserver` existentes.

## 6. Convidadas como prova social

Esta seção existe somente na proposta de parceiros, depois dos cinco territórios e antes das quatro participações.

### Mensagem

**Kicker:** `Convidadas selecionadas`

**Título:** `Uma manhã desenhada para pessoas que já movem comunidades.`

**Corpo:** `A curadoria reúne criadoras, profissionais e mulheres com presença relevante em bem-estar, lifestyle, beleza, gastronomia e cotidiano.`

Não usar `influenciadoras` como rótulo de público. Não escrever `presenças confirmadas`, `confirmadas` ou qualquer taxa de comparecimento sem evidência corrente do RSVP.

### Composição inicial

Seis nomes aparecem no primeiro enquadramento, escolhidos de forma determinística pelo maior alcance registrado no PDF de 11 de agosto de 2026, mas sem publicar números de seguidores:

1. Aline Mareto
2. Isadora Binow
3. Sara Broedel
4. Rayanni Thomazini
5. Lara Martinelle
6. Bianca Romanha

O botão `Conhecer as convidadas` abre a seleção completa de 36 nomes do PDF. A ordem completa segue o documento-fonte, página por página, para não inventar hierarquia editorial além do destaque inicial.

### Regras de conteúdo

- O PDF é fonte curatorial inicial, não banco de presença.
- Métricas de seguidores não aparecem na interface porque são temporais e o documento não oferece data individual de aferição.
- A seção não consulta diretamente `movement_invites` nem `movement_rsvps`; dados de convite e resposta continuam privados.
- Retratos extraídos do PDF só entram no site se tiverem resolução útil, enquadramento aceitável e autorização de uso. Quando algum retrato não passar, o fallback é nome tipográfico, nunca rosto gerado por IA.
- Cada retrato publicado recebe alt text com apenas o nome da convidada.
- Nenhum contato, status do convite, acompanhante ou resposta é exposto.

## 7. Personalização para parceiros

A Bentô permanece soberana no hero. A empresa convidada ganha relevância em três pontos:

1. nome isolado no hero pessoal, como já definido;
2. copy contextual dentro de cada território: `Como {Empresa} pode viver este momento`;
3. abertura direta por hash do território mais relevante, especialmente `#mobilidade` para a marca automotiva.

Isso permite apresentar a mesma experiência a marcas diferentes sem fabricar uma landing page por empresa e sem misturar logos no raster. Quando um logo oficial for fornecido e aprovado, ele pode ser exibido dentro do painel de detalhes como asset independente, preservando proporção e área de respiro.

## 8. Preservação do CMS

- `INF-HERO`, `INF-01` a `INF-14`, `PAR-HERO` e `PAR-01` a `PAR-16` continuam sendo as unidades editoriais do CMS.
- Opacidade, kicker, título, corpo, alt text, foto principal e foto vertical continuam editáveis por cena.
- Uma nova configuração de apresentação apenas agrupa as cenas em cinco territórios; não duplica conteúdo nem cria uma segunda fonte de verdade.
- Nome da convidada, empresa, responsável e mensagem nominal continuam fixos pelo link e fora do CMS.
- A lista pública de convidadas é um conteúdo curado separado do banco de convites. Gestão visual dessa lista no admin fica fora desta entrega para evitar expor dados privados ou ampliar o modelo persistido sem necessidade.

## 9. Mapeamento inicial de cenas

### Convidada

- Chegada: `INF-01`, `INF-02`
- Movimento: `INF-03`, `INF-06`, `INF-11`
- Hospitalidade: `INF-08`, `INF-09`, `INF-10`
- Cuidado: `INF-05`, `INF-12`, `INF-14`
- Criação e memória: `INF-04`, `INF-07`, `INF-13`

### Parceiro

- Chegada: `PAR-01`, `PAR-02`
- Movimento: `PAR-04`, `PAR-07`, `PAR-13`
- Hospitalidade: `PAR-03`, `PAR-11`, `PAR-12`
- Cuidado: `PAR-05`, `PAR-14`, `PAR-16`
- Criação e memória: `PAR-06`, `PAR-08`, `PAR-09`, `PAR-10`, `PAR-15`

Cada uma das 30 cenas aparece exatamente uma vez. Os dois heróis permanecem fora dos grupos.

## 10. Estrutura técnica prevista

- `movement-content.js`: adiciona grupos macro, mapeamento de cenas e lista curada de convidadas.
- `MovementSite.jsx`: substitui o reel integral por `MovementStoryAtlas`, `MovementStoryDetail` e `PartnerGuestProof`.
- `movement.css`: layout sticky, estados ativos, sheet responsivo, motion tokens e fallbacks.
- `public/movimento/creators/`: retratos aprovados e otimizados extraídos do material fornecido.
- Testes de conteúdo e apresentação: garantem mapeamento completo, privacidade, rotas e linguagem.
- Auditoria Movimento: inclui orçamento das novas miniaturas e proíbe métricas/claims não autorizados.

Não haverá migration, nova API, nova dependência de produção ou alteração no banco de convites.

## 11. Performance

- Somente o hero mantém preload e `fetchPriority="high"`.
- O atlas carrega a imagem do primeiro território por proximidade; demais imagens entram conforme o território se aproxima.
- Imagens internas dos painéis não carregam antes da primeira abertura.
- Retratos usam AVIF/WebP/JPEG responsivos e dimensões explícitas.
- Nenhum retrato excede 320 px de largura na interface; originais maiores ficam fora do bundle público quando desnecessários.
- O redesign não pode aumentar o teto inicial existente nem produzir CLS acima de 0,1.
- Motion mantém trabalho por quadro abaixo de 16 ms em iPhone intermediário emulado.

## 12. Acessibilidade

- O resumo essencial dos cinco territórios permanece no DOM e pode ser lido sem abrir painéis; o motion nunca é requisito para compreender a proposta.
- Ordem de headings permanece sequencial.
- Botões mostram estado expandido e possuem foco visível.
- Painéis seguem os contratos de foco já validados nos sheets de RSVP e parceiros.
- Texto normal mantém contraste WCAG AA de 4,5:1; títulos grandes, ao menos 3:1.
- Conteúdo não depende de cor ou motion para ser compreendido.
- Mobile preserva zoom e fontes de corpo com no mínimo 16 px.

## 13. Verificação obrigatória

Antes de declarar pronto:

1. testes vermelhos para grupos, painel, hash e prova social;
2. testes unitários e integração completos;
3. lint e build de produção;
4. auditoria determinística do Movimento;
5. comparação visual da referência, implementação e screenshots lado a lado;
6. QA em 375 x 812, 390 x 844, landscape de iPhone e 1440 x 1024;
7. teste com `prefers-reduced-motion` ativo;
8. teclado, VoiceOver semântico, foco e `Escape` nos painéis;
9. rede: uma imagem prioritária, painéis sem download precoce e ausência de CLS;
10. revisão de marca para wordmark, retratos, fotos e qualquer aplicação de parceiro.

Produção só pode ser alterada após preview aprovado e autorização explícita de Alex para publicar.

## 14. Critérios de aceite

1. A visão padrão contém cinco territórios, não 14 ou 16 telas integrais.
2. Todos os assuntos existentes continuam acessíveis por aprofundamento.
3. A rolagem destaca o território ativo sem travar o gesto nativo.
4. Cada território é clicável e abre detalhes acessíveis.
5. Jonatas Correa aparece como personal do aulão em ambas as propostas.
6. A proposta de parceiros mostra seis convidadas em destaque e permite acessar as 36 selecionadas.
7. A interface usa `convidadas`, não `influenciadoras`, para nomear o público.
8. Nenhuma convidada é apresentada como confirmada sem status verificável.
9. A marca automotiva recebe um território forte e um link profundo em mobilidade, sem dividir o hero principal com a Bentô.
10. O CMS mantém todas as 32 famílias e seus campos atuais.
11. Nenhum token, contato, RSVP ou dado privado entra na prova social.
12. Mobile, desktop, acessibilidade, performance, testes, lint, build e auditoria passam antes de publicação.
