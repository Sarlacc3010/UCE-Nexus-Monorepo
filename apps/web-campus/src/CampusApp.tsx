import { useState, useEffect, lazy, Suspense } from 'react';
import App from './App';
import {
  CreditCard,
  Car,
  Map,
  Bell,
  LayoutDashboard,
  ChevronDown,
  Globe,
  LogOut
} from 'lucide-react';
import CampusMap from './components/CampusMap';

const ChatWidget = lazy(() => import('chatbot/ChatWidget'));

// Local SVG icons for Facebook and Instagram to avoid Lucide resolution issues
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

interface CampusAppProps {
  activeTab?: string;
  token?: string;
}

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

export default function CampusApp({ activeTab: propActiveTab, token: propToken }: CampusAppProps) {
  // 1. Detect environment
  const isEmbedded = typeof propActiveTab !== 'undefined';
  
  // 2. Local state for standalone mode
  const [localActiveTab, setLocalActiveTab] = useState<string>('gateway');
  const [token, setToken] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState({
    pagos: false,
    maps: false,
    admin: false
  });

  const activeTab = isEmbedded ? propActiveTab : localActiveTab;

  useEffect(() => {
    if (isEmbedded && propToken) {
      setToken(propToken);
    } else {
      const storedToken = localStorage.getItem('uce_token') || '';
      setToken(storedToken);
    }
  }, [isEmbedded, propToken]);

  const handleLogout = () => {
    localStorage.removeItem('uce_token');
    setToken('');
    window.location.reload();
  };

  const toggleGroup = (group: 'pagos' | 'maps' | 'admin') => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // 3. Render content helper
  const renderTabContent = () => {
    switch (activeTab) {
      case 'gateway':
        return <App />;
      case 'maps':
        return <CampusMap />;
      default:
        return (
          <div className="coming-soon-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 40px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            textAlign: 'center',
            marginTop: '20px'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0d3b8e', marginBottom: '10px' }}>
              Módulo de Campus en Construcción
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', lineHeight: 1.5 }}>
              La funcionalidad para la sección "{activeTab}" está en desarrollo para el microfrontend de Campus e Infraestructura y estará disponible pronto.
            </p>
          </div>
        );
    }
  };

  // If embedded in web-host, only render the tab content (without shell, header, sidebar, footer)
  if (isEmbedded) {
    return (
      <div className="campus-embedded-wrapper" style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTabContent()}
      </div>
    );
  }

  // Standalone mode layout (Port 5002)
  const isUserAuthenticated = token && token.trim() !== '';

  return (
    <div className="nexus-shell-container animate-fade-in" id="dashboard-shell" style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f4f6f8'
    }}>
      
      {/* Header */}
      <header className="nexus-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        backgroundColor: '#0d3b8e',
        color: 'white',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        height: '70px',
        zIndex: 50
      }}>
        <div className="nexus-header-left" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="nexus-logo-circle" style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <img src="/uce-logo.png" alt="UCE Logo" style={{ width: '30px', height: '30px', objectFit: 'contain' }} onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Escudo_de_la_Universidad_Central_del_Ecuador.svg';
            }} />
          </div>
          <div className="nexus-header-divider" style={{ width: '1px', height: '28px', backgroundColor: 'rgba(255,255,255,0.25)', margin: '0 16px' }}></div>
          <div className="nexus-header-text">
            <h2 className="nexus-header-title" style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
              UCE - Portal del Campus
            </h2>
            <span className="nexus-header-subtitle" style={{ fontSize: '11px', opacity: 0.85, display: 'block', marginTop: '1px' }}>
              Microfrontend de Campus e Infraestructura Standalone
            </span>
          </div>
        </div>

        {isUserAuthenticated && (
          <div className="nexus-header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 500 }}>Estudiante UCE</span>
            <button 
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.25)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
            >
              <LogOut size={14} /> Salir
            </button>
          </div>
        )}
      </header>

      {/* Main Workspace */}
      <div className="nexus-main-layout" style={{
        display: 'flex',
        flex: 1,
        position: 'relative',
        height: 'calc(100vh - 120px)'
      }}>
        
        {/* Standalone Sidebar */}
        <aside className="nexus-sidebar" style={{
          width: '260px',
          backgroundColor: 'white',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flexShrink: 0
        }}>
          <div className="nexus-sidebar-title" style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
            color: 'white',
            fontWeight: 800,
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            NAVEGACIÓN CAMPUS
          </div>

          <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {/* Grupo Pagos */}
            <div className="nexus-nav-group">
              <button 
                onClick={() => toggleGroup('pagos')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 12px',
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Pagos</span>
                <ChevronDown size={14} style={{
                  transform: collapsedGroups.pagos ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} />
              </button>
              
              {!collapsedGroups.pagos && (
                <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <button 
                    onClick={() => setLocalActiveTab('aranceles')}
                    className={`nexus-nav-item ${activeTab === 'aranceles' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'aranceles' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'aranceles' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'aranceles' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <CreditCard size={16} /> Pago de aranceles
                  </button>
                  <button 
                    onClick={() => setLocalActiveTab('estacionamiento')}
                    className={`nexus-nav-item ${activeTab === 'estacionamiento' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'estacionamiento' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'estacionamiento' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'estacionamiento' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Car size={16} /> Pago de estacionamiento
                  </button>
                </div>
              )}
            </div>

            {/* Grupo Mapa */}
            <div className="nexus-nav-group">
              <button 
                onClick={() => toggleGroup('maps')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 12px',
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Mapa en tiempo real</span>
                <ChevronDown size={14} style={{
                  transform: collapsedGroups.maps ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} />
              </button>

              {!collapsedGroups.maps && (
                <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <button 
                    onClick={() => setLocalActiveTab('maps')}
                    className={`nexus-nav-item ${activeTab === 'maps' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'maps' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'maps' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'maps' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Map size={16} /> UCE-Maps
                  </button>
                  <button 
                    onClick={() => setLocalActiveTab('eventos')}
                    className={`nexus-nav-item ${activeTab === 'eventos' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'eventos' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'eventos' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'eventos' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Bell size={16} /> Eventos activos
                  </button>
                </div>
              )}
            </div>

            {/* Grupo Administración / API Consola */}
            <div className="nexus-nav-group">
              <button 
                onClick={() => toggleGroup('admin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 12px',
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Administración</span>
                <ChevronDown size={14} style={{
                  transform: collapsedGroups.admin ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} />
              </button>

              {!collapsedGroups.admin && (
                <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <button 
                    onClick={() => setLocalActiveTab('gateway')}
                    className={`nexus-nav-item ${activeTab === 'gateway' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'gateway' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'gateway' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'gateway' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <LayoutDashboard size={16} /> Logs del Sistema
                  </button>
                </div>
              )}
            </div>

          </nav>
        </aside>

        {/* Viewport Content */}
        <main className="nexus-main-content" style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          height: '100%'
        }}>
          {renderTabContent()}
        </main>
      </div>

      {/* Footer */}
      <footer className="nexus-footer" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 24px',
        backgroundColor: '#0d3b8e',
        color: 'white',
        fontSize: '12px',
        height: '50px',
        zIndex: 50
      }}>
        <div className="nexus-footer-left">
          <span>© 2025 Universidad Central del Ecuador | Portal del Campus</span>
        </div>
        <div className="nexus-footer-right" style={{ display: 'flex', gap: '12px' }}>
          <a href="https://www.uce.edu.ec" target="_blank" rel="noopener noreferrer" style={{ color: 'white' }}><Globe size={14} /></a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: 'white' }}><FacebookIcon /></a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ color: 'white' }}><InstagramIcon /></a>
        </div>
      </footer>

      {/* Standalone ChatWidget */}
      <Suspense fallback={null}>
        <ChatWidget gatewayUrl={API_URL} />
      </Suspense>
    </div>
  );
}
