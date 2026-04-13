import type { PoolRecord } from '../../../types/pool';
import { MIAMI_CENTER } from '../constants';
import type { PoolDraft } from '../domain/poolDraft';
import {
  DEFAULT_CHLORINATION_SYSTEM,
  DEFAULT_FILTER_TYPE,
  DEFAULT_PUMP_TYPE,
  DEFAULT_SKIMMER_TYPE,
} from '../domain/poolDraft';

export function poolRecordToDraft(pool: PoolRecord): PoolDraft {
  return {
    name: pool.name,
    address: pool.address,
    clientId: pool.clientId || '',
    coordinates: pool.coordinates || MIAMI_CENTER,
    ownerLabel: pool.ownerLabel || '',
    poolSystemType: pool.poolSystemType || 'chlorine',
    usage: pool.usage || 'private',
    shape: pool.shape || 'rectangular',
    lengthM: pool.lengthM != null ? String(pool.lengthM) : '',
    widthM: pool.widthM != null ? String(pool.widthM) : '',
    minDepthM: pool.minDepthM != null ? String(pool.minDepthM) : '',
    maxDepthM: pool.maxDepthM != null ? String(pool.maxDepthM) : '',
    volumeM3: pool.volumeM3 != null ? String(pool.volumeM3) : '',
    volumeManualOverride: !!pool.volumeManualOverride,
    filterType: pool.equipment?.filterType || DEFAULT_FILTER_TYPE,
    pumpType: pool.equipment?.pumpType || DEFAULT_PUMP_TYPE,
    chlorinationSystem: pool.equipment?.chlorinationSystem || DEFAULT_CHLORINATION_SYSTEM,
    skimmerType: pool.equipment?.skimmerType || DEFAULT_SKIMMER_TYPE,
    lastTechnicalReview: pool.equipment?.lastTechnicalReview || '',
    lastMaintenance: pool.history?.lastMaintenance || '',
    lastFilterClean: pool.history?.lastFilterClean || '',
    previousIncidents: pool.history?.previousIncidents || '',
  };
}
