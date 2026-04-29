import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePoolsDirectory } from './usePoolsDirectory';

describe('usePoolsDirectory', () => {
  it('does not expose commands when companyId is missing', () => {
    const { result } = renderHook(() => usePoolsDirectory(true, undefined));
    expect(result.current.commands).toBeNull();
    expect(result.current.pools).toEqual([]);
    expect(result.current.clients).toEqual([]);
  });
});
