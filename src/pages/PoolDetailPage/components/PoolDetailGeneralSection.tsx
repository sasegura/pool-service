import React from 'react';
import { Card } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';
import { computeAvgDepthM } from '../../../lib/poolVolume';
import type { PoolRecord } from '../../../types/pool';

type PoolDetailGeneralSectionProps = {
  pool: PoolRecord;
};

export function PoolDetailGeneralSection({ pool }: PoolDetailGeneralSectionProps) {
  const { t } = useTranslation();
  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('poolDetail.sectionGeneral')}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolDetail.owner')}</dt>
          <dd className="font-semibold text-slate-900">{pool.ownerLabel || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolDetail.shapeLabel')}</dt>
          <dd className="font-semibold text-slate-900">{pool.shape ? t(`poolForm.shape.${pool.shape}`) : '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolDetail.dims')}</dt>
          <dd className="font-semibold text-slate-900">
            {pool.lengthM ?? '—'} × {pool.widthM ?? '—'} m · {t('poolDetail.depths')} {pool.minDepthM ?? '—'}–{pool.maxDepthM ?? '—'}{' '}
            m
          </dd>
        </div>
        <div>
          <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolDetail.avgDepth')}</dt>
          <dd className="font-semibold text-slate-900">
            {(pool.avgDepthM ?? computeAvgDepthM(pool.minDepthM, pool.maxDepthM) ?? '—').toString()}
            {pool.avgDepthM != null || (pool.minDepthM != null && pool.maxDepthM != null) ? ' m' : ''}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
