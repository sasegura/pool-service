import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePoolsDirectory } from './usePoolsDirectory';

describe('usePoolsDirectory', () => {
  it('does not attach a repository when companyId is missing', () => {
    const { result } = renderHook(() => usePoolsDirectory(true, undefined));
    expect(result.current.repository).toBeNull();
    expect(result.current.pools).toEqual([]);
    expect(result.current.clients).toEqual([]);
  });
});
