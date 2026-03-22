import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSyncedSurveys } from '../../services/db';
import { LogOut, Download, Map as MapIcon, Image as ImageIcon, Users, ClipboardList, Activity, Menu } from 'lucide-react';
import UsersManagement from './UsersManagement';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('surveys');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [surveys, setSurveys] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  
  const activitySummary = React.useMemo(() => {
    const summary = {};
    surveys.forEach(s => {
        const name = s.surveyorName || 'Anónimo';
        if (!summary[name]) summary[name] = 0;
        summary[name]++;
    });
    return Object.entries(summary).sort((a,b) => b[1] - a[1]);
  }, [surveys]);
  

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getSyncedSurveys();
    data.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    setSurveys(data);
  };


  const exportCSV = () => {
    if (surveys.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }
    
    // Todo: Incluir columnas dinámicas basándose en las marcas recolectadas
    const headers = ['ID', 'Fecha', 'Punto de Venta', 'Categoría', 'Latitud', 'Longitud', 'Observaciones'];
    const rows = surveys.map(s => [
      s.id,
      new Date(s.timestamp).toLocaleString(),
      `"${s.storeName}"`,
      s.category,
      s.location?.lat,
      s.location?.lng,
      `"${s.notes || ''}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `surveys_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="admin-layout">
      {/* Sidebar Overlay for Mobile */}
      <div className={`admin-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>Admin Panel</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>Gestión de Relevamientos</p>
        </div>

        {/* Navigation Tabs */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
           <button onClick={() => setActiveTab('surveys')} style={{ width: '100%', padding: '0.75rem', textAlign: 'left', background: activeTab === 'surveys' ? '#eff6ff' : 'transparent', color: activeTab === 'surveys' ? 'var(--primary-color)' : 'var(--text-dark)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: activeTab === 'surveys' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <ClipboardList size={18} /> Relevamientos
           </button>
           <button onClick={() => setActiveTab('users')} style={{ width: '100%', padding: '0.75rem', textAlign: 'left', background: activeTab === 'users' ? '#eff6ff' : 'transparent', color: activeTab === 'users' ? 'var(--primary-color)' : 'var(--text-dark)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: activeTab === 'users' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Users size={18} /> Gestión de Usuarios
           </button>
        </div>


        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
          <div style={{ marginBottom: '1rem', fontWeight: '500', color: 'var(--text-dark)' }}>Admin: {user?.username}</div>
          <button onClick={logout} style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-dark)', fontWeight: '500', transition: 'background 0.2s' }}>
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-content-wrapper">
        
        {/* Toggle Headbar */}
        <div style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', minHeight: '4.5rem' }}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', padding: '0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Colapsar menú">
             <Menu size={24} />
          </button>
          <span style={{ fontWeight: '500', color: 'var(--text-light)', fontSize: '0.875rem' }}>{activeTab === 'surveys' ? 'Relevamientos / Vista General' : 'Usuarios / Gestión de Permisos'}</span>
        </div>

        <div className="admin-pad">
          {activeTab === 'users' ? (
             <UsersManagement />
          ) : (
             <div>
               <div className="admin-header-flex">
                 <h1 className="admin-page-title">Relevamientos Recibidos</h1>
                 <button onClick={exportCSV} style={{ padding: '0.75rem 1.5rem', background: 'var(--success-color)', color: 'white', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
                 <Download size={20} /> Exportar Data (CSV)
               </button>
             </div>

             {/* Activity Summary Widgets */}
             {activitySummary.length > 0 && (
               <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-light)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                     <Activity size={18} /> Resumen de Actividad
                  </h3>
                  <div className="admin-widgets-grid">
                    {activitySummary.map(([name, count]) => (
                      <div key={name} style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
                         <span style={{ fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>{name}</span>
                         <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{count} {count === 1 ? 'local' : 'locales'}</span>
                      </div>
                    ))}
                  </div>
               </div>
             )}

             <div className="table-responsive" style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-light)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-light)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Punto de Venta</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-light)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoría</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-light)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adjuntos</th>
              </tr>
            </thead>
            <tbody>
              {surveys.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
                    No hay relevamientos sincronizados todavía.
                  </td>
                </tr>
              ) : (
                surveys.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-dark)' }}>{new Date(s.timestamp).toLocaleString()}</td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-dark)' }}>{s.storeName}</td>
                    <td style={{ padding: '1rem 1.5rem', textTransform: 'capitalize', color: 'var(--text-dark)' }}>{s.category}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        {s.location && (
                          <a href={`https://maps.google.com/?q=${s.location.lat},${s.location.lng}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500' }}>
                            <MapIcon size={16} /> Mapa
                          </a>
                        )}
                        {s.photoPath && (
                          <button onClick={() => setSelectedPhoto(s.photoPath)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', padding: 0, fontWeight: '500' }}>
                            <ImageIcon size={16} /> Ver Foto
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
         </div>
        </div>
      )}
      </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '2rem' }} onClick={() => setSelectedPhoto(null)}>
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }} onClick={e => e.stopPropagation()}>
            <img src={selectedPhoto} alt="Relevamiento" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 'var(--radius-md)', objectFit: 'contain', display: 'block' }} />
            <button onClick={() => setSelectedPhoto(null)} style={{ position: 'absolute', top: '-1rem', right: '-1rem', background: 'white', color: 'black', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-lg)' }}>
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
