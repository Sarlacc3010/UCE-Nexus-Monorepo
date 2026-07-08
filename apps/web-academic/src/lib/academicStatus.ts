/**
 * Fuente única de verdad compartida por GradesModule, EnrolledScheduleModule y
 * DashboardApp para: (a) resolver el student_id desde el JWT, y (b) consumir el
 * estado académico consolidado (semestre actual, regular/irregular, malla con
 * estado por materia) calculado en ms-03-enrollment.
 *
 * Antes de este archivo, cada módulo reimplementaba su propia heurística de
 * lectura de student_id (con fallbacks distintos: 7, 42, 4), lo que podía
 * mostrar datos de estudiantes distintos entre pantallas del mismo portal.
 */

export type Regularity = 'REGULAR' | 'IRREGULAR' | 'SIN_MATRICULA_ACTIVA' | 'EGRESADO';

export type SubjectStatus = 'APROBADO' | 'REPROBADO' | 'RETIRADO' | 'MATRICULADO' | 'PENDIENTE';

export interface AcademicSubject {
  id: number;
  code: string;
  name: string;
  semester_id: number;
  semester_level: number;
  semester_name: string;
  parallel_name: string | null;
  nota_total: string | null;
  nota_individual: string | null;
  nota_grupal: string | null;
  examen_hemisemestre: string | null;
  examen_final: string | null;
  attempts_count: number;
  attempt_number: number;
  is_first_attempt: boolean;
  estado: SubjectStatus;
}

export interface AcademicSemester {
  level: number;
  semester_id: number;
  semester_name: string;
  is_mandatory: boolean;
  is_optional: boolean;
  is_current: boolean;
  subjects: AcademicSubject[];
}

export interface AcademicStatus {
  student_id: number;
  regularity: Regularity;
  lowest_pending_level: number | null;
  mandatory_level: number | null;
  optional_level: number | null;
  enrolled_levels: number[];
  approved_count: number;
  total_curriculum_count: number;
  semesters: AcademicSemester[];
}

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Extrae el student_id del payload JWT. ms-02-identity emite `student_id`
 * directamente como claim en el login (ver authController.ts) — no hay que
 * adivinarlo desde el username ni usar fallbacks hardcodeados por estudiante.
 */
export const getStudentIdFromToken = (token: string | null): number | null => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.student_id !== undefined && payload.student_id !== null) {
      const id = Number(payload.student_id);
      return Number.isNaN(id) ? null : id;
    }
    return null;
  } catch (err) {
    console.error('[academicStatus] Error parsing token:', err);
    return null;
  }
};

export const getStudentNameFromToken = (token: string | null): string => {
  if (!token) return 'Estudiante';
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || 'Estudiante';
    }
  } catch (err) {
    console.error('[academicStatus] Error parsing token for name:', err);
  }
  return 'Estudiante';
};

export const fetchAcademicStatus = async (studentId: number, token: string | null): Promise<AcademicStatus> => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/academic/students/${studentId}/academic-status`, { headers });
  if (!res.ok) throw new Error(`Error ${res.status}: No se pudo obtener el estado académico`);
  return res.json();
};

export const SEMESTER_TEXT = [
  '1er Semestre', '2do Semestre', '3er Semestre', '4to Semestre', '5to Semestre',
  '6to Semestre', '7mo Semestre', '8vo Semestre', '9no Semestre', '10mo Semestre'
];

export const getSemesterText = (level: number | null): string => {
  if (!level) return 'N/A';
  return SEMESTER_TEXT[level - 1] || `Semestre ${level}`;
};

export const REGULARITY_LABEL: Record<Regularity, string> = {
  REGULAR: 'Regular',
  IRREGULAR: 'Irregular',
  SIN_MATRICULA_ACTIVA: 'Sin matrícula activa',
  EGRESADO: 'Egresado'
};
