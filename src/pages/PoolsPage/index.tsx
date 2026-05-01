import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Common';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { APIProvider } from '@vis.gl/react-google-maps';
import type { PoolRecord } from '../../types/pool';
import { computeAvgDepthM, estimateVolumeM3 } from '../../lib/poolVolume';
import { getGoogleMapsApiKey, isMapsIntegrationEnabled } from '../../config/env';
import { initialPoolDraft, parsePositiveNumber, type PoolDraft } from '../../features/pools/domain/poolDraft';
import { resolveClientDirectoryDocId } from '../../features/pools/domain/poolClients';
import { buildPoolFirestorePayload } from '../../features/pools/mappers/poolFirestoreMapper';
import { poolRecordToDraft } from '../../features/pools/mappers/poolRecordToDraft';
import { usePoolsDirectory } from '../../features/pools/hooks/usePoolsDirectory';
import { PoolForm } from '../../features/pools/components/PoolForm';
import { PoolsMissingApiBanner } from './components/PoolsMissingApiBanner';
import { PoolDirectoryRow } from './components/PoolDirectoryRow';

const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
const MAPS_INTEGRATION_ENABLED = isMapsIntegrationEnabled();

export default function PoolsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading, companyId } = useAuth();
  const { pools, clients, commands } = usePoolsDirectory(!authLoading && !!user, companyId ?? undefined);
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PoolDraft>(() => initialPoolDraft());
  const [isAddressValidated, setIsAddressValidated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPickerMap, setShowPickerMap] = useState(false);

  useEffect(() => {
    if (!showPoolForm) {
      setShowPickerMap(false);
      return;
    }

    const raf = window.requestAnimationFrame(() => setShowPickerMap(true));
    return () => window.cancelAnimationFrame(raf);
  }, [showPoolForm]);

  const computedPreview = useMemo(() => {
    const L = parsePositiveNumber(draft.lengthM);
    const W = parsePositiveNumber(draft.widthM);
    const minD = parsePositiveNumber(draft.minDepthM);
    const maxD = parsePositiveNumber(draft.maxDepthM);
    const avg = computeAvgDepthM(minD, maxD);
    const est =
      !draft.volumeManualOverride &&
      estimateVolumeM3({ shape: draft.shape, lengthM: L, widthM: W, avgDepthM: avg });
    return { avg, est };
  }, [draft.lengthM, draft.widthM, draft.minDepthM, draft.maxDepthM, draft.shape, draft.volumeManualOverride]);

  useEffect(() => {
    if (draft.volumeManualOverride) return;
    if (computedPreview.est != null && Number.isFinite(computedPreview.est)) {
      const rounded = Math.round(computedPreview.est * 10) / 10;
      setDraft((d) => ({ ...d, volumeM3: String(rounded) }));
    }
  }, [computedPreview.est, draft.volumeManualOverride]);

  const handleQuickOwnerChange = async (poolId: string, nextClientId: string) => {
    if (!commands) return;
    try {
      await commands.updatePoolOwner(poolId, nextClientId || undefined);
      toast.success(t('pools.toastUpdated'));
    } catch (e: unknown) {
      console.error('Error updating pool owner:', e);
      const err = e as { message?: string; code?: string };
      toast.error(t('pools.toastSaveError'), {
        description: err?.message || err?.code || 'Unknown error',
      });
    }
  };

  const handleAddPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commands) return;
    if (!isAddressValidated && !editingPoolId) {
      if (!confirm(t('pools.confirmSaveWithoutValidation'))) {
        return;
      }
    }
    try {
      const poolData = buildPoolFirestorePayload(draft, { forUpdate: !!editingPoolId });

      if (editingPoolId) {
        await commands.updatePool(editingPoolId, poolData);
        toast.success(t('pools.toastUpdated'));
      } else {
        await commands.createPool(poolData);
        toast.success(t('pools.toastAdded'));
      }
      setDraft(initialPoolDraft());
      setShowPoolForm(false);
      setEditingPoolId(null);
      setIsAddressValidated(false);
    } catch (e: unknown) {
      console.error('Error saving pool:', e);
      const err = e as { message?: string; code?: string };
      toast.error(t('pools.toastSaveError'), {
        description: err?.message || err?.code || 'Unknown error',
      });
    }
  };

  const handleEdit = (pool: PoolRecord) => {
    const clientId = resolveClientDirectoryDocId(clients, pool.clientId);
    setDraft(poolRecordToDraft({ ...pool, clientId }));
    setEditingPoolId(pool.id);
    setShowPoolForm(true);
    setIsAddressValidated(true);
  };

  const deletePool = async (id: string) => {
    if (!commands) return;
    if (confirm(t('pools.confirmDelete'))) {
      await commands.deletePool(id);
      toast.info(t('pools.toastDeleted'));
    }
  };

  const canUseMaps =
    MAPS_INTEGRATION_ENABLED && !!GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'MY_GOOGLE_MAPS_API_KEY';

  if (!commands) {
    return <div className="p-8 text-center text-slate-600">{t('common.loadingGeneric')}</div>;
  }

  if (MAPS_INTEGRATION_ENABLED && !canUseMaps) {
    return <PoolsMissingApiBanner />;
  }

  const content = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-900">{t('pools.title')}</h2>
        <Button
          size="sm"
          onClick={() => {
            setShowPoolForm(true);
            setEditingPoolId(null);
            setDraft(initialPoolDraft());
            setIsAddressValidated(false);
          }}
          className="gap-1"
        >
          <Plus className="w-4 h-4" /> {t('pools.newPool')}
        </Button>
      </div>

      {showPoolForm && (
        <PoolForm
          editingPoolId={editingPoolId}
          draft={draft}
          setDraft={setDraft}
          clients={clients}
          computedPreview={computedPreview}
          isAddressValidated={isAddressValidated}
          setIsAddressValidated={setIsAddressValidated}
          apiError={apiError}
          setApiError={setApiError}
          showPickerMap={showPickerMap}
          mapsEnabled={canUseMaps}
          onSubmit={handleAddPool}
          onCancel={() => {
            setShowPoolForm(false);
            setEditingPoolId(null);
          }}
        />
      )}

      <div className="grid gap-3">
        {pools.map((pool) => (
          <PoolDirectoryRow
            key={pool.id}
            pool={pool}
            clients={clients}
            onOwnerChange={handleQuickOwnerChange}
            onEdit={handleEdit}
            onDelete={deletePool}
          />
        ))}
      </div>
    </div>
  );

  if (!canUseMaps) return content;
  return <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>{content}</APIProvider>;
}
