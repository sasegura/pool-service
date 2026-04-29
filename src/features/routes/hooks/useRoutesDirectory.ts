import { useEffect, useState } from 'react';
import type { RouteDocument, RoutesPool, RoutesWorker } from '../types';
import { subscribeRoutesDirectory } from '../application/subscribeRoutesDirectory';
import { createRoutesDirectoryRepositoryFirestore } from '../repositories/routesDirectoryRepositoryFirestore';

export function useRoutesDirectory(enabled: boolean, companyId: string | undefined) {
  const [pools, setPools] = useState<RoutesPool[]>([]);
  const [workers, setWorkers] = useState<RoutesWorker[]>([]);
  const [routes, setRoutes] = useState<RouteDocument[]>([]);

  useEffect(() => {
    if (!enabled || !companyId) return;

    const repository = createRoutesDirectoryRepositoryFirestore(companyId);
    return subscribeRoutesDirectory(repository, {
      onPools: setPools,
      onWorkers: setWorkers,
      onRoutes: setRoutes,
    });
  }, [enabled, companyId]);

  return { pools, workers, routes };
}
