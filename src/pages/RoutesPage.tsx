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
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  addDays,
  differenceInCalendarDays,
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

/** Ocultar navegación Semana − / + junto al selector de fecha (reactivar cuando haga falta) */
const SHOW_CALENDAR_WEEK_STEPPER = false;

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
    endDate: '' as string,
    hasEndDate: false,
    recurrence: 'weekly' as 'none' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly',
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
  const [planCalendarOpen, setPlanCalendarOpen] = useState(false);
  const [pickedSourceRouteId, setPickedSourceRouteId] = useState<string | null>(null);
  /** fecha -> ids de rutas origen a instanciar ese día (orden = planningPriority) */
  const [placementsByDate, setPlacementsByDate] = useState<Record<string, string[]>>({});
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  /** Semana modelo: cualquier fecha dentro de la semana (lun–dom) de la que se copian rutas por día de la semana */
  const [planSourceWeekAnchor, setPlanSourceWeekAnchor] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );
  /** Si la ruta origen no lleva técnico, las instancias usarán este (vacío = primer técnico de la lista) */
  const [fallbackWorkerIdForPlan, setFallbackWorkerIdForPlan] = useState('');

  const weeklyRequiresAtLeastOneDay = useMemo(
    () =>
      newRoute.isScheduled &&
      newRoute.recurrence === 'weekly' &&
      newRoute.daysOfWeek.length === 0,
    [newRoute.isScheduled, newRoute.recurrence, newRoute.daysOfWeek]
  );

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

  const routeMatchesDate = useCallback((route: Route, dateStr: string) => {
    if (route.date) return route.date === dateStr;
    if (!route.startDate) return false;

    const current = parseISO(dateStr);
    const start = parseISO(route.startDate);
    if (Number.isNaN(current.getTime()) || Number.isNaN(start.getTime())) return false;
    if (current < start) return false;

    if (route.endDate) {
      const end = parseISO(route.endDate);
      if (Number.isNaN(end.getTime())) return false;
      if (current > end) return false;
    }

    const dow = getDay(current);
    const allowedDays = route.daysOfWeek || [];
    const matchesDay = allowedDays.length === 0 || allowedDays.includes(dow);

    switch (route.recurrence) {
      case 'daily':
        return true;
      case 'weekly':
        return matchesDay;
      case 'bi-weekly':
        return matchesDay && Math.floor(differenceInCalendarDays(current, start) / 7) % 2 === 0;
      case 'monthly':
        return current.getDate() === start.getDate();
      case 'none':
      default:
        return matchesDay;
    }
  }, []);

  const weeklyPlanningDays = useMemo(() => {
    const anchor = parseISO(planningSelectedDate);
    if (Number.isNaN(anchor.getTime())) return [] as { dateStr: string; label: string; routes: Route[] }[];
    const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, idx) => {
      const day = addDays(weekStart, idx);
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        dateStr,
        label: format(day, 'EEEE'),
        routes: routes
          .filter((r) => routeMatchesDate(r, dateStr))
          .sort((a, b) => (a.planningPriority ?? 0) - (b.planningPriority ?? 0),
          ),
      };
    });
  }, [routes, planningSelectedDate, routeMatchesDate]);

  const recurringDefinitions = useMemo(() => routes, [routes]);

  /** Rutas concretas con fecha (no definiciones por rango) — candidatas a colocar en el calendario */
  const assignableRoutes = useMemo(
    () =>
      routes
        .filter((r) => !!r.date && !r.startDate)
        .sort(
          (a, b) =>
            (a.date || '').localeCompare(b.date || '') ||
            (a.routeName || '').localeCompare(b.routeName || '')
        ),
    [routes]
  );

  const calendarWeeks = useMemo(() => {
    const d0 = parseISO(planFromDate);
    if (Number.isNaN(d0.getTime())) return [] as { weekLabel: string; days: { dateStr: string; sub: string }[] }[];
    const gridStart = startOfWeek(d0, { weekStartsOn: 1 });
    const rangeEnd = addDays(d0, Math.max(0, planHorizonDays - 1));
    const gridEnd = endOfWeek(rangeEnd, { weekStartsOn: 1 });
    const weeks: { weekLabel: string; days: { dateStr: string; sub: string }[] }[] = [];
    let cur = gridStart;
    while (cur <= gridEnd) {
      const days: { dateStr: string; sub: string }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(cur, i);
        days.push({
          dateStr: format(d, 'yyyy-MM-dd'),
          sub: format(d, 'd MMM'),
        });
      }
      weeks.push({
        weekLabel: `${format(cur, 'd MMM')} – ${format(addDays(cur, 6), 'd MMM yyyy')}`,
        days,
      });
      cur = addDays(cur, 7);
    }
    return weeks;
  }, [planFromDate, planHorizonDays]);

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
    if (newRoute.isScheduled && newRoute.hasEndDate && !newRoute.endDate) {
      toast.error('Indica la fecha fin o desmarca “Incluir fecha fin”');
      return;
    }
    if (weeklyRequiresAtLeastOneDay) {
      toast.error('Selecciona al menos un día de la semana');
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
        routeToSave.endDate =
          newRoute.hasEndDate && newRoute.endDate ? newRoute.endDate : null;
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

  const tryCloseRouteForm = useCallback(() => {
    if (weeklyRequiresAtLeastOneDay) {
      toast.error('Selecciona al menos un día de la semana');
      return;
    }
    setShowRouteForm(false);
    setEditingRouteId(null);
  }, [weeklyRequiresAtLeastOneDay]);

  const handleEdit = (route: Route) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setNewRoute({
      workerId: route.workerId || '',
      date: route.date || today,
      startDate: route.startDate || today,
      endDate: route.endDate || '',
      hasEndDate: !!route.endDate,
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

  /** Otras rutas (no la que se edita) que ya incluyen esta piscina — informativo, no bloquea */
  const getOtherRoutesWithPool = useCallback(
    (poolId: string) =>
      routes.filter((r) => r.id !== editingRouteId && r.poolIds.includes(poolId)),
    [routes, editingRouteId]
  );

  const formatRouteAssignmentHint = useCallback(
    (r: Route) => {
      const name = (r.routeName || '').trim() || 'Ruta';
      const worker = workers.find((w) => w.id === r.workerId)?.name;
      const tech = worker ? ` · ${worker}` : '';
      if (r.date) return `${name} · ${r.date}${tech}`;
      if (r.startDate) {
        const range = r.endDate ? `${r.startDate} → ${r.endDate}` : `desde ${r.startDate}`;
        return `${name} · ${range}${tech}`;
      }
      return `${name}${tech}`;
    },
    [workers]
  );

  const getPoolAssignmentHint = useCallback(
    (poolId: string) => {
      const others = getOtherRoutesWithPool(poolId);
      if (others.length === 0) return null;
      if (others.length === 1) return formatRouteAssignmentHint(others[0]);
      return `${others.length} rutas más: ${formatRouteAssignmentHint(others[0])}`;
    },
    [getOtherRoutesWithPool, formatRouteAssignmentHint]
  );

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

  const sortByPriority = (a: Route, b: Route) =>
    (a.planningPriority ?? 0) - (b.planningPriority ?? 0) ||
    (a.order ?? 0) - (b.order ?? 0);

  const buildByDowFromSourceWeek = (): Record<number, Route[]> | null => {
    const anchor = parseISO(planSourceWeekAnchor);
    if (Number.isNaN(anchor.getTime())) return null;
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
    for (const k of Object.keys(byDow)) byDow[+k].sort(sortByPriority);
    return Object.keys(byDow).length ? byDow : null;
  };

  /** Fallback: si la semana origen está vacía, usa todas las rutas con fecha existentes */
  const buildByDowFromAllDatedRoutes = (): Record<number, Route[]> | null => {
    const byDow: Record<number, Route[]> = {};
    for (const r of routes) {
      if (!r.date || r.startDate) continue;
      const d = parseISO(r.date);
      if (Number.isNaN(d.getTime())) continue;
      const dow = getDay(d);
      if (!byDow[dow]) byDow[dow] = [];
      byDow[dow].push(r);
    }
    for (const k of Object.keys(byDow)) byDow[+k].sort(sortByPriority);
    return Object.keys(byDow).length ? byDow : null;
  };

  /** Rellena el calendario repitiendo el patrón de la semana origen (mismo día de la semana) */
  const applyWeeklyPatternToPlacements = () => {
    const start = parseISO(planFromDate);
    if (Number.isNaN(start.getTime())) {
      toast.error('Fecha de inicio no válida');
      return;
    }
    const fromSourceWeek = buildByDowFromSourceWeek();
    const byDow = fromSourceWeek || buildByDowFromAllDatedRoutes();
    if (!byDow) {
      toast.error(
        'No hay rutas con fecha disponibles para generar planificación. Crea al menos una ruta con fecha.'
      );
      return;
    }
    const next: Record<string, string[]> = {};
    for (let i = 0; i < planHorizonDays; i++) {
      const d = addDays(start, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dow = getDay(d);
      const sources = byDow[dow] || [];
      if (sources.length) next[dateStr] = sources.map((s) => s.id);
    }
    setPlacementsByDate(next);
    if (fromSourceWeek) {
      toast.success('Calendario rellenado con el patrón de la semana origen');
    } else {
      toast.success('Semana origen vacía: se usaron todas las rutas existentes por día de semana');
    }
  };

  const openPlanningCalendar = () => {
    setPickedSourceRouteId(null);
    setPlacementsByDate({});
    setPlanCalendarOpen(true);
  };

  const assignSourceToDate = (sourceId: string, dateStr: string) => {
    setPlacementsByDate((prev) => {
      const next: Record<string, string[]> = {};
      for (const d of Object.keys(prev)) {
        next[d] = prev[d].filter((id) => id !== sourceId);
        if (next[d].length === 0) delete next[d];
      }
      const list = next[dateStr] ? [...next[dateStr]] : [];
      if (!list.includes(sourceId)) list.push(sourceId);
      next[dateStr] = list;
      return next;
    });
    setPickedSourceRouteId(null);
  };

  const removePlacementFromDate = (dateStr: string, sourceId: string) => {
    setPlacementsByDate((prev) => {
      const next = { ...prev };
      next[dateStr] = (next[dateStr] || []).filter((id) => id !== sourceId);
      if (next[dateStr].length === 0) delete next[dateStr];
      return next;
    });
  };

  const resolveDefaultWorkerForPlan = () => {
    if (
      fallbackWorkerIdForPlan &&
      workers.some((w) => w.id === fallbackWorkerIdForPlan)
    ) {
      return fallbackWorkerIdForPlan;
    }
    return workers[0]?.id || '';
  };

  const savePlanFromCalendar = async () => {
    const entries = Object.entries(placementsByDate).filter(([, ids]) => ids.length > 0);
    if (entries.length === 0) {
      toast.error('Coloca al menos una ruta en un día del calendario');
      return;
    }

    const defaultWorker = resolveDefaultWorkerForPlan();
    setIsSavingPlan(true);
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

      for (const [dateStr, sourceIds] of entries) {
        let p = 0;
        for (const srcId of sourceIds) {
          const src = routes.find((r) => r.id === srcId);
          if (!src) {
            p++;
            continue;
          }
          const key = `${dateStr}|${srcId}`;
          if (keys.has(key)) {
            skipped++;
            p++;
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
            templateId: srcId,
            planningPriority: p,
            createdAt: new Date().toISOString(),
            recurrence: 'none',
          });
          p++;
          created++;
          ops++;
          if (ops >= 450) await flush();
        }
      }

      await flush();
      toast.success(
        `Plan guardado: ${created} rutas nuevas${skipped ? ` · ${skipped} ya existían` : ''}`
      );
      setPlanCalendarOpen(false);
      setPlacementsByDate({});
    } catch {
      toast.error('Error al guardar la planificación');
    } finally {
      setIsSavingPlan(false);
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
              Calendario semanal para planificar y ajuste manual por día en el dashboard del técnico.
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
          <div
            className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-slate-900/55 p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="route-form-title"
            onClick={tryCloseRouteForm}
          >
            <Card
              className="relative my-4 w-full max-w-4xl border-blue-200 bg-blue-50/80 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                onClick={tryCloseRouteForm}
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
              <form onSubmit={handleAddRoute} className="space-y-4 p-4 pr-14">
              <h3 id="route-form-title" className="font-bold text-blue-900">
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
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRoute.hasEndDate}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setNewRoute((prev) => ({
                              ...prev,
                              hasEndDate: checked,
                              endDate: checked
                                ? prev.endDate || prev.startDate
                                : '',
                            }));
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Incluir fecha fin
                        </span>
                      </label>
                      {newRoute.hasEndDate && (
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Fecha fin
                          </label>
                          <input
                            type="date"
                            className="w-full rounded-lg border-slate-200 p-2 text-sm"
                            value={newRoute.endDate}
                            onChange={(e) =>
                              setNewRoute({ ...newRoute, endDate: e.target.value })
                            }
                          />
                        </div>
                      )}
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
                      const otherHint = getPoolAssignmentHint(p.id);
                      const isSelected = newRoute.poolIds.includes(p.id);

                      return (
                        <label
                          key={p.id}
                          title={otherHint || undefined}
                          className={cn(
                            'flex items-center gap-2 text-sm p-2 rounded-lg cursor-pointer transition-colors relative',
                            isSelected
                              ? 'bg-blue-50 border-blue-200 border ring-1 ring-blue-100'
                              : 'bg-slate-50 border-transparent border',
                            otherHint && !isSelected ? 'opacity-75' : ''
                          )}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => togglePoolInRoute(p.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold flex items-start justify-between gap-2">
                              <span className="truncate">{p.name}</span>
                              <div className="flex flex-col items-end gap-0.5 shrink-0">
                                {isSelected && (
                                  <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                                    En esta ruta
                                  </span>
                                )}
                                {otherHint && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded flex items-center gap-0.5 max-w-[140px]">
                                    <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate" title={otherHint}>
                                      También en otra ruta
                                    </span>
                                  </span>
                                )}
                              </div>
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
                      const otherHint = getPoolAssignmentHint(p.id);
                      const isSelected = newRoute.poolIds.includes(p.id);

                      return (
                        <AdvancedMarker
                          key={p.id}
                          position={p.coordinates || MIAMI_CENTER}
                          title={otherHint ? `${p.name}${otherHint ? ` — ${otherHint}` : ''}` : p.name}
                          onClick={() => togglePoolInRoute(p.id)}
                        >
                          <Pin
                            background={
                              isSelected ? '#2563eb' : otherHint ? '#f59e0b' : '#94a3b8'
                            }
                            glyphColor={'#fff'}
                            borderColor={'#000'}
                          >
                            {isSelected
                              ? (newRoute.poolIds.indexOf(p.id) + 1).toString()
                              : otherHint
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
                <Button type="button" variant="outline" onClick={tryCloseRouteForm}>
                  Cancelar
                </Button>
              </div>
              </form>
            </Card>
          </div>
        )}

        <div className="grid gap-6">
          <Card className="p-5 border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <CalendarRange className="w-5 h-5 text-indigo-600" />
                Calendario semanal (rutas existentes)
              </div>
              {SHOW_CALENDAR_WEEK_STEPPER && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = parseISO(planningSelectedDate);
                      if (!Number.isNaN(d.getTime())) {
                        setPlanningSelectedDate(format(addDays(d, -7), 'yyyy-MM-dd'));
                      }
                    }}
                  >
                    Semana -
                  </Button>
                  <input
                    type="date"
                    className="rounded-lg border-slate-200 p-2 text-sm font-bold text-slate-800"
                    value={planningSelectedDate}
                    onChange={(e) => setPlanningSelectedDate(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = parseISO(planningSelectedDate);
                      if (!Number.isNaN(d.getTime())) {
                        setPlanningSelectedDate(format(addDays(d, 7), 'yyyy-MM-dd'));
                      }
                    }}
                  >
                    Semana +
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Se muestra la planificación semanal con datos ya existentes. La generación automática
              queda oculta temporalmente.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {weeklyPlanningDays.map((day) => (
                <div
                  key={day.dateStr}
                  className={cn(
                    'rounded-xl border p-2 space-y-1',
                    day.dateStr === planningSelectedDate
                      ? 'border-indigo-400 bg-indigo-50/40'
                      : 'border-slate-200 bg-white'
                  )}
                >
                  <button
                    type="button"
                    className="text-left w-full"
                    onClick={() => setPlanningSelectedDate(day.dateStr)}
                  >
                    <div className="text-[10px] font-black uppercase text-slate-500">{day.label}</div>
                  </button>
                  <div className="space-y-1">
                    {day.routes.length === 0 ? (
                      <p className="text-[10px] text-slate-400">Sin rutas</p>
                    ) : (
                      day.routes.map((r) => {
                        const worker = workers.find((w) => w.id === r.workerId);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedRouteId(r.id)}
                            className="w-full rounded bg-slate-100 px-1.5 py-1 text-left hover:bg-slate-200"
                          >
                            <div className="text-[10px] font-bold text-slate-700 truncate">
                              {r.routeName || worker?.name || 'Ruta'}
                            </div>
                            <div className="text-[9px] text-slate-500 truncate">
                              {worker?.name || 'Sin técnico'}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* {routesForPlanningDay.length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">
                No hay rutas con esta fecha.
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
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        {worker?.name || 'Sin técnico'}
                      </div>
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
            )} */}
          </Card>
        </div>

        {recurringDefinitions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
              Rutas (listado completo)
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {recurringDefinitions.map((route) => {
                const worker = workers.find((w) => w.id === route.workerId);
                const isSelected = selectedRouteId === route.id;
                const routePools = route.poolIds
                  .map((poolId) => pools.find((p) => p.id === poolId))
                  .filter(Boolean) as Pool[];
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
                          <h4 className="font-bold text-slate-900">
                            {route.routeName || 'Recurrencia'}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {route.startDate
                              ? `${route.startDate}${
                                  route.endDate ? ` → ${route.endDate}` : ' · sin fecha fin'
                                }`
                              : route.date || 'Sin fecha'}{' '}
                            · {route.recurrence === 'none' ? 'Puntual' : route.recurrence} ·{' '}
                            {worker?.name || 'Sin técnico'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {routePools.length === 0 ? (
                              <span className="text-[11px] text-slate-400">Sin piscinas asignadas</span>
                            ) : (
                              routePools.map((pool, poolIndex) => (
                                <span
                                  key={`${route.id}-${pool.id}`}
                                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                                >
                                  #{poolIndex + 1} {pool.name}
                                </span>
                              ))
                            )}
                          </div>
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

        {planCalendarOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/55 p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-calendar-title"
            onClick={() => setPlanCalendarOpen(false)}
          >
            <Card
              className="relative my-4 w-full max-w-6xl border-slate-200 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                onClick={() => setPlanCalendarOpen(false)}
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-5 sm:p-6 pr-14 space-y-4">
                <div>
                  <h3 id="plan-calendar-title" className="text-lg font-black text-slate-900">
                    Planificación en calendario
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                    1) Elige una ruta en la lista. 2) Pulsa el día del calendario donde debe
                    ejecutarla el técnico. 3) Repite y pulsa <strong>Guardar plan</strong>. Las
                    instancias nuevas reutilizan piscinas y técnico de la ruta origen (puedes
                    cambiarlo después en “Ajuste manual del día”).
                  </p>
                </div>

                {pickedSourceRouteId && (
                  <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                    <span className="font-bold">Ruta seleccionada:</span>
                    <span className="truncate">
                      {routes.find((r) => r.id === pickedSourceRouteId)?.routeName ||
                        routes.find((r) => r.id === pickedSourceRouteId)?.id}
                    </span>
                    <span className="text-indigo-600 shrink-0">→ toca un día</span>
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-4 space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Rutas ({assignableRoutes.length})
                    </h4>
                    <div className="max-h-[min(420px,50vh)] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                      {assignableRoutes.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500">
                          No hay rutas con fecha. Crea rutas con día concreto primero.
                        </p>
                      ) : (
                        assignableRoutes.map((r) => {
                          const w = workers.find((x) => x.id === r.workerId);
                          const active = pickedSourceRouteId === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() =>
                                setPickedSourceRouteId((cur) => (cur === r.id ? null : r.id))
                              }
                              className={cn(
                                'w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-slate-50',
                                active ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : ''
                              )}
                            >
                              <div className="font-bold text-slate-900 truncate">
                                {r.routeName || w?.name || 'Ruta'}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {r.date} · {r.poolIds.length} piscinas · {w?.name || 'Sin técnico'}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-3 min-w-0">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Calendario (semanas lun–dom)
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 space-y-4">
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((h) => (
                          <div key={h}>{h}</div>
                        ))}
                      </div>
                      {calendarWeeks.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4 text-center">
                          Ajusta “Desde” y “Días hacia adelante” en el panel izquierdo y vuelve a
                          abrir el calendario.
                        </p>
                      ) : (
                        calendarWeeks.map((week) => (
                          <div key={week.weekLabel} className="space-y-1">
                            <div className="text-[10px] font-bold text-slate-400 px-0.5">
                              {week.weekLabel}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {week.days.map((cell) => {
                                const placed = placementsByDate[cell.dateStr] || [];
                                const todayStr = format(new Date(), 'yyyy-MM-dd');
                                const isToday = cell.dateStr === todayStr;
                                return (
                                  <div
                                    key={cell.dateStr}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                      if (pickedSourceRouteId) {
                                        assignSourceToDate(pickedSourceRouteId, cell.dateStr);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (
                                        (e.key === 'Enter' || e.key === ' ') &&
                                        pickedSourceRouteId
                                      ) {
                                        e.preventDefault();
                                        assignSourceToDate(pickedSourceRouteId, cell.dateStr);
                                      }
                                    }}
                                    className={cn(
                                      'min-h-[88px] rounded-lg border p-1.5 text-left transition-colors',
                                      pickedSourceRouteId
                                        ? 'cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50'
                                        : 'cursor-default',
                                      isToday ? 'border-blue-400 bg-blue-50/40' : 'border-slate-100'
                                    )}
                                  >
                                    <div className="text-[10px] font-black text-slate-600 leading-none mb-1">
                                      {cell.sub}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      {placed.map((sid) => {
                                        const src = routes.find((x) => x.id === sid);
                                        const label =
                                          src?.routeName ||
                                          workers.find((x) => x.id === src?.workerId)?.name ||
                                          'Ruta';
                                        return (
                                          <div
                                            key={`${cell.dateStr}-${sid}`}
                                            className="flex items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5"
                                          >
                                            <span className="truncate text-[9px] font-bold text-slate-700 flex-1 min-w-0">
                                              {label}
                                            </span>
                                            <button
                                              type="button"
                                              className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                removePlacementFromDate(cell.dateStr, sid);
                                              }}
                                              aria-label="Quitar"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Button type="button" variant="secondary" onClick={applyWeeklyPatternToPlacements}>
                    Rellenar con patrón semanal
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 sm:flex-none min-w-[140px]"
                    onClick={savePlanFromCalendar}
                    disabled={isSavingPlan}
                    isLoading={isSavingPlan}
                  >
                    Guardar plan
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPlanCalendarOpen(false)}>
                    Cerrar sin guardar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>
    </APIProvider>
  );
}
