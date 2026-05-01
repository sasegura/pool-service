import React from 'react';
import { Card } from '../../../components/ui/Common';
import { Calendar, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';
import type { ClientDashboardLog } from '../../../features/client-dashboard/ports';

type ClientServiceLogCardProps = {
  log: ClientDashboardLog;
  technicianLabel: string;
  dateLocale: Locale;
};

export function ClientServiceLogCard({ log, technicianLabel, dateLocale }: ClientServiceLogCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 hover:border-blue-200 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
              log.status === 'ok' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            )}
          >
            {log.status === 'ok' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-slate-900">
                {log.status === 'ok' ? t('client.serviceCompleted') : t('client.incidentReported')}
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-tighter">
                {technicianLabel}
              </span>
            </div>
            <div className="flex items-center text-xs text-slate-500 font-bold gap-3">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {log.arrivalTime?.toDate
                  ? format(log.arrivalTime.toDate(), 'd MMM, yyyy', { locale: dateLocale })
                  : log.date}
              </div>
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {log.arrivalTime?.toDate ? format(log.arrivalTime.toDate(), 'HH:mm') : '--:--'}
              </div>
            </div>
            {log.notes && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-600 border border-slate-100 italic">
                "{log.notes}"
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
