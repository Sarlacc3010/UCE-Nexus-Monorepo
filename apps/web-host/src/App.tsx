import { lazy, Suspense, useState, useEffect } from 'react'
import './App.css'

// Importación dinámica a través de la red (Vite Module Federation)
const DashboardApp = lazy(() => import('academic/DashboardApp'))
const AcademicApp = lazy(() => import('academic/BookingApp'))
const GatewayApp = lazy(() => import('gateway/GatewayApp'))

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
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
          <div className="login-header">
            <div className="login-logo">U</div>
            <h1 className="login-title">SIU</h1>
            <span className="login-subtitle">Sistema Integrado Universitario</span>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="input-username">Usuario Institucional</label>
              <input id="input-username" type="text" placeholder="ej. juan.sanchez" value={username} onChange={(e) => setUsername(e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="input-password">Contraseña</label>
              <input id="input-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" />
            </div>

            {loginError && (
              <div className="login-error animate-fade-in" id="error-message">
                <span>⚠️</span> {loginError}
              </div>
            )}

            <button id="btn-login-submit" type="submit" disabled={isLoggingIn} className="login-button">
              {isLoggingIn ? 'Autenticando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Helper para renderizar contenido basado en la tab seleccionada
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardApp />;
      case 'matriculacion':
        return <AcademicApp />;
      case 'gateway':
        return <GatewayApp />;
      default:
        return (
          <div className="coming-soon-container">
            <h3>Módulo en construcción</h3>
            <p>Este módulo será implementado próximamente.</p>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-layout animate-fade-in" id="dashboard-shell">
      
      {/* 1. Barra Lateral de Navegación (Sidebar SIU) */}
      <aside className="sidebar siu-sidebar">
        {/* Logo */}
        <div className="sidebar-logo-section">
          <h2>SIU</h2>
          <span className="sidebar-subtitle">Sistema Integrado Universitario</span>
        </div>

        {/* Links de navegación */}
        <nav className="sidebar-nav">
          <button onClick={() => setActiveTab('dashboard')} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
            <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></span>
            Dashboard
          </button>
          <button onClick={() => setActiveTab('matriculacion')} className={`nav-item ${activeTab === 'matriculacion' ? 'active' : ''}`}>
            <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg></span>
            Matriculación (Reservas)
          </button>
          <button onClick={() => setActiveTab('calificaciones')} className={`nav-item ${activeTab === 'calificaciones' ? 'active' : ''}`}>
            <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></span>
            Calificaciones
          </button>
          <button onClick={() => setActiveTab('pagos')} className={`nav-item ${activeTab === 'pagos' ? 'active' : ''}`}>
            <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg></span>
            Pagos
          </button>
          <button onClick={() => setActiveTab('biblioteca')} className={`nav-item ${activeTab === 'biblioteca' ? 'active' : ''}`}>
            <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></span>
            Biblioteca
          </button>
          <button onClick={() => setActiveTab('notificaciones')} className={`nav-item ${activeTab === 'notificaciones' ? 'active' : ''}`}>
            <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></span>
            Notificaciones
          </button>
          <button onClick={() => setActiveTab('gateway')} className={`nav-item ${activeTab === 'gateway' ? 'active' : ''}`}>
            <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>
            Control de IAM / Gateway
          </button>
        </nav>

        {/* User Profile */}
        <div className="sidebar-user-profile" onClick={handleLogout} title="Cerrar sesión">
          <div className="user-avatar">JS</div>
          <div className="user-info">
            <span className="user-name">Juan Sánchez</span>
            <span className="user-role">Estudiante</span>
          </div>
        </div>
      </aside>

      {/* 2. Contenido Principal */}
      <main className="main-content">
        {/* Cabecera SIU */}
        <header className="siu-header">
          <div className="header-greeting">
            <h1>¡Bienvenido, Juan!</h1>
            <p>Viernes, 12 de Junio de 2026</p>
          </div>
          <button className="btn-notifications">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            Ver Notificaciones
          </button>
        </header>

        {/* Contenedor MFE */}
        <section className="mfe-viewport-container">
          <Suspense fallback={
            <div className="mfe-loader">
              <div className="loader-spinner animate-spin-loader"></div>
              <span className="loader-text">
                Cargando Módulo Remoto...
              </span>
            </div>
          }>
            {renderContent()}
          </Suspense>
        </section>
      </main>
    </div>
  )
}

export default App