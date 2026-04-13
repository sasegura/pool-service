import { useEffect, useState } from 'react';
import {
  subscribeIssueIncidents,
  subscribePoolNames,
  subscribeWorkerNames,
} from '../repositories/incidentsRepositoryFirestore';
import type { ServiceIncidentLog } from '../types';

export function useIncidentsPageData(enabled: boolean, filterDate: string) {
  const [incidents, setIncidents] = useState<ServiceIncidentLog[]>([]);
  const [pools, setPools] = useState<Record<string, string>>({});
  const [workers, setWorkers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const unsubPools = subscribePoolNames(setPools);
    const unsubWorkers = subscribeWorkerNames(setWorkers);
    const unsubLogs = subscribeIssueIncidents(
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
  }, [enabled, filterDate]);

  return { incidents, pools, workers, loading };
}
