export type DoseUnit = 'g' | 'ml' | 'L';

export interface DoseProductSpec {
  /** Amount of product for referenceVolumeM3 when parameter moves by stepDelta */
  amount: number;
  unit: DoseUnit;
  referenceVolumeM3: number;
  /** Meaning depends on context: e.g. pH +0.2, or chlorine +1 ppm */
  stepDelta: number;
}

export interface DoseCalculationInput {
  volumeM3: number;
  current: number;
  target: number;
  product: DoseProductSpec;
}

export interface DoseCalculationResult {
  amount: number;
  unit: DoseUnit;
  delta: number;
}

/**
 * Linear scaling: dose = baseAmount * (volume/refVol) * (|target-current|/stepDelta)
 */
export function computeDose(input: DoseCalculationInput): DoseCalculationResult | null {
  const { volumeM3, current, target, product } = input;
  if (!Number.isFinite(volumeM3) || volumeM3 <= 0) return null;
  if (!Number.isFinite(current) || !Number.isFinite(target)) return null;
  if (product.amount <= 0 || product.referenceVolumeM3 <= 0 || product.stepDelta <= 0) return null;

  const delta = Math.abs(target - current);
  if (delta === 0) return { amount: 0, unit: product.unit, delta: 0 };

  const factorVol = volumeM3 / product.referenceVolumeM3;
  const factorParam = delta / product.stepDelta;
  const raw = product.amount * factorVol * factorParam;
  const rounded = Math.round(raw * 10) / 10;
  return { amount: rounded, unit: product.unit, delta };
}
