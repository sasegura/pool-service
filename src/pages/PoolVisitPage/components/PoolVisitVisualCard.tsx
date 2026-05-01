import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Card } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';
import type { PoolVisualObservations } from '../../../types/pool';

type PoolVisitVisualCardProps = {
  visual: PoolVisualObservations;
  setVisual: React.Dispatch<React.SetStateAction<PoolVisualObservations>>;
  showFilterPumpObservations: boolean;
  onToggleFilterPump: () => void;
};

export function PoolVisitVisualCard({
  visual,
  setVisual,
  showFilterPumpObservations,
  onToggleFilterPump,
}: PoolVisitVisualCardProps) {
  const { t } = useTranslation();

  return (
    <section>
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('poolVisit.sectionVisual')}</h2>
      <Card className="p-4 space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">{t('poolVisit.waterClarity')}</p>
            <select
              className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-3 text-lg font-black min-h-[52px]"
              value={visual.waterClarity}
              onChange={(e) =>
                setVisual((s) => ({
                  ...s,
                  waterClarity: e.target.value as 'clear' | 'slightly_cloudy' | 'cloudy',
                }))
              }
            >
              {(['clear', 'slightly_cloudy', 'cloudy'] as const).map((v) => (
                <option key={v} value={v}>
                  {t(`poolVisit.clarity.${v}`)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setVisual((s) => ({ ...s, algaeVisible: !s.algaeVisible }))}
            className={`min-h-[52px] rounded-xl border px-4 text-left font-bold text-sm whitespace-nowrap ${
              visual.algaeVisible ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {visual.algaeVisible ? '✓ ' : ''}
            {t('poolVisit.algae')}
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleFilterPump}
          className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm inline-flex items-center justify-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showFilterPumpObservations
            ? t('poolVisit.hideFilterPumpObs', { defaultValue: 'Ocultar observaciones filtro-bomba' })
            : t('poolVisit.showFilterPumpObs', { defaultValue: 'Observaciones filtro-bomba' })}
        </button>

        {showFilterPumpObservations && (
          <>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">{t('poolVisit.filterPressure')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['normal', 'high', 'low', 'unknown'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisual((s) => ({ ...s, filterPressure: v }))}
                    className={`min-h-[44px] rounded-xl border font-bold text-sm ${
                      visual.filterPressure === v ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
                    }`}
                  >
                    {t(`poolVisit.pressure.${v}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">{t('poolVisit.pump')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['ok', 'noise', 'leak', 'off', 'unknown'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisual((s) => ({ ...s, pumpState: v }))}
                    className={`min-h-[44px] rounded-xl border font-bold text-sm ${
                      visual.pumpState === v ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
                    }`}
                  >
                    {t(`poolVisit.pumpState.${v}`)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>
    </section>
  );
}
