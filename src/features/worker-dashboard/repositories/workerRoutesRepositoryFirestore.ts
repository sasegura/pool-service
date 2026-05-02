import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { PoolRecord } from '../../../types/pool';
import type { RouteDocument as Route } from '../../routes/types';
import type { WorkerRoutesRepository } from '../ports';

export function createWorkerRoutesRepositoryFirestore(companyId: string): WorkerRoutesRepository {
  return {
    subscribeAllRoutes(onNext, onError) {
      return subscribeAllRoutes(companyId, onNext, onError);
    },
    subscribeAllPools(onNext, onError) {
      return subscribeAllPools(companyId, onNext, onError);
    },
    subscribeLogsForDate(dateYmd, onNext, onError) {
      return subscribeLogsForDate(companyId, dateYmd, onNext, onError);
    },
    async updateMemberLocation(authUid, location, updatedAtIso) {
      await updateDoc(doc(db, 'companies', companyId, 'members', authUid), {
        lastLocation: location,
        lastActive: serverTimestamp(),
        updatedAt: updatedAtIso,
      });
    },
    async updateRoute(routeId, data) {
      await updateDoc(doc(db, 'companies', companyId, 'routes', routeId), data);
    },
    async createRoute(data) {
      const ref = await addDoc(collection(db, 'companies', companyId, 'routes'), data);
      return ref.id;
    },
    async createLog(data) {
      const ref = await addDoc(collection(db, 'companies', companyId, 'logs'), data);
      return ref.id;
    },
  };
}

export function subscribeAllRoutes(
  companyId: string,
  onNext: (routes: Route[]) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(
    collection(db, 'companies', companyId, 'routes'),
    (snapshot) => onNext(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Route)),
    onError
  );
}

export function subscribeAllPools(
  companyId: string,
  onNext: (pools: PoolRecord[]) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(
    collection(db, 'companies', companyId, 'pools'),
    (snapshot) => onNext(snapshot.docs.map((d) => poolDocToRecord(d.id, d.data()))),
    onError
  );
}

export function subscribeLogsForDate(
  companyId: string,
  dateYmd: string,
  onNext: (logs: Record<string, unknown>[]) => void,
  onError?: (e: unknown) => void
) {
  const logsRef = collection(db, 'companies', companyId, 'logs');
  const q = query(logsRef, where('date', '==', dateYmd));
  return onSnapshot(
    q,
    (snapshot) => onNext(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export function poolDocToRecord(id: string, data: { [key: string]: unknown }): PoolRecord {
  return { id, ...data } as PoolRecord;
}
