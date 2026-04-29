import { useEffect, useMemo, useState } from 'react';
import { useAppServices } from '../../../app/providers/AppServicesContext';
import type { PoolRecord } from '../../../types/pool';
import type { ClientDirectoryEntry } from '../ports';
import {
  createPoolsDirectoryCommands,
  subscribePoolsDirectory,
  type PoolsDirectoryCommands,
} from '../application/poolsDirectoryService';

export function usePoolsDirectory(enabled: boolean, companyId: string | undefined) {
  void companyId;
  const [pools, setPools] = useState<PoolRecord[]>([]);
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([]);
  const { poolsRepository: repository } = useAppServices();

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
