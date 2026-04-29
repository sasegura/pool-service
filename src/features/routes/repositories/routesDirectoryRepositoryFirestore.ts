import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { RoutesDirectoryRepository } from '../ports';
import type { RouteDocument, RoutesPool, RoutesWorker } from '../types';

export function createRoutesDirectoryRepositoryFirestore(companyId: string): RoutesDirectoryRepository {
  return {
    subscribePools(onNext, onError) {
      return subscribeRoutesPools(companyId, onNext, onError);
    },
    subscribeWorkers(onNext, onError) {
      return subscribeRoutesWorkers(companyId, onNext, onError);
    },
    subscribeRoutes(onNext, onError) {
      return subscribeAllRoutesDocuments(companyId, onNext, onError);
    },
    async createRoute(data) {
      const ref = await addDoc(collection(db, 'companies', companyId, 'routes'), data);
      return ref.id;
    },
    async updateRoute(routeId, data) {
      await updateDoc(doc(db, 'companies', companyId, 'routes', routeId), data);
    },
    async deleteRoute(routeId) {
      await deleteDoc(doc(db, 'companies', companyId, 'routes', routeId));
    },
    async updateRouteWorker(routeId, workerId) {
      await updateDoc(doc(db, 'companies', companyId, 'routes', routeId), { workerId });
    },
    async swapPlanningPriority(first, second) {
      await updateDoc(doc(db, 'companies', companyId, 'routes', first.routeId), {
        planningPriority: first.planningPriority,
      });
      await updateDoc(doc(db, 'companies', companyId, 'routes', second.routeId), {
        planningPriority: second.planningPriority,
      });
    },
    async createPlannedInstances(instances) {
      let batch = writeBatch(db);
      let ops = 0;
      const flush = async () => {
        if (ops > 0) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      };
      for (const instance of instances) {
        const ref = doc(collection(db, 'companies', companyId, 'routes'));
        batch.set(ref, instance);
        ops++;
        if (ops >= 450) await flush();
      }
      await flush();
    },
  };
}

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
