import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { RouteDocument, RoutesPool, RoutesWorker } from '../types';

export function subscribeRoutesPools(
  companyId: string,
  onPools: (pools: RoutesPool[]) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(
    collection(db, 'companies', companyId, 'pools'),
    (snap) => {
      onPools(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutesPool)));
    },
    onError
  );
}

export function subscribeRoutesWorkers(
  companyId: string,
  onWorkers: (workers: RoutesWorker[]) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(
    query(
      collection(db, 'companies', companyId, 'members'),
      where('role', 'in', ['technician', 'supervisor', 'admin'])
    ),
    (snap) => {
      const users = snap.docs.map((d) => {
        const data = d.data();
        const r = (data.role as string) || 'technician';
        return {
          id: d.id,
          name: (data.name as string) || '',
          role: r === 'technician' ? 'worker' : r,
          isWorker: r === 'technician' || r === 'supervisor',
        } as RoutesWorker;
      });
      onWorkers(users);
    },
    onError
  );
}

export function subscribeAllRoutesDocuments(
  companyId: string,
  onRoutes: (routes: RouteDocument[]) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(
    collection(db, 'companies', companyId, 'routes'),
    (snap) => {
      onRoutes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RouteDocument)));
    },
    onError
  );
}
