import { format } from 'date-fns';
import type { WorkerRoute } from './types';

export type RouteForLogMatch = {
  id: string;
  poolIds: string[];
  templateId?: string;
  date?: string;
  workerId?: string;
  isVirtual?: boolean;
};

export type WorkerServiceLog = {
  poolId?: string;
  routeId?: string;
  templateId?: string;
  workerId?: string;
  date?: unknown;
};

const normId = (value?: string | null) => (value || '').trim().toLowerCase();

/** Normalize log `date` (string yyyy-MM-dd or Firestore Timestamp) to yyyy-MM-dd */
export function logEntryDateYmd(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 10);
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    try {
      return format((value as { toDate: () => Date }).toDate(), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  }
  return '';
}

function logMatchesRoute(log: WorkerServiceLog, route: RouteForLogMatch): boolean {
  const rid = typeof log.routeId === 'string' ? log.routeId : '';
  if (rid) return rid === route.id;

  const tid = typeof log.templateId === 'string' ? log.templateId : '';
  if (tid) {
    if (route.templateId) return tid === route.templateId;
    return tid === route.id;
  }

  return false;
}

/**
 * Pool IDs with a service log for `calendarToday` that belongs to this route.
 * Legacy logs (no routeId/templateId): match when `legacyWorkerId` equals log.workerId (técnico en app o ruta en admin).
 */
export function completedPoolIdsFromLogsForRoute(
  logs: WorkerServiceLog[],
  route: RouteForLogMatch,
  calendarToday: string,
  legacyWorkerId: string | undefined
): string[] {
  const poolSet = new Set(route.poolIds);
  const done = new Set<string>();
  const uid = normId(legacyWorkerId);

  const routeServesToday =
    route.isVirtual || (route.date || '').trim() === calendarToday || !route.date;

  for (const log of logs) {
    if (logEntryDateYmd(log.date) !== calendarToday) continue;
    const pid = typeof log.poolId === 'string' ? log.poolId : '';
    if (!pid || !poolSet.has(pid)) continue;

    if (logMatchesRoute(log, route)) {
      done.add(pid);
      continue;
    }

    if (!log.routeId && !log.templateId && uid && normId(log.workerId) === uid && routeServesToday) {
      done.add(pid);
    }
  }

  return Array.from(done);
}

/** Logs de `calendarToday` + `completedPools` del documento cuando la ruta aplica a ese día (misma regla que el detalle de ruta). */
export function completedPoolIdsForRouteToday(
  logs: WorkerServiceLog[],
  route: WorkerRoute,
  calendarToday: string,
  authUid: string | undefined
): string[] {
  const fromLogs = completedPoolIdsFromLogsForRoute(logs, route, calendarToday, authUid);
  const mergedSet = new Set(fromLogs);
  if (route.isVirtual || (route.date || '') === calendarToday) {
    (route.completedPools || []).forEach((id) => {
      if (route.poolIds.includes(id)) mergedSet.add(id);
    });
  }
  return Array.from(mergedSet);
}

/** Vista admin: progreso del día `calendarDay` según logs + documento solo si `route.date` es ese día. */
export function completedPoolIdsForAdminRouteOnDate(
  logs: WorkerServiceLog[],
  route: {
    id: string;
    templateId?: string;
    poolIds: string[];
    completedPools?: string[];
    date?: string;
    workerId?: string;
  },
  calendarDay: string
): string[] {
  const routeLike: RouteForLogMatch = {
    id: route.id,
    poolIds: route.poolIds,
    templateId: route.templateId,
    date: route.date,
    workerId: route.workerId,
  };
  const fromLogs = completedPoolIdsFromLogsForRoute(logs, routeLike, calendarDay, route.workerId);
  const mergedSet = new Set(fromLogs);
  if ((route.date || '') === calendarDay) {
    (route.completedPools || []).forEach((id) => {
      if (route.poolIds.includes(id)) mergedSet.add(id);
    });
  }
  return Array.from(mergedSet);
}
