import { lazy, Suspense, useState, useEffect } from 'react'
import './App.css'
import {
  GraduationCap,
  Award,
  Calendar,
  BookOpen,
  FileText,
  CreditCard,
  Car,
  FlaskConical,
  Mic,
  Activity,
  Map,
  Bell,
  AlertTriangle,
  UserMinus,
  LayoutDashboard,
  Users,
  LogOut,
  Globe,
  ChevronDown
} from 'lucide-react'

// Iconos SVG locales para Facebook e Instagram
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

// Importación dinámica a través de la red (Vite Module Federation)
const AcademicApp = lazy(() => import('academic/AcademicApp'))
const CampusApp = lazy(() => import('gateway/CampusApp'))

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

// Obtener la información del usuario decodificando el token JWT
const getUserInfoFromToken = (jwtToken: string) => {
  if (!jwtToken) return { nombre: 'Estudiante Piloto', role: 'Estudiante' };
  try {
    const parts = jwtToken.split('.');
    if (parts.length !== 3) return { nombre: 'Estudiante Piloto', role: 'Estudiante' };
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')));
    
    // Obtener nombre
    const nombre = payload.name || payload.preferred_username || 'Usuario';
    
    // Obtener rol
    let role = 'Estudiante';
    const realmRoles = payload.realm_access?.roles || [];
    if (realmRoles.includes('admin') || realmRoles.includes('ADMIN')) {
      role = 'Administrador';
    } else {
      const hasAdminRole = realmRoles.some((r: string) => r.toLowerCase().includes('admin'));
      if (hasAdminRole) {
        role = 'Administrador';
      }
    }
    
    return { nombre, role };
  } catch {
    return { nombre: 'Usuario UCE', role: 'Estudiante' };
  }
};

