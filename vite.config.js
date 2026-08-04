import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const aqui = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  // O plugin do Tailwind só age em CSS que importa "tailwindcss" — hoje, apenas
  // src/ui/index.css. O site e o protótipo não veem uma linha de Tailwind.
  plugins: [react(), tailwindcss()],
  resolve: {
    // Alias "@/" no padrão shadcn: é o que faz qualquer componente colado do
    // 21st.dev / shadcn compilar sem editar os imports.
    alias: { '@': aqui('src') },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Três entradas independentes:
      //   index → o site em produção (JS + estilos inline)
      //   proto → protótipo de movimento (JS + estilos inline)
      //   ui    → bancada shadcn/Tailwind/TS, onde componentes de terceiros
      //           são testados sem encostar nos outros dois
      input: {
        index: aqui('index.html'),
        proto: aqui('proto.html'),
        ui: aqui('ui.html'),
      },
      output: {
        manualChunks: {
          // Vendor (React + ícones) em chunk próprio, cacheado entre deploys
          vendor: ['react', 'react-dom', 'lucide-react'],
        },
      },
    },
  },
})
