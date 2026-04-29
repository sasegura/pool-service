import type { AdminOverviewRepository } from '../ports';
import type { AdminOverviewRoute, AdminOverviewWorkerUser } from '../ports';

export function subscribeAdminOverviewData(
  repository: AdminOverviewRepository,
  selectedDate: string,
  handlers: {
    onPools: (input: { count: number; map: Record<string, string> }) => void;
    onMembers: (input: { users: Record<string, string>; workers: AdminOverviewWorkerUser[] }) => void;
    onRoutes: (routes: AdminOverviewRoute[]) => void;
    onIncidentsCount: (count: number) => void;
    onError?: (e: unknown) => void;
  }
) {
  const unsubPools = repository.subscribePools(handlers.onPools, handlers.onError);
  const unsubMembers = repository.subscribeMembers(handlers.onMembers, handlers.onError);
  const unsubRoutes = repository.subscribeRoutesByDate(selectedDate, handlers.onRoutes, handlers.onError);
  const unsubLogs = repository.subscribeIncidentsCountByDate(
    selectedDate,
    handlers.onIncidentsCount,
    handlers.onError
  );

  return () => {
    unsubPools();
    unsubMembers();
    unsubRoutes();
    unsubLogs();
  };
}
