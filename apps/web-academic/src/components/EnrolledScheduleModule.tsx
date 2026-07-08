import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { API_URL, getStudentIdFromToken, fetchAcademicStatus, AcademicStatus, REGULARITY_LABEL } from '../lib/academicStatus';
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
  semester_level: number;
}

const EnrolledScheduleModule: React.FC<{ token: string | null }> = ({ token }) => {
  const [schedules, setSchedules] = useState<ScheduleBlock[]>([]);
  const [status, setStatus] = useState<AcademicStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const studentId = getStudentIdFromToken(token);

  useEffect(() => {
    if (!studentId) {
      setError('No se pudo identificar al estudiante desde la sesión.');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [schedulesRes, statusData] = await Promise.all([
          fetch(`${API_URL}/academic/students/${studentId}/schedules`, { headers }),
          fetchAcademicStatus(studentId, token)
        ]);
        if (!schedulesRes.ok) throw new Error('No se pudo obtener el horario');

        setSchedules(await schedulesRes.json());
        setStatus(statusData);
      } catch (err: any) {
        setError(err.message || 'Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    load();
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

  const regularityKey = status?.regularity.toLowerCase();

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <div className="header-icon-wrapper">
          <Calendar size={28} className="header-icon" />
        </div>
        <div>
          <h2>Horario de Clases (Matrícula Vigente)</h2>
          <p>Estudiante #{studentId} - Facultad de Ingeniería y Ciencias Aplicadas</p>
          {status && (
            <div className="regularity-line">
              <span className={`regularity-pill ${regularityKey}`}>{REGULARITY_LABEL[status.regularity]}</span>
              {status.mandatory_level && <span>Obligatorio: Semestre {status.mandatory_level}</span>}
              {status.regularity === 'IRREGULAR' && status.optional_level && (
                <span>· Opcional: Semestre {status.optional_level}</span>
              )}
            </div>
          )}
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

                    // Curated vibrant modern color palette
                    const colorPalette = [
                      { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a', labelBg: '#dbeafe' }, // Blue
                      { bg: '#fdf4ff', border: '#d946ef', text: '#701a75', labelBg: '#fae8ff' }, // Fuchsia
                      { bg: '#ecfdf5', border: '#10b981', text: '#064e3b', labelBg: '#d1fae5' }, // Emerald
                      { bg: '#fffbeb', border: '#f59e0b', text: '#78350f', labelBg: '#fef3c7' }, // Amber
                      { bg: '#fef2f2', border: '#ef4444', text: '#7f1d1d', labelBg: '#fee2e2' }, // Red
                      { bg: '#f5f3ff', border: '#8b5cf6', text: '#4c1d95', labelBg: '#ede9fe' }, // Violet
                      { bg: '#f0fdfa', border: '#14b8a6', text: '#134e4a', labelBg: '#ccfbf1' }, // Teal
                    ];

                    let hash = 0;
                    for (let i = 0; i < block.subject_name.length; i++) {
                      hash = block.subject_name.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    const colorIndex = Math.abs(hash) % colorPalette.length;
                    const theme = colorPalette[colorIndex];

                    const isMandatory = status && block.semester_level === status.mandatory_level;
                    const isOptional = status && block.semester_level === status.optional_level;

                    return (
                      <div
                        key={block.id}
                        className="class-block"
                        style={{
                          top: `${topPos}px`,
                          height: `${duration}px`,
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                          color: theme.text
                        }}
                      >
                        <div className="class-subject">{block.subject_name}</div>
                        <div className="class-time">{block.hora_inicio.slice(0, 5)} - {block.hora_fin.slice(0, 5)}</div>
                        <div className="class-room" style={{ backgroundColor: theme.labelBg, color: theme.text }}>
                          {block.parallel_name}
                        </div>
                        {(isMandatory || isOptional) && (
                          <span className={`class-semester-tag ${isMandatory ? 'obligatorio' : 'opcional'}`}>
                            {isMandatory ? 'Obligatorio' : 'Opcional'} · Sem. {block.semester_level}
                          </span>
                        )}
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
