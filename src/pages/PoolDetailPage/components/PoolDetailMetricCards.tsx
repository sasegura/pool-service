import React from 'react';
import { Card } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';
import type { PoolRecord, PoolVisitRecord } from '../../../types/pool';

type PoolDetailMetricCardsProps = {
  pool: PoolRecord;
  computedVolume: number | undefined;
  lastVisit: PoolVisitRecord | undefined;
  fmtDate: (iso?: string) => string;
};

export function PoolDetailMetricCards({ pool, computedVolume, lastVisit, fmtDate }: PoolDetailMetricCardsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Card className="p-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('poolDetail.cardVolume')}</p>
        <p className="text-2xl font-black text-slate-900 mt-1">{(pool.volumeM3 ?? computedVolume ?? 0).toFixed(1)} m³</p>
        {pool.volumeManualOverride && (
          <p className="text-[11px] text-amber-700 font-bold mt-1">{t('poolDetail.manualVolume')}</p>
        )}
      </Card>
      <Card className="p-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('poolDetail.cardLastReading')}</p>
        <p className="text-sm text-slate-700 mt-2">{lastVisit ? fmtDate(lastVisit.visitedAt) : t('poolDetail.noVisits')}</p>
        {pool.lastMeasurement?.ph != null && (
          <p className="text-xs text-slate-500 mt-1">
            pH {pool.lastMeasurement.ph} · FC {pool.lastMeasurement.freeChlorinePpm ?? '—'} ppm
          </p>
        )}
      </Card>
    </div>
  );
}
