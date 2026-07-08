import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, GraduationCap, Clock, XCircle, MinusCircle } from 'lucide-react';
import './GradesModule.css';

interface GradeBlock {
  id: number;
  subject_name: string;
  semester_name: string;
  semester_level?: number;
  nota_individual: string | null;
  nota_grupal: string | null;
  examen_hemisemestre: string | null;
  examen_final: string | null;
  nota_total: string | null;
  estado: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Extrae el student_id del payload JWT.
 * El campo student_id es emitido directamente por ms-02-identity en el token.
 */
const getStudentIdFromToken = (token: string | null): number => {
  if (!token) return 7; // Fallback al ID de aenavarreteg1
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      // El token incluye student_id directamente como claim
      if (payload.student_id !== undefined && payload.student_id !== null) {
        return Number(payload.student_id);
      }
      // Fallback: leer del sub claim (ID interno del usuario)
      if (payload.sub !== undefined) {
        // No usar sub como student_id — son UUIDs distintos
      }
    }
  } catch (err) {
    console.error('[GradesModule] Error parsing token:', err);
  }
  return 7; // Default para aenavarreteg1
};

const formatGrade = (value: string | null): string => {
  if (value === null || value === undefined) return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return num.toFixed(2);
};

const StatusBadge: React.FC<{ estado: string }> = ({ estado }) => {
  const lower = estado?.toLowerCase() || '';
  let icon = <CheckCircle size={12} className="status-icon" />;
  
  if (lower === 'cursando') icon = <Clock size={12} className="status-icon" />;
  else if (lower === 'reprobado') icon = <XCircle size={12} className="status-icon" />;
  else if (lower === 'retirado') icon = <MinusCircle size={12} className="status-icon" />;

  return (
    <span className={`status-badge status-${lower}`}>
      {icon}
      {estado || 'N/A'}
    </span>
  );
};

