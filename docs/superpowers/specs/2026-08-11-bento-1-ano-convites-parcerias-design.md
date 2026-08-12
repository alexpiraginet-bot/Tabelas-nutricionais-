# Bentô 1 Ano — Convites e Parcerias

**Status:** aprovado por Alex nas respostas de 11 de agosto de 2026  
**Evento:** sábado, 12 de setembro de 2026  
**Local:** Le Buffet Lounge, Vitória, ES  
**Escala:** 40 a 50 pessoas no total  
**Objetivo:** duas apresentações web interativas, personalizáveis e leves: uma para influenciadoras confirmarem sua experiência e outra para marcas escolherem uma participação.

## 1. Decisão central

O evento celebra o **primeiro aniversário da Bentô Gelatos**. Ele não é o início de um “projeto de um ano” e não deve prometer uma programação anual.

A abordagem escolhida combina:

- **O lugar que só você ocupa:** eixo emocional do convite individual;
- **Uma manhã em capítulos:** estrutura de rolagem cinematográfica;
- **Aniversário em movimento:** a data e a celebração permanecem visíveis em toda a experiência.

Cada tela comunica uma única ideia, com fotografia dominante, título curto e no máximo duas frases. O texto é HTML; nenhum nome, logo, slogan ou claim é gerado dentro da imagem.

## 2. Arquitetura de acesso

### Links gerais

- `/movimento`: apresentação-modelo para influenciadoras, sem formulário anônimo.
- `/movimento/parceiros`: apresentação-modelo para parceiros, aberta por URL, `noindex` e sem link no site principal.

Os links gerais explicam que a confirmação/seleção acontece no link pessoal enviado pela Bentô.

### Links pessoais

- `/movimento/convite/:token`: compatibilidade com convites já emitidos.
- O token é opaco, não enumerável e armazenado somente como SHA-256.
- O convite resolvido define `audienceType`: `influencer` ou `partner`.
- Nome, empresa e responsável vêm do convite; não há cadastro repetido.
- Convite inválido, expirado ou revogado usa a mesma resposta neutra e nunca revela nome ou audiência.

O link pessoal não inclui PII em metadados, OG, canonical ou analytics. As rotas pessoais recebem `noindex`, `nofollow`, `no-store` e `Referrer-Policy: no-referrer`.

## 3. Experiência da influenciadora

### Hero personalizado

**Kicker:** `Convite pessoal · 1º aniversário Bentô Gelatos`  
**Título:** `{Nome}, esta celebração tem um lugar que só você pode ocupar.`  
**Texto:** `No sábado, 12 de setembro, reuniremos 40–50 pessoas no Le Buffet Lounge para uma manhã de movimento, cuidado e encontros. Sua presença é parte essencial da memória que queremos criar.`  
**Linha factual:** `Sábado · 12.09.2026 · Le Buffet Lounge · Vitória–ES`  
**CTA persistente:** `Confirmar meu lugar`

Fallback do link geral: `Esta celebração tem um lugar que só você pode ocupar.`

### Capítulos

1. **Por que você — A manhã muda quando você chega.**  
   Você foi escolhida pelo que desperta nas pessoas e pela forma como transforma presença em conexão.
2. **Primeiro aniversário — Um ano merece ser sentido.**  
   A Bentô reúne pessoas que fizeram parte dessa história e dão sentido ao que vem agora.
3. **A manhã — Movimento para começar. Hospitalidade para ficar.**  
   Aulão funcional com personal renomado, café da manhã, sabores Bentô, cuidado e conexão; nome, horário e operação final permanecem em confirmação.
4. **Seu mundo também cabe aqui — Você pode trazer quem faz parte da sua vida.**  
   O convite acolhe um acompanhante adulto — marido ou mãe — e uma criança de qualquer idade, sempre acompanhada.
5. **Feita para você — Uma camiseta reservada ao seu lugar nesta manhã.**  
   Camiseta e roupa de treino são exclusivas da influenciadora. Uma possível surpresa infantil não é prometida.
6. **12 de setembro — Uma manhã íntima. Uma memória compartilhada.**  
   Movimento, gelato e boas conversas no Le Buffet Lounge.

### Confirmação

Um único CTA persistente abre um bottom sheet mobile de tela cheia. Formulário, revisão, envio e sucesso permanecem nessa mesma superfície. O sheet deve ter `role="dialog"`, `aria-modal="true"`, foco inicial, restauração de foco, fechamento por botão e `Escape`, bloqueio de rolagem do corpo e safe area de iPhone.

Campos, na mesma confirmação:

1. presença: `Estarei presente` ou `Desta vez, acompanho de longe`;
2. camiseta da influenciadora: PP, P, M, G, GG ou XGG;
3. roupa de treino da influenciadora: PP, P, M, G, GG ou XGG;
4. acompanhante adulto: nenhum, marido ou mãe;
5. criança: nenhuma ou uma;
6. quando houver criança: idade inteira não negativa, apenas para organização, e tamanho aproximado livre de até 40 caracteres;
7. transporte: `Quero ser avisada caso haja transporte exclusivo disponível`;
8. privacidade obrigatória;
9. uso de imagem opcional, independente da presença.

Não pedir endereço. Dados de embarque serão solicitados depois apenas às confirmadas quando a disponibilidade do transporte estiver definida.

### Limites explícitos

- total máximo no convite: influenciadora + um adulto + uma criança;
- oficina infantil dentro do cerimonial, estruturada e com adulto responsável;
- qualquer idade; o campo de idade só organiza a operação e não cria corte de participação;
- camiseta e roupa de treino somente para a influenciadora;
- idade e tamanho infantil orientam uma possível surpresa, sem promessa;
- a autorização de imagem não condiciona a presença.

## 4. Experiência do parceiro

### Hero personalizado

**Kicker:** `Uma proposta para {Responsável} · {Empresa}`  
**Título:** `{Empresa}, seu lugar nesta celebração pode ter forma, função e assinatura.`  
**Texto:** `No primeiro aniversário da Bentô Gelatos, 40–50 pessoas viverão uma manhã de movimento e hospitalidade no Le Buffet Lounge. Esta proposta apresenta maneiras de a marca participar de forma natural, útil e memorável.`  
**Linha factual:** `Sábado · 12.09.2026 · Le Buffet Lounge · Vitória–ES`  
**CTA persistente:** `Escolher participação`

Fallback geral: `Sua marca pode ter forma, função e assinatura nesta celebração.`

### Capítulos

1. primeiro aniversário: celebração íntima e desenhada nos detalhes;
2. participação real: a marca entra na experiência, não apenas no cenário;
3. chegada e acolhimento: mobilidade premium e café da manhã;
4. movimento e cuidado: treino, garrafa, toalha e recovery;
5. memória que acompanha: ecobag, lancheira e press kit;
6. família: oficina de picolés e decoração dentro do cerimonial;
7. assinatura visual: backdrop e região lombar da camiseta;
8. cocriação: estudo de picolé ou rótulo co-branded sujeito a viabilidade;
9. quatro participações: escolha não vinculante e abertura de conversa de escopo.

### Participações

#### Select

- nome ou logo oficial na composição coletiva do backdrop;
- aplicação coletiva na região lombar da camiseta;
- crédito institucional na relação de participantes e no press kit;
- mockup das aplicações para aprovação.

#### Experience

Tudo de Select, mais:

- um ponto de contato funcional entre garrafa, toalha, ecobag, lancheira ou press kit;
- integração em um momento entre café da manhã, treino, recovery ou oficina infantil;
- registro curado da participação na documentação do evento.

#### Signature

Tudo de Experience, mais:

- assinatura de um território entre mobilidade premium, café da manhã, treino, recovery ou oficina infantil;
- presença ampliada nos materiais e na ambientação desse território;
- construção conjunta da narrativa e do plano de captação;
- estudo de viabilidade para picolé ou rótulo co-branded.

