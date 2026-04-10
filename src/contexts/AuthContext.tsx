import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: any | null;
  role: 'admin' | 'worker' | 'client' | null;
  setRole: (role: 'admin' | 'worker' | 'client') => void;
  loading: boolean;
  isAdmin: boolean;
  isWorker: boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  setRole: () => {},
  loading: true,
  isAdmin: false,
  isWorker: false,
  isClient: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<'admin' | 'worker' | 'client' | null>('admin');
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Error signing in anonymously:", error);
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const user = authUser ? {
    uid: authUser.uid,
    displayName: role === 'worker' ? 'Usuario Demo (Técnico)' : (role === 'client' ? 'Cliente Demo' : 'Usuario Demo (Admin)'),
    email: authUser.email || 'demo@example.com'
  } : null;

  // Sync mock user to Firestore so it appears in lists (Team, Routes, etc.)
  useEffect(() => {
    if (role && user?.uid) {
      // Current user
      setDoc(doc(db, 'users', user.uid), {
        name: user.displayName,
        email: user.email,
        role: role,
        uid: user.uid,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Seed a permanent worker for demo purposes
      setDoc(doc(db, 'users', 'demo-worker-id'), {
        name: 'Técnico de Pruebas',
        email: 'worker@demo.com',
        role: 'worker',
        uid: 'demo-worker-id',
        createdAt: new Date().toISOString()
      }, { merge: true });

      // Seed a permanent client for demo purposes
      setDoc(doc(db, 'users', 'demo-client-id'), {
        name: 'Cliente de Pruebas',
        email: 'client@demo.com',
        role: 'client',
        uid: 'demo-client-id',
        createdAt: new Date().toISOString()
      }, { merge: true });
    }
  }, [role, user?.uid]);

  const setRole = (newRole: 'admin' | 'worker' | 'client') => {
    setRoleState(newRole);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      setRole,
      loading, 
      isAdmin: role === 'admin', 
      isWorker: role === 'worker',
      isClient: role === 'client'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
