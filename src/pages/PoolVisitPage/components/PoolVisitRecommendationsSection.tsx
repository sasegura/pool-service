import React from 'react';
import { Card } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';
import type { PoolRecommendationItem } from '../../../types/pool';

type PoolVisitRecommendationsSectionProps = {
  previewRecs: PoolRecommendationItem[];
  showAdvanced: boolean;
};

export function PoolVisitRecommendationsSection({ previewRecs, showAdvanced }: PoolVisitRecommendationsSectionProps) {
  const { t } = useTranslation();

  return (
    <section>
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('poolVisit.sectionRecs')}</h2>
      <div className="space-y-2">
        {previewRecs.length === 0 ? (
          <Card className="p-4 text-sm text-slate-500">{t('poolVisit.noRecs')}</Card>
        ) : (
          previewRecs.slice(0, 3).map((r) => (
            <Card key={r.id} className="p-4 border-l-4 border-l-blue-500">
              <p className="font-black text-slate-900">{t(r.titleKey, { defaultValue: r.titleDefault })}</p>
              {r.dose && r.dose.amount > 0 && (
                <p className="mt-1 text-sm font-bold text-blue-800">
                  {t('poolVisit.doseLine', {
                    amount: r.dose.amount,
                    unit: r.dose.unit,
                    product: t(r.dose.productKey, { defaultValue: r.dose.productDefault }),
                  })}
                </p>
              )}
              {showAdvanced && r.bodyKey && (
                <p className="text-sm text-slate-600 mt-1">{t(r.bodyKey, { defaultValue: r.bodyDefault })}</p>
              )}
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
