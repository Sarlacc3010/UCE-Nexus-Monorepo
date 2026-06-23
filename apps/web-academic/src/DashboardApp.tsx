import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { BookOpen, Calendar, Clock, GraduationCap, LayoutDashboard } from 'lucide-react';
import { withQueryProvider } from './QueryProvider';
import './DashboardApp.css';

interface Enrollment {
  id: number;
  name: string;
  subject_id: number;
  subject_name: string;
  semester_name: string;
}

interface Schedule {
  id: number;
  parallel_id: number;
  lab_id: number;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  parallel_name: string;
  subject_name: string;
}

const getStudentIdFromToken = (token: string): number => {
  if (!token) return 4; // Default pilot ID
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const username = payload.preferred_username || '';
      
      if (username.includes('carlos')) return 4;
      if (username.includes('juan')) return 6;
      if (username.includes('student') || username.includes('estudiante')) {
        const match = username.match(/\d+/);
        if (match) return parseInt(match[0], 10);
      }
    }
  } catch (err) {
    console.error('Error parsing token for student ID:', err);
  }
  return 4; // Fallback to pilot student ID
};

const getStudentNameFromToken = (token: string): string => {
  if (!token) return 'Carlos Estudiante';
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || 'Carlos Estudiante';
    }
  } catch (err) {
    console.error('Error parsing token for name:', err);
  }
  return 'Carlos Estudiante';
};

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

function DashboardApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const token = localStorage.getItem('uce_token') || '';
  const studentId = getStudentIdFromToken(token);
  const studentName = getStudentNameFromToken(token);

  // Consultar las materias matriculadas del estudiante actual de forma dinámica
  const { data: enrollments, isLoading: loadingEnrollments } = useQuery<Enrollment[]>({
    queryKey: ['student-enrollments', studentId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/academic/students/${studentId}/enrollments`);
      if (!res.ok) throw new Error('Error al obtener matriculaciones');
      return res.json();
    }
  });

  // Consultar todos los horarios de clase programados en los laboratorios
  const { data: schedules, isLoading: loadingSchedules } = useQuery<Schedule[]>({
    queryKey: ['academic-schedules'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/academic/schedules`);
      if (!res.ok) throw new Error('Error al obtener horarios');
      return res.json();
    }
  });

  // Animaciones GSAP al cargar el panel
  useEffect(() => {
    if (containerRef.current && !loadingEnrollments && !loadingSchedules) {
      const ctx = gsap.context(() => {
        // Animación de entrada de las tarjetas del Dashboard
        gsap.from('.card', {
          opacity: 0,
          y: 30,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power3.out',
        });
        
        // Animación de los items de la lista
        gsap.from('.schedule-item, .subject-pill', {
          opacity: 0,
          x: -20,
          stagger: 0.08,
          duration: 0.6,
          ease: 'power2.out',
          delay: 0.3
        });
      }, containerRef.current);

      return () => ctx.revert();
    }
  }, [loadingEnrollments, loadingSchedules]);

  // Obtener nivel de semestre actual (el menor de las materias matriculadas)
  const currentSemesterLevel = enrollments && enrollments.length > 0 
    ? Math.min(...enrollments.map(e => (e as any).level || 1)) 
    : 2;

  const getSemesterText = (level: number) => {
    const texts = [
      '1er Semestre', '2do Semestre', '3er Semestre', '4to Semestre', '5to Semestre',
      '6to Semestre', '7mo Semestre', '8vo Semestre', '9no Semestre', '10mo Semestre'
    ];
    return texts[level - 1] || '2do Semestre';
  };

  const getCompletedCount = (level: number) => {
    const cumulative = [0, 0, 5, 11, 17, 23, 28, 33, 39, 44, 49, 53];
    return cumulative[level] || 5;
  };

  // Promedio dinámico y determinista basado en el ID del estudiante
  const averageScore = (8.0 + (studentId % 15) / 10).toFixed(2);
  const progressBarWidth = `${parseFloat(averageScore) * 10}%`;

  const enrolledCount = enrollments?.length || 0;
  const completedCount = getCompletedCount(currentSemesterLevel);
  const pendingCount = Math.max(0, 53 - completedCount - enrolledCount);

  const progressData = [
    { name: 'Aprobadas', value: completedCount, color: '#10b981' }, // Verde Esmeralda
    { name: 'En Curso', value: enrolledCount, color: '#3b82f6' },    // Azul
    { name: 'Pendientes', value: pendingCount, color: '#1e293b' },   // Slate Oscuro
  ];

  return (
    <div className="dashboard-container animate-fade-in" id="academic-panel" ref={containerRef}>
      {/* Header Bienvenida */}
      <header className="dashboard-welcome-header">
        <div className="welcome-avatar">🎓</div>
        <div>
          <h1 className="welcome-title">Portal Académico Nexus</h1>
          <p className="welcome-subtitle">Bienvenido de vuelta, <strong>{studentName}</strong> (Ingeniería en Sistemas | {getSemesterText(currentSemesterLevel)})</p>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* COLUMNA IZQUIERDA: Horarios y Carga Académica */}
        <div className="dashboard-col-left">
          
          {/* Horario de Clases en Laboratorios */}
          <div className="card schedule-card">
            <div className="card-header blue-header">
              <div className="header-icon"><Calendar size={20} /></div>
              <div className="header-titles">
                <h3>Clases Programadas en Laboratorios</h3>
                <p>Carga horaria académica oficial del semestre</p>
              </div>
            </div>
            <div className="card-body">
              {loadingSchedules ? (
                <div className="loading-placeholder">Cargando horarios de laboratorios...</div>
              ) : schedules && schedules.length > 0 ? (
                schedules.map((schedule) => (
                  <div className="schedule-item" key={schedule.id}>
                    <div className="time-badge">
                      <span><Clock size={12} style={{ marginRight: '4px' }} /> {schedule.dia}</span>
                      <span>{schedule.hora_inicio.substring(0, 5)} - {schedule.hora_fin.substring(0, 5)}</span>
                    </div>
                    <div className="class-details">
                      <h4>{schedule.subject_name}</h4>
                      <p>Paralelo: <strong>{schedule.parallel_name}</strong></p>
                      <span className="room-badge">Laboratorio {schedule.lab_id}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No hay horarios de clase registrados.</div>
              )}
            </div>
          </div>

          {/* Materias Inscritas (Carga Académica) */}
          <div className="card tasks-card">
            <div className="card-header default-header">
              <div className="header-icon"><BookOpen size={20} /></div>
              <div className="header-titles">
                <h3>Mis Materias Inscritas</h3>
                <p>Periodo Académico Vigente (2026-A)</p>
              </div>
            </div>
            <div className="card-body">
              {loadingEnrollments ? (
                <div className="loading-placeholder">Cargando asignaturas...</div>
              ) : enrollments && enrollments.length > 0 ? (
                <div className="subject-list">
                  {enrollments.map((enr) => (
                    <div className="subject-pill" key={enr.id}>
                      <div className="subject-info">
                        <span className="subject-icon">📘</span>
                        <div>
                          <h4>{enr.subject_name}</h4>
                          <p>{enr.semester_name} — Paralelo {enr.name}</p>
                        </div>
                      </div>
                      <span className="badge badge-medium">En Curso</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No estás inscrito en ningún paralelo.</div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Progreso y Accesos */}
        <div className="dashboard-col-right">
          
          {/* Progreso Académico - Recharts Pie Chart */}
          <div className="card progress-card">
            <div className="card-header default-header">
              <div className="header-icon"><GraduationCap size={20} /></div>
              <div className="header-titles">
                <h3>Avance Curricular</h3>
                <p>Progreso de malla curricular (53 materias)</p>
              </div>
            </div>
            <div className="card-body centered">
              <div className="chart-container" style={{ width: '100%', height: '180px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg width="160" height="160" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Círculo Base (Pendientes) */}
                  <circle
                    cx="90"
                    cy="90"
                    r="70"
                    fill="transparent"
                    stroke="#1e293b"
                    strokeWidth="14"
                  />
                  {/* Círculo Medio (En Curso + Aprobadas) */}
                  <circle
                    cx="90"
                    cy="90"
                    r="70"
                    fill="transparent"
                    stroke="#3b82f6"
                    strokeWidth="14"
                    strokeDasharray="440"
                    strokeDashoffset={440 - (440 * (completedCount + enrolledCount)) / 53}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                  {/* Círculo Superior (Aprobadas) */}
                  <circle
                    cx="90"
                    cy="90"
                    r="70"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="14"
                    strokeDasharray="440"
                    strokeDashoffset={440 - (440 * completedCount) / 53}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className="chart-center-label">
                  <span className="percent-num">{Math.round(((completedCount) / 53) * 100)}%</span>
                  <span className="percent-txt">Aprobado</span>
                </div>
              </div>
              
              <div className="legend-container">
                {progressData.map((d, index) => (
                  <div className="legend-item" key={index}>
                    <span className="dot" style={{ backgroundColor: d.color }}></span>
                    <span className="legend-label">{d.name}</span>
                    <span className="legend-value">{d.value}</span>
                  </div>
                ))}
              </div>

              <div className="divider"></div>

              <div className="average-container">
                <div className="average-header">
                  <span>Promedio General Acumulado</span>
                  <span className="average-score">{averageScore} / 10</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: progressBarWidth }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="card quick-actions-card">
            <div className="card-header default-header">
              <div className="header-icon"><LayoutDashboard size={20} /></div>
              <div className="header-titles">
                <h3>Servicios Campus</h3>
                <p>Accesos directos rápidos</p>
              </div>
            </div>
            <div className="card-body">
              <button className="btn-solid-red full-width">
                💳 Realizar Pago de Matrícula
              </button>
              <button className="btn-outline-blue full-width">
                📑 Solicitar Récord Académico
              </button>
              <button className="btn-outline-gray full-width">
                📚 Biblioteca Digital UCE
              </button>
            </div>
            
            <div className="event-badge">
              <div className="event-title">📢 Próximo Evento Académico</div>
              <div className="event-name">Casa Abierta de Ingeniería en Sistemas</div>
              <div className="event-date">Viernes, 26 de Junio - 09:00 | Auditorio FICA</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Envolver con QueryClientProvider de forma encapsulada para Module Federation
export default withQueryProvider(DashboardApp);
