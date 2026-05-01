import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Card } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';
import type { PoolChemistryInput } from '../../../types/pool';
import type { PoolRecord } from '../../../types/pool';
import { buildSelectorValues, chemistryFieldConfig, type ChemistryInputDraft } from '../poolVisitChemistry';

type PoolVisitChemistryCardProps = {
  pool: PoolRecord;
  chemistry: PoolChemistryInput;
  chemistryDraft: ChemistryInputDraft;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  quickSelectRefs: React.MutableRefObject<Partial<Record<keyof PoolChemistryInput, HTMLSelectElement | null>>>;
  onNumberChange: (key: keyof PoolChemistryInput, raw: string) => void;
  onOpenQuickSelector: (key: keyof PoolChemistryInput) => void;
};

export function PoolVisitChemistryCard({
  pool,
  chemistry,
  chemistryDraft,
  showAdvanced,
  onToggleAdvanced,
  quickSelectRefs,
  onNumberChange,
  onOpenQuickSelector,
}: PoolVisitChemistryCardProps) {
  const { t } = useTranslation();
  const selectPlaceholder = t('routesPage.selectPlaceholder', { defaultValue: 'Seleccionar…' });

  return (
    <section>
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('poolVisit.sectionChemistry')}</h2>
      <Card className="p-4">
        <p className="text-xs text-slate-500 mb-3">
          {t('poolVisit.quickMode', { defaultValue: 'Modo rapido: rellena solo lo necesario.' })}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {(
            [
              ['ph', t('poolVisit.fieldPh'), selectPlaceholder],
              ['freeChlorinePpm', t('poolVisit.fieldFc'), selectPlaceholder],
            ] as const
          ).map(([key, label, hint]) => {
            const config = chemistryFieldConfig[key];
            const values = buildSelectorValues(config);
            return (
              <label
                key={key}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 min-h-[86px] justify-center cursor-pointer"
                onClick={() => onOpenQuickSelector(key)}
              >
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{label}</span>
                <select
                  ref={(el) => {
                    quickSelectRefs.current[key] = el;
                  }}
                  className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-3 text-lg font-black min-h-[52px]"
                  value={chemistryDraft[key] ?? (chemistry[key] != null ? String(chemistry[key]) : '')}
                  onChange={(e) => onNumberChange(key, e.target.value)}
                >
                  <option value="">{hint}</option>
                  {values.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
          {pool.poolSystemType === 'salt' && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">{t('poolVisit.fieldSalt')}</span>
              {(() => {
                const config = chemistryFieldConfig.salinityPpm;
                const values = buildSelectorValues(config);
                return (
                  <select
                    className="rounded-xl border-slate-200 p-3 text-lg font-bold min-h-[48px]"
                    value={chemistryDraft.salinityPpm ?? (chemistry.salinityPpm != null ? String(chemistry.salinityPpm) : '')}
                    onChange={(e) => onNumberChange('salinityPpm', e.target.value)}
                  >
                    <option value="">2700-3400</option>
                    {values.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </label>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleAdvanced}
          className="mt-4 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm inline-flex items-center justify-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showAdvanced
            ? t('poolVisit.hideAdvanced', { defaultValue: 'Ocultar campos avanzados' })
            : t('poolVisit.showAdvanced', { defaultValue: 'Mostrar campos avanzados' })}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {(
              [
                ['totalChlorinePpm', t('poolVisit.fieldTc'), '-'],
                ['totalAlkalinityPpm', t('poolVisit.fieldAlk'), '80-120'],
                ['calciumHardnessPpm', t('poolVisit.fieldHard'), '200-400'],
                ['cyanuricAcidPpm', t('poolVisit.fieldCya'), '30-50'],
                ['waterTempC', t('poolVisit.fieldTemp'), 'C'],
              ] as const
            ).map(([key, label, hint]) => {
              const config = chemistryFieldConfig[key];
              const values = buildSelectorValues(config);
              return (
                <label key={key} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 min-h-[76px] justify-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{label}</span>
                  <select
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-3 text-lg font-black min-h-[52px]"
                    value={chemistryDraft[key] ?? (chemistry[key] != null ? String(chemistry[key]) : '')}
                    onChange={(e) => onNumberChange(key, e.target.value)}
                  >
                    <option value="">{hint}</option>
                    {values.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
