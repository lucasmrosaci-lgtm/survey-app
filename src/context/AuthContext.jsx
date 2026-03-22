import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Promise.race para evitar que Firebase bloquee el inicio de sesión si Firestore está fuera de línea
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docPromise = getDoc(docRef);
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout Firestore')), 5000));
          const userDoc = await Promise.race([docPromise, timeoutPromise]);

          if (userDoc.exists()) {
             setUser({ ...firebaseUser, role: userDoc.data().role, username: userDoc.data().name || firebaseUser.email });
          } else {
             // Fallback prototype rules: if email has 'admin', they are admin
             const defaultRole = firebaseUser.email.toLowerCase().includes('admin') ? 'admin' : 'worker';
             setUser({ ...firebaseUser, role: defaultRole, username: firebaseUser.email });
          }
        } catch (e) {
             console.error("Error fetching user role:", e.message);
             // Si falla el timeout o hay un error, usamos la regla de prototipo igual que arriba
             const defaultRole = firebaseUser.email.toLowerCase().includes('admin') ? 'admin' : 'worker';
             setUser({ ...firebaseUser, role: defaultRole, username: firebaseUser.email });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return <div className="loading-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-color)', color: 'var(--primary-color)' }}>Cargando sesión oficial...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div className="app-container">
        {children}
      </div>
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
