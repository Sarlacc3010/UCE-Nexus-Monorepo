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
    <div className="nexus-panel" style={{ padding: '1.5rem', margin: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
        <Settings size={28} color="#475569" />
        Gestión del Sistema
      </h2>

      {message && (
        <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={18} /> {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Feature Toggles */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <Power size={20} color="#ef4444" />
            Control de Módulos (Feature Toggles)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {Object.keys(config).map((mod) => (
              <div key={mod} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontWeight: 500, color: '#334155', textTransform: 'capitalize' }}>Módulo: {mod}</span>
                <button
                  onClick={() => handleToggle(mod as keyof SystemConfig)}
                  disabled={saving}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: config[mod as keyof SystemConfig] ? '#10b981' : '#ef4444',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin-loader" /> : <Power size={14} />}
                  {config[mod as keyof SystemConfig] ? 'Activo' : 'Apagado'}
                </button>
              </div>
            ))}
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
            * Al apagar un módulo, el API Gateway retornará 503 instantáneamente a todos los usuarios, manteniendo el contenedor vivo.
          </p>
        </div>

        {/* Registrar Materias */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <Calendar size={20} color="#3b82f6" />
            Registrar Materias
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" placeholder="Código (Ej. MAT-101)" className="nexus-form-input" />
            <input type="text" placeholder="Nombre de la Materia" className="nexus-form-input" />
            <input type="text" placeholder="Semestre (Ej. 1)" className="nexus-form-input" />
            <button className="nexus-login-btn" style={{ marginTop: '0.5rem' }}>Guardar Materia (ms-11)</button>
          </div>
        </div>

        {/* Registrar Laboratorios */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <Beaker size={20} color="#8b5cf6" />
            Registrar Laboratorios / Canchas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" placeholder="ID Recurso (Ej. LAB-Cisco)" className="nexus-form-input" />
            <select className="nexus-form-input">
              <option value="laboratorio">Laboratorio</option>
              <option value="cancha">Cancha</option>
              <option value="auditorio">Auditorio</option>
            </select>
            <input type="number" placeholder="Capacidad Máxima" className="nexus-form-input" />
            <button className="nexus-login-btn" style={{ marginTop: '0.5rem' }}>Guardar Recurso (ms-11)</button>
          </div>
        </div>

      </div>
    </div>
  );
}
