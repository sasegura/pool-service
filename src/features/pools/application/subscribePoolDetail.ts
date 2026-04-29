import type { PoolDetailRepository } from '../ports.detail';

export function subscribePoolDetail(
  repository: PoolDetailRepository,
  input: {
    poolId: string;
    maxVisits: number;
    onPool: Parameters<PoolDetailRepository['subscribePool']>[1];
    onVisits: Parameters<PoolDetailRepository['subscribePoolVisits']>[2];
    onError?: (e: unknown) => void;
  }
) {
  const unsubPool = repository.subscribePool(input.poolId, input.onPool, input.onError);
  const unsubVisits = repository.subscribePoolVisits(
    input.poolId,
    input.maxVisits,
    input.onVisits,
    input.onError
  );
  return () => {
    unsubPool();
    unsubVisits();
  };
}
