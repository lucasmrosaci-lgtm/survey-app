import localforage from 'localforage';
import Papa from 'papaparse';
import { db } from './firebase';
import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore';

localforage.config({
  name: 'SurveyAppPOS',
  storeName: 'surveys'
});

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
  let stores = await localforage.getItem('stores_list');
  if (!stores || stores.length === 0) {
    stores = [
      { id: '1', name: 'Kiosco Don Carlos', address: 'Av. San Martín 123', province: 'Buenos Aires', locality: 'La Plata', type: 'Kiosco', cluster: 'Norte' },
      { id: '2', name: 'Supermercado El Sol', address: 'Calle Falsa 456', province: 'Mendoza', locality: 'Godoy Cruz', type: 'Supermercado', cluster: 'Centro' },
      { id: '3', name: 'Farmacia 24H Centro', address: 'Peatonal 789', province: 'Córdoba', locality: 'Capital', type: 'Farmacia', cluster: 'Centro' },
      { id: '4', name: 'Despensa Los Amigos', address: 'Ruta Nacional 9 km 4', province: 'Santa Fe', locality: 'Rosario', type: 'Despensa', cluster: 'Sur' }
    ];
    await localforage.setItem('stores_list', stores);
  }
  return stores;
};

// Helper for finding the right column header dynamically
const removeAccents = (str) => {
  return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
};

const findKey = (row, possibleNames) => {
  const keys = Object.keys(row);
  
  // 1. Busqueda Exacta prioritaria
  for (const p of possibleNames) {
    const searchStr = removeAccents(p.toLowerCase().trim());
    const exactFound = keys.find(k => removeAccents(k.toLowerCase().trim()) === searchStr);
    if (exactFound) return row[exactFound];
  }
  
  // 2. Búsqueda parcial si no encontró exacta
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
        throw new Error("El enlace pegado es una página web (HTML), no un CSV. Revisa las instrucciones para publicar en Google Sheets como .csv");
    }
    
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true, // Parse headers dynamically based on the first row
        skipEmptyLines: true,
        complete: async (results) => {
          const newStores = [];
          
          results.data.forEach((row, i) => {
             // Priorizamos palabras exactas
             const name = findKey(row, ['sucursal', 'nombre', 'punto de venta', 'store', 'pdv', 'cliente']);
             const address = findKey(row, ['direccion', 'dirección', 'domicilio', 'address', 'calle']);
             const province = findKey(row, ['provincia', 'province', 'estado']);
             const locality = findKey(row, ['localidad', 'ciudad', 'municipio', 'partido', 'city']);
             const type = findKey(row, ['tipo', 'formato', 'canal', 'type', 'categoria', 'categoría']);
             const cluster = findKey(row, ['grupo', 'cluster', 'zona', 'region', 'región']);

             // Si no encuentra por header (ej. archivo sin header), intenta agarrar el primer key como fallback heroico
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
            await localforage.setItem('stores_list', newStores);
            resolve(newStores.length);
          } else {
            reject(new Error("No se encontraron datos válidos en el archivo. Verifica los nombres de las columnas."));
          }
        },
        error: (err) => {
           console.error("PapaParse error:", err);
           reject(err);
        }
      });
    });
  } catch(error) {
    console.error("Error sincronizando CSV:", error);
    throw error;
  }
};

export const resetStores = async () => {
  await localforage.removeItem('stores_list');
};

export const getBrands = async () => {
  return (await localforage.getItem('brands_list')) || [];
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
        header: false, // Parse by columns index: 0 = Brand, 1 = Product
        skipEmptyLines: true,
        complete: async (results) => {
          const brandsMap = {};
          
          results.data.forEach((row) => {
             const brandName = row[0];
             const productName = row[1];
             if (brandName && typeof brandName === 'string' && brandName.trim()) {
                 const name = brandName.trim();
                 // Skip header if obvious
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
            await localforage.setItem('brands_list', brandsArray);
            resolve(brandsArray.length);
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
        // Remove local id as Firestore generates its own document ID
        const { id: localId, ...surveyData } = surveyToSync; 
        
        // Upload to Firestore
        await addDoc(collection(db, 'surveys'), {
            ...surveyData,
            status: 'synced'
        });
        
        // Remove from pending locally
        const updatedPending = pending.filter(s => s.id !== id);
        await localforage.setItem('pending_surveys', updatedPending);
    } catch(e) {
        console.error("Error uploading survey", e);
        throw e;
    }
  }
};
