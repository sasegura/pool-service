import { format, parseISO, getDay, addDays, startOfDay } from 'date-fns';
import type { WorkerRoute } from './types';

const startOfIsoDay = (value: string) => startOfDay(parseISO(value));

export const isRouteActiveToday = (route: WorkerRoute, dateStr: string) => {
  const targetDate = startOfDay(parseISO(dateStr));
  const dayOfWeek = getDay(targetDate);

  if (route.date === dateStr) return true;

  if (route.assignedDay !== undefined && route.assignedDay === dayOfWeek) {
    return true;
  }

  if (route.startDate) {
    const start = startOfDay(parseISO(route.startDate));
    if (Number.isNaN(start.getTime())) return false;
    if (targetDate < start) return false;

    if (route.endDate) {
      const end = startOfDay(parseISO(route.endDate));
      if (Number.isNaN(end.getTime())) return false;
      if (targetDate > end) return false;
    }

    if (!route.recurrence || route.recurrence === 'none') return true;

    if (route.recurrence === 'daily') return true;

    if (route.recurrence === 'weekly' && route.daysOfWeek) {
      return route.daysOfWeek.includes(dayOfWeek);
    }

    if (route.recurrence === 'bi-weekly') {
      const diffDays = Math.floor((targetDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % 14 === 0;
    }

    if (route.recurrence === 'monthly') {
      return targetDate.getDate() === start.getDate();
    }
  }

  return false;
};

export const nextOccurrenceDate = (route: WorkerRoute): string | null => {
  const today = startOfDay(new Date());
  if (route.date) {
    const d = startOfIsoDay(route.date);
    return d >= today ? format(d, 'yyyy-MM-dd') : null;
  }
  if (!route.startDate) return null;
  if (!route.recurrence || route.recurrence === 'none') {
    const d = startOfIsoDay(route.startDate);
    return d >= today ? format(d, 'yyyy-MM-dd') : null;
  }

  for (let i = 0; i < 120; i++) {
    const candidate = addDays(today, i);
    const dateStr = format(candidate, 'yyyy-MM-dd');
    if (isRouteActiveToday(route, dateStr)) return dateStr;
  }
  return null;
};
