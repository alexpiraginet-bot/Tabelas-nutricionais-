// Gera páginas de compartilhamento (dist/share/*.html) com metatags OG próprias
// por link do site. O site é uma SPA por query string (/?tabelas, /?eventos…) e
// os robôs de preview (WhatsApp, Instagram, Telegram…) não executam JS — sem
// isso, todo link mostra a miniatura padrão da loja conceito.
// Cada página é o próprio dist/index.html com título/descrição/imagem trocados;
// o vercel.json roteia /?<view> para ela, então o usuário vê o site normal e o
// robô vê a metatag certa. Roda após o vite build (npm run build).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = process.env.BENTO_SHARE_ROOT || join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://bentogelateria.com";

// view → conteúdo do preview (imagens 1200×630 em public/og-share/, geradas dos banners)
const VIEWS = {
  tabelas: {
    title: "Tabelas Nutricionais — Bentô Gelatos",
    desc: "Consulte a tabela nutricional completa de cada sabor: calorias, proteínas, açúcares e alérgenos — transparência total, rótulo limpo.",
    image: "/og-share/tabelas.jpg",
  },
  cardapio: {
    title: "Cardápio — Bentô Gelatos",
    desc: "Gelatos e picolés proteicos sem adição de açúcares. Peça no site com entrega própria ou retire na loja.",
    image: "/og-share/cardapio.jpg",
  },
  pedir: {
    title: "Peça na Bentô — entrega própria e retirada",
    desc: "Peça no site e receba em casa pela nossa própria entrega, ou retire na loja da Praia do Canto. Pagamento no Pix.",
    image: "/og-share/cardapio.jpg",
    url: "/pedir",
  },
  // slug antigo mantido: links de "delivery" já compartilhados continuam válidos
  delivery: {
    title: "Peça na Bentô — entrega própria e retirada",
    desc: "Peça no site e receba em casa pela nossa própria entrega, ou retire na loja da Praia do Canto. Pagamento no Pix.",
    image: "/og-share/cardapio.jpg",
    url: "/pedir",
  },
  eventos: {
    title: "Eventos — Bentô Gelatos",
    desc: "Leve a Bentô para o seu evento: casamentos, festas e corporativo com estrutura completa e orçamento online na hora.",
    image: "/og-share/eventos.jpg",
  },
  parceria: {
    title: "Seja um parceiro — Bentô Gelatos",
    desc: "Revenda, franquia e parcerias comerciais: leve o gelato proteico sem adição de açúcares para o seu negócio.",
    image: "/og-share/parceria.jpg",
  },
  vagas: {
    title: "Trabalhe conosco — Bentô Gelatos",
    desc: "Faça parte do time Bentô: vagas abertas nas lojas e na produção. Candidate-se online.",
    image: "/og-share/vagas.jpg",
  },
  portfolio: {
    title: "Conheça a Bentô — Gelato com propósito",
    desc: "Nossa história, nossas lojas e o propósito por trás do gelato proteico sem adição de açúcares de Vitória-ES.",
    image: "/og-share/portfolio.jpg",
  },
};

const PATH_VIEWS = {
  "/movimento": {
    file: "movimento/index.html",
    title: "Bentô em Movimento — Convite 2026",
    desc: "Um projeto de 12 meses que começa em 12 de setembro no Le Buffet Lounge, em Vitória.",
    image: "/movimento/og-influenciadoras.jpg",
  },
  "/movimento/parceiros": {
    file: "movimento/parceiros/index.html",
    title: "Bentô em Movimento — Parcerias",
    desc: "Uma plataforma anual de experiência, presença e relacionamento para marcas parceiras.",
    image: "/movimento/og-parceiros.jpg",
  },
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const base = readFileSync(join(ROOT, "dist", "index.html"), "utf8");
mkdirSync(join(ROOT, "dist", "share"), { recursive: true });

// troca uma tag preservando o resto do documento; FALHA o build se a tag não
// existir no index.html — um preview silenciosamente errado é pior que build quebrado
const mustReplace = (html, re, replacement, what) => {
  if (!re.test(html)) throw new Error(`share pages: "${what}" não encontrada no dist/index.html — a estrutura mudou; atualize scripts/generate-share-pages.mjs`);
  return html.replace(re, replacement);
};
const setMeta = (html, attr, key, value) =>
  mustReplace(html, new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`), `$1${esc(value)}$2`, `meta ${key}`);

const renderSharePage = (v, targetUrl) => {
  let html = base;
  html = mustReplace(html, /<title>[^<]*<\/title>/, `<title>${v.title.replace(/</g, "&lt;")}</title>`, "title");
  html = setMeta(html, "name", "description", v.desc);
  html = setMeta(html, "property", "og:title", v.title);
  html = setMeta(html, "property", "og:description", v.desc);
  html = setMeta(html, "property", "og:url", targetUrl);
  html = setMeta(html, "property", "og:image", SITE + v.image);
  html = setMeta(html, "name", "twitter:title", v.title);
  html = setMeta(html, "name", "twitter:description", v.desc);
  html = setMeta(html, "name", "twitter:image", SITE + v.image);
  return mustReplace(html, /(<link rel="canonical" href=")[^"]*(")/, `$1${targetUrl}$2`, "link canonical");
};

for (const [view, v] of Object.entries(VIEWS)) {
  const alvo = v.url ? `${SITE}${v.url}` : `${SITE}/?${view}`;
  const html = renderSharePage(v, alvo);
  writeFileSync(join(ROOT, "dist", "share", `${view}.html`), html);
}

for (const [path, v] of Object.entries(PATH_VIEWS)) {
  const output = join(ROOT, "dist", v.file);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, renderSharePage(v, SITE + path));
}

console.log(`OK  ${Object.keys(VIEWS).length + Object.keys(PATH_VIEWS).length} páginas de compartilhamento → dist/share/ e rotas dedicadas`);
