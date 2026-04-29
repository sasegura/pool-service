import { useEffect, useState } from 'react';
import { useAppServices } from '../../../app/providers/AppServicesContext';
import type { RouteDocument, RoutesPool, RoutesWorker } from '../types';
import { subscribeRoutesDirectory } from '../application/subscribeRoutesDirectory';

export function useRoutesDirectory(enabled: boolean, companyId: string | undefined) {
  void companyId;
  const [pools, setPools] = useState<RoutesPool[]>([]);
  const [workers, setWorkers] = useState<RoutesWorker[]>([]);
  const [routes, setRoutes] = useState<RouteDocument[]>([]);
  const { routesRepository } = useAppServices();

  useEffect(() => {
    if (!enabled || !routesRepository) return;
    return subscribeRoutesDirectory(routesRepository, {
      onPools: setPools,
      onWorkers: setWorkers,
      onRoutes: setRoutes,
    });
  }, [enabled, routesRepository]);

  return { pools, workers, routes };
}
