import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const aqui = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Duas entradas independentes: o site e o protótipo de movimento.
      // O protótipo tem bundle próprio (Framer Motion mora só nele) — o site
      // não carrega um byte a mais por causa dele.
      input: {
        index: aqui('index.html'),
        proto: aqui('proto.html'),
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
