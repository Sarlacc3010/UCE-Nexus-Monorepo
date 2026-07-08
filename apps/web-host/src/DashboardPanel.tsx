import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Activity, MapPin, GraduationCap, CreditCard } from 'lucide-react';

interface TelemetryData {
  activeUsers: number;
  requestsPerMinute: number;
  locations: { id: string; count: number }[];
  enrollmentStats: {
    primeraMatricula: number;
    segundaMatricula: number;
    terceraMatricula: number;
  };
  paymentStats: {
    aranceles: number;
    parqueadero: number;
  };
}

export default function DashboardPanel({ token }: { token: string }) {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/telemetry/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          setError('Error fetching telemetry data');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [token]);

  if (loading && !data) return <div className="nexus-panel p-6 m-4"><div className="nexus-loader-spin" style={{ margin: '2rem auto' }}></div></div>;
  if (error && !data) return <div className="nexus-panel p-6 m-4" style={{ color: 'red' }}>{error}</div>;
  if (!data) return null;

  return (
    <div className="nexus-panel" style={{ padding: '2rem', margin: '0', backgroundColor: 'var(--bg-primary)', minHeight: '100vh', transition: 'var(--transition-smooth)' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
        <LayoutDashboard size={30} color="var(--uce-blue)" />
        Dashboard de Telemetría en Vivo
      </h2>

      {/* Tarjetas Principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem', marginBottom: '2.5rem' }}>
        <div style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          padding: '1.75rem', 
          borderRadius: 'var(--radius-lg)', 
          boxShadow: 'var(--shadow-md)', 
          border: '1px solid var(--glass-border)', 
          borderLeft: '5px solid var(--uce-blue)',
          transition: 'var(--transition-smooth)',
          cursor: 'default'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(13, 59, 142, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Usuarios en el Sistema</p>
              <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.5rem 0 0 0', fontFamily: 'var(--font-sans)' }}>{data.activeUsers}</h3>
            </div>
            <div style={{ backgroundColor: 'rgba(13, 59, 142, 0.08)', padding: '12px', borderRadius: '50%' }}>
              <Users size={28} color="var(--uce-blue)" />
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          padding: '1.75rem', 
          borderRadius: 'var(--radius-lg)', 
          boxShadow: 'var(--shadow-md)', 
          border: '1px solid var(--glass-border)', 
          borderLeft: '5px solid #10b981',
          transition: 'var(--transition-smooth)',
          cursor: 'default'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(16, 185, 129, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peticiones de Auditoría</p>
              <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.5rem 0 0 0', fontFamily: 'var(--font-sans)' }}>{data.requestsPerMinute}</h3>
            </div>
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '12px', borderRadius: '50%' }}>
              <Activity size={28} color="#10b981" />
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          padding: '1.75rem', 
          borderRadius: 'var(--radius-lg)', 
          boxShadow: 'var(--shadow-md)', 
          border: '1px solid var(--glass-border)', 
          borderLeft: '5px solid #8b5cf6',
          transition: 'var(--transition-smooth)',
          cursor: 'default'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(139, 92, 246, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recaudación Financiera</p>
              <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.5rem 0 0 0', fontFamily: 'var(--font-sans)' }}>
                ${(data.paymentStats.aranceles + data.paymentStats.parqueadero).toFixed(2)}
              </h3>
            </div>
            <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)', padding: '12px', borderRadius: '50%' }}>
              <CreditCard size={28} color="#8b5cf6" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Matriculación */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>
            <GraduationCap size={22} color="var(--uce-blue)" />
            Matriculaciones Registradas
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--bg-tertiary)', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Estudiantes Matriculados</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', backgroundColor: 'rgba(13, 59, 142, 0.06)', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>{data.enrollmentStats.primeraMatricula}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--bg-tertiary)', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Estudiantes Inscritos (Pendiente Pago)</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', backgroundColor: 'rgba(13, 59, 142, 0.06)', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>{data.enrollmentStats.segundaMatricula}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', alignItems: 'center' }}>
              <span style={{ color: 'var(--uce-red)', fontWeight: 600 }}>Tercera Matrícula Solicitadas</span>
              <span style={{ fontWeight: 700, color: 'var(--uce-red)', fontSize: '1.1rem', backgroundColor: 'rgba(225, 29, 72, 0.08)', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>{data.enrollmentStats.terceraMatricula}</span>
            </li>
          </ul>
        </div>

        {/* Localizaciones Populares */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>
            <MapPin size={22} color="var(--uce-red)" />
            Accesos de GeoCampus
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.locations.map((loc, index) => (
              <li key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: index < data.locations.length - 1 ? '1px solid var(--bg-tertiary)' : 'none', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{loc.id}</span>
                <span style={{ fontWeight: 700, color: 'var(--uce-blue)', backgroundColor: 'rgba(13, 59, 142, 0.06)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem' }}>
                  {loc.count} búsquedas
                </span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
