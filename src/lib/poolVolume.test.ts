import { describe, expect, it } from 'vitest';
import { computeAvgDepthM, estimateVolumeM3 } from './poolVolume';

describe('poolVolume', () => {
  it('computeAvgDepthM averages min and max', () => {
    expect(computeAvgDepthM(1, 3)).toBe(2);
  });

  it('estimateVolumeM3 rectangular multiplies dimensions', () => {
    expect(estimateVolumeM3({ shape: 'rectangular', lengthM: 2, widthM: 3, avgDepthM: 1.5 })).toBe(9);
  });
});
