import { useState, useEffect } from 'react';
import { Settings, Power, Calendar, Beaker, Save, Loader2 } from 'lucide-react';

interface SystemConfig {
  enrollment: boolean;
  payments: boolean;
  requests: boolean;
  booking: boolean;
}

export default function SystemManagementPanel({ token }: { token: string }) {
  const [config, setConfig] = useState<SystemConfig>({
    enrollment: true,
    payments: true,
    requests: true,
    booking: true
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/system/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(console.error);
  }, []);

  const handleToggle = async (module: keyof SystemConfig) => {
    const newConfig = { ...config, [module]: !config[module] };
    setConfig(newConfig);
    
    setSaving(true);
    try {
      await fetch('/api/system/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ [module]: newConfig[module] })
      });
      setMessage(`Módulo ${module} ${newConfig[module] ? 'Activado' : 'Desactivado'}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="nexus-panel" style={{ padding: '2rem', margin: '0', backgroundColor: 'var(--bg-primary)', minHeight: '100vh', transition: 'var(--transition-smooth)' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
        <Settings size={30} color="var(--text-muted)" />
        Gestión del Sistema
      </h2>

      {message && (
        <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: 'var(--radius-md)', border: '1px solid rgba(22, 101, 52, 0.15)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <Save size={18} /> {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
        
        {/* Feature Toggles */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>
            <Power size={22} color="var(--uce-red)" />
            Control de Módulos (Feature Toggles)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {Object.keys(config).map((mod) => (
              <div key={mod} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>Módulo: {mod}</span>
                <button
                  onClick={() => handleToggle(mod as keyof SystemConfig)}
                  disabled={saving}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '20px',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: config[mod as keyof SystemConfig] ? '#10b981' : 'var(--uce-red)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                  }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin-loader" /> : <Power size={14} />}
                  {config[mod as keyof SystemConfig] ? 'Activo' : 'Inactivo'}
                </button>
              </div>
            ))}
          </div>
          <p style={{ marginTop: '1.5rem', fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.4', fontStyle: 'italic' }}>
            * Al apagar un módulo, el API Gateway retornará 503 instantáneamente a todos los usuarios, manteniendo el contenedor vivo.
          </p>
        </div>

        {/* Registrar Materias */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>
            <Calendar size={22} color="var(--uce-blue)" />
            Registrar Materias
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <input type="text" placeholder="Código (Ej. MAT-101)" className="nexus-form-input" style={{ width: '100%' }} />
            <input type="text" placeholder="Nombre de la Materia" className="nexus-form-input" style={{ width: '100%' }} />
            <input type="text" placeholder="Semestre (Ej. 1)" className="nexus-form-input" style={{ width: '100%' }} />
            <button className="nexus-login-btn" style={{ marginTop: '0.5rem', backgroundColor: 'var(--uce-blue)', borderRadius: 'var(--radius-sm)', fontWeight: 700, padding: '12px' }}>Guardar Materia (ms-11)</button>
          </div>
        </div>

        {/* Registrar Laboratorios */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>
            <Beaker size={22} color="#8b5cf6" />
            Registrar Recursos (Labs/Canchas)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <input type="text" placeholder="ID Recurso (Ej. LAB-Cisco)" className="nexus-form-input" style={{ width: '100%' }} />
            <select className="nexus-form-input" style={{ width: '100%', height: '42px', padding: '0 12px' }}>
              <option value="laboratorio">Laboratorio</option>
              <option value="cancha">Cancha</option>
              <option value="auditorio">Auditorio</option>
            </select>
            <input type="number" placeholder="Capacidad Máxima" className="nexus-form-input" style={{ width: '100%' }} />
            <button className="nexus-login-btn" style={{ marginTop: '0.5rem', backgroundColor: '#8b5cf6', borderRadius: 'var(--radius-sm)', fontWeight: 700, padding: '12px' }}>Guardar Recurso (ms-11)</button>
          </div>
        </div>

      </div>
    </div>
  );
}
