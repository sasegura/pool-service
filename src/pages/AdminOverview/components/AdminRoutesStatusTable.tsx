import React from 'react';
import { Card } from '../../../components/ui/Common';
import { cn } from '../../../lib/utils';
import { format } from 'date-fns';
import { Clock, CheckCircle, MapPin, Edit2, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  AdminOverviewRoute as Route,
  AdminOverviewWorkerUser as Worker,
} from '../../../features/admin-overview/hooks/useAdminOverviewData';
import {
  completedPoolIdsForAdminRouteOnDate,
  type WorkerServiceLog,
} from '../../WorkerDashboard/completedPoolsFromLogs';

type EditData = { workerId: string; date: string };

type AdminRoutesStatusTableProps = {
  selectedDate: string;
  routes: Route[];
  logsForSelectedDate: Array<Record<string, unknown> & { id: string }>;
  users: Record<string, string>;
  allWorkers: Worker[];
  pools: Record<string, string>;
  editingRouteId: string | null;
  editData: EditData;
  onEditDataChange: (next: EditData) => void;
  onStartEdit: (route: Route) => void;
  onCancelEdit: () => void;
  onSaveEdit: (routeId: string) => void;
};

export function AdminRoutesStatusTable({
  selectedDate,
  routes,
  logsForSelectedDate,
  users,
  allWorkers,
  pools,
  editingRouteId,
  editData,
  onEditDataChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: AdminRoutesStatusTableProps) {
  const { t } = useTranslation();

  return (
    <Card className="w-full min-w-0 overflow-hidden border-slate-200">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{t('admin.routeStatus')}</h3>
          <p className="text-xs text-slate-500">
            {selectedDate === format(new Date(), 'yyyy-MM-dd')
              ? t('admin.routesLiveToday')
              : t('admin.routesHistoryForDay', {
                  date: format(new Date(selectedDate + 'T00:00:00'), 'dd/MM/yyyy'),
                })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {t('admin.live')}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-100">
              <th className="px-6 py-3">{t('common.worker')}</th>
              <th className="px-6 py-3">{t('admin.schedule')}</th>
              <th className="px-6 py-3">{t('admin.lastStop')}</th>
              <th className="px-6 py-3">{t('admin.progress')}</th>
              <th className="px-6 py-3">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {routes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                  {t('admin.noRoutesForDay', { date: format(new Date(selectedDate + 'T00:00:00'), 'dd/MM/yyyy') })}
                </td>
              </tr>
            ) : (
              routes.map((route) => {
                const doneForDay = completedPoolIdsForAdminRouteOnDate(
                  logsForSelectedDate as WorkerServiceLog[],
                  route,
                  selectedDate
                ).length;
                const totalPools = route.poolIds.length;
                const progress = totalPools > 0 ? Math.round((doneForDay / totalPools) * 100) : 0;
                const isIncident = route.lastStatus === 'issue';
                const isEditing = editingRouteId === route.id;

                return (
                  <tr key={route.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          className="text-sm rounded-lg border-slate-200 p-1 w-full"
                          value={editData.workerId}
                          onChange={(e) => onEditDataChange({ ...editData, workerId: e.target.value })}
                        >
                          {allWorkers.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {users[route.workerId]?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm font-bold text-slate-700">
                            {users[route.workerId] || t('admin.loading')}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="date"
                          className="text-sm rounded-lg border-slate-200 p-1 w-full"
                          value={editData.date}
                          onChange={(e) => onEditDataChange({ ...editData, date: e.target.value })}
                        />
                      ) : (
                        <div className="flex flex-col text-[11px] font-mono text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{' '}
                            {route.startTime ? format(new Date(route.startTime), 'HH:mm') : '--:--'}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />{' '}
                            {route.endTime ? format(new Date(route.endTime), 'HH:mm') : '--:--'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {route.lastPoolId ? (
                          pools[route.lastPoolId]
                        ) : (
                          <span className="text-slate-300 italic">{t('admin.noActivity')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full max-w-[100px]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-slate-900">{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all duration-500',
                              progress === 100 ? 'bg-emerald-500' : isIncident ? 'bg-red-500' : 'bg-blue-500'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'px-2 py-1 rounded text-[10px] font-bold uppercase',
                            route.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : isIncident
                                ? 'bg-red-100 text-red-700'
                                : route.status === 'in-progress'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {isIncident
                            ? t('admin.incidentLabel')
                            : t(`common.${route.status === 'in-progress' ? 'inProgress' : route.status}`)}
                        </span>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => onSaveEdit(route.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={onCancelEdit}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onStartEdit(route)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
