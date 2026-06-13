import './DashboardApp.css';

function DashboardApp() {
  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-grid">
        {/* COLUMNA IZQUIERDA (Principal) */}
        <div className="dashboard-col-left">
          
          {/* Horario de Hoy */}
          <div className="card schedule-card">
            <div className="card-header blue-header">
              <div className="header-icon">
              </div>
              <div className="header-titles">
                <h3>Horario de Hoy</h3>
                <p>Tus clases programadas para hoy</p>
              </div>
            </div>
            <div className="card-body">
              <div className="schedule-item">
                <div className="time-badge">
                  <span>08:00</span>
                  <span>10:00</span>
                </div>
                <div className="class-details">
                  <h4>Cálculo Diferencial</h4>
                  <p>Dr. García</p>
                  <span className="room-badge">Aula 301</span>
                </div>
              </div>
              <div className="schedule-item">
                <div className="time-badge">
                  <span>10:15</span>
                  <span>12:15</span>
                </div>
                <div className="class-details">
                  <h4>Programación I</h4>
                  <p>Ing. Rodríguez</p>
                  <span className="room-badge">Lab 205</span>
                </div>
              </div>
              <div className="schedule-item">
                <div className="time-badge">
                  <span>14:00</span>
                  <span>16:00</span>
                </div>
                <div className="class-details">
                  <h4>Física I</h4>
                  <p>Dr. Morales</p>
                  <span className="room-badge">Aula 412</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tareas Pendientes */}
          <div className="card tasks-card">
            <div className="card-header default-header">
              <div className="header-titles">
                <h3>Tareas Pendientes</h3>
                <p>4 tareas por completar</p>
              </div>
              <button className="btn-outline-red">Ver Todas</button>
            </div>
            <div className="card-body">
              
              <div className="task-item">
                <div className="task-radio"></div>
                <div className="task-details">
                  <h4>Entregar proyecto de Programación</h4>
                  <div className="task-meta">
                    <span className="badge badge-high">Alta</span>
                    <span className="task-date">15 Jun</span>
                  </div>
                </div>
              </div>

              <div className="task-item">
                <div className="task-radio"></div>
                <div className="task-details">
                  <h4>Estudiar para examen de Cálculo</h4>
                  <div className="task-meta">
                    <span className="badge badge-high">Alta</span>
                    <span className="task-date">18 Jun</span>
                  </div>
                </div>
              </div>

              <div className="task-item completed">
                <div className="task-radio checked">
                   ✓
                </div>
                <div className="task-details">
                  <h4 className="strike">Leer capítulo 5 de Física</h4>
                  <div className="task-meta">
                    <span className="badge badge-medium">Media</span>
                    <span className="task-date strike">20 Jun</span>
                  </div>
                </div>
              </div>

              <div className="task-item">
                <div className="task-radio"></div>
                <div className="task-details">
                  <h4>Renovar libros en biblioteca</h4>
                  <div className="task-meta">
                    <span className="badge badge-low">Baja</span>
                    <span className="task-date">22 Jun</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (Secundaria) */}
        <div className="dashboard-col-right">
          
          {/* Progreso Académico */}
          <div className="card progress-card">
            <div className="card-header default-header">
              <div className="header-titles">
                <h3>Progreso Académico</h3>
                <p>Semestre Actual</p>
              </div>
            </div>
            <div className="card-body centered">
              <div className="chart-container">
                {/* CSS Pie Chart */}
                <div className="pie-chart"></div>
              </div>
              
              <div className="legend-container">
                <div className="legend-item">
                  <span className="dot dot-blue"></span>
                  <span className="legend-label">Completado</span>
                  <span className="legend-value">68%</span>
                </div>
                <div className="legend-item">
                  <span className="dot dot-red"></span>
                  <span className="legend-label">En Progreso</span>
                  <span className="legend-value">22%</span>
                </div>
                <div className="legend-item">
                  <span className="dot dot-gray"></span>
                  <span className="legend-label">Pendiente</span>
                  <span className="legend-value">10%</span>
                </div>
              </div>

              <div className="divider"></div>

              <div className="average-container">
                <div className="average-header">
                  <span>Promedio General</span>
                  <span className="average-score">8.5</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="card quick-actions-card">
             <div className="card-header default-header">
              <div className="header-titles">
                <h3>Acciones Rápidas</h3>
                <p>Accesos directos</p>
              </div>
            </div>
            <div className="card-body">
              <button className="btn-solid-red full-width">
                Realizar Pago
              </button>
              <button className="btn-outline-blue full-width">
                Ver Calificaciones
              </button>
              <button className="btn-outline-gray full-width">
                Catálogo Biblioteca
              </button>
              <button className="btn-outline-gray full-width">
                Inscribir Materias
              </button>
            </div>
            
            {/* Evento */}
            <div className="event-badge">
              <div className="event-title">Próximo Evento</div>
              <div className="event-name">Seminario de Investigación</div>
              <div className="event-date">20 de Junio, 2026 - 16:00</div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default DashboardApp;
