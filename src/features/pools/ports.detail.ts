import type { Unsubscribe } from 'firebase/firestore';
import type { PoolRecord, PoolVisitRecord } from '../../types/pool';

export interface PoolDetailRepository {
  subscribePool(
    poolId: string,
    onNext: (pool: PoolRecord | null) => void,
    onError?: (e: unknown) => void
  ): Unsubscribe;
  subscribePoolVisits(
    poolId: string,
    maxItems: number,
    onNext: (visits: PoolVisitRecord[]) => void,
    onError?: (e: unknown) => void
  ): Unsubscribe;
}
