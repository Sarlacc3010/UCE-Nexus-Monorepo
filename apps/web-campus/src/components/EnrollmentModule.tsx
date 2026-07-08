import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  CreditCard, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface Parallel {
  id: number;
  name: string;
  subject_id: number;
  subject_name: string;
}

interface Semester {
  id: number;
  name: string;
  level: number;
}

interface Subject {
  id: number;
  name: string;
  semester_id: number;
}

interface EnrollmentModuleProps {
  activeTab: string;
  token: string;
}

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

export default function EnrollmentModule({ token }: EnrollmentModuleProps) {
  // Obtener datos del JWT
  const getStudentId = () => {
    try {
      if (!token) return 6; // student_id mock por defecto
      const base64Url = token.split('.')[1];
      if (!base64Url) return 6;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      // Asumimos que el id del estudiante se guarda en sub o student_id
      return parseInt(payload.student_id || payload.id || '6', 10);
    } catch (e) {
      return 6;
    }
  };

  const studentId = getStudentId();

  // Estados del formulario
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [parallels, setParallels] = useState<Parallel[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<number>(3); // Tercer semestre de ejemplo
  const [selectedParallels, setSelectedParallels] = useState<Record<number, number>>({}); // subject_id -> parallel_id
  
  // Reglas académicas
  const [repeatsSubjects, setRepeatsSubjects] = useState<boolean>(false);
  const [isSecondDegree, setIsSecondDegree] = useState<boolean>(false);
  
  // Estados de carga e interfaz
  const [loading, setLoading] = useState<boolean>(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 1. Cargar semestres, asignaturas y paralelos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Cargar Semestres
        const semRes = await fetch(`${API_URL}/api/academic/semesters`, { headers });
        if (semRes.ok) {
          const semData = await semRes.json();
          setSemesters(semData);
        }

        // Cargar Asignaturas
        const subRes = await fetch(`${API_URL}/api/academic/subjects`, { headers });
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubjects(subData);
        }

        // Cargar Paralelos
        const parRes = await fetch(`${API_URL}/api/academic/parallels`, { headers });
        if (parRes.ok) {
          const parData = await parRes.json();
          setParallels(parData);
        }
      } catch (err) {
        console.error('Error fetching enrollment data:', err);
      }
    };

    fetchData();
  }, [token]);

  // Cargar estado de matrícula existente del estudiante
  useEffect(() => {
    const checkStatus = async () => {
      if (!studentId || !selectedSemester) return;
      try {
        const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_URL}/api/academic/students/${studentId}/semester-status/${selectedSemester}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.status !== 'NO_INSCRITO') {
            setEnrollmentStatus(data);
          } else {
            setEnrollmentStatus(null);
          }
        }
      } catch (err) {
        console.error('Error fetching semester status:', err);
      }
    };
    checkStatus();
  }, [studentId, selectedSemester, token]);

  const filteredSubjects = subjects.filter(sub => sub.semester_id === selectedSemester);

  const handleSelectParallel = (subjectId: number, parallelId: number) => {
    setSelectedParallels(prev => ({
      ...prev,
      [subjectId]: parallelId
    }));
  };

  // Calcular costo estimado (15 créditos por semestre promedio)
  const estimatedCredits = filteredSubjects.length * 3; 
  const costPerCredit = 10.00;
  const requiresPayment = repeatsSubjects || isSecondDegree;
  const estimatedCost = requiresPayment ? estimatedCredits * costPerCredit : 0.00;

  // Registrar inscripción
  const handleEnroll = async () => {
    const parallelIds = Object.values(selectedParallels);

    if (parallelIds.length < filteredSubjects.length) {
      setErrorMessage('Por favor, selecciona un paralelo para cada asignatura del semestre.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/api/academic/students/${studentId}/enroll`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          semester_id: selectedSemester,
          parallels: parallelIds,
          repeats_subjects: repeatsSubjects,
          is_second_degree: isSecondDegree,
          credits: estimatedCredits
        })
      });

      const data = await response.json();
      if (response.ok) {
        setEnrollmentStatus(data);
      } else {
        setErrorMessage(data.error || 'Ocurrió un error al procesar la matrícula.');
      }
    } catch (err) {
      setErrorMessage('Error al conectar con el servidor de matrículas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="enrollment-container" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Tarjeta de estado actual de matrícula */}
      {enrollmentStatus ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
          borderLeft: enrollmentStatus.status === 'MATRICULADO' ? '6px solid #10B981' : '6px solid #F59E0B',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            {enrollmentStatus.status === 'MATRICULADO' ? (
              <CheckCircle size={40} color="#10B981" />
            ) : (
              <AlertCircle size={40} color="#F59E0B" />
            )}
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0d3b8e', margin: 0 }}>
                Estado de Matrícula: {enrollmentStatus.status}
              </h2>
              <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>
                Estudiante ID: {studentId} | Semestre: {semesters.find(s => s.id === enrollmentStatus.semester_id)?.name}
              </p>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 0', color: '#64748b', fontWeight: 600 }}>Costo de Matrícula:</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                    ${parseFloat(enrollmentStatus.payment_amount).toFixed(2)} USD
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', color: '#64748b', fontWeight: 600 }}>Requiere Pago:</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: enrollmentStatus.needs_payment ? '#ef4444' : '#10b981' }}>
                    {enrollmentStatus.needs_payment ? 'SÍ (Pendiente)' : 'NO (Arancel Gratuito / Pagado)'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {enrollmentStatus.status === 'INSCRITO' && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #feebc8',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'start',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <AlertCircle size={20} color="#d97706" style={{ marginTop: '2px' }} />
              <div>
                <h4 style={{ fontWeight: 700, color: '#b45309', margin: '0 0 4px 0' }}>Matrícula Pendiente de Pago</h4>
                <p style={{ color: '#d97706', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
                  Tu matrícula se encuentra registrada en estado <strong>Inscrito</strong>. Para cambiar al estado <strong>Matriculado</strong> y asegurar tus cupos, debes completar el pago del arancel de <strong>${parseFloat(enrollmentStatus.payment_amount).toFixed(2)} USD</strong> en la sección de Pagos.
                </p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            {enrollmentStatus.status === 'INSCRITO' && (
              <button
                onClick={() => {
                  // Cambiar de pestaña al módulo de pagos de forma nativa modificando el hash
                  window.location.hash = 'aranceles';
                  window.location.reload(); // Recargar para forzar el cambio si es stand-alone
                }}
                style={{
                  backgroundColor: '#0d3b8e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(13, 59, 142, 0.2)'
                }}
              >
                <CreditCard size={18} /> Ir a Pagar con Stripe <ArrowRight size={16} />
              </button>
            )}
            <button
              onClick={() => setEnrollmentStatus(null)}
              style={{
                backgroundColor: 'transparent',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 20px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Nueva Inscripción
            </button>
          </div>
        </div>
      ) : (
        /* Formulario de Inscripción */
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0d3b8e', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={24} color="#D4AF37" /> Inscripción de Materias
            </h2>
            <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Selecciona tu semestre y paralelos académicos.</p>
          </div>

          {errorMessage && (
            <div style={{
              background: '#fef2f2',
              color: '#ef4444',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600
            }}>
              <AlertCircle size={18} /> {errorMessage}
            </div>
          )}

          {/* Selector de Semestre */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>Semestre Académico:</label>
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(parseInt(e.target.value, 10));
                setSelectedParallels({});
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '14px'
              }}
            >
              {semesters.map(sem => (
                <option key={sem.id} value={sem.id}>{sem.name}</option>
              ))}
            </select>
          </div>

          {/* Listado de Asignaturas y Paralelos */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '12px' }}>Selecciona Paralelos:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredSubjects.map(subject => {
                const availableParallels = parallels.filter(p => p.subject_id === subject.id);
                return (
                  <div key={subject.id} style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    backgroundColor: '#fafbfc'
                  }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{subject.name}</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {availableParallels.length === 0 ? (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sin paralelos programados</span>
                      ) : (
                        availableParallels.map(parallel => (
                          <button
                            key={parallel.id}
                            onClick={() => handleSelectParallel(subject.id, parallel.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: selectedParallels[subject.id] === parallel.id ? '2px solid #0d3b8e' : '1px solid #cbd5e1',
                              backgroundColor: selectedParallels[subject.id] === parallel.id ? '#eff6ff' : 'white',
                              color: selectedParallels[subject.id] === parallel.id ? '#0d3b8e' : '#64748b',
                              fontWeight: selectedParallels[subject.id] === parallel.id ? 700 : 500,
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            {parallel.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reglas de Arancel / Matrícula */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            marginBottom: '30px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#0d3b8e', fontWeight: 700 }}>Condiciones de Gratuidad (UCE)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={repeatsSubjects}
                  onChange={(e) => setRepeatsSubjects(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                Repite una o más materias (arrastres) en este ciclo
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={isSecondDegree}
                  onChange={(e) => setIsSecondDegree(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                Cursando segunda carrera universitaria
              </label>
            </div>
          </div>

          {/* Resumen Financiero y Botón */}
          <div style={{
            borderTop: '1px solid #f1f5f9',
            paddingTop: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Costo Estimado de Matrícula:</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: estimatedCost > 0 ? '#ef4444' : '#10b981' }}>
                {estimatedCost > 0 ? `$${estimatedCost.toFixed(2)} USD` : 'GRATUITO ($0.00)'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {requiresPayment ? `Calculado en base a ${estimatedCredits} créditos` : 'Aplica gratuidad estatal'}
              </div>
            </div>

            <button
              onClick={handleEnroll}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#94a3b8' : '#0d3b8e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 28px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(13, 59, 142, 0.2)'
              }}
            >
              <ShieldCheck size={18} /> {loading ? 'Procesando...' : 'Confirmar e Inscribirse'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
