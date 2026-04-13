import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import type { PoolHealthStatus } from '../types/pool';

export function PoolStatusBadge({
  status,
  className,
  size = 'md',
}: {
  status?: PoolHealthStatus;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const { t } = useTranslation();
  if (!status) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-bold uppercase tracking-wide bg-slate-100 text-slate-500 ring-1 ring-slate-200',
          size === 'sm' ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-1',
          className
        )}
      >
        {t('poolTech.statusUnknown')}
      </span>
    );
  }

  const s = status;

  const cfg: Record<PoolHealthStatus, { label: string; dot: string; ring: string }> = {
    ok: {
      label: t('poolTech.statusOk'),
      dot: 'bg-emerald-500',
      ring: 'ring-emerald-200',
    },
    review: {
      label: t('poolTech.statusReview'),
      dot: 'bg-amber-500',
      ring: 'ring-amber-200',
    },
    urgent: {
      label: t('poolTech.statusUrgent'),
      dot: 'bg-red-600',
      ring: 'ring-red-200',
    },
  };

  const c = cfg[s];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-black uppercase tracking-wide ring-2 bg-white',
        c.ring,
        size === 'sm' ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-1',
        className
      )}
    >
      <span className={cn('rounded-full', size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5', c.dot)} aria-hidden />
      {c.label}
    </span>
  );
}
