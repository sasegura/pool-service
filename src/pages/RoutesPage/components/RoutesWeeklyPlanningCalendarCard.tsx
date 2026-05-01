import React from 'react';
import { Button, Card } from '../../../components/ui/Common';
import { cn } from '../../../lib/utils';
import { CalendarRange } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { RouteDocument as Route, RoutesWorker as Worker } from '../../../features/routes/types';
import { SHOW_CALENDAR_WEEK_STEPPER } from './routesPageConstants';

type DayColumn = { dateStr: string; label: string; routes: Route[] };

type RoutesWeeklyPlanningCalendarCardProps = {
  planningSelectedDate: string;
  onPlanningSelectedDateChange: (v: string) => void;
  weeklyPlanningDays: DayColumn[];
  workers: Worker[];
  onToggleSelectedRoute: (routeId: string) => void;
};

export function RoutesWeeklyPlanningCalendarCard({
  planningSelectedDate,
  onPlanningSelectedDateChange,
  weeklyPlanningDays,
  workers,
  onToggleSelectedRoute,
}: RoutesWeeklyPlanningCalendarCardProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6">
      <Card className="p-5 border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <CalendarRange className="w-5 h-5 text-indigo-600" />
            {t('routesPage.weeklyCalendarTitle')}
          </div>
          {SHOW_CALENDAR_WEEK_STEPPER && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = parseISO(planningSelectedDate);
                  if (!Number.isNaN(d.getTime())) {
                    onPlanningSelectedDateChange(format(addDays(d, -7), 'yyyy-MM-dd'));
                  }
                }}
              >
                {t('routesPage.weekMinus')}
              </Button>
              <input
                type="date"
                className="rounded-lg border-slate-200 p-2 text-sm font-bold text-slate-800"
                value={planningSelectedDate}
                onChange={(e) => onPlanningSelectedDateChange(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = parseISO(planningSelectedDate);
                  if (!Number.isNaN(d.getTime())) {
                    onPlanningSelectedDateChange(format(addDays(d, 7), 'yyyy-MM-dd'));
                  }
                }}
              >
                {t('routesPage.weekPlus')}
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">{t('routesPage.weeklyCalendarHelp')}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
          {weeklyPlanningDays.map((day) => (
            <div
              key={day.dateStr}
              className={cn(
                'rounded-xl border p-2 space-y-1 cursor-pointer',
                day.dateStr === planningSelectedDate
                  ? 'border-indigo-400 bg-indigo-50/40'
                  : 'border-slate-200 bg-white'
              )}
              role="button"
              tabIndex={0}
              onClick={() => onPlanningSelectedDateChange(day.dateStr)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPlanningSelectedDateChange(day.dateStr);
                }
              }}
            >
              <button type="button" className="text-left w-full min-w-0" onClick={() => onPlanningSelectedDateChange(day.dateStr)}>
                <div className="text-[10px] font-black uppercase text-slate-500 truncate leading-tight">{day.label}</div>
              </button>
              <div className="space-y-1">
                {day.routes.length === 0 ? (
                  <p className="text-[10px] text-slate-400">{t('routesPage.noRoutesThatDay')}</p>
                ) : (
                  day.routes.map((r) => {
                    const worker = workers.find((w) => w.id === r.workerId);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onToggleSelectedRoute(r.id)}
                        className="w-full rounded bg-slate-100 px-1.5 py-1 text-left hover:bg-slate-200"
                      >
                        <div className="text-[10px] font-bold text-slate-700 truncate">
                          {r.routeName || worker?.name || t('routesPage.routeFallback')}
                        </div>
                        <div className="text-[9px] text-slate-500 truncate">
                          {worker?.name || t('routesPage.noTechnician')}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
