import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import './EnrolledScheduleModule.css';

interface ScheduleBlock {
  id: number;
  parallel_id: number;
  lab_id: number;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  parallel_name: string;
  subject_name: string;
  semester_name: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getStudentIdFromToken = (token: string | null): number => {
  if (!token) return 42; // Estudiante 42 tiene matrículas de prueba
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const username = payload.preferred_username || '';
      const match = username.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }
  } catch (err) {}
  return 42;
};

const EnrolledScheduleModule: React.FC<{ token: string | null }> = ({ token }) => {
  const [schedules, setSchedules] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const studentId = getStudentIdFromToken(token);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/academic/students/${studentId}/schedules`, { headers });
        if (!res.ok) throw new Error('No se pudo obtener el horario');

        const data = await res.json();
        setSchedules(data);
      } catch (err: any) {
        setError(err.message || 'Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [studentId, token]);

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  if (loading) {
    return (
      <div className="schedule-loader">
        <div className="spinner"></div>
        <p>Cargando Horario...</p>
      </div>
    );
  }

  if (error) {
    return <div className="schedule-error">{error}</div>;
  }

  // Ensure blocks are mapped to days even if empty
  const getBlocksForDay = (day: string) => {
    return schedules
      .filter((s) => s.dia === day)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  };

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <div className="header-icon-wrapper">
          <Calendar size={28} className="header-icon" />
        </div>
        <div>
          <h2>Horario de Clases (Matrícula Vigente)</h2>
          <p>Estudiante #{studentId} - Facultad de Ingeniería y Ciencias Aplicadas</p>
        </div>
      </div>

      <div className="timetable-container">
        {/* Y-axis: Time labels */}
        <div className="time-labels">
          <div className="time-label-spacer"></div>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="time-label">
              {(i + 7).toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* X-axis: Days and Content */}
        <div className="timetable-grid">
          {daysOfWeek.map(day => {
            const blocks = getBlocksForDay(day);

            return (
              <div key={day} className="day-column">
                <div className="day-header">{day}</div>
                <div className="day-content">
                  {/* Grid lines */}
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="grid-line"></div>
                  ))}

                  {/* Class blocks */}
                  {blocks.map(block => {
                    // Calculate position
                    // Format: HH:MM:SS
                    const startParts = block.hora_inicio.split(':');
                    const endParts = block.hora_fin.split(':');
                    const startH = parseInt(startParts[0]);
                    const startM = parseInt(startParts[1]);
                    const endH = parseInt(endParts[0]);
                    const endM = parseInt(endParts[1]);

                    // Timeline starts at 7:00
                    const topPos = ((startH - 7) * 60) + startM;
                    const duration = ((endH - startH) * 60) + (endM - startM);
                    
                    // Simple hash for consistent colors based on subject name
                    let hash = 0;
                    for (let i = 0; i < block.subject_name.length; i++) {
                      hash = block.subject_name.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    const hue = Math.abs(hash) % 360;

                    return (
                      <div 
                        key={block.id} 
                        className="class-block"
                        style={{
                          top: `${topPos}px`,
                          height: `${duration}px`,
                          backgroundColor: `hsla(${hue}, 70%, 50%, 0.1)`,
                          borderLeft: `4px solid hsl(${hue}, 70%, 50%)`,
                          color: `hsl(${hue}, 80%, 25%)`
                        }}
                      >
                        <div className="class-subject">{block.subject_name}</div>
                        <div className="class-time">{block.hora_inicio.slice(0, 5)} - {block.hora_fin.slice(0, 5)}</div>
                        <div className="class-room">{block.parallel_name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EnrolledScheduleModule;
