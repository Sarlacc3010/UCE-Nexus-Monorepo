import { useState, useEffect } from 'react'
import './App.css'

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
    <div className="academic-container animate-fade-in" id="academic-panel">
      {/* Tarjeta de Reservas */}
      <div className="booking-card">
        <header className="booking-header">
          <div className="booking-header-icon">🔬</div>
          <div>
            <h2 className="booking-title" id="booking-section-title">Reserva de Laboratorios y Recursos</h2>
            <p className="booking-subtitle">
              Este Módulo conecta con el API Gateway de Node.js, el cual realiza la autorización JWT y ejecuta la reserva en el motor de Go mediante gRPC y control de concurrencia en Redis.
            </p>
          </div>
        </header>

        {/* Indicador de sesión activa */}
        {!token ? (
          <div className="session-status-container session-status-inactive" id="session-status-alert">
            <span>🔒</span> Debes iniciar sesión en la barra lateral del portal para habilitar el formulario de reservas.
          </div>
        ) : (
          <div className="session-status-container session-status-active" id="session-status-alert">
            <span>🔑</span> Sesión de Keycloak activa y vinculada de manera segura.
          </div>
        )}

        {/* Parámetros del Recurso */}
        <div className="form-grid-2x2">
          {/* Tipo de Recurso */}
          <div>
            <label className="booking-field-label" htmlFor="select-resource-type">
              1. Tipo de Recurso
            </label>
            <select
              id="select-resource-type"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              disabled={!token}
              className="booking-select"
            >
              <option value="Laboratorio">Laboratorio</option>
              <option value="Biblioteca">Biblioteca</option>
              <option value="Auditorio">Auditorio</option>
            </select>
          </div>

          {/* Recurso Específico */}
          <div>
            <label className="booking-field-label" htmlFor="select-resource-id">
              2. Selección del Recurso
            </label>
            <select
              id="select-resource-id"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              disabled={!token}
              className="booking-select"
            >
              {labs.map(lab => (
                <option key={lab.id} value={lab.id}>{lab.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fecha y Hora */}
        <div className="form-grid-2x2" style={{ marginBottom: '28px' }}>
          <div>
            <label className="booking-field-label" htmlFor="input-booking-date">
              3. Fecha
            </label>
            <input
              id="input-booking-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!token}
              className="booking-input-date"
            />
          </div>

          <div>
            <label className="booking-field-label" htmlFor="input-booking-time">
              4. Hora de Inicio
            </label>
            <input
              id="input-booking-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!token}
              className="booking-input-date"
            />
          </div>
        </div>

        {/* Botón de Envío */}
        <button
          id="btn-submit-booking"
          onClick={handleBooking}
          disabled={isLoading || !token}
          className="booking-submit-button"
        >
          {isLoading ? 'Solicitando y Procesando Mutex Lock...' : '🚀 Enviar Solicitud de Reserva'}
        </button>

        {/* Panel de Respuesta (Consola) */}
        <div className="console-wrapper">
          <label className="console-label" htmlFor="academic-console-logs">
            Consola de gRPC & API Logs:
          </label>
          <pre className="hacker-console" id="academic-console-logs">
            {logs}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default App