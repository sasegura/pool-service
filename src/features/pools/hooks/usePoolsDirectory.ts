import { useEffect, useMemo, useState } from 'react';
import type { PoolRecord } from '../../../types/pool';
import type { ClientDirectoryEntry } from '../ports';
import {
  createPoolsDirectoryCommands,
  subscribePoolsDirectory,
  type PoolsDirectoryCommands,
} from '../application/poolsDirectoryService';
import { createPoolsDirectoryRepositoryFirestore } from '../repositories/poolsDirectoryRepositoryFirestore';

export function usePoolsDirectory(enabled: boolean, companyId: string | undefined) {
  const [pools, setPools] = useState<PoolRecord[]>([]);
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([]);

  const repository = useMemo(
    () => (companyId ? createPoolsDirectoryRepositoryFirestore(companyId) : null),
    [companyId]
  );

  const commands = useMemo(
    () => (repository ? createPoolsDirectoryCommands(repository) : null),
    [repository]
  );

  useEffect(() => {
    if (!enabled || !repository) return;
    return subscribePoolsDirectory(repository, {
      onPools: setPools,
      onClients: setClients,
      onError: () => {
        setPools([]);
        setClients([]);
      },
    });
  }, [enabled, repository]);

  return {
    pools,
    clients,
    commands: commands as PoolsDirectoryCommands | null,
  };
}
