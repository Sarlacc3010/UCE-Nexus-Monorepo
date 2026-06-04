import { useState, useEffect } from 'react'

interface GatewayHealth {
  status: string;
  gateway: string;
  ambiente: string;
  latency?: number;
}

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
      const res = await fetch('http://localhost:3000/health');
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
    <div style={{
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#f8fafc',
      maxWidth: '900px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* 1. Fila Superior: Monitor de Salud del Gateway */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Panel de Estado del Gateway */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #334155',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#a855f7', fontWeight: 700 }}>
            🛡️ Consola del API Gateway (MS-01)
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>Estado de Red:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: gatewayStatus === 'ONLINE' ? '#10b981' : gatewayStatus === 'OFFLINE' ? '#ef4444' : '#eab308',
                boxShadow: gatewayStatus === 'ONLINE' ? '0 0 10px #10b981' : gatewayStatus === 'OFFLINE' ? '0 0 10px #ef4444' : 'none'
              }}></div>
              <span style={{
                fontWeight: 700,
                fontSize: '14px',
                color: gatewayStatus === 'ONLINE' ? '#10b981' : gatewayStatus === 'OFFLINE' ? '#ef4444' : '#eab308'
              }}>
                {gatewayStatus}
              </span>
            </div>
          </div>

          {gatewayStatus === 'ONLINE' && healthData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Servicio:</span>
                <span style={{ fontWeight: 600 }}>{healthData.gateway}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Mensaje:</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>{healthData.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Ambiente:</span>
                <span style={{ textTransform: 'capitalize' }}>{healthData.ambiente}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Latencia local:</span>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>{healthData.latency} ms</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '12px', backgroundColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              {gatewayStatus === 'CHECKING' 
                ? 'Conectando con el endpoint /health...' 
                : 'Sin respuesta del Gateway en http://localhost:3000. Asegúrate de iniciar ms-01-gateway.'}
            </div>
          )}

          <div style={{ marginTop: '16px', fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
            Último chequeo: {lastCheck || 'Nunca'}
          </div>
        </div>

        {/* Registro del Monorepo */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #334155',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#a855f7', fontWeight: 700 }}>
            📦 Registro de Microservicios
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '180px', paddingRight: '4px' }}>
            {monorepoServices.map(service => (
              <div key={service.name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                backgroundColor: '#0f172a',
                borderRadius: '6px',
                fontSize: '11px'
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{service.name}</div>
                  <div style={{ color: '#64748b', fontSize: '10px' }}>{service.desc}</div>
                </div>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: `${service.color}15`,
                  color: service.color,
                  fontWeight: 700,
                  fontSize: '9px'
                }}>
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Sección Inferior: Decodificador JWT */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #334155',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#a855f7', fontWeight: 700 }}>
          🗝️ Inspector de Identidad (Token de Sesión Activa)
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94a3b8' }}>
          Este panel inspecciona los claims de seguridad del token de tu sesión de Keycloak activa en el portal, sin exponer el texto del token directamente.
        </p>

        {decodeError && (
          <div style={{ padding: '10px 14px', backgroundColor: '#ef444415', border: '1px solid #ef4444', borderRadius: '6px', fontSize: '12px', color: '#f87171' }}>
            ⚠️ {decodeError}
          </div>
        )}

        {decodedToken && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Cabecera del Token */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {/* Usuario */}
              <div style={{ backgroundColor: '#0f172a', padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155', flexGrow: 1 }}>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Usuario Autenticado</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>{decodedToken.preferred_username || 'No disponible'}</span>
              </div>
              {/* ID de Sujeto */}
              <div style={{ backgroundColor: '#0f172a', padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155', flexGrow: 1 }}>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Keycloak Subject ID (sub)</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', fontFamily: 'monospace' }}>{decodedToken.sub || 'No disponible'}</span>
              </div>
              {/* Estado de Expiración */}
              <div style={{
                backgroundColor: isTokenExpired(decodedToken.exp) ? '#ef444415' : '#10b98115',
                padding: '8px 16px',
                borderRadius: '8px',
                border: isTokenExpired(decodedToken.exp) ? '1px solid #ef4444' : '1px solid #10b981',
                minWidth: '120px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '10px', color: isTokenExpired(decodedToken.exp) ? '#ef4444' : '#10b981', display: 'block', fontWeight: 700 }}>Estado de Sesión</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: isTokenExpired(decodedToken.exp) ? '#ef4444' : '#10b981' }}>
                  {isTokenExpired(decodedToken.exp) ? 'CADUCADO ❌' : 'ACTIVO ✅'}
                </span>
              </div>
            </div>

            {/* Detalles Roles y JSON Completo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
              {/* Roles de Keycloak */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Roles asignados en Keycloak:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {decodedToken.realm_access?.roles ? (
                    decodedToken.realm_access.roles.map((role: string) => (
                      <span key={role} style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#334155', fontSize: '11px', color: '#e2e8f0', fontWeight: 500 }}>
                        {role}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Sin roles asociados.</span>
                  )}
                </div>
              </div>

              {/* JSON Payload Completo */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Payload de Identidad (Claims decodificados):</span>
                <pre style={{
                  backgroundColor: '#090d16',
                  color: '#cbd5e1',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  overflow: 'auto',
                  maxHeight: '150px',
                  border: '1px solid #1e293b',
                  margin: 0,
                  fontFamily: '"Fira Code", monospace'
                }}>
                  {JSON.stringify(decodedToken, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
