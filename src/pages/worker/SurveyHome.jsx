import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPendingSurveys, markSurveySynced } from '../../services/db';
import { PlusCircle, CloudOff, CloudDrizzle, CheckCircle, LogOut } from 'lucide-react';

export default function SurveyHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    loadPending();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPending = async () => {
    const data = await getPendingSurveys();
    setPending(data);
  };

  const handleSync = async () => {
    if (!isOnline || pending.length === 0) return;
    
    // Simulate API call sync
    for (const survey of pending) {
      await new Promise(resolve => setTimeout(resolve, 800)); // mock network delay
      await markSurveySynced(survey.id);
    }
    loadPending();
    alert('Sincronización completada con éxito.');
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Hola, {user.username}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isOnline ? 'var(--success-color)' : 'var(--error-color)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {isOnline ? <CheckCircle size={16}/> : <CloudOff size={16}/>}
            {isOnline ? 'Conectado - Listo para sincronizar' : 'Sin conexión - Guardando localmente'}
          </div>
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }} title="Cerrar sesión">
          <LogOut size={24} />
        </button>
      </div>

      <button 
        onClick={() => navigate('/survey/new')}
        style={{ width: '100%', padding: '1.5rem', borderRadius: '1rem', background: 'var(--primary-color)', color: 'white', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: 'var(--shadow-md)', marginBottom: '2rem' }}
      >
        <PlusCircle size={48} />
        <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>Nuevo Relevamiento</span>
      </button>

      <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '1rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Pendientes ({pending.length})</h2>
          {pending.length > 0 && isOnline && (
            <button onClick={handleSync} style={{ padding: '0.5rem 1rem', background: '#e0e7ff', color: 'var(--primary-color)', borderRadius: '2rem', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CloudDrizzle size={16} /> Sincronizar
            </button>
          )}
        </div>
        
        {pending.length === 0 ? (
          <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '1rem 0', margin: 0 }}>No hay relevamientos pendientes.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pending.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: '500' }}>{p.storeName || 'Punto de Venta anónimo'}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>{new Date(p.timestamp).toLocaleString()}</div>
                </div>
                <div style={{ color: 'var(--error-color)', display: 'flex', alignItems: 'center' }}>
                  <CloudOff size={20} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
