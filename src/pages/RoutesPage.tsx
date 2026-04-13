import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, doc, deleteDoc, query, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button, Card } from '../components/ui/Common';
import { cn } from '../lib/utils';
import { Plus, Calendar, Trash2, Map as MapIcon, List, AlertCircle, Edit2, Sparkles, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { optimizeRoute } from '../services/geminiService';

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
  workerId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  daysOfWeek?: number[];
  routeName?: string;
  poolIds: string[];
  status: 'pending' | 'in-progress' | 'completed';
  order?: number;
  assignedDay?: number;
  createdAt?: string;
}

import { useAuth } from '../contexts/AuthContext';

export default function RoutesPage() {
  const { user, loading: authLoading } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [newRoute, setNewRoute] = useState({ 
    workerId: '', 
    date: format(new Date(), 'yyyy-MM-dd'), 
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly',
    daysOfWeek: [] as number[],
    poolIds: [] as string[],
    routeName: '',
    noDate: false,
    noWorker: false,
    isScheduled: false
  });
  const [routeViewMode, setRouteViewMode] = useState<'list' | 'map'>('list');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const selectedRoutePools = (selectedRoute?.poolIds || []).map(id => pools.find(p => p.id === id)).filter(Boolean) as Pool[];
  
  const mapCenter = selectedRoutePools.length > 0 && selectedRoutePools[0].coordinates 
    ? selectedRoutePools[0].coordinates 
    : MIAMI_CENTER;

  useEffect(() => {
    if (authLoading || !user) return;

    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      setPools(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pool)));
    });
    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      console.log('RoutesPage: Total users in DB:', users.length);
      const filteredWorkers = users.filter((u: any) => u.role === 'worker' || u.isWorker);
      console.log('RoutesPage: Filtered workers:', filteredWorkers.map(w => `${w.name} (${w.id})`));
      setWorkers(filteredWorkers);
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
    if (newRoute.poolIds.length === 0) {
      toast.error('Selecciona al menos una piscina');
      return;
    }
    try {
      const routeToSave: any = {
        poolIds: newRoute.poolIds,
        routeName: newRoute.routeName || '',
        workerId: newRoute.noWorker ? '' : newRoute.workerId,
        status: 'pending'
      };

      if (newRoute.isScheduled) {
        routeToSave.startDate = newRoute.startDate;
        routeToSave.endDate = newRoute.endDate;
        routeToSave.recurrence = newRoute.recurrence;
        routeToSave.daysOfWeek = newRoute.daysOfWeek;
        routeToSave.date = ''; // Clear specific date if scheduled
      } else {
        routeToSave.date = newRoute.noDate ? '' : newRoute.date;
        routeToSave.recurrence = 'none';
      }

      console.log('RoutesPage: Saving route:', routeToSave);

      if (editingRouteId) {
        await updateDoc(doc(db, 'routes', editingRouteId), routeToSave);
        toast.success('Ruta actualizada');
      } else {
        const templatesCount = routes.filter(r => !r.date && !r.startDate).length;
        routeToSave.createdAt = new Date().toISOString();
        routeToSave.order = templatesCount;
        await addDoc(collection(db, 'routes'), routeToSave);
        toast.success('Ruta guardada');
      }
      setNewRoute({ 
        workerId: '', 
        date: format(new Date(), 'yyyy-MM-dd'), 
        poolIds: [], 
        routeName: '',
        noDate: false,
        noWorker: false
      });
      setShowRouteForm(false);
      setEditingRouteId(null);
    } catch (e) {
      toast.error('Error al guardar ruta');
    }
  };

  const handleEdit = (route: Route) => {
    setNewRoute({ 
      workerId: route.workerId || '', 
      date: route.date || format(new Date(), 'yyyy-MM-dd'), 
      startDate: route.startDate || format(new Date(), 'yyyy-MM-dd'),
      endDate: route.endDate || format(new Date(), 'yyyy-MM-dd'),
      recurrence: route.recurrence || 'none',
      daysOfWeek: route.daysOfWeek || [],
      poolIds: route.poolIds,
      routeName: route.routeName || '',
      noDate: !route.date && !route.startDate,
      noWorker: !route.workerId,
      isScheduled: !!route.startDate
    });
    setEditingRouteId(route.id);
    setShowRouteForm(true);
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

  const getAssignedRoute = (poolId: string) => {
    const assignedRoute = routes.find(r => 
      r.date === newRoute.date && 
      r.poolIds.includes(poolId) && 
      r.id !== editingRouteId
    );
    if (!assignedRoute) return null;
    const worker = workers.find(w => w.id === assignedRoute.workerId);
    return worker ? worker.name : 'Otra ruta';
  };

  const deleteRoute = async (id: string) => {
    if (confirm('¿Eliminar esta ruta?')) {
      await deleteDoc(doc(db, 'routes', id));
      toast.info('Ruta eliminada');
    }
  };

  const handleOptimize = async () => {
    if (newRoute.poolIds.length < 2) {
      toast.error('Selecciona al menos 2 piscinas para optimizar');
      return;
    }

    setIsOptimizing(true);
    try {
      const selectedPools = newRoute.poolIds
        .map(id => pools.find(p => p.id === id))
        .filter(Boolean) as any[];
      
      const optimizedIds = await optimizeRoute(selectedPools);
      setNewRoute(prev => ({ ...prev, poolIds: optimizedIds }));
      toast.success('Ruta optimizada con IA');
    } catch (error) {
      toast.error('Error al optimizar la ruta');
    } finally {
      setIsOptimizing(false);
    }
  };

  const movePool = (index: number, direction: 'up' | 'down') => {
    setNewRoute(prev => {
      const newPoolIds = [...prev.poolIds];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newPoolIds.length) return prev;
      
      const temp = newPoolIds[index];
      newPoolIds[index] = newPoolIds[targetIndex];
      newPoolIds[targetIndex] = temp;
      
      return { ...prev, poolIds: newPoolIds };
    });
  };

  const moveRouteTemplate = async (index: number, direction: 'up' | 'down') => {
    const templates = routes
      .filter(r => !r.date && !r.startDate)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= templates.length) return;

    const current = templates[index];
    const target = templates[targetIndex];

    try {
      await updateDoc(doc(db, 'routes', current.id), { order: targetIndex });
      await updateDoc(doc(db, 'routes', target.id), { order: index });
      toast.success('Orden actualizado');
    } catch (e) {
      toast.error('Error al reordenar');
    }
  };

  const assignRouteToDay = async (routeId: string, day: number) => {
    try {
      // Clear previous assignment for this day if any
      const existing = routes.find(r => r.assignedDay === day);
      if (existing && existing.id !== routeId) {
        await updateDoc(doc(db, 'routes', existing.id), { assignedDay: null });
      }
      
      await updateDoc(doc(db, 'routes', routeId), { assignedDay: day });
      toast.success('Día asignado');
    } catch (e) {
      toast.error('Error al asignar día');
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
          <Button size="sm" onClick={() => {
            setShowRouteForm(true);
            setEditingRouteId(null);
            setNewRoute({ 
              workerId: '', 
              date: format(new Date(), 'yyyy-MM-dd'), 
              startDate: format(new Date(), 'yyyy-MM-dd'),
              endDate: format(new Date(), 'yyyy-MM-dd'),
              recurrence: 'none',
              daysOfWeek: [],
              poolIds: [], 
              routeName: '',
              noDate: false,
              noWorker: false,
              isScheduled: false
            });
          }} className="gap-1">
            <Plus className="w-4 h-4" /> Nueva Ruta
          </Button>
        </div>

        {showRouteForm && (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <form onSubmit={handleAddRoute} className="space-y-4">
              <h3 className="font-bold text-blue-900">{editingRouteId ? 'Editar Ruta' : 'Nueva Ruta'}</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la Ruta (Opcional)</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border-slate-200 p-2 text-sm"
                  placeholder="Ej: Ruta Norte, Ruta Especial..."
                  value={newRoute.routeName}
                  onChange={e => setNewRoute({...newRoute, routeName: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-blue-100 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newRoute.isScheduled}
                    onChange={e => setNewRoute({...newRoute, isScheduled: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-slate-700">Habilitar Planificación (Ruta Recurrente)</span>
                </label>
              </div>

              {newRoute.isScheduled ? (
                <div className="space-y-4 p-4 bg-white rounded-xl border border-blue-100 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Inicio</label>
                      <input 
                        type="date" 
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        value={newRoute.startDate}
                        onChange={e => setNewRoute({...newRoute, startDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Fin</label>
                      <input 
                        type="date" 
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        value={newRoute.endDate}
                        onChange={e => setNewRoute({...newRoute, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Recurrencia</label>
                    <select 
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      value={newRoute.recurrence}
                      onChange={e => setNewRoute({...newRoute, recurrence: e.target.value as any})}
                    >
                      <option value="none">Sin repetición (Rango de fechas)</option>
                      <option value="daily">Diaria</option>
                      <option value="weekly">Semanal</option>
                      <option value="bi-weekly">Quincenal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>

                  {newRoute.recurrence === 'weekly' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Días de la semana</label>
                      <div className="flex flex-wrap gap-2">
                        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const current = newRoute.daysOfWeek;
                              const next = current.includes(i) ? current.filter(d => d !== i) : [...current, i];
                              setNewRoute({...newRoute, daysOfWeek: next});
                            }}
                            className={cn(
                              "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                              newRoute.daysOfWeek.includes(i) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-500 uppercase">Trabajador</label>
                      <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newRoute.noWorker} 
                          onChange={e => setNewRoute({...newRoute, noWorker: e.target.checked})}
                          className="rounded border-slate-300"
                        /> Sin asignar
                      </label>
                    </div>
                    <select 
                      className="w-full rounded-lg border-slate-200 p-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                      value={newRoute.workerId}
                      onChange={e => setNewRoute({...newRoute, workerId: e.target.value})}
                      disabled={newRoute.noWorker}
                    >
                      <option value="">Seleccionar...</option>
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.id === user.uid ? '(Tú)' : ''} - {w.id.substring(0, 6)}...
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-500 uppercase">Fecha</label>
                      <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newRoute.noDate} 
                          onChange={e => setNewRoute({...newRoute, noDate: e.target.checked})}
                          className="rounded border-slate-300"
                        /> Sin fecha
                      </label>
                    </div>
                    <input 
                      type="date" 
                      className="w-full rounded-lg border-slate-200 p-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                      value={newRoute.date}
                      onChange={e => setNewRoute({...newRoute, date: e.target.value})}
                      disabled={newRoute.noDate}
                    />
                  </div>
                </div>
              )}

              {newRoute.isScheduled && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Trabajador Asignado</label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newRoute.noWorker} 
                        onChange={e => setNewRoute({...newRoute, noWorker: e.target.checked})}
                        className="rounded border-slate-300"
                      /> Sin asignar
                    </label>
                  </div>
                  <select 
                    className="w-full rounded-lg border-slate-200 p-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                    value={newRoute.workerId}
                    onChange={e => setNewRoute({...newRoute, workerId: e.target.value})}
                    disabled={newRoute.noWorker}
                  >
                    <option value="">Seleccionar...</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.id === user.uid ? '(Tú)' : ''} - {w.id.substring(0, 6)}...
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 uppercase">Selección de Piscinas (Orden de parada)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOptimize}
                    disabled={isOptimizing || newRoute.poolIds.length < 2}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    {isOptimizing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    OPTIMIZAR CON IA
                  </button>
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
              </div>

              {routeViewMode === 'list' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                    {pools.map(p => {
                      const assignedTo = getAssignedRoute(p.id);
                      const isSelected = newRoute.poolIds.includes(p.id);
                      
                      return (
                        <label key={p.id} className={cn(
                          "flex items-center gap-2 text-sm p-2 rounded-lg cursor-pointer transition-colors relative",
                          isSelected ? "bg-blue-50 border-blue-200 border" : "bg-slate-50 border-transparent border",
                          assignedTo && !isSelected ? "opacity-60" : ""
                        )}>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={isSelected}
                            onChange={() => togglePoolInRoute(p.id)}
                          />
                          <div className="flex-1">
                            <div className="font-bold flex items-center justify-between">
                              <span>{p.name}</span>
                              {assignedTo && (
                                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <AlertCircle className="w-2.5 h-2.5" /> {assignedTo}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {newRoute.poolIds.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Orden de Paradas (Arrastra o usa flechas)</label>
                      <div className="space-y-1">
                        {newRoute.poolIds.map((id, index) => {
                          const pool = pools.find(p => p.id === id);
                          return (
                            <div key={id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-sm">
                              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                                {index + 1}
                              </span>
                              <span className="flex-1 font-medium text-slate-700">{pool?.name || 'Cargando...'}</span>
                              <div className="flex gap-1">
                                <button 
                                  type="button"
                                  onClick={() => movePool(index, 'up')}
                                  disabled={index === 0}
                                  className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => movePool(index, 'down')}
                                  disabled={index === newRoute.poolIds.length - 1}
                                  className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-64 rounded-xl overflow-hidden border border-slate-200 relative">
                  <Map
                    defaultCenter={MIAMI_CENTER}
                    defaultZoom={11}
                    mapId="route_creation_map"
                  >
                    {pools.map((p) => {
                      const assignedTo = getAssignedRoute(p.id);
                      const isSelected = newRoute.poolIds.includes(p.id);
                      
                      return (
                        <AdvancedMarker
                          key={p.id}
                          position={p.coordinates || MIAMI_CENTER}
                          onClick={() => togglePoolInRoute(p.id)}
                        >
                          <Pin 
                            background={isSelected ? '#2563eb' : assignedTo ? '#f59e0b' : '#94a3b8'} 
                            glyphColor={'#fff'} 
                            borderColor={'#000'}
                          >
                            {isSelected ? (newRoute.poolIds.indexOf(p.id) + 1).toString() : assignedTo ? '!' : ''}
                          </Pin>
                        </AdvancedMarker>
                      );
                    })}
                  </Map>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{editingRouteId ? 'Actualizar' : 'Guardar'} Ruta</Button>
                <Button variant="outline" onClick={() => {
                  setShowRouteForm(false);
                  setEditingRouteId(null);
                }}>Cancelar</Button>
              </div>
            </form>
          </Card>
        )}

        {selectedRouteId && !showRouteForm && (
          <Card className="p-4 border-blue-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-blue-600" />
                Visualización de Ruta: {workers.find(w => w.id === routes.find(r => r.id === selectedRouteId)?.workerId)?.name}
              </h3>
              <Button variant="outline" size="sm" onClick={() => setSelectedRouteId(null)}>Cerrar Mapa</Button>
            </div>
            <div className="h-80 rounded-xl overflow-hidden border border-slate-200">
              <Map
                key={selectedRouteId}
                defaultCenter={mapCenter}
                defaultZoom={12}
                mapId="route_view_map"
              >
                {selectedRoutePools.map((pool, index) => (
                  <AdvancedMarker
                    key={`${selectedRouteId}-${pool.id}`}
                    position={pool.coordinates || MIAMI_CENTER}
                  >
                    <Pin 
                      background={'#2563eb'} 
                      glyphColor={'#fff'} 
                      borderColor={'#000'}
                    >
                      {(index + 1).toString()}
                    </Pin>
                  </AdvancedMarker>
                ))}
              </Map>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {routes.find(r => r.id === selectedRouteId)?.poolIds.map((poolId, index) => {
                const pool = pools.find(p => p.id === poolId);
                return (
                  <div key={poolId} className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[10px]">
                    <span className="font-black text-blue-600 mr-1">#{index + 1}</span>
                    <span className="font-bold text-slate-700">{pool?.name || 'Cargando...'}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div className="grid gap-4">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Planificación / Rutas Recurrentes</h3>
            {routes.filter(r => r.startDate).map(route => {
              const worker = workers.find(w => w.id === route.workerId);
              const isSelected = selectedRouteId === route.id;
              return (
                <Card 
                  key={route.id} 
                  className={cn(
                    "p-4 transition-all cursor-pointer border-blue-200",
                    isSelected ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/30" : "hover:border-blue-300"
                  )}
                  onClick={() => setSelectedRouteId(isSelected ? null : route.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        isSelected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
                      )}>
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{route.routeName || 'Planificación'}</h4>
                        <p className="text-xs text-slate-500">
                          {route.startDate} al {route.endDate} • {route.recurrence === 'none' ? 'Rango' : route.recurrence} • {worker?.name || 'Sin asignar'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => handleEdit(route)} 
                        className="p-1 text-slate-400 hover:text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteRoute(route.id)} className="p-1 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Rutas Asignadas (Día único)</h3>
            {routes.filter(r => r.date).map(route => {
              const worker = workers.find(w => w.id === route.workerId);
              const isSelected = selectedRouteId === route.id;
              return (
                <Card 
                  key={route.id} 
                  className={cn(
                    "p-4 transition-all cursor-pointer",
                    isSelected ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/30" : "hover:border-blue-200"
                  )}
                  onClick={() => setSelectedRouteId(isSelected ? null : route.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{route.routeName || worker?.name || 'Ruta sin nombre'}</h4>
                        <p className="text-xs text-slate-500">{route.date} • {route.poolIds.length} piscinas • {worker?.name || 'Sin asignar'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <div className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase",
                        route.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                        route.status === 'in-progress' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {route.status}
                      </div>
                      <button 
                        onClick={() => handleEdit(route)} 
                        className="p-1 text-slate-400 hover:text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteRoute(route.id)} className="p-1 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Planificador Semanal</h3>
            <Card className="p-4 bg-white border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dayName, i) => {
                  const dayIndex = (i + 1) % 7; // 1=Mon, ..., 6=Sat, 0=Sun
                  const assignedRoute = routes.find(r => r.assignedDay === dayIndex);
                  
                  return (
                    <div key={dayName} className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase text-center">{dayName}</span>
                      <select 
                        className={cn(
                          "text-[10px] p-1.5 rounded-lg border transition-all",
                          assignedRoute ? "bg-blue-50 border-blue-200 text-blue-700 font-bold" : "bg-slate-50 border-slate-100 text-slate-400"
                        )}
                        value={assignedRoute?.id || ''}
                        onChange={(e) => assignRouteToDay(e.target.value, dayIndex)}
                      >
                        <option value="">Sin ruta</option>
                        {routes.filter(r => !r.date && !r.startDate).map(r => (
                          <option key={r.id} value={r.id}>{r.routeName || 'Ruta sin nombre'}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Plantillas / Rutas sin fecha</h3>
            {routes
              .filter(r => !r.date && !r.startDate)
              .sort((a, b) => {
                if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
                return (a.createdAt || '') > (b.createdAt || '') ? 1 : -1;
              })
              .map((route, index, array) => {
                const worker = workers.find(w => w.id === route.workerId);
                const isSelected = selectedRouteId === route.id;
                const assignedDay = route.assignedDay !== undefined ? ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'][route.assignedDay] : null;

                return (
                  <Card 
                    key={route.id} 
                    className={cn(
                      "p-4 transition-all cursor-pointer border-dashed",
                      isSelected ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30" : "hover:border-indigo-200"
                    )}
                    onClick={() => setSelectedRouteId(isSelected ? null : route.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg transition-colors",
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                        )}>
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{route.routeName || 'Ruta sin nombre'}</h4>
                            {assignedDay && (
                              <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">
                                {assignedDay}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{route.poolIds.length} piscinas • {worker?.name || 'Cualquier técnico puede elegir'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col gap-1 mr-2">
                          <button 
                            onClick={() => moveRouteTemplate(index, 'up')}
                            disabled={index === 0}
                            className="p-0.5 text-slate-300 hover:text-blue-600 disabled:opacity-0"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => moveRouteTemplate(index, 'down')}
                            disabled={index === array.length - 1}
                            className="p-0.5 text-slate-300 hover:text-blue-600 disabled:opacity-0"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleEdit(route)} 
                          className="p-1 text-slate-400 hover:text-blue-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
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
      </div>
    </APIProvider>
  );
}
