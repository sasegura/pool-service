export interface ServiceIncidentLog {
  id: string;
  poolId: string;
  workerId: string;
  notes: string;
  status: string;
  date: string;
  arrivalTime?: { toMillis?: () => number; toDate: () => Date };
}
