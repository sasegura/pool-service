import type { RoutesDirectoryRepository } from '../ports';

export function subscribeRoutesDirectory(
  repository: RoutesDirectoryRepository,
  handlers: {
    onPools: Parameters<RoutesDirectoryRepository['subscribePools']>[0];
    onWorkers: Parameters<RoutesDirectoryRepository['subscribeWorkers']>[0];
    onRoutes: Parameters<RoutesDirectoryRepository['subscribeRoutes']>[0];
    onError?: (e: unknown) => void;
  }
) {
  const unsubPools = repository.subscribePools(handlers.onPools, handlers.onError);
  const unsubWorkers = repository.subscribeWorkers(handlers.onWorkers, handlers.onError);
  const unsubRoutes = repository.subscribeRoutes(handlers.onRoutes, handlers.onError);

  return () => {
    unsubPools();
    unsubWorkers();
    unsubRoutes();
  };
}
