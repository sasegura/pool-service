import React from 'react';
import { Card } from '../../../components/ui/Common';
import { cn } from '../../../lib/utils';
import { Calendar, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RouteDocument as Route, RoutesPool as Pool, RoutesWorker as Worker } from '../../../features/routes/types';

type RoutesRecurringDefinitionsSectionProps = {
  routes: Route[];
  workers: Worker[];
  pools: Pool[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string | null) => void;
  recurrenceLabel: (r?: string) => string;
  onEdit: (route: Route) => void;
  onDelete: (id: string, routeName?: string) => void;
};

export function RoutesRecurringDefinitionsSection({
  routes,
  workers,
  pools,
  selectedRouteId,
  onSelectRoute,
  recurrenceLabel,
  onEdit,
  onDelete,
}: RoutesRecurringDefinitionsSectionProps) {
  const { t } = useTranslation();

  if (routes.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('routesPage.fullListTitle')}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {routes.map((route) => {
          const worker = workers.find((w) => w.id === route.workerId);
          const isSelected = selectedRouteId === route.id;
          const routePools = route.poolIds
            .map((poolId) => pools.find((p) => p.id === poolId))
            .filter(Boolean) as Pool[];
          return (
            <Card
              key={route.id}
              className={cn(
                'p-4 transition-all cursor-pointer border-blue-100',
                isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'hover:border-blue-300'
              )}
              onClick={() => onSelectRoute(isSelected ? null : route.id)}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn('p-2 rounded-lg shrink-0', isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600')}
                  >
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900">{route.routeName || t('routesPage.recurrenceFallback')}</h4>
                    <p className="text-xs text-slate-500">
                      {route.startDate
                        ? `${route.startDate}${
                            route.endDate
                              ? ` ${t('routesPage.rangeArrow')} ${route.endDate}`
                              : ` · ${t('routesPage.noEndDate')}`
                          }`
                        : route.date || t('routesPage.noDate')}{' '}
                      · {recurrenceLabel(route.recurrence)} · {worker?.name || t('routesPage.noTechnician')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {routePools.length === 0 ? (
                        <span className="text-[11px] text-slate-400">{t('routesPage.noPoolsAssigned')}</span>
                      ) : (
                        routePools.map((pool, poolIndex) => (
                          <span
                            key={`${route.id}-${pool.id}`}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                          >
                            #{poolIndex + 1} {pool.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onEdit(route)}
                    className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(route.id, route.routeName)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
