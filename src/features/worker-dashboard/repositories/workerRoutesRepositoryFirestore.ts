import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { PoolRecord } from '../../../types/pool';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import type { WorkerRoutesRepository } from '../ports';

export function createWorkerRoutesRepositoryFirestore(companyId: string): WorkerRoutesRepository {
  return {
    subscribeAllRoutes(onNext, onError) {
      return subscribeAllRoutes(companyId, onNext, onError);
    },
    subscribeAllPools(onNext, onError) {
      return subscribeAllPools(companyId, onNext, onError);
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
  onNext: (snapshot: QuerySnapshot<DocumentData>) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(collection(db, 'companies', companyId, 'routes'), onNext, onError);
}

export function subscribeAllPools(
  companyId: string,
  onNext: (snapshot: QuerySnapshot<DocumentData>) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(collection(db, 'companies', companyId, 'pools'), onNext, onError);
}

export function poolDocToRecord(id: string, data: DocumentData): PoolRecord {
  return { id, ...data } as PoolRecord;
}