const GradesModule: React.FC<{ token: string | null }> = ({ token }) => {
  const [grades, setGrades] = useState<GradeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('Todos');

  const studentId = getStudentIdFromToken(token);

  useEffect(() => {
    const fetchGrades = async () => {
      setLoading(true);
      setError('');
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/academic/students/${studentId}/grades`, { headers });
        if (!res.ok) throw new Error(`Error ${res.status}: No se pudieron obtener las calificaciones`);

        const data: GradeBlock[] = await res.json();
        setGrades(data);
      } catch (err: any) {
        setError(err.message || 'Error de conexión con el servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [studentId, token]);

  if (loading) {
    return (
      <div className="grades-loader">
        <div className="spinner"></div>
        <p>Cargando Calificaciones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grades-error">
        <XCircle size={32} />
        <p>{error}</p>
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <div className="grades-empty">
        <GraduationCap size={48} className="empty-icon" />
        <h3>Aún no hay calificaciones</h3>
        <p>No tienes materias registradas en tu historial académico actual.</p>
      </div>
    );
  }

  // Ordenar semestres por nivel (si hay campo semester_level, si no por nombre)
  const semesterOrder: Record<string, number> = {
    'Primer Semestre': 1,
    'Segundo Semestre': 2,
    'Tercer Semestre': 3,
    'Cuarto Semestre': 4,
    'Quinto Semestre': 5,
    'Sexto Semestre': 6,
    'Séptimo Semestre': 7,
    'Octavo Semestre': 8,
    'Noveno Semestre': 9,
    'Décimo Semestre': 10,
  };

  // Obtener semestres únicos ordenados por nivel
  const semesters = Array.from(new Set(grades.map(g => g.semester_name)))
    .sort((a, b) => (semesterOrder[a] ?? 99) - (semesterOrder[b] ?? 99));

  const filteredGrades = selectedSemester === 'Todos'
    ? grades
    : grades.filter(g => g.semester_name === selectedSemester);

  // Agrupar por semestre manteniendo orden
  const orderedSemestersInView = semesters.filter(s =>
    selectedSemester === 'Todos' ? true : s === selectedSemester
  );

  const groupedGrades = filteredGrades.reduce((acc, curr) => {
    if (!acc[curr.semester_name]) {
      acc[curr.semester_name] = [];
    }
    acc[curr.semester_name].push(curr);
    return acc;
  }, {} as Record<string, GradeBlock[]>);

  // Calcular estadísticas
  const totalAprobadas = grades.filter(g => g.estado === 'APROBADO').length;
  const totalCursando = grades.filter(g => g.estado === 'CURSANDO').length;
  const totalReprobadas = grades.filter(g => g.estado === 'REPROBADO').length;
  const semestresAprobados = new Set(
    grades.filter(g => g.estado === 'APROBADO').map(g => g.semester_name)
  ).size;

  return (
    <div className="grades-container">
      {/* Header */}
      <div className="grades-header">
        <div className="header-icon-wrapper">
          <Award size={28} className="header-icon" />
        </div>
        <div className="header-text-content">
          <h2>Historial de Calificaciones</h2>
          <p>Historial Completo · Estudiante #{studentId}</p>
        </div>

        <div className="semester-filter">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="semester-select"
          >
            <option value="Todos">Todos los Semestres</option>
            {semesters.map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grades-stats">
        <div className="stat-card stat-aprobado">
          <span className="stat-num">{totalAprobadas}</span>
          <span className="stat-label">Aprobadas</span>
        </div>
        <div className="stat-card stat-cursando">
          <span className="stat-num">{totalCursando}</span>
          <span className="stat-label">Cursando</span>
        </div>
        <div className="stat-card stat-reprobado">
          <span className="stat-num">{totalReprobadas}</span>
          <span className="stat-label">Reprobadas</span>
        </div>
        <div className="stat-card stat-semestres">
          <span className="stat-num">{semestresAprobados}</span>
          <span className="stat-label">Semestres</span>
        </div>
      </div>

      {/* Tablas por semestre */}
      <div className="grades-content">
        {orderedSemestersInView.map(semester => (
          groupedGrades[semester] ? (
            <div key={semester} className="semester-group">
              <h3 className="semester-title">
                <GraduationCap size={18} className="check-icon" />
                {semester}
                <span className={`semester-status-tag ${
                  groupedGrades[semester].every(g => g.estado === 'CURSANDO')
                    ? 'tag-cursando'
                    : groupedGrades[semester].every(g => g.estado === 'APROBADO' || g.estado === 'RETIRADO')
                      ? 'tag-aprobado'
                      : 'tag-mixto'
                }`}>
                  {groupedGrades[semester].every(g => g.estado === 'CURSANDO')
                    ? '● En Curso'
                    : groupedGrades[semester].every(g => g.estado === 'APROBADO' || g.estado === 'RETIRADO')
                      ? '✓ Completado'
                      : '~ Histórico'}
                </span>
              </h3>

              <div className="grades-table-wrapper">
                <table className="grades-table">
                  <thead>
                    <tr>
                      <th>Materia</th>
                      <th className="text-center">Nota Individual<br /><small>(35% / 7 pts)</small></th>
                      <th className="text-center">Nota Grupal<br /><small>(25% / 5 pts)</small></th>
                      <th className="text-center">Examen 1<br /><small>(10% / 2 pts)</small></th>
                      <th className="text-center">Examen Final<br /><small>(30% / 6 pts)</small></th>
                      <th className="text-center highlight-col">Promedio Total<br /><small>(100% / 20 pts)</small></th>
                      <th className="text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedGrades[semester].map(grade => (
                      <tr key={grade.id} className={`grade-row grade-row-${grade.estado?.toLowerCase()}`}>
                        <td className="subject-col"><strong>{grade.subject_name}</strong></td>
                        <td className="text-center">{formatGrade(grade.nota_individual)}</td>
                        <td className="text-center">{formatGrade(grade.nota_grupal)}</td>
                        <td className="text-center">{formatGrade(grade.examen_hemisemestre)}</td>
                        <td className="text-center">{formatGrade(grade.examen_final)}</td>
                        <td className="text-center highlight-val">
                          <strong>{formatGrade(grade.nota_total)}</strong>
                        </td>
                        <td className="text-center">
                          <StatusBadge estado={grade.estado} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
};

export default GradesModule;
