import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { doc, setDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import type { TFunction } from 'i18next';
import type { AppUser } from '../types';
import { FirestoreOperationType, handleFirestoreError } from '../../../shared/lib/firestoreErrors';

/**
 * Persists the current user profile. Optionally seeds sample pools/routes only for the preset demo workspace.
 * Real companies should pass `seedSamplePoolsAndRoutes: false` so pools/routes start empty.
 */
export async function runDemoBootstrap(params: {
  db: Firestore;
  companyId: string;
  authUser: User;
  user: AppUser;
  t: TFunction;
  /** When true (demo workspace only), creates sample pools and a route if collections are empty. */
  seedSamplePoolsAndRoutes: boolean;
}): Promise<void> {
  const { db, companyId, authUser, user, t, seedSamplePoolsAndRoutes } = params;

  try {
    try {
      await setDoc(
        doc(db, 'users', authUser.uid),
        {
          displayName: user.displayName,
          email: user.email || null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      handleFirestoreError(e, FirestoreOperationType.WRITE, `users/${authUser.uid}`, 'logOnly');
    }

    if (!seedSamplePoolsAndRoutes) {
      return;
    }

    try {
      const poolsRef = collection(db, 'companies', companyId, 'pools');
      const poolsSnap = await getDocs(poolsRef);
      if (poolsSnap.empty) {
        const demoPools = [
          {
            name: 'Residencia Sunset',
            address: '1234 Ocean Dr, Miami, FL',
            coordinates: { lat: 25.7823, lng: -80.1285 },
            clientId: authUser.uid,
          },
          {
            name: 'Villa Coral Gables',
            address: '456 Miracle Mile, Coral Gables, FL',
            coordinates: { lat: 25.7492, lng: -80.2533 },
            clientId: authUser.uid,
          },
          {
            name: 'Apartamentos Brickell',
            address: '789 Brickell Ave, Miami, FL',
            coordinates: { lat: 25.7617, lng: -80.1918 },
            clientId: authUser.uid,
          },
        ];
        for (const pool of demoPools) {
          await addDoc(poolsRef, pool);
        }
      }
    } catch (e) {
      handleFirestoreError(e, FirestoreOperationType.LIST, 'pools', 'logOnly');
    }

    try {
      const routesRef = collection(db, 'companies', companyId, 'routes');
      const routesSnap = await getDocs(routesRef);
      if (routesSnap.empty) {
        const poolsForRoute = await getDocs(collection(db, 'companies', companyId, 'pools'));
        const poolIds = poolsForRoute.docs.map((d) => d.id);
        if (poolIds.length > 0) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateStr = tomorrow.toISOString().slice(0, 10);
          await addDoc(routesRef, {
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
      handleFirestoreError(e, FirestoreOperationType.LIST, 'routes', 'logOnly');
    }

  } catch (err) {
    console.error('Error seeding demo data:', err);
  }
}
