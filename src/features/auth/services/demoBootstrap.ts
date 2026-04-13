import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, setDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import type { TFunction } from 'i18next';
import type { AppUser } from '../types';
import { FirestoreOperationType, handleFirestoreError } from '../../../shared/lib/firestoreErrors';

type DemoRole = 'admin' | 'worker' | 'client';

/**
 * Persists the current user profile and seeds demo pools/routes/users when collections are empty.
 * Invoked after auth is ready; errors are logged and do not throw (same behavior as before extraction).
 */
export async function runDemoBootstrap(params: {
  db: Firestore;
  authUser: User;
  role: DemoRole;
  user: AppUser;
  t: TFunction;
}): Promise<void> {
  const { db, authUser, role, user, t } = params;

  try {
    const userDoc = await getDoc(doc(db, 'users', authUser.uid));
    const userData = userDoc.data();

    try {
      const isWorkerFlag = role === 'worker' || userData?.isWorker || role === 'admin';
      const isClientFlag = role === 'client' || userData?.isClient || role === 'admin';

      await setDoc(
        doc(db, 'users', authUser.uid),
        {
          name: user.displayName,
          email: user.email,
          role: role,
          isWorker: isWorkerFlag,
          isClient: isClientFlag,
          uid: authUser.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      handleFirestoreError(e, FirestoreOperationType.WRITE, `users/${authUser.uid}`, 'logOnly');
    }

    try {
      const poolsSnap = await getDocs(collection(db, 'pools'));
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
            clientId: 'demo-client-id',
          },
          {
            name: 'Apartamentos Brickell',
            address: '789 Brickell Ave, Miami, FL',
            coordinates: { lat: 25.7617, lng: -80.1918 },
            clientId: authUser.uid,
          },
        ];
        for (const pool of demoPools) {
          await addDoc(collection(db, 'pools'), pool);
        }
      } else {
        const myPools = poolsSnap.docs.filter((d) => d.data().clientId === authUser.uid);
        if (myPools.length === 0 && poolsSnap.docs.length > 0) {
          const firstPoolId = poolsSnap.docs[0].id;
          await setDoc(doc(db, 'pools', firstPoolId), { clientId: authUser.uid }, { merge: true });
        }
      }
    } catch (e) {
      handleFirestoreError(e, FirestoreOperationType.LIST, 'pools', 'logOnly');
    }

    try {
      const routesSnap = await getDocs(collection(db, 'routes'));
      if (routesSnap.empty) {
        const poolsForRoute = await getDocs(collection(db, 'pools'));
        const poolIds = poolsForRoute.docs.map((d) => d.id);
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
      handleFirestoreError(e, FirestoreOperationType.LIST, 'routes', 'logOnly');
    }

    try {
      const seedDemoUser = async (demoUid: string, payload: Record<string, unknown>) => {
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
        createdAt: new Date().toISOString(),
      });
      await seedDemoUser('demo-client-id', {
        name: t('demo.seedClientName'),
        email: 'client@demo.com',
        role: 'client',
        uid: 'demo-client-id',
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      handleFirestoreError(e, FirestoreOperationType.WRITE, 'users/demo-worker-id', 'logOnly');
    }
  } catch (err) {
    console.error('Error seeding demo data:', err);
  }
}
