import React from 'react';
import { useTranslation } from 'react-i18next';

export function ClientDashboardHeader() {
  const { t } = useTranslation();
  return (
    <header>
      <h2 className="text-2xl font-black text-slate-900">{t('client.title')}</h2>
      <p className="text-slate-500">{t('client.subtitle')}</p>
    </header>
  );
}
