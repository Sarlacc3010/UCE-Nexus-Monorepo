import { lazy, Suspense } from 'react'
import './App.css'

// Importación dinámica a través de la red (Federación de Módulos)
const AcademicApp = lazy(() => import('academic/BookingApp'))

function App() {
  return (
    <div style={{ padding: '20px', border: '2px solid blue', borderRadius: '8px' }}>
      <h1>🎓 UCE-Nexus Cascarón Principal (Host)</h1>
      <p>Todo lo que está dentro del recuadro rojo viene del micro frontend académico por la red:</p>

      <div style={{ border: '2px dashed red', padding: '10px', marginTop: '20px' }}>
        <Suspense fallback={<div>Cargando módulo académico desde el puerto 5001...</div>}>
          <AcademicApp />
        </Suspense>
      </div>
    </div>
  )
}

export default App