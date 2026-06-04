import { lazy, Suspense, useState, useEffect } from 'react'

// Importación dinámica a través de la red (Vite Module Federation)
const AcademicApp = lazy(() => import('academic/BookingApp'))
const GatewayApp = lazy(() => import('gateway/GatewayApp'))

function App() {
  const [activeTab, setActiveTab] = useState<'academic' | 'gateway'>('academic');
  const [token, setToken] = useState<string>(localStorage.getItem('uce_token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Comprobar si el token almacenado es válido y no está cerca de expirar (10 segundos de margen)
  const isTokenExpired = (jwtToken: string) => {
    try {
      const parts = jwtToken.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')));
      const currentTime = Math.floor(Date.now() / 1000);
      return currentTime > (payload.exp - 10);
    } catch {
      return true;
    }
  };

  const handleRefreshToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('uce_refresh_token');
    if (!refreshToken) {
      handleLogout();
      return false;
    }

    try {
      const response = await fetch('http://localhost:3000/api/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        localStorage.setItem('uce_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('uce_refresh_token', data.refresh_token);
        }
        setToken(data.access_token);
        return true;
      } else {
        handleLogout();
        return false;
      }
    } catch {
      handleLogout();
      return false;
    }
  };

  useEffect(() => {
    if (token) {
      if (isTokenExpired(token)) {
        handleRefreshToken();
      } else {
        // Chequeo periódico cada 10 segundos para ver si requiere refrescarse
        const interval = setInterval(() => {
          if (isTokenExpired(token)) {
            handleRefreshToken();
          }
        }, 10000);
        return () => clearInterval(interval);
      }
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setLoginError('Por favor introduce tu usuario y contraseña.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      // Llamada a través del API Gateway (BFF Proxy) para evitar bloqueos de CORS
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        localStorage.setItem('uce_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('uce_refresh_token', data.refresh_token);
        }
        setToken(data.access_token);
        setLoginError('');
      } else {
        setLoginError(data.error_description || 'Usuario o contraseña incorrectos.');
      }
    } catch (error: any) {
      setLoginError('No se pudo conectar con Keycloak. ¿Está encendido el contenedor en el puerto 8080?');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('uce_token');
    localStorage.removeItem('uce_refresh_token');
    setToken('');
    setUsername('');
    setPassword('');
  };

  // Si no hay un token válido, mostrar la pantalla de Login Premium
  if (!token || isTokenExpired(token)) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        margin: 0,
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          border: '1px solid #334155',
          padding: '40px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          boxSizing: 'border-box'
        }}>
          {/* Logo / Cabecera */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '24px',
              color: '#ffffff',
              marginBottom: '16px',
              boxShadow: '0 8px 16px rgba(99, 102, 241, 0.4)'
            }}>
              U
            </div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '0.5px' }}>UCE-Nexus</h2>
            <span style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Inicia sesión para acceder al portal académico</span>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                Usuario de Keycloak:
              </label>
              <input
                type="text"
                placeholder="ej. estudiante1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #475569',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                Contraseña:
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #475569',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {loginError && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#ef444415',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#f87171',
                lineHeight: '1.4'
              }}>
                ⚠️ {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                marginTop: '10px',
                boxShadow: '0 4px 6px rgba(99, 102, 241, 0.2)',
                transition: 'opacity 0.2s'
              }}
            >
              {isLoggingIn ? 'Autenticando en Keycloak...' : 'Ingresar al Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Si está autenticado, renderizar el Dashboard Principal
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      margin: 0,
      padding: 0
    }}>
      {/* 1. Barra Lateral de Navegación (Sidebar) */}
      <aside style={{
        width: '260px',
        backgroundColor: '#1e293b',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        boxSizing: 'border-box'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px',
          padding: '0 8px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '18px',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            U
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '0.5px' }}>UCE-Nexus</h2>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Portal de Control</span>
          </div>
        </div>

        {/* Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
          <button
            onClick={() => setActiveTab('academic')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'academic' ? '#334155' : 'transparent',
              color: activeTab === 'academic' ? '#6366f1' : '#94a3b8',
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            <span style={{ fontSize: '18px' }}>🔬</span>
            Reserva de Laboratorios
          </button>

          <button
            onClick={() => setActiveTab('gateway')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'gateway' ? '#334155' : 'transparent',
              color: activeTab === 'gateway' ? '#a855f7' : '#94a3b8',
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            <span style={{ fontSize: '18px' }}>🛡️</span>
            Control de Gateway & IAM
          </button>
        </nav>

        {/* Botón de Cerrar Sesión */}
        <div style={{ borderTop: '1px solid #334155', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              backgroundColor: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            <span>🚪</span> Cerrar Sesión
          </button>
          <div style={{
            fontSize: '11px',
            color: '#64748b',
            textAlign: 'center'
          }}>
            UCE-Nexus MFA Shell v1.0.0
          </div>
        </div>
      </aside>

      {/* 2. Contenido Principal */}
      <main style={{
        flexGrow: 1,
        padding: '40px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        maxHeight: '100vh'
      }}>
        {/* Cabecera */}
        <header style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
                {activeTab === 'academic' ? 'Módulo Académico' : 'Módulo de Seguridad e Identidad'}
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
                {activeTab === 'academic' 
                  ? 'Gestiona tus reservas de laboratorio interactuando con el motor de Go gRPC.' 
                  : 'Monitorea el estado del API Gateway (Node.js) y audita tokens JWT de Keycloak.'}
              </p>
            </div>
            <div style={{
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              fontSize: '12px',
              color: '#38bdf8',
              fontWeight: 600
            }}>
              Sesión Activa
            </div>
          </div>
        </header>

        {/* Contenido */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          minHeight: '400px'
        }}>
          <Suspense fallback={
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '350px',
              gap: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #334155',
                borderTopColor: activeTab === 'academic' ? '#6366f1' : '#a855f7',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>
                Cargando Módulo {activeTab === 'academic' ? 'Académico (Puerto 5001)' : 'Gateway (Puerto 5002)'} por la red...
              </span>
            </div>
          }>
            {activeTab === 'academic' ? <AcademicApp /> : <GatewayApp />}
          </Suspense>
        </div>
      </main>

      {/* Animación Spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default App