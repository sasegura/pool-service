import type { WorkerRoutesRepository } from '../ports';

export function createWorkerRoutesCommands(repository: WorkerRoutesRepository) {
  return {
    updateMemberLocation: (
      authUid: string,
      location: { lat: number; lng: number },
      updatedAtIso: string
    ) => repository.updateMemberLocation(authUid, location, updatedAtIso),
    updateRoute: (routeId: string, data: Record<string, unknown>) =>
      repository.updateRoute(routeId, data),
    createRoute: (data: Record<string, unknown>) => repository.createRoute(data),
    createLog: (data: Record<string, unknown>) => repository.createLog(data),
  };
}
