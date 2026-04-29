import type { DocumentData, QuerySnapshot, Unsubscribe } from 'firebase/firestore';

export interface WorkerRoutesRepository {
  subscribeAllRoutes(
    onNext: (snapshot: QuerySnapshot<DocumentData>) => void,
    onError?: (e: unknown) => void
  ): Unsubscribe;
  subscribeAllPools(
    onNext: (snapshot: QuerySnapshot<DocumentData>) => void,
    onError?: (e: unknown) => void
  ): Unsubscribe;
  updateMemberLocation(
    authUid: string,
    location: { lat: number; lng: number },
    updatedAtIso: string
  ): Promise<void>;
  updateRoute(routeId: string, data: Record<string, unknown>): Promise<void>;
  createRoute(data: Record<string, unknown>): Promise<string>;
  createLog(data: Record<string, unknown>): Promise<string>;
}
