import React, { useState, useEffect } from 'react';
import { db, secondaryAuth } from '../../services/firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { UserPlus, Users, Loader } from 'lucide-react';

export default function UsersManagement() {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setUsersList(list);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if(!newEmail || !newPassword) return;
    
    setIsCreating(true);
    setMessage(null);
    try {
      // Create user on secondary app so it doesn't log out the Admin
      const res = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      const uid = res.user.uid;
      
      // Sign out the secondary instance immediately
      await signOut(secondaryAuth);
      
      // Save metadata in Firestore
      await setDoc(doc(db, 'users', uid), {
         email: newEmail,
         name: newName || newEmail.split('@')[0],
         role: 'worker',
         createdAt: new Date().toISOString()
      });
      
      setMessage({ type: 'success', text: 'Usuario relevador creado exitosamente.' });
      setNewEmail(''); setNewPassword(''); setNewName('');
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error creando usuario: ' + err.message });
    }
    setIsCreating(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <Users color="var(--primary-color)" /> Gestión de Usuarios Relevadores
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
        
        {/* CREATE USER FORM */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', height: 'fit-content' }}>
           <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <UserPlus size={18} /> Crear Nuevo Relevador
           </h3>

           {message && (
             <div style={{ background: message.type === 'success' ? '#ecfdf5' : '#fef2f2', color: message.type === 'success' ? '#10b981' : '#ef4444', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
               {message.text}
             </div>
           )}

           <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Nombre Completo</label>
                <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Ej. Juan Pérez" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Correo Electrónico *</label>
                <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} required placeholder="empleado@empresa.com" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Contraseña *</label>
                <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
              
              <button type="submit" disabled={isCreating} style={{ marginTop: '0.5rem', background: 'var(--primary-color)', color: 'white', padding: '0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                 {isCreating ? 'Creando...' : 'Registrar Cuenta'}
              </button>
           </form>
        </div>

        {/* USERS LIST */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
           <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
             Directorio de Empleados
           </h3>
           
           {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: 'var(--primary-color)' }}><Loader className="animate-spin" /></div>
           ) : (
             <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                   <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: 'var(--text-light)' }}>
                         <th style={{ padding: '0.75rem 0.5rem' }}>Nombre</th>
                         <th style={{ padding: '0.75rem 0.5rem' }}>Correo Electrónico</th>
                         <th style={{ padding: '0.75rem 0.5rem' }}>Rol</th>
                         <th style={{ padding: '0.75rem 0.5rem' }}>Fecha Registro</th>
                      </tr>
                   </thead>
                   <tbody>
                      {usersList.length === 0 ? (
                         <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-light)' }}>Aún no hay usuarios relevadores generados.</td></tr>
                      ) : (
                         usersList.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                               <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{u.name || '-'}</td>
                               <td style={{ padding: '0.75rem 0.5rem', color: 'var(--primary-color)' }}>{u.email}</td>
                               <td style={{ padding: '0.75rem 0.5rem' }}><span style={{ backgroundColor: u.role === 'admin' ? '#fef3c7' : '#e0e7ff', color: u.role === 'admin' ? '#d97706' : '#4338ca', padding: '0.25rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem' }}>{u.role}</span></td>
                               <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-light)', fontSize: '0.8rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                            </tr>
                         ))
                      )}
                   </tbody>
                </table>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
