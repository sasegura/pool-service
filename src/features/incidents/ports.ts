import type { Unsubscribe } from 'firebase/firestore';
import type { ServiceIncidentLog } from './types';

export interface IncidentsRepository {
  subscribePoolNames(
    onNext: (map: Record<string, string>) => void,
    onError?: (e: unknown) => void
  ): Unsubscribe;
  subscribeWorkerNames(
    onNext: (map: Record<string, string>) => void,
    onError?: (e: unknown) => void
  ): Unsubscribe;
  subscribeIssueIncidents(
    filterDate: string,
    onNext: (incidents: ServiceIncidentLog[]) => void,
    onError?: (e: unknown) => void
  ): Unsubscribe;
}
