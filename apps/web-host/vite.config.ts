import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'host',
      // Aquí le decimos al Host dónde ir a buscar el código del módulo académico
      remotes: {
        academic: 'http://localhost:5001/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom']
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
  },
  // Fijamos el puerto del cascarón principal en 5000
  server: { port: 5000, strictPort: true },
  preview: { port: 5000, strictPort: true }
})