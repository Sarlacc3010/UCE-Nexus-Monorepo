import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PaymentsApp from './PaymentsApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PaymentsApp activeTab="aranceles" token="" />
  </StrictMode>,
)
