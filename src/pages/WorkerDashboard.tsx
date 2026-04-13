import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, Timestamp, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../components/ui/Common';
import { cn } from '../lib/utils';
import { MapPin, Navigation, CheckCircle2, AlertTriangle, Clock, Play, Map as MapIcon, Loader2, AlertCircle } from 'lucide-react';
import { format, isWithinInterval, parseISO, getDay, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
const MIAMI_CENTER = { lat: 25.7617, lng: -80.1918 };

interface Pool {
  id: string;
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}

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

function WorkerRouteMap({
  poolIds,
  pools,
  completedPoolIds,
}: {
  poolIds: string[];
  pools: Record<string, Pool>;
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
  const { t } = useTranslation();
  const [todayRoute, setTodayRoute] = useState<Route | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<Route[]>([]);
  const [hasOtherRoutes, setHasOtherRoutes] = useState(false);
  const [pools, setPools] = useState<Record<string, Pool>>({});
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

    // 3. Scheduled route (Range + Recurrence)
    if (route.startDate && route.endDate) {
      const start = startOfDay(parseISO(route.startDate));
      const end = startOfDay(parseISO(route.endDate));

      if (isWithinInterval(targetDate, { start, end })) {
        if (!route.recurrence || route.recurrence === 'none') return true;
        
        if (route.recurrence === 'daily') return true;
        
        if (route.recurrence === 'weekly' && route.daysOfWeek) {
          return route.daysOfWeek.includes(dayOfWeek);
        }

        if (route.recurrence === 'bi-weekly') {
          const diffDays = Math.floor((targetDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return (diffDays % 14) === 0;
        }

        if (route.recurrence === 'monthly') {
          return targetDate.getDate() === start.getDate();
        }
      }
    }

    return false;
  };

  useEffect(() => {
    if (authLoading || !user?.uid) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const userUid = user.uid;
    
    // Listen for ALL routes to handle templates, weekly plans and daily instances
    const unsubRoutes = onSnapshot(collection(db, 'routes'), async (snapshot) => {
      const allRoutes = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Route));
      setAllMyRoutes(allRoutes.filter(r => r.workerId === userUid));
      
      // 1. Find a specific daily instance for today (prioridad de planificación si hay varias)
      const dailyInstances = allRoutes.filter(r => r.workerId === userUid && r.date === today);
      const dailyInstance = dailyInstances.sort(
        (a, b) => (a.planningPriority ?? 0) - (b.planningPriority ?? 0)
      )[0];
      
      if (dailyInstance) {
        setTodayRoute(dailyInstance);
      } else {
        // 2. Look for a weekly/scheduled assignment
        const assignedRoute = allRoutes.find(r => r.workerId === userUid && isRouteActiveToday(r, today));
        if (assignedRoute) {
          // Virtual route: needs instantiation
          setTodayRoute({
            ...assignedRoute,
            status: 'pending',
            completedPools: [],
            startTime: undefined,
            endTime: undefined,
            lastPoolId: undefined,
            lastStatus: undefined,
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
        return (isTemplate || isUnassignedToday) && (!r.workerId || r.workerId === userUid);
      });
      setAvailableRoutes(available);
      
      setHasOtherRoutes(allRoutes.some(r => r.workerId === userUid && r.date !== today));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching routes:", error);
      setLoading(false);
    });

    // Listen for all pools to have them ready
    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      const poolMap: Record<string, Pool> = {};
      snap.docs.forEach(d => {
        poolMap[d.id] = { id: d.id, ...d.data() } as Pool;
      });
      setPools(poolMap);
    }, (error) => {
      console.error("Error fetching pools:", error);
    });

    return () => {
      unsubRoutes();
      unsubPools();
    };
  }, [user?.uid, authLoading]);

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
          await updateDoc(doc(db, 'users', user.uid), {
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
  }, [user, todayRoute?.status]);

  const handlePickRoute = async (routeId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const sourceRoute = availableRoutes.find(r => r.id === routeId);
    if (!sourceRoute) return;

    try {
      // Create a NEW instance for today instead of modifying the template
      const newRouteInstance = {
        ...sourceRoute,
        workerId: user?.uid,
        date: today,
        status: 'pending',
        completedPools: [],
        templateId: routeId,
        createdAt: serverTimestamp()
      };
      delete (newRouteInstance as any).id; // Remove template ID

      await addDoc(collection(db, 'routes'), newRouteInstance);
      toast.success('Ruta asignada para hoy');
    } catch (e) {
      toast.error('Error al asignar la ruta');
    }
  };

  const handleStartDay = async () => {
    if (!todayRoute) return;
    
    try {
      if ((todayRoute as any).isVirtual) {
        // Instantiate the weekly/scheduled route for today
        const newInstance = {
          ...todayRoute,
          status: 'in-progress',
          startTime: new Date().toISOString(),
          completedPools: [],
          templateId: todayRoute.id,
          createdAt: serverTimestamp()
        };
        delete (newInstance as any).id;
        delete (newInstance as any).isVirtual;

        await addDoc(collection(db, 'routes'), newInstance);
        toast.success('Jornada iniciada (Nueva instancia diaria)');
      } else {
        await updateDoc(doc(db, 'routes', todayRoute.id), { 
          status: 'in-progress',
          startTime: todayRoute.startTime || new Date().toISOString()
        });
        toast.info(todayRoute.status === 'completed' ? 'Jornada reanudada' : 'Jornada iniciada');
      }
    } catch (e) {
      toast.error('Error al iniciar jornada');
    }
  };

  const handleEndDay = async () => {
    if (!todayRoute) return;
    await updateDoc(doc(db, 'routes', todayRoute.id), { 
      status: 'completed',
      endTime: new Date().toISOString()
    });
    toast.success('Jornada finalizada. ¡Buen trabajo!');
  };

  const handleArrive = (index: number) => {
    setActivePoolIndex(index);
    setVisitStatus('arrived');
    toast.success('Llegada registrada');
  };

  const handleFinish = async (status: 'ok' | 'issue') => {
    if (activePoolIndex === null || !todayRoute) return;
    
    const poolId = todayRoute.poolIds[activePoolIndex];
    
    try {
      await addDoc(collection(db, 'logs'), {
        workerId: user?.uid,
        poolId,
        arrivalTime: Timestamp.now(), // Simplified for demo
        departureTime: Timestamp.now(),
        status,
        notes: status === 'issue' ? notes : '',
        notifyClient: status === 'issue' ? notifyClient : true,
        date: todayRoute.date
      });

      // Update route progress
      const currentCompleted = todayRoute.completedPools || [];
      if (!currentCompleted.includes(poolId)) {
        const newCompleted = [...currentCompleted, poolId];
        const isAllDone = newCompleted.length === todayRoute.poolIds.length;
        
        await updateDoc(doc(db, 'routes', todayRoute.id), {
          completedPools: newCompleted,
          status: isAllDone ? 'completed' : 'in-progress',
          lastPoolId: poolId,
          lastStatus: status
        });
      }

      toast.success(status === 'ok' ? 'Servicio finalizado correctamente' : 'Incidencia reportada');
      
      // Reset state
      setVisitStatus('idle');
      setActivePoolIndex(null);
      setIncidenceMode(false);
      setNotes('');
      setNotifyClient(true);

      // Check if all done
      // (In a real app, we'd track progress more granularly)
    } catch (e) {
      toast.error('Error al guardar el registro');
    }
  };

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  if (authLoading || loading) return <div className="p-12 text-center flex flex-col items-center gap-4">
    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    <p className="text-slate-500 font-medium">Cargando tu jornada...</p>
  </div>;

  if (!user) return <div className="p-12 text-center text-red-500 font-bold">Error: Usuario no encontrado</div>;

  if (!todayRoute) {
    return (
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-black text-slate-900">Mi Jornada</h2>
          <p className="text-slate-500">Selecciona una ruta para comenzar hoy</p>
        </header>

        {availableRoutes.length > 0 ? (
          <div className="grid gap-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Rutas Disponibles</h3>
            {availableRoutes.map(route => (
              <Card key={route.id} className="p-5 hover:border-blue-300 transition-all group">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <MapIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">{route.routeName || 'Ruta sin nombre'}</h4>
                      <p className="text-sm text-slate-500">{route.poolIds.length} piscinas en esta ruta</p>
                    </div>
                  </div>
                  <Button onClick={() => handlePickRoute(route.id)} className="gap-2">
                    Elegir esta ruta
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
                <p className="text-slate-500">Tienes rutas asignadas para otros días, pero ninguna para hoy ({format(new Date(), 'dd/MM/yyyy')}).</p>
                <Button variant="outline" onClick={() => setShowAllRoutes(!showAllRoutes)} className="w-full">
                  {showAllRoutes ? 'Ocultar otras rutas' : 'Ver mis rutas de otros días'}
                </Button>
                {showAllRoutes && (
                  <div className="grid gap-2 text-left">
                    {allMyRoutes.filter(r => r.date !== format(new Date(), 'yyyy-MM-dd')).map(r => (
                      <div key={r.id} className="p-3 bg-white border rounded-lg text-sm flex justify-between items-center shadow-sm">
                        <div>
                          <div className="font-bold text-slate-900">{r.routeName || 'Ruta'}</div>
                          <div className="text-xs text-slate-500">{r.date || 'Sin fecha'} • {r.poolIds.length} piscinas</div>
                        </div>
                        <Button size="sm" onClick={() => handlePickRoute(r.id)} className="h-8 px-3 text-xs">Traer a hoy</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500">No hay rutas disponibles para elegir en este momento.</p>
            )}
            
            <div className="mt-12 p-4 bg-slate-50 rounded-xl border border-slate-200 text-left w-full max-w-md">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Información de Diagnóstico</h4>
              <div className="space-y-2 text-[10px] font-mono text-slate-500">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Mi UID:</span>
                  <span className="text-slate-900 font-bold">{user.uid}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Fecha Hoy:</span>
                  <span className="text-slate-900 font-bold">{format(new Date(), 'yyyy-MM-dd')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Rutas totales:</span>
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
        <h2 className="text-xl font-bold text-amber-900 mb-2">Falta la API Key de Google Maps</h2>
        <p className="text-sm text-amber-700">
          Por favor, configura tu <strong>VITE_GOOGLE_MAPS_API_KEY</strong> en el panel de Secretos de AI Studio para habilitar el seguimiento de rutas.
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
            <p className="text-slate-500">{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</p>
          </div>
          <div className="flex gap-2">
            {todayRoute.status === 'pending' && (
              <Button variant="primary" onClick={handleStartDay} className="gap-2">
                <Play className="w-4 h-4" /> Comenzar Jornada
              </Button>
            )}
            {todayRoute.status === 'in-progress' && (
              <Button variant="danger" onClick={handleEndDay} className="gap-2 shadow-lg shadow-red-100">
                Finalizar Jornada
              </Button>
            )}
            {todayRoute.status === 'completed' && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  {(todayRoute.completedPools?.length || 0) < todayRoute.poolIds.length && (
                    <Button variant="primary" onClick={handleStartDay} size="sm" className="gap-2">
                      <Play className="w-3 h-3" /> Continuar Jornada
                    </Button>
                  )}
                  <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Finalizada
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
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progreso</div>
                <div className="text-sm font-black text-slate-900">
                  {todayRoute.completedPools?.length || 0} / {todayRoute.poolIds.length} Piscinas
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
                  <div>
                    <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-1">
                      Piscina {index + 1}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{pool.name}</h3>
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
                          Servicio Completado
                        </div>
                      ) : (
                        <Button 
                          variant="primary" 
                          className="w-full h-12 text-lg font-bold"
                          onClick={() => handleArrive(index)}
                          disabled={todayRoute.status === 'pending' || todayRoute.status === 'completed'}
                        >
                          Llegué
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
                        <div className="grid grid-cols-2 gap-3">
                          <Button 
                            variant="success" 
                            className="h-16 flex-col gap-1"
                            onClick={() => handleFinish('ok')}
                          >
                            <CheckCircle2 className="w-6 h-6" />
                            <span>Todo OK</span>
                          </Button>
                          <Button 
                            variant="danger" 
                            className="h-16 flex-col gap-1"
                            onClick={() => setIncidenceMode(true)}
                          >
                            <AlertTriangle className="w-6 h-6" />
                            <span>Incidencia</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3 bg-red-50 p-4 rounded-xl border border-red-100">
                          <label className="text-sm font-bold text-red-900">Detalles de la incidencia</label>
                          <textarea 
                            className="w-full rounded-lg border-red-200 p-3 text-sm focus:ring-red-500 focus:border-red-500"
                            rows={3}
                            placeholder="Describe el problema..."
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
                              Notificar al cliente (mostrar en su historial)
                            </span>
                          </label>
                          <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setIncidenceMode(false)}>Cancelar</Button>
                            <Button variant="danger" className="flex-1" onClick={() => handleFinish('issue')} disabled={!notes.trim()}>Reportar</Button>
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
