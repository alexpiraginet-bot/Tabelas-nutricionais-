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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
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
    desc: "Gelatos e picolés proteicos sem açúcar adicionado. Peça no site com entrega própria ou retire na loja.",
    image: "/og-share/cardapio.jpg",
  },
  delivery: {
    title: "Delivery — Bentô Gelatos",
    desc: "Peça no site e receba em casa: entrega própria em Vitória-ES ou retirada em loja, do jeito que preferir.",
    image: "/og-share/delivery.jpg",
  },
  eventos: {
    title: "Eventos — Bentô Gelatos",
    desc: "Leve a Bentô para o seu evento: casamentos, festas e corporativo com estrutura completa e orçamento online na hora.",
    image: "/og-share/eventos.jpg",
  },
  parceria: {
    title: "Seja um parceiro — Bentô Gelatos",
    desc: "Revenda, franquia e parcerias comerciais: leve o gelato proteico sem açúcar adicionado para o seu negócio.",
    image: "/og-share/parceria.jpg",
  },
  vagas: {
    title: "Trabalhe conosco — Bentô Gelatos",
    desc: "Faça parte do time Bentô: vagas abertas nas lojas e na produção. Candidate-se online.",
    image: "/og-share/vagas.jpg",
  },
  portfolio: {
    title: "Conheça a Bentô — Gelato com propósito",
    desc: "Nossa história, nossas lojas e o propósito por trás do gelato proteico sem açúcar adicionado de Vitória-ES.",
    image: "/og-share/portfolio.jpg",
  },
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const base = readFileSync(join(ROOT, "dist", "index.html"), "utf8");
mkdirSync(join(ROOT, "dist", "share"), { recursive: true });

// troca o conteúdo de uma metatag preservando o resto do documento
const setMeta = (html, attr, key, value) =>
  html.replace(new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`), `$1${esc(value)}$2`);

for (const [view, v] of Object.entries(VIEWS)) {
  let html = base;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${v.title.replace(/</g, "&lt;")}</title>`);
  html = setMeta(html, "name", "description", v.desc);
  html = setMeta(html, "property", "og:title", v.title);
  html = setMeta(html, "property", "og:description", v.desc);
  html = setMeta(html, "property", "og:url", `${SITE}/?${view}`);
  html = setMeta(html, "property", "og:image", SITE + v.image);
  html = setMeta(html, "name", "twitter:title", v.title);
  html = setMeta(html, "name", "twitter:description", v.desc);
  html = setMeta(html, "name", "twitter:image", SITE + v.image);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${SITE}/?${view}$2`);
  if (html === base) throw new Error(`share/${view}.html: nenhuma metatag substituída — confira o index.html`);
  writeFileSync(join(ROOT, "dist", "share", `${view}.html`), html);
}
console.log(`OK  ${Object.keys(VIEWS).length} páginas de compartilhamento → dist/share/`);
