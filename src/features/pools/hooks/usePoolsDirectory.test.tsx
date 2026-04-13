import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { PoolRecord } from '../../../types/pool';
import type { ClientDirectoryEntry, PoolsDirectoryRepository } from '../ports';
import { usePoolsDirectory } from './usePoolsDirectory';

function createFakeRepository(
  initialPools: PoolRecord[],
  initialClients: ClientDirectoryEntry[]
): PoolsDirectoryRepository {
  return {
    subscribePools(onNext) {
      queueMicrotask(() => onNext(initialPools));
      return vi.fn();
    },
    subscribeClientUsers(onNext) {
      queueMicrotask(() => onNext(initialClients));
      return vi.fn();
    },
    createPool: vi.fn(),
    updatePool: vi.fn(),
    deletePool: vi.fn(),
    updatePoolOwner: vi.fn(),
  };
}

describe('usePoolsDirectory', () => {
  it('subscribes and exposes pools and clients from repository', async () => {
    const pools: PoolRecord[] = [{ id: 'p1', name: 'Test', address: 'Addr' }];
    const clients: ClientDirectoryEntry[] = [{ id: 'c1', name: 'Client', role: 'client' }];
    const repo = createFakeRepository(pools, clients);

    const { result } = renderHook(() => usePoolsDirectory(true, repo));

    await waitFor(() => {
      expect(result.current.pools).toEqual(pools);
      expect(result.current.clients).toEqual(clients);
    });
    expect(result.current.repository).toBe(repo);
  });
});
