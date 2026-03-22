import localforage from 'localforage';
import Papa from 'papaparse';
import { db } from './firebase';
import { collection, addDoc, getDocs, getDoc, orderBy, query, writeBatch, doc, where, updateDoc } from 'firebase/firestore';

localforage.config({
  name: 'SurveyAppPOS',
  storeName: 'surveys'
});

const chunkArray = (arr, size) => arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];

export const saveSurveyOffline = async (survey) => {
  const id = Date.now().toString();
  const newSurvey = { ...survey, id, status: 'pending', timestamp: new Date().toISOString() };
  
  const existing = (await localforage.getItem('pending_surveys')) || [];
  existing.push(newSurvey);
  await localforage.setItem('pending_surveys', existing);
  return newSurvey;
};

export const getPendingSurveys = async () => {
  return (await localforage.getItem('pending_surveys')) || [];
};

export const getStores = async () => {
  try {
    if (navigator.onLine) {
      const snap = await getDocs(collection(db, 'stores'));
      if (!snap.empty) {
        const stores = [];
        snap.forEach(d => stores.push(d.data()));
        await localforage.setItem('stores_list_cache', stores);
        return stores;
      }
    }
  } catch (e) {
    console.warn("No se pudieron cargar los locales de Firestore. Usando caché local.", e);
  }
  
  let stores = await localforage.getItem('stores_list_cache');
  if (!stores || stores.length === 0) {
    stores = [
      { id: '1', name: 'Kiosco Don Carlos', address: 'Av. San Martín 123', province: 'Buenos Aires', locality: 'La Plata', type: 'Kiosco', cluster: 'Norte' },
      { id: '2', name: 'Supermercado El Sol', address: 'Calle Falsa 456', province: 'Mendoza', locality: 'Godoy Cruz', type: 'Supermercado', cluster: 'Centro' },
      { id: '3', name: 'Farmacia 24H Centro', address: 'Peatonal 789', province: 'Córdoba', locality: 'Capital', type: 'Farmacia', cluster: 'Centro' },
      { id: '4', name: 'Despensa Los Amigos', address: 'Ruta Nacional 9 km 4', province: 'Santa Fe', locality: 'Rosario', type: 'Despensa', cluster: 'Sur' }
    ];
  }
  return stores;
};

// Helper for finding the right column header dynamically
const removeAccents = (str) => {
  return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
};

const findKey = (row, possibleNames) => {
  const keys = Object.keys(row);
  for (const p of possibleNames) {
    const searchStr = removeAccents(p.toLowerCase().trim());
    const exactFound = keys.find(k => removeAccents(k.toLowerCase().trim()) === searchStr);
    if (exactFound) return row[exactFound];
  }
  for (const p of possibleNames) {
    const searchStr = removeAccents(p.toLowerCase().trim());
    const partialFound = keys.find(k => removeAccents(k.toLowerCase().trim()).includes(searchStr));
    if (partialFound) return row[partialFound];
  }
  return '';
};

export const syncStoresFromCsv = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network error');
    const text = await response.text();
    
    if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.includes('<html')) {
        throw new Error("El enlace pegado es una página web (HTML), no un CSV. Revisa las instrucciones para descargar o publicar en CSV.");
    }
    
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const newStores = [];
          
          results.data.forEach((row, i) => {
             const name = findKey(row, ['sucursal', 'nombre', 'punto de venta', 'store', 'pdv', 'cliente']);
             const address = findKey(row, ['direccion', 'dirección', 'domicilio', 'address', 'calle']);
             const province = findKey(row, ['provincia', 'province', 'estado']);
             const locality = findKey(row, ['localidad', 'ciudad', 'municipio', 'partido', 'city']);
             const type = findKey(row, ['tipo', 'formato', 'canal', 'type', 'categoria', 'categoría']);
             const cluster = findKey(row, ['grupo', 'cluster', 'zona', 'region', 'región']);

             const fallbackName = name || row[Object.keys(row)[0]];

             if (fallbackName && typeof fallbackName === 'string' && fallbackName.trim()) {
                 const lower = fallbackName.toLowerCase().trim();
                 if (!fallbackName.includes('<!doctype')) {
                     newStores.push({ 
                       id: Date.now().toString() + '-' + i, 
                       name: fallbackName.trim(),
                       address: address ? address.trim() : 'N/A',
                       province: province ? province.trim() : 'N/A',
                       locality: locality ? locality.trim() : 'N/A',
                       type: type ? type.trim() : 'N/A',
                       cluster: cluster ? cluster.trim() : 'N/A'
                     });
                 }
             }
          });

          if (newStores.length > 0) {
            try {
              // 1. Clear old collection
              const oldSnap = await getDocs(collection(db, 'stores'));
              let delChunks = chunkArray(oldSnap.docs, 450);
              for (const chunk of delChunks) {
                const delBatch = writeBatch(db);
                chunk.forEach(d => delBatch.delete(d.ref));
                await delBatch.commit();
              }
              
              // 2. Upload new data in chunks
              const addChunks = chunkArray(newStores, 450);
              for (const chunk of addChunks) {
                const addBatch = writeBatch(db);
                for (const store of chunk) {
                  const docRef = doc(db, 'stores', store.id);
                  addBatch.set(docRef, store);
                }
                await addBatch.commit();
              }

              await localforage.setItem('stores_list_cache', newStores);
              resolve(newStores.length);
            } catch (err) {
              console.error("Error batching to firestore:", err);
              reject(err);
            }
          } else {
            reject(new Error("No se encontraron datos válidos en el archivo. Verifica los nombres de las columnas."));
          }
        },
        error: (err) => reject(err)
      });
    });
  } catch(error) {
    console.error("Error sincronizando CSV:", error);
    throw error;
  }
};

