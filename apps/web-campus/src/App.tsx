import { useState, useEffect, lazy, Suspense } from 'react'
import './App.css'

const ChatWidget = lazy(() => import('chatbot/ChatWidget'))
import ErrorBoundary from './ErrorBoundary';

interface GatewayHealth {
  status: string;
  gateway: string;
  ambiente: string;
  latency?: number;
}

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

function App() {
  // 1. Estado para el Healthcheck del Gateway
  const [gatewayStatus, setGatewayStatus] = useState<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const [healthData, setHealthData] = useState<GatewayHealth | null>(null);
  const [lastCheck, setLastCheck] = useState<string>('');

  // 2. Estado para el Decodificador JWT (Leer automático de la sesión)
  const [decodedToken, setDecodedToken] = useState<any>(null);
  const [decodeError, setDecodeError] = useState('');

  // Función para realizar el Healthcheck del Gateway (ms-01-gateway en puerto 3000)
  const checkHealth = async () => {
    const startTime = Date.now();
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        const latency = Date.now() - startTime;
        setGatewayStatus('ONLINE');
        setHealthData({ ...data, latency });
      } else {
        setGatewayStatus('OFFLINE');
        setHealthData(null);
      }
    } catch (e) {
      setGatewayStatus('OFFLINE');
      setHealthData(null);
    }
    setLastCheck(new Date().toLocaleTimeString());
  };

  // Ejecutar Healthcheck al montar y cada 5 segundos
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Escuchar y decodificar el token de la sesión activa en localStorage
  useEffect(() => {
    const checkSessionToken = () => {
      const token = localStorage.getItem('uce_token') || '';

      if (!token) {
        setDecodedToken(null);
        setDecodeError('Sesión inactiva. Inicia sesión en el portal para inspeccionar el token.');
        return;
      }

      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Formato de token inválido.');
        }

        // Decodificar Base64URL del payload
        const payloadBase64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
        const decodedPayload = JSON.parse(decodeURIComponent(window.atob(payloadBase64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')));

        setDecodedToken(decodedPayload);
        setDecodeError('');
      } catch (e: any) {
        setDecodedToken(null);
        setDecodeError(e.message || 'Error al decodificar el token de sesión.');
      }
    };

    checkSessionToken();
    // Ejecutar chequeo periódico por si cambia el estado de la sesión
    const sessionInterval = setInterval(checkSessionToken, 1000);
    return () => clearInterval(sessionInterval);
  }, []);

  // Verificar si un token decodificado está expirado
  const isTokenExpired = (exp: number) => {
    if (!exp) return false;
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime > exp;
  };

  // Listado del Monorepo con el estado de los servicios configurados
  const monorepoServices = [
    { name: 'ms-01-gateway', desc: 'API Edge Gateway (Node/TS)', status: gatewayStatus === 'ONLINE' ? 'ACTIVO' : 'INACTIVO', color: gatewayStatus === 'ONLINE' ? '#10b981' : '#ef4444' },
    { name: 'ms-02-identity', desc: 'IAM Service (Keycloak)', status: 'PREPARADO', color: '#3b82f6' },
    { name: 'ms-03-enrollment', desc: 'Matrículas & Estudiantes', status: 'ESQUELETO', color: '#64748b' },
    { name: 'ms-04-payment-write', desc: 'Eventos de Pago (Escritura)', status: 'ESQUELETO', color: '#64748b' },
    { name: 'ms-05-payment-read', desc: 'Consulta de Pagos (Lectura)', status: 'ESQUELETO', color: '#64748b' },
    { name: 'ms-06-booking', desc: 'Motor de Reservas (Go gRPC)', status: gatewayStatus === 'ONLINE' ? 'ACTIVO' : 'ESQUELETO', color: gatewayStatus === 'ONLINE' ? '#10b981' : '#64748b' },
    { name: 'ms-07-notifications', desc: 'Notificaciones por Email', status: 'ESQUELETO', color: '#64748b' },
    { name: 'ms-08-ai-router', desc: 'AI Routing Engine', status: 'ESQUELETO', color: '#64748b' },
    { name: 'ms-09-geocampus', desc: 'Telemetría y Mapas', status: 'ESQUELETO', color: '#64748b' },
    { name: 'ms-10-audit', desc: 'Auditoría & Logs', status: 'ESQUELETO', color: '#64748b' },
  ];

  return (
    <div className="campus-container animate-fade-in" id="campus-panel">
      {/* 1. Fila Superior: Monitor de Salud del Gateway & Registro */}
      <div className="campus-top-row">
        {/* Panel de Estado del Gateway */}
        <div className="campus-card" id="gateway-health-card">
          <h3 className="card-title-indigo">
            Consola del API Gateway (MS-01)
          </h3>
          
          <div className="gateway-row-item">
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Estado de Red:</span>
            <div className="gateway-status-dot-wrapper">
              <div className={`gateway-status-dot ${gatewayStatus.toLowerCase()} ${gatewayStatus === 'ONLINE' ? 'animate-pulse-green' : ''}`}></div>
              <span className={`gateway-status-text ${gatewayStatus.toLowerCase()}`} style={{ color: gatewayStatus === 'ONLINE' ? '#10b981' : gatewayStatus === 'OFFLINE' ? '#ef4444' : '#eab308' }}>
                {gatewayStatus}
              </span>
            </div>
          </div>

          {gatewayStatus === 'ONLINE' && healthData ? (
            <div className="gateway-details-list">
              <div className="gateway-detail-row">
                <span className="gateway-detail-key">Servicio:</span>
                <span className="gateway-detail-val">{healthData.gateway}</span>
              </div>
              <div className="gateway-detail-row">
                <span className="gateway-detail-key">Mensaje:</span>
                <span className="gateway-detail-val active-green">{healthData.status}</span>
              </div>
              <div className="gateway-detail-row">
                <span className="gateway-detail-key">Ambiente:</span>
                <span className="gateway-detail-val" style={{ textTransform: 'capitalize' }}>{healthData.ambiente}</span>
              </div>
              <div className="gateway-detail-row">
                <span className="gateway-detail-key">Latencia local:</span>
                <span className="gateway-detail-val active-cyan">{healthData.latency} ms</span>
              </div>
            </div>
          ) : (
            <div className="gateway-status-placeholder">
              {gatewayStatus === 'CHECKING' 
                ? 'Conectando con el endpoint /health...' 
                : `Sin respuesta del Gateway en ${API_URL || 'relativo /api'}. Asegúrate de iniciar ms-01-gateway.`}
            </div>
          )}

          <div className="gateway-timestamp">
            Último chequeo: {lastCheck || 'Nunca'}
          </div>
        </div>

        {/* Registro del Monorepo */}
        <div className="campus-card" id="services-registry-card">
          <h3 className="card-title-purple">
            Registro de Microservicios
          </h3>
          
          <div className="services-scroll-container">
            {monorepoServices.map(service => (
              <div key={service.name} className="service-item-row">
                <div>
                  <div className="service-name">{service.name}</div>
                  <div className="service-desc">{service.desc}</div>
                </div>
                <span 
                  className="service-status-chip"
                  style={{
                    backgroundColor: `${service.color}12`,
                    color: service.color,
                    border: `1px solid ${service.color}25`
                  }}
                >
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Sección Inferior: Decodificador JWT */}
      <div className="campus-card token-decoder-section" id="jwt-inspector-card">
        <h3 className="card-title-purple">
          Inspector de Identidad (Token de Sesión Activa)
        </h3>
        <p className="token-decoder-subtitle">
          Este panel inspecciona los claims de seguridad del token de tu sesión de Keycloak activa en el portal, sin exponer el texto del token directamente.
        </p>

        {decodeError && (
          <div className="token-error-banner animate-fade-in" id="jwt-decoder-error">
            ⚠️ {decodeError}
          </div>
        )}

        {decodedToken && (
          <div className="token-info-wrapper animate-slide-up">
            {/* Cabecera del Token */}
            <div className="token-badges-row">
              {/* Usuario */}
              <div className="token-badge-card">
                <span className="badge-card-lbl">Usuario Autenticado</span>
                <span className="badge-card-val">{decodedToken.preferred_username || 'No disponible'}</span>
              </div>
              {/* ID de Sujeto */}
              <div className="token-badge-card">
                <span className="badge-card-lbl">Keycloak Subject ID (sub)</span>
                <span className="badge-card-val mono">{decodedToken.sub || 'No disponible'}</span>
              </div>
              {/* Estado de Expiración */}
              <div className={`token-status-indicator ${isTokenExpired(decodedToken.exp) ? 'expired' : 'active'}`}>
                <span className="badge-card-lbl" style={{ color: 'inherit' }}>Estado de Sesión</span>
                <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
                  {isTokenExpired(decodedToken.exp) ? 'CADUCADO ❌' : 'ACTIVO ✅'}
                </span>
              </div>
            </div>

            {/* Detalles Roles y JSON Completo */}
            <div className="token-details-grid">
              {/* Roles de Keycloak */}
              <div className="roles-section">
                <span className="roles-section-lbl">Roles asignados en Keycloak:</span>
                <div className="roles-flex">
                  {decodedToken.realm_access?.roles ? (
                    decodedToken.realm_access.roles.map((role: string) => (
                      <span key={role} className="role-chip">
                        {role}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Sin roles asociados.</span>
                  )}
                </div>
              </div>

              {/* JSON Payload Completo */}
              <div className="json-visor-section">
                <span className="json-visor-lbl">Payload de Identidad (Claims decodificados):</span>
                <pre className="token-json-console" id="jwt-token-json">
                  {JSON.stringify(decodedToken, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <ChatWidget gatewayUrl={API_URL} />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

export default App