#### Founding Circle

Tudo de Signature, mais:

- segundo ponto de contato em território complementar;
- maior hierarquia nas composições coletivas;
- identificação editorial `Founding Circle` nos materiais institucionais do evento;
- participação na curadoria criativa final;
- registro editorial personalizado da presença da marca.

`Founding Circle` refere-se exclusivamente à participação nesta celebração. Nenhuma opção promete preço, exclusividade, alcance, publicação, categoria protegida ou continuidade anual.

### Seleção

O parceiro escolhe uma participação. No link pessoal, empresa e responsável já vêm preenchidos; no link geral permanecem editáveis. A escolha registra interesse e não constitui reserva, exclusividade ou contrato.

Logo é opcional e somente pode vir de arquivo oficial fornecido pela empresa. Quando houver, é aplicado como elemento HTML/CSS; na ausência, usa-se o nome tipográfico. Nunca redesenhar ou gerar logo por IA.

## 5. Admin Movimento

A aba existente será ampliada sem alterar o painel-host ou sua autenticação:

- criar convite de influenciadora ou parceiro;
- influenciadora: nome e contato interno;
- parceiro: empresa, responsável e contato interno;
- validade futura obrigatória;
- gerar token opaco, guardar somente o hash e copiar o link no ato;
- listar audiência, nome/empresa, responsável, criação, validade e estado;
- estados derivados: gerado, aberto, confirmado, recusado, selecionado, revogado e expirado;
- revogar sem excluir histórico;
- emitir novo link quando necessário; token antigo nunca pode ser reconstruído;
- mostrar RSVP, acompanhantes, idade/tamanho infantil, tamanhos da influenciadora e interesse em transporte;
- mostrar participação escolhida pelo parceiro;
- manter labels legíveis para registros legados.

## 6. Dados e segurança

As migrations aplicadas são imutáveis. Uma nova migration aditiva:

- adiciona `recipient_name`, `company_name`, `opened_at`, `revoked_at` a `movement_invites`;
- adiciona `child_age` e `transport_interest` a `movement_rsvps`;
- adiciona `invite_id` nullable e unique a `movement_partner_leads`;
- expande tiers aceitos para `select`, `experience`, `signature`, `founding_circle` e preserva leitura/escrita dos seis valores legados;
- preserva RLS e revoga acesso direto de `anon` e `authenticated`;
- cria índices administrativos necessários.

Regras:

- service role somente no servidor;
- resolução do convite valida audiência antes da escrita;
- RSVP permanece idempotente por `invite_id`;
- parceiro pessoal é idempotente por `invite_id`; link geral permanece por `lead_key`;
- conflito de um `lead_key` ligado a outro convite retorna erro explícito, sem reassociação;
- abertura é registrada uma única vez;
- revogação bloqueia novas aberturas e respostas sem apagar histórico;
- corpo limitado, honeypot, origem validada e erros neutros;
- token bruto nunca entra em banco, log ou resposta administrativa posterior à criação.

## 7. Sistema visual

- base ivory/branco e dourado; verde Bentô como acento, nunca lajes grandes;
- fotografia editorial como fundo principal; scrim localizado apenas para legibilidade;
- tipografia editorial com espaçamento consistente e texto sempre em HTML;
- uma família visual exclusiva por capítulo; nenhum hash visual repetido;
- disclosure `Visualização conceitual gerada por IA` para toda cena gerada;
- 44 × 44 px como alvo mínimo de toque;
- contraste mínimo WCAG AA;
- movimento comandado pela rolagem pode permanecer; `prefers-reduced-motion` elimina apenas movimento autônomo.

### Local

O Le Buffet Lounge deve aparecer como deck contemporâneo junto a canal/marina, com barcos e skyline urbano. São proibidos: coqueiros, palmeiras, praia, areia, mar aberto, ondas, ilhas, montanhas, morros e estética de resort tropical.

### Pessoas

