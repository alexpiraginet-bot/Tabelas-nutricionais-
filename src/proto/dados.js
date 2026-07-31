// Conteúdo REAL da Bentô (copiado do cardápio do site, src/modals.jsx) — nada
// inventado. Protótipo só troca a apresentação, nunca o dado.

export const VITRINE = [
  { id: "pic-mega", nome: "Bentôlé Proteico MEGA", info: "110 g aprox.", preco: "26,90", img: "/cardapio/pic-mega.jpg", cat: "Bentôlé" },
  { id: "gelato-box", nome: "Gelato Box", info: "700 ml · até 3 sabores", preco: "99,90", img: "/cardapio/gelato-box.jpg", cat: "Gelatos" },
  { id: "milk-pistache", nome: "Milkshake Pistache Zero", info: "gelato pistache zero batido c/ leite", preco: "39,90", img: "/cardapio/milkshake-pistache.jpg", cat: "Shakes" },
  { id: "pic-p", nome: "Bentôlé P Proteico", info: "50 g (aprox. 55 g) · embalagem prateada", preco: "14,90", img: "/cardapio/pic-p.jpg", cat: "Bentôlé" },
  { id: "affogato", nome: "Affogato Proteico", info: "1 bola de gelato (100 g) à escolha", preco: "24,90", img: "/cardapio/affogato.jpg", cat: "Cafeteria" },
  { id: "gelato-m", nome: "Gelato Tamanho M", info: "170 g · 1–2 sabores · p/ viagem", preco: "28,90", img: "/cardapio/gelato-m.jpg", cat: "Gelatos" },
];

// Trilho de arraste — itens reais, imagens reais
export const TRILHO = [
  { id: "frutas", nome: "Shake Frutas Vermelhas", info: "Whey fior di latte + 200 g de fruta", preco: "37,90", img: "/cardapio/frutas-vermelhas.jpg" },
  { id: "acai", nome: "Shake Açaí com Banana", info: "Whey de coco + 100 g açaí + 100 g banana", preco: "37,90", img: "/cardapio/acai-banana.jpg" },
  { id: "choco", nome: "Shake Choco Power", info: "Whey sabor chocolate + cacau 100%", preco: "37,90", img: "/cardapio/dark-chocolate.jpg" },
  { id: "morango", nome: "Shake Morango c/ Maracujá", info: "Whey sabor leite + 200 g de fruta", preco: "29,90", img: "/cardapio/morango-maracuja.jpg" },
  { id: "coldbrew", nome: "Cold Brew 200 ml", info: "sem adição de açúcares", preco: "24,90", img: "/cardapio/cold-brew.jpg" },
];

// Cenas da rolagem cinematográfica — o texto é o discurso que a marca já usa
// no site (meta description e banners), sem claim novo.
export const CENAS = [
  {
    id: "cena-1",
    etiqueta: "O que muda",
    titulo: "Sem adição de açúcares",
    texto: "O doce vem da própria receita. Nada de açúcar jogado por cima para disfarçar.",
    img: "/atelie/cena-1-sem-acucar.webp",
  },
  {
    id: "cena-2",
    etiqueta: "O que entra",
    titulo: "Rico em proteína",
    texto: "Sobremesa que trabalha a favor do seu dia — não contra ele.",
    img: "/atelie/cena-2-proteina.webp",
  },
  {
    id: "cena-3",
    etiqueta: "O que você lê",
    titulo: "Rótulo limpo",
    texto: "Cada ficha nutricional está publicada no site. Você confere antes de provar.",
    img: "/atelie/cena-3-rotulo-limpo.webp",
  },
];

export const LOJAS_RESUMO = [
  { nome: "Praia do Canto", bairro: "Vitória-ES", horario: "Ter a Sex · 08h–20h" },
  { nome: "Jardim Camburi", bairro: "Vitória-ES", horario: "Ter a Sex · 11h–19h" },
];
