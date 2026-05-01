import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PoolsMissingApiBanner() {
  const { t } = useTranslation();
  return (
    <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200">
      <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-amber-900 mb-2">{t('pools.missingApiTitle')}</h2>
      <p className="text-sm text-amber-700">{t('pools.missingApiBody')}</p>
    </div>
  );
}
