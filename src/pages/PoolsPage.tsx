import React, { useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button, Card } from '../components/ui/Common';
import { Plus, Waves, MapPin, Trash2, AlertCircle, Edit2, Search, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { APIProvider, Map, AdvancedMarker, Pin, useMapsLibrary } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
const MIAMI_CENTER = { lat: 25.7617, lng: -80.1918 };

// Helper component to handle geocoding within the APIProvider
function Geocoder({ address, onResult, setApiError }: { 
  address: string, 
  onResult: (coords: { lat: number, lng: number }) => void,
  setApiError: (error: string | null) => void
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
      <Button 
        type="button" 
        variant="outline" 
        size="sm" 
        onClick={handleGeocode}
        disabled={loading || !address}
        className="gap-2"
      >
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

interface Pool {
  id: string;
  name: string;
  address: string;
  clientId?: string;
  coordinates?: { lat: number; lng: number };
}

interface Client {
  id: string;
  name: string;
  role: string;
}

import { useAuth } from '../contexts/AuthContext';

export default function PoolsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [newPool, setNewPool] = useState({ name: '', address: '', clientId: '', coordinates: MIAMI_CENTER });
  const [isAddressValidated, setIsAddressValidated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      setPools(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pool)));
    });
    const unsubClients = onSnapshot(collection(db, 'users'), (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)).filter(c => c.role === 'client' || (c as any).isClient));
    });
    return () => {
      unsubPools();
      unsubClients();
    };
  }, []);

  const handleAddPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddressValidated && !editingPoolId) {
      if (!confirm(t('pools.confirmSaveWithoutValidation'))) {
        return;
      }
    }
    try {
      const poolData = {
        name: newPool.name,
        address: newPool.address,
        clientId: newPool.clientId,
        coordinates: newPool.coordinates
      };

      if (editingPoolId) {
        await updateDoc(doc(db, 'pools', editingPoolId), poolData);
        toast.success(t('pools.toastUpdated'));
      } else {
        await addDoc(collection(db, 'pools'), poolData);
        toast.success(t('pools.toastAdded'));
      }
      setNewPool({ name: '', address: '', clientId: '', coordinates: MIAMI_CENTER });
      setShowPoolForm(false);
      setEditingPoolId(null);
      setIsAddressValidated(false);
    } catch (e) {
      toast.error(t('pools.toastSaveError'));
    }
  };

  const handleEdit = (pool: Pool) => {
    setNewPool({ 
      name: pool.name, 
      address: pool.address, 
      clientId: pool.clientId || '', 
      coordinates: pool.coordinates || MIAMI_CENTER 
    });
    setEditingPoolId(pool.id);
    setShowPoolForm(true);
    setIsAddressValidated(true); // Assume existing are validated or allow edit
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
        <p className="text-sm text-amber-700">
          {t('pools.missingApiBody')}
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-900">{t('pools.title')}</h2>
          <Button size="sm" onClick={() => {
            setShowPoolForm(true);
            setEditingPoolId(null);
            setNewPool({ name: '', address: '', clientId: '', coordinates: MIAMI_CENTER });
            setIsAddressValidated(false);
          }} className="gap-1">
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
                      value={newPool.name}
                      onChange={e => setNewPool({...newPool, name: e.target.value})}
                      placeholder={t('pools.placeholderProperty')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pools.fullAddress')}</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        required
                        className="flex-1 rounded-lg border-slate-200 p-2 text-sm"
                        value={newPool.address}
                        onChange={e => {
                          setNewPool({...newPool, address: e.target.value});
                          setIsAddressValidated(false);
                        }}
                        placeholder={t('pools.placeholderAddress')}
                      />
                      <Geocoder 
                        address={newPool.address} 
                        onResult={(coords) => {
                          setNewPool(prev => ({ ...prev, coordinates: coords }));
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
                            <li><a href="https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com" target="_blank" className="underline font-bold">{t('pools.configErrorStep1')}</a></li>
                            <li>{t('pools.configErrorStep2')}</li>
                            <li>{t('pools.configErrorStep3')}</li>
                          </ol>
                        </div>
                        <p className="mt-2 font-bold text-blue-700">{t('pools.configErrorManual')}</p>
                      </div>
                    )}
                    {!isAddressValidated && !apiError && newPool.address && (
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
                      value={newPool.clientId}
                      onChange={e => setNewPool({...newPool, clientId: e.target.value})}
                    >
                      <option value="">{t('pools.noOwner')}</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="h-48 rounded-xl overflow-hidden border border-slate-200 relative">
                  <Map
                    defaultCenter={newPool.coordinates}
                    center={newPool.coordinates}
                    defaultZoom={15}
                    mapId="pool_picker_map"
                    onClick={(e) => {
                      if (e.detail.latLng) {
                        setNewPool(prev => ({ ...prev, coordinates: e.detail.latLng! }));
                        setIsAddressValidated(true);
                      }
                    }}
                  >
                    <AdvancedMarker position={newPool.coordinates}>
                      <Pin background={'#2563eb'} glyphColor={'#fff'} borderColor={'#000'} />
                    </AdvancedMarker>
                  </Map>
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold shadow-sm">
                    {isAddressValidated ? t('pools.mapConfirmed') : t('pools.mapClickAdjust')}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{editingPoolId ? t('pools.updatePool') : t('pools.savePool')}</Button>
                <Button variant="outline" onClick={() => {
                  setShowPoolForm(false);
                  setEditingPoolId(null);
                }}>{t('common.cancel')}</Button>
              </div>
            </form>
          </Card>
        )}

        <div className="grid gap-3">
          {pools.map(pool => (
            <Card key={pool.id} className="p-4 flex justify-between items-center hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{pool.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {pool.address}
                  </p>
                  {pool.clientId && (
                    <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase">
                      {t('pools.propLabel')} {clients.find(c => c.id === pool.clientId)?.name || t('pools.loadingName')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(pool)} 
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deletePool(pool.id)} 
                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                >
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
