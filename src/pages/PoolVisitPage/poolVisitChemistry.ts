import type { PoolChemistryInput } from '../../types/pool';

export const emptyChem: PoolChemistryInput = {};

export const traditionalKitDefaults: PoolChemistryInput = {
  ph: 7.4,
  freeChlorinePpm: 2,
  waterTempC: 26,
  totalChlorinePpm: 2,
  totalAlkalinityPpm: 100,
  calciumHardnessPpm: 300,
  cyanuricAcidPpm: 40,
  salinityPpm: 3000,
};

export type ChemistryInputDraft = Partial<Record<keyof PoolChemistryInput, string>>;

type ChemistryFieldConfig = {
  step?: number;
  selectorMin?: number;
  selectorMax?: number;
  selectorValues?: number[];
};

export const chemistryFieldConfig: Partial<Record<keyof PoolChemistryInput, ChemistryFieldConfig>> = {
  ph: { step: 0.1, selectorMin: 6.8, selectorMax: 7.8 },
  freeChlorinePpm: { selectorValues: [0, 0.5, 1, 1.5, 2, 3, 5] },
  waterTempC: { step: 2, selectorMin: 18, selectorMax: 34 },
  salinityPpm: { step: 100, selectorMin: 2500, selectorMax: 3800 },
  totalChlorinePpm: { selectorValues: [0, 0.5, 1, 1.5, 2, 3, 5] },
  totalAlkalinityPpm: { step: 10, selectorMin: 60, selectorMax: 160 },
  calciumHardnessPpm: { step: 25, selectorMin: 150, selectorMax: 500 },
  cyanuricAcidPpm: { step: 5, selectorMin: 20, selectorMax: 80 },
};

const getStepDecimals = (step: number) => {
  const stepString = String(step);
  return stepString.includes('.') ? stepString.split('.')[1].length : 0;
};

const buildRangeValues = (config?: ChemistryFieldConfig) => {
  if (!config) return [];
  if (config.selectorValues?.length) {
    return config.selectorValues.map((value) => String(value));
  }
  if (!config.step || config.selectorMin == null || config.selectorMax == null) return [];
  const decimals = getStepDecimals(config.step);
  const values: string[] = [];
  for (let raw = config.selectorMin; raw <= config.selectorMax + config.step / 2; raw += config.step) {
    values.push(String(Number(raw.toFixed(decimals))));
  }
  return values;
};

export const buildSelectorValues = (config?: ChemistryFieldConfig) => {
  const values = buildRangeValues(config);
  if (!config?.selectorValues?.length) return values.slice(1);
  return values;
};
