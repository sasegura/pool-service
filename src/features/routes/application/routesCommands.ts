import type { RouteWriteInput, RoutesDirectoryRepository } from '../ports';

export function createRoutesCommands(repository: RoutesDirectoryRepository) {
  return {
    createRoute: (data: RouteWriteInput) => repository.createRoute(data),
    updateRoute: (routeId: string, data: RouteWriteInput) =>
      repository.updateRoute(routeId, data),
    deleteRoute: (routeId: string) => repository.deleteRoute(routeId),
    updateRouteWorker: (routeId: string, workerId: string) =>
      repository.updateRouteWorker(routeId, workerId),
    swapPlanningPriority: (
      first: { routeId: string; planningPriority: number },
      second: { routeId: string; planningPriority: number }
    ) => repository.swapPlanningPriority(first, second),
    createPlannedInstances: (instances: RouteWriteInput[]) =>
      repository.createPlannedInstances(instances),
  };
}

export type RoutesCommands = ReturnType<typeof createRoutesCommands>;
