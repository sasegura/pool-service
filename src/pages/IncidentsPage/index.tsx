import React, { useState } from 'react';
import { Card } from '../../components/ui/Common';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { es, enUS } from 'date-fns/locale';
import { useIncidentsPageData } from '../../features/incidents/hooks/useIncidentsPageData';
import { IncidentsDateFilter } from './components/IncidentsDateFilter';
import { IncidentRowCard } from './components/IncidentRowCard';

export default function IncidentsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : es;
  const { user, loading: authLoading, companyId } = useAuth();
  const [filterDate, setFilterDate] = useState<string>('');
  const { incidents, pools, workers, loading } = useIncidentsPageData(
    !authLoading && !!user,
    filterDate,
    companyId ?? undefined
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{t('incidents.title')}</h2>
          <p className="text-slate-500 font-medium">{t('incidents.subtitle')}</p>
        </div>
        <IncidentsDateFilter filterDate={filterDate} onChange={setFilterDate} />
      </header>

      {loading ? (
        <div className="p-12 text-center text-slate-500">{t('incidents.loading')}</div>
      ) : incidents.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2">
          <div className="bg-emerald-50 p-4 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{t('incidents.noneTitle')}</h3>
          <p className="text-slate-500">{t('incidents.noneBody')}</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {incidents.map((incident) => (
            <IncidentRowCard
              key={incident.id}
              incident={incident}
              poolName={pools[incident.poolId] || t('incidents.unknownPool')}
              workerName={workers[incident.workerId] || t('incidents.unknownWorker')}
              dateLocale={dateLocale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
