import type { PoolVisitRepository } from '../ports';

export async function loadPoolVisitContext(
  repository: PoolVisitRepository,
  input: {
    poolId: string;
    maxRecentDocs?: number;
  }
) {
  const pool = await repository.fetchPoolById(input.poolId);
  if (!pool) return { pool: null, recentVisits: [] as Record<string, unknown>[] };
  const recentVisits = await repository.fetchRecentVisitDocs(input.poolId, input.maxRecentDocs ?? 5);
  return { pool, recentVisits };
}

export function createPoolVisitCommands(repository: PoolVisitRepository) {
  return {
    savePoolVisitWithPoolUpdate: (
      poolId: string,
      visitPayload: Record<string, unknown>,
      buildPoolUpdate: (visitDocId: string) => Record<string, unknown>
    ) => repository.savePoolVisitWithPoolUpdate(poolId, visitPayload, buildPoolUpdate),
  };
}
