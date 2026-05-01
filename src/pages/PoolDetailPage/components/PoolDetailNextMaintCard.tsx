import React from 'react';
import { Card } from '../../../components/ui/Common';
import { PoolStatusBadge } from '../../../components/PoolStatusBadge';
import { useTranslation } from 'react-i18next';
import type { PoolRecord } from '../../../types/pool';

type PoolDetailNextMaintCardProps = {
  pool: PoolRecord;
  fmtDate: (iso?: string) => string;
};

export function PoolDetailNextMaintCard({ pool, fmtDate }: PoolDetailNextMaintCardProps) {
  const { t } = useTranslation();
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('poolDetail.nextMaint')}</h2>
        <PoolStatusBadge status={pool.healthStatus} size="sm" />
      </div>
      <p className="text-lg font-bold text-slate-900">{fmtDate(pool.nextRecommendedMaintenance)}</p>
      <p className="text-xs text-slate-500 mt-1">{t('poolDetail.nextMaintHint')}</p>
    </Card>
  );
}
