import React from 'react';
import { Map, Marker } from '@vis.gl/react-google-maps';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Button, Card } from '../../../components/ui/Common';
import type { PoolShape, PoolSystemType, PoolUsage } from '../../../types/pool';
import { MIAMI_CENTER } from '../constants';
import type { PoolDraft } from '../domain/poolDraft';
import type { ClientDirectoryEntry } from '../ports';
import { Geocoder } from './Geocoder';

export interface PoolFormComputedPreview {
  avg: number | null | undefined;
  est: number | null | undefined;
}

export function PoolForm({
  editingPoolId,
  draft,
  setDraft,
  clients,
  computedPreview,
  isAddressValidated,
  setIsAddressValidated,
  apiError,
  setApiError,
  showPickerMap,
  onSubmit,
  onCancel,
}: {
  editingPoolId: string | null;
  draft: PoolDraft;
  setDraft: React.Dispatch<React.SetStateAction<PoolDraft>>;
  clients: ClientDirectoryEntry[];
  computedPreview: PoolFormComputedPreview;
  isAddressValidated: boolean;
  setIsAddressValidated: (v: boolean) => void;
  apiError: string | null;
  setApiError: (v: string | null) => void;
  showPickerMap: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 border-blue-200 bg-blue-50">
      <form onSubmit={onSubmit} className="space-y-4">
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
          <Button variant="outline" type="button" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
