import type { ServiceIncidentLog } from './types';

export type UnsubscribeFn = () => void;

export interface IncidentsRepository {
  subscribePoolNames(
    onNext: (map: Record<string, string>) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
  subscribeWorkerNames(
    onNext: (map: Record<string, string>) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
  subscribeIssueIncidents(
    filterDate: string,
    onNext: (incidents: ServiceIncidentLog[]) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
}
