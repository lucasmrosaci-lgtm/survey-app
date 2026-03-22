import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Reemplaza este objeto con la configuración de tu consola de Firebase
// Pasos:
// 1. Ve a console.firebase.google.com y crea un proyecto gratuito
// 2. Registra una aplicación de tipo Web "</>" en tu proyecto
// 3. Copia el objeto firebaseConfig que te dan y pégalo exactamente aquí abajo
// 4. Asegúrate también de ir a Authentication y activar "Correo electrónico / Contraseña"
// 5. Ve a "Firestore Database", crea base de datos en modo prueba o producción.

export const firebaseConfig = {
  apiKey: "AIzaSyA_DIUCU9AucC8lzGYAuNcDeatwtnalFG4",
  authDomain: "relevapp-2e327.firebaseapp.com",
  projectId: "relevapp-2e327",
  storageBucket: "relevapp-2e327.firebasestorage.app",
  messagingSenderId: "568306288768",
  appId: "1:568306288768:web:85a40a98eb3b465eaefe65"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
