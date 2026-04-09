import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, Timestamp, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card } from '../components/ui/Common';
import { cn } from '../lib/utils';
import { MapPin, Navigation, CheckCircle2, AlertTriangle, Clock, Play, Map as MapIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

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
  date: string;
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [todayRoute, setTodayRoute] = useState<Route | null>(null);
  const [pools, setPools] = useState<Record<string, Pool>>({});
  const [loading, setLoading] = useState(true);
  const [activePoolIndex, setActivePoolIndex] = useState<number | null>(null);
  const [visitStatus, setVisitStatus] = useState<'idle' | 'arrived'>('idle');
  const [incidenceMode, setIncidenceMode] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(
      collection(db, 'routes'),
      where('workerId', '==', user.uid),
      where('date', '==', today)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const routeData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Route;
        setTodayRoute(routeData);

        // Fetch pool details
        const poolIds = routeData.poolIds;
        const poolMap: Record<string, Pool> = {};
        for (const id of poolIds) {
          const pDoc = await getDocs(query(collection(db, 'pools'))); // Simple fetch for now
          pDoc.forEach(d => {
            if (poolIds.includes(d.id)) poolMap[d.id] = { id: d.id, ...d.data() } as Pool;
          });
        }
        setPools(poolMap);
      } else {
        setTodayRoute(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStartDay = async () => {
    if (!todayRoute) return;
    await updateDoc(doc(db, 'routes', todayRoute.id), { status: 'in-progress' });
    toast.info('Jornada iniciada');
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
        date: todayRoute.date
      });

      toast.success(status === 'ok' ? 'Servicio finalizado correctamente' : 'Incidencia reportada');
      
      // Reset state
      setVisitStatus('idle');
      setActivePoolIndex(null);
      setIncidenceMode(false);
      setNotes('');

      // Check if all done
      // (In a real app, we'd track progress more granularly)
    } catch (e) {
      toast.error('Error al guardar el registro');
    }
  };

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  if (loading) return <div className="p-8 text-center">Cargando ruta...</div>;

  if (!todayRoute) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-slate-100 p-6 rounded-full mb-6">
          <Clock className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">No tienes ruta asignada hoy</h2>
        <p className="text-slate-500">Contacta con administración si crees que es un error.</p>
      </div>
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200">
        <h2 className="text-xl font-bold text-amber-900 mb-2">Falta la API Key de Google Maps</h2>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Mi Ruta</h2>
            <p className="text-slate-500">{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</p>
          </div>
          {todayRoute.status === 'pending' && (
            <Button variant="primary" onClick={handleStartDay} className="gap-2">
              <Play className="w-4 h-4" /> Comenzar Día
            </Button>
          )}
        </header>

        {/* Route Map */}
        <Card className="overflow-hidden h-64 relative border-none shadow-lg">
          <Map
            defaultCenter={MIAMI_CENTER}
            defaultZoom={11}
            mapId="worker_route_map"
          >
            {todayRoute.poolIds.map((poolId, index) => {
              const pool = pools[poolId];
              if (!pool) return null;
              return (
                <AdvancedMarker
                  key={pool.id}
                  position={pool.coordinates || MIAMI_CENTER}
                >
                  <Pin 
                    background={todayRoute.completedPools?.includes(pool.id) ? '#10b981' : '#2563eb'} 
                    glyphColor={'#fff'} 
                    borderColor={'#000'}
                  >
                    {(index + 1).toString()}
                  </Pin>
                </AdvancedMarker>
              );
            })}
          </Map>
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-xl flex items-center justify-between">
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
          const isCompleted = false; // Simplified

          return (
            <Card key={poolId} className={cn(
              "transition-all duration-300",
              isActive ? "ring-2 ring-blue-500 border-transparent" : ""
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
                      <Button 
                        variant="primary" 
                        className="w-full h-12 text-lg font-bold"
                        onClick={() => handleArrive(index)}
                        disabled={todayRoute.status === 'pending'}
                      >
                        Llegué
                      </Button>
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
