import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useAppServices } from '../../app/providers/AppServicesContext';
import { deepRemoveUndefined } from '../../features/pools/domain/poolDraft';
import { loadPoolVisitContext } from '../../features/visits/application/poolVisitService';
import { DEFAULT_MAINTENANCE_INTERVAL_DAYS } from '../../constants/chemicalReference';
import { estimateVolumeM3, computeAvgDepthM } from '../../lib/poolVolume';
import { evaluateWaterHealth } from '../../lib/poolHealth';
import { buildRecommendations } from '../../lib/poolRecommendations';
import type { PoolChemistryInput, PoolRecord, PoolVisualObservations } from '../../types/pool';
import {
  emptyChem,
  traditionalKitDefaults,
  type ChemistryInputDraft,
} from './poolVisitChemistry';
import { PoolVisitLoadingState } from './components/PoolVisitLoadingState';
import { PoolVisitHeader } from './components/PoolVisitHeader';
import { PoolVisitChemistryCard } from './components/PoolVisitChemistryCard';
import { PoolVisitVisualCard } from './components/PoolVisitVisualCard';
import { PoolVisitRecommendationsSection } from './components/PoolVisitRecommendationsSection';
import { PoolVisitNotesCard } from './components/PoolVisitNotesCard';
import { PoolVisitSaveBar } from './components/PoolVisitSaveBar';

const emptyVisual: PoolVisualObservations = {
  waterClarity: 'clear',
  algaeVisible: false,
  bottomDebris: false,
  filterPressure: 'unknown',
  pumpState: 'unknown',
};

export default function PoolVisitPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const [searchParams] = useSearchParams();
  const routeId = searchParams.get('routeId') || undefined;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading, companyId } = useAuth();
  const { poolVisitRepository, poolVisitCommands } = useAppServices();

  const [pool, setPool] = useState<PoolRecord | null>(null);
  const [loadingPool, setLoadingPool] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFilterPumpObservations, setShowFilterPumpObservations] = useState(false);

  const [chemistry, setChemistry] = useState<PoolChemistryInput>({ ...traditionalKitDefaults });
  const [chemistryDraft, setChemistryDraft] = useState<ChemistryInputDraft>(() =>
    Object.fromEntries(Object.entries(traditionalKitDefaults).map(([k, v]) => [k, String(v)])) as ChemistryInputDraft
  );
  const [visual, setVisual] = useState<PoolVisualObservations>(emptyVisual);
  const [notes, setNotes] = useState('');
  const [appliedTreatment, setAppliedTreatment] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const quickSelectRefs = useRef<Partial<Record<keyof PoolChemistryInput, HTMLSelectElement | null>>>({});

  useEffect(() => {
    if (!poolId || !poolVisitRepository) {
      setLoadingPool(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoadingPool(true);
      try {
        const { pool: poolData, recentVisits } = await loadPoolVisitContext(poolVisitRepository, {
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
          const filteredDraft = Object.fromEntries(filteredEntries.map(([k, v]) => [k, String(v)])) as ChemistryInputDraft;

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
  }, [poolId, routeId, user?.uid, poolVisitRepository]);

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
        delete (n as Record<string, unknown>)[key as string];
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
    if (!poolId || !user || !pool || !poolVisitCommands) return;
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
        createdAt: new Date().toISOString(),
      }) as Record<string, unknown>;

      const nextMaint = new Date(visitedAt);
      nextMaint.setDate(nextMaint.getDate() + DEFAULT_MAINTENANCE_INTERVAL_DAYS);

      await poolVisitCommands.savePoolVisitWithPoolUpdate(poolId, visitPayload, (visitDocId) =>
        deepRemoveUndefined({
          healthStatus: health,
          lastVisitAt: visitedAt,
          lastVisitTechnicianName: user.displayName || user.email || '',
          lastMeasurement: chemistryPayload,
          lastVisitId: visitDocId,
          nextRecommendedMaintenance: nextMaint.toISOString(),
          updatedAt: new Date().toISOString(),
        }) as Record<string, unknown>
      );

      toast.success(t('poolVisit.toastSaved'));
      const query = new URLSearchParams();
      query.set('resumeVisit', '1');
      query.set('poolId', poolId);
      if (routeId) query.set('routeId', routeId);
      if (routeId) {
        navigate(`/route/${encodeURIComponent(routeId)}?${query.toString()}`);
      } else {
        navigate(`/?${query.toString()}`);
      }
    } catch (e: unknown) {
      console.error('Error saving pool visit:', e);
      const err = e as { message?: string; code?: string };
      toast.error(t('poolVisit.toastError'), {
        description: err?.message || err?.code || 'Unknown error',
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
    if (routeId) {
      navigate(`/route/${encodeURIComponent(routeId)}?${query.toString()}`);
    } else {
      navigate(`/?${query.toString()}`);
    }
  };

  if (authLoading || !companyId || loadingPool) {
    return <PoolVisitLoadingState />;
  }

  if (!user || !poolId || !pool) {
    return <div className="p-6 text-center text-red-600 font-bold">{t('poolVisit.notFound')}</div>;
  }

  return (
    <div className="space-y-4 pb-24">
      <PoolVisitHeader
        poolName={pool.name}
        effectiveVolume={effectiveVolume}
        previewHealth={previewHealth}
        onBack={handleBackToRoute}
      />

      <PoolVisitChemistryCard
        pool={pool}
        chemistry={chemistry}
        chemistryDraft={chemistryDraft}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced((s) => !s)}
        quickSelectRefs={quickSelectRefs}
        onNumberChange={handleNumber}
        onOpenQuickSelector={openQuickSelector}
      />

      <PoolVisitVisualCard
        visual={visual}
        setVisual={setVisual}
        showFilterPumpObservations={showFilterPumpObservations}
        onToggleFilterPump={() => setShowFilterPumpObservations((s) => !s)}
      />

      <PoolVisitRecommendationsSection previewRecs={previewRecs} showAdvanced={showAdvanced} />

      <PoolVisitNotesCard
        notes={notes}
        onNotesChange={setNotes}
        showAdvanced={showAdvanced}
        appliedTreatment={appliedTreatment}
        onAppliedTreatmentChange={setAppliedTreatment}
        photoUrlInput={photoUrlInput}
        onPhotoUrlInputChange={setPhotoUrlInput}
      />

      <PoolVisitSaveBar saving={saving} onSave={handleSave} />
    </div>
  );
}
