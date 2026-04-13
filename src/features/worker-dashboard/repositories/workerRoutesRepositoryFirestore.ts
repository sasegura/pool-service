import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { PoolRecord } from '../../../types/pool';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';

export function subscribeAllRoutes(
  onNext: (snapshot: QuerySnapshot<DocumentData>) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(collection(db, 'routes'), onNext, onError);
}

export function subscribeAllPools(
  onNext: (snapshot: QuerySnapshot<DocumentData>) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(collection(db, 'pools'), onNext, onError);
}

export function poolDocToRecord(id: string, data: DocumentData): PoolRecord {
  return { id, ...data } as PoolRecord;
}
