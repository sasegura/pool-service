import { format } from 'date-fns';
import { Clock, Map as MapIcon } from 'lucide-react';
import type { TFunction } from 'i18next';
import { Button, Card } from '../../../components/ui/Common';
import type { WorkerRoute } from '../types';

type Props = {
  t: TFunction;
  availableRoutes: WorkerRoute[];
  assignedTodayRoutes: WorkerRoute[];
  /** Paradas completadas en la fecha de hoy (logs + progreso del día) */
  todayDoneCountForRoute: (route: WorkerRoute) => number;
  hasOtherRoutes: boolean;
  showAllRoutes: boolean;
  onToggleShowAllRoutes: () => void;
  allMyRoutes: WorkerRoute[];
  companyName: string;
  userLabel: string;
  onPickRoute: (routeId: string) => void;
  onSelectAssignedRoute: (route: WorkerRoute) => void;
  routeTimingSubtitle: (route: WorkerRoute) => string;
};

export function RouteSelectionView({
  t,
  availableRoutes,
  assignedTodayRoutes,
  todayDoneCountForRoute,
  hasOtherRoutes,
  showAllRoutes,
  onToggleShowAllRoutes,
  allMyRoutes,
  companyName,
  userLabel,
  onPickRoute,
  onSelectAssignedRoute,
  routeTimingSubtitle,
}: Props) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black text-slate-900">{t('worker.myShift')}</h2>
        <p className="text-slate-500">{t('worker.pickRouteTitle')}</p>
      </header>

      {availableRoutes.length > 0 ? (
        <div className="grid gap-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('worker.availableRoutes')}</h3>
          {availableRoutes.map((route) => (
            <Card key={route.id} className="p-5 hover:border-blue-300 transition-all group">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <MapIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{route.routeName || t('worker.unnamedRoute')}</h4>
                    <p className="text-sm text-slate-500">{t('worker.poolsInRoute', { count: route.poolIds.length })}</p>
                    <p className="text-xs font-bold text-blue-700">
                      {t('worker.routeProgress', {
                        done: todayDoneCountForRoute(route),
                        total: route.poolIds.length,
                      })}
                    </p>
                  </div>
                </div>
                <Button onClick={() => onPickRoute(route.id)} className="gap-2">
                  {t('worker.chooseRoute')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-slate-100 p-6 rounded-full mb-6">
            <Clock className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {assignedTodayRoutes.length > 0 ? t('worker.availableRoutes') : t('worker.noRouteToday')}
          </h2>
          {assignedTodayRoutes.length > 0 ? (
            <div className="space-y-2 w-full max-w-md text-left">
              {assignedTodayRoutes.map((r) => {
                const doneToday = todayDoneCountForRoute(r);
                const totalPools = r.poolIds.length;
                const allDoneToday = totalPools > 0 && doneToday >= totalPools;
                const ctaLabel =
                  doneToday === 0
                    ? t('worker.startRoute')
                    : allDoneToday && r.status === 'completed'
                      ? t('worker.retakeRoute')
                      : t('worker.continueDay');
                return (
                  <div key={r.id} className="p-3 bg-white border rounded-lg text-sm flex justify-between items-center shadow-sm">
                    <div>
                      <div className="font-bold text-slate-900">{r.routeName || t('worker.routeFallback')}</div>
                      <div className="text-xs text-slate-500">
                        {r.date || r.startDate || t('worker.noDate')} •{' '}
                        {t('worker.routeProgress', {
                          done: doneToday,
                          total: totalPools,
                        })}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => onSelectAssignedRoute(r)} className="h-8 px-3 text-xs">
                      {ctaLabel}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : hasOtherRoutes ? (
            <div className="space-y-4 w-full max-w-md">
              <p className="text-slate-500">{t('worker.otherDaysHint', { date: format(new Date(), 'dd/MM/yyyy') })}</p>
              <Button variant="outline" onClick={onToggleShowAllRoutes} className="w-full">
                {showAllRoutes ? t('worker.hideOtherRoutes') : t('worker.showOtherRoutes')}
              </Button>
              {showAllRoutes && (
                <div className="grid gap-2 text-left">
                  {allMyRoutes.map((r) => (
                    <div key={r.id} className="p-3 bg-white border rounded-lg text-sm flex justify-between items-center shadow-sm">
                      <div>
                        <div className="font-bold text-slate-900">{r.routeName || t('worker.routeFallback')}</div>
                        <div className="text-xs text-slate-500">
                          {routeTimingSubtitle(r)} •{' '}
                          {t('worker.routeProgress', {
                            done: r.completedPools?.length || 0,
                            total: r.poolIds.length,
                          })}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => onPickRoute(r.id)} className="h-8 px-3 text-xs">
                        {t('worker.bringToToday')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500">{t('worker.noRoutesAvailable')}</p>
          )}

          <div className="mt-12 p-4 bg-slate-50 rounded-xl border border-slate-200 text-left w-full max-w-md">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('worker.diagnosticsTitle')}</h4>
            <div className="space-y-2 text-[10px] font-mono text-slate-500">
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span>{t('worker.myUid')}</span>
                <span className="text-slate-900 font-bold">{userLabel}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span>{t('worker.todayDate')}</span>
                <span className="text-slate-900 font-bold">{format(new Date(), 'yyyy-MM-dd')}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span>{t('worker.companyName')}</span>
                <span className="text-slate-900 font-bold">{companyName || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span>{t('worker.totalRoutes')}</span>
                <span className="text-slate-900 font-bold">{allMyRoutes.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
