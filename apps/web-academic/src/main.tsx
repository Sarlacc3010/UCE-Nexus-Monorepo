import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AcademicApp from './AcademicApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AcademicApp />
  </StrictMode>,
)
