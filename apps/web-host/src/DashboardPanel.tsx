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
    <div className="nexus-panel" style={{ padding: '1.5rem', margin: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
        <LayoutDashboard size={28} color="#3b82f6" />
        Dashboard en Tiempo Real
      </h2>

      {/* Tarjetas Principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>Usuarios Concurrentes</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', margin: '0.5rem 0 0 0' }}>{data.activeUsers}</h3>
            </div>
            <Users size={32} color="#94a3b8" />
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>Actividad (Req/min)</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', margin: '0.5rem 0 0 0' }}>{data.requestsPerMinute}</h3>
            </div>
            <Activity size={32} color="#94a3b8" />
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>Recaudación (Pagos)</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', margin: '0.5rem 0 0 0' }}>{data.paymentStats.aranceles + data.paymentStats.parqueadero}</h3>
            </div>
            <CreditCard size={32} color="#94a3b8" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Matriculación */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GraduationCap size={20} color="#f59e0b" />
            Estado de Matriculación
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ color: '#475569' }}>Primera Matrícula</span>
              <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{data.enrollmentStats.primeraMatricula}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ color: '#475569' }}>Segunda Matrícula</span>
              <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{data.enrollmentStats.segundaMatricula}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
              <span style={{ color: '#ef4444', fontWeight: 500 }}>Tercera Matrícula</span>
              <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{data.enrollmentStats.terceraMatricula}</span>
            </li>
          </ul>
        </div>

        {/* Localizaciones Populares */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="#ec4899" />
            Lugares Más Buscados (Mapas)
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.locations.map((loc, index) => (
              <li key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: index < data.locations.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                <span style={{ color: '#475569' }}>{loc.id}</span>
                <span style={{ fontWeight: 'bold', color: '#0f172a', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '0.875rem' }}>
                  {loc.count} reqs
                </span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
