import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  deleteField,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card } from '../components/ui/Common';
import { Plus, Waves, MapPin, Trash2, AlertCircle, Edit2, Search, CheckCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { APIProvider, Map, Marker, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { PoolRecord, PoolShape, PoolSystemType, PoolUsage } from '../types/pool';
import { computeAvgDepthM, estimateVolumeM3 } from '../lib/poolVolume';
import { PoolStatusBadge } from '../components/PoolStatusBadge';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
const MIAMI_CENTER = { lat: 25.7617, lng: -80.1918 };

function Geocoder({
  address,
  onResult,
  setApiError,
}: {
  address: string;
  onResult: (coords: { lat: number; lng: number }) => void;
  setApiError: (error: string | null) => void;
}) {
  const { t } = useTranslation();
  const geocodingLib = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocodingLib) return;
    setGeocoder(new geocodingLib.Geocoder());
  }, [geocodingLib]);

  const handleGeocode = useCallback(async () => {
    if (!geocoder || !address) return;
    setLoading(true);
    try {
      const response = await geocoder.geocode({ address });
      if (response.results && response.results[0]) {
        const location = response.results[0].geometry.location;
        onResult({ lat: location.lat(), lng: location.lng() });
        toast.success(t('pools.geocodeSuccess'));
      } else {
        toast.error(t('pools.geocodeNotFound'));
      }
    } catch (e: any) {
      console.error('Geocoding error:', e);
      const isApiError = e.message?.includes('not activated') || e.code === 'REQUEST_DENIED';

      if (isApiError) {
        setApiError(t('pools.geocodeApiError'));
        toast.error(t('pools.geocodeApiToastTitle'), {
          description: t('pools.geocodeApiToastDescription'),
          duration: 8000,
        });
      } else {
        toast.error(t('pools.geocodeGenericError'));
      }
    } finally {
      setLoading(false);
    }
  }, [geocoder, address, onResult, setApiError, t]);

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleGeocode} disabled={loading || !address} className="gap-2">
        {loading ? t('pools.validating') : <><Search className="w-4 h-4" /> {t('pools.validateAddress')}</>}
      </Button>
      {!geocodingLib && (
        <p className="text-[10px] text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {t('pools.loadingMaps')}
        </p>
      )}
    </div>
  );
}

interface Client {
  id: string;
  name: string;
  role: string;
}

type PoolDraft = {
  name: string;
  address: string;
  clientId: string;
  coordinates: { lat: number; lng: number };
  ownerLabel: string;
  poolSystemType: PoolSystemType;
  usage: PoolUsage;
  shape: PoolShape;
  lengthM: string;
  widthM: string;
  minDepthM: string;
  maxDepthM: string;
  volumeM3: string;
  volumeManualOverride: boolean;
  filterType: string;
  pumpType: string;
  chlorinationSystem: string;
  skimmerType: string;
  lastTechnicalReview: string;
  lastMaintenance: string;
  lastFilterClean: string;
  previousIncidents: string;
};

const DEFAULT_FILTER_TYPE = 'sand';
const DEFAULT_PUMP_TYPE = 'single_speed';
const DEFAULT_CHLORINATION_SYSTEM = 'manual_chlorine';
const DEFAULT_SKIMMER_TYPE = 'surface';

function initialDraft(): PoolDraft {
  return {
    name: '',
    address: '',
    clientId: '',
    coordinates: MIAMI_CENTER,
    ownerLabel: '',
    poolSystemType: 'chlorine',
    usage: 'private',
    shape: 'rectangular',
    lengthM: '',
    widthM: '',
    minDepthM: '',
    maxDepthM: '',
    volumeM3: '',
    volumeManualOverride: false,
    filterType: DEFAULT_FILTER_TYPE,
    pumpType: DEFAULT_PUMP_TYPE,
    chlorinationSystem: DEFAULT_CHLORINATION_SYSTEM,
    skimmerType: DEFAULT_SKIMMER_TYPE,
    lastTechnicalReview: '',
    lastMaintenance: '',
    lastFilterClean: '',
    previousIncidents: '',
  };
}

