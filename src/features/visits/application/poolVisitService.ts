import type {
  PoolUpdatePayload,
  PoolVisitRepository,
  VisitDocument,
  VisitPayload,
} from '../ports';

export async function loadPoolVisitContext(
  repository: PoolVisitRepository,
  input: {
    poolId: string;
    maxRecentDocs?: number;
  }
) {
  const pool = await repository.fetchPoolById(input.poolId);
  if (!pool) return { pool: null, recentVisits: [] as VisitDocument[] };
  const recentVisits = await repository.fetchRecentVisitDocs(input.poolId, input.maxRecentDocs ?? 5);
  return { pool, recentVisits };
}

export function createPoolVisitCommands(repository: PoolVisitRepository) {
  return {
    savePoolVisitWithPoolUpdate: (
      poolId: string,
      visitPayload: VisitPayload,
      buildPoolUpdate: (visitDocId: string) => PoolUpdatePayload
    ) => repository.savePoolVisitWithPoolUpdate(poolId, visitPayload, buildPoolUpdate),
  };
}
