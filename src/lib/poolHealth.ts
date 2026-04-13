import { IDEAL_RANGES } from '../constants/chemicalReference';
import type { PoolChemistryInput, PoolHealthStatus, PoolVisualObservations, PoolSystemType } from '../types/pool';

function inRange(v: number | undefined, min: number, max: number): boolean {
  if (v === undefined || Number.isNaN(v)) return true;
  return v >= min && v <= max;
}

export function evaluateWaterHealth(params: {
  chemistry: PoolChemistryInput;
  visual: PoolVisualObservations;
  poolSystemType?: PoolSystemType;
}): PoolHealthStatus {
  const { chemistry, visual, poolSystemType } = params;

  if (visual.algaeVisible) return 'urgent';
  if (visual.waterClarity === 'cloudy') return 'urgent';

  const ph = chemistry.ph;
  const fc = chemistry.freeChlorinePpm;

  if (ph !== undefined && !Number.isNaN(ph) && (ph < 6.8 || ph > 8.2)) return 'urgent';
  if (fc !== undefined && !Number.isNaN(fc) && fc <= 0.2) return 'urgent';

  if (visual.waterClarity === 'slightly_cloudy') return 'review';
  if (visual.filterPressure === 'high' || visual.filterPressure === 'low') return 'review';
  if (visual.pumpState && visual.pumpState !== 'ok' && visual.pumpState !== 'unknown') return 'review';

  let anyMeasured = false;
  let anyOut = false;

  const check = (value: number | undefined, min: number, max: number) => {
    if (value === undefined || Number.isNaN(value)) return;
    anyMeasured = true;
    if (value < min || value > max) anyOut = true;
  };

  check(ph, IDEAL_RANGES.ph.min, IDEAL_RANGES.ph.max);
  check(fc, IDEAL_RANGES.freeChlorinePpm.min, IDEAL_RANGES.freeChlorinePpm.max);
  check(chemistry.totalAlkalinityPpm, IDEAL_RANGES.totalAlkalinityPpm.min, IDEAL_RANGES.totalAlkalinityPpm.max);
  check(chemistry.calciumHardnessPpm, IDEAL_RANGES.calciumHardnessPpm.min, IDEAL_RANGES.calciumHardnessPpm.max);
  check(chemistry.cyanuricAcidPpm, IDEAL_RANGES.cyanuricAcidPpm.min, IDEAL_RANGES.cyanuricAcidPpm.max);

  if (poolSystemType === 'salt') {
    check(chemistry.salinityPpm, IDEAL_RANGES.salinityPpm.min, IDEAL_RANGES.salinityPpm.max);
  }

  if (!anyMeasured) return 'review';
  return anyOut ? 'review' : 'ok';
}

export function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Maintenance reminder: if last visit older than interval -> review */
export function maintenanceDueStatus(lastVisitIso?: string, intervalDays = 7): PoolHealthStatus | null {
  if (!lastVisitIso) return 'review';
  const last = new Date(lastVisitIso).getTime();
  if (Number.isNaN(last)) return 'review';
  const due = Date.now() - last > intervalDays * 24 * 60 * 60 * 1000;
  return due ? 'review' : null;
}
