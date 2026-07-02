// Edge Middleware — serve as páginas de compartilhamento por query param.
// Os rewrites do vercel.json não funcionam para "/" porque o filesystem
// (dist/index.html) é resolvido antes deles; o middleware roda ANTES do
// filesystem, então /?tabelas etc. chega a /share/<view>.html (gerados no
// build por scripts/generate-share-pages.mjs). A URL do navegador não muda
// e a SPA continua lendo a query normalmente — só as metatags diferem.
export const config = { matcher: "/" };

const VIEWS = {
  tabelas: "tabelas",
  tabela: "tabelas",
  cardapio: "cardapio",
  delivery: "delivery",
  eventos: "eventos",
  parceria: "parceria",
  franquia: "parceria",
  vagas: "vagas",
  portfolio: "portfolio",
};

export default function middleware(req) {
  const url = new URL(req.url);
  for (const [key, view] of Object.entries(VIEWS)) {
    if (url.searchParams.has(key)) {
      url.pathname = `/share/${view}.html`;
      return new Response(null, { headers: { "x-middleware-rewrite": url.toString() } });
    }
  }
  // sem query conhecida: segue o fluxo normal (index.html)
}
