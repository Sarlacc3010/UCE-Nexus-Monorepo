import { useState, useEffect } from 'react';
import { Activity, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

interface AuditLog {
  _id: string;
  service: string;
  action: string;
  details: any;
  timestamp: string;
}

export default function AuditLogsPanel({ token }: { token: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/audit/logs', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (response.ok) {
          setLogs(data.data || []);
        } else {
          setError(data.error || 'Error al obtener los logs de auditoría');
        }
      } catch (err: any) {
        setError('Error de red al consultar el microservicio de auditoría');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, [token]);

  if (loading) {
    return (
      <div className="nexus-panel" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border)', padding: '2rem', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="nexus-loader-spin" style={{ margin: '1rem' }}></div>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Cargando logs de auditoría...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nexus-panel" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border)', padding: '2rem', minHeight: '80vh' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--uce-red)', fontFamily: 'var(--font-sans)' }}>
          <ShieldAlert size={28} color="var(--uce-red)" />
          Error de Conexión
        </h2>
        <div style={{ backgroundColor: 'rgba(225, 29, 72, 0.08)', color: 'var(--uce-red)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(225, 29, 72, 0.15)', fontWeight: 500 }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="nexus-panel" style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border)', minHeight: '100vh', transition: 'var(--transition-smooth)' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2.0rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
        <Activity size={30} color="var(--uce-blue)" />
        Logs del Sistema (Auditoría)
      </h2>
      
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--bg-tertiary)' }}>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fecha / Hora</th>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Servicio</th>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Acción</th>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>
                  No hay eventos de auditoría registrados.
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log._id} style={{ borderBottom: '1px solid var(--bg-tertiary)', transition: 'var(--transition-fast)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(13, 59, 142, 0.02)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color="var(--text-muted)" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600 }}>
                    <span style={{ backgroundColor: 'rgba(13, 59, 142, 0.06)', color: 'var(--uce-blue)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(13, 59, 142, 0.04)' }}>
                      {log.service}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {log.action.includes('SUCCESS') || log.action.includes('TOGGLED') ? (
                        <CheckCircle2 size={16} color="#10b981" />
                      ) : (
                        <ShieldAlert size={16} color="var(--uce-red)" />
                      )}
                      <span style={{ fontWeight: 500 }}>{log.action}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <pre style={{ 
                      margin: 0, 
                      whiteSpace: 'pre-wrap', 
                      wordWrap: 'break-word', 
                      backgroundColor: 'var(--bg-primary)', 
                      padding: '12px', 
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--glass-border)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      maxHeight: '120px',
                      overflowY: 'auto'
                    }}>
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
