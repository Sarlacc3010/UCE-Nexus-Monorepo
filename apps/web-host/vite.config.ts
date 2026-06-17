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
        academic: '/academic-mf/assets/remoteEntry.js',
        gateway: '/campus-mf/assets/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.2.6' },
        'react-dom': { singleton: true, requiredVersion: '^19.2.6' }
      } as any
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
  },
  // Fijamos el puerto del cascarón principal en 5000
  server: {
    port: 5000,
    strictPort: true,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  },
  preview: {
    port: 5000,
    strictPort: true,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  }
})