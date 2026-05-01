import React from 'react';
import { Card } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';
import type { PoolRecord } from '../../../types/pool';

type PoolDetailEquipmentSectionProps = {
  pool: PoolRecord;
};

export function PoolDetailEquipmentSection({ pool }: PoolDetailEquipmentSectionProps) {
  const { t } = useTranslation();
  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('poolDetail.sectionEquipment')}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.filterType')}</dt>
          <dd className="font-semibold">{pool.equipment?.filterType || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.pumpType')}</dt>
          <dd className="font-semibold">{pool.equipment?.pumpType || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.chlorination')}</dt>
          <dd className="font-semibold">{pool.equipment?.chlorinationSystem || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.skimmers')}</dt>
          <dd className="font-semibold">{pool.equipment?.skimmerType || '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.lastReview')}</dt>
          <dd className="font-semibold">{pool.equipment?.lastTechnicalReview || '—'}</dd>
        </div>
      </dl>
    </Card>
  );
}
