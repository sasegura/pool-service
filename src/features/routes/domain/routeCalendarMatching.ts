import { differenceInCalendarDays, getDay, parseISO } from 'date-fns';

/** Subset of route fields needed to know if it applies on a calendar day (yyyy-MM-dd). */
export type RouteCalendarMatchFields = {
  date?: string;
  startDate?: string;
  endDate?: string | null;
  recurrence?: 'none' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | string;
  daysOfWeek?: number[];
};

/**
 * True if this route definition or dated instance should appear on `dateStr` (local calendar day).
 * Matches planning logic used in RoutesPage weekly grid.
 */
export function routeMatchesCalendarDay(route: RouteCalendarMatchFields, dateStr: string): boolean {
  if (route.date) return route.date === dateStr;
  if (!route.startDate) return false;

  const current = parseISO(dateStr);
  const start = parseISO(route.startDate);
  if (Number.isNaN(current.getTime()) || Number.isNaN(start.getTime())) return false;
  if (current < start) return false;

  if (route.endDate) {
    const end = parseISO(route.endDate);
    if (Number.isNaN(end.getTime())) return false;
    if (current > end) return false;
  }

  const dow = getDay(current);
  const allowedDays = route.daysOfWeek || [];
  const matchesDay = allowedDays.length === 0 || allowedDays.includes(dow);

  switch (route.recurrence) {
    case 'daily':
      return true;
    case 'weekly':
      return matchesDay;
    case 'bi-weekly':
      return matchesDay && Math.floor(differenceInCalendarDays(current, start) / 7) % 2 === 0;
    case 'monthly':
      return current.getDate() === start.getDate();
    case 'none':
    default:
      return matchesDay;
  }
}
