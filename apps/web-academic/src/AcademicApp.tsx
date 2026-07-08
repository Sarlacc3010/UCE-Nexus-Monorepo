import { useState, useEffect, lazy, Suspense } from 'react';
import BookingApp from './App';
import DashboardApp from './DashboardApp';
import CanchasModule from './components/CanchasModule';
import {
  GraduationCap,
  Award,
  Calendar,
  BookOpen,
  FileText,
  FlaskConical,
  Mic,
  Activity,
  AlertTriangle,
  UserMinus,
  ChevronDown,
  Globe,
  LogOut,
  LayoutDashboard
} from 'lucide-react';

const ChatWidget = lazy(() => import('chatbot/ChatWidget'));
import ErrorBoundary from './ErrorBoundary';

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

interface AcademicAppProps {
  activeTab?: string;
  token?: string;
}

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

export default function AcademicApp({ activeTab: propActiveTab, token: propToken }: AcademicAppProps) {
  // 1. Detect environment
  const isEmbedded = typeof propActiveTab !== 'undefined';
  
  // 2. Local state for standalone mode
  const [localActiveTab, setLocalActiveTab] = useState<string>('home');
  const [token, setToken] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState({
    academicos: false,
    reservas: false,
    solicitudes: false,
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

  const toggleGroup = (group: 'academicos' | 'reservas' | 'solicitudes') => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // 3. Render content helper
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <DashboardApp />;
      case 'matriculacion':
        return <BookingApp />;
      case 'canchas':
        return <CanchasModule token={token} />;
      default: {
        const getTabTitle = (tab: string) => {
          const titles: Record<string, string> = {
            dashboard: 'Horario matrícula vigente',
            matriculas: 'Matrículas',
            calificaciones: 'Calificaciones',
            malla: 'Malla Curricular',
            seguro_vida: 'Seguro de vida',
            matricula_vigente: 'Matrícula vigente',
            auditorio: 'Reservas de Auditorio',
            canchas: 'Reservas de Canchas',
            tercera_matricula: 'Tercera matrícula y excepcionalidad',
            retiro: 'Retiro de Asignaturas'
          };
          return titles[tab] || tab;
        };

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
              Módulo Académico en Construcción
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', lineHeight: 1.5 }}>
              La funcionalidad para la sección "{getTabTitle(activeTab)}" está en desarrollo para el microfrontend académico y estará disponible pronto.
            </p>
          </div>
        );
      }
    }
  };

  // If embedded in web-host, only render the tab content (without shell, header, sidebar, footer)
  if (isEmbedded) {
    return (
      <div className="academic-embedded-wrapper" style={{ width: '100%' }}>
        {renderTabContent()}
      </div>
    );
  }

  // Standalone mode layout (Port 5001)
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
              // Fallback logo in case image fails
              (e.target as HTMLImageElement).src = 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Escudo_de_la_Universidad_Central_del_Ecuador.svg';
            }} />
          </div>
          <div className="nexus-header-divider" style={{ width: '1px', height: '28px', backgroundColor: 'rgba(255,255,255,0.25)', margin: '0 16px' }}></div>
          <div className="nexus-header-text">
            <h2 className="nexus-header-title" style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
              UCE - Portal Académico
            </h2>
            <span className="nexus-header-subtitle" style={{ fontSize: '11px', opacity: 0.85, display: 'block', marginTop: '1px' }}>
              Microfrontend de Servicios Académicos Standalone
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
            NAVEGACIÓN ACADÉMICA
          </div>

          <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {/* Inicio / Home */}
            <button 
              onClick={() => setLocalActiveTab('home')}
              className={`nexus-nav-item ${activeTab === 'home' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'home' ? '#eff6ff' : 'transparent',
                color: activeTab === 'home' ? '#1d4ed8' : '#64748b',
                fontSize: '13px',
                fontWeight: activeTab === 'home' ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: '4px'
              }}
            >
              <LayoutDashboard size={16} /> Inicio
            </button>
            {/* Grupo Académicos */}
            <div className="nexus-nav-group">
              <button 
                onClick={() => toggleGroup('academicos')}
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
                <span>Académicos</span>
                <ChevronDown size={14} style={{
                  transform: collapsedGroups.academicos ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} />
              </button>
              
              {!collapsedGroups.academicos && (
                <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <button 
                    onClick={() => setLocalActiveTab('matriculas')}
                    className={`nexus-nav-item ${activeTab === 'matriculas' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'matriculas' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'matriculas' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'matriculas' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <GraduationCap size={16} /> Matriculas
                  </button>
                  <button 
                    onClick={() => setLocalActiveTab('calificaciones')}
                    className={`nexus-nav-item ${activeTab === 'calificaciones' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'calificaciones' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'calificaciones' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'calificaciones' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Award size={16} /> Calificaciones
                  </button>
                  <button 
                    onClick={() => setLocalActiveTab('dashboard')}
                    className={`nexus-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'dashboard' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'dashboard' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'dashboard' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Calendar size={16} /> Horario matricula vigente
                  </button>
                  <button 
                    onClick={() => setLocalActiveTab('malla')}
                    className={`nexus-nav-item ${activeTab === 'malla' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'malla' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'malla' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'malla' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <BookOpen size={16} /> Malla Curricular
                  </button>
                  
                  {/* Certificados */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px 2px', color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <FileText size={14} /> Certificados
                  </div>
                  <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button 
                      onClick={() => setLocalActiveTab('seguro_vida')}
                      style={{
                        width: '100%',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        color: activeTab === 'seguro_vida' ? '#1d4ed8' : '#64748b',
                        fontSize: '12.5px',
                        fontWeight: activeTab === 'seguro_vida' ? 600 : 500,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      • Seguro de vida
                    </button>
                    <button 
                      onClick={() => setLocalActiveTab('matricula_vigente')}
                      style={{
                        width: '100%',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        color: activeTab === 'matricula_vigente' ? '#1d4ed8' : '#64748b',
                        fontSize: '12.5px',
                        fontWeight: activeTab === 'matricula_vigente' ? 600 : 500,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      • Matricula vigente
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Grupo Reservas */}
            <div className="nexus-nav-group">
              <button 
                onClick={() => toggleGroup('reservas')}
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
                <span>Reservas</span>
                <ChevronDown size={14} style={{
                  transform: collapsedGroups.reservas ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} />
              </button>

              {!collapsedGroups.reservas && (
                <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <button 
                    onClick={() => setLocalActiveTab('matriculacion')}
                    className={`nexus-nav-item ${activeTab === 'matriculacion' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'matriculacion' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'matriculacion' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'matriculacion' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <FlaskConical size={16} /> Laboratorios
                  </button>
                  <button 
                    onClick={() => setLocalActiveTab('auditorio')}
                    className={`nexus-nav-item ${activeTab === 'auditorio' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'auditorio' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'auditorio' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'auditorio' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Mic size={16} /> Auditorio
                  </button>
                  <button 
                    onClick={() => setLocalActiveTab('canchas')}
                    className={`nexus-nav-item ${activeTab === 'canchas' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'canchas' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'canchas' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'canchas' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Activity size={16} /> Canchas
                  </button>
                </div>
              )}
            </div>

            {/* Grupo Solicitudes */}
            <div className="nexus-nav-group">
              <button 
                onClick={() => toggleGroup('solicitudes')}
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
                <span>Solicitudes</span>
                <ChevronDown size={14} style={{
                  transform: collapsedGroups.solicitudes ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} />
              </button>

              {!collapsedGroups.solicitudes && (
                <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <button 
                    onClick={() => setLocalActiveTab('tercera_matricula')}
                    className={`nexus-nav-item ${activeTab === 'tercera_matricula' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'tercera_matricula' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'tercera_matricula' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'tercera_matricula' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <AlertTriangle size={16} /> Tercera matrícula
                  </button>
                  <button 
                    onClick={() => setLocalActiveTab('retiro')}
                    className={`nexus-nav-item ${activeTab === 'retiro' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeTab === 'retiro' ? '#eff6ff' : 'transparent',
                      color: activeTab === 'retiro' ? '#1d4ed8' : '#64748b',
                      fontSize: '13px',
                      fontWeight: activeTab === 'retiro' ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <UserMinus size={16} /> Retiro
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
          <span>© 2025 Universidad Central del Ecuador | Portal Académico</span>
        </div>
        <div className="nexus-footer-right" style={{ display: 'flex', gap: '12px' }}>
          <a href="https://www.uce.edu.ec" target="_blank" rel="noopener noreferrer" style={{ color: 'white' }}><Globe size={14} /></a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: 'white' }}><FacebookIcon /></a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ color: 'white' }}><InstagramIcon /></a>
        </div>
      </footer>

      {/* Standalone ChatWidget */}
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <ChatWidget gatewayUrl={API_URL} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
