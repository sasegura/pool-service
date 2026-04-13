import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useTranslation } from 'react-i18next';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo, null, 2));
  // Don't throw here to avoid crashing the whole app during seeding, just log it clearly
}

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
  const { t } = useTranslation();
  const [role, setRoleState] = useState<'admin' | 'worker' | 'client' | null>('admin');
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);

  const user = React.useMemo(() => {
    const uid = role === 'worker' ? 'demo-worker-id' : (role === 'client' ? 'demo-client-id' : (authUser?.uid || 'demo-fallback-uid'));
    return {
      uid,
      displayName:
        role === 'worker'
          ? t('demo.userWorker')
          : role === 'client'
            ? t('demo.userClient')
            : t('demo.userAdmin'),
      email: authUser?.email || 'demo@example.com'
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

  // Sync mock user and seed demo data
  useEffect(() => {
    if (role && authUser) {
      const seedData = async () => {
        try {
          // Get current data to preserve flags
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          const userData = userDoc.data();

          // 1. Current user - Persist isWorker/isClient flags so they stay in lists
          try {
            // For demo purposes, we'll make sure the admin is also marked as a potential worker
            // so they can assign routes to themselves for testing.
            const isWorkerFlag = role === 'worker' || userData?.isWorker || role === 'admin';
            const isClientFlag = role === 'client' || userData?.isClient || role === 'admin';

            await setDoc(doc(db, 'users', authUser.uid), {
              name: user.displayName,
              email: user.email,
              role: role,
              isWorker: isWorkerFlag,
              isClient: isClientFlag,
              uid: authUser.uid,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `users/${authUser.uid}`);
          }

          // 2. Seed some pools if none exist
          try {
            const poolsSnap = await getDocs(collection(db, 'pools'));
            if (poolsSnap.empty) {
              const demoPools = [
                { name: 'Residencia Sunset', address: '1234 Ocean Dr, Miami, FL', coordinates: { lat: 25.7823, lng: -80.1285 }, clientId: authUser.uid },
                { name: 'Villa Coral Gables', address: '456 Miracle Mile, Coral Gables, FL', coordinates: { lat: 25.7492, lng: -80.2533 }, clientId: 'demo-client-id' },
                { name: 'Apartamentos Brickell', address: '789 Brickell Ave, Miami, FL', coordinates: { lat: 25.7617, lng: -80.1918 }, clientId: authUser.uid }
              ];
              for (const pool of demoPools) {
                await addDoc(collection(db, 'pools'), pool);
              }
            } else {
              // Ensure at least one pool is assigned to the current user for demo
              const myPools = poolsSnap.docs.filter(d => d.data().clientId === authUser.uid);
              if (myPools.length === 0 && poolsSnap.docs.length > 0) {
                const firstPoolId = poolsSnap.docs[0].id;
                await setDoc(doc(db, 'pools', firstPoolId), { clientId: authUser.uid }, { merge: true });
              }
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.LIST, 'pools');
          }

          // 3. Seed a dated route if none exist
          try {
            const routesSnap = await getDocs(collection(db, 'routes'));
            if (routesSnap.empty) {
              const poolsForRoute = await getDocs(collection(db, 'pools'));
              const poolIds = poolsForRoute.docs.map(d => d.id);
              if (poolIds.length > 0) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dateStr = tomorrow.toISOString().slice(0, 10);
                await addDoc(collection(db, 'routes'), {
                  routeName: t('demo.seedRouteName'),
                  poolIds: poolIds,
                  date: dateStr,
                  workerId: '',
                  status: 'pending',
                  recurrence: 'none',
                  createdAt: new Date().toISOString(),
                });
              }
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.LIST, 'routes');
          }

          // 4. Seed permanent demo users (create only: merge would be an update after first run,
          // which Firestore rules often restrict to doc owner unless demo IDs are allowed.)
          try {
            const seedDemoUser = async (
              demoUid: string,
              payload: Record<string, unknown>
            ) => {
              const ref = doc(db, 'users', demoUid);
              const snap = await getDoc(ref);
              if (!snap.exists) {
                await setDoc(ref, payload);
              }
            };
            await seedDemoUser('demo-worker-id', {
              name: t('demo.seedWorkerName'),
              email: 'worker@demo.com',
              role: 'worker',
              uid: 'demo-worker-id',
              createdAt: new Date().toISOString()
            });
            await seedDemoUser('demo-client-id', {
              name: t('demo.seedClientName'),
              email: 'client@demo.com',
              role: 'client',
              uid: 'demo-client-id',
              createdAt: new Date().toISOString()
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'users/demo-worker-id');
          }
        } catch (err) {
          console.error("Error seeding demo data:", err);
        }
      };

      seedData();
    }
  }, [role, authUser, t]);

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
