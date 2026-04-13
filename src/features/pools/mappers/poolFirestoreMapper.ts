import { computeAvgDepthM, estimateVolumeM3 } from '../../../lib/poolVolume';
import type { PoolDraft } from '../domain/poolDraft';
import { cleanOptionalFields, deepRemoveUndefined, parsePositiveNumber } from '../domain/poolDraft';

export function buildPoolFirestorePayload(draft: PoolDraft): Record<string, unknown> {
  const L = parsePositiveNumber(draft.lengthM);
  const W = parsePositiveNumber(draft.widthM);
  const minD = parsePositiveNumber(draft.minDepthM);
  const maxD = parsePositiveNumber(draft.maxDepthM);
  const avg = computeAvgDepthM(minD, maxD);
  const manualVol = parsePositiveNumber(draft.volumeM3);
  const est =
    estimateVolumeM3({ shape: draft.shape, lengthM: L, widthM: W, avgDepthM: avg }) ?? manualVol;

  const volumeM3 = draft.volumeManualOverride ? manualVol ?? est : est ?? manualVol;

  const equipment = cleanOptionalFields({
    filterType: draft.filterType.trim() || undefined,
    pumpType: draft.pumpType.trim() || undefined,
    chlorinationSystem: draft.chlorinationSystem.trim() || undefined,
    skimmerType: draft.skimmerType.trim() || undefined,
    lastTechnicalReview: draft.lastTechnicalReview.trim() || undefined,
  });
  const history = cleanOptionalFields({
    lastMaintenance: draft.lastMaintenance.trim() || undefined,
    lastFilterClean: draft.lastFilterClean.trim() || undefined,
    previousIncidents: draft.previousIncidents.trim() || undefined,
  });

  const rawPayload = {
    name: draft.name.trim(),
    address: draft.address.trim(),
    clientId: draft.clientId || undefined,
    coordinates: draft.coordinates,
    ownerLabel: draft.ownerLabel.trim() || undefined,
    poolSystemType: draft.poolSystemType,
    usage: draft.usage,
    shape: draft.shape,
    lengthM: L,
    widthM: W,
    minDepthM: minD,
    maxDepthM: maxD,
    avgDepthM: avg,
    volumeM3: volumeM3,
    volumeManualOverride: draft.volumeManualOverride,
    equipment,
    history,
  };

  return deepRemoveUndefined(rawPayload) as Record<string, unknown>;
}
