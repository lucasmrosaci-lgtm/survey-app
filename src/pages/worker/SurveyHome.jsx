import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPendingSurveys, markSurveySynced, getWorkerSurveys } from '../../services/db';
import { PlusCircle, CloudOff, CloudDrizzle, CheckCircle, LogOut, Edit2, Calendar } from 'lucide-react';

export default function SurveyHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [synced, setSynced] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); loadData(true); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    loadData(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = async (onlineStatus) => {
    const pData = await getPendingSurveys();
    setPending(pData);
    
    if (onlineStatus) {
       const userIdentifier = user?.username || user?.email;
       if (userIdentifier) {
           const sData = await getWorkerSurveys(userIdentifier);
           setSynced(sData);
       }
    }
  };

  const handleSync = async () => {
    if (!isOnline || pending.length === 0) return;
    
    // Simulate API call sync
    for (const survey of pending) {
      await new Promise(resolve => setTimeout(resolve, 800)); // mock network delay
      await markSurveySynced(survey.id);
    }
    loadData(isOnline);
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button onClick={() => navigate(`/survey/edit/${p.id}`)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '0.5rem' }} title="Editar">
                    <Edit2 size={18} />
                  </button>
                  <div style={{ color: 'var(--error-color)', display: 'flex', alignItems: 'center' }} title="Pendiente">
                    <CloudOff size={20} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SYNCED HISTORY SECTION */}
      <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '1rem', boxShadow: 'var(--shadow-sm)', marginTop: '2rem', marginBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} color="var(--primary-color)" /> Historial Enviados
          </h2>
          <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.875rem', outline: 'none', background: '#f8fafc' }}>
             <option value="today">Hoy</option>
             <option value="week">Esta Semana</option>
             <option value="month">Este Mes</option>
             <option value="all">Todos</option>
          </select>
        </div>
        
        {!isOnline ? (
           <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '1rem 0', margin: 0 }}>Conéctate a internet para ver tu historial.</p>
        ) : (() => {
           const filteredSynced = synced.filter(s => {
               if (timeFilter === 'all') return true;
               const date = new Date(s.timestamp);
               const now = new Date();
               if (timeFilter === 'today') return date.toDateString() === now.toDateString();
               if (timeFilter === 'week') {
                   const first = now.getDate() - now.getDay();
                   const firstDay = new Date(now.setDate(first));
                   firstDay.setHours(0,0,0,0);
                   return date >= firstDay;
               }
               if (timeFilter === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
               return true;
           });

           if (filteredSynced.length === 0) return <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '1rem 0', margin: 0 }}>No hay relevamientos en este período.</p>;

           return (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               {filteredSynced.map(s => (
                 <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#f8fafc' }}>
                   <div>
                     <div style={{ fontWeight: '500', color: 'var(--text-dark)' }}>{s.storeName || 'Punto de Venta '}</div>
                     <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>{new Date(s.timestamp).toLocaleString()}</div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <button onClick={() => navigate(`/survey/edit/${s.id}`)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '0.5rem' }} title="Editar">
                       <Edit2 size={18} />
                     </button>
                     <div style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center' }} title="Sincronizado">
                       <CheckCircle size={20} />
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           );
        })()}
      </div>
    </div>
  );
}
