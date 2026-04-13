import { format } from 'date-fns';
import type { RouteDocument } from '../types';

export function defaultNewRouteForm() {
  const today = format(new Date(), 'yyyy-MM-dd');
  return {
    workerId: '',
    date: today,
    startDate: today,
    endDate: '' as string,
    hasEndDate: false,
    recurrence: 'weekly' as 'none' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly',
    daysOfWeek: [] as number[],
    poolIds: [] as string[],
    routeName: '',
    noWorker: false,
    isScheduled: true,
  };
}

export function isDatedRoute(r: RouteDocument) {
  return !!r.date;
}

export function isLegacyUndated(r: RouteDocument) {
  return !r.date && !r.startDate;
}