function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  
  const getInitialToken = () => {
    const stored = localStorage.getItem('uce_token');
    if (stored && !isTokenExpired(stored)) {
      return stored;
    }
    return '';
  };

  const [token, setToken] = useState<string>(getInitialToken());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Estado para el colapso del menú lateral
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    academicos: false, // Empezar expandido
    pagos: true,       // Empezar colapsado
    reservas: false,   // Empezar expandido
    maps: true,
    solicitudes: true,
    administracion: false
  });

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const handleRefreshToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('uce_refresh_token');
    if (!refreshToken || isTokenExpired(refreshToken)) {
      handleLogout();
      return false;
    }

    try {
      const response = await fetch('/api/refresh', {
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
      // Intentar login por API Gateway
      const response = await fetch('/api/login', {
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

  // Información del usuario decodificada
  const userInfo = getUserInfoFromToken(token);

  // Helper para renderizar contenido basado en la tab seleccionada
  const renderContent = () => {
    const academicTabs = [
      'home', 'dashboard', 'matriculas', 'calificaciones', 'malla',
      'seguro_vida', 'matricula_vigente', 'matriculacion',
      'auditorio', 'canchas', 'tercera_matricula', 'retiro'
    ];

    if (academicTabs.includes(activeTab)) {
      return <AcademicApp activeTab={activeTab} token={token} />;
    } else {
      return <CampusApp activeTab={activeTab} token={token} />;
    }
  };

  // Obtener iniciales para el avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isUserAuthenticated = token && !isTokenExpired(token);

  return (
    <div className="nexus-shell-container animate-fade-in" id="dashboard-shell">
      
      {/* 1. Header Superior (Siempre visible) */}
      <header className="nexus-header">
        <div className="nexus-header-left">
          <div className="nexus-logo-circle">
            <img src="/uce-logo.png" alt="UCE Logo" className="nexus-logo-img" />
          </div>
          <div className="nexus-header-divider"></div>
          <div className="nexus-header-text">
            <h2 className="nexus-header-title">UCE - Nexus</h2>
            <span className="nexus-header-subtitle">Universidad Central del Ecuador</span>
            <p className="nexus-header-quote">"Omnium Potentior Est Sapientia"</p>
          </div>
        </div>

        {isUserAuthenticated && (
          <div className="nexus-header-right">
            <div className="nexus-profile-badge">
              <div className="nexus-profile-avatar">
                {getInitials(userInfo.nombre)}
              </div>
              <div className="nexus-profile-info">
                <span className="nexus-profile-name">{userInfo.nombre}</span>
                <span className="nexus-profile-role">{userInfo.role}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="nexus-btn-logout" title="Cerrar sesión">
              <LogOut size={16} />
              <span>Salir</span>
            </button>
          </div>
        )}
      </header>

      {/* 2. Área Central (Sidebar + Main Viewport o Login) */}
      <div className="nexus-shell-middle">
        
        {!isUserAuthenticated ? (
          /* PANTALLA DE LOGIN CON HEADER Y FOOTER VISIBLES */
          <div className="nexus-login-container animate-fade-in" id="login-screen">
            <div className="nexus-login-blob-1"></div>
            <div className="nexus-login-blob-2"></div>
            
            <div className="nexus-login-card animate-slide-up">
              <div className="nexus-login-header">
                <div className="nexus-login-logo-container">
                  <img src="/uce-logo.png" alt="UCE Logo" className="nexus-login-logo-img" />
                </div>
                <h1 className="nexus-login-title">Bienvenido</h1>
                <span className="nexus-login-subtitle">Ingresa tus credenciales</span>
              </div>

              <form onSubmit={handleLogin} className="nexus-login-form">
                <div className="nexus-form-group">
                  <label className="nexus-form-label" htmlFor="input-username">Usuario Institucional</label>
                  <input 
                    id="input-username" 
                    type="text" 
                    placeholder="ej. juan.sanchez" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    className="nexus-form-input" 
                    required
                  />
                </div>

                <div className="nexus-form-group">
                  <label className="nexus-form-label" htmlFor="input-password">Contraseña</label>
                  <input 
                    id="input-password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="nexus-form-input" 
                    required
                  />
                </div>

                {loginError && (
                  <div className="nexus-login-error animate-fade-in" id="error-message">
                    <span>⚠️</span> {loginError}
                  </div>
                )}

                <button id="btn-login-submit" type="submit" disabled={isLoggingIn} className="nexus-login-btn">
                  {isLoggingIn ? <div className="nexus-loader-spin"></div> : 'Iniciar Sesión'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* INTERFAZ DEL PORTAL (SIDEBAR + MAIN CONTENT) */
          <>
            {/* Barra Lateral de Navegación */}
            <aside className="nexus-sidebar">
              <div className="nexus-sidebar-title-bar">
                <span>NAVEGACIÓN</span>
              </div>

              <nav className="nexus-sidebar-nav">
                {/* Inicio / Home */}
                <button 
                  onClick={() => setActiveTab('home')} 
                  className={`nexus-nav-item ${activeTab === 'home' ? 'active' : ''}`}
                  style={{ marginBottom: '16px' }}
                >
                  <span className="nexus-nav-item-icon"><LayoutDashboard size={18} /></span>
                  Inicio
                </button>

                {userInfo.role === 'Administrador' ? (
                  /* SIDEBAR PARA ADMINISTRADOR (DESPLEGABLE) */
                  <div className="nexus-nav-group">
                    <button className="nexus-nav-group-header" onClick={() => toggleGroup('administracion')}>
                      <span>Administración</span>
                      <ChevronDown size={14} className={`chevron-icon ${!collapsedGroups.administracion ? 'rotated' : ''}`} />
                    </button>
                    <div className={`nexus-nav-group-content ${collapsedGroups.administracion ? 'collapsed' : ''}`}>
                      <button 
                        onClick={() => setActiveTab('dashboard')} 
                        className={`nexus-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                      >
                        <span className="nexus-nav-item-icon"><LayoutDashboard size={18} /></span>
                        Dashboard
                      </button>
                      <button 
                        onClick={() => setActiveTab('academic_admin')} 
                        className={`nexus-nav-item ${activeTab === 'academic_admin' ? 'active' : ''}`}
                      >
                        <span className="nexus-nav-item-icon"><GraduationCap size={18} /></span>
                        Gestión Académica
                      </button>
                      <button 
                        onClick={() => setActiveTab('users_admin')} 
                        className={`nexus-nav-item ${activeTab === 'users_admin' ? 'active' : ''}`}
                      >
                        <span className="nexus-nav-item-icon"><Users size={18} /></span>
                        Gestión de Usuarios
                      </button>
                      <button 
                        onClick={() => setActiveTab('gateway')} 
                        className={`nexus-nav-item ${activeTab === 'gateway' ? 'active' : ''}`}
                      >
                        <span className="nexus-nav-item-icon"><FileText size={18} /></span>
                        Logs del Sistema
                      </button>
                    </div>
                  </div>
                ) : (
                  /* SIDEBAR PARA ESTUDIANTE (DESPLEGABLE) */
                  <>
                    {/* Grupo Académicos */}
                    <div className="nexus-nav-group">
                      <button className="nexus-nav-group-header" onClick={() => toggleGroup('academicos')}>
                        <span>Académicos</span>
                        <ChevronDown size={14} className={`chevron-icon ${!collapsedGroups.academicos ? 'rotated' : ''}`} />
                      </button>
                      <div className={`nexus-nav-group-content ${collapsedGroups.academicos ? 'collapsed' : ''}`}>
                        <button 
                          onClick={() => setActiveTab('matriculas')} 
                          className={`nexus-nav-item ${activeTab === 'matriculas' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><GraduationCap size={18} /></span>
                          Matriculas
                        </button>
                        <button 
                          onClick={() => setActiveTab('calificaciones')} 
                          className={`nexus-nav-item ${activeTab === 'calificaciones' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><Award size={18} /></span>
                          Calificaciones
                        </button>
                        <button 
                          onClick={() => setActiveTab('dashboard')} 
                          className={`nexus-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><Calendar size={18} /></span>
                          Horario matricula vigente
                        </button>
                        <button 
                          onClick={() => setActiveTab('malla')} 
                          className={`nexus-nav-item ${activeTab === 'malla' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><BookOpen size={18} /></span>
                          Malla Curricular
                        </button>
                        
                        {/* Subgrupo Certificados */}
                        <div className="nexus-nav-item" style={{ cursor: 'default', pointerEvents: 'none', paddingBottom: 0 }}>
                          <span className="nexus-nav-item-icon"><FileText size={18} /></span>
                          Certificados
                        </div>
                        <div className="nexus-nav-submenu">
                          <button 
                            onClick={() => setActiveTab('seguro_vida')} 
                            className={`nexus-nav-subitem ${activeTab === 'seguro_vida' ? 'active' : ''}`}
                          >
                            Seguro de vida
                          </button>
                          <button 
                            onClick={() => setActiveTab('matricula_vigente')} 
                            className={`nexus-nav-subitem ${activeTab === 'matricula_vigente' ? 'active' : ''}`}
                          >
                            Matricula vigente
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Grupo Pagos */}
                    <div className="nexus-nav-group">
                      <button className="nexus-nav-group-header" onClick={() => toggleGroup('pagos')}>
                        <span>Pagos</span>
                        <ChevronDown size={14} className={`chevron-icon ${!collapsedGroups.pagos ? 'rotated' : ''}`} />
                      </button>
                      <div className={`nexus-nav-group-content ${collapsedGroups.pagos ? 'collapsed' : ''}`}>
                        <button 
                          onClick={() => setActiveTab('aranceles')} 
                          className={`nexus-nav-item ${activeTab === 'aranceles' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><CreditCard size={18} /></span>
                          Pago de aranceles
                        </button>
                        <button 
                          onClick={() => setActiveTab('estacionamiento')} 
                          className={`nexus-nav-item ${activeTab === 'estacionamiento' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><Car size={18} /></span>
                          Pago de estacionamiento
                        </button>
                      </div>
                    </div>

                    {/* Grupo Reservas */}
                    <div className="nexus-nav-group">
                      <button className="nexus-nav-group-header" onClick={() => toggleGroup('reservas')}>
                        <span>Reservas</span>
                        <ChevronDown size={14} className={`chevron-icon ${!collapsedGroups.reservas ? 'rotated' : ''}`} />
                      </button>
                      <div className={`nexus-nav-group-content ${collapsedGroups.reservas ? 'collapsed' : ''}`}>
                        <button 
                          onClick={() => setActiveTab('matriculacion')} 
                          className={`nexus-nav-item ${activeTab === 'matriculacion' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><FlaskConical size={18} /></span>
                          Laboratorios
                        </button>
                        <button 
                          onClick={() => setActiveTab('auditorio')} 
                          className={`nexus-nav-item ${activeTab === 'auditorio' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><Mic size={18} /></span>
                          Auditorio
                        </button>
                        <button 
                          onClick={() => setActiveTab('canchas')} 
                          className={`nexus-nav-item ${activeTab === 'canchas' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><Activity size={18} /></span>
                          Canchas
                        </button>
                      </div>
                    </div>

                    {/* Grupo Mapa */}
                    <div className="nexus-nav-group">
                      <button className="nexus-nav-group-header" onClick={() => toggleGroup('maps')}>
                        <span>Mapa en tiempo real</span>
                        <ChevronDown size={14} className={`chevron-icon ${!collapsedGroups.maps ? 'rotated' : ''}`} />
                      </button>
                      <div className={`nexus-nav-group-content ${collapsedGroups.maps ? 'collapsed' : ''}`}>
                        <button 
                          onClick={() => setActiveTab('maps')} 
                          className={`nexus-nav-item ${activeTab === 'maps' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><Map size={18} /></span>
                          UCE-Maps
                        </button>
                        <button 
                          onClick={() => setActiveTab('eventos')} 
                          className={`nexus-nav-item ${activeTab === 'eventos' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><Bell size={18} /></span>
                          Eventos activos
                        </button>
                      </div>
                    </div>

                    {/* Grupo Solicitudes */}
                    <div className="nexus-nav-group">
                      <button className="nexus-nav-group-header" onClick={() => toggleGroup('solicitudes')}>
                        <span>Solicitudes</span>
                        <ChevronDown size={14} className={`chevron-icon ${!collapsedGroups.solicitudes ? 'rotated' : ''}`} />
                      </button>
                      <div className={`nexus-nav-group-content ${collapsedGroups.solicitudes ? 'collapsed' : ''}`}>
                        <button 
                          onClick={() => setActiveTab('tercera_matricula')} 
                          className={`nexus-nav-item ${activeTab === 'tercera_matricula' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><AlertTriangle size={18} /></span>
                          Tercera matricula y la excepcionalidad
                        </button>
                        <button 
                          onClick={() => setActiveTab('retiro')} 
                          className={`nexus-nav-item ${activeTab === 'retiro' ? 'active' : ''}`}
                        >
                          <span className="nexus-nav-item-icon"><UserMinus size={18} /></span>
                          Retiro
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </nav>
            </aside>

            {/* Contenido Principal */}
            <main className="nexus-main-content">
              <section className="nexus-viewport-container">
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
          </>
        )}
      </div>

      {/* 3. Footer Inferior (Siempre visible) */}
      <footer className="nexus-footer">
        <div className="nexus-footer-left">
          <span className="nexus-footer-copyright">
            © 2025 Universidad Central del Ecuador
          </span>
          <span className="nexus-footer-reserved">
            Todos los derechos reservados
          </span>
        </div>
        <div className="nexus-footer-right">
          <a href="https://www.uce.edu.ec" target="_blank" rel="noopener noreferrer" className="nexus-social-link" title="Web Oficial">
            <Globe size={16} />
          </a>
          <a href="https://www.facebook.com/lacentralec" target="_blank" rel="noopener noreferrer" className="nexus-social-link" title="Facebook">
            <FacebookIcon />
          </a>
          <a href="https://www.instagram.com/laucentralec/" target="_blank" rel="noopener noreferrer" className="nexus-social-link" title="Instagram">
            <InstagramIcon />
          </a>
        </div>
      </footer>

    </div>
  )
}

export default App