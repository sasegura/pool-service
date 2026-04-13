import { useEffect, useState } from 'react';
import type { PoolRecord } from '../../../types/pool';
import type { ClientDirectoryEntry, PoolsDirectoryRepository } from '../ports';
import { poolsDirectoryRepositoryFirestore } from '../repositories/poolsDirectoryRepositoryFirestore';

export function usePoolsDirectory(
  enabled: boolean,
  repository: PoolsDirectoryRepository = poolsDirectoryRepositoryFirestore
) {
  const [pools, setPools] = useState<PoolRecord[]>([]);
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const unsubPools = repository.subscribePools(setPools);
    const unsubClients = repository.subscribeClientUsers(setClients);
    return () => {
      unsubPools();
      unsubClients();
    };
  }, [enabled, repository]);

  return { pools, clients, repository };
}
