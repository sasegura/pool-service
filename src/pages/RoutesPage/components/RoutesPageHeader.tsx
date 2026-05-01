import React from 'react';
import { Button } from '../../../components/ui/Common';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type RoutesPageHeaderProps = {
  onNewRoute: () => void;
};

export function RoutesPageHeader({ onNewRoute }: RoutesPageHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-black text-slate-900">{t('routesPage.title')}</h2>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500 mt-1 min-w-0">{t('routesPage.subtitle')}</p>
        <Button size="sm" onClick={onNewRoute} className="gap-1 shrink-0">
          <Plus className="w-4 h-4" /> {t('routesPage.newRoute')}
        </Button>
      </div>
    </div>
  );
}
