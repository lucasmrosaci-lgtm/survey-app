import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { saveSurveyOffline, getStores, getBrands, getSurveyById, updateSurvey } from '../../services/db';
import { Camera, MapPin, Save, ArrowLeft, Loader, Store, Filter, Tag, Plus } from 'lucide-react';

export default function SurveyForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const { id } = useParams();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [formData, setFormData] = useState({
    storeId: '',
    storeName: '',
    category: '',
    notes: '',
    photoPath: null
  });
  
  const [stores, setStores] = useState([]);
  const [brandsList, setBrandsList] = useState([]);
  const [brandData, setBrandData] = useState({});
  const [activeBrands, setActiveBrands] = useState([]);
  const [collapsedBrands, setCollapsedBrands] = useState([]);
  const [activeProducts, setActiveProducts] = useState({});

  const [filters, setFilters] = useState({ 
    province: '', 
    locality: '', 
    type: '', 
    cluster: '' 
  });

  useEffect(() => {
    const loadData = async () => {
      const data = await getStores();
      setStores(data);
      
      const loadedBrands = await getBrands();
      setBrandsList(loadedBrands);
      
      const initData = {};
      loadedBrands.forEach(b => {
         initData[b.name] = { launches: '', launchesPhotos: [] };
      });
      
      if (id) {
         setIsEditMode(true);
         const survey = await getSurveyById(id);
         if (survey) {
            setFormData({
               storeId: survey.storeId || '',
               storeName: survey.storeName || '',
               category: survey.category || '',
               notes: survey.notes || '',
               photoPath: survey.photoPath || null
            });
            setBrandData(survey.brands || {});
            const loadedActiveBrands = Object.keys(survey.brands || {});
            setActiveBrands(loadedActiveBrands);
            setCollapsedBrands(loadedActiveBrands);
            
            const loadedActiveProducts = {};
            loadedActiveBrands.forEach(b => {
               loadedActiveProducts[b] = Object.keys(survey.brands[b] || {}).filter(k => k !== 'launches' && k !== 'launchesPhotos' && k !== 'cosecha');
            });
            setActiveProducts(loadedActiveProducts);
            setIsSynced(survey.isSynced);
         }
      } else {
         setBrandData(initData);
      }
    };
    loadData();
  }, [id]);

  const getUnique = (field) => {
    return Array.from(new Set(stores.map(s => s[field]).filter(v => v && v !== 'N/A' && v.trim() !== ''))).sort();
  };

  const filteredStores = useMemo(() => {
    return stores.filter(store => {
      const matchName = filters.name ? store.name === filters.name : true;
      const matchProv = filters.province ? store.province === filters.province : true;
      const matchLoc = filters.locality ? store.locality === filters.locality : true;
      const matchAddr = filters.address ? store.address === filters.address : true;
      const matchType = filters.type ? store.type === filters.type : true;
      const matchCluster = filters.cluster ? store.cluster === filters.cluster : true;
      return matchName && matchProv && matchLoc && matchAddr && matchType && matchCluster;
    });
  }, [stores, filters]);

  const selectedStore = useMemo(() => {
    return stores.find(s => s.name === formData.storeName) || null;
  }, [stores, formData.storeName]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setFormData({ ...formData, storeName: '' });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };


  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoPath: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { 
        ...formData, 
        brands: brandData,
        surveyorId: user?.uid || 'anon',
        surveyorEmail: user?.email || 'anon@anon.com',
        surveyorName: user?.username || 'Anónimo',
        timestamp: new Date().toISOString()
    };
    if (isEditMode) {
        await updateSurvey(id, payload, isSynced);
    } else {
        await saveSurveyOffline(payload);
    }
    setLoading(false);
    navigate('/');
  };

  const updateProduct = (brandName, productName, field, value) => {
     setBrandData(prev => ({ 
         ...prev, 
         [brandName]: { 
             ...prev[brandName], 
             [productName]: {
                 ...(prev[brandName]?.[productName] || {}),
                 [field]: value
             }
         } 
     }));
  };

  const updateBrand = (brandName, field, value) => {
     setBrandData(prev => ({ ...prev, [brandName]: { ...(prev[brandName] || {}), [field]: value } }));
  };

  const addBrandPhoto = (brandName, field, base64) => {
     setBrandData(prev => ({ ...prev, [brandName]: { ...(prev[brandName] || {}), [field]: [...((prev[brandName] || {})[field] || []), base64] } }));
  };

  const removeBrandPhoto = (brandName, field, index) => {
     setBrandData(prev => {
        const arr = [...((prev[brandName] || {})[field] || [])];
        arr.splice(index, 1);
        return { ...prev, [brandName]: { ...(prev[brandName] || {}), [field]: arr } };
     });
  };

  const addProductPhoto = (brandName, productName, field, base64) => {
     setBrandData(prev => ({ 
         ...prev, 
         [brandName]: { 
             ...prev[brandName], 
             [productName]: {
                 ...(prev[brandName]?.[productName] || {}),
                 [field]: [...((prev[brandName]?.[productName] || {})[field] || []), base64]
             }
         } 
     }));
  };

  const removeProductPhoto = (brandName, productName, field, index) => {
     setBrandData(prev => {
        const arr = [...((prev[brandName]?.[productName] || {})[field] || [])];
        arr.splice(index, 1);
        return { 
           ...prev, 
           [brandName]: { 
               ...prev[brandName], 
               [productName]: { ...(prev[brandName]?.[productName] || {}), [field]: arr } 
           } 
        };
     });
  };

  const addActiveProduct = (brandName, productName) => {
      setActiveProducts(prev => {
          const current = prev[brandName] || [];
          if(current.includes(productName)) return prev;
          return { ...prev, [brandName]: [...current, productName] };
      });
      setBrandData(prev => ({
          ...prev,
          [brandName]: {
              ...prev[brandName],
              [productName]: { ...((prev[brandName] || {})[productName] || {}), available: '', price: '', actions: '', actionsPhotos: [] }
          }
      }));
  };

  const removeActiveProduct = (brandName, productName) => {
      setActiveProducts(prev => {
          const current = prev[brandName] || [];
          return { ...prev, [brandName]: current.filter(p => p !== productName) };
      });
  };

  const filterStyle = { padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem', width: '100%', backgroundColor: 'white' };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto', paddingBottom: '6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button type="button" onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <ArrowLeft size={28} />
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{isEditMode ? 'Editar Relevamiento' : 'Nuevo Relevamiento'}</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Filters Section */}
        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
             <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
               <Filter size={16} /> Filtros de Búsqueda ({filteredStores.length} resultados)
             </h3>
             <button type="button" onClick={() => setFilters({name: '', province: '', address: '', locality: '', type: '', cluster: ''})} style={{ fontSize: '0.75rem', color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer' }}>Limpiar Filtros</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <select name="province" value={filters.province} onChange={handleFilterChange} style={filterStyle}>
              <option value="">Provincia...</option>
              {getUnique('province').map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <select name="locality" value={filters.locality} onChange={handleFilterChange} style={filterStyle}>
              <option value="">Localidad...</option>
              {getUnique('locality').map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <select name="type" value={filters.type} onChange={handleFilterChange} style={filterStyle}>
              <option value="">Tipo...</option>
              {getUnique('type').map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <select name="cluster" value={filters.cluster} onChange={handleFilterChange} style={filterStyle}>
              <option value="">Cluster...</option>
              {getUnique('cluster').map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>

        <div className="input-group">
          <label>Punto de Venta a Relevar</label>
          <select 
            name="storeName" 
            value={formData.storeName} 
            onChange={handleChange} 
            required 
            style={{ fontSize: '1.1rem', background: '#fff', border: '2px solid var(--primary-color)' }}
          >
            <option value="">(Selecciona de la lista filtrada)</option>
            {filteredStores.map(store => (
              <option key={store.id} value={store.name}>{store.name}</option>
            ))}
          </select>
        </div>

        {/* Selected Store Metadata Card */}
        {selectedStore && (
          <div style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
              <Store size={20} />
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Detalles del Local</h4>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Provincia</strong>
                <span style={{ color: 'var(--text-dark)' }}>{selectedStore.province}</span>
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Localidad</strong>
                <span style={{ color: 'var(--text-dark)' }}>{selectedStore.locality}</span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong style={{ display: 'block', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Dirección</strong>
                <span style={{ color: 'var(--text-dark)' }}>{selectedStore.address}</span>
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Tipo</strong>
                <span style={{ color: 'var(--text-dark)' }}>{selectedStore.type}</span>
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Cluster</strong>
                <span style={{ color: 'var(--text-dark)' }}>{selectedStore.cluster}</span>
              </div>
            </div>
          </div>
        )}

        {/* MARCAS SECTION */}
        {selectedStore && brandsList.length > 0 && (
          <div style={{ marginTop: '1rem', background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--border-color)' }}>
              <Tag size={20} color="var(--primary-color)" /> Relevamiento de Marcas
            </h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
               <select 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-color)', backgroundColor: '#eff6ff', color: 'var(--primary-color)', fontWeight: '600', cursor: 'pointer' }}
                  value=""
                  onChange={(e) => {
                     const val = e.target.value;
                     if(val && !activeBrands.includes(val)) {
                        // Collapse all previous brands
                        setCollapsedBrands([...activeBrands]);
                        // Add new brand at the top
                        setActiveBrands([val, ...activeBrands]);
                     }
                  }}
               >
                  <option value="" disabled>➕ Agregar marca para evaluar...</option>
                  {brandsList.filter(b => !activeBrands.includes(b.name)).map(b => (
                     <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
               </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               {activeBrands.map((brandName) => {
                  const brand = brandsList.find(b => b.name === brandName);
                  if(!brand) return null;
                  return (
                  <div key={brand.name} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', position: 'relative' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                           <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-dark)', margin: 0 }}>{brand.name}</h3>
                           <button type="button" onClick={() => {
                              if (collapsedBrands.includes(brand.name)) setCollapsedBrands(collapsedBrands.filter(b => b !== brand.name));
                              else setCollapsedBrands([...collapsedBrands, brand.name]);
                           }} style={{ background: '#e2e8f0', border: 'none', color: '#475569', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}>
                              {collapsedBrands.includes(brand.name) ? 'Desplegar' : 'Agrupar'}
                           </button>
                        </div>
                        <button type="button" onClick={() => setActiveBrands(activeBrands.filter(n => n !== brand.name))} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Quitar</button>
                     </div>
                     
                     {!collapsedBrands.includes(brand.name) && (
                        <>
                           {brand.products && brand.products.length > 0 ? (
                         <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                            <select 
                               style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: 'var(--text-dark)', fontWeight: '500', cursor: 'pointer', fontSize: '0.875rem' }}
                               value=""
                               onChange={(e) => {
                                  if(e.target.value) addActiveProduct(brand.name, e.target.value);
                               }}
                            >
                               <option value="" disabled>➕ Agregar Producto de {brand.name}...</option>
                               {brand.products.filter(p => !(activeProducts[brand.name] || []).includes(p)).map(p => (
                                  <option key={p} value={p}>{p}</option>
                               ))}
                            </select>
                         </div>
                     ) : (
                         <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic', marginBottom: '1rem' }}>No hay productos listados para esta marca.</p>
                     )}

                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {(activeProducts[brand.name] || []).map(productName => (
                            <div key={productName} style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.5rem' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--primary-color)', margin: 0 }}>{productName}</h4>
                                    <button type="button" onClick={() => removeActiveProduct(brand.name, productName)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '500', textDecoration: 'underline' }}>Remover</button>
                                </div>
                                
                                <div style={{ marginBottom: '1rem' }}>
                                   <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>¿Disponibilidad en góndola?</label>
                                   <div style={{ display: 'flex', gap: '1rem' }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                         <input type="radio" name={`av-${brand.name}-${productName}`} value="SI" checked={brandData[brand.name]?.[productName]?.available === 'SI'} onChange={() => updateProduct(brand.name, productName, 'available', 'SI')} /> SI
                                      </label>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                         <input type="radio" name={`av-${brand.name}-${productName}`} value="NO" checked={brandData[brand.name]?.[productName]?.available === 'NO'} onChange={() => updateProduct(brand.name, productName, 'available', 'NO')} /> NO
                                      </label>
                                   </div>
                                </div>

                                {brandData[brand.name]?.[productName]?.available === 'SI' && (
                                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                      <div>
                                         <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Precio Comunicado</label>
                                         <input type="text" placeholder="Ej. $1500" value={brandData[brand.name]?.[productName]?.price || ''} onChange={(e) => updateProduct(brand.name, productName, 'price', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }} />
                                      </div>
                                      
                                      <div>
                                         <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Acciones Vigentes</label>
                                         <textarea placeholder="Detalle acciones promocionales..." rows={2} value={brandData[brand.name]?.[productName]?.actions || ''} onChange={(e) => updateProduct(brand.name, productName, 'actions', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', resize: 'vertical' }} />
                                         <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {(brandData[brand.name]?.[productName]?.actionsPhotos || []).map((p, i) => (
                                               <div key={`a-${i}`} style={{ position: 'relative', width: '60px', height: '60px' }}>
                                                  <img src={p} alt="Acc" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}/>
                                                  <button type="button" onClick={() => removeProductPhoto(brand.name, productName, 'actionsPhotos', i)} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                                               </div>
                                            ))}
                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', border: '1px dashed #cbd5e1', borderRadius: '4px', cursor: 'pointer', background: 'white' }}>
                                               <Plus size={20} color="#cbd5e1" />
                                               <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => {
                                                  const f = e.target.files[0];
                                                  if(f) { const r = new FileReader(); r.onloadend=()=>addProductPhoto(brand.name, productName, 'actionsPhotos', r.result); r.readAsDataURL(f); }
                                                  e.target.value = null;
                                               }}/>
                                            </label>
                                         </div>
                                      </div>
                                   </div>
                                )}
                            </div>
                        ))}
                     </div>
                     
                     {/* BRAND LEVEL LANZAMIENTOS Y COSECHA */}
                     <div style={{ marginTop: '1.5rem', background: '#eff6ff', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe' }}>
                        <div style={{ marginBottom: '1.25rem' }}>
                           <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>COSECHA</label>
                           <input type="text" placeholder="Ej. 2023, 2024..." value={brandData[brand.name]?.cosecha || ''} onChange={(e) => updateBrand(brand.name, 'cosecha', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe' }} />
                        </div>
                        
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>LANZAMIENTOS</label>
                        <textarea placeholder="Detalle general de nuevos productos o lanzamientos a nivel marca..." rows={2} value={brandData[brand.name]?.launches || ''} onChange={(e) => updateBrand(brand.name, 'launches', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe', resize: 'vertical' }} />
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                           {(brandData[brand.name]?.launchesPhotos || []).map((p, i) => (
                              <div key={`bl-${i}`} style={{ position: 'relative', width: '60px', height: '60px' }}>
                                 <img src={p} alt="Lanzamiento" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #bfdbfe' }}/>
                                 <button type="button" onClick={() => removeBrandPhoto(brand.name, 'launchesPhotos', i)} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                              </div>
                           ))}
                           <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', border: '1px dashed #60a5fa', borderRadius: '4px', cursor: 'pointer', background: 'white' }}>
                              <Plus size={20} color="#60a5fa" />
                              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => {
                                 const f = e.target.files[0];
                                 if(f) { const r = new FileReader(); r.onloadend=()=>addBrandPhoto(brand.name, 'launchesPhotos', r.result); r.readAsDataURL(f); }
                                 e.target.value = null; // reset input
                              }}/>
                           </label>
                        </div>
                     </div>
                        </>
                     )}
                  </div>
               )})}
            </div>
          </div>
        )}



        <div>
           <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>Fotografía (Opcional)</label>
           <input 
             type="file" 
             accept="image/*" 
             capture="environment" 
             style={{ display: 'none' }} 
             ref={fileInputRef}
             onChange={handlePhotoCapture}
           />
           {formData.photoPath ? (
             <div style={{ position: 'relative' }}>
               <img src={formData.photoPath} alt="Captura" style={{ width: '100%', borderRadius: 'var(--radius-md)', maxHeight: '300px', objectFit: 'cover' }} />
               <button type="button" onClick={() => setFormData({...formData, photoPath: null})} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
             </div>
           ) : (
             <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', border: '1px dashed #cbd5e1', background: '#f8fafc', color: 'var(--text-light)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
               <Camera size={40} />
               <span style={{ fontSize: '1rem' }}>Tomar foto del local</span>
             </button>
           )}
        </div>

        <div className="input-group">
          <label>Observaciones Adicionales</label>
          <textarea 
            name="notes" 
            value={formData.notes} 
            onChange={handleChange} 
            rows={4}
            style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', resize: 'vertical', fontSize: '1rem' }}
            placeholder="Comentarios adicionales sobre el relevamiento..."
          />
        </div>

        <button type="submit" disabled={loading} style={{ position: 'fixed', bottom: '1rem', left: '1rem', right: '1rem', maxWidth: '568px', margin: '0 auto', background: 'var(--primary-color)', color: 'white', padding: '1.25rem', borderRadius: 'var(--radius-lg)', fontSize: '1.125rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow-lg)' }}>
          {loading ? 'Guardando...' : <Save size={24} />}
          {loading ? '' : (isEditMode ? 'Actualizar Relevamiento' : 'Guardar Relevamiento')}
        </button>
      </form>
    </div>
  );
}
