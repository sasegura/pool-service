import type { PoolRecord } from '../../types/pool';

export interface ClientDirectoryEntry {
  id: string;
  name: string;
  role: string;
}

export type PoolsSubscriber = (pools: PoolRecord[]) => void;
export type ClientUsersSubscriber = (users: ClientDirectoryEntry[]) => void;
export type UnsubscribeFn = () => void;
export type PoolWriteInput = { [key: string]: unknown };

export interface PoolsDirectoryRepository {
  subscribePools(onNext: PoolsSubscriber, onError?: (e: unknown) => void): UnsubscribeFn;
  subscribeClientUsers(onNext: ClientUsersSubscriber, onError?: (e: unknown) => void): UnsubscribeFn;
  createPool(data: PoolWriteInput): Promise<string>;
  updatePool(id: string, data: PoolWriteInput): Promise<void>;
  deletePool(id: string): Promise<void>;
  updatePoolOwner(poolId: string, clientId: string | undefined): Promise<void>;
}
