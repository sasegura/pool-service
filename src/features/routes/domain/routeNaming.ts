import {
  format,
  parseISO,
  setDay,
} from 'date-fns';
import type { Locale } from 'date-fns';
import type { RouteDocument } from '../types';

/**
 * Nombre obligatorio: si viene vacío, se usa el día de la semana en inglés según la fecha de la ruta.
 */
export function resolveRouteNameForSave(
  trimmedName: string,
  isScheduled: boolean,
  recurrence: RouteDocument['recurrence'] | undefined,
  daysOfWeek: number[] | undefined,
  dateStr: string | undefined,
  startDateStr: string | undefined,
  dateLocale: Locale
): string {
  if (trimmedName) return trimmedName;
  if (isScheduled && recurrence === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
    const d = setDay(new Date(), daysOfWeek[0], { weekStartsOn: 0 });
    return format(d, 'EEEE', { locale: dateLocale });
  }
  const anchor = isScheduled ? startDateStr : dateStr;
  if (anchor) {
    const d = parseISO(anchor);
    if (!Number.isNaN(d.getTime())) {
      return format(d, 'EEEE', { locale: dateLocale });
    }
  }
  return format(new Date(), 'EEEE', { locale: dateLocale });
}
