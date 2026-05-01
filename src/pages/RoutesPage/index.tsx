import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card } from '../../components/ui/Common';
import { cn } from '../../lib/utils';
import { Trash2, Map as MapIcon, List, AlertCircle, Edit2, ArrowUp, ArrowDown, X } from 'lucide-react';
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
import type { Locale } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { optimizeRoute } from '../../services/geminiService';
import { useAuth } from '../../contexts/AuthContext';
import { useAppServices } from '../../app/providers/AppServicesContext';
import { useTranslation } from 'react-i18next';
import { getGoogleMapsApiKey, isMapsIntegrationEnabled } from '../../config/env';
import { MIAMI_CENTER } from '../../features/routes/constants';
import { DeferredMapMount } from '../../features/routes/components/DeferredMapMount';
import { resolveRouteNameForSave } from '../../features/routes/domain/routeNaming';
import { defaultNewRouteForm, isDatedRoute, isLegacyUndated } from '../../features/routes/domain/routePredicates';
import { useRoutesDirectory } from '../../features/routes/hooks/useRoutesDirectory';
import type { RouteDocument as Route, RoutesPool as Pool } from '../../features/routes/types';
import { RoutesPageHeader } from './components/RoutesPageHeader';
import { RoutesWeeklyPlanningCalendarCard } from './components/RoutesWeeklyPlanningCalendarCard';
import { RoutesRecurringDefinitionsSection } from './components/RoutesRecurringDefinitionsSection';
import { RoutesLegacyUndatedSection } from './components/RoutesLegacyUndatedSection';
import { RoutesMapOverviewCard } from './components/RoutesMapOverviewCard';

const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
const MAPS_INTEGRATION_ENABLED = isMapsIntegrationEnabled();

