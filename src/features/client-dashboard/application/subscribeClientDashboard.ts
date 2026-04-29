import type { ClientDashboardRepository } from '../ports';
import type { ClientDashboardLog, ClientDashboardPool } from '../ports';

export function subscribeClientDashboard(
  repository: ClientDashboardRepository,
  userUid: string,
  handlers: {
    onWorkers: (workers: Record<string, string>) => void;
    onPoolsAndLogs: (input: { pools: ClientDashboardPool[]; logs: ClientDashboardLog[] }) => void;
    onError?: (e: unknown) => void;
  }
) {
  const unsubWorkers = repository.subscribeWorkers(handlers.onWorkers, handlers.onError);
  const unsubPoolsLogs = repository.subscribePoolsAndLogs(userUid, handlers.onPoolsAndLogs, handlers.onError);
  return () => {
    unsubWorkers();
    unsubPoolsLogs();
  };
}
