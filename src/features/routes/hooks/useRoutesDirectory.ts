import { useEffect, useState } from 'react';
import type { RouteDocument, RoutesPool, RoutesWorker } from '../types';
import {
  subscribeAllRoutesDocuments,
  subscribeRoutesPools,
  subscribeRoutesWorkers,
} from '../repositories/routesDirectoryRepositoryFirestore';

export function useRoutesDirectory(enabled: boolean) {
  const [pools, setPools] = useState<RoutesPool[]>([]);
  const [workers, setWorkers] = useState<RoutesWorker[]>([]);
  const [routes, setRoutes] = useState<RouteDocument[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const unsubPools = subscribeRoutesPools(setPools);
    const unsubUsers = subscribeRoutesWorkers(setWorkers);
    const unsubRoutes = subscribeAllRoutesDocuments(setRoutes);

    return () => {
      unsubPools();
      unsubUsers();
      unsubRoutes();
    };
  }, [enabled]);

  return { pools, workers, routes };
}
