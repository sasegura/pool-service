import React from 'react';
import { Card } from '../../../components/ui/Common';
import { Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useTranslation } from 'react-i18next';
import type { AdminOverviewWorkerUser as User } from '../../../features/admin-overview/hooks/useAdminOverviewData';
import { AdminOverviewTrackingMap } from './AdminOverviewTrackingMap';

type AdminLiveTrackingCardProps = {
  apiKey: string;
  liveWorkers: User[];
};

export function AdminLiveTrackingCard({ apiKey, liveWorkers }: AdminLiveTrackingCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden border-slate-200">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-600" /> {t('admin.mapRealtimeTitle')}
        </h3>
      </div>
      <div className="h-[400px] relative">
        <APIProvider apiKey={apiKey}>
          <AdminOverviewTrackingMap workers={liveWorkers} />
        </APIProvider>
      </div>
      <div className="p-4 bg-white">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
          {t('admin.activeTechnicians')}
        </h4>
        <div className="space-y-3">
          {liveWorkers.length === 0 ? (
            <p className="text-xs text-slate-400 italic">{t('admin.noGpsWorkers')}</p>
          ) : (
            liveWorkers.map((worker) => (
              <div key={worker.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700">{worker.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {worker.lastActive?.toDate ? format(worker.lastActive.toDate(), 'HH:mm:ss') : t('admin.momentAgo')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
