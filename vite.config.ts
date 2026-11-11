import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' => los archivos generados usan rutas relativas, así el sitio
// funciona igual en GitHub Pages (usuario.github.io/repo/) que en un subdominio.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
