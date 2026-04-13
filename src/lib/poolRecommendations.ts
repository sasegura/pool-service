import {
  ALGAECIDE_ML_PER_10M3,
  FLOCCULANT_GRAMS_PER_10M3,
  IDEAL_RANGES,
  PH_LOWER_ML_PER_10M3_PER_0_2,
  PH_RAISE_GRAMS_PER_10M3_PER_0_2,
  SHOCK_CHLORINE_GRAMS_PER_10M3_PER_1PPM,
} from '../constants/chemicalReference';
import { computeDose } from './doseCalculation';
import type { PoolChemistryInput, PoolRecommendationItem, PoolSystemType, PoolVisualObservations } from '../types/pool';

function doseSpec(
  amount: number,
  unit: 'g' | 'ml' | 'L',
  referenceVolumeM3: number,
  stepDelta: number
) {
  return { amount, unit, referenceVolumeM3, stepDelta } as const;
}

export function buildRecommendations(params: {
  volumeM3: number;
  chemistry: PoolChemistryInput;
  visual: PoolVisualObservations;
  poolSystemType?: PoolSystemType;
}): PoolRecommendationItem[] {
  const { volumeM3, chemistry, visual, poolSystemType } = params;
  const out: PoolRecommendationItem[] = [];
  const vol = Number.isFinite(volumeM3) && volumeM3 > 0 ? volumeM3 : 50;

  if (visual.algaeVisible) {
    const algaecide = computeDose({
      volumeM3: vol,
      current: 0,
      target: 1,
      product: doseSpec(ALGAECIDE_ML_PER_10M3, 'ml', 10, 1),
    });
    out.push({
      id: 'algae',
      severity: 'critical',
      titleKey: 'poolRec.algaeTitle',
      titleDefault: 'Algae visible',
      bodyKey: 'poolRec.algaeBody',
      bodyDefault: 'Apply algaecide, brush walls, and run extended filtration.',
      dose: algaecide
        ? {
            amount: algaecide.amount,
            unit: 'ml',
            productKey: 'poolRec.productAlgaecide',
            productDefault: 'Algaecide (concentrate)',
          }
        : undefined,
      stepsDefaults: [
        'Brush all surfaces and vacuum to waste if possible.',
        'Add algaecide per manufacturer label; circulate 24–48h.',
        'Backwash/wash filter; maintain FC in range.',
      ],
      safetyDefaults: ['Wear gloves and eye protection.', 'Do not mix concentrated chemicals together.'],
    });
  }

  if (visual.waterClarity === 'cloudy' || visual.waterClarity === 'slightly_cloudy') {
    const floc = computeDose({
      volumeM3: vol,
      current: 0,
      target: 1,
      product: doseSpec(FLOCCULANT_GRAMS_PER_10M3, 'g', 10, 1),
    });
    out.push({
      id: 'turbidity',
      severity: visual.waterClarity === 'cloudy' ? 'critical' : 'warning',
      titleKey: 'poolRec.turbidityTitle',
      titleDefault: 'Water clarity issue',
      bodyKey: 'poolRec.turbidityBody',
      bodyDefault: 'Use clarifier/flocculant and service the filter media.',
      dose: floc
        ? {
            amount: floc.amount,
            unit: 'g',
            productKey: 'poolRec.productFloc',
            productDefault: 'Flocculant / clarifier',
          }
        : undefined,
      stepsDefaults: ['Clean/backwash filter.', 'Dose clarifier; circulate; vacuum to waste if flock forms.'],
      safetyDefaults: ['Avoid inhalation of dust when dosing dry products.'],
    });
  }

  const ph = chemistry.ph;
  if (ph !== undefined && !Number.isNaN(ph)) {
    if (ph < IDEAL_RANGES.ph.min) {
      const target = IDEAL_RANGES.ph.min + 0.05;
      const d = computeDose({
        volumeM3: vol,
        current: ph,
        target,
        product: doseSpec(PH_RAISE_GRAMS_PER_10M3_PER_0_2, 'g', 10, 0.2),
      });
      out.push({
        id: 'ph-low',
        severity: 'warning',
        titleKey: 'poolRec.phLowTitle',
        titleDefault: 'pH below ideal',
        bodyKey: 'poolRec.phLowBody',
        bodyDefault: 'Raise pH before adjusting chlorine efficiency.',
        dose: d
          ? { amount: d.amount, unit: 'g', productKey: 'poolRec.productPhPlus', productDefault: 'pH increaser (soda ash blend)' }
          : undefined,
        stepsDefaults: ['Predissolve in a bucket of pool water.', 'Add slowly with pump running; retest after 4h.'],
        safetyDefaults: ['Avoid skin contact; rinse spills with water.'],
      });
    } else if (ph > IDEAL_RANGES.ph.max) {
      const target = IDEAL_RANGES.ph.max - 0.05;
      const d = computeDose({
        volumeM3: vol,
        current: ph,
        target,
        product: doseSpec(PH_LOWER_ML_PER_10M3_PER_0_2, 'ml', 10, 0.2),
      });
      out.push({
        id: 'ph-high',
        severity: 'warning',
        titleKey: 'poolRec.phHighTitle',
        titleDefault: 'pH above ideal',
        bodyKey: 'poolRec.phHighBody',
        bodyDefault: 'Lower pH carefully; acid is aggressive on equipment and surfaces.',
        dose: d
          ? {
              amount: d.amount,
              unit: 'ml',
              productKey: 'poolRec.productPhMinus',
              productDefault: 'pH reducer (muriatic acid diluted)',
            }
          : undefined,
        stepsDefaults: [
          'Add acid to water (never water to acid) in a bucket.',
          'Pour slowly along deep end with pump running; retest after 6h.',
        ],
        safetyDefaults: ['Acid: use mask/goggles/gloves; ventilate; store upright.'],
      });
    }
  }

  const fc = chemistry.freeChlorinePpm;
  if (fc !== undefined && !Number.isNaN(fc) && poolSystemType !== 'natural') {
    if (fc < IDEAL_RANGES.freeChlorinePpm.min) {
      const target = 2;
      const d = computeDose({
        volumeM3: vol,
        current: fc,
        target,
        product: doseSpec(SHOCK_CHLORINE_GRAMS_PER_10M3_PER_1PPM, 'g', 10, 1),
      });
      out.push({
        id: 'chlorine-low',
        severity: fc < 0.5 ? 'critical' : 'warning',
        titleKey: 'poolRec.chlorineLowTitle',
        titleDefault: 'Free chlorine low',
        bodyKey: 'poolRec.chlorineLowBody',
        bodyDefault: 'Shock or superchlorinate; verify stabilizer and filtration.',
        dose: d
          ? {
              amount: d.amount,
              unit: 'g',
              productKey: 'poolRec.productShock',
              productDefault: 'Calcium hypochlorite ~65% (shock)',
            }
          : undefined,
        stepsDefaults: ['Brush and vacuum.', 'Add shock evening; circulate overnight; retest FC.'],
        safetyDefaults: ['Never mix chlorine with other chemicals directly.', 'Keep children/pets away during dosing.'],
      });
    } else if (fc > IDEAL_RANGES.freeChlorinePpm.max + 1) {
      out.push({
        id: 'chlorine-high',
        severity: 'info',
        titleKey: 'poolRec.chlorineHighTitle',
        titleDefault: 'Free chlorine high',
        bodyKey: 'poolRec.chlorineHighBody',
        bodyDefault: 'Allow natural decay; pause dosing; check automation setpoints.',
      });
    }
  }

  const alk = chemistry.totalAlkalinityPpm;
  if (alk !== undefined && !Number.isNaN(alk)) {
    if (alk < IDEAL_RANGES.totalAlkalinityPpm.min || alk > IDEAL_RANGES.totalAlkalinityPpm.max) {
      out.push({
        id: 'alk',
        severity: 'warning',
        titleKey: 'poolRec.alkTitle',
        titleDefault: 'Total alkalinity out of range',
        bodyKey: 'poolRec.alkBody',
        bodyDefault: 'Adjust TA before fine-tuning pH for more stable results.',
      });
    }
  }

  const cya = chemistry.cyanuricAcidPpm;
  if (cya !== undefined && !Number.isNaN(cya) && poolSystemType === 'chlorine') {
    if (cya > IDEAL_RANGES.cyanuricAcidPpm.max + 20) {
      out.push({
        id: 'cya-high',
        severity: 'warning',
        titleKey: 'poolRec.cyaHighTitle',
        titleDefault: 'Stabilizer (CYA) high',
        bodyKey: 'poolRec.cyaHighBody',
        bodyDefault: 'Partial drain/refill may be required; avoid extra dichlor/trichlor.',
      });
    }
  }

  if (poolSystemType === 'salt') {
    const sal = chemistry.salinityPpm;
    if (sal !== undefined && !Number.isNaN(sal)) {
      if (sal < IDEAL_RANGES.salinityPpm.min || sal > IDEAL_RANGES.salinityPpm.max) {
        out.push({
          id: 'salinity',
          severity: 'warning',
          titleKey: 'poolRec.salinityTitle',
          titleDefault: 'Salinity out of range',
          bodyKey: 'poolRec.salinityBody',
          bodyDefault: 'Adjust salt per cell manufacturer chart; inspect cell scaling.',
        });
      }
    }
  }

  return out;
}
