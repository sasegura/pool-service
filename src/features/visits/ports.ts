import type { PoolRecord } from '../../types/pool';

export interface PoolVisitRepository {
  fetchPoolById(poolId: string): Promise<PoolRecord | null>;
  fetchRecentVisitDocs(poolId: string, maxDocs: number): Promise<Record<string, unknown>[]>;
  savePoolVisitWithPoolUpdate(
    poolId: string,
    visitPayload: Record<string, unknown>,
    buildPoolUpdate: (visitDocId: string) => Record<string, unknown>
  ): Promise<string>;
}
