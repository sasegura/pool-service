import { getDay, parseISO } from 'date-fns';
import type { RouteDocument } from '../../routes/types';

type WorkerDashboardRoute = RouteDocument & {
  startTime?: string;
  endTime?: string;
  completedPools?: string[];
  isVirtual?: boolean;
};

const statusRank: Record<NonNullable<WorkerDashboardRoute['status']>, number> = {
  pending: 0,
  'in-progress': 1,
  completed: 2,
};

const getIsoTime = (value?: string) => {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
};

function isRouteActiveToday(route: WorkerDashboardRoute, dateStr: string) {
  if (route.date) return route.date === dateStr;
  if (route.assignedDay !== undefined && route.startDate) {
    const start = parseISO(route.startDate);
    const targetDate = parseISO(dateStr);
    const dayOfWeek = getDay(targetDate);

    if (route.assignedDay === dayOfWeek) {
      if (!route.recurrence || route.recurrence === 'none') return true;
      if (route.recurrence === 'daily') return true;
      if (route.recurrence === 'weekly' && route.daysOfWeek) return route.daysOfWeek.includes(dayOfWeek);
      if (route.recurrence === 'bi-weekly') {
        const diffDays = Math.floor((targetDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays % 14 === 0;
      }
      if (route.recurrence === 'monthly') return targetDate.getDate() === start.getDate();
    }
  }
  return false;
}

export function resolveWorkerDashboardState(
  allRoutes: WorkerDashboardRoute[],
  today: string,
  isMyWorkerRoute: (workerId?: string | null) => boolean,
  hydrateRouteProgress: (route: WorkerDashboardRoute) => WorkerDashboardRoute
) {
  const allMyRoutes = allRoutes.filter((r) => isMyWorkerRoute(r.workerId));
  const dailyInstances = allRoutes.filter((r) => isMyWorkerRoute(r.workerId) && r.date === today);
  const activeDailyInstances = dailyInstances.filter((r) => r.status !== 'completed');
  const completedDailyInstances = dailyInstances.filter((r) => r.status === 'completed');

  const sortByCurrentPriority = (a: WorkerDashboardRoute, b: WorkerDashboardRoute) => {
    const statusDiff = statusRank[b.status ?? 'pending'] - statusRank[a.status ?? 'pending'];
    if (statusDiff !== 0) return statusDiff;
    const startDiff = getIsoTime(b.startTime) - getIsoTime(a.startTime);
    if (startDiff !== 0) return startDiff;
    return (a.planningPriority ?? 0) - (b.planningPriority ?? 0);
  };

  const sortByCompletedPriority = (a: WorkerDashboardRoute, b: WorkerDashboardRoute) => {
    const completedDiff = (b.completedPools?.length || 0) - (a.completedPools?.length || 0);
    if (completedDiff !== 0) return completedDiff;
    const timeDiff = getIsoTime(b.endTime) - getIsoTime(a.endTime);
    if (timeDiff !== 0) return timeDiff;
    return (a.planningPriority ?? 0) - (b.planningPriority ?? 0);
  };

  const dailyInstance =
    [...activeDailyInstances].sort(sortByCurrentPriority)[0] ||
    [...completedDailyInstances].sort(sortByCompletedPriority)[0];

  const todayRoute = dailyInstance
    ? hydrateRouteProgress(dailyInstance)
    : (() => {
        const assignedRoute = allRoutes.find(
          (r) => isMyWorkerRoute(r.workerId) && isRouteActiveToday(r, today)
        );
        if (!assignedRoute) return null;
        return hydrateRouteProgress({
          ...assignedRoute,
          status: 'pending',
          completedPools: [],
          date: today,
          isVirtual: true,
        } as WorkerDashboardRoute);
      })();

  const dailyByTemplateId = new globalThis.Map<string, WorkerDashboardRoute>();
  dailyInstances.forEach((instance) => {
    const templateId = instance.templateId;
    if (!templateId) return;
    const current = dailyByTemplateId.get(templateId);
    if (!current) {
      dailyByTemplateId.set(templateId, instance);
      return;
    }
    const currentScore = current.completedPools?.length || 0;
    const nextScore = instance.completedPools?.length || 0;
    if (nextScore >= currentScore) dailyByTemplateId.set(templateId, instance);
  });

  const availableRoutes = allRoutes
    .filter((r) => {
      const isTemplate = !r.date && !r.startDate && !r.assignedDay;
      const isUnassignedToday = r.date === today && !r.workerId;
      return (isTemplate || isUnassignedToday) && (!r.workerId || isMyWorkerRoute(r.workerId));
    })
    .map((route) => {
      const linkedDaily = dailyByTemplateId.get(route.id);
      if (!linkedDaily) return hydrateRouteProgress(route);
      const hydratedDaily = hydrateRouteProgress(linkedDaily);
      return {
        ...route,
        status: hydratedDaily.status,
        completedPools: hydratedDaily.completedPools,
      } as WorkerDashboardRoute;
    });

  return {
    allMyRoutes,
    todayRoute,
    availableRoutes,
    hasOtherRoutes: allMyRoutes.length > 0,
  };
}
