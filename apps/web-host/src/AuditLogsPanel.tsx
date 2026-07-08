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
      <div className="nexus-panel p-6 m-4" style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1a1a1a' }}>
          <Activity size={24} color="#0056b3" />
          Logs del Sistema (Auditoría)
        </h2>
        <div className="nexus-loader-spin" style={{ margin: '2rem auto' }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nexus-panel p-6 m-4" style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1a1a1a' }}>
          <ShieldAlert size={24} color="#dc3545" />
          Logs del Sistema (Auditoría)
        </h2>
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="nexus-panel" style={{ backgroundColor: '#fff', margin: '1.5rem', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1a1a1a' }}>
        <Activity size={24} color="#0056b3" />
        Logs del Sistema (Auditoría)
      </h2>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f6f8', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px', fontWeight: 600, color: '#4a5568' }}>Fecha / Hora</th>
              <th style={{ padding: '12px', fontWeight: 600, color: '#4a5568' }}>Servicio</th>
              <th style={{ padding: '12px', fontWeight: 600, color: '#4a5568' }}>Acción</th>
              <th style={{ padding: '12px', fontWeight: 600, color: '#4a5568' }}>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#718096' }}>
                  No hay eventos de auditoría registrados.
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', color: '#2d3748', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} color="#718096" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: '#2d3748', fontSize: '0.875rem', fontWeight: 500 }}>
                    <span style={{ backgroundColor: '#edf2f7', padding: '4px 8px', borderRadius: '4px' }}>
                      {log.service}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#2d3748', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {log.action.includes('SUCCESS') ? <CheckCircle2 size={16} color="#38a169" /> : <ShieldAlert size={16} color="#e53e3e" />}
                      {log.action}
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: '#4a5568', fontSize: '0.875rem' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '4px' }}>
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
