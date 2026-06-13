import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor (React + ícones) em chunk próprio, cacheado entre deploys
          vendor: ['react', 'react-dom', 'lucide-react'],
        },
      },
    },
  },
})
