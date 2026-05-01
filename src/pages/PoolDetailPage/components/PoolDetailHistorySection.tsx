import React from 'react';
import { Card } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';
import type { PoolRecord } from '../../../types/pool';

type PoolDetailHistorySectionProps = {
  pool: PoolRecord;
};

export function PoolDetailHistorySection({ pool }: PoolDetailHistorySectionProps) {
  const { t } = useTranslation();
  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('poolDetail.sectionHistory')}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.lastMaintenance')}</dt>
          <dd className="font-semibold">{pool.history?.lastMaintenance || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.lastFilterClean')}</dt>
          <dd className="font-semibold">{pool.history?.lastFilterClean || '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.incidents')}</dt>
          <dd className="font-semibold whitespace-pre-wrap">{pool.history?.previousIncidents || '—'}</dd>
        </div>
      </dl>
    </Card>
  );
}
