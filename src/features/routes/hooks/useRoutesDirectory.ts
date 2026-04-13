import { useEffect, useState } from 'react';
import type { RouteDocument, RoutesPool, RoutesWorker } from '../types';
import {
  subscribeAllRoutesDocuments,
  subscribeRoutesPools,
  subscribeRoutesWorkers,
} from '../repositories/routesDirectoryRepositoryFirestore';

export function useRoutesDirectory(enabled: boolean, companyId: string | undefined) {
  const [pools, setPools] = useState<RoutesPool[]>([]);
  const [workers, setWorkers] = useState<RoutesWorker[]>([]);
  const [routes, setRoutes] = useState<RouteDocument[]>([]);

  useEffect(() => {
    if (!enabled || !companyId) return;

    const unsubPools = subscribeRoutesPools(companyId, setPools);
    const unsubUsers = subscribeRoutesWorkers(companyId, setWorkers);
    const unsubRoutes = subscribeAllRoutesDocuments(companyId, setRoutes);

    return () => {
      unsubPools();
      unsubUsers();
      unsubRoutes();
    };
  }, [enabled, companyId]);

  return { pools, workers, routes };
}
