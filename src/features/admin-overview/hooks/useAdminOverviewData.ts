import { useEffect, useState } from 'react';
import { useAppServices } from '../../../app/providers/AppServicesContext';
import { subscribeAdminOverviewData } from '../application/subscribeAdminOverviewData';
export type { AdminOverviewRoute, AdminOverviewWorkerUser } from '../ports';
import type { AdminOverviewRoute, AdminOverviewWorkerUser } from '../ports';

export function useAdminOverviewData(selectedDate: string, enabled: boolean, companyId: string | undefined) {
  void companyId;
  const { adminOverviewRepository } = useAppServices();
  const [poolsCount, setPoolsCount] = useState(0);
  const [workersCount, setWorkersCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [incidentsCount, setIncidentsCount] = useState(0);
  const [routes, setRoutes] = useState<AdminOverviewRoute[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [allWorkers, setAllWorkers] = useState<AdminOverviewWorkerUser[]>([]);
  const [pools, setPools] = useState<Record<string, string>>({});
  const [liveWorkers, setLiveWorkers] = useState<AdminOverviewWorkerUser[]>([]);
  const [logsForSelectedDate, setLogsForSelectedDate] = useState<Array<Record<string, unknown> & { id: string }>>([]);

  useEffect(() => {
    if (!enabled || !adminOverviewRepository) return;
    return subscribeAdminOverviewData(adminOverviewRepository, selectedDate, {
      onPools: (input) => {
        setPoolsCount(input.count);
        setPools(input.map);
      },
      onMembers: (input) => {
        setUsers(input.users);
        setAllWorkers(input.workers);
        setWorkersCount(input.workers.length);
        setLiveWorkers(input.workers.filter((w) => w.lastLocation));
      },
      onRoutes: (routeDocs) => {
        setRoutes(routeDocs);
        setCompletedCount(routeDocs.filter((d) => d.status === 'completed').length);
      },
      onLogs: setLogsForSelectedDate,
      onIncidentsCount: setIncidentsCount,
      onError: () => undefined,
    });
  }, [selectedDate, enabled, adminOverviewRepository]);

  return {
    poolsCount,
    workersCount,
    completedCount,
    incidentsCount,
    routes,
    users,
    allWorkers,
    pools,
    liveWorkers,
    logsForSelectedDate,
  };
}
