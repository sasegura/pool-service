import React from 'react';
import { Card, Button } from '../../../components/ui/Common';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RouteDocument as Route } from '../../../features/routes/types';

type RoutesLegacyUndatedSectionProps = {
  legacyUndated: Route[];
  onEdit: (route: Route) => void;
  onDelete: (id: string, routeName?: string) => void;
};

export function RoutesLegacyUndatedSection({ legacyUndated, onEdit, onDelete }: RoutesLegacyUndatedSectionProps) {
  const { t } = useTranslation();

  if (legacyUndated.length === 0) return null;

  return (
    <Card className="p-4 border-amber-200 bg-amber-50/60 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-amber-950 text-sm">{t('routesPage.legacyTitle')}</h3>
          <p className="text-xs text-amber-900/90 mt-1">{t('routesPage.legacyBody', { count: legacyUndated.length })}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {legacyUndated.map((route) => (
          <li
            key={route.id}
            className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-white border border-amber-100 text-sm"
          >
            <span className="font-medium text-slate-800 truncate">
              {route.routeName || t('routesPage.unnamed')} · {t('routesPage.poolsCount', { count: route.poolIds.length })}
            </span>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => onEdit(route)}>
                {t('common.edit')}
              </Button>
              <Button type="button" size="sm" variant="danger" onClick={() => onDelete(route.id, route.routeName)}>
                {t('common.delete')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
