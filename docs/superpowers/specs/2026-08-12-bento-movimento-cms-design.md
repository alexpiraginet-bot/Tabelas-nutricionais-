# Bentô em Movimento — CMS editorial e refinamento do convite

**Status:** direção aprovada por Alex em 12 de agosto de 2026
**Projeto exclusivo:** `/Users/alexteixeira/Documents/Codex/2026-07-21/crie-altera-es-na-interface-a/work/tabelas-nutricionais-movimento-main`
**Fora de escopo:** repositório `alexos`, publicação automática e alterações destrutivas de dados.

## 1. Objetivo

Transformar as apresentações `/movimento` e `/movimento/parceiros` em experiências editoriais que a equipe Bentô possa ajustar no painel existente sem editar código. O painel controla mídia, intensidade, enquadramento e copy de cada capítulo. A identidade da pessoa ou empresa continua vindo exclusivamente do convite individual e nunca é editável pelo CMS.

O primeiro refinamento também corrige duas falhas atuais:

- o hero pessoal passa a destacar apenas o nome ou a empresa, com a mensagem fixa em escala menor;
- o RSVP usa uma única pergunta de tamanho e linguagem inclusiva para qualquer convidada, não apenas influenciadoras.

## 2. Princípios obrigatórios

- O código continua sendo o fallback canônico. Banco fora do ar, configuração vazia ou imagem customizada quebrada não derrubam a apresentação.
- Nome, empresa, responsável, token, mensagem nominal, data, local, CTA transacional, consentimentos e regras do RSVP não pertencem ao CMS.
- O identificador interno `influencer` permanece para compatibilidade; toda interface humana usa `Convidada`.
- Uploads publicados aceitam somente mídia hospedada pela Bentô. URLs `data:`, `javascript:`, `http:` e hosts externos são recusados.
- Nenhuma mídia antiga é apagada automaticamente.
- Imagens customizadas não podem remover lazy loading, dimensões estáveis ou fallback padrão.
- Conteúdo customizado nunca usa `innerHTML`.
- Toda edição é concorrente-segura por `revision`.

## 3. Hero pessoal protegido

### Convidada

```text
NOME DA CONVIDADA
Esta celebração tem um lugar que só você pode ocupar.
```

O nome ocupa o maior nível tipográfico. A mensagem fica em um elemento separado, menor, com largura controlada e leitura confortável em 320–430 px.

### Parceiro

```text
NOME DA EMPRESA
Uma proposta para RESPONSÁVEL.
Seu lugar nesta celebração pode ter forma, função e assinatura.
```

Empresa e responsável vêm do convite. O CMS não recebe campos capazes de alterar esses textos.

### Link geral

O link geral mantém uma chamada editorial sem identidade inventada. A hierarquia tipográfica é a mesma, mas não simula uma personalização.

## 4. RSVP da convidada

Há somente uma pergunta de vestimenta:

```text
Qual tamanho você usa?
PP · P · M · G · GG · XGG
```

O valor enviado alimenta `shirtSize` e `trainingOutfitSize` com o mesmo conteúdo para preservar o schema atual. Respostas antigas com valores diferentes não são normalizadas silenciosamente: o painel mostra os dois valores como resposta legada e, ao editar, a convidada escolhe novamente.

Os campos de idade e tamanho infantil continuam montados somente após `Uma criança`. Não há promessa de kit infantil.

## 5. Conteúdo editável

Existem dois públicos e 32 famílias visuais:

- convidada: `INF-HERO`, `INF-01` a `INF-14`;
- parceiro: `PAR-HERO`, `PAR-01` a `PAR-16`.

Os capítulos adicionados dão espaço próprio a cafés especiais com dois profissionais e preparo em V60/espresso, café da manhã, carrinho de gelato Bentô, kits de suplementação, skincare e maquiagem profissionais, oficina adulta de picolés e entretenimento infantil minimalista. Na proposta de parceiros, cada capítulo explica também o território funcional de integração da marca sem citar prospect ou fornecedor ainda não confirmado.

Cada cena aceita somente:

- foto principal;
- foto vertical opcional para iPhone;
- intensidade da foto, de `0` a `1`;
- kicker, até 60 caracteres;
- título, até 140 caracteres;
- texto, até 360 caracteres;
- descrição acessível, de 24 a 240 caracteres.

O hero não permite editar nome, empresa, responsável ou mensagem nominal. O painel exibe esses campos como uma prévia bloqueada sem PII real.

## 6. Painel

A aba superior `Movimento` permanece. Dentro dela existem:

- `Convites`;
- `Conteúdo da apresentação`.

### Mobile

1. seletor `Convidada | Parceiro` com alvo mínimo de 44 px;
2. seletor de capítulo;
3. status `Carregando`, `Alterações não salvas`, `Enviando foto`, `Salvando`, `Salvo` ou erro;
4. preview 4:5;
5. explicação da personalização bloqueada;
6. foto principal e foto vertical opcional;
7. etapa de corte com enquadramento horizontal, vertical e zoom;
8. otimização automática e indicação das dimensões finais antes do envio;
9. slider de intensidade;
10. campos de copy;
11. barra persistente `Restaurar padrão` e `Salvar`.

### Desktop

Lista de capítulos à esquerda, preview ao centro e formulário à direita. O mesmo estado deve ser preservado ao alternar o viewport.

Trocar de capítulo com alterações pendentes pede confirmação. `beforeunload` protege rascunhos. Erros preservam os campos locais. O status usa `aria-live="polite"`.

## 7. Persistência e API

