import React from 'react';
import { ArrowLeft, Droplets } from 'lucide-react';
import { Button } from '../../../components/ui/Common';
import { PoolStatusBadge } from '../../../components/PoolStatusBadge';
import { useTranslation } from 'react-i18next';
import type { PoolHealthStatus } from '../../../types/pool';

type PoolVisitHeaderProps = {
  poolName: string;
  effectiveVolume: number;
  previewHealth: PoolHealthStatus;
  onBack: () => void;
};

export function PoolVisitHeader({ poolName, effectiveVolume, previewHealth, onBack }: PoolVisitHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="outline" size="sm" className="h-11 w-11 p-0 rounded-xl" onClick={onBack}>
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-black text-slate-900 truncate">{t('poolVisit.title')}</h1>
        <p className="text-sm text-slate-500 truncate flex items-center gap-1">
          <Droplets className="w-4 h-4 shrink-0 text-blue-500" />
          {poolName} {effectiveVolume.toFixed(1)} m3
        </p>
      </div>
      <PoolStatusBadge status={previewHealth} />
    </div>
  );
}
