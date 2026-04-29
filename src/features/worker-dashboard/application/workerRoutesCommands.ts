import type {
  WorkerLogWriteInput,
  WorkerRoutesRepository,
  WorkerRouteWriteInput,
} from '../ports';

export function createWorkerRoutesCommands(repository: WorkerRoutesRepository) {
  return {
    updateMemberLocation: (
      authUid: string,
      location: { lat: number; lng: number },
      updatedAtIso: string
    ) => repository.updateMemberLocation(authUid, location, updatedAtIso),
    updateRoute: (routeId: string, data: WorkerRouteWriteInput) =>
      repository.updateRoute(routeId, data),
    createRoute: (data: WorkerRouteWriteInput) => repository.createRoute(data),
    createLog: (data: WorkerLogWriteInput) => repository.createLog(data),
  };
}
