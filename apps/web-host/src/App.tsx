import { lazy, Suspense, useState, useEffect } from 'react'
import './App.css'

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
      <div className="login-container animate-fade-in" id="login-screen">
        <div className="login-ambient-blob-1"></div>
        <div className="login-ambient-blob-2"></div>
        
        <div className="login-card animate-slide-up">
          {/* Logo / Cabecera */}
          <div className="login-header">
            <div className="login-logo">U</div>
            <h1 className="login-title">UCE-Nexus</h1>
            <span className="login-subtitle">Inicia sesión para acceder al portal inteligente</span>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="input-username">
                Usuario de Keycloak
              </label>
              <input
                id="input-username"
                type="text"
                placeholder="ej. estudiante1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="input-password">
                Contraseña
              </label>
              <input
                id="input-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
              />
            </div>

            {loginError && (
              <div className="login-error animate-fade-in" id="error-message">
                <span>⚠️</span> {loginError}
              </div>
            )}

            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoggingIn}
              className="login-button"
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
    <div className="dashboard-layout animate-fade-in" id="dashboard-shell">
      <div className="main-ambient-light"></div>
      
      {/* 1. Barra Lateral de Navegación (Sidebar) */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo-section">
          <div className="sidebar-logo">U</div>
          <div className="sidebar-title-container">
            <h2>UCE-Nexus</h2>
            <span className="sidebar-subtitle">Portal de Control</span>
          </div>
        </div>

        {/* Links de navegación */}
        <nav className="sidebar-nav">
          <button
            id="nav-tab-academic"
            onClick={() => setActiveTab('academic')}
            className={`nav-item ${activeTab === 'academic' ? 'active-academic' : ''}`}
          >
            <span className="nav-item-icon">🔬</span>
            Reserva de Laboratorios
          </button>

          <button
            id="nav-tab-gateway"
            onClick={() => setActiveTab('gateway')}
            className={`nav-item ${activeTab === 'gateway' ? 'active-gateway' : ''}`}
          >
            <span className="nav-item-icon">🛡️</span>
            Control de Gateway & IAM
          </button>
        </nav>

        {/* Botón de Cerrar Sesión y versión */}
        <div className="sidebar-footer">
          <button
            id="btn-logout"
            onClick={handleLogout}
            className="logout-button"
          >
            <span>🚪</span> Cerrar Sesión
          </button>
          <div className="app-version">
            UCE-Nexus MFA Shell v1.1.0
          </div>
        </div>
      </aside>

      {/* 2. Contenido Principal */}
      <main className="main-content">
        {/* Cabecera */}
        <header className="main-header">
          <div className="header-title-section">
            <h1>
              {activeTab === 'academic' ? 'Módulo Académico' : 'Módulo de Seguridad e Identidad'}
            </h1>
            <p className="header-subtitle">
              {activeTab === 'academic' 
                ? 'Gestiona tus reservas de laboratorio interactuando con el motor de Go gRPC.' 
                : 'Monitorea el estado del API Gateway (Node.js) y audita tokens JWT de Keycloak.'}
            </p>
          </div>
          <div className="session-badge" id="session-status-badge">
            <span className="session-indicator"></span>
            Sesión Activa
          </div>
        </header>

        {/* Contenedor MFE */}
        <section className="mfe-viewport-container">
          <Suspense fallback={
            <div className="mfe-loader">
              <div className={`loader-spinner animate-spin-loader ${activeTab === 'academic' ? 'academic-theme' : 'gateway-theme'}`}></div>
              <span className="loader-text">
                Cargando Módulo {activeTab === 'academic' ? 'Académico (Puerto 5001)' : 'Gateway (Puerto 5002)'} por la red...
              </span>
            </div>
          }>
            {activeTab === 'academic' ? <AcademicApp /> : <GatewayApp />}
          </Suspense>
        </section>
      </main>
    </div>
  )
}

export default App