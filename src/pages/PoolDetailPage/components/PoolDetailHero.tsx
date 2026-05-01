import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/Common';
import { PoolStatusBadge } from '../../../components/PoolStatusBadge';
import { useTranslation } from 'react-i18next';
import type { PoolRecord } from '../../../types/pool';

type PoolDetailHeroProps = {
  pool: PoolRecord;
  onBack: () => void;
};

export function PoolDetailHero({ pool, onBack }: PoolDetailHeroProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3">
      <Button type="button" variant="outline" size="sm" className="h-10 w-10 p-0 rounded-xl shrink-0" onClick={onBack}>
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-black text-slate-900 leading-tight">{pool.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{pool.address}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <PoolStatusBadge status={pool.healthStatus} />
          {pool.poolSystemType && (
            <span className="text-[10px] font-black uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
              {t(`poolDetail.system.${pool.poolSystemType}`)}
            </span>
          )}
          {pool.usage && (
            <span className="text-[10px] font-black uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
              {t(`poolDetail.usage.${pool.usage}`)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
