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
        './DashboardApp': './src/DashboardApp.tsx',
        './AcademicApp': './src/AcademicApp.tsx',
      },
      remotes: {
        chatbot: '/chatbot-mf/assets/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.2.6' },
        'react-dom': { singleton: true, requiredVersion: '^19.2.6' }
      } as any
    })
  ],
  base: '/academic-mf/',
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  },
  server: {
    port: 5001,
    strictPort: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  },
  preview: {
    port: 5001,
    strictPort: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  }
})