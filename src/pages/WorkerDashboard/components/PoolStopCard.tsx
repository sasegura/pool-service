import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, CheckCircle2, AlertTriangle, Droplets, X } from 'lucide-react';
import { Button, Card } from '../../../components/ui/Common';
import { cn } from '../../../lib/utils';
import { PoolStatusBadge } from '../../../components/PoolStatusBadge';
import type { PoolRecord } from '../../../types/pool';
import type { WorkerRoute } from '../types';

type VisitStatus = 'idle' | 'arrived';

type Props = {
  pool: PoolRecord;
  poolId: string;
  index: number;
  poolNumberLabel: string;
  todayRoute: WorkerRoute;
  isActive: boolean;
  isCompleted: boolean;
  visitStatus: VisitStatus;
  incidenceMode: boolean;
  notes: string;
  notifyClient: boolean;
  onCloseActivePool: () => void;
  closeLabel: string;
  onOpenMaps: (address: string) => void;
  onArrive: (index: number) => void;
  onResumeService: (index: number) => void;
  onFinish: (status: 'ok' | 'issue') => void;
  onSetIncidenceMode: (value: boolean) => void;
  onNotesChange: (value: string) => void;
  onNotifyClientChange: (value: boolean) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

export function PoolStopCard({
  pool,
  poolId,
  index,
  poolNumberLabel,
  todayRoute,
  isActive,
  isCompleted,
  visitStatus,
  incidenceMode,
  notes,
  notifyClient,
  onCloseActivePool,
  closeLabel,
  onOpenMaps,
  onArrive,
  onResumeService,
  onFinish,
  onSetIncidenceMode,
  onNotesChange,
  onNotifyClientChange,
  t,
}: Props) {
  return (
    <Card
      className={cn(
        'transition-all duration-300',
        isActive ? 'ring-2 ring-blue-500 border-transparent' : '',
        isCompleted ? 'opacity-75 bg-slate-50' : ''
      )}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 pr-2">
            <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-1">
              {poolNumberLabel}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{pool.name}</h3>
              <PoolStatusBadge status={pool.healthStatus} size="sm" />
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {pool.address}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActive && visitStatus === 'arrived' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCloseActivePool}
                className="h-10 w-10 p-0 rounded-full"
                aria-label={closeLabel}
              >
                <X className="w-5 h-5 text-slate-600" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onOpenMaps(pool.address)} className="h-10 w-10 p-0 rounded-full">
              <Navigation className="w-5 h-5 text-blue-600" />
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {visitStatus === 'idle' && !isActive && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {isCompleted ? (
                <div className="space-y-2">
                  <div className="w-full h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    {t('worker.serviceCompleted')}
                  </div>
                  <Button type="button" variant="outline" className="w-full h-11 font-bold" onClick={() => onResumeService(index)}>
                    {t('worker.resumeService')}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  className="w-full h-12 text-lg font-bold"
                  onClick={() => onArrive(index)}
                  disabled={todayRoute.status === 'pending' || todayRoute.status === 'completed'}
                >
                  {t('worker.arrived')}
                </Button>
              )}
            </motion.div>
          )}

          {isActive && visitStatus === 'arrived' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
              {!incidenceMode ? (
                <div className="space-y-3">
                  <Link to={`/wateroptions/${poolId}?routeId=${encodeURIComponent(todayRoute.id)}`} className="block">
                    <Button type="button" variant="outline" className="w-full min-h-[52px] text-base font-black gap-2">
                      <Droplets className="w-5 h-5 text-blue-600" />
                      {t('worker.waterMeasurement')}
                    </Button>
                  </Link>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="success" className="h-16 flex-col gap-1" onClick={() => onFinish('ok')}>
                      <CheckCircle2 className="w-6 h-6" />
                      <span>{t('worker.allOk')}</span>
                    </Button>
                    <Button variant="danger" className="h-16 flex-col gap-1" onClick={() => onSetIncidenceMode(true)}>
                      <AlertTriangle className="w-6 h-6" />
                      <span>{t('worker.incident')}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-red-50 p-4 rounded-xl border border-red-100">
                  <label className="text-sm font-bold text-red-900">{t('worker.incidentDetails')}</label>
                  <textarea
                    className="w-full rounded-lg border-red-200 p-3 text-sm focus:ring-red-500 focus:border-red-500"
                    rows={3}
                    placeholder={t('worker.describeProblem')}
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                  />
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                      checked={notifyClient}
                      onChange={(e) => onNotifyClientChange(e.target.checked)}
                    />
                    <span className="text-xs font-bold text-red-800 group-hover:text-red-900 transition-colors">
                      {t('worker.notifyClientHistory')}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => onSetIncidenceMode(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={() => onFinish('issue')} disabled={!notes.trim()}>
                      {t('worker.report')}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
