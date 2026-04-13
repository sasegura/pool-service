import { useEffect, useMemo, useState } from 'react';
import type { PoolRecord } from '../../../types/pool';
import type { ClientDirectoryEntry, PoolsDirectoryRepository } from '../ports';
import { createPoolsDirectoryRepositoryFirestore } from '../repositories/poolsDirectoryRepositoryFirestore';

export function usePoolsDirectory(enabled: boolean, companyId: string | undefined) {
  const [pools, setPools] = useState<PoolRecord[]>([]);
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([]);

  const repository = useMemo(
    () => (companyId ? createPoolsDirectoryRepositoryFirestore(companyId) : null),
    [companyId]
  );

  useEffect(() => {
    if (!enabled || !repository) return;
    const unsubPools = repository.subscribePools(setPools);
    const unsubClients = repository.subscribeClientUsers(setClients);
    return () => {
      unsubPools();
      unsubClients();
    };
  }, [enabled, repository]);

  return { pools, clients, repository: repository as PoolsDirectoryRepository | null };
}
