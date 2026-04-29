import { useEffect, useMemo, useState } from 'react';
import { useAppServices } from '../../../app/providers/AppServicesContext';
import {
  createTeamCommands,
  subscribeTeamUsers,
  type TeamCommands,
} from '../application/teamUsersService';
import type { TeamUser } from '../types';

export function useTeamUsers(enabled: boolean, companyId: string | undefined) {
  void companyId;
  const [allUsers, setAllUsers] = useState<TeamUser[]>([]);
  const { teamRepository: repository } = useAppServices();

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
