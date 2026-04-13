import type { PoolShape } from '../types/pool';

export function computeAvgDepthM(minDepthM?: number, maxDepthM?: number): number | undefined {
  if (minDepthM == null || maxDepthM == null) return undefined;
  if (Number.isNaN(minDepthM) || Number.isNaN(maxDepthM)) return undefined;
  return (minDepthM + maxDepthM) / 2;
}

/**
 * Estimated volume (m³). Irregular pools should rely on manual volume.
 */
export function estimateVolumeM3(params: {
  shape?: PoolShape;
  lengthM?: number;
  widthM?: number;
  avgDepthM?: number;
}): number | undefined {
  const { shape = 'rectangular', lengthM, widthM, avgDepthM } = params;
  if (lengthM == null || widthM == null || avgDepthM == null) return undefined;
  if (lengthM <= 0 || widthM <= 0 || avgDepthM <= 0) return undefined;

  switch (shape) {
    case 'rectangular':
      return lengthM * widthM * avgDepthM;
    case 'oval': {
      const a = lengthM / 2;
      const b = widthM / 2;
      return Math.PI * a * b * avgDepthM;
    }
    case 'round': {
      const diameter = Math.max(lengthM, widthM);
      const r = diameter / 2;
      return Math.PI * r * r * avgDepthM;
    }
    case 'irregular':
    default:
      return undefined;
  }
}
