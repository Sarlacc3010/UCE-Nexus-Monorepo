import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'academic',
      filename: 'remoteEntry.js',
      // Aquí declaramos qué componentes vamos a "prestarle" al Host
      exposes: {
        './BookingApp': './src/App.tsx',
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
  // Fijamos el puerto en 5001
  server: { port: 5001, strictPort: true },
  preview: { port: 5001, strictPort: true }
})