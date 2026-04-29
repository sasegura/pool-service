import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { PoolRecord, PoolVisitRecord } from '../../../types/pool';
import type { PoolDetailRepository } from '../ports.detail';

export function createPoolDetailRepositoryFirestore(companyId: string): PoolDetailRepository {
  return {
    subscribePool(poolId, onNext, onError) {
      return onSnapshot(
        doc(db, 'companies', companyId, 'pools', poolId),
        (snap) => {
          if (!snap.exists()) {
            onNext(null);
            return;
          }
          onNext({ ...(snap.data() as Omit<PoolRecord, 'id'>), id: snap.id } as PoolRecord);
        },
        onError
      );
    },
    subscribePoolVisits(poolId, maxItems, onNext, onError) {
      const q = query(
        collection(db, 'companies', companyId, 'pools', poolId, 'visits'),
        orderBy('visitedAt', 'desc'),
        limit(maxItems)
      );
      return onSnapshot(
        q,
        (snap) => {
          onNext(
            snap.docs.map(
              (d) => ({ ...(d.data() as Omit<PoolVisitRecord, 'id'>), id: d.id }) as PoolVisitRecord
            )
          );
        },
        onError
      );
    },
  };
}
