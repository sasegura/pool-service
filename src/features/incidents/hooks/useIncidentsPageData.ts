import { useEffect, useMemo, useState } from 'react';
import { subscribeIncidentsPageData } from '../application/incidentsPageService';
import { createIncidentsRepositoryFirestore } from '../repositories/incidentsRepositoryFirestore';
import type { ServiceIncidentLog } from '../types';

export function useIncidentsPageData(enabled: boolean, filterDate: string, companyId: string | undefined) {
  const [incidents, setIncidents] = useState<ServiceIncidentLog[]>([]);
  const [pools, setPools] = useState<Record<string, string>>({});
  const [workers, setWorkers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const repository = useMemo(
    () => (companyId ? createIncidentsRepositoryFirestore(companyId) : null),
    [companyId]
  );

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
