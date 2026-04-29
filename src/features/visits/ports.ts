import type { PoolRecord } from '../../types/pool';

export type VisitPayload = { [key: string]: unknown };
export type PoolUpdatePayload = { [key: string]: unknown };
export type VisitDocument = { [key: string]: unknown };

export interface PoolVisitRepository {
  fetchPoolById(poolId: string): Promise<PoolRecord | null>;
  fetchRecentVisitDocs(poolId: string, maxDocs: number): Promise<VisitDocument[]>;
  savePoolVisitWithPoolUpdate(
    poolId: string,
    visitPayload: VisitPayload,
    buildPoolUpdate: (visitDocId: string) => PoolUpdatePayload
  ): Promise<string>;
}
