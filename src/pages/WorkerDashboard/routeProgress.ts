import type { PersistedRouteProgress, WorkerRoute } from './types';

export const statusRank: Record<WorkerRoute['status'], number> = {
  pending: 0,
  'in-progress': 1,
  completed: 2,
};

const getRouteProgressKey = (routeId: string) => `worker:route-progress:${routeId}`;

export const getRouteProgressKeys = (route: Pick<WorkerRoute, 'id' | 'templateId'>) => {
  const keys = [getRouteProgressKey(route.id)];
  if (route.templateId) keys.push(getRouteProgressKey(route.templateId));
  return keys;
};

export const loadPersistedRouteProgress = (route: Pick<WorkerRoute, 'id' | 'templateId'>): PersistedRouteProgress | null => {
  const keys = getRouteProgressKeys(route);
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      return JSON.parse(raw) as PersistedRouteProgress;
    } catch {
      // ignore invalid storage entry and continue
    }
  }
  return null;
};

export const persistRouteProgress = (route: Pick<WorkerRoute, 'id' | 'templateId' | 'status' | 'completedPools'>) => {
  try {
    const payload: PersistedRouteProgress = {
      status: route.status,
      completedPools: route.completedPools || [],
    };
    getRouteProgressKeys(route).forEach((key) => {
      localStorage.setItem(key, JSON.stringify(payload));
    });
  } catch {
    // no-op: localStorage can fail in private mode or restricted environments
  }
};

export const mergeRouteStatus = (
  remoteStatus?: WorkerRoute['status'],
  localStatus?: WorkerRoute['status']
): WorkerRoute['status'] => {
  const candidates = [remoteStatus, localStatus].filter(Boolean) as WorkerRoute['status'][];
  if (candidates.length === 0) return 'pending';
  return candidates.reduce((best, current) => (statusRank[current] > statusRank[best] ? current : best));
};

export const normalizeRouteStatusByProgress = (
  status: WorkerRoute['status'],
  completedCount: number,
  totalCount: number
): WorkerRoute['status'] => {
  if (totalCount <= 0) return status;
  if (completedCount >= totalCount) return 'completed';
  if (completedCount === 0 && status === 'completed') return 'pending';
  if (completedCount > 0 && status === 'pending') return 'in-progress';
  return status;
};

export const hydrateRouteProgress = (route: WorkerRoute): WorkerRoute => {
  const persisted = loadPersistedRouteProgress(route);
  const mergedCompletedPools = Array.from(
    new Set([...(route.completedPools || []), ...(persisted?.completedPools || [])])
  );
  const mergedStatus = mergeRouteStatus(route.status, persisted?.status);
  const normalizedStatus = normalizeRouteStatusByProgress(mergedStatus, mergedCompletedPools.length, route.poolIds.length);
  return {
    ...route,
    status: normalizedStatus,
    completedPools: mergedCompletedPools,
  };
};
