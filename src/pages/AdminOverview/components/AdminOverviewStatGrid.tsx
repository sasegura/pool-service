import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Common';
import { Waves, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type AdminOverviewStatGridProps = {
  poolsCount: number;
  workersCount: number;
  completedCount: number;
  incidentsCount: number;
};

export function AdminOverviewStatGrid({
  poolsCount,
  workersCount,
  completedCount,
  incidentsCount,
}: AdminOverviewStatGridProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card
        className="p-6 bg-blue-50 border-blue-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
        onClick={() => navigate('/pools')}
      >
        <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
          <Waves className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase mb-1">{t('nav.pools')}</div>
          <div className="text-3xl font-black text-blue-900">{poolsCount}</div>
        </div>
      </Card>

      <Card
        className="p-6 bg-slate-50 border-slate-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
        onClick={() => navigate('/team')}
      >
        <div className="bg-slate-600 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-slate-200">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-600 uppercase mb-1">{t('nav.team')}</div>
          <div className="text-3xl font-black text-slate-900">{workersCount}</div>
        </div>
      </Card>

      <Card
        className="p-6 bg-emerald-50 border-emerald-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
        onClick={() => navigate('/routes')}
      >
        <div className="bg-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-200">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-emerald-600 uppercase mb-1">{t('common.completed')}</div>
          <div className="text-3xl font-black text-emerald-900">{completedCount}</div>
        </div>
      </Card>

      <Card
        className="p-6 bg-red-50 border-red-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
        onClick={() => navigate('/incidents')}
      >
        <div className="bg-red-600 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-red-200">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-red-600 uppercase mb-1">{t('nav.incidents')}</div>
          <div className="text-3xl font-black text-red-900">{incidentsCount}</div>
        </div>
      </Card>
    </div>
  );
}
