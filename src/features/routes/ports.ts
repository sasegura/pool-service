import type { RouteDocument, RoutesPool, RoutesWorker } from './types';

export type UnsubscribeFn = () => void;
export type RouteWriteInput = { [key: string]: unknown };

export interface RoutesDirectoryRepository {
  subscribePools(onNext: (pools: RoutesPool[]) => void, onError?: (e: unknown) => void): UnsubscribeFn;
  subscribeWorkers(
    onNext: (workers: RoutesWorker[]) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
  subscribeRoutes(onNext: (routes: RouteDocument[]) => void, onError?: (e: unknown) => void): UnsubscribeFn;
  createRoute(data: RouteWriteInput): Promise<string>;
  updateRoute(routeId: string, data: RouteWriteInput): Promise<void>;
  deleteRoute(routeId: string): Promise<void>;
  updateRouteWorker(routeId: string, workerId: string): Promise<void>;
  swapPlanningPriority(
    first: { routeId: string; planningPriority: number },
    second: { routeId: string; planningPriority: number }
  ): Promise<void>;
  createPlannedInstances(instances: RouteWriteInput[]): Promise<void>;
}