function parsePositiveNumber(raw: string): number | undefined {
  const v = raw.trim().replace(',', '.');
  if (v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

function cleanOptionalFields<T extends Record<string, unknown>>(obj: T): Partial<T> | undefined {
  const entries = Object.entries(obj).filter(([, value]) => value !== undefined);
  return entries.length ? (Object.fromEntries(entries) as Partial<T>) : undefined;
}

function resolveClientName(
  clients: Client[],
  clientId?: string
): string | undefined {
  if (!clientId) return undefined;
  const c = clients.find((x) => x.id === clientId || (x as { uid?: string }).uid === clientId);
  return c?.name;
}

function deepRemoveUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => deepRemoveUndefined(item));
  }
  if (value && typeof value === 'object') {
    const cleanedEntries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, deepRemoveUndefined(v)] as const);
    return Object.fromEntries(cleanedEntries);
  }
  return value;
}

export default function PoolsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [pools, setPools] = useState<PoolRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PoolDraft>(() => initialDraft());
  const [isAddressValidated, setIsAddressValidated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPickerMap, setShowPickerMap] = useState(false);

  useEffect(() => {
    if (!showPoolForm) {
      setShowPickerMap(false);
      return;
    }

    // Delay mount one frame so the container exists before maps internals observe it.
    const raf = window.requestAnimationFrame(() => setShowPickerMap(true));
    return () => window.cancelAnimationFrame(raf);
  }, [showPoolForm]);

  useEffect(() => {
    if (authLoading || !user) return;

    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      setPools(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PoolRecord)));
    });
    const unsubClients = onSnapshot(collection(db, 'users'), (snap) => {
      // Solo clientes reales: `isClient` también lo tienen admin/worker por el seed y no deben aparecer como propietarios.
      setClients(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Client))
          .filter((c) => c.role === 'client')
      );
    });
    return () => {
      unsubPools();
      unsubClients();
    };
  }, [authLoading, user?.uid]);

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

  const buildFirestorePayload = (): Record<string, unknown> => {
    const L = parsePositiveNumber(draft.lengthM);
    const W = parsePositiveNumber(draft.widthM);
    const minD = parsePositiveNumber(draft.minDepthM);
    const maxD = parsePositiveNumber(draft.maxDepthM);
    const avg = computeAvgDepthM(minD, maxD);
    const manualVol = parsePositiveNumber(draft.volumeM3);
    const est =
      estimateVolumeM3({ shape: draft.shape, lengthM: L, widthM: W, avgDepthM: avg }) ??
      manualVol;

    const volumeM3 = draft.volumeManualOverride ? manualVol ?? est : est ?? manualVol;

    const equipment = cleanOptionalFields({
      filterType: draft.filterType.trim() || undefined,
      pumpType: draft.pumpType.trim() || undefined,
      chlorinationSystem: draft.chlorinationSystem.trim() || undefined,
      skimmerType: draft.skimmerType.trim() || undefined,
      lastTechnicalReview: draft.lastTechnicalReview.trim() || undefined,
    });
    const history = cleanOptionalFields({
      lastMaintenance: draft.lastMaintenance.trim() || undefined,
      lastFilterClean: draft.lastFilterClean.trim() || undefined,
      previousIncidents: draft.previousIncidents.trim() || undefined,
    });

    const rawPayload = {
      name: draft.name.trim(),
      address: draft.address.trim(),
      clientId: draft.clientId || undefined,
      coordinates: draft.coordinates,
      ownerLabel: draft.ownerLabel.trim() || undefined,
      poolSystemType: draft.poolSystemType,
      usage: draft.usage,
      shape: draft.shape,
      lengthM: L,
      widthM: W,
      minDepthM: minD,
      maxDepthM: maxD,
      avgDepthM: avg,
      volumeM3: volumeM3,
      volumeManualOverride: draft.volumeManualOverride,
      equipment,
      history,
    };

    return deepRemoveUndefined(rawPayload) as Record<string, unknown>;
  };

  const handleQuickOwnerChange = async (poolId: string, nextClientId: string) => {
    try {
      await updateDoc(doc(db, 'pools', poolId), {
        clientId: nextClientId ? nextClientId : deleteField(),
      });
      toast.success(t('pools.toastUpdated'));
    } catch (e: any) {
      console.error('Error updating pool owner:', e);
      toast.error(t('pools.toastSaveError'), {
        description: e?.message || e?.code || 'Unknown error',
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
      const poolData = buildFirestorePayload();

      if (editingPoolId) {
        await updateDoc(doc(db, 'pools', editingPoolId), poolData);
        toast.success(t('pools.toastUpdated'));
      } else {
        await addDoc(collection(db, 'pools'), poolData);
        toast.success(t('pools.toastAdded'));
      }
      setDraft(initialDraft());
      setShowPoolForm(false);
      setEditingPoolId(null);
      setIsAddressValidated(false);
    } catch (e: any) {
      console.error('Error saving pool:', e);
      toast.error(t('pools.toastSaveError'), {
        description: e?.message || e?.code || 'Unknown error',
      });
    }
  };

  const handleEdit = (pool: PoolRecord) => {
    setDraft({
      name: pool.name,
      address: pool.address,
      clientId: pool.clientId || '',
      coordinates: pool.coordinates || MIAMI_CENTER,
      ownerLabel: pool.ownerLabel || '',
      poolSystemType: pool.poolSystemType || 'chlorine',
      usage: pool.usage || 'private',
      shape: pool.shape || 'rectangular',
      lengthM: pool.lengthM != null ? String(pool.lengthM) : '',
      widthM: pool.widthM != null ? String(pool.widthM) : '',
      minDepthM: pool.minDepthM != null ? String(pool.minDepthM) : '',
      maxDepthM: pool.maxDepthM != null ? String(pool.maxDepthM) : '',
      volumeM3: pool.volumeM3 != null ? String(pool.volumeM3) : '',
      volumeManualOverride: !!pool.volumeManualOverride,
      filterType: pool.equipment?.filterType || DEFAULT_FILTER_TYPE,
      pumpType: pool.equipment?.pumpType || DEFAULT_PUMP_TYPE,
      chlorinationSystem: pool.equipment?.chlorinationSystem || DEFAULT_CHLORINATION_SYSTEM,
      skimmerType: pool.equipment?.skimmerType || DEFAULT_SKIMMER_TYPE,
      lastTechnicalReview: pool.equipment?.lastTechnicalReview || '',
      lastMaintenance: pool.history?.lastMaintenance || '',
      lastFilterClean: pool.history?.lastFilterClean || '',
      previousIncidents: pool.history?.previousIncidents || '',
    });
    setEditingPoolId(pool.id);
    setShowPoolForm(true);
    setIsAddressValidated(true);
  };

  const deletePool = async (id: string) => {
    if (confirm(t('pools.confirmDelete'))) {
      await deleteDoc(doc(db, 'pools', id));
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
              setDraft(initialDraft());
              setIsAddressValidated(false);
            }}
            className="gap-1"
          >
            <Plus className="w-4 h-4" /> {t('pools.newPool')}
          </Button>
        </div>

        {showPoolForm && (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <form onSubmit={handleAddPool} className="space-y-4">
              <h3 className="font-bold text-blue-900">{editingPoolId ? t('pools.editPool') : t('pools.newPool')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pools.clientPropertyName')}</label>
                    <input
                      type="text"
                      required
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder={t('pools.placeholderProperty')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('poolForm.ownerLabel')}</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      value={draft.ownerLabel}
                      onChange={(e) => setDraft({ ...draft, ownerLabel: e.target.value })}
                      placeholder={t('poolForm.ownerLabelPh')}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('poolForm.systemType')}</label>
                      <select
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        value={draft.poolSystemType}
                        onChange={(e) => setDraft({ ...draft, poolSystemType: e.target.value as PoolSystemType })}
                      >
                        <option value="chlorine">{t('poolForm.system.chlorine')}</option>
                        <option value="salt">{t('poolForm.system.salt')}</option>
                        <option value="natural">{t('poolForm.system.natural')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('poolForm.usage')}</label>
                      <select
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        value={draft.usage}
                        onChange={(e) => setDraft({ ...draft, usage: e.target.value as PoolUsage })}
                      >
                        <option value="private">{t('poolForm.usageOpt.private')}</option>
                        <option value="community">{t('poolForm.usageOpt.community')}</option>
                        <option value="public">{t('poolForm.usageOpt.public')}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pools.fullAddress')}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        className="flex-1 rounded-lg border-slate-200 p-2 text-sm"
                        value={draft.address}
                        onChange={(e) => {
                          setDraft({ ...draft, address: e.target.value });
                          setIsAddressValidated(false);
                        }}
                        placeholder={t('pools.placeholderAddress')}
                      />
                      <Geocoder
                        address={draft.address}
                        onResult={(coords) => {
                          setDraft((prev) => ({ ...prev, coordinates: coords }));
                          setIsAddressValidated(true);
                        }}
                        setApiError={setApiError}
                      />
                    </div>
                    {isAddressValidated && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> {t('pools.validatedOk')}
                      </p>
                    )}
                    {apiError && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-800">
                        <p className="font-bold flex items-center gap-1 mb-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {t('pools.configErrorTitle')}
                        </p>
                        <p className="mb-2 opacity-90">{t('pools.configErrorBody')}</p>
                        <div className="space-y-1">
                          <p className="font-bold">{t('pools.configErrorHowTo')}</p>
                          <ol className="list-decimal list-inside space-y-0.5 opacity-80">
                            <li>
                              <a
                                href="https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com"
                                target="_blank"
                                rel="noreferrer"
                                className="underline font-bold"
                              >
                                {t('pools.configErrorStep1')}
                              </a>
                            </li>
                            <li>{t('pools.configErrorStep2')}</li>
                            <li>{t('pools.configErrorStep3')}</li>
                          </ol>
                        </div>
                        <p className="mt-2 font-bold text-blue-700">{t('pools.configErrorManual')}</p>
                      </div>
                    )}
                    {!isAddressValidated && !apiError && draft.address && (
                      <div className="mt-2 p-2 bg-slate-100 rounded border border-slate-200 text-[10px] text-slate-600">
                        <p className="font-bold flex items-center gap-1 mb-1">
                          <AlertCircle className="w-3 h-3 text-amber-500" /> {t('pools.validationHelpTitle')}
                        </p>
                        <ul className="list-disc list-inside space-y-0.5 opacity-80">
                          <li>{t('pools.validationHelp1')}</li>
                          <li>{t('pools.validationHelp2')}</li>
                        </ul>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pools.ownerClient')}</label>
                    <select
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      value={draft.clientId}
                      onChange={(e) => setDraft({ ...draft, clientId: e.target.value })}
                    >
                      <option value="">{t('pools.noOwner')}</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-blue-100 pt-3 space-y-3">
                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">{t('poolForm.sectionDims')}</p>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('poolForm.shape._')}</label>
                      <select
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        value={draft.shape}
                        onChange={(e) => setDraft({ ...draft, shape: e.target.value as PoolShape })}
                      >
                        <option value="rectangular">{t('poolForm.shape.rectangular')}</option>
                        <option value="oval">{t('poolForm.shape.oval')}</option>
                        <option value="round">{t('poolForm.shape.round')}</option>
                        <option value="irregular">{t('poolForm.shape.irregular')}</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('poolForm.length')}</label>
                        <input
                          className="w-full rounded-lg border-slate-200 p-2 text-sm"
                          value={draft.lengthM}
                          onChange={(e) => setDraft({ ...draft, lengthM: e.target.value })}
                          placeholder="m"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('poolForm.width')}</label>
                        <input
                          className="w-full rounded-lg border-slate-200 p-2 text-sm"
                          value={draft.widthM}
                          onChange={(e) => setDraft({ ...draft, widthM: e.target.value })}
                          placeholder="m"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('poolForm.depthMin')}</label>
                        <input
                          className="w-full rounded-lg border-slate-200 p-2 text-sm"
                          value={draft.minDepthM}
                          onChange={(e) => setDraft({ ...draft, minDepthM: e.target.value })}
                          placeholder="m"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('poolForm.depthMax')}</label>
                        <input
                          className="w-full rounded-lg border-slate-200 p-2 text-sm"
                          value={draft.maxDepthM}
                          onChange={(e) => setDraft({ ...draft, maxDepthM: e.target.value })}
                          placeholder="m"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {t('poolForm.avgDepth')}: <span className="font-black">{computedPreview.avg != null ? `${computedPreview.avg.toFixed(2)} m` : '—'}</span>
                    </p>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={draft.volumeManualOverride}
                        onChange={(e) => setDraft({ ...draft, volumeManualOverride: e.target.checked })}
                      />
                      {t('poolForm.manualVolume')}
                    </label>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('poolForm.volume')}</label>
                      <input
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        value={draft.volumeM3}
                        onChange={(e) => setDraft({ ...draft, volumeM3: e.target.value })}
                        placeholder="m³"
                      />
                    </div>
                  </div>

                  <div className="border-t border-blue-100 pt-3 space-y-3">
                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">{t('poolForm.sectionEquip')}</p>
                    <div className="grid grid-cols-1 gap-2">
                      <select
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        value={draft.filterType}
                        onChange={(e) => setDraft({ ...draft, filterType: e.target.value })}
                      >
                        <option value="sand">{t('poolForm.filterTypeOpt.sand')}</option>
                        <option value="glass">{t('poolForm.filterTypeOpt.glass')}</option>
                        <option value="cartridge">{t('poolForm.filterTypeOpt.cartridge')}</option>
                        <option value="diatomaceous_earth">{t('poolForm.filterTypeOpt.diatomaceous_earth')}</option>
                        <option value="other">{t('poolForm.filterTypeOpt.other')}</option>
                      </select>
                      <select
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        value={draft.pumpType}
                        onChange={(e) => setDraft({ ...draft, pumpType: e.target.value })}
                      >
                        <option value="single_speed">{t('poolForm.pumpTypeOpt.single_speed')}</option>
                        <option value="dual_speed">{t('poolForm.pumpTypeOpt.dual_speed')}</option>
                        <option value="variable_speed">{t('poolForm.pumpTypeOpt.variable_speed')}</option>
                        <option value="other">{t('poolForm.pumpTypeOpt.other')}</option>
                      </select>
                      <select
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        value={draft.chlorinationSystem}
                        onChange={(e) => setDraft({ ...draft, chlorinationSystem: e.target.value })}
                      >
                        <option value="manual_chlorine">{t('poolForm.chlorinationOpt.manual_chlorine')}</option>
                        <option value="salt_chlorinator">{t('poolForm.chlorinationOpt.salt_chlorinator')}</option>
                        <option value="tablet_dispenser">{t('poolForm.chlorinationOpt.tablet_dispenser')}</option>
                        <option value="uv_ozone">{t('poolForm.chlorinationOpt.uv_ozone')}</option>
                        <option value="other">{t('poolForm.chlorinationOpt.other')}</option>
                      </select>
                      <select
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        value={draft.skimmerType}
                        onChange={(e) => setDraft({ ...draft, skimmerType: e.target.value })}
                      >
                        <option value="surface">{t('poolForm.skimmersOpt.surface')}</option>
                        <option value="overflow">{t('poolForm.skimmersOpt.overflow')}</option>
                        <option value="channel">{t('poolForm.skimmersOpt.channel')}</option>
                        <option value="other">{t('poolForm.skimmersOpt.other')}</option>
                      </select>
                      <input
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        placeholder={t('poolForm.lastReview')}
                        value={draft.lastTechnicalReview}
                        onChange={(e) => setDraft({ ...draft, lastTechnicalReview: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="border-t border-blue-100 pt-3 space-y-3">
                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">{t('poolForm.sectionHistory')}</p>
                    <input
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      placeholder={t('poolForm.lastMaintenance')}
                      value={draft.lastMaintenance}
                      onChange={(e) => setDraft({ ...draft, lastMaintenance: e.target.value })}
                    />
                    <input
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      placeholder={t('poolForm.lastFilterClean')}
                      value={draft.lastFilterClean}
                      onChange={(e) => setDraft({ ...draft, lastFilterClean: e.target.value })}
                    />
                    <textarea
                      className="w-full rounded-lg border-slate-200 p-2 text-sm min-h-[72px]"
                      placeholder={t('poolForm.incidents')}
                      value={draft.previousIncidents}
                      onChange={(e) => setDraft({ ...draft, previousIncidents: e.target.value })}
                    />
                  </div>
                </div>
                <div className="h-48 md:h-full min-h-[12rem] rounded-xl overflow-hidden border border-slate-200 relative">
                  {showPickerMap ? (
                    <Map
                      defaultCenter={draft.coordinates ?? MIAMI_CENTER}
                      center={draft.coordinates ?? MIAMI_CENTER}
                      defaultZoom={15}
                      onClick={(e) => {
                        if (e.detail.latLng) {
                          setDraft((prev) => ({ ...prev, coordinates: e.detail.latLng! }));
                          setIsAddressValidated(true);
                        }
                      }}
                    >
                      <Marker
                        position={draft.coordinates ?? MIAMI_CENTER}
                        draggable
                        onDragEnd={(e) => {
                          const latLng = e.latLng;
                          if (!latLng) return;
                          setDraft((prev) => ({
                            ...prev,
                            coordinates: { lat: latLng.lat(), lng: latLng.lng() },
                          }));
                          setIsAddressValidated(true);
                        }}
                      />
                    </Map>
                  ) : (
                    <div className="h-full w-full bg-slate-100 animate-pulse" aria-hidden />
                  )}
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold shadow-sm">
                    {isAddressValidated ? t('pools.mapConfirmed') : t('pools.mapClickAdjust')}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingPoolId ? t('pools.updatePool') : t('pools.savePool')}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setShowPoolForm(false);
                    setEditingPoolId(null);
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </Card>
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
                  value={pool.clientId || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    void handleQuickOwnerChange(pool.id, v);
                  }}
                >
                  <option value="">{t('pools.noOwner')}</option>
                  {pool.clientId && !clients.some((c) => c.id === pool.clientId) ? (
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
