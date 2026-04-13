import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { RouteDocument, RoutesPool, RoutesWorker } from '../types';

export function subscribeRoutesPools(
  onPools: (pools: RoutesPool[]) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(
    collection(db, 'pools'),
    (snap) => {
      onPools(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutesPool)));
    },
    onError
  );
}

export function subscribeRoutesWorkers(
  onWorkers: (workers: RoutesWorker[]) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(
    query(collection(db, 'users')),
    (snap) => {
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutesWorker & { role?: string }));
      const filteredWorkers = users.filter((u) => u.role === 'worker' || u.isWorker);
      onWorkers(filteredWorkers);
    },
    onError
  );
}

export function subscribeAllRoutesDocuments(
  onRoutes: (routes: RouteDocument[]) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(
    collection(db, 'routes'),
    (snap) => {
      onRoutes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RouteDocument)));
    },
    onError
  );
}
