import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card } from '../components/ui/Common';
import { Plus, Waves, MapPin, Trash2, AlertCircle, Edit2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { APIProvider } from '@vis.gl/react-google-maps';
import type { PoolRecord } from '../types/pool';
import { computeAvgDepthM, estimateVolumeM3 } from '../lib/poolVolume';
import { PoolStatusBadge } from '../components/PoolStatusBadge';
import { getGoogleMapsApiKey } from '../config/env';
import { initialPoolDraft, parsePositiveNumber, type PoolDraft } from '../features/pools/domain/poolDraft';
import {
  isPoolClientInDirectory,
  resolveClientDirectoryDocId,
  resolveClientName,
} from '../features/pools/domain/poolClients';
import { buildPoolFirestorePayload } from '../features/pools/mappers/poolFirestoreMapper';
import { poolRecordToDraft } from '../features/pools/mappers/poolRecordToDraft';
import { usePoolsDirectory } from '../features/pools/hooks/usePoolsDirectory';
import { PoolForm } from '../features/pools/components/PoolForm';

const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();

export default function PoolsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { pools, clients, repository } = usePoolsDirectory(!authLoading && !!user);
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
    try {
      await repository.updatePoolOwner(poolId, nextClientId || undefined);
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
    if (!isAddressValidated && !editingPoolId) {
      if (!confirm(t('pools.confirmSaveWithoutValidation'))) {
        return;
      }
    }
    try {
      const poolData = buildPoolFirestorePayload(draft, { forUpdate: !!editingPoolId });

      if (editingPoolId) {
        await repository.updatePool(editingPoolId, poolData);
        toast.success(t('pools.toastUpdated'));
      } else {
        await repository.createPool(poolData);
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
    if (confirm(t('pools.confirmDelete'))) {
      await repository.deletePool(id);
      toast.info(t('pools.toastDeleted'));
    }
  };

  const isInvalidKey = !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'MY_GOOGLE_MAPS_API_KEY';

  if (isInvalidKey) {
    return (
      <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200">
        <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-amber-900 mb-2">{t('pools.missingApiTitle')}</h2>
        <p className="text-sm text-amber-700">{t('pools.missingApiBody')}</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
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
            onSubmit={handleAddPool}
            onCancel={() => {
              setShowPoolForm(false);
              setEditingPoolId(null);
            }}
          />
        )}

        <div className="grid gap-3">
          {pools.map((pool) => (
            <Card key={pool.id} className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:border-blue-200 transition-colors gap-3">
              <Link to={`/pools/${pool.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600 shrink-0">
                  <Waves className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-slate-900">{pool.name}</h4>
                    <PoolStatusBadge status={pool.healthStatus} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" /> {pool.address}
                  </p>
                  {pool.clientId && (
                    <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase truncate">
                      {t('pools.propLabel')}{' '}
                      {resolveClientName(clients, pool.clientId) || t('pools.loadingName')}
                    </p>
                  )}
                  {pool.volumeM3 != null && pool.volumeM3 > 0 && (
                    <p className="text-[10px] text-slate-500 font-bold mt-1">{pool.volumeM3.toFixed(1)} m³</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
              </Link>
              <div className="flex flex-col gap-2 shrink-0 w-full sm:w-48">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  {t('pools.ownerClient')}
                </label>
                <select
                  className="w-full rounded-lg border-slate-200 p-2 text-sm bg-white"
                  value={resolveClientDirectoryDocId(clients, pool.clientId)}
                  onChange={(e) => {
                    const v = e.target.value;
                    void handleQuickOwnerChange(pool.id, v);
                  }}
                >
                  <option value="">{t('pools.noOwner')}</option>
                  {pool.clientId && !isPoolClientInDirectory(clients, pool.clientId) ? (
                    <option value={pool.clientId}>
                      {resolveClientName(clients, pool.clientId) || `${pool.clientId.slice(0, 8)}…`}
                    </option>
                  ) : null}
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => handleEdit(pool)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => deletePool(pool.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </APIProvider>
  );
}
