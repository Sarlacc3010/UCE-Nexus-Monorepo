import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  base: '/chatbot-mf/',
  plugins: [
    react(),
    federation({
      name: 'chatbot',
      filename: 'remoteEntry.js',
      // Exponer el ChatWidget
      exposes: {
        './ChatWidget': './src/ChatWidget.tsx',
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
    port: 5003,
    strictPort: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  },
  preview: {
    port: 5003,
    strictPort: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  }
})
