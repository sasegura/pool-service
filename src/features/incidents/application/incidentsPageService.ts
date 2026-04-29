import type { IncidentsRepository } from '../ports';

export function subscribeIncidentsPageData(
  repository: IncidentsRepository,
  filterDate: string,
  handlers: {
    onPools: (map: Record<string, string>) => void;
    onWorkers: (map: Record<string, string>) => void;
    onIncidents: Parameters<IncidentsRepository['subscribeIssueIncidents']>[1];
    onError?: (e: unknown) => void;
  }
) {
  const unsubPools = repository.subscribePoolNames(handlers.onPools, handlers.onError);
  const unsubWorkers = repository.subscribeWorkerNames(handlers.onWorkers, handlers.onError);
  const unsubIncidents = repository.subscribeIssueIncidents(
    filterDate,
    handlers.onIncidents,
    handlers.onError
  );

  return () => {
    unsubPools();
    unsubWorkers();
    unsubIncidents();
  };
}
