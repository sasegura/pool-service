import type { PoolRecord } from '../../types/pool';
import type { RouteDocument as Route } from '../routes/types';

export type UnsubscribeFn = () => void;
export type WorkerRouteWriteInput = { [key: string]: unknown };
export type WorkerLogWriteInput = { [key: string]: unknown };

export interface WorkerRoutesRepository {
  subscribeAllRoutes(onNext: (routes: Route[]) => void, onError?: (e: unknown) => void): UnsubscribeFn;
  subscribeAllPools(onNext: (pools: PoolRecord[]) => void, onError?: (e: unknown) => void): UnsubscribeFn;
  updateMemberLocation(
    authUid: string,
    location: { lat: number; lng: number },
    updatedAtIso: string
  ): Promise<void>;
  updateRoute(routeId: string, data: WorkerRouteWriteInput): Promise<void>;
  createRoute(data: WorkerRouteWriteInput): Promise<string>;
  createLog(data: WorkerLogWriteInput): Promise<string>;
}
