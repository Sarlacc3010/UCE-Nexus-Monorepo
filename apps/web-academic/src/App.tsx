import { useState, useEffect } from 'react'

function App() {
  const [token, setToken] = useState('');
  const [resourceType, setResourceType] = useState('Laboratorio');
  const [resourceId, setResourceId] = useState('LAB-Cisco-01');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0] || '2026-06-03');
  const [time, setTime] = useState('10:00');
  const [logs, setLogs] = useState<string>('Esperando acción en el portal...');
  const [isLoading, setIsLoading] = useState(false);

  // Leer el token automáticamente de la sesión del Shell
  useEffect(() => {
    const activeToken = localStorage.getItem('uce_token') || '';
    setToken(activeToken);
    if (!activeToken) {
      setLogs('⚠️ Sesión inactiva. Por favor, inicia sesión en la barra lateral del portal UCE-Nexus.');
    } else {
      setLogs('🟢 Sesión activa detectada desde el portal. Listo para reservar.');
    }
  }, []);

  const handleBooking = async () => {
    const activeToken = localStorage.getItem('uce_token') || token;
    if (!activeToken) {
      setLogs('⚠️ Error: Sesión inactiva. Debes iniciar sesión en el portal.');
      return;
    }

    setIsLoading(true);
    setLogs('⏳ Transmitiendo petición al API Gateway (Node.js/TypeScript)...');

    // Combinar la fecha y hora seleccionada en un ISOString
    const bookingDate = new Date(`${date}T${time}:00Z`).toISOString();

    try {
      // Petición al API Gateway protegido
      const response = await fetch('http://localhost:3000/api/reservas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          resource_type: resourceType,
          resource_id: resourceId,
          date: bookingDate
        })
      });

      const data = await response.json();

      if (response.ok) {
        setLogs(`✅ ÉXITO DESDE EL MOTOR DE RESERVAS (Go gRPC):\n\n${JSON.stringify(data, null, 2)}`);
      } else {
        setLogs(`❌ PETICIÓN RECHAZADA POR EL SERVIDOR (${response.status}):\n\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (error: any) {
      setLogs(`🔌 ERROR DE CONEXIÓN CON EL GATEWAY:\n\n${error.message}\n\n¿El servicio ms-01-gateway está encendido en el puerto 3000?`);
    } finally {
      setIsLoading(false);
    }
  };

  const labs = [
    { id: 'LAB-Cisco-01', name: 'Laboratorio Cisco (Redes y Telecom.)' },
    { id: 'LAB-Software-03', name: 'Laboratorio de Ingeniería de Software' },
    { id: 'LAB-Hardware-05', name: 'Laboratorio de Arquitectura y Hardware' },
    { id: 'BIB-Estudio-12', name: 'Mesa de Estudio Grupal - Biblioteca' }
  ];

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#f8fafc',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Tarjeta de Reservas */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #334155',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ fontSize: '28px' }}>🔬</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#6366f1', fontWeight: 700 }}>Reserva de Laboratorios y Recursos</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Este Módulo conecta con el API Gateway de Node.js, el cual realiza la autorización JWT y ejecuta la reserva en el motor de Go mediante gRPC y control de concurrencia en Redis.
            </p>
          </div>
        </div>

        {/* Indicador de sesión activa en lugar de input de token */}
        {!token ? (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#ef444415',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#f87171',
            marginBottom: '20px',
            fontWeight: 500
          }}>
            🔒 Debes iniciar sesión en la barra lateral del portal para habilitar el formulario de reservas.
          </div>
        ) : (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#10b98115',
            border: '1px solid #10b981',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#34d399',
            marginBottom: '20px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🔑</span> Sesión de Keycloak activa y vinculada de manera segura.
          </div>
        )}

        {/* Parámetros del Recurso */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {/* Tipo de Recurso */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
              1. Tipo de Recurso:
            </label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              disabled={!token}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none',
                opacity: token ? 1 : 0.5
              }}
            >
              <option value="Laboratorio">Laboratorio</option>
              <option value="Biblioteca">Biblioteca</option>
              <option value="Auditorio">Auditorio</option>
            </select>
          </div>

          {/* Recurso Específico */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
              2. Selección del Recurso:
            </label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              disabled={!token}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none',
                opacity: token ? 1 : 0.5
              }}
            >
              {labs.map(lab => (
                <option key={lab.id} value={lab.id}>{lab.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fecha y Hora */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
              3. Fecha:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!token}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '8px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none',
                opacity: token ? 1 : 0.5
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
              4. Hora de Inicio:
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!token}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '8px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none',
                opacity: token ? 1 : 0.5
              }}
            />
          </div>
        </div>

        {/* Botón de Envío */}
        <button
          onClick={handleBooking}
          disabled={isLoading || !token}
          style={{
            backgroundColor: (isLoading || !token) ? '#475569' : '#6366f1',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: (isLoading || !token) ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            width: '100%',
            transition: 'background-color 0.2s',
            boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)'
          }}
        >
          {isLoading ? 'Solicitando y Procesando Mutex Lock...' : '🚀 Enviar Solicitud de Reserva'}
        </button>

        {/* Panel de Respuesta (Consola) */}
        <div style={{ marginTop: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
            Consola de gRPC & API Logs:
          </label>
          <pre style={{
            backgroundColor: '#090d16',
            color: '#10b981',
            padding: '16px',
            borderRadius: '8px',
            overflowX: 'auto',
            fontSize: '13px',
            border: '1px solid #1e293b',
            margin: 0,
            whiteSpace: 'pre-wrap',
            fontFamily: '"Fira Code", monospace',
            maxHeight: '200px'
          }}>
            {logs}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default App