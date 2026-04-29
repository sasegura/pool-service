import type { PoolsDirectoryRepository } from '../ports';

export function subscribePoolsDirectory(
  repository: PoolsDirectoryRepository,
  handlers: {
    onPools: Parameters<PoolsDirectoryRepository['subscribePools']>[0];
    onClients: Parameters<PoolsDirectoryRepository['subscribeClientUsers']>[0];
    onError?: (e: unknown) => void;
  }
) {
  const unsubPools = repository.subscribePools(handlers.onPools, handlers.onError);
  const unsubClients = repository.subscribeClientUsers(handlers.onClients, handlers.onError);

  return () => {
    unsubPools();
    unsubClients();
  };
}

export function createPoolsDirectoryCommands(repository: PoolsDirectoryRepository) {
  return {
    createPool: (data: Record<string, unknown>) => repository.createPool(data),
    updatePool: (id: string, data: Record<string, unknown>) => repository.updatePool(id, data),
    deletePool: (id: string) => repository.deletePool(id),
    updatePoolOwner: (poolId: string, clientId: string | undefined) =>
      repository.updatePoolOwner(poolId, clientId),
  };
}

export type PoolsDirectoryCommands = ReturnType<typeof createPoolsDirectoryCommands>;
