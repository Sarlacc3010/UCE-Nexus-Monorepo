import { useState } from 'react'

function App() {
  const [token, setToken] = useState('');
  const [logs, setLogs] = useState<string>('Esperando acción...');
  const [isLoading, setIsLoading] = useState(false);

  const handleBooking = async () => {
    if (!token) {
      setLogs('⚠️ Error: Necesitas pegar el Token JWT de Keycloak primero.');
      return;
    }

    setIsLoading(true);
    setLogs('⏳ Enviando petición al API Gateway (Node.js)...');

    try {
      // Aquí llamamos a tu microservicio Node.js
      const response = await fetch('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Enviamos el token para pasar el middleware
        },
        body: JSON.stringify({
          labId: 'LAB-Cisco-01',
          date: '2026-06-01T10:00:00Z'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setLogs(`✅ ÉXITO:\n${JSON.stringify(data, null, 2)}`);
      } else {
        setLogs(`❌ RECHAZADO:\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (error: any) {
      setLogs(`🔌 ERROR DE RED:\n${error.message}\n¿Está encendido el Gateway en el puerto 3000?`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'left', padding: '10px' }}>
      <h2 style={{ color: '#2c3e50', marginTop: 0 }}>🔬 Reserva de Laboratorios</h2>
      <p style={{ fontSize: '14px', color: '#666' }}>
        Este micro frontend se comunica con Node.js y Go vía gRPC.
      </p>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>1. Pega tu Token de Keycloak:</label>
        <input
          type="text"
          placeholder="eyJh..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
        />
      </div>

      <button
        onClick={handleBooking}
        disabled={isLoading}
        style={{
          backgroundColor: '#3498db', color: 'white', border: 'none',
          padding: '10px 20px', borderRadius: '5px', cursor: 'pointer',
          fontWeight: 'bold', width: '100%'
        }}
      >
        {isLoading ? 'Procesando...' : '2. 🚀 Solicitar Reserva (LAB-Cisco-01)'}
      </button>

      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Respuesta del Servidor:</label>
        <pre style={{
          backgroundColor: '#1e1e1e', color: '#4af626', padding: '15px',
          borderRadius: '5px', overflowX: 'auto', fontSize: '13px'
        }}>
          {logs}
        </pre>
      </div>
    </div>
  )
}

export default App