import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button, Card } from '../components/ui/Common';
import { cn } from '../lib/utils';
import {
  Plus,
  Calendar,
  Trash2,
  Map as MapIcon,
  List,
  AlertCircle,
  Edit2,
  Sparkles,
  Loader2,
  ArrowUp,
  ArrowDown,
  CalendarRange,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  addDays,
  endOfWeek,
  format,
  getDay,
  isWithinInterval,
  parseISO,
  startOfWeek,
} from 'date-fns';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { optimizeRoute } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';

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
  /** Id de la ruta de la semana modelo usada al generar esta instancia (deduplicado) */
  templateId?: string;
  /** Orden entre rutas del mismo día (1 = primera en reparto a técnicos) */
  planningPriority?: number;
}

function defaultNewRouteForm() {
  const today = format(new Date(), 'yyyy-MM-dd');
  return {
    workerId: '',
    date: today,
    startDate: today,
    endDate: today,
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly',
    daysOfWeek: [] as number[],
    poolIds: [] as string[],
    routeName: '',
    noWorker: false,
    isScheduled: false,
  };
}

function isDatedRoute(r: Route) {
  return !!r.date;
}

function isLegacyUndated(r: Route) {
  return !r.date && !r.startDate;
}

export default function RoutesPage() {
  const { user, loading: authLoading } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [newRoute, setNewRoute] = useState(defaultNewRouteForm);
  const [routeViewMode, setRouteViewMode] = useState<'list' | 'map'>('list');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [planFromDate, setPlanFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [planHorizonDays, setPlanHorizonDays] = useState(14);
  const [planningSelectedDate, setPlanningSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isGenerating, setIsGenerating] = useState(false);
  /** Semana modelo: cualquier fecha dentro de la semana (lun–dom) de la que se copian rutas por día de la semana */
  const [planSourceWeekAnchor, setPlanSourceWeekAnchor] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );
  /** Si la ruta origen no lleva técnico, las instancias usarán este (vacío = primer técnico de la lista) */
  const [fallbackWorkerIdForPlan, setFallbackWorkerIdForPlan] = useState('');

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const selectedRoutePools = (selectedRoute?.poolIds || [])
    .map((id) => pools.find((p) => p.id === id))
    .filter(Boolean) as Pool[];

  const mapCenter =
    selectedRoutePools.length > 0 && selectedRoutePools[0].coordinates
      ? selectedRoutePools[0].coordinates
      : MIAMI_CENTER;

  const datedRoutes = useMemo(() => routes.filter(isDatedRoute), [routes]);

  const legacyUndated = useMemo(() => routes.filter(isLegacyUndated), [routes]);

  const routesForPlanningDay = useMemo(() => {
    return datedRoutes
      .filter((r) => r.date === planningSelectedDate)
      .sort((a, b) => (a.planningPriority ?? 0) - (b.planningPriority ?? 0));
  }, [datedRoutes, planningSelectedDate]);

  const recurringDefinitions = useMemo(
    () => routes.filter((r) => !!r.startDate),
    [routes]
  );

  useEffect(() => {
    if (authLoading || !user) return;

    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      setPools(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pool)));
    });
    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      const filteredWorkers = users.filter((u: any) => u.role === 'worker' || u.isWorker);
      setWorkers(filteredWorkers);
    });
    const unsubRoutes = onSnapshot(collection(db, 'routes'), (snap) => {
      setRoutes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Route)));
    });

    return () => {
      unsubPools();
      unsubUsers();
      unsubRoutes();
    };
  }, [user, authLoading]);

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoute.poolIds.length === 0) {
      toast.error('Selecciona al menos una piscina');
      return;
    }
    if (!newRoute.isScheduled && !newRoute.date) {
      toast.error('Indica la fecha del servicio');
      return;
    }
    try {
      const routeToSave: Record<string, unknown> = {
        poolIds: newRoute.poolIds,
        routeName: newRoute.routeName || '',
        workerId: newRoute.noWorker ? '' : newRoute.workerId,
        status: 'pending',
      };

      if (newRoute.isScheduled) {
        routeToSave.startDate = newRoute.startDate;
        routeToSave.endDate = newRoute.endDate;
        routeToSave.recurrence = newRoute.recurrence;
        routeToSave.daysOfWeek = newRoute.daysOfWeek;
        routeToSave.date = '';
        routeToSave.assignedDay = null;
      } else {
        routeToSave.date = newRoute.date;
        routeToSave.recurrence = 'none';
        routeToSave.startDate = null;
        routeToSave.endDate = null;
        routeToSave.assignedDay = null;
      }

      if (editingRouteId) {
        await updateDoc(doc(db, 'routes', editingRouteId), routeToSave);
        toast.success('Ruta actualizada');
      } else {
        routeToSave.createdAt = new Date().toISOString();
        routeToSave.order = datedRoutes.length;
        await addDoc(collection(db, 'routes'), routeToSave);
        toast.success('Ruta guardada');
      }
      setNewRoute(defaultNewRouteForm());
      setShowRouteForm(false);
      setEditingRouteId(null);
    } catch {
      toast.error('Error al guardar ruta');
    }
  };

  const handleEdit = (route: Route) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setNewRoute({
      workerId: route.workerId || '',
      date: route.date || today,
      startDate: route.startDate || today,
      endDate: route.endDate || today,
      recurrence: route.recurrence || 'none',
      daysOfWeek: route.daysOfWeek || [],
      poolIds: route.poolIds,
      routeName: route.routeName || '',
      noWorker: !route.workerId,
      isScheduled: !!route.startDate,
    });
    setEditingRouteId(route.id);
    setShowRouteForm(true);
  };

  const togglePoolInRoute = (poolId: string) => {
    setNewRoute((prev) => {
      const exists = prev.poolIds.indexOf(poolId);
      if (exists > -1) {
        return { ...prev, poolIds: prev.poolIds.filter((id) => id !== poolId) };
      }
      return { ...prev, poolIds: [...prev.poolIds, poolId] };
    });
  };

  const getAssignedRoute = (poolId: string) => {
    const assignedRoute = routes.find(
      (r) =>
        r.date === newRoute.date &&
        r.poolIds.includes(poolId) &&
        r.id !== editingRouteId
    );
    if (!assignedRoute) return null;
    const worker = workers.find((w) => w.id === assignedRoute.workerId);
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
        .map((id) => pools.find((p) => p.id === id))
        .filter(Boolean) as Pool[];

      const optimizedIds = await optimizeRoute(selectedPools);
      setNewRoute((prev) => ({ ...prev, poolIds: optimizedIds }));
      toast.success('Ruta optimizada con IA');
    } catch {
      toast.error('Error al optimizar la ruta');
    } finally {
      setIsOptimizing(false);
    }
  };

  const movePool = (index: number, direction: 'up' | 'down') => {
    setNewRoute((prev) => {
      const newPoolIds = [...prev.poolIds];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newPoolIds.length) return prev;

      const temp = newPoolIds[index];
      newPoolIds[index] = newPoolIds[targetIndex];
      newPoolIds[targetIndex] = temp;

      return { ...prev, poolIds: newPoolIds };
    });
  };

  const existingPlannedKeys = useCallback(() => {
    const keys = new Set<string>();
    for (const r of routes) {
      if (r.date && r.templateId) keys.add(`${r.date}|${r.templateId}`);
    }
    return keys;
  }, [routes]);

  const handleGeneratePlanning = async () => {
    const start = parseISO(planFromDate);
    if (Number.isNaN(start.getTime())) {
      toast.error('Fecha de inicio no válida');
      return;
    }

    const anchor = parseISO(planSourceWeekAnchor);
    if (Number.isNaN(anchor.getTime())) {
      toast.error('Semana origen no válida');
      return;
    }

    const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 });

    const byDow: Record<number, Route[]> = {};
    for (const r of routes) {
      if (!r.date) continue;
      const rd = parseISO(r.date);
      if (Number.isNaN(rd.getTime())) continue;
      if (!isWithinInterval(rd, { start: weekStart, end: weekEnd })) continue;
      const dow = getDay(rd);
      if (!byDow[dow]) byDow[dow] = [];
      byDow[dow].push(r);
    }
    for (const k of Object.keys(byDow)) {
      byDow[+k].sort(
        (a, b) =>
          (a.planningPriority ?? 0) - (b.planningPriority ?? 0) ||
          (a.order ?? 0) - (b.order ?? 0)
      );
    }

    const hasAnyPattern = Object.keys(byDow).length > 0;
    if (!hasAnyPattern) {
      toast.error(
        'No hay rutas con fecha en la semana origen (lunes–domingo de la fecha elegida). Crea ahí tus rutas modelo y vuelve a generar.'
      );
      return;
    }

    let defaultWorker = '';
    if (
      fallbackWorkerIdForPlan &&
      workers.some((w) => w.id === fallbackWorkerIdForPlan)
    ) {
      defaultWorker = fallbackWorkerIdForPlan;
    } else if (workers.length > 0) {
      defaultWorker = workers[0].id;
    }

    setIsGenerating(true);
    const keys = existingPlannedKeys();
    let created = 0;
    let skipped = 0;

    try {
      let batch = writeBatch(db);
      let ops = 0;

      const flush = async () => {
        if (ops > 0) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      };

      for (let i = 0; i < planHorizonDays; i++) {
        const d = addDays(start, i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const dow = getDay(d);
        const sources = byDow[dow] || [];

        let p = 0;
        for (const src of sources) {
          const key = `${dateStr}|${src.id}`;
          if (keys.has(key)) {
            skipped++;
            continue;
          }
          keys.add(key);

          const srcWorker = (src.workerId || '').trim();
          const workerId = srcWorker || defaultWorker;

          const ref = doc(collection(db, 'routes'));
          batch.set(ref, {
            poolIds: [...src.poolIds],
            routeName: src.routeName || '',
            workerId,
            date: dateStr,
            status: 'pending',
            templateId: src.id,
            planningPriority: p,
            createdAt: new Date().toISOString(),
            recurrence: 'none',
          });
          p++;
          created++;
          ops++;
          if (ops >= 450) {
            await flush();
          }
        }
      }

      await flush();
      toast.success(
        `Plan generado: ${created} rutas nuevas${skipped ? ` · ${skipped} ya existían` : ''}`
      );
    } catch {
      toast.error('Error al generar la planificación');
    } finally {
      setIsGenerating(false);
    }
  };

  const updatePlannedWorker = async (routeId: string, workerId: string) => {
    try {
      await updateDoc(doc(db, 'routes', routeId), { workerId });
      toast.success('Técnico actualizado');
    } catch {
      toast.error('No se pudo actualizar el técnico');
    }
  };

  const movePlanningRow = async (index: number, direction: 'up' | 'down') => {
    const list = routesForPlanningDay;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const a = list[index];
    const b = list[targetIndex];
    const pa = a.planningPriority ?? index;
    const pb = b.planningPriority ?? targetIndex;

    try {
      await updateDoc(doc(db, 'routes', a.id), { planningPriority: pb });
      await updateDoc(doc(db, 'routes', b.id), { planningPriority: pa });
    } catch {
      toast.error('Error al reordenar');
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Gestión de rutas</h2>
            <p className="text-sm text-slate-500 mt-1">
              Generación a partir de una semana modelo y ajuste manual por día.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setShowRouteForm(true);
              setEditingRouteId(null);
              setNewRoute(defaultNewRouteForm());
            }}
            className="gap-1 shrink-0"
          >
            <Plus className="w-4 h-4" /> Nueva ruta
          </Button>
        </div>

        {showRouteForm && (
          <Card className="p-4 border-blue-200 bg-blue-50/80">
            <form onSubmit={handleAddRoute} className="space-y-4">
              <h3 className="font-bold text-blue-900">
                {editingRouteId ? 'Editar ruta' : 'Nueva ruta'}
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border-slate-200 p-2 text-sm bg-white"
                  placeholder="Ej: Ruta norte, mantenimiento fuerte…"
                  value={newRoute.routeName}
                  onChange={(e) => setNewRoute({ ...newRoute, routeName: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-blue-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRoute.isScheduled}
                    onChange={(e) => setNewRoute({ ...newRoute, isScheduled: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-slate-700">
                    Definición recurrente (rango + reglas)
                  </span>
                </label>
              </div>

              {newRoute.isScheduled ? (
                <div className="space-y-4 p-4 bg-white rounded-xl border border-blue-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Fecha inicio
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        value={newRoute.startDate}
                        onChange={(e) => setNewRoute({ ...newRoute, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Fecha fin
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-lg border-slate-200 p-2 text-sm"
                        value={newRoute.endDate}
                        onChange={(e) => setNewRoute({ ...newRoute, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Recurrencia
                    </label>
                    <select
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      value={newRoute.recurrence}
                      onChange={(e) =>
                        setNewRoute({ ...newRoute, recurrence: e.target.value as Route['recurrence'] })
                      }
                    >
                      <option value="none">Sin repetición (todo el rango)</option>
                      <option value="daily">Diaria</option>
                      <option value="weekly">Semanal</option>
                      <option value="bi-weekly">Quincenal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>

                  {newRoute.recurrence === 'weekly' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Días de la semana
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const current = newRoute.daysOfWeek;
                              const next = current.includes(i)
                                ? current.filter((d) => d !== i)
                                : [...current, i];
                              setNewRoute({ ...newRoute, daysOfWeek: next });
                            }}
                            className={cn(
                              'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                              newRoute.daysOfWeek.includes(i)
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
                      <label className="block text-xs font-bold text-slate-500 uppercase">
                        Técnico
                      </label>
                      <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRoute.noWorker}
                          onChange={(e) => setNewRoute({ ...newRoute, noWorker: e.target.checked })}
                          className="rounded border-slate-300"
                        />
                        Sin asignar
                      </label>
                    </div>
                    <select
                      className="w-full rounded-lg border-slate-200 p-2 text-sm disabled:bg-slate-100 disabled:text-slate-400 bg-white"
                      value={newRoute.workerId}
                      onChange={(e) => setNewRoute({ ...newRoute, workerId: e.target.value })}
                      disabled={newRoute.noWorker}
                    >
                      <option value="">Seleccionar…</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                          {w.id === user?.uid ? ' (Tú)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                      Fecha del servicio
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full rounded-lg border-slate-200 p-2 text-sm bg-white"
                      value={newRoute.date}
                      onChange={(e) => setNewRoute({ ...newRoute, date: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {newRoute.isScheduled && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                      Técnico
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRoute.noWorker}
                        onChange={(e) => setNewRoute({ ...newRoute, noWorker: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      Sin asignar
                    </label>
                  </div>
                  <select
                    className="w-full rounded-lg border-slate-200 p-2 text-sm disabled:bg-slate-100 disabled:text-slate-400 bg-white"
                    value={newRoute.workerId}
                    onChange={(e) => setNewRoute({ ...newRoute, workerId: e.target.value })}
                    disabled={newRoute.noWorker}
                  >
                    <option value="">Seleccionar…</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                        {w.id === user?.uid ? ' (Tú)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 uppercase">
                  Piscinas (orden de parada)
                </label>
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
                    Optimizar con IA
                  </button>
                  <div className="flex bg-white p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setRouteViewMode('list')}
                      className={cn(
                        'p-1.5 rounded-md',
                        routeViewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'
                      )}
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRouteViewMode('map')}
                      className={cn(
                        'p-1.5 rounded-md',
                        routeViewMode === 'map' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'
                      )}
                    >
                      <MapIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {routeViewMode === 'list' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                    {pools.map((p) => {
                      const assignedTo = getAssignedRoute(p.id);
                      const isSelected = newRoute.poolIds.includes(p.id);

                      return (
                        <label
                          key={p.id}
                          className={cn(
                            'flex items-center gap-2 text-sm p-2 rounded-lg cursor-pointer transition-colors relative',
                            isSelected
                              ? 'bg-blue-50 border-blue-200 border'
                              : 'bg-slate-50 border-transparent border',
                            assignedTo && !isSelected ? 'opacity-60' : ''
                          )}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => togglePoolInRoute(p.id)}
                          />
                          <div className="flex-1">
                            <div className="font-bold flex items-center justify-between gap-2">
                              <span>{p.name}</span>
                              {assignedTo && (
                                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
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
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Orden de paradas
                      </label>
                      <div className="space-y-1">
                        {newRoute.poolIds.map((id, index) => {
                          const pool = pools.find((p) => p.id === id);
                          return (
                            <div
                              key={id}
                              className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-sm"
                            >
                              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                                {index + 1}
                              </span>
                              <span className="flex-1 font-medium text-slate-700">
                                {pool?.name || '…'}
                              </span>
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
                  <Map defaultCenter={MIAMI_CENTER} defaultZoom={11} mapId="route_creation_map">
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
                            {isSelected
                              ? (newRoute.poolIds.indexOf(p.id) + 1).toString()
                              : assignedTo
                                ? '!'
                                : ''}
                          </Pin>
                        </AdvancedMarker>
                      );
                    })}
                  </Map>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingRouteId ? 'Actualizar' : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRouteForm(false);
                    setEditingRouteId(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {selectedRouteId && !showRouteForm && (
          <Card className="p-4 border-blue-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-blue-600" />
                Mapa:{' '}
                {workers.find((w) => w.id === routes.find((r) => r.id === selectedRouteId)?.workerId)
                  ?.name || 'Sin técnico'}
              </h3>
              <Button variant="outline" size="sm" onClick={() => setSelectedRouteId(null)}>
                Cerrar
              </Button>
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
                    <Pin background={'#2563eb'} glyphColor={'#fff'} borderColor={'#000'}>
                      {(index + 1).toString()}
                    </Pin>
                  </AdvancedMarker>
                ))}
              </Map>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {routes
                .find((r) => r.id === selectedRouteId)
                ?.poolIds.map((poolId, index) => {
                  const pool = pools.find((p) => p.id === poolId);
                  return (
                    <div
                      key={poolId}
                      className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[10px]"
                    >
                      <span className="font-black text-blue-600 mr-1">#{index + 1}</span>
                      <span className="font-bold text-slate-700">{pool?.name || '…'}</span>
                    </div>
                  );
                })}
            </div>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="p-5 lg:col-span-2 border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <CalendarRange className="w-5 h-5 text-blue-600" />
              Generar planificación
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Elige la <strong>semana origen</strong> (lunes a domingo de la fecha que indiques): se
              copian todas las rutas con fecha de esa semana a cada día equivalente del periodo
              (mismo día de la semana). No duplica si ya existe una instancia generada desde la misma
              ruta origen en esa fecha.
            </p>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                Semana origen (cualquier día de esa semana)
              </label>
              <input
                type="date"
                className="w-full rounded-lg border-slate-200 p-2 text-sm"
                value={planSourceWeekAnchor}
                onChange={(e) => setPlanSourceWeekAnchor(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                Técnico si la ruta origen va sin asignar
              </label>
              <select
                className="w-full rounded-lg border-slate-200 p-2 text-sm bg-white"
                value={fallbackWorkerIdForPlan}
                onChange={(e) => setFallbackWorkerIdForPlan(e.target.value)}
              >
                <option value="">Usar el primer técnico de la lista</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                  Desde (inicio del periodo a generar)
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border-slate-200 p-2 text-sm"
                  value={planFromDate}
                  onChange={(e) => setPlanFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                  Días hacia adelante
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  className="w-full rounded-lg border-slate-200 p-2 text-sm"
                  value={planHorizonDays}
                  onChange={(e) => setPlanHorizonDays(Number(e.target.value) || 1)}
                />
              </div>
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleGeneratePlanning}
              disabled={isGenerating}
              isLoading={isGenerating}
            >
              Generar planificación
            </Button>
          </Card>

          <Card className="p-5 lg:col-span-3 border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Users className="w-5 h-5 text-indigo-600" />
                Ajuste manual del día
              </div>
              <input
                type="date"
                className="rounded-lg border-slate-200 p-2 text-sm font-bold text-slate-800"
                value={planningSelectedDate}
                onChange={(e) => setPlanningSelectedDate(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-500">
              Prioridad: número más bajo = primero en el reparto. Reordena o cambia técnico; las
              piscinas se editan con “Editar”.
            </p>

            {routesForPlanningDay.length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">
                No hay rutas con esta fecha. Genera el plan o crea una ruta con fecha concreta.
              </div>
            ) : (
              <ul className="space-y-2">
                {routesForPlanningDay.map((route, index) => {
                  const worker = workers.find((w) => w.id === route.workerId);
                  return (
                    <li
                      key={route.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/80"
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                          {(route.planningPriority ?? index) + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
                            {route.routeName || worker?.name || 'Ruta'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {route.poolIds.length} piscinas
                            {route.templateId ? ' · copia desde semana modelo' : ''}
                          </span>
                        </div>
                      </div>
                      <select
                        className="flex-1 min-w-0 rounded-lg border-slate-200 p-2 text-sm bg-white"
                        value={route.workerId || ''}
                        onChange={(e) => updatePlannedWorker(route.id, e.target.value)}
                      >
                        <option value="">Sin técnico</option>
                        {workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => movePlanningRow(index, 'up')}
                          disabled={index === 0}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 disabled:opacity-30"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePlanningRow(index, 'down')}
                          disabled={index === routesForPlanningDay.length - 1}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 disabled:opacity-30"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(route)}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRoute(route.id)}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRouteId(route.id)}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600"
                        >
                          <MapIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {recurringDefinitions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
              Definiciones recurrentes (rango)
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {recurringDefinitions.map((route) => {
                const worker = workers.find((w) => w.id === route.workerId);
                const isSelected = selectedRouteId === route.id;
                return (
                  <Card
                    key={route.id}
                    className={cn(
                      'p-4 transition-all cursor-pointer border-blue-100',
                      isSelected
                        ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30'
                        : 'hover:border-blue-300'
                    )}
                    onClick={() => setSelectedRouteId(isSelected ? null : route.id)}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'p-2 rounded-lg shrink-0',
                            isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                          )}
                        >
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 truncate">
                            {route.routeName || 'Recurrencia'}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {route.startDate} → {route.endDate} ·{' '}
                            {route.recurrence === 'none' ? 'Rango' : route.recurrence} ·{' '}
                            {worker?.name || 'Sin técnico'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleEdit(route)}
                          className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRoute(route.id)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {legacyUndated.length > 0 && (
          <Card className="p-4 border-amber-200 bg-amber-50/60 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-950 text-sm">Rutas antiguas sin fecha</h3>
                <p className="text-xs text-amber-900/90 mt-1">
                  Hay {legacyUndated.length} documento(s) sin fecha de servicio. Edita cada uno,
                  asigna una <strong>fecha</strong> y guarda, o elimínalos. Ya no se usan como modelo
                  para generar el plan.
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {legacyUndated.map((route) => (
                <li
                  key={route.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-white border border-amber-100 text-sm"
                >
                  <span className="font-medium text-slate-800 truncate">
                    {route.routeName || 'Sin nombre'} · {route.poolIds.length} piscinas
                  </span>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => handleEdit(route)}>
                      Editar
                    </Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => deleteRoute(route.id)}>
                      Eliminar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

      </div>
    </APIProvider>
  );
}
