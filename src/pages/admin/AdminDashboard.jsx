import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSyncedSurveys, syncStoresFromCsv, resetStores, syncBrandsFromCsv } from '../../services/db';
import { LogOut, Download, Map as MapIcon, Image as ImageIcon, RefreshCw, Link as LinkIcon, Trash2, Tag, Users, ClipboardList, Activity } from 'lucide-react';
import UsersManagement from './UsersManagement';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('surveys');
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
  
  // CSV Sync State
  const [csvUrl, setCsvUrl] = useState(localStorage.getItem('survey_csv_url') || '');
  const [brandsCsvUrl, setBrandsCsvUrl] = useState(localStorage.getItem('brands_csv_url') || '');
  const [syncing, setSyncing] = useState(false);
  const [syncingBrands, setSyncingBrands] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getSyncedSurveys();
    data.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    setSurveys(data);
  };

  const handleSyncCsv = async () => {
    if(!csvUrl || !csvUrl.startsWith('http')) {
      alert("Por favor inserta una URL válida que comience con http:// o https://");
      return;
    }
    setSyncing(true);
    try {
      localStorage.setItem('survey_csv_url', csvUrl);
      const importedCount = await syncStoresFromCsv(csvUrl);
      alert(`¡Éxito! Se importaron/actualizaron ${importedCount} puntos de venta desde tu enlace.`);
    } catch(err) {
      alert(err.message || "Error al sincronizar. Verifica la URL.");
    }
    setSyncing(false);
  };

  const handleSyncBrandsCsv = async () => {
    if(!brandsCsvUrl || !brandsCsvUrl.startsWith('http')) {
      alert("Por favor inserta una URL válida que comience con http:// o https://");
      return;
    }
    setSyncingBrands(true);
    try {
      localStorage.setItem('brands_csv_url', brandsCsvUrl);
      const importedCount = await syncBrandsFromCsv(brandsCsvUrl);
      alert(`¡Éxito! Se sincronizaron las variables de ${importedCount} marcas distintas.`);
    } catch(err) {
      alert(err.message || "Error al sincronizar Marcas. Verifica la URL.");
    }
    setSyncingBrands(false);
  };

  const handleReset = async () => {
    if(window.confirm("¿Seguro que deseas limpiar la lista corrupta y restaurar los puntos de prueba originales?")) {
      await resetStores();
      setCsvUrl('');
      localStorage.removeItem('survey_csv_url');
      alert("Lista restaurada con éxito. Ve al formulario de relevamiento para ver los cambios.");
    }
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
    <div style={{ display: 'flex', display: 'flex', height: '100vh', backgroundColor: 'var(--bg-color)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width: '320px', backgroundColor: 'white', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
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
             <Users size={18} /> Usuarios Relevadores
           </button>
        </div>

        {/* Sync Stores Section */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LinkIcon size={16} /> Importar Locales (CSV URL)
          </h3>
          <input 
            type="url" 
            value={csvUrl}
            onChange={(e) => setCsvUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/.../export?format=csv"
            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.875rem' }}
          />
          <button onClick={handleSyncCsv} disabled={syncing} style={{ width: '100%', padding: '0.75rem', background: 'var(--primary-color)', color: 'white', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s', marginBottom: '0.5rem' }}>
            {syncing ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
            {syncing ? 'Sincronizando...' : 'Sincronizar Locales'}
          </button>
          
          <button onClick={handleReset} style={{ width: '100%', padding: '0.5rem', background: 'none', color: 'var(--text-light)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Trash2 size={14} /> Restaurar locales por defecto
          </button>
        </div>

        {/* Sync Brands Section */}
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag size={16} /> Importar Marcas (CSV URL)
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '1rem' }}>CSV: Col A = Marca, Col B = Producto</p>
          <input 
            type="url" 
            value={brandsCsvUrl}
            onChange={(e) => setBrandsCsvUrl(e.target.value)}
            placeholder="URL del Excel de Marcas..."
            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.875rem' }}
          />
          <button onClick={handleSyncBrandsCsv} disabled={syncingBrands} style={{ width: '100%', padding: '0.75rem', background: '#475569', color: 'white', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
            {syncingBrands ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
            {syncingBrands ? 'Sincronizando...' : 'Sincronizar Marcas'}
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
      <div style={{ flex: 1, backgroundColor: '#f1f5f9', overflowY: 'auto' }}>
        {activeTab === 'users' ? (
           <UsersManagement />
        ) : (
           <div style={{ padding: '2rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0, color: 'var(--text-dark)' }}>Relevamientos Recibidos</h1>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {activitySummary.map(([name, count]) => (
                      <div key={name} style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
                         <span style={{ fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>{name}</span>
                         <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{count} {count === 1 ? 'local' : 'locales'}</span>
                      </div>
                    ))}
                  </div>
               </div>
             )}

             <div style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
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
