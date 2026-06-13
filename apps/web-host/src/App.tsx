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
            <h1 className="login-title">SIIU</h1>
            <span className="login-subtitle">Sistema Integrado de Información Universitaria</span>
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
      
      {/* 1. Barra Lateral de Navegación (Sidebar SIIU) */}
      <aside className="sidebar siu-sidebar">
        {/* Logo */}
        <div className="sidebar-logo-section">
          <h2>SIIU</h2>
          <span className="sidebar-subtitle">Sistema Integrado de Información Universitaria</span>
        </div>

        {/* Links de navegación */}
        <nav className="sidebar-nav">
          <button onClick={() => setActiveTab('dashboard')} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
            Dashboard
          </button>
          <button onClick={() => setActiveTab('matriculacion')} className={`nav-item ${activeTab === 'matriculacion' ? 'active' : ''}`}>
            Matriculación (Reservas)
          </button>
          <button onClick={() => setActiveTab('calificaciones')} className={`nav-item ${activeTab === 'calificaciones' ? 'active' : ''}`}>
            Calificaciones
          </button>
          <button onClick={() => setActiveTab('pagos')} className={`nav-item ${activeTab === 'pagos' ? 'active' : ''}`}>
            Pagos
          </button>
          <button onClick={() => setActiveTab('biblioteca')} className={`nav-item ${activeTab === 'biblioteca' ? 'active' : ''}`}>
            Biblioteca
          </button>
          <button onClick={() => setActiveTab('notificaciones')} className={`nav-item ${activeTab === 'notificaciones' ? 'active' : ''}`}>
            Notificaciones
          </button>
          <button onClick={() => setActiveTab('gateway')} className={`nav-item ${activeTab === 'gateway' ? 'active' : ''}`}>
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