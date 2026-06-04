import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'gateway',
      filename: 'remoteEntry.js',
      // Exponer el componente de panel de control de seguridad para que lo consuma el Host
      exposes: {
        './GatewayApp': './src/App.tsx',
      },
      shared: ['react', 'react-dom']
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  },
  // Ejecutar en el puerto 5002 para evitar colisiones
  server: { port: 5002, strictPort: true },
  preview: { port: 5002, strictPort: true }
})
