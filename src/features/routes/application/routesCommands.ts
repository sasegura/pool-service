import type { RoutesDirectoryRepository } from '../ports';

export function createRoutesCommands(repository: RoutesDirectoryRepository) {
  return {
    createRoute: (data: Record<string, unknown>) => repository.createRoute(data),
    updateRoute: (routeId: string, data: Record<string, unknown>) =>
      repository.updateRoute(routeId, data),
    deleteRoute: (routeId: string) => repository.deleteRoute(routeId),
    updateRouteWorker: (routeId: string, workerId: string) =>
      repository.updateRouteWorker(routeId, workerId),
    swapPlanningPriority: (
      first: { routeId: string; planningPriority: number },
      second: { routeId: string; planningPriority: number }
    ) => repository.swapPlanningPriority(first, second),
    createPlannedInstances: (instances: Record<string, unknown>[]) =>
      repository.createPlannedInstances(instances),
  };
}

export type RoutesCommands = ReturnType<typeof createRoutesCommands>;
