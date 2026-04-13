import type { PoolShape, PoolSystemType, PoolUsage } from '../../../types/pool';
import { MIAMI_CENTER } from '../constants';

export type PoolDraft = {
  name: string;
  address: string;
  clientId: string;
  coordinates: { lat: number; lng: number };
  ownerLabel: string;
  poolSystemType: PoolSystemType;
  usage: PoolUsage;
  shape: PoolShape;
  lengthM: string;
  widthM: string;
  minDepthM: string;
  maxDepthM: string;
  volumeM3: string;
  volumeManualOverride: boolean;
  filterType: string;
  pumpType: string;
  chlorinationSystem: string;
  skimmerType: string;
  lastTechnicalReview: string;
  lastMaintenance: string;
  lastFilterClean: string;
  previousIncidents: string;
};

export const DEFAULT_FILTER_TYPE = 'sand';
export const DEFAULT_PUMP_TYPE = 'single_speed';
export const DEFAULT_CHLORINATION_SYSTEM = 'manual_chlorine';
export const DEFAULT_SKIMMER_TYPE = 'surface';

export function initialPoolDraft(): PoolDraft {
  return {
    name: '',
    address: '',
    clientId: '',
    coordinates: MIAMI_CENTER,
    ownerLabel: '',
    poolSystemType: 'chlorine',
    usage: 'private',
    shape: 'rectangular',
    lengthM: '',
    widthM: '',
    minDepthM: '',
    maxDepthM: '',
    volumeM3: '',
    volumeManualOverride: false,
    filterType: DEFAULT_FILTER_TYPE,
    pumpType: DEFAULT_PUMP_TYPE,
    chlorinationSystem: DEFAULT_CHLORINATION_SYSTEM,
    skimmerType: DEFAULT_SKIMMER_TYPE,
    lastTechnicalReview: '',
    lastMaintenance: '',
    lastFilterClean: '',
    previousIncidents: '',
  };
}

export function parsePositiveNumber(raw: string): number | undefined {
  const v = raw.trim().replace(',', '.');
  if (v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export function cleanOptionalFields<T extends Record<string, unknown>>(obj: T): Partial<T> | undefined {
  const entries = Object.entries(obj).filter(([, value]) => value !== undefined);
  return entries.length ? (Object.fromEntries(entries) as Partial<T>) : undefined;
}

export function deepRemoveUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => deepRemoveUndefined(item));
  }
  if (value && typeof value === 'object') {
    const cleanedEntries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, deepRemoveUndefined(v)] as const);
    return Object.fromEntries(cleanedEntries);
  }
  return value;
}
