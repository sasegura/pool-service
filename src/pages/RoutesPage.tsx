import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, doc, deleteDoc, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button, Card } from '../components/ui/Common';
import { cn } from '../lib/utils';
import { Plus, Calendar, Trash2, Map as MapIcon, List, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
const MIAMI_CENTER = { lat: 25.7617, lng: -80.1918 };

interface Pool {
  id: string;
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}

interface Worker {
  id: string;
  name: string;
  role: string;
}

interface Route {
  id: string;
  workerId: string;
  date: string;
  poolIds: string[];
  status: 'pending' | 'in-progress' | 'completed';
}

export default function RoutesPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [newRoute, setNewRoute] = useState({ workerId: '', date: format(new Date(), 'yyyy-MM-dd'), poolIds: [] as string[] });
  const [routeViewMode, setRouteViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      setPools(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pool)));
    });
    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      setWorkers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Worker)).filter(w => w.role === 'worker'));
    });
    const unsubRoutes = onSnapshot(collection(db, 'routes'), (snap) => {
      setRoutes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Route)));
    });

    return () => {
      unsubPools();
      unsubUsers();
      unsubRoutes();
    };
  }, []);

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoute.workerId || newRoute.poolIds.length === 0) {
      toast.error('Selecciona un trabajador y al menos una piscina');
      return;
    }
    try {
      await addDoc(collection(db, 'routes'), {
        ...newRoute,
        status: 'pending'
      });
      setNewRoute({ workerId: '', date: format(new Date(), 'yyyy-MM-dd'), poolIds: [] });
      setShowRouteForm(false);
      toast.success('Ruta asignada');
    } catch (e) {
      toast.error('Error al asignar ruta');
    }
  };

  const togglePoolInRoute = (poolId: string) => {
    setNewRoute(prev => {
      const exists = prev.poolIds.indexOf(poolId);
      if (exists > -1) {
        return { ...prev, poolIds: prev.poolIds.filter(id => id !== poolId) };
      } else {
        return { ...prev, poolIds: [...prev.poolIds, poolId] };
      }
    });
  };

  const deleteRoute = async (id: string) => {
    if (confirm('¿Eliminar esta ruta?')) {
      await deleteDoc(doc(db, 'routes', id));
      toast.info('Ruta eliminada');
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
          <h2 className="text-2xl font-black text-slate-900">Gestión de Rutas</h2>
          <Button size="sm" onClick={() => setShowRouteForm(true)} className="gap-1">
            <Plus className="w-4 h-4" /> Nueva Ruta
          </Button>
        </div>

        {showRouteForm && (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <form onSubmit={handleAddRoute} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trabajador</label>
                  <select 
                    className="w-full rounded-lg border-slate-200 p-2 text-sm"
                    value={newRoute.workerId}
                    onChange={e => setNewRoute({...newRoute, workerId: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
                  <input 
                    type="date" 
                    className="w-full rounded-lg border-slate-200 p-2 text-sm"
                    value={newRoute.date}
                    onChange={e => setNewRoute({...newRoute, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 uppercase">Selección de Piscinas (Orden de parada)</label>
                <div className="flex bg-white p-0.5 rounded-lg border border-slate-200">
                  <button 
                    type="button"
                    onClick={() => setRouteViewMode('list')}
                    className={cn("p-1.5 rounded-md", routeViewMode === 'list' ? "bg-blue-50 text-blue-600" : "text-slate-400")}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRouteViewMode('map')}
                    className={cn("p-1.5 rounded-md", routeViewMode === 'map' ? "bg-blue-50 text-blue-600" : "text-slate-400")}
                  >
                    <MapIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {routeViewMode === 'list' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                  {pools.map(p => (
                    <label key={p.id} className={cn(
                      "flex items-center gap-2 text-sm p-2 rounded-lg cursor-pointer transition-colors",
                      newRoute.poolIds.includes(p.id) ? "bg-blue-50 border-blue-200 border" : "bg-slate-50 border-transparent border"
                    )}>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={newRoute.poolIds.includes(p.id)}
                        onChange={() => togglePoolInRoute(p.id)}
                      />
                      <div className="flex-1">
                        <div className="font-bold">{p.name}</div>
                        {newRoute.poolIds.includes(p.id) && (
                          <div className="text-[10px] text-blue-600 font-black">PARADA #{newRoute.poolIds.indexOf(p.id) + 1}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="h-64 rounded-xl overflow-hidden border border-slate-200 relative">
                  <Map
                    defaultCenter={MIAMI_CENTER}
                    defaultZoom={11}
                    mapId="route_creation_map"
                  >
                    {pools.map((p) => (
                      <AdvancedMarker
                        key={p.id}
                        position={p.coordinates || MIAMI_CENTER}
                        onClick={() => togglePoolInRoute(p.id)}
                      >
                        <Pin 
                          background={newRoute.poolIds.includes(p.id) ? '#2563eb' : '#94a3b8'} 
                          glyphColor={'#fff'} 
                          borderColor={'#000'}
                        >
                          {newRoute.poolIds.includes(p.id) ? (newRoute.poolIds.indexOf(p.id) + 1).toString() : ''}
                        </Pin>
                      </AdvancedMarker>
                    ))}
                  </Map>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Guardar Ruta</Button>
                <Button variant="outline" onClick={() => setShowRouteForm(false)}>Cancelar</Button>
              </div>
            </form>
          </Card>
        )}

        <div className="grid gap-4">
          {routes.map(route => {
            const worker = workers.find(w => w.id === route.workerId);
            return (
              <Card key={route.id} className="p-4 hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg">
                      <Calendar className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{worker?.name || 'Desconocido'}</h4>
                      <p className="text-xs text-slate-500">{route.date} • {route.poolIds.length} piscinas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase",
                      route.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                      route.status === 'in-progress' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {route.status}
                    </div>
                    <button onClick={() => deleteRoute(route.id)} className="p-1 text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </APIProvider>
  );
}
