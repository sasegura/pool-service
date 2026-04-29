export type UnsubscribeFn = () => void;

export interface ClientDashboardPool {
  id: string;
  name: string;
  address: string;
  clientId?: string;
}

export interface ClientDashboardLog {
  id: string;
  poolId: string;
  workerId: string;
  arrivalTime: { toMillis?: () => number; toDate?: () => Date };
  status: 'ok' | 'issue';
  notes?: string;
  date: string;
  notifyClient?: boolean;
}

export interface ClientDashboardRepository {
  subscribeWorkers(
    onNext: (workers: Record<string, string>) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
  subscribePoolsAndLogs(
    userUid: string,
    onNext: (input: { pools: ClientDashboardPool[]; logs: ClientDashboardLog[] }) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
}