Uma tabela Supabase `movement_presentation_content` armazena uma linha por público e cena. Os campos editoriais ficam em colunas tipadas para que limites, opacidade e a obrigatoriedade do texto alternativo sejam reforçados também pelo PostgreSQL:

- `audience_type`;
- `scene_id`;
- `image_url` e `mobile_image_url`;
- `image_opacity`;
- `eyebrow`, `title`, `body` e `alt_text`;
- `revision`;
- `created_at`;
- `updated_at`.

A chave primária é `(audience_type, scene_id)`. RLS fica habilitado; `anon` e `authenticated` não recebem acesso direto; somente `service_role` acessa a tabela.

`GET /api/movimento-content?audience=...` é público, devolve apenas overrides saneados e usa cache curto. Em falha, devolve uma lista vazia para ativar os defaults.

`GET /api/movimento-content?fresh=1` exige `PANEL_KEY` e devolve conteúdo com revisão para o editor.

`POST /api/movimento-content` exige `PANEL_KEY`, corpo máximo de 32 KiB e recebe:

```json
{
  "audience": "influencer",
  "sceneId": "INF-01",
  "revision": 3,
  "override": {
    "imageUrl": "https://...",
    "mobileImageUrl": "https://...",
    "imageOpacity": 0.82,
    "eyebrow": "O cenário",
    "title": "...",
    "body": "...",
    "altText": "..."
  }
}
```

Conflito de revisão retorna `409`; conteúdo inválido retorna `400`; credencial inválida retorna `401`.

## 8. Upload

O endpoint existente `/api/upload` continua servindo os fluxos atuais. Quando `purpose` for `movimento`:

- aceita apenas JPEG, PNG, WebP e AVIF;
- exige tamanho positivo dentro do limite definido;
- grava em `movimento/YYYY-MM-DD/<uuid>-<nome-seguro>`;
- nunca reutiliza caminho por nome;
- não expõe chave de serviço.

O navegador reduz a imagem antes do envio para evitar fotos brutas pesadas. A foto vertical é opcional; quando ausente, o preview mostra o recorte da principal.

Selecionar uma imagem não inicia o upload. O painel abre primeiro um editor de corte com três controles: posição horizontal, posição vertical e zoom. A saída segue o formato real da cena (`16:9` ou `8:5` para a principal; `9:16` ou `4:5` para a vertical), gera dimensões estáveis e tenta WebP com fallback JPEG. JPEG, PNG, WebP, AVIF, HEIC e HEIF podem ser escolhidos quando o navegador consegue decodificá-los; o arquivo enviado ao Storage continua restrito aos formatos já saneados pelo servidor.

Toda chamada backend ao Supabase envia `apikey`. Chaves legadas JWT também usam `Authorization: Bearer`; chaves opacas `sb_secret_...` usam somente `apikey`, evitando que o gateway tente interpretá-las como JWT.

## 9. Visuais que não devem ser simulados por selo

- Aprovação acontece imagem por imagem, incluindo o master e os recortes finais mobile e desktop. Um master aceitável não aprova automaticamente seus crops.
- A fotografia-base gerada deve nascer sem texto e sem marca. Quando uma aplicação Bentô for indispensável, ela usa o arquivo master oficial em composição controlada, com plano, perspectiva, luz, oclusão, escala e contraste verificados; overlays genéricos em lote são proibidos.
- Camiseta e jaleco: usar sempre a geometria do wordmark master, pequena e alta no peito como no mockup oficial, acompanhando tecido, luz, perspectiva e oclusão. Em superfície escura, usar dourado; em superfície clara, usar verde-escuro Bentô para contraste. Nunca gerar ou redesenhar letras por IA.
- Carrinho: partir das fotografias reais fornecidas e preservar integralmente os selos e wordmarks que já existem no equipamento. É proibido apagar, substituir, redesenhar ou carimbar outra marca sobre eles.
- Painéis: o wordmark master pode ter assinatura maior somente quando a superfície estiver livre e sua integração for controlada. O backdrop `PAR-09` é a aplicação canônica de `BENTÔ`, `1 ANO BENTÔ` e áreas `SUA MARCA AQUI`; não deve ser simulado por cartões HTML flutuantes.
- Oficina: os picolés devem fazer parte da cena, com sombra, mãos, bandejas e estágios reais de cobertura.
- Recovery: deve haver macas profissionais, circulação organizada e equipe adequada, sem promessa médica.
- Backdrop de parceiro: Bentô e `1 ANO BENTÔ` em destaque, com múltiplas áreas `SUA MARCA AQUI`; nunca aparece no convite da convidada.

O CMS possibilita substituir essas cenas sem código, mas não transforma um raster visualmente errado em fotografia correta.

## 10. Aceite

- Hero pessoal legível e equilibrado em 320, 375, 390 e 430 px.
- Uma única pergunta de tamanho e nenhuma ocorrência pública de `influenciadora` no RSVP.
- Campo infantil ausente até selecionar uma criança.
- Todas as 32 cenas editáveis e com fallback.
- Identidade nominal imutável pelo CMS.
- Upload sem colisão, tipo/tamanho restritos e mídia própria.
- Corte visual reposicionável e otimização obrigatória antes do upload.
- Assinatura de upload compatível com chaves Supabase legadas e `sb_secret_...`.
- Conflito de revisão não sobrescreve edição alheia.
- Painel utilizável por teclado, com targets de 44 px e rascunho preservado.
- Testes, lint, build, auditoria estrutural e QA renderizada aprovados antes de qualquer release.
