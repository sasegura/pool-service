import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button, Card } from '../components/ui/Common';
import { Plus, Waves, MapPin, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
const MIAMI_CENTER = { lat: 25.7617, lng: -80.1918 };

interface Pool {
  id: string;
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}

export default function PoolsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [newPool, setNewPool] = useState({ name: '', address: '', coordinates: MIAMI_CENTER });

  useEffect(() => {
    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      setPools(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pool)));
    });
    return () => unsubPools();
  }, []);

  const handleAddPool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'pools'), newPool);
      setNewPool({ name: '', address: '', coordinates: MIAMI_CENTER });
      setShowPoolForm(false);
      toast.success('Piscina añadida');
    } catch (e) {
      toast.error('Error al añadir piscina');
    }
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
          <Button size="sm" onClick={() => setShowPoolForm(true)} className="gap-1">
            <Plus className="w-4 h-4" /> Nueva Piscina
          </Button>
        </div>

        {showPoolForm && (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <form onSubmit={handleAddPool} className="space-y-4">
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
                    <input 
                      type="text" 
                      required
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      value={newPool.address}
                      onChange={e => setNewPool({...newPool, address: e.target.value})}
                      placeholder="Calle, Ciudad, FL"
                    />
                  </div>
                </div>
                <div className="h-48 rounded-xl overflow-hidden border border-slate-200 relative">
                  <Map
                    defaultCenter={MIAMI_CENTER}
                    defaultZoom={11}
                    mapId="pool_picker_map"
                    onClick={(e) => {
                      if (e.detail.latLng) {
                        setNewPool(prev => ({ ...prev, coordinates: e.detail.latLng! }));
                      }
                    }}
                  >
                    <AdvancedMarker position={newPool.coordinates}>
                      <Pin background={'#2563eb'} glyphColor={'#fff'} borderColor={'#000'} />
                    </AdvancedMarker>
                  </Map>
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold shadow-sm">
                    Haz clic para ubicar
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Guardar Piscina</Button>
                <Button variant="outline" onClick={() => setShowPoolForm(false)}>Cancelar</Button>
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
                </div>
              </div>
              <button 
                onClick={() => deletePool(pool.id)} 
                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      </div>
    </APIProvider>
  );
}
