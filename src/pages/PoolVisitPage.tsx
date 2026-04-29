import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, Droplets, Loader2, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { deepRemoveUndefined } from '../features/pools/domain/poolDraft';
import {
  createPoolVisitRepositoryFirestore,
} from '../features/visits/repositories/poolVisitRepositoryFirestore';
import {
  createPoolVisitCommands,
  loadPoolVisitContext,
} from '../features/visits/application/poolVisitService';
import { Button, Card } from '../components/ui/Common';
import { DEFAULT_MAINTENANCE_INTERVAL_DAYS } from '../constants/chemicalReference';
import { estimateVolumeM3, computeAvgDepthM } from '../lib/poolVolume';
import { evaluateWaterHealth } from '../lib/poolHealth';
import { buildRecommendations } from '../lib/poolRecommendations';
import { PoolStatusBadge } from '../components/PoolStatusBadge';
import type { PoolChemistryInput, PoolRecord, PoolVisualObservations } from '../types/pool';

const emptyChem: PoolChemistryInput = {};
const traditionalKitDefaults: PoolChemistryInput = {
  ph: 7.4,
  freeChlorinePpm: 2,
  waterTempC: 26,
  totalChlorinePpm: 2,
  totalAlkalinityPpm: 100,
  calciumHardnessPpm: 300,
  cyanuricAcidPpm: 40,
  salinityPpm: 3000,
};
const emptyVisual: PoolVisualObservations = {
  waterClarity: 'clear',
  algaeVisible: false,
  bottomDebris: false,
  filterPressure: 'unknown',
  pumpState: 'unknown',
};

type ChemistryInputDraft = Partial<Record<keyof PoolChemistryInput, string>>;
type ChemistryFieldConfig = {
  step?: number;
  selectorMin?: number;
  selectorMax?: number;
  selectorValues?: number[];
};

const chemistryFieldConfig: Partial<Record<keyof PoolChemistryInput, ChemistryFieldConfig>> = {
  ph: { step: 0.1, selectorMin: 6.8, selectorMax: 7.8 },
  // Valores de comparador tradicionales (OTO/DPD) para seleccionar rapido
  freeChlorinePpm: { selectorValues: [0, 0.5, 1, 1.5, 2, 3, 5] },
  // Menos opciones para elegir rápido (por rangos)
  waterTempC: { step: 2, selectorMin: 18, selectorMax: 34 },
  salinityPpm: { step: 100, selectorMin: 2500, selectorMax: 3800 },
  totalChlorinePpm: { selectorValues: [0, 0.5, 1, 1.5, 2, 3, 5] },
  totalAlkalinityPpm: { step: 10, selectorMin: 60, selectorMax: 160 },
  calciumHardnessPpm: { step: 25, selectorMin: 150, selectorMax: 500 },
  cyanuricAcidPpm: { step: 5, selectorMin: 20, selectorMax: 80 },
};

const getStepDecimals = (step: number) => {
  const stepString = String(step);
  const decimals = stepString.includes('.') ? stepString.split('.')[1].length : 0;
  return decimals;
};

const buildRangeValues = (config?: ChemistryFieldConfig) => {
  if (!config) return [];
  if (config.selectorValues?.length) {
    return config.selectorValues.map((value) => String(value));
  }
  if (!config.step || config.selectorMin == null || config.selectorMax == null) return [];
  const decimals = getStepDecimals(config.step);
  const values: string[] = [];
  for (let raw = config.selectorMin; raw <= config.selectorMax + config.step / 2; raw += config.step) {
    values.push(String(Number(raw.toFixed(decimals))));
  }
  return values;
};

const buildSelectorValues = (config?: ChemistryFieldConfig) => {
  const values = buildRangeValues(config);
  // Si viene de un rango (min/max), quitamos el primer valor numérico para que el selector empiece “más útil”.
  if (!config?.selectorValues?.length) return values.slice(1);
  return values;
};

