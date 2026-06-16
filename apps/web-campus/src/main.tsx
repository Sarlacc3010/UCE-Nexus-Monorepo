import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CampusApp from './CampusApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CampusApp />
  </StrictMode>,
)
