import { useEffect, useState } from 'react';
import {
  subscribeIssueIncidents,
  subscribePoolNames,
  subscribeWorkerNames,
} from '../repositories/incidentsRepositoryFirestore';
import type { ServiceIncidentLog } from '../types';

export function useIncidentsPageData(enabled: boolean, filterDate: string, companyId: string | undefined) {
  const [incidents, setIncidents] = useState<ServiceIncidentLog[]>([]);
  const [pools, setPools] = useState<Record<string, string>>({});
  const [workers, setWorkers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !companyId) {
      setLoading(false);
      return;
    }

    const unsubPools = subscribePoolNames(companyId, setPools);
    const unsubWorkers = subscribeWorkerNames(companyId, setWorkers);
    const unsubLogs = subscribeIssueIncidents(
      companyId,
      filterDate,
      (rows) => {
        setIncidents(rows);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching incidents:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubPools();
      unsubWorkers();
      unsubLogs();
    };
  }, [enabled, filterDate, companyId]);

  return { incidents, pools, workers, loading };
}
