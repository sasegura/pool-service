import type { PoolRecord, PoolVisitRecord } from '../../types/pool';

export type UnsubscribeFn = () => void;

export interface PoolDetailRepository {
  subscribePool(
    poolId: string,
    onNext: (pool: PoolRecord | null) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
  subscribePoolVisits(
    poolId: string,
    maxItems: number,
    onNext: (visits: PoolVisitRecord[]) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
}
