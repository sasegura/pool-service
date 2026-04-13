import { useEffect, useState } from 'react';
import type { TeamRepository } from '../ports';
import { teamRepositoryFirestore } from '../repositories/teamRepositoryFirestore';
import type { TeamUser } from '../types';

export function useTeamUsers(enabled: boolean, repository: TeamRepository = teamRepositoryFirestore) {
  const [allUsers, setAllUsers] = useState<TeamUser[]>([]);

  useEffect(() => {
    if (!enabled) return;
    return repository.subscribeUsers(setAllUsers);
  }, [enabled, repository]);

  return { allUsers, repository };
}
