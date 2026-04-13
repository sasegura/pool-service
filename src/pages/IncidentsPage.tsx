import React, { useState } from 'react';
import { Card } from '../components/ui/Common';
import { AlertCircle, Calendar, MapPin, User, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useIncidentsPageData } from '../features/incidents/hooks/useIncidentsPageData';

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
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input 
              type="date" 
              className="pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')}
                className="absolute right-3 p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                title={t('incidents.clearFilter')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
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
          {incidents.map(incident => (
            <Card key={incident.id} className="p-5 border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
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
                    {pools[incident.poolId] || t('incidents.unknownPool')}
                  </h3>
                  <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg italic border border-slate-100">
                    "{incident.notes}"
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 md:text-right md:flex-col md:items-end">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {workers[incident.workerId] || t('incidents.unknownWorker')}
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
          ))}
        </div>
      )}
    </div>
  );
}
