import { useEffect, useMemo, useState } from 'react';
import { useAppServices } from '../../../app/providers/AppServicesContext';
import { subscribeIncidentsPageData } from '../application/incidentsPageService';
import type { ServiceIncidentLog } from '../types';

export function useIncidentsPageData(enabled: boolean, filterDate: string, companyId: string | undefined) {
  void companyId;
  const [incidents, setIncidents] = useState<ServiceIncidentLog[]>([]);
  const [pools, setPools] = useState<Record<string, string>>({});
  const [workers, setWorkers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const { incidentsRepository: repository } = useAppServices();

  useEffect(() => {
    if (!enabled || !repository) {
      setLoading(false);
      return;
    }

    return subscribeIncidentsPageData(
      repository,
      filterDate,
      {
        onPools: setPools,
        onWorkers: setWorkers,
        onIncidents: (rows) => {
          setIncidents(rows);
          setLoading(false);
        },
        onError: (error) => {
          console.error('Error fetching incidents:', error);
          setLoading(false);
        },
      }
    );
  }, [enabled, filterDate, repository]);

  return { incidents, pools, workers, loading };
}
