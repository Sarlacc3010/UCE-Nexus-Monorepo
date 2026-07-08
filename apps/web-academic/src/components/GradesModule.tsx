import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, GraduationCap, Clock, XCircle, MinusCircle, Circle } from 'lucide-react';
import {
  fetchAcademicStatus, getStudentIdFromToken,
  AcademicStatus, AcademicSubject, REGULARITY_LABEL
} from '../lib/academicStatus';
import './GradesModule.css';

const formatGrade = (value: string | null): string => {
  if (value === null || value === undefined) return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return num.toFixed(2);
};

const StatusBadge: React.FC<{ estado: string }> = ({ estado }) => {
  const lower = estado?.toLowerCase() || '';
  let icon = <CheckCircle size={12} className="status-icon" />;

  if (lower === 'matriculado' || lower === 'cursando') icon = <Clock size={12} className="status-icon" />;
  else if (lower === 'reprobado') icon = <XCircle size={12} className="status-icon" />;
  else if (lower === 'retirado') icon = <MinusCircle size={12} className="status-icon" />;
  else if (lower === 'pendiente') icon = <Circle size={12} className="status-icon" />;

  return (
    <span className={`status-badge status-${lower}`}>
      {icon}
      {estado || 'N/A'}
    </span>
  );
};

const GradesModule: React.FC<{ token: string | null }> = ({ token }) => {
  const [status, setStatus] = useState<AcademicStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number | 'Todos'>('Todos');

  const studentId = getStudentIdFromToken(token);

  useEffect(() => {
    if (!studentId) {
      setError('No se pudo identificar al estudiante desde la sesión.');
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchAcademicStatus(studentId, token);
        setStatus(data);
      } catch (err: any) {
        setError(err.message || 'Error de conexión con el servidor');
      } finally {
        setLoading(false);
      }
    };
    load();
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

  if (!status || status.semesters.length === 0) {
    return (
      <div className="grades-empty">
        <GraduationCap size={48} className="empty-icon" />
        <h3>Aún no hay calificaciones</h3>
        <p>No tienes materias registradas en tu historial académico actual.</p>
      </div>
    );
  }

  const allSubjects: AcademicSubject[] = status.semesters.flatMap(s => s.subjects);

  const semestersInView = status.semesters.filter(s =>
    selectedLevel === 'Todos' ? true : s.level === selectedLevel
  );

  // Estadísticas rápidas (sobre TODA la malla, no solo la vista filtrada)
  const totalAprobadas = allSubjects.filter(g => g.estado === 'APROBADO').length;
  const totalMatriculadas = allSubjects.filter(g => g.estado === 'MATRICULADO').length;
  const totalReprobadas = allSubjects.filter(g => g.estado === 'REPROBADO').length;
  const semestresAprobados = status.semesters.filter(s => s.subjects.every(g => g.estado === 'APROBADO')).length;

  const regularityKey = status.regularity.toLowerCase();

  return (
    <div className="grades-container">
      {/* Header */}
      <div className="grades-header">
        <div className="header-icon-wrapper">
          <Award size={28} className="header-icon" />
        </div>
        <div className="header-text-content">
          <h2>Historial de Calificaciones</h2>
          <p>Historial Completo · Estudiante #{studentId} · {status.approved_count}/{status.total_curriculum_count} materias aprobadas</p>
          <span className={`regularity-badge regularity-${regularityKey}`}>
            {REGULARITY_LABEL[status.regularity]}
            {status.mandatory_level && ` · Semestre obligatorio: ${status.mandatory_level}`}
            {status.optional_level && status.regularity === 'IRREGULAR' && ` · Opcional: ${status.optional_level}`}
          </span>
        </div>

        <div className="semester-filter">
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value === 'Todos' ? 'Todos' : Number(e.target.value))}
            className="semester-select"
          >
            <option value="Todos">Todos los Semestres</option>
            {status.semesters.map(sem => (
              <option key={sem.level} value={sem.level}>{sem.semester_name}</option>
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
          <span className="stat-num">{totalMatriculadas}</span>
          <span className="stat-label">Matriculadas</span>
        </div>
        <div className="stat-card stat-reprobado">
          <span className="stat-num">{totalReprobadas}</span>
          <span className="stat-label">Reprobadas</span>
        </div>
        <div className="stat-card stat-semestres">
          <span className="stat-num">{semestresAprobados}</span>
          <span className="stat-label">Semestres Completos</span>
        </div>
      </div>

      {/* Tablas por semestre */}
      <div className="grades-content">
        {semestersInView.map(semester => {
          const allApproved = semester.subjects.every(g => g.estado === 'APROBADO');
          const anyInProgress = semester.subjects.some(g => g.estado === 'MATRICULADO');
          const tagClass = allApproved ? 'tag-aprobado' : anyInProgress ? 'tag-matriculado' : 'tag-mixto';
          const tagText = allApproved ? '✓ Completado' : anyInProgress ? '● En Curso' : '~ Pendiente';

          return (
            <div key={semester.level} className="semester-group">
              <h3 className="semester-title">
                <GraduationCap size={18} className="check-icon" />
                {semester.semester_name}
                <span className={`semester-status-tag ${tagClass}`}>{tagText}</span>
                {semester.is_mandatory && <span className="semester-status-tag tag-obligatorio">Obligatorio</span>}
                {semester.is_optional && <span className="semester-status-tag tag-opcional">Opcional (siguiente)</span>}
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
                    {semester.subjects.map(grade => (
                      <tr key={grade.id} className={`grade-row grade-row-${grade.estado?.toLowerCase()}`}>
                        <td className="subject-col">
                          <strong>{grade.name}</strong>
                          {grade.attempts_count > 1 && (
                            <span className="attempt-tag"> ({grade.attempts_count}ª matrícula)</span>
                          )}
                        </td>
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
          );
        })}
      </div>
    </div>
  );
};

export default GradesModule;
