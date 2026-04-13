/**
 * Reference ranges and dosing assumptions (tunable for your chemical products).
 * Dosing is indicative; always follow manufacturer SDS and local regulations.
 */

export const IDEAL_RANGES = {
  ph: { min: 7.2, max: 7.6 },
  freeChlorinePpm: { min: 1, max: 3 },
  totalAlkalinityPpm: { min: 80, max: 120 },
  calciumHardnessPpm: { min: 200, max: 400 },
  cyanuricAcidPpm: { min: 30, max: 50 },
  /** Typical salt chlorinator range (ppm) */
  salinityPpm: { min: 2700, max: 3400 },
} as const;

/** Grams of pH+ (soda ash / sodium carbonate blend) per 10 m³ to raise pH by 0.2 */
export const PH_RAISE_GRAMS_PER_10M3_PER_0_2 = 100;

/** mL of muriatic acid (approx 31%) per 10 m³ to lower pH by 0.2 — highly product-dependent */
export const PH_LOWER_ML_PER_10M3_PER_0_2 = 120;

/** Grams calcium hypochlorite 65% per 10 m³ to raise FC by ~1 ppm (approximate) */
export const SHOCK_CHLORINE_GRAMS_PER_10M3_PER_1PPM = 75;

/** mL algaecide (concentrate) per 10 m³ maintenance dose */
export const ALGAECIDE_ML_PER_10M3 = 50;

/** Grams flocculant (polyDADMAC granules) per 10 m³ */
export const FLOCCULANT_GRAMS_PER_10M3 = 40;

/** Default days between full service visits for reminder */
export const DEFAULT_MAINTENANCE_INTERVAL_DAYS = 7;