export default function PoolVisitPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const [searchParams] = useSearchParams();
  const routeId = searchParams.get('routeId') || undefined;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading, companyId } = useAuth();

  const [pool, setPool] = useState<PoolRecord | null>(null);
  const [loadingPool, setLoadingPool] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFilterPumpObservations, setShowFilterPumpObservations] = useState(false);

  const [chemistry, setChemistry] = useState<PoolChemistryInput>({ ...traditionalKitDefaults });
  const [chemistryDraft, setChemistryDraft] = useState<ChemistryInputDraft>(() =>
    Object.fromEntries(
      Object.entries(traditionalKitDefaults).map(([k, v]) => [k, String(v)])
    ) as ChemistryInputDraft
  );
  const [visual, setVisual] = useState<PoolVisualObservations>(emptyVisual);
  const [notes, setNotes] = useState('');
  const [appliedTreatment, setAppliedTreatment] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const quickSelectRefs = useRef<Partial<Record<keyof PoolChemistryInput, HTMLSelectElement | null>>>({});

  useEffect(() => {
    if (!poolId || !companyId) {
      setLoadingPool(false);
      return;
    }
    const repository = createPoolVisitRepositoryFirestore(companyId);
    let cancelled = false;
    (async () => {
      setLoadingPool(true);
      try {
        const { pool: poolData, recentVisits } = await loadPoolVisitContext(repository, {
          poolId,
          maxRecentDocs: 5,
        });
        if (cancelled) return;
        if (!poolData) {
          setPool(null);
          return;
        }
        setPool(poolData);
        const bestMatch = recentVisits.find((v) => {
          const sameTech = !!user?.uid && v.technicianId === user.uid;
          const sameRoute = routeId ? v.routeId === routeId : true;
          return sameTech && sameRoute;
        });

        const fallbackChem = (poolData.lastMeasurement || {}) as PoolChemistryInput;
        const restoredChem = ((bestMatch?.chemistry as PoolChemistryInput | undefined) || fallbackChem) as PoolChemistryInput;
        if (Object.keys(restoredChem).length > 0) {
          const filteredEntries = Object.entries(restoredChem).filter(([, v]) => v != null && v !== '');
          const filteredChem = Object.fromEntries(filteredEntries) as Partial<PoolChemistryInput>;
          const filteredDraft = Object.fromEntries(
            filteredEntries.map(([k, v]) => [k, String(v)])
          ) as ChemistryInputDraft;

          setChemistry((prev) => ({ ...prev, ...filteredChem }));
          setChemistryDraft((prev) => ({
            ...prev,
            ...filteredDraft,
          }));
        }

        if (bestMatch?.visual) {
          setVisual((prev) => ({ ...prev, ...(bestMatch.visual as PoolVisualObservations) }));
        }
        if (bestMatch?.technicianNotes != null && typeof bestMatch.technicianNotes === 'string') {
          setNotes(bestMatch.technicianNotes);
        }
        if (bestMatch?.appliedTreatment != null && typeof bestMatch.appliedTreatment === 'string') {
          setAppliedTreatment(bestMatch.appliedTreatment);
        }
      } catch {
        if (!cancelled) setPool(null);
      } finally {
        if (!cancelled) setLoadingPool(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [poolId, routeId, user?.uid, companyId]);

  const effectiveVolume = useMemo(() => {
    if (!pool) return 50;
    if (pool.volumeM3 && pool.volumeM3 > 0) return pool.volumeM3;
    const avg = pool.avgDepthM ?? computeAvgDepthM(pool.minDepthM, pool.maxDepthM) ?? undefined;
    const est = estimateVolumeM3({
      shape: pool.shape,
      lengthM: pool.lengthM,
      widthM: pool.widthM,
      avgDepthM: avg,
    });
    return est && est > 0 ? est : 50;
  }, [pool]);

  const previewHealth = useMemo(() => {
    return evaluateWaterHealth({
      chemistry: { ...emptyChem, ...chemistry },
      visual,
      poolSystemType: pool?.poolSystemType,
    });
  }, [chemistry, visual, pool?.poolSystemType]);

  const previewRecs = useMemo(() => {
    return buildRecommendations({
      volumeM3: effectiveVolume,
      chemistry: { ...emptyChem, ...chemistry },
      visual,
      poolSystemType: pool?.poolSystemType,
    });
  }, [chemistry, visual, effectiveVolume, pool?.poolSystemType]);

  const handleNumber = (key: keyof PoolChemistryInput, raw: string) => {
    setChemistryDraft((d) => ({ ...d, [key]: raw }));
    const v = raw.trim();
    if (v === '') {
      setChemistry((c) => {
        const n = { ...c };
        delete (n as any)[key];
        return n;
      });
      return;
    }
    if (/[.,]$/.test(v)) return;
    const num = Number(v.replace(',', '.'));
    if (Number.isNaN(num)) return;
    setChemistry((c) => ({ ...c, [key]: num }));
  };

  const openQuickSelector = (key: keyof PoolChemistryInput) => {
    const selectEl = quickSelectRefs.current[key];
    if (!selectEl) return;
    selectEl.focus();
    if (typeof selectEl.showPicker === 'function') {
      selectEl.showPicker();
      return;
    }
    selectEl.click();
  };

  const handleSave = async () => {
    if (!poolId || !user || !pool || !companyId) return;
    const repository = createPoolVisitRepositoryFirestore(companyId);
    const commands = createPoolVisitCommands(repository);
    setSaving(true);
    try {
      const visitedAt = new Date().toISOString();
      const chemistryPayload = { ...emptyChem, ...chemistry };
      const visualPayload = { ...emptyVisual, ...visual };
      const health = evaluateWaterHealth({
        chemistry: chemistryPayload,
        visual: visualPayload,
        poolSystemType: pool.poolSystemType,
      });
      const recommendations = buildRecommendations({
        volumeM3: effectiveVolume,
        chemistry: chemistryPayload,
        visual: visualPayload,
        poolSystemType: pool.poolSystemType,
      });

      const photoUrls = photoUrlInput
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const visitPayload = deepRemoveUndefined({
        poolId,
        visitedAt,
        technicianId: user.uid,
        technicianName: user.displayName || user.email || '',
        routeId: routeId || null,
        chemistry: chemistryPayload,
        visual: visualPayload,
        technicianNotes: notes.trim(),
        appliedTreatment: appliedTreatment.trim(),
        photoUrls,
        recommendations,
        healthStatus: health,
        createdAt: serverTimestamp(),
      }) as Record<string, unknown>;

      const nextMaint = new Date(visitedAt);
      nextMaint.setDate(nextMaint.getDate() + DEFAULT_MAINTENANCE_INTERVAL_DAYS);

      await commands.savePoolVisitWithPoolUpdate(poolId, visitPayload, (visitDocId) =>
        deepRemoveUndefined({
          healthStatus: health,
          lastVisitAt: visitedAt,
          lastVisitTechnicianName: user.displayName || user.email || '',
          lastMeasurement: chemistryPayload,
          lastVisitId: visitDocId,
          nextRecommendedMaintenance: nextMaint.toISOString(),
          updatedAt: serverTimestamp(),
        }) as Record<string, unknown>
      );

      toast.success(t('poolVisit.toastSaved'));
      const query = new URLSearchParams();
      query.set('resumeVisit', '1');
      query.set('poolId', poolId);
      if (routeId) query.set('routeId', routeId);
      navigate(`/?${query.toString()}`);
    } catch (e: any) {
      console.error('Error saving pool visit:', e);
      toast.error(t('poolVisit.toastError'), {
        description: e?.message || e?.code || 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBackToRoute = () => {
    if (!poolId) {
      navigate(-1);
      return;
    }
    const query = new URLSearchParams();
    query.set('resumeVisit', '1');
    query.set('poolId', poolId);
    if (routeId) query.set('routeId', routeId);
    navigate(`/?${query.toString()}`);
  };

  if (authLoading || !companyId || loadingPool) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="font-medium">{t('poolVisit.loading')}</p>
      </div>
    );
  }

  if (!user || !poolId || !pool) {
    return <div className="p-6 text-center text-red-600 font-bold">{t('poolVisit.notFound')}</div>;
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" className="h-11 w-11 p-0 rounded-xl" onClick={handleBackToRoute}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-slate-900 truncate">{t('poolVisit.title')}</h1>
          <p className="text-sm text-slate-500 truncate flex items-center gap-1">
            <Droplets className="w-4 h-4 shrink-0 text-blue-500" />
            {pool.name}
          </p>
        </div>
        <PoolStatusBadge status={previewHealth} />
      </div>

      <Card className="p-4 bg-slate-50 border-slate-200">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('poolVisit.volumeHint')}</p>
        <p className="text-sm text-slate-800">
          <span className="font-black">{effectiveVolume.toFixed(1)} m3</span>
          <span className="text-slate-500"> - {t('poolVisit.volumeSub')}</span>
        </p>
      </Card>

      <section>
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('poolVisit.sectionChemistry')}</h2>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-3">
            {t('poolVisit.quickMode', { defaultValue: 'Modo rapido: rellena solo lo necesario.' })}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {([
              ['ph', t('poolVisit.fieldPh'), t('routesPage.selectPlaceholder', { defaultValue: 'Seleccionar…' })],
              [
                'freeChlorinePpm',
                t('poolVisit.fieldFc'),
                t('routesPage.selectPlaceholder', { defaultValue: 'Seleccionar…' }),
              ],
            ] as const).map(([key, label, hint]) => (
              <label
                key={key}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 min-h-[84px] justify-center cursor-pointer"
                onClick={() => openQuickSelector(key)}
              >
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{label}</span>
                {(() => {
                  const config = chemistryFieldConfig[key];
                  const values = buildSelectorValues(config);
                  return (
                    <select
                      ref={(el) => {
                        quickSelectRefs.current[key] = el;
                      }}
                      className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-3 text-lg font-black min-h-[52px]"
                      value={chemistryDraft[key] ?? (chemistry[key] != null ? String(chemistry[key]) : '')}
                      onChange={(e) => handleNumber(key, e.target.value)}
                    >
                      <option value="">{hint}</option>
                      {values.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </label>
            ))}
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
                      onChange={(e) => handleNumber('salinityPpm', e.target.value)}
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
            onClick={() => setShowAdvanced((s) => !s)}
            className="mt-4 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm inline-flex items-center justify-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showAdvanced
              ? t('poolVisit.hideAdvanced', { defaultValue: 'Ocultar campos avanzados' })
              : t('poolVisit.showAdvanced', { defaultValue: 'Mostrar campos avanzados' })}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {([
                ['totalChlorinePpm', t('poolVisit.fieldTc'), '-'],
                ['totalAlkalinityPpm', t('poolVisit.fieldAlk'), '80-120'],
                ['calciumHardnessPpm', t('poolVisit.fieldHard'), '200-400'],
                ['cyanuricAcidPpm', t('poolVisit.fieldCya'), '30-50'],
                  ['waterTempC', t('poolVisit.fieldTemp'), 'C'],
              ] as const).map(([key, label, hint]) => (
                <label
                  key={key}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 min-h-[84px] justify-center"
                >
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{label}</span>
                  {(() => {
                    const config = chemistryFieldConfig[key];
                    const values = buildSelectorValues(config);
                    return (
                      <select
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-3 text-lg font-black min-h-[52px]"
                        value={chemistryDraft[key] ?? (chemistry[key] != null ? String(chemistry[key]) : '')}
                        onChange={(e) => handleNumber(key, e.target.value)}
                      >
                        <option value="">{hint}</option>
                        {values.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </label>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section>
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('poolVisit.sectionVisual')}</h2>
        <Card className="p-4 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">{t('poolVisit.waterClarity')}</p>
            <div className="grid grid-cols-3 gap-2">
              {(['clear', 'slightly_cloudy', 'cloudy'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisual((s) => ({ ...s, waterClarity: v }))}
                  className={`min-h-[48px] rounded-xl border px-2 font-bold text-xs transition ${
                    visual.waterClarity === v ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white'
                  }`}
                >
                  {t(`poolVisit.clarity.${v}`)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setVisual((s) => ({ ...s, algaeVisible: !s.algaeVisible }))}
            className={`min-h-[48px] rounded-xl border px-4 text-left font-bold text-sm ${
              visual.algaeVisible ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {visual.algaeVisible ? '✓ ' : ''}
            {t('poolVisit.algae')}
          </button>

          <button
            type="button"
            onClick={() => setVisual((s) => ({ ...s, bottomDebris: !s.bottomDebris }))}
            className={`min-h-[48px] rounded-xl border px-4 text-left font-bold text-sm ${
              visual.bottomDebris ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {visual.bottomDebris ? '✓ ' : ''}
            {t('poolVisit.bottomDebris')}
          </button>

          <button
            type="button"
            onClick={() => setShowFilterPumpObservations((s) => !s)}
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

      <section>
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('poolVisit.sectionNotes')}</h2>
        <Card className="p-4 space-y-3">
          <textarea
            className="w-full rounded-xl border-slate-200 p-3 text-sm min-h-[96px]"
            placeholder={t('poolVisit.notesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {showAdvanced && (
            <>
              <textarea
                className="w-full rounded-xl border-slate-200 p-3 text-sm min-h-[72px]"
                placeholder={t('poolVisit.appliedPlaceholder')}
                value={appliedTreatment}
                onChange={(e) => setAppliedTreatment(e.target.value)}
              />
              <input
                className="w-full rounded-xl border-slate-200 p-3 text-sm"
                placeholder={t('poolVisit.photoUrlsPlaceholder')}
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
              />
            </>
          )}
        </Card>
      </section>

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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-slate-200 max-w-4xl mx-auto">
        <Button type="button" size="lg" className="w-full min-h-[52px] text-lg font-black" isLoading={saving} onClick={handleSave}>
          {t('poolVisit.saveVisit')}
        </Button>
      </div>
    </div>
  );
}
