// Service Worker mínimo — existe para cumprir o critério de instalabilidade
// de navegadores/WebViews antigos (o Chrome atual não exige SW desde 2024).
// DELIBERADAMENTE sem cache: o site recebe deploys frequentes e um cache de
// SW desatualizado serviria conteúdo velho (tabelas nutricionais erradas é
// risco regulatório). Toda requisição segue direto para a rede.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // sem respondWith: o navegador segue o fluxo de rede normal
});
