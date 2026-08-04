/// <reference types="vite/client" />

// O Vite resolve `import "./index.css"` em tempo de build; o TypeScript
// precisa desta declaração para não tratar o import como módulo ausente.
declare module "*.css";
