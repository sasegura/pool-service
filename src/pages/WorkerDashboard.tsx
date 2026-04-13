import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, Timestamp, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../components/ui/Common';
import { cn } from '../lib/utils';
import { MapPin, Navigation, CheckCircle2, AlertTriangle, Clock, Play, Map as MapIcon, Loader2, AlertCircle, Droplets } from 'lucide-react';
import { format, parseISO, getDay, addDays, startOfDay } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
const MIAMI_CENTER = { lat: 25.7617, lng: -80.1918 };

import type { PoolRecord } from '../types/pool';
import { PoolStatusBadge } from '../components/PoolStatusBadge';

interface Route {
  id: string;
  poolIds: string[];
  status: 'pending' | 'in-progress' | 'completed';
  date?: string;
  startDate?: string;
  endDate?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  daysOfWeek?: number[];
  assignedDay?: number;
  workerId?: string;
  routeName?: string;
  startTime?: string;
  endTime?: string;
  completedPools?: string[];
  lastPoolId?: string;
  lastStatus?: 'ok' | 'issue';
  templateId?: string;
  planningPriority?: number;
}

const removeUndefinedFields = <T extends Record<string, any>>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

function WorkerRouteMap({
  poolIds,
  pools,
  completedPoolIds,
}: {
  poolIds: string[];
  pools: Record<string, PoolRecord>;
  completedPoolIds?: string[];
}) {
  const [markersReady, setMarkersReady] = useState(false);
  const defaultCenter = React.useMemo(() => {
    for (const id of poolIds) {
      const c = pools[id]?.coordinates;
      if (c) return c;
    }
    return MIAMI_CENTER;
  }, [poolIds, pools]);

  return (
    <Map
      defaultCenter={defaultCenter}
      defaultZoom={12}
      style={{ width: '100%', height: '100%', minHeight: 256 }}
      className="h-full w-full"
      onTilesLoaded={() => setMarkersReady(true)}
    >
      {markersReady &&
        poolIds.map((poolId, index) => {
          const pool = pools[poolId];
          if (!pool?.coordinates) return null;
          const done = completedPoolIds?.includes(pool.id) ?? false;
          return (
            <Marker
              key={pool.id}
              position={pool.coordinates}
              title={pool.name}
              label={{
                text: String(index + 1),
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '11px',
              }}
              optimized
              icon={
                typeof google !== 'undefined' && google.maps?.SymbolPath
                  ? {
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: done ? '#10b981' : '#2563eb',
                      fillOpacity: 1,
                      strokeColor: '#0f172a',
                      strokeWeight: 1,
                      labelOrigin: new google.maps.Point(0, 0),
                    }
                  : undefined
              }
            />
          );
        })}
    </Map>
  );
}

