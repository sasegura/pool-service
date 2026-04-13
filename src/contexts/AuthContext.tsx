import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useTranslation } from 'react-i18next';
import type { AppUser } from '../features/auth/types';
import { runDemoBootstrap } from '../features/auth/services/demoBootstrap';

interface AuthContextType {
  user: AppUser | null;
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
  const { t } = useTranslation();
  const [role, setRoleState] = useState<'admin' | 'worker' | 'client' | null>('admin');
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);

  const user = React.useMemo((): AppUser | null => {
    if (!role) return null;
    const uid =
      role === 'worker'
        ? 'demo-worker-id'
        : role === 'client'
          ? 'demo-client-id'
          : authUser?.uid || 'demo-fallback-uid';
    return {
      uid,
      displayName:
        role === 'worker'
          ? t('demo.userWorker')
          : role === 'client'
            ? t('demo.userClient')
            : t('demo.userAdmin'),
      email: authUser?.email || 'demo@example.com',
    };
  }, [authUser?.uid, role, t]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error: any) {
          if (error.code === 'auth/admin-restricted-operation') {
            console.warn(
              "Firebase Anonymous Auth is disabled. \n" +
              "To fix this: \n" +
              "1. Go to Firebase Console -> Authentication -> Sign-in method \n" +
              "2. Enable 'Anonymous' provider. \n" +
              "The app will continue in offline/demo mode, but Firestore operations may fail."
            );
          } else {
            console.error("Error signing in anonymously:", error);
          }
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!role || !authUser || !user) return;
    void runDemoBootstrap({ db, authUser, role, user, t });
  }, [role, authUser, user, t]);

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
