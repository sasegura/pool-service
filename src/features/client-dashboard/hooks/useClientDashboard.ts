import { useEffect, useState } from 'react';
import { useAppServices } from '../../../app/providers/AppServicesContext';
import { subscribeClientDashboard } from '../application/subscribeClientDashboard';
export type { ClientDashboardPool, ClientDashboardLog } from '../ports';
import type { ClientDashboardPool, ClientDashboardLog } from '../ports';

export function useClientDashboard(userUid: string | undefined, companyId: string | undefined) {
  void companyId;
  const { clientDashboardRepository } = useAppServices();
  const [pools, setPools] = useState<ClientDashboardPool[]>([]);
  const [logs, setLogs] = useState<ClientDashboardLog[]>([]);
  const [workers, setWorkers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userUid || !clientDashboardRepository) {
      setPools([]);
      setLogs([]);
      setLoading(false);
      return;
    }

    return subscribeClientDashboard(clientDashboardRepository, userUid, {
      onWorkers: setWorkers,
      onPoolsAndLogs: (input) => {
        setPools(input.pools);
        setLogs(input.logs);
        setLoading(false);
      },
      onError: () => setLoading(false),
    });
  }, [userUid, clientDashboardRepository]);

  return { pools, logs, workers, loading };
}
