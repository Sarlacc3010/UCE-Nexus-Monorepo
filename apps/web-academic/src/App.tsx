import { useState, useEffect, lazy, Suspense } from 'react';
import { withQueryProvider } from './QueryProvider';
import { MapPin, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import './App.css';

const ChatWidget = lazy(() => import('chatbot/ChatWidget'));

// Mapeo de laboratorios reales del catálogo con su capacidad y ubicación
const LABS_CATALOG = [
  { id: '1', code: 'LAB-Civil-01', name: 'Laboratorio de Civil 1', capacity: 45, location: 'Edificio de Laboratorios FICA, Piso 2', hours: '07:00 - 19:00' },
  { id: '2', code: 'LAB-Civil-02', name: 'Laboratorio de Civil 2', capacity: 40, location: 'Edificio de Laboratorios FICA, Piso 2', hours: '07:00 - 19:00' },
  { id: '3', code: 'LAB-Civil-03', name: 'Laboratorio de Civil 3', capacity: 35, location: 'Edificio de Laboratorios FICA, Piso 2', hours: '07:00 - 19:00' },
  { id: '4', code: 'LAB-Civil-04', name: 'Laboratorio de Civil 4', capacity: 35, location: 'Edificio de Laboratorios FICA, Piso 2', hours: '07:00 - 19:00' },
  { id: '5', code: 'LAB-Civil-05', name: 'Laboratorio de Civil 5', capacity: 50, location: 'Edificio de Laboratorios FICA, Piso 2', hours: '07:00 - 19:00' },
  { id: '6', code: 'LAB-Civil-06', name: 'Laboratorio de Civil 6', capacity: 50, location: 'Edificio de Laboratorios FICA, Piso 2', hours: '07:00 - 19:00' },
  { id: '7', code: 'LAB-Civil-07', name: 'Laboratorio de Civil 7', capacity: 45, location: 'Edificio de Laboratorios FICA, Piso 2', hours: '07:00 - 19:00' },
  { id: '8', code: 'LAB-Civil-08', name: 'Laboratorio de Civil 8', capacity: 60, location: 'Edificio de Laboratorios FICA, Piso 2', hours: '07:00 - 19:00' },
  { id: '9', code: 'LAB-Comp-01', name: 'Laboratorio de Computación 1', capacity: 45, location: 'Edificio de Laboratorios FICA, Piso 3', hours: '07:00 - 19:00' },
  { id: '10', code: 'LAB-Comp-02', name: 'Laboratorio de Computación 2', capacity: 40, location: 'Edificio de Laboratorios FICA, Piso 3', hours: '07:00 - 19:00' },
  { id: '11', code: 'LAB-Comp-03', name: 'Laboratorio de Computación 3', capacity: 35, location: 'Edificio de Laboratorios FICA, Piso 3', hours: '07:00 - 19:00' },
  { id: '12', code: 'LAB-Comp-04', name: 'Laboratorio de Computación 4', capacity: 50, location: 'Edificio de Laboratorios FICA, Piso 3', hours: '07:00 - 19:00' },
];

function App() {
  const [token, setToken] = useState('');
  const [viewMode, setViewMode] = useState<'catalog' | 'booking'>('catalog');
  
  const [labs, setLabs] = useState<any[]>(LABS_CATALOG);
  const [selectedLab, setSelectedLab] = useState(LABS_CATALOG[0]!);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);
  const [time, setTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [motivo, setMotivo] = useState('Práctica');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);

  const [logs, setLogs] = useState<string>('Esperando acción en el portal...');
  const [isLoading, setIsLoading] = useState(false);

  // Estados para chequeo de conflicto con horarios de clase
  const [conflict, setConflict] = useState<any>(null);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  // Leer el token automáticamente de la sesión de Keycloak
  useEffect(() => {
    const activeToken = localStorage.getItem('uce_token') || '';
    setToken(activeToken);
    if (!activeToken) {
      setLogs('⚠️ Sesión inactiva. Por favor, inicia sesión en el portal UCE-Nexus.');
    } else {
      setLogs('🟢 Sesión activa detectada desde el portal. Listo para reservar.');
    }
  }, []);

  // Consultar laboratorios reales desde la base de datos
  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/academic/laboratories');
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const formattedLabs = data.map((l: any) => ({
              ...l,
              hours: '07:00 - 19:00'
            }));
            setLabs(formattedLabs);
            setSelectedLab(formattedLabs[0]);
          }
        }
      } catch (err) {
        console.error('Error al consultar laboratorios en BD:', err);
      }
    };

    fetchLabs();
  }, []);

  // Consultar las asignaturas desde la base de datos a través del gateway (MS-03)
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/academic/subjects');
        if (response.ok) {
          const data = await response.json();
          setSubjects(data);
          if (data.length > 0) {
            setSelectedSubjectId(data[0].id.toString());
          }
        }
      } catch (err) {
        console.error('Error al consultar asignaturas en BD:', err);
      }
    };

    if (token) {
      fetchSubjects();
    }
  }, [token]);

  // Función para obtener el día de la semana en español
  const getDayName = (dateStr: string) => {
    const dateObj = new Date(`${dateStr}T12:00:00`);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dateObj.getDay()] || 'Lunes';
  };

  // Chequeo automático de conflictos de horarios de clases
  useEffect(() => {
    const checkScheduleConflict = async () => {
      if (!selectedLab || !date || !time) return;

      setIsCheckingConflict(true);
      const dia = getDayName(date);
      const horaInicio = `${time}:00`;
      const horaFin = `${endTime}:00`;

      try {
        const url = `http://localhost:3000/api/academic/schedules/check-conflict?lab_id=${selectedLab.id}&dia=${dia}&hora_inicio=${horaInicio}&hora_fin=${horaFin}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setConflict(data);
        }
      } catch (err) {
        console.error('Error verificando conflictos de horario:', err);
      } finally {
        setIsCheckingConflict(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      checkScheduleConflict();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [selectedLab, date, time, endTime]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = localStorage.getItem('uce_token') || token;
    if (!activeToken) {
      setLogs('⚠️ Error: Sesión inactiva. Debes iniciar sesión en el portal.');
      return;
    }

    if (conflict?.conflict) {
      setLogs('❌ Reserva denegada: Existe un conflicto insalvable con una clase programada en este horario.');
      return;
    }

    setIsLoading(true);
    setLogs('⏳ Transmitiendo petición de reserva con control de concurrencia en Redis...');

    const bookingDate = new Date(`${date}T${time}:00Z`).toISOString();

    try {
      const response = await fetch('http://localhost:3000/api/reservas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          resource_type: 'Laboratorio',
          resource_id: selectedLab.code,
          date: bookingDate,
          end_time: endTime,
          subject_id: selectedSubjectId,
          reason: motivo
        })
      });

      const data = await response.json();

      if (response.ok) {
        setLogs(`✅ ÉXITO DESDE EL MOTOR DE RESERVAS (Go gRPC):\n\n${JSON.stringify(data, null, 2)}`);
        // Volver al catálogo después de 2 segundos de éxito
        setTimeout(() => {
          setViewMode('catalog');
        }, 3000);
      } else {
        setLogs(`❌ PETICIÓN RECHAZADA POR EL SERVIDOR (${response.status}):\n\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (error: any) {
      setLogs(`🔌 ERROR DE CONEXIÓN CON EL GATEWAY:\n\n${error.message}\n\n¿El servicio ms-01-gateway está encendido en el puerto 3000?`);
    } finally {
      setIsLoading(false);
    }
  };

  const startBooking = (lab: any) => {
    setSelectedLab(lab);
    setViewMode('booking');
    setLogs(`Listo para reservar el ${lab.name}.`);
  };

  return (
    <div className="academic-container animate-fade-in" id="academic-panel">
      
      {viewMode === 'catalog' ? (
        /* VISTA 1: CATÁLOGO DE LABORATORIOS */
        <>
          <div className="catalog-header">
            <h2 className="catalog-title" id="booking-section-title">Catálogo de Laboratorios</h2>
            <p className="catalog-subtitle">Explora nuestros laboratorios y revisa su disponibilidad.</p>
          </div>

          {!token && (
            <div className="booking-session-status inactive" id="session-status-alert">
              <span>🔒</span> Debes iniciar sesión en el portal UCE-Nexus para realizar una reserva.
            </div>
          )}

          <div className="catalog-grid">
            {labs.map((lab) => (
              <div className="lab-card" key={lab.code}>
                <div className="lab-card-top-bar"></div>
                <div className="lab-card-header">
                  <h4 className="lab-card-name">{lab.name}</h4>
                  <span className="lab-card-capacity">{lab.capacity} MAX</span>
                </div>
                
                <div className="lab-card-body">
                  <div className="lab-detail-row">
                    <div className="lab-detail-icon-circle location">
                      <MapPin size={15} />
                    </div>
                    <div className="lab-detail-info">
                      <span className="lab-detail-label">Ubicación</span>
                      <span className="lab-detail-val">{lab.location.substring(0, 20)}...</span>
                    </div>
                  </div>

                  <div className="lab-detail-row">
                    <div className="lab-detail-icon-circle time">
                      <Clock size={15} />
                    </div>
                    <div className="lab-detail-info">
                      <span className="lab-detail-label">Horario</span>
                      <span className="lab-detail-val">{lab.hours}</span>
                    </div>
                  </div>
                </div>

                <button 
                  className="lab-card-btn" 
                  onClick={() => startBooking(lab)}
                  disabled={!token}
                  title={!token ? "Inicie sesión para reservar" : "Reservar laboratorio"}
                >
                  <span>Reservar</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="console-logs-container" style={{ marginTop: '40px' }}>
            <h5 className="console-logs-title">Consola de Estado:</h5>
            <pre className="console-logs-pre">{logs}</pre>
          </div>
        </>
      ) : (
        /* VISTA 2: FORMULARIO DE HACER RESERVA */
        <div className="booking-view-container">
          <button className="btn-back-to-catalog" onClick={() => setViewMode('catalog')}>
            <ArrowLeft size={14} />
            <span>Volver al Catálogo</span>
          </button>

          <div className="booking-form-card">
            <div className="booking-form-header">
              <h2 className="booking-form-title">Hacer Reserva</h2>
              <p className="booking-form-subtitle">Completa el formulario para reservar un laboratorio.</p>
            </div>

            {token && (
              <div className="booking-session-status active" id="session-status-alert">
                <span>🔑</span> Sesión de Keycloak activa y vinculada de manera segura.
              </div>
            )}

            <form onSubmit={handleBooking} className="booking-form">
              {/* Laboratorio (Preseleccionado) */}
              <div className="booking-form-group">
                <label className="booking-form-label" htmlFor="select-lab">Laboratorio</label>
                <select 
                  id="select-lab"
                  value={selectedLab.code}
                  onChange={(e) => {
                    const found = labs.find(l => l.code === e.target.value);
                    if (found) setSelectedLab(found);
                  }}
                  className="booking-form-select"
                  required
                >
                  {labs.map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div className="booking-form-group">
                <label className="booking-form-label" htmlFor="input-booking-date">Fecha</label>
                <input 
                  id="input-booking-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="booking-form-input"
                  required
                />
              </div>

              {/* Hora Inicio y Fin */}
              <div className="booking-form-row-2col">
                <div className="booking-form-group">
                  <label className="booking-form-label" htmlFor="input-booking-time">Hora Inicio</label>
                  <input 
                    id="input-booking-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="booking-form-input"
                    required
                  />
                </div>

                <div className="booking-form-group">
                  <label className="booking-form-label" htmlFor="input-booking-endtime">Hora Fin</label>
                  <input 
                    id="input-booking-endtime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="booking-form-input"
                    required
                  />
                </div>
              </div>

              {/* Alerta de Conflicto en Tiempo Real */}
              <div className="conflict-check-area">
                {isCheckingConflict ? (
                  <div className="booking-session-status active" style={{ backgroundColor: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' }}>
                    <span>🔄</span> Verificando horarios de clase en tiempo real...
                  </div>
                ) : conflict?.conflict ? (
                  <div className="booking-session-status inactive" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <span style={{ fontWeight: 700 }}>⚠️ Conflicto con Clase Programada:</span>
                    <span style={{ fontSize: '12.5px' }}>{conflict.details.subject_name} (Paralelo: {conflict.details.parallel_name}) en este laboratorio el {getDayName(date)} de {time} a {endTime}.</span>
                  </div>
                ) : (
                  <div className="booking-session-status active">
                    <span>✅</span> Horario disponible. No hay clases programadas en este laboratorio.
                  </div>
                )}
              </div>

              {/* Asignatura (Consulta a la BD del MFE de Matrículas MS-03) */}
              <div className="booking-form-group">
                <label className="booking-form-label" htmlFor="select-subject">Asignatura</label>
                <select 
                  id="select-subject"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="booking-form-select"
                  required
                >
                  {subjects.length > 0 ? (
                    subjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))
                  ) : (
                    <option value="">-- Seleccionar Asignatura (Cargando...) --</option>
                  )}
                </select>
              </div>

              {/* Motivo */}
              <div className="booking-form-group">
                <label className="booking-form-label" htmlFor="input-reason">Motivo</label>
                <input 
                  id="input-reason"
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="booking-form-input"
                  placeholder="ej. Práctica de laboratorio, Exposición, etc."
                  required
                />
              </div>

              {/* Botón de Confirmar Reserva */}
              <button 
                type="submit" 
                disabled={isLoading || conflict?.conflict}
                className="booking-form-btn-submit"
                style={{
                  cursor: conflict?.conflict ? 'not-allowed' : 'pointer',
                  background: conflict?.conflict ? '#64748b' : '#3b82f6'
                }}
              >
                {isLoading ? 'Solicitando reserva...' : conflict?.conflict ? '🔒 Bloqueado por Clase' : 'Confirmar Reserva'}
              </button>
            </form>
          </div>

          <div className="console-logs-container" style={{ marginTop: '28px' }}>
            <h5 className="console-logs-title">Consola de Estado y Transacciones:</h5>
            <pre className="console-logs-pre">{logs}</pre>
          </div>
        </div>
      )}
      <Suspense fallback={null}>
        <ChatWidget gatewayUrl="http://localhost:3000" />
      </Suspense>
    </div>
  );
}

export default withQueryProvider(App);