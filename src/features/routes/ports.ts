import type { Unsubscribe } from 'firebase/firestore';
import type { RouteDocument, RoutesPool, RoutesWorker } from './types';

export interface RoutesDirectoryRepository {
  subscribePools(onNext: (pools: RoutesPool[]) => void, onError?: (e: unknown) => void): Unsubscribe;
  subscribeWorkers(onNext: (workers: RoutesWorker[]) => void, onError?: (e: unknown) => void): Unsubscribe;
  subscribeRoutes(onNext: (routes: RouteDocument[]) => void, onError?: (e: unknown) => void): Unsubscribe;
  createRoute(data: Record<string, unknown>): Promise<string>;
  updateRoute(routeId: string, data: Record<string, unknown>): Promise<void>;
  deleteRoute(routeId: string): Promise<void>;
  updateRouteWorker(routeId: string, workerId: string): Promise<void>;
  swapPlanningPriority(
    first: { routeId: string; planningPriority: number },
    second: { routeId: string; planningPriority: number }
  ): Promise<void>;
  createPlannedInstances(instances: Record<string, unknown>[]): Promise<void>;
}
