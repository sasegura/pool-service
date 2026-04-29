import { useEffect, useMemo, useState } from 'react';
import {
  createTeamCommands,
  subscribeTeamUsers,
  type TeamCommands,
} from '../application/teamUsersService';
import { createTeamRepositoryFirestore } from '../repositories/teamRepositoryFirestore';
import type { TeamUser } from '../types';

export function useTeamUsers(enabled: boolean, companyId: string | undefined) {
  const [allUsers, setAllUsers] = useState<TeamUser[]>([]);

  const repository = useMemo(
    () => (companyId ? createTeamRepositoryFirestore(companyId) : null),
    [companyId]
  );

  const commands = useMemo(
    () => (repository ? createTeamCommands(repository) : null),
    [repository]
  );

  useEffect(() => {
    if (!enabled || !repository) return;
    return subscribeTeamUsers(repository, {
      onUsers: setAllUsers,
      onError: () => setAllUsers([]),
    });
  }, [enabled, repository]);

  return { allUsers, commands: commands as TeamCommands | null };
}