export default function WorkerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const authUid = auth.currentUser?.uid ?? user?.uid;
  /** Rutas antiguas usan `user.uid` (p. ej. demo-worker-id); las nuevas usan el UID real de Auth. */
  const routeOwnerIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (authUid) ids.add(authUid);
    if (user?.uid) ids.add(user.uid);
    return ids;
  }, [authUid, user?.uid]);

  const isMyWorkerRoute = (workerId?: string | null) =>
    Boolean(workerId && routeOwnerIds.has(workerId));

  const dateLocale = i18n.language?.startsWith('en') ? enUS : es;
  const [todayRoute, setTodayRoute] = useState<Route | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<Route[]>([]);
  const [hasOtherRoutes, setHasOtherRoutes] = useState(false);
  const [pools, setPools] = useState<Record<string, PoolRecord>>({});
  const [loading, setLoading] = useState(true);
  const [allMyRoutes, setAllMyRoutes] = useState<Route[]>([]);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [activePoolIndex, setActivePoolIndex] = useState<number | null>(null);
  const [visitStatus, setVisitStatus] = useState<'idle' | 'arrived'>('idle');
  const [incidenceMode, setIncidenceMode] = useState(false);
  const [notes, setNotes] = useState('');
  const [notifyClient, setNotifyClient] = useState(true);

  const isRouteActiveToday = (route: Route, dateStr: string) => {
    const targetDate = startOfDay(parseISO(dateStr));
    const dayOfWeek = getDay(targetDate);

    // 1. Specific date route
    if (route.date === dateStr) return true;

    // 2. Weekly Plan assignment (assignedDay)
    if (route.assignedDay !== undefined && route.assignedDay === dayOfWeek) {
      return true;
    }

    // 3. Scheduled route (Range + Recurrence); endDate opcional = sin límite superior
    if (route.startDate) {
      const start = startOfDay(parseISO(route.startDate));
      if (Number.isNaN(start.getTime())) return false;
      if (targetDate < start) return false;

      if (route.endDate) {
        const end = startOfDay(parseISO(route.endDate));
        if (Number.isNaN(end.getTime())) return false;
        if (targetDate > end) return false;
      }

      if (!route.recurrence || route.recurrence === 'none') return true;

      if (route.recurrence === 'daily') return true;

      if (route.recurrence === 'weekly' && route.daysOfWeek) {
        return route.daysOfWeek.includes(dayOfWeek);
      }

      if (route.recurrence === 'bi-weekly') {
        const diffDays = Math.floor(
          (targetDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays >= 0 && diffDays % 14 === 0;
      }

      if (route.recurrence === 'monthly') {
        return targetDate.getDate() === start.getDate();
      }
    }

    return false;
  };

  useEffect(() => {
    if (authLoading) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Listen for ALL routes to handle templates, weekly plans and daily instances
    const unsubRoutes = onSnapshot(collection(db, 'routes'), async (snapshot) => {
      const allRoutes = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Route));
      setAllMyRoutes(allRoutes.filter(r => isMyWorkerRoute(r.workerId)));
      
      // 1. Find a specific daily instance for today (prioridad de planificación si hay varias)
      const dailyInstances = allRoutes.filter(r => isMyWorkerRoute(r.workerId) && r.date === today);
      const dailyInstance = dailyInstances.sort(
        (a, b) => (a.planningPriority ?? 0) - (b.planningPriority ?? 0)
      )[0];
      
      if (dailyInstance) {
        setTodayRoute(dailyInstance);
      } else {
        // 2. Look for a weekly/scheduled assignment
        const assignedRoute = allRoutes.find(r => isMyWorkerRoute(r.workerId) && isRouteActiveToday(r, today));
        if (assignedRoute) {
          // Virtual route: needs instantiation
          setTodayRoute({
            ...assignedRoute,
            status: 'pending',
            completedPools: [],
            date: today,
            isVirtual: true
          } as any);
        } else {
          setTodayRoute(null);
        }
      }

      // 3. Available routes (templates or unassigned for today)
      const available = allRoutes.filter(r => {
        const isTemplate = !r.date && !r.startDate && !r.assignedDay;
        const isUnassignedToday = r.date === today && !r.workerId;
        return (isTemplate || isUnassignedToday) && (!r.workerId || isMyWorkerRoute(r.workerId));
      });
      setAvailableRoutes(available);
      
      setHasOtherRoutes(allRoutes.some(r => isMyWorkerRoute(r.workerId) && r.date !== today));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching routes:", error);
      setLoading(false);
    });

    // Listen for all pools to have them ready
    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      const poolMap: Record<string, PoolRecord> = {};
      snap.docs.forEach(d => {
        poolMap[d.id] = { id: d.id, ...d.data() } as PoolRecord;
      });
      setPools(poolMap);
    }, (error) => {
      console.error("Error fetching pools:", error);
    });

    return () => {
      unsubRoutes();
      unsubPools();
    };
  }, [authLoading, authUid, user?.uid]);

  useEffect(() => {
    if (!user || !todayRoute || todayRoute.status !== 'in-progress') return;

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          if (!authUid) return;
          await updateDoc(doc(db, 'users', authUid), {
            lastLocation: { lat: latitude, lng: longitude },
            lastActive: serverTimestamp()
          });
        } catch (error) {
          console.error('Error updating location:', error);
        }
      },
      (error) => {
        console.error('Error watching position:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [authUid, user, todayRoute?.status]);

  useEffect(() => {
    if (!todayRoute) return;
    const shouldResume = searchParams.get('resumeVisit') === '1';
    if (!shouldResume) return;

    const resumeRouteId = searchParams.get('routeId');
    const resumePoolId = searchParams.get('poolId');
    if (!resumePoolId) return;
    if (resumeRouteId && resumeRouteId !== todayRoute.id) return;

    const idx = todayRoute.poolIds.findIndex((id) => id === resumePoolId);
    if (idx === -1) return;

    setActivePoolIndex(idx);
    setVisitStatus('arrived');
    setIncidenceMode(false);

    const next = new URLSearchParams(searchParams);
    next.delete('resumeVisit');
    next.delete('routeId');
    next.delete('poolId');
    setSearchParams(next, { replace: true });
  }, [todayRoute, searchParams, setSearchParams]);

  const handlePickRoute = async (routeId: string) => {
    if (!authUid) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const sourceRoute = availableRoutes.find(r => r.id === routeId);
    if (!sourceRoute) return;

    try {
      // Create a NEW instance for today instead of modifying the template
      const newRouteInstance = {
        ...sourceRoute,
        workerId: authUid,
        date: today,
        status: 'pending',
        completedPools: [],
        templateId: routeId,
        createdAt: serverTimestamp()
      };
      delete (newRouteInstance as any).id; // Remove template ID

      await addDoc(collection(db, 'routes'), newRouteInstance);
      toast.success(t('worker.toastRouteAssigned'));
    } catch (e) {
      toast.error(t('worker.toastRouteAssignError'));
    }
  };

  const handleStartDay = async () => {
    if (!todayRoute || !authUid) return;
    
    try {
      if ((todayRoute as any).isVirtual) {
        // Instantiate the weekly/scheduled route for today
        const newInstance = removeUndefinedFields({
          ...todayRoute,
          workerId: authUid,
          status: 'in-progress',
          startTime: new Date().toISOString(),
          completedPools: [],
          templateId: todayRoute.id,
          createdAt: serverTimestamp()
        });
        delete (newInstance as any).id;
        delete (newInstance as any).isVirtual;

        await addDoc(collection(db, 'routes'), newInstance);
        toast.success(t('worker.toastDayStartedNew'));
      } else {
        await updateDoc(doc(db, 'routes', todayRoute.id), { 
          status: 'in-progress',
          startTime: todayRoute.startTime || new Date().toISOString(),
          workerId: authUid
        });
        toast.info(todayRoute.status === 'completed' ? t('worker.toastDayResumed') : t('worker.toastDayStarted'));
      }
    } catch (e) {
      console.error('Error starting day:', e);
      toast.error(t('worker.toastStartError'));
    }
  };

  const handleEndDay = async () => {
    if (!todayRoute || !authUid) return;
    await updateDoc(doc(db, 'routes', todayRoute.id), { 
      status: 'completed',
      endTime: new Date().toISOString(),
      workerId: authUid
    });
    toast.success(t('worker.toastDayFinished'));
  };

  const handleArrive = (index: number) => {
    setActivePoolIndex(index);
    setVisitStatus('arrived');
    toast.success(t('worker.toastArrival'));
  };

  const handleFinish = async (status: 'ok' | 'issue') => {
    if (activePoolIndex === null || !todayRoute || !authUid) return;
    
    const poolId = todayRoute.poolIds[activePoolIndex];
    
    try {
      const logPayload = removeUndefinedFields({
        workerId: authUid,
        poolId,
        arrivalTime: Timestamp.now(), // Simplified for demo
        departureTime: Timestamp.now(),
        status,
        notes: status === 'issue' ? notes : '',
        notifyClient: status === 'issue' ? notifyClient : true,
        date: todayRoute.date
      });
      await addDoc(collection(db, 'logs'), logPayload);

      // Update route progress
      const currentCompleted = todayRoute.completedPools || [];
      if (!currentCompleted.includes(poolId)) {
        const newCompleted = [...currentCompleted, poolId];
        const isAllDone = newCompleted.length === todayRoute.poolIds.length;
        
        await updateDoc(doc(db, 'routes', todayRoute.id), {
          completedPools: newCompleted,
          status: isAllDone ? 'completed' : 'in-progress',
          lastPoolId: poolId,
          lastStatus: status,
          workerId: authUid
        });
      }

      toast.success(status === 'ok' ? t('worker.toastServiceOk') : t('worker.toastIncident'));
      
      // Reset state
      setVisitStatus('idle');
      setActivePoolIndex(null);
      setIncidenceMode(false);
      setNotes('');
      setNotifyClient(true);

      // Check if all done
      // (In a real app, we'd track progress more granularly)
    } catch (e: any) {
      console.error('Error saving worker log:', e);
      toast.error(t('worker.toastSaveError'), {
        description: e?.message || e?.code || 'Unknown error',
      });
    }
  };

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  if (authLoading || loading) return <div className="p-12 text-center flex flex-col items-center gap-4">
    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    <p className="text-slate-500 font-medium">{t('worker.loadingShift')}</p>
  </div>;

  if (!user) return <div className="p-12 text-center text-red-500 font-bold">{t('common.userNotFound')}</div>;

  if (!todayRoute) {
    return (
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-black text-slate-900">{t('worker.myShift')}</h2>
          <p className="text-slate-500">{t('worker.pickRouteTitle')}</p>
        </header>

        {availableRoutes.length > 0 ? (
          <div className="grid gap-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('worker.availableRoutes')}</h3>
            {availableRoutes.map(route => (
              <Card key={route.id} className="p-5 hover:border-blue-300 transition-all group">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <MapIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">{route.routeName || t('worker.unnamedRoute')}</h4>
                      <p className="text-sm text-slate-500">{t('worker.poolsInRoute', { count: route.poolIds.length })}</p>
                    </div>
                  </div>
                  <Button onClick={() => handlePickRoute(route.id)} className="gap-2">
                    {t('worker.chooseRoute')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-slate-100 p-6 rounded-full mb-6">
              <Clock className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{t('worker.noRouteToday')}</h2>
            {hasOtherRoutes ? (
              <div className="space-y-4 w-full max-w-md">
                <p className="text-slate-500">{t('worker.otherDaysHint', { date: format(new Date(), 'dd/MM/yyyy') })}</p>
                <Button variant="outline" onClick={() => setShowAllRoutes(!showAllRoutes)} className="w-full">
                  {showAllRoutes ? t('worker.hideOtherRoutes') : t('worker.showOtherRoutes')}
                </Button>
                {showAllRoutes && (
                  <div className="grid gap-2 text-left">
                    {allMyRoutes.filter(r => r.date !== format(new Date(), 'yyyy-MM-dd')).map(r => (
                      <div key={r.id} className="p-3 bg-white border rounded-lg text-sm flex justify-between items-center shadow-sm">
                        <div>
                          <div className="font-bold text-slate-900">{r.routeName || t('worker.routeFallback')}</div>
                          <div className="text-xs text-slate-500">{r.date || t('worker.noDate')} • {t('worker.poolsCountShort', { count: r.poolIds.length })}</div>
                        </div>
                        <Button size="sm" onClick={() => handlePickRoute(r.id)} className="h-8 px-3 text-xs">{t('worker.bringToToday')}</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500">{t('worker.noRoutesAvailable')}</p>
            )}
            
            <div className="mt-12 p-4 bg-slate-50 rounded-xl border border-slate-200 text-left w-full max-w-md">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('worker.diagnosticsTitle')}</h4>
              <div className="space-y-2 text-[10px] font-mono text-slate-500">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>{t('worker.myUid')}</span>
                  <span className="text-slate-900 font-bold">{user.uid}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>{t('worker.todayDate')}</span>
                  <span className="text-slate-900 font-bold">{format(new Date(), 'yyyy-MM-dd')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>{t('worker.totalRoutes')}</span>
                  <span className="text-slate-900 font-bold">{allMyRoutes.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isInvalidKey = !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'MY_GOOGLE_MAPS_API_KEY';

  if (isInvalidKey) {
    return (
      <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200">
        <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-amber-900 mb-2">{t('worker.missingMapsKeyTitle')}</h2>
        <p className="text-sm text-amber-700">
          {t('worker.missingMapsKeyBody')}
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">{t('worker.myRoute')}</h2>
            <p className="text-slate-500">{format(new Date(), i18n.language?.startsWith('en') ? 'EEEE, MMMM d, yyyy' : "EEEE, d 'de' MMMM", { locale: dateLocale })}</p>
          </div>
          <div className="flex gap-2">
            {todayRoute.status === 'pending' && (
              <Button variant="primary" onClick={handleStartDay} className="gap-2">
                <Play className="w-4 h-4" /> {t('worker.startDay')}
              </Button>
            )}
            {todayRoute.status === 'in-progress' && (
              <Button variant="danger" onClick={handleEndDay} className="gap-2 shadow-lg shadow-red-100">
                {t('worker.endDay')}
              </Button>
            )}
            {todayRoute.status === 'completed' && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  {(todayRoute.completedPools?.length || 0) < todayRoute.poolIds.length && (
                    <Button variant="primary" onClick={handleStartDay} size="sm" className="gap-2">
                      <Play className="w-3 h-3" /> {t('worker.continueDay')}
                    </Button>
                  )}
                  <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {t('worker.finished')}
                  </div>
                </div>
                {todayRoute.startTime && todayRoute.endTime && (
                  <span className="text-[10px] text-slate-400 mt-1 font-mono">
                    {format(new Date(todayRoute.startTime), 'HH:mm')} - {format(new Date(todayRoute.endTime), 'HH:mm')}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Route Map */}
        <Card className="overflow-hidden h-64 relative border-none shadow-lg">
          <div className="absolute inset-0 z-0 min-h-[16rem]">
            <WorkerRouteMap
              poolIds={todayRoute.poolIds}
              pools={pools}
              completedPoolIds={todayRoute.completedPools}
            />
          </div>
          <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/90 backdrop-blur p-3 rounded-xl shadow-xl flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <MapIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('worker.progress')}</div>
                <div className="text-sm font-black text-slate-900">
                  {t('worker.poolsProgress', { done: todayRoute.completedPools?.length || 0, total: todayRoute.poolIds.length })}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
        {todayRoute.poolIds.map((poolId, index) => {
          const pool = pools[poolId];
          if (!pool) return null;
          const isActive = activePoolIndex === index;
          const isCompleted = todayRoute.completedPools?.includes(poolId);

          return (
            <Card key={poolId} className={cn(
              "transition-all duration-300",
              isActive ? "ring-2 ring-blue-500 border-transparent" : "",
              isCompleted ? "opacity-75 bg-slate-50" : ""
            )}>
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0 pr-2">
                    <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-1">
                      {t('worker.poolNumber', { n: index + 1 })}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{pool.name}</h3>
                      <PoolStatusBadge status={pool.healthStatus} size="sm" />
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {pool.address}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openInMaps(pool.address)}
                    className="h-10 w-10 p-0 rounded-full"
                  >
                    <Navigation className="w-5 h-5 text-blue-600" />
                  </Button>
                </div>

                <AnimatePresence mode="wait">
                  {visitStatus === 'idle' && !isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {isCompleted ? (
                        <div className="w-full h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center gap-2 text-emerald-600 font-bold">
                          <CheckCircle2 className="w-5 h-5" />
                          {t('worker.serviceCompleted')}
                        </div>
                      ) : (
                        <Button 
                          variant="primary" 
                          className="w-full h-12 text-lg font-bold"
                          onClick={() => handleArrive(index)}
                          disabled={todayRoute.status === 'pending' || todayRoute.status === 'completed'}
                        >
                          {t('worker.arrived')}
                        </Button>
                      )}
                    </motion.div>
                  )}

                  {isActive && visitStatus === 'arrived' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3"
                    >
                      {!incidenceMode ? (
                        <div className="space-y-3">
                          <Link to={`/pools/${poolId}/visit?routeId=${encodeURIComponent(todayRoute.id)}`} className="block">
                            <Button type="button" variant="outline" className="w-full min-h-[52px] text-base font-black gap-2">
                              <Droplets className="w-5 h-5 text-blue-600" />
                              {t('worker.waterMeasurement')}
                            </Button>
                          </Link>
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="success"
                              className="h-16 flex-col gap-1"
                              onClick={() => handleFinish('ok')}
                            >
                              <CheckCircle2 className="w-6 h-6" />
                              <span>{t('worker.allOk')}</span>
                            </Button>
                            <Button variant="danger" className="h-16 flex-col gap-1" onClick={() => setIncidenceMode(true)}>
                              <AlertTriangle className="w-6 h-6" />
                              <span>{t('worker.incident')}</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 bg-red-50 p-4 rounded-xl border border-red-100">
                          <label className="text-sm font-bold text-red-900">{t('worker.incidentDetails')}</label>
                          <textarea 
                            className="w-full rounded-lg border-red-200 p-3 text-sm focus:ring-red-500 focus:border-red-500"
                            rows={3}
                            placeholder={t('worker.describeProblem')}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                              checked={notifyClient}
                              onChange={(e) => setNotifyClient(e.target.checked)}
                            />
                            <span className="text-xs font-bold text-red-800 group-hover:text-red-900 transition-colors">
                              {t('worker.notifyClientHistory')}
                            </span>
                          </label>
                          <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setIncidenceMode(false)}>{t('common.cancel')}</Button>
                            <Button variant="danger" className="flex-1" onClick={() => handleFinish('issue')} disabled={!notes.trim()}>{t('worker.report')}</Button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
    </APIProvider>
  );
}
