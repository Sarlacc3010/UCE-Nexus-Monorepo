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
        './CampusApp': './src/CampusApp.tsx',
      },
      remotes: {
        chatbot: 'http://localhost:5003/assets/remoteEntry.js',
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
    minify: false,
    cssCodeSplit: false
  },
  server: {
    port: 5002,
    strictPort: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  },
  preview: {
    port: 5002,
    strictPort: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  }
})