export const resetStores = async () => {
  try {
    const oldSnap = await getDocs(collection(db, 'stores'));
    let delChunks = chunkArray(oldSnap.docs, 450);
    for (const chunk of delChunks) {
      const delBatch = writeBatch(db);
      chunk.forEach(d => delBatch.delete(d.ref));
      await delBatch.commit();
    }
  } catch (e) {
    console.error("Error resetting stores:", e);
  }
  await localforage.removeItem('stores_list_cache');
};

export const getBrands = async () => {
  try {
    if (navigator.onLine) {
      const snap = await getDocs(collection(db, 'brands'));
      if (!snap.empty) {
        const brands = [];
        snap.forEach(d => brands.push(d.data()));
        await localforage.setItem('brands_list_cache', brands);
        return brands;
      }
    }
  } catch(e) {
    console.warn("No se pudo cargar marcas de Firestore. Usando caché.", e);
  }
  return (await localforage.getItem('brands_list_cache')) || [];
};

export const syncBrandsFromCsv = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network error');
    const text = await response.text();
    
    if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.includes('<html')) {
        throw new Error("El enlace pegado es una página web (HTML), no un CSV.");
    }
    
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        complete: async (results) => {
          const brandsMap = {};
          
          results.data.forEach((row) => {
             const brandName = row[0];
             const productName = row[1];
             if (brandName && typeof brandName === 'string' && brandName.trim()) {
                 const name = brandName.trim();
                 if (name.toLowerCase() === 'marca' || name.toLowerCase() === 'marcas') return;
                 
                 if (!brandsMap[name]) {
                     brandsMap[name] = { name, products: [] };
                 }
                 if (productName && typeof productName === 'string' && productName.trim()) {
                     brandsMap[name].products.push(productName.trim());
                 }
             }
          });

          const brandsArray = Object.values(brandsMap);
          if (brandsArray.length > 0) {
            try {
              // 1. Clear old
              const oldSnap = await getDocs(collection(db, 'brands'));
              let delChunks = chunkArray(oldSnap.docs, 450);
              for (const chunk of delChunks) {
                const delBatch = writeBatch(db);
                chunk.forEach(d => delBatch.delete(d.ref));
                await delBatch.commit();
              }
              
              // 2. Upload new
              const addChunks = chunkArray(brandsArray, 450);
              for (const chunk of addChunks) {
                const addBatch = writeBatch(db);
                for (const brand of chunk) {
                  const safeId = brand.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '_' + Date.now();
                  const docRef = doc(db, 'brands', safeId);
                  addBatch.set(docRef, brand);
                }
                await addBatch.commit();
              }

              await localforage.setItem('brands_list_cache', brandsArray);
              resolve(brandsArray.length);
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error("No se encontraron marcas válidas en el archivo."));
          }
        },
        error: (err) => reject(err)
      });
    });
  } catch(error) {
    console.error("Error sincronizando Marcas CSV:", error);
    throw error;
  }
};

export const getSyncedSurveys = async () => {
  try {
     const q = query(collection(db, 'surveys'), orderBy('timestamp', 'desc'));
     const snap = await getDocs(q);
     const list = [];
     snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
     return list;
  } catch(e) {
     console.error("Error fetching synced surveys from Firestore", e);
     return [];
  }
};

export const markSurveySynced = async (id) => {
  const pending = await getPendingSurveys();
  const surveyToSync = pending.find(s => s.id === id);
  
  if (surveyToSync) {
    try {
        const { id: localId, ...surveyData } = surveyToSync; 
        
        await addDoc(collection(db, 'surveys'), {
            ...surveyData,
            status: 'synced'
        });
        
        const updatedPending = pending.filter(s => s.id !== id);
        await localforage.setItem('pending_surveys', updatedPending);
    } catch(e) {
        console.error("Error uploading survey", e);
        throw e;
    }
  }
};

export const getWorkerSurveys = async (username) => {
  try {
     const q = query(collection(db, 'surveys'), where('surveyorName', '==', username));
     const snap = await getDocs(q);
     const list = [];
     snap.forEach(document => list.push({ id: document.id, ...document.data() }));
     return list.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch(e) {
     console.error("Error fetching worker surveys", e);
     return [];
  }
};

export const getSurveyById = async (id) => {
  const pending = await getPendingSurveys();
  const pFound = pending.find(s => s.id === id);
  if (pFound) return { ...pFound, isSynced: false };

  try {
     const docSnap = await getDoc(doc(db, 'surveys', id));
     if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data(), isSynced: true };
     }
  } catch(e) {
     console.error("Error fetching single survey", e);
  }
  return null;
};

export const updateSurvey = async (id, data, isSynced) => {
  if (isSynced) {
     await updateDoc(doc(db, 'surveys', id), data);
  } else {
     const pending = await getPendingSurveys();
     const updated = pending.map(s => s.id === id ? { ...s, ...data } : s);
     await localforage.setItem('pending_surveys', updated);
  }
};
