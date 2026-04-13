import { describe, expect, it } from 'vitest';
import { enUS } from 'date-fns/locale';
import { resolveRouteNameForSave } from './routeNaming';

describe('resolveRouteNameForSave', () => {
  it('returns trimmed name when non-empty', () => {
    expect(resolveRouteNameForSave('Morning route', true, 'weekly', [1], '2026-04-14', '2026-04-01', enUS)).toBe(
      'Morning route'
    );
  });

  it('uses weekday from dateStr when name empty and not weekly multi-day case', () => {
    const name = resolveRouteNameForSave('', false, 'none', [], '2026-04-13', undefined, enUS);
    expect(name.length).toBeGreaterThan(0);
  });
});
