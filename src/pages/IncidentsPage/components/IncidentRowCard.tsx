import React from 'react';
import { Card } from '../../../components/ui/Common';
import { AlertCircle, Calendar, MapPin, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { ServiceIncidentLog } from '../../../features/incidents/types';

type IncidentRowCardProps = {
  incident: ServiceIncidentLog;
  poolName: string;
  workerName: string;
  dateLocale: Locale;
};

export function IncidentRowCard({ incident, poolName, workerName, dateLocale }: IncidentRowCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-5 border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              {t('incidents.badge')}
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {incident.id.slice(0, 8)}</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            {poolName}
          </h3>
          <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg italic border border-slate-100">"{incident.notes}"</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 md:text-right md:flex-col md:items-end">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {workerName}
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(incident.date + 'T00:00:00'), 'dd MMM, yyyy', { locale: dateLocale })}
          </div>
          {incident.arrivalTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {t('incidents.reportedAt')} {format(incident.arrivalTime.toDate(), 'HH:mm')}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
