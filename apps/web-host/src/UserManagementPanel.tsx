import { useState, useEffect } from 'react';
import { Users, UserPlus, Edit, Save, X, Check, ShieldAlert } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  cedula?: string;
  personal_email?: string;
  career?: string;
  created_at: string;
}

export default function UserManagementPanel({ token }: { token: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<string>('');

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    roles: 'estudiante',
    cedula: '',
    personalEmail: '',
    career: ''
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/identity/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setUsers(data);
      else setError(data.error || 'Error al cargar usuarios');
    } catch (e) {
      setError('Error de red al conectar con identity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const payload = {
        ...formData,
        roles: formData.roles.split(',').map(r => r.trim())
      };
      
      const res = await fetch('/api/identity/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage(`Usuario creado con correo: ${data.email}`);
        setShowCreateModal(false);
        fetchUsers();
        setFormData({ username: '', firstName: '', lastName: '', password: '', roles: 'estudiante', cedula: '', personalEmail: '', career: '' });
      } else {
        setError(data.error || 'Error al crear usuario');
      }
    } catch (err) {
      setError('Error de red');
    }
  };

  const handleUpdateRole = async (id: string) => {
    try {
      const rolesArray = editRoles.split(',').map(r => r.trim());
      const res = await fetch(`/api/identity/users/${id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roles: rolesArray })
      });
      if (res.ok) {
        setMessage('Roles actualizados');
        setEditingId(null);
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Error actualizando roles');
      }
    } catch (err) {
      setError('Error de red');
    }
  };

  return (
    <div className="nexus-panel" style={{ padding: '2rem', margin: '0', backgroundColor: 'var(--bg-primary)', minHeight: '100vh', transition: 'var(--transition-smooth)', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-sans)' }}>
          <Users size={30} color="var(--uce-blue)" />
          Gestión de Usuarios
        </h2>
        <button onClick={() => setShowCreateModal(true)} className="nexus-login-btn" style={{ width: 'auto', display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 20px', margin: 0, backgroundColor: 'var(--uce-blue)', borderRadius: 'var(--radius-sm)' }}>
          <UserPlus size={18} /> Crear Usuario
        </button>
      </div>

      {message && (
        <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: 'var(--radius-md)', border: '1px solid rgba(22, 101, 52, 0.15)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <Check size={18} /> {message}
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(225, 29, 72, 0.08)', color: 'var(--uce-red)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(225, 29, 72, 0.15)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <ShieldAlert size={18} /> {error}
        </div>
      )}

      <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--bg-tertiary)' }}>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Usuario / Correo Inst.</th>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombres</th>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Cédula</th>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Carrera</th>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Roles</th>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center' }}><div className="nexus-loader-spin" style={{ margin: 'auto' }}></div></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>No hay usuarios.</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--bg-tertiary)', transition: 'var(--transition-fast)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(13, 59, 142, 0.02)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                    <div style={{ fontWeight: 700 }}>{u.username}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{u.first_name} {u.last_name}</td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{u.cedula || 'N/A'}</td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{u.career || 'N/A'}</td>
                  <td style={{ padding: '16px' }}>
                    {editingId === u.id ? (
                      <input 
                        type="text" 
                        value={editRoles} 
                        onChange={e => setEditRoles(e.target.value)} 
                        className="nexus-form-input" 
                        style={{ padding: '6px 12px', margin: 0, width: '100%', fontSize: '13px' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {u.roles.map(r => (
                          <span key={r} style={{ 
                            backgroundColor: r.toLowerCase().includes('admin') ? 'rgba(16, 185, 129, 0.08)' : 'rgba(13, 59, 142, 0.06)', 
                            color: r.toLowerCase().includes('admin') ? '#10b981' : 'var(--uce-blue)', 
                            padding: '3px 10px', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600,
                            border: r.toLowerCase().includes('admin') ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(13, 59, 142, 0.08)'
                          }}>{r}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {editingId === u.id ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleUpdateRole(u.id)} style={{ padding: '6px 10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Save size={16} /></button>
                        <button onClick={() => setEditingId(null)} style={{ padding: '6px 10px', backgroundColor: 'var(--uce-red)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(u.id); setEditRoles(u.roles.join(', ')); }} style={{ padding: '6px 10px', backgroundColor: 'var(--uce-blue)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Edit size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, backdropFilter: 'blur(6px)', transition: 'all 0.3s ease' }}>
          <div className="animate-slide-up" style={{ backgroundColor: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(13, 59, 142, 0.15)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>Crear Nuevo Usuario</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}><X size={24} color="var(--text-muted)" /></button>
            </div>
            <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: '1.25rem' }}>
              <input type="text" placeholder="Nombre de Usuario (ej. aenavarrete)" className="nexus-form-input" style={{ width: '100%' }} required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input type="text" placeholder="Nombres" className="nexus-form-input" style={{ flex: 1 }} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                <input type="text" placeholder="Apellidos" className="nexus-form-input" style={{ flex: 1 }} value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
              <input type="text" placeholder="Cédula (Opcional)" className="nexus-form-input" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value})} />
              <input type="email" placeholder="Correo Personal (Opcional)" className="nexus-form-input" value={formData.personalEmail} onChange={e => setFormData({...formData, personalEmail: e.target.value})} />
              <input type="text" placeholder="Carrera (Opcional)" className="nexus-form-input" value={formData.career} onChange={e => setFormData({...formData, career: e.target.value})} />
              <input type="password" placeholder="Contraseña Inicial" className="nexus-form-input" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              <input type="text" placeholder="Roles (ej. estudiante, admin)" className="nexus-form-input" required value={formData.roles} onChange={e => setFormData({...formData, roles: e.target.value})} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', backgroundColor: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                * Correo institucional generado: <strong>{formData.username ? formData.username.toLowerCase() + '@uce.edu.ec' : '...@uce.edu.ec'}</strong>
              </div>
              <button type="submit" className="nexus-login-btn" style={{ backgroundColor: 'var(--uce-blue)', borderRadius: 'var(--radius-sm)', fontWeight: 700, padding: '12px' }}>Crear Usuario</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
