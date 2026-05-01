import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PoolVisitLoadingState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="font-medium">{t('poolVisit.loading')}</p>
    </div>
  );
}
