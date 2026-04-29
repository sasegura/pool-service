import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePoolsDirectory } from './usePoolsDirectory';

vi.mock('../../../app/providers/AppServicesContext', () => ({
  useAppServices: () => ({
    poolsRepository: null,
  }),
}));

describe('usePoolsDirectory', () => {
  it('does not expose commands when companyId is missing', () => {
    const { result } = renderHook(() => usePoolsDirectory(true, undefined));
    expect(result.current.commands).toBeNull();
    expect(result.current.pools).toEqual([]);
    expect(result.current.clients).toEqual([]);
  });
});