export default function RoutesPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : es;
  const weekdayInitials = t('routesPage.weekdayInitials', { returnObjects: true }) as string[];
  const calendarWeekdayHeaders = t('routesPage.calendarWeekdays', { returnObjects: true }) as string[];
  const { user, loading: authLoading, companyId } = useAuth();
  const { routesCommands } = useAppServices();
  const { pools, workers, routes } = useRoutesDirectory(!authLoading && !!user && !!companyId, companyId ?? undefined);
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
  const [routeFormBusy, setRouteFormBusy] = useState(false);
  /** Semana modelo: cualquier fecha dentro de la semana (lun–dom) de la que se copian rutas por día de la semana */
  const [planSourceWeekAnchor, setPlanSourceWeekAnchor] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );
  /** Si la ruta origen no lleva técnico, las instancias usarán este (vacío = primer técnico de la lista) */
  const [fallbackWorkerIdForPlan, setFallbackWorkerIdForPlan] = useState('');
  const canUseMaps =
    MAPS_INTEGRATION_ENABLED && !!GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'MY_GOOGLE_MAPS_API_KEY';

  const weeklyRequiresAtLeastOneDay = useMemo(
    () =>
      newRoute.isScheduled &&
      newRoute.recurrence === 'weekly' &&
      newRoute.daysOfWeek.length === 0,
    [newRoute.isScheduled, newRoute.recurrence, newRoute.daysOfWeek]
  );

  const recurrenceLabel = (r?: string) => {
    switch (r) {
      case 'none':
      case undefined:
        return t('routesPage.oneOff');
      case 'daily':
        return t('routesPage.recDaily');
      case 'weekly':
        return t('routesPage.recWeekly');
      case 'bi-weekly':
        return t('routesPage.recBiweekly');
      case 'monthly':
        return t('routesPage.recMonthly');
      default:
        return r || '';
    }
  };

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const selectedRoutePools = (selectedRoute?.poolIds || [])
    .map((id) => pools.find((p) => p.id === id))
    .filter(Boolean) as Pool[];

  /** Mapa: todas las piscinas, o solo las de la ruta si hay una seleccionada */
  const poolsForMapView = useMemo(() => {
    if (selectedRouteId && selectedRoute) {
      return selectedRoutePools;
    }
    return pools;
  }, [selectedRouteId, selectedRoute, selectedRoutePools, pools]);

  const mapViewCenter = useMemo(() => {
    if (poolsForMapView.length > 0 && poolsForMapView[0].coordinates) {
      return poolsForMapView[0].coordinates;
    }
    return MIAMI_CENTER;
  }, [poolsForMapView]);

  const datedRoutes = useMemo(() => routes.filter(isDatedRoute), [routes]);

  const legacyUndated = useMemo(() => routes.filter(isLegacyUndated), [routes]);

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
        label: format(day, 'EEEE', { locale: dateLocale }),
        routes: routes
          .filter((r) => routeMatchesDate(r, dateStr))
          .sort((a, b) => (a.planningPriority ?? 0) - (b.planningPriority ?? 0),
          ),
      };
    });
  }, [routes, planningSelectedDate, routeMatchesDate, dateLocale]);

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

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (routeFormBusy) return;
    if (newRoute.poolIds.length === 0) {
      toast.error(t('routesPage.errSelectPool'));
      return;
    }
    if (!newRoute.isScheduled && !newRoute.date) {
      toast.error(t('routesPage.errServiceDate'));
      return;
    }
    if (newRoute.isScheduled && newRoute.hasEndDate && !newRoute.endDate) {
      toast.error(t('routesPage.errEndDateOrUncheck'));
      return;
    }
    if (weeklyRequiresAtLeastOneDay) {
      toast.error(t('routesPage.errWeekday'));
      return;
    }
    setRouteFormBusy(true);
    try {
      const trimmedName = (newRoute.routeName || '').trim();
      const routeName = resolveRouteNameForSave(
        trimmedName,
        newRoute.isScheduled,
        newRoute.recurrence,
        newRoute.daysOfWeek,
        newRoute.date,
        newRoute.startDate,
        dateLocale
      );

      const routeToSave: Record<string, unknown> = {
        poolIds: newRoute.poolIds,
        routeName,
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
        if (!routesCommands) return;
        await routesCommands.updateRoute(editingRouteId, routeToSave);
        toast.success(t('routesPage.toastUpdated'));
      } else {
        routeToSave.createdAt = new Date().toISOString();
        routeToSave.order = datedRoutes.length;
        if (!routesCommands) return;
        await routesCommands.createRoute(routeToSave);
        toast.success(t('routesPage.toastSaved'));
      }
      setNewRoute(defaultNewRouteForm());
      setShowRouteForm(false);
      setEditingRouteId(null);
    } catch {
      toast.error(t('routesPage.toastSaveError'));
    } finally {
      setRouteFormBusy(false);
    }
  };

  const tryCloseRouteForm = useCallback(() => {
    if (weeklyRequiresAtLeastOneDay) {
      toast.error(t('routesPage.errWeekday'));
      return;
    }
    setRouteFormBusy(false);
    setShowRouteForm(false);
    setEditingRouteId(null);
  }, [weeklyRequiresAtLeastOneDay, t]);

  useEffect(() => {
    if (!showRouteForm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRouteFormBusy(false);
        setShowRouteForm(false);
        setEditingRouteId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showRouteForm]);

  useEffect(() => {
    if (canUseMaps) return;
    if (routeViewMode !== 'list') setRouteViewMode('list');
  }, [canUseMaps, routeViewMode]);

  const handleEdit = (route: Route) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    /** Ruta puntual: tiene día de servicio y no es definición por rango (evita guardar como recurrente y borrar `date`). */
    const isOneOffDated = Boolean(route.date) && !route.startDate;
    setNewRoute({
      workerId: route.workerId || '',
      date: route.date || today,
      startDate: route.startDate || route.date || today,
      endDate: route.endDate || '',
      hasEndDate: !!route.endDate,
      recurrence: route.recurrence || 'none',
      daysOfWeek: route.daysOfWeek || [],
      poolIds: route.poolIds,
      routeName: route.routeName || '',
      noWorker: !route.workerId,
      isScheduled: !isOneOffDated,
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
      const name = (r.routeName || '').trim() || t('routesPage.routeFallback');
      const worker = workers.find((w) => w.id === r.workerId)?.name;
      const tech = worker ? ` · ${worker}` : '';
      if (r.date) return `${name} · ${r.date}${tech}`;
      if (r.startDate) {
        const range = r.endDate
          ? `${r.startDate} ${t('routesPage.rangeArrow')} ${r.endDate}`
          : t('routesPage.dateFrom', { date: r.startDate });
        return `${name} · ${range}${tech}`;
      }
      return `${name}${tech}`;
    },
    [workers, t]
  );

  const getPoolAssignmentHint = useCallback(
    (poolId: string) => {
      const others = getOtherRoutesWithPool(poolId);
      if (others.length === 0) return null;
      if (others.length === 1) return formatRouteAssignmentHint(others[0]);
      return t('routesPage.moreRoutesHint', {
        count: others.length,
        hint: formatRouteAssignmentHint(others[0]),
      });
    },
    [getOtherRoutesWithPool, formatRouteAssignmentHint, t]
  );

  const deleteRoute = async (id: string, routeName?: string) => {
    const label = (routeName || '').trim() || t('routesPage.deleteFallback');
    const shouldDelete = window.confirm(t('routesPage.deleteConfirm', { label }));
    if (shouldDelete) {
      if (!routesCommands) return;
      await routesCommands.deleteRoute(id);
      toast.info(t('routesPage.toastDeleted'));
    }
  };

  const handleOptimize = async () => {
    if (newRoute.poolIds.length < 2) {
      toast.error(t('routesPage.errOptimizeMin'));
      return;
    }

    setIsOptimizing(true);
    try {
      const selectedPools = newRoute.poolIds
        .map((id) => pools.find((p) => p.id === id))
        .filter(Boolean) as Pool[];

      const optimizedIds = await optimizeRoute(selectedPools);
      setNewRoute((prev) => ({ ...prev, poolIds: optimizedIds }));
      toast.success(t('routesPage.toastOptimized'));
    } catch {
      toast.error(t('routesPage.toastOptimizeError'));
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
      toast.error(t('routesPage.errInvalidStart'));
      return;
    }
    const fromSourceWeek = buildByDowFromSourceWeek();
    const byDow = fromSourceWeek || buildByDowFromAllDatedRoutes();
    if (!byDow) {
      toast.error(t('routesPage.errNoDatedRoutes'));
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
      toast.success(t('routesPage.toastPatternFilled'));
    } else {
      toast.success(t('routesPage.toastPatternFallback'));
    }
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
      toast.error(t('routesPage.errPlaceRoute'));
      return;
    }

    const defaultWorker = resolveDefaultWorkerForPlan();
    setIsSavingPlan(true);
    const keys = existingPlannedKeys();
    let created = 0;
    let skipped = 0;

    try {
      const instancesToCreate: Record<string, unknown>[] = [];

      for (const [dateStr, sourceIds] of entries) {
        let p = 0;
        for (const srcId of sourceIds) {
          const src = routes.find((r) => r.id === srcId);
          if (!src) {
            p++;
            continue;
          }
          /** No crear instancia el mismo día que la ruta origen (origen ya es la ruta de ese día). */
          if ((src.date || '') === dateStr) {
            skipped++;
            p++;
            continue;
          }
          const key = `${dateStr}|${srcId}`;
          const duplicateInstance = routes.some(
            (r) => r.id !== srcId && r.date === dateStr && r.templateId === srcId
          );
          if (keys.has(key) || duplicateInstance) {
            skipped++;
            p++;
            continue;
          }
          keys.add(key);

          const srcWorker = (src.workerId || '').trim();
          const workerId = srcWorker || defaultWorker;

          instancesToCreate.push({
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
        }
      }

      if (!routesCommands) return;
      await routesCommands.createPlannedInstances(instancesToCreate);
      toast.success(
        t('routesPage.toastPlanSavedFull', {
          created,
          skippedPart: skipped ? t('routesPage.toastPlanSkippedPart', { count: skipped }) : '',
        })
      );
      setPlanCalendarOpen(false);
      setPlacementsByDate({});
    } catch {
      toast.error(t('routesPage.errSavePlan'));
    } finally {
      setIsSavingPlan(false);
    }
  };

  if (!companyId) {
    return <div className="p-8 text-center text-slate-600">{t('common.loadingGeneric')}</div>;
  }

  const content = (
    <div className="space-y-6">
        <RoutesPageHeader
          onNewRoute={() => {
            setShowRouteForm(true);
            setEditingRouteId(null);
            setNewRoute(defaultNewRouteForm());
          }}
        />

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
                aria-label={t('routesPage.closeAria')}
              >
                <X className="w-5 h-5" />
              </button>
              <form onSubmit={handleAddRoute} className="space-y-4 p-4 sm:pr-14">
              <h3 id="route-form-title" className="font-bold text-blue-900">
                {editingRouteId ? t('routesPage.editRoute') : t('routesPage.newRouteForm')}
              </h3>

              {!newRoute.isScheduled && (
                <div className="rounded-xl border border-blue-100 bg-white p-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    {t('routesPage.serviceDateField')}
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border-slate-200 p-2 text-sm"
                    value={newRoute.date}
                    onChange={(e) => setNewRoute({ ...newRoute, date: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {t('routesPage.nameOptional')}
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border-slate-200 p-2 text-sm bg-white"
                  placeholder={t('routesPage.namePlaceholder')}
                  value={newRoute.routeName}
                  onChange={(e) => setNewRoute({ ...newRoute, routeName: e.target.value })}
                />
              </div>

              {newRoute.isScheduled && (
                <div className="space-y-4 p-4 bg-white rounded-xl border border-blue-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {t('routesPage.startDate')}
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
                          {t('routesPage.includeEndDate')}
                        </span>
                      </label>
                      {newRoute.hasEndDate && (
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {t('routesPage.endDate')}
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
                      {t('routesPage.recurrence')}
                    </label>
                    <select
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      value={newRoute.recurrence}
                      onChange={(e) =>
                        setNewRoute({ ...newRoute, recurrence: e.target.value as Route['recurrence'] })
                      }
                    >
                      <option value="none">{t('routesPage.recNone')}</option>
                      <option value="daily">{t('routesPage.recDaily')}</option>
                      <option value="weekly">{t('routesPage.recWeekly')}</option>
                      <option value="bi-weekly">{t('routesPage.recBiweekly')}</option>
                      <option value="monthly">{t('routesPage.recMonthly')}</option>
                    </select>
                  </div>

                  {newRoute.recurrence === 'weekly' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {t('routesPage.weekdays')}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {weekdayInitials.map((day, i) => (
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
              )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                      {t('routesPage.technician')}
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRoute.noWorker}
                        onChange={(e) => setNewRoute({ ...newRoute, noWorker: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      {t('routesPage.unassigned')}
                    </label>
                  </div>
                  <select
                    className="w-full rounded-lg border-slate-200 p-2 text-sm disabled:bg-slate-100 disabled:text-slate-400 bg-white"
                    value={newRoute.workerId}
                    onChange={(e) => setNewRoute({ ...newRoute, workerId: e.target.value })}
                    disabled={newRoute.noWorker}
                  >
                    <option value="">{t('routesPage.selectPlaceholder')}</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                        {w.id === user?.uid ? t('routesPage.youSuffix') : ''}
                      </option>
                    ))}
                  </select>
                </div>

              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 uppercase">
                  {t('routesPage.poolsStopOrder')}
                </label>
                <div className="flex items-center gap-2">
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
                    {canUseMaps ? (
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
                    ) : null}
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
                                    {t('routesPage.onThisRoute')}
                                  </span>
                                )}
                                {otherHint && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded flex items-center gap-0.5 max-w-[140px]">
                                    <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate" title={otherHint}>
                                      {t('routesPage.alsoOtherRoute')}
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
                        {t('routesPage.stopOrder')}
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
                  <DeferredMapMount deferKey={routeViewMode}>
                    <Map defaultCenter={MIAMI_CENTER} defaultZoom={11}>
                      {pools.map((p) => {
                        const otherHint = getPoolAssignmentHint(p.id);
                        const isSelected = newRoute.poolIds.includes(p.id);
                        const title = otherHint ? `${p.name} — ${otherHint}` : p.name;
                        const labelText = isSelected
                          ? String(newRoute.poolIds.indexOf(p.id) + 1)
                          : otherHint
                            ? '!'
                            : undefined;

                        return (
                          <Marker
                            key={p.id}
                            position={p.coordinates || MIAMI_CENTER}
                            title={title}
                            onClick={() => togglePoolInRoute(p.id)}
                            label={labelText}
                          />
                        );
                      })}
                    </Map>
                  </DeferredMapMount>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={routeFormBusy} isLoading={routeFormBusy}>
                  {editingRouteId ? t('routesPage.update') : t('routesPage.save')}
                </Button>
                <Button type="button" variant="outline" onClick={tryCloseRouteForm}>
                  {t('common.cancel')}
                </Button>
              </div>
              </form>
            </Card>
          </div>
        )}

        <RoutesWeeklyPlanningCalendarCard
          planningSelectedDate={planningSelectedDate}
          onPlanningSelectedDateChange={setPlanningSelectedDate}
          weeklyPlanningDays={weeklyPlanningDays}
          workers={workers}
          onToggleSelectedRoute={(routeId) =>
            setSelectedRouteId((cur) => (cur === routeId ? null : routeId))
          }
        />

        <RoutesRecurringDefinitionsSection
          routes={recurringDefinitions}
          workers={workers}
          pools={pools}
          selectedRouteId={selectedRouteId}
          onSelectRoute={setSelectedRouteId}
          recurrenceLabel={recurrenceLabel}
          onEdit={handleEdit}
          onDelete={deleteRoute}
        />

        <RoutesLegacyUndatedSection
          legacyUndated={legacyUndated}
          onEdit={handleEdit}
          onDelete={deleteRoute}
        />

        {!showRouteForm && canUseMaps && (
          <RoutesMapOverviewCard
            routes={routes}
            selectedRouteId={selectedRouteId}
            onClearSelection={() => setSelectedRouteId(null)}
            poolsForMapView={poolsForMapView}
            mapViewCenter={mapViewCenter}
          />
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
                aria-label={t('routesPage.closeAria')}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-5 sm:p-6 pr-14 space-y-4">
                <div>
                  <h3 id="plan-calendar-title" className="text-lg font-black text-slate-900">
                    {t('routesPage.planModalTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                    {t('routesPage.planModalIntro')}
                  </p>
                </div>

                {pickedSourceRouteId && (
                  <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                    <span className="font-bold">{t('routesPage.selectedRoute')}</span>
                    <span className="truncate">
                      {routes.find((r) => r.id === pickedSourceRouteId)?.routeName ||
                        routes.find((r) => r.id === pickedSourceRouteId)?.id}
                    </span>
                    <span className="text-indigo-600 shrink-0">{t('routesPage.tapDay')}</span>
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-4 space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {t('routesPage.routesCount', { count: assignableRoutes.length })}
                    </h4>
                    <div className="max-h-[min(420px,50vh)] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                      {assignableRoutes.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500">
                          {t('routesPage.noDatedRoutesHint')}
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
                                {r.routeName || w?.name || t('routesPage.routeFallback')}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {r.date} · {t('routesPage.poolsCount', { count: r.poolIds.length })} · {w?.name || t('routesPage.noTechnician')}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-3 min-w-0">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {t('routesPage.calendarWeeksTitle')}
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 space-y-4">
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">
                        {calendarWeekdayHeaders.map((h) => (
                          <div key={h}>{h}</div>
                        ))}
                      </div>
                      {calendarWeeks.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4 text-center">
                          {t('routesPage.adjustPanelHint')}
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
                                          t('routesPage.routeFallback');
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
                                              aria-label={t('routesPage.removeAria')}
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
                    {t('routesPage.fillWeeklyPattern')}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 sm:flex-none min-w-[140px]"
                    onClick={savePlanFromCalendar}
                    disabled={isSavingPlan}
                    isLoading={isSavingPlan}
                  >
                    {t('routesPage.savePlan')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPlanCalendarOpen(false)}>
                    {t('routesPage.closeWithoutSave')}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>
  );

  if (!canUseMaps) return content;
  return <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>{content}</APIProvider>;
}
