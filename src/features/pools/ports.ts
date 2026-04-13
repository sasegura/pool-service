import type { Unsubscribe } from 'firebase/firestore';
import type { PoolRecord } from '../../types/pool';

export interface ClientDirectoryEntry {
  id: string;
  name: string;
  role: string;
}

export type PoolsSubscriber = (pools: PoolRecord[]) => void;
export type ClientUsersSubscriber = (users: ClientDirectoryEntry[]) => void;

export interface PoolsDirectoryRepository {
  subscribePools(onNext: PoolsSubscriber, onError?: (e: unknown) => void): Unsubscribe;
  subscribeClientUsers(onNext: ClientUsersSubscriber, onError?: (e: unknown) => void): Unsubscribe;
  createPool(data: Record<string, unknown>): Promise<string>;
  updatePool(id: string, data: Record<string, unknown>): Promise<void>;
  deletePool(id: string): Promise<void>;
  updatePoolOwner(poolId: string, clientId: string | undefined): Promise<void>;
}
