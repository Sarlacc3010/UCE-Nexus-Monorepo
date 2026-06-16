import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ChatWidget from './ChatWidget.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="preview-container">
      <h1 className="preview-title">Asistente Nexus (MFE)</h1>
      <p className="preview-subtitle">
        Este es el microfrontend independiente del chatbot ejecutándose en el puerto 5003. El trigger flotante está activo en la esquina inferior derecha.
      </p>
    </div>
    <ChatWidget />
  </StrictMode>,
)
