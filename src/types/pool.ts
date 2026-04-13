export type PoolSystemType = 'chlorine' | 'salt' | 'natural';

export type PoolUsage = 'private' | 'community' | 'public';

export type PoolShape = 'rectangular' | 'oval' | 'round' | 'irregular';

export type PoolHealthStatus = 'ok' | 'review' | 'urgent';

export type WaterClarity = 'clear' | 'slightly_cloudy' | 'cloudy';

export interface PoolEquipment {
  filterType?: string;
  pumpType?: string;
  chlorinationSystem?: string;
  skimmerType?: string;
  lastTechnicalReview?: string;
}

export interface PoolHistoryFields {
  lastMaintenance?: string;
  lastFilterClean?: string;
  previousIncidents?: string;
}

/** Firestore pool document (subset used across the app) */
export interface PoolRecord {
  id: string;
  name: string;
  address: string;
  clientId?: string;
  ownerLabel?: string;
  coordinates?: { lat: number; lng: number };

  poolSystemType?: PoolSystemType;
  usage?: PoolUsage;

  lengthM?: number;
  widthM?: number;
  minDepthM?: number;
  maxDepthM?: number;
  avgDepthM?: number;
  shape?: PoolShape;
  /** Total volume; may be computed or manually overridden */
  volumeM3?: number;
  volumeManualOverride?: boolean;

  equipment?: PoolEquipment;
  history?: PoolHistoryFields;

  /** Denormalized from last visit for dashboards */
  healthStatus?: PoolHealthStatus;
  lastVisitAt?: string;
  lastVisitTechnicianName?: string;
  lastMeasurement?: PoolChemistryInput;
  nextRecommendedMaintenance?: string;
}

export interface PoolChemistryInput {
  ph?: number;
  freeChlorinePpm?: number;
  totalChlorinePpm?: number;
  totalAlkalinityPpm?: number;
  calciumHardnessPpm?: number;
  cyanuricAcidPpm?: number;
  salinityPpm?: number;
  waterTempC?: number;
}

export interface PoolVisualObservations {
  waterClarity?: WaterClarity;
  algaeVisible?: boolean;
  bottomDebris?: boolean;
  filterPressure?: 'normal' | 'high' | 'low' | 'unknown';
  pumpState?: 'ok' | 'noise' | 'leak' | 'off' | 'unknown';
}

export interface PoolVisitRecord {
  id: string;
  poolId: string;
  visitedAt: string;
  technicianId: string;
  technicianName?: string;
  routeId?: string;
  chemistry: PoolChemistryInput;
  visual: PoolVisualObservations;
  technicianNotes?: string;
  appliedTreatment?: string;
  photoUrls?: string[];
  recommendations?: PoolRecommendationItem[];
  healthStatus?: PoolHealthStatus;
}

export interface PoolRecommendationItem {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  titleKey: string;
  titleDefault: string;
  bodyKey?: string;
  bodyDefault?: string;
  dose?: {
    amount: number;
    unit: 'g' | 'ml' | 'L';
    productKey: string;
    productDefault: string;
  };
  stepsKeys?: string[];
  stepsDefaults?: string[];
  safetyKeys?: string[];
  safetyDefaults?: string[];
}
