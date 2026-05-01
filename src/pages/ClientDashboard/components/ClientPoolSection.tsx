import React from 'react';
import { Waves, MapPin } from 'lucide-react';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { ClientDashboardPool, ClientDashboardLog } from '../../../features/client-dashboard/ports';
import { ClientServiceLogCard } from './ClientServiceLogCard';

type ClientPoolSectionProps = {
  pool: ClientDashboardPool;
  logs: ClientDashboardLog[];
  workers: Record<string, string>;
  dateLocale: Locale;
};

export function ClientPoolSection({ pool, logs, workers, dateLocale }: ClientPoolSectionProps) {
  const { t } = useTranslation();
  const poolLogs = logs.filter((l) => l.poolId === pool.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <Waves className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-black text-slate-900">{pool.name}</h3>
          <div className="flex items-center text-xs text-slate-500 font-bold uppercase tracking-wider">
            <MapPin className="w-3 h-3 mr-1" /> {pool.address}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('client.recentReviews')}</h4>
        {poolLogs.length === 0 ? (
          <p className="text-sm text-slate-400 italic ml-1">{t('client.noLogs')}</p>
        ) : (
          poolLogs.map((log) => (
            <ClientServiceLogCard
              key={log.id}
              log={log}
              technicianLabel={workers[log.workerId] || t('client.technicianFallback')}
              dateLocale={dateLocale}
            />
          ))
        )}
      </div>
    </div>
  );
}
