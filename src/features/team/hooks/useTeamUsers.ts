import { useEffect, useMemo, useState } from 'react';
import type { TeamRepository } from '../ports';
import { createTeamRepositoryFirestore } from '../repositories/teamRepositoryFirestore';
import type { TeamUser } from '../types';

export function useTeamUsers(enabled: boolean, companyId: string | undefined) {
  const [allUsers, setAllUsers] = useState<TeamUser[]>([]);

  const repository = useMemo(
    () => (companyId ? createTeamRepositoryFirestore(companyId) : null),
    [companyId]
  );

  useEffect(() => {
    if (!enabled || !repository) return;
    return repository.subscribeUsers(setAllUsers);
  }, [enabled, repository]);

  return { allUsers, repository: repository as TeamRepository | null };
}