Mulheres brasileiras adultas aparentando 23–38 anos, beleza sofisticada, corpos atléticos magros, definidos e esculturais de referência fitness, anatomia e interação naturais. Sem bodybuilding, músculos extremos, pose sexualizada, roupa casual, salto ou biquíni. Sempre roupa de treino.

### Camisa

Somente as quatro referências fornecidas por Alex são válidas. O wordmark vem de `public/movimento/bento-wordmark-gold.png`. Qualquer letra, cor, posição ou proporção divergente reprova a imagem.

- influenciadora: nenhuma ocorrência de `sua marca aqui`;
- parceiro: áreas de patrocinador apenas em HTML/CSS e somente na região lombar, abaixo da frase;
- nenhuma marca prospectada entra no raster.

### Produto

Picolés e embalagens usam composição exata de `public/movimento/picoles-lineup-real.jpg` e `public/sabores/bentole-*.jpg`. IA pode gerar ambiente e luz, nunca redesenhar produto, embalagem, logo ou claim.

## 8. Matriz de mídia

São 19 famílias exclusivas: 8 da influenciadora e 11 do parceiro, incluindo os dois heróis.

### Influenciadora

`INF-HERO` chegada; `INF-01` cenário; `INF-02` acolhimento; `INF-03` aulão; `INF-04` oficina infantil; `INF-05` recovery; `INF-06` kit/camisa; `INF-07` celebração.

### Parceiro

`PAR-HERO` chegada/estrutura; `PAR-01` palco; `PAR-02` mobilidade; `PAR-03` café; `PAR-04` movimento; `PAR-05` recovery; `PAR-06` oficina; `PAR-07` kit/camisa; `PAR-08` produto; `PAR-09` backdrop; `PAR-10` fechamento/curadoria.

Cada família tem crops próprios 9:16/4:5 para mobile e 16:9/16:10 para desktop. OG é 1200 × 630 e não conta como capítulo.

## 9. Performance e acessibilidade

- `<picture>` com AVIF, WebP e JPEG progressivo;
- larguras responsivas 480, 768, 1080, 1440 e 1920 quando aplicáveis;
- preload somente do hero da rota ativa;
- hero sem lazy e com `fetchpriority="high"`;
- demais imagens com `loading="lazy"` e `decoding="async"`;
- dimensões e `aspect-ratio` explícitos;
- LQIP por cena abaixo de 1,5 KiB;
- fontes WOFF2 subsetadas e somente nos pesos usados;
- teto inicial planejado de 690 KiB incluindo primeiro capítulo;
- teto completo planejado de 1.490 KiB na influenciadora e 1.850 KiB no parceiro;
- alvo LCP mobile até 2,5 s, INP até 200 ms e CLS abaixo de 0,1, medidos antes da publicação;
- QA em 320, 375, 390 e 430 px, portrait e landscape;
- Safari iOS real além de emulação;
- inputs com fonte mínima de 16 px, zoom permitido, foco visível e ordem de teclado coerente.

## 10. Critérios de aceite

1. A celebração de um ano é o eixo de ambas as apresentações e nenhuma copy fala em projeto anual.
2. Nome da influenciadora aparece no hero antes da primeira dobra.
3. Empresa e responsável aparecem no hero do parceiro pessoal.
4. CTA persistente abre a superfície correta em um toque.
5. RSVP salva, reabre e atualiza sem duplicar.
6. Parceiro escolhe exatamente uma das quatro participações e o vínculo ao convite é inequívoco.
7. Link geral continua acessível; link pessoal é privado e compatível com o formato anterior.
8. Admin cria ambos os públicos, copia no ato, revoga e acompanha os estados.
9. Nenhuma cena ou asset é repetido entre capítulos.
10. Nenhuma imagem contém local, pessoa, camisa, logo ou produto fora das regras.
11. A apresentação da influenciadora não contém linguagem ou marcação de patrocinador.
12. Rotas pessoais não vazam token ou PII em OG, logs próprios ou referer.
13. Testes, lint, build, auditoria visual, performance e fluxo real passam antes da publicação.
