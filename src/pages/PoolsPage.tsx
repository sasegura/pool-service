import React, { useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button, Card } from '../components/ui/Common';
import { Plus, Waves, MapPin, Trash2, AlertCircle, Edit2, Search, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { APIProvider, Map, AdvancedMarker, Pin, useMapsLibrary } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
const MIAMI_CENTER = { lat: 25.7617, lng: -80.1918 };

// Helper component to handle geocoding within the APIProvider
function Geocoder({ address, onResult, setApiError }: { 
  address: string, 
  onResult: (coords: { lat: number, lng: number }) => void,
  setApiError: (error: string | null) => void
}) {
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
        toast.success('Dirección validada y ubicada en el mapa');
      } else {
        toast.error('No se pudo encontrar la ubicación para esa dirección');
      }
    } catch (e: any) {
      console.error('Geocoding error:', e);
      const isApiError = e.message?.includes('not activated') || e.code === 'REQUEST_DENIED';
      
      if (isApiError) {
        setApiError('La API de Geocoding no está activa o permitida en tu consola de Google Cloud.');
        toast.error('Error de configuración de Google Maps', {
          description: 'La API de Geocoding no está activa o permitida. Por favor, actívala en tu consola de Google Cloud.',
          duration: 8000,
        });
      } else {
        toast.error('Error al validar la dirección. Intenta ser más específico.');
      }
    } finally {
      setLoading(false);
    }
  }, [geocoder, address, onResult]);

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
        {loading ? 'Validando...' : <><Search className="w-4 h-4" /> Validar Dirección</>}
      </Button>
      {!geocodingLib && (
        <p className="text-[10px] text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Cargando servicios de mapas...
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
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)).filter(c => c.role === 'client'));
    });
    return () => {
      unsubPools();
      unsubClients();
    };
  }, []);

  const handleAddPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddressValidated && !editingPoolId) {
      if (!confirm('La dirección no ha sido validada en el mapa. ¿Deseas guardar de todas formas?')) {
        return;
      }
    }
    try {
      if (editingPoolId) {
        await updateDoc(doc(db, 'pools', editingPoolId), newPool);
        toast.success('Piscina actualizada');
      } else {
        await addDoc(collection(db, 'pools'), newPool);
        toast.success('Piscina añadida');
      }
      setNewPool({ name: '', address: '', clientId: '', coordinates: MIAMI_CENTER });
      setShowPoolForm(false);
      setEditingPoolId(null);
      setIsAddressValidated(false);
    } catch (e) {
      toast.error('Error al guardar piscina');
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
    if (confirm('¿Estás seguro de eliminar esta piscina?')) {
      await deleteDoc(doc(db, 'pools', id));
      toast.info('Piscina eliminada');
    }
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200">
        <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-amber-900 mb-2">Falta la API Key de Google Maps</h2>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-900">Gestión de Piscinas</h2>
          <Button size="sm" onClick={() => {
            setShowPoolForm(true);
            setEditingPoolId(null);
            setNewPool({ name: '', address: '', clientId: '', coordinates: MIAMI_CENTER });
            setIsAddressValidated(false);
          }} className="gap-1">
            <Plus className="w-4 h-4" /> Nueva Piscina
          </Button>
        </div>

        {showPoolForm && (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <form onSubmit={handleAddPool} className="space-y-4">
              <h3 className="font-bold text-blue-900">{editingPoolId ? 'Editar Piscina' : 'Nueva Piscina'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Cliente / Propiedad</label>
                    <input 
                      type="text" 
                      required
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      value={newPool.name}
                      onChange={e => setNewPool({...newPool, name: e.target.value})}
                      placeholder="Ej: Residencia Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección Completa</label>
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
                        placeholder="Calle, Ciudad, FL"
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
                        <CheckCircle className="w-3 h-3" /> Dirección validada correctamente
                      </p>
                    )}
                    {apiError && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-800">
                        <p className="font-bold flex items-center gap-1 mb-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Error de Configuración (Google Cloud)
                        </p>
                        <p className="mb-2 opacity-90">La validación automática no funciona porque la <strong>Geocoding API</strong> no está habilitada en tu cuenta de Google.</p>
                        <div className="space-y-1">
                          <p className="font-bold">Cómo solucionarlo:</p>
                          <ol className="list-decimal list-inside space-y-0.5 opacity-80">
                            <li>Ve a <a href="https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com" target="_blank" className="underline font-bold">Google Cloud Console</a>.</li>
                            <li>Haz clic en <strong>HABILITAR</strong>.</li>
                            <li>Revisa que tu API Key no tenga restricciones de IP/URL que bloqueen esta web.</li>
                          </ol>
                        </div>
                        <p className="mt-2 font-bold text-blue-700">Mientras tanto: Haz clic directamente en el mapa para ubicar la piscina manualmente.</p>
                      </div>
                    )}
                    {!isAddressValidated && !apiError && newPool.address && (
                      <div className="mt-2 p-2 bg-slate-100 rounded border border-slate-200 text-[10px] text-slate-600">
                        <p className="font-bold flex items-center gap-1 mb-1">
                          <AlertCircle className="w-3 h-3 text-amber-500" /> ¿Problemas con la validación?
                        </p>
                        <ul className="list-disc list-inside space-y-0.5 opacity-80">
                          <li>Asegúrate de incluir ciudad y estado (ej: Miami, FL).</li>
                          <li>Si el botón falla, puedes <strong>hacer clic directamente en el mapa</strong> para ubicar la piscina.</li>
                        </ul>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Propietario (Cliente)</label>
                    <select 
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      value={newPool.clientId}
                      onChange={e => setNewPool({...newPool, clientId: e.target.value})}
                    >
                      <option value="">Sin propietario asignado</option>
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
                    {isAddressValidated ? 'Ubicación confirmada' : 'Haz clic para ajustar ubicación'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{editingPoolId ? 'Actualizar' : 'Guardar'} Piscina</Button>
                <Button variant="outline" onClick={() => {
                  setShowPoolForm(false);
                  setEditingPoolId(null);
                }}>Cancelar</Button>
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
                      Prop: {clients.find(c => c.id === pool.clientId)?.name || 'Cargando...'}
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
