import type { TeamRepository } from '../ports';

export function subscribeTeamUsers(
  repository: TeamRepository,
  handlers: {
    onUsers: Parameters<TeamRepository['subscribeUsers']>[0];
    onError?: (e: unknown) => void;
  }
) {
  return repository.subscribeUsers(handlers.onUsers, handlers.onError);
}

export function createTeamCommands(repository: TeamRepository) {
  return {
    updateUser: (id: string, data: { name: string; email: string; role: string }) =>
      repository.updateUser(id, data),
    createPreregisteredUser: (data: { name: string; email: string; role: string }) =>
      repository.createPreregisteredUser(data),
    deleteUser: (id: string) => repository.deleteUser(id),
    setUserRole: (userId: string, role: string) => repository.setUserRole(userId, role),
  };
}

export type TeamCommands = ReturnType<typeof createTeamCommands>;
