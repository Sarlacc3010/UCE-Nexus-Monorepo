import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, GraduationCap } from 'lucide-react';
import './GradesModule.css';

interface GradeBlock {
  id: number;
  subject_name: string;
  semester_name: string;
  nota_individual: string | null;
  nota_grupal: string | null;
  examen_hemisemestre: string | null;
  examen_final: string | null;
  nota_total: string | null;
  estado: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getStudentIdFromToken = (token: string | null): number => {
  if (!token) return 42;
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

const GradesModule: React.FC<{ token: string | null }> = ({ token }) => {
  const [grades, setGrades] = useState<GradeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const studentId = getStudentIdFromToken(token);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/academic/students/${studentId}/grades`, { headers });
        if (!res.ok) throw new Error('No se pudieron obtener las calificaciones');

        const data = await res.json();
        setGrades(data);
      } catch (err: any) {
        setError(err.message || 'Error de conexión');
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
    return <div className="grades-error">{error}</div>;
  }

  // Filtrar solo asignaturas aprobadas
  const passedGrades = grades.filter(g => g.estado === 'APROBADO');

  // Agrupar por semestre
  const groupedGrades = passedGrades.reduce((acc, curr) => {
    if (!acc[curr.semester_name]) {
      acc[curr.semester_name] = [];
    }
    acc[curr.semester_name].push(curr);
    return acc;
  }, {} as Record<string, GradeBlock[]>);

  if (passedGrades.length === 0) {
    return (
      <div className="grades-empty">
        <GraduationCap size={48} className="empty-icon" />
        <h3>Aún no hay calificaciones</h3>
        <p>No tienes materias aprobadas registradas en tu historial académico actual.</p>
      </div>
    );
  }

  return (
    <div className="grades-container">
      <div className="grades-header">
        <div className="header-icon-wrapper">
          <Award size={28} className="header-icon" />
        </div>
        <div>
          <h2>Historial de Calificaciones</h2>
          <p>Materias Aprobadas - Estudiante #{studentId}</p>
        </div>
      </div>

      <div className="grades-content">
        {Object.keys(groupedGrades).map(semester => (
          <div key={semester} className="semester-group">
            <h3 className="semester-title">
              <CheckCircle size={18} className="check-icon"/> {semester}
            </h3>
            
            <div className="grades-table-wrapper">
              <table className="grades-table">
                <thead>
                  <tr>
                    <th>Materia</th>
                    <th className="text-center">Nota Individual<br/><small>(35% / 7 pts)</small></th>
                    <th className="text-center">Nota Grupal<br/><small>(25% / 5 pts)</small></th>
                    <th className="text-center">Examen 1<br/><small>(10% / 2 pts)</small></th>
                    <th className="text-center">Examen Final<br/><small>(30% / 6 pts)</small></th>
                    <th className="text-center highlight-col">Promedio Total<br/><small>(100% / 20 pts)</small></th>
                  </tr>
                </thead>
                <tbody>
                  {groupedGrades[semester].map(grade => (
                    <tr key={grade.id}>
                      <td className="subject-col"><strong>{grade.subject_name}</strong></td>
                      <td className="text-center">{grade.nota_individual || '0.00'}</td>
                      <td className="text-center">{grade.nota_grupal || '0.00'}</td>
                      <td className="text-center">{grade.examen_hemisemestre || '0.00'}</td>
                      <td className="text-center">{grade.examen_final || '0.00'}</td>
                      <td className="text-center highlight-val"><strong>{grade.nota_total || '0.00'}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GradesModule;
