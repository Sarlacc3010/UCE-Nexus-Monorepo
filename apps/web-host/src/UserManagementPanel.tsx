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
    <div className="nexus-panel" style={{ padding: '1.5rem', margin: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', margin: 0 }}>
          <Users size={28} color="#10b981" />
          Gestión de Usuarios
        </h2>
        <button onClick={() => setShowCreateModal(true)} className="nexus-login-btn" style={{ width: 'auto', display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 20px', margin: 0 }}>
          <UserPlus size={18} /> Crear Usuario
        </button>
      </div>

      {message && (
        <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} /> {message}
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} /> {error}
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '16px', fontWeight: 600, color: '#334155' }}>Usuario / Correo Inst.</th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#334155' }}>Nombres</th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#334155' }}>Cédula</th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#334155' }}>Carrera</th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#334155' }}>Roles</th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center' }}><div className="nexus-loader-spin" style={{ margin: 'auto' }}></div></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No hay usuarios.</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px', color: '#0f172a' }}>
                    <div style={{ fontWeight: 'bold' }}>{u.username}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '16px', color: '#475569' }}>{u.first_name} {u.last_name}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{u.cedula || 'N/A'}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{u.career || 'N/A'}</td>
                  <td style={{ padding: '16px' }}>
                    {editingId === u.id ? (
                      <input 
                        type="text" 
                        value={editRoles} 
                        onChange={e => setEditRoles(e.target.value)} 
                        className="nexus-form-input" 
                        style={{ padding: '4px 8px', margin: 0 }}
                      />
                    ) : (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {u.roles.map(r => (
                          <span key={r} style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{r}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {editingId === u.id ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleUpdateRole(u.id)} style={{ padding: '4px 8px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Save size={16} /></button>
                        <button onClick={() => setEditingId(null)} style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><X size={16} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(u.id); setEditRoles(u.roles.join(', ')); }} style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
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
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Nuevo Usuario</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: '1rem' }}>
              <input type="text" placeholder="Nombre de Usuario (ej. aenavarrete)" className="nexus-form-input" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              <input type="text" placeholder="Nombres" className="nexus-form-input" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              <input type="text" placeholder="Apellidos" className="nexus-form-input" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              <input type="text" placeholder="Cédula (Opcional)" className="nexus-form-input" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value})} />
              <input type="email" placeholder="Correo Personal (Opcional)" className="nexus-form-input" value={formData.personalEmail} onChange={e => setFormData({...formData, personalEmail: e.target.value})} />
              <input type="text" placeholder="Carrera (Opcional)" className="nexus-form-input" value={formData.career} onChange={e => setFormData({...formData, career: e.target.value})} />
              <input type="password" placeholder="Contraseña Temprana" className="nexus-form-input" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              <input type="text" placeholder="Roles (separados por coma, ej. estudiante,admin)" className="nexus-form-input" required value={formData.roles} onChange={e => setFormData({...formData, roles: e.target.value})} />
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>* El correo institucional se generará como {formData.username ? formData.username.toLowerCase() + '@uce.edu.ec' : '...@uce.edu.ec'}</div>
              <button type="submit" className="nexus-login-btn">Crear Usuario</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
