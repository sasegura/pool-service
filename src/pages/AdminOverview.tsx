import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { Card } from '../components/ui/Common';
import { Waves, Users, CheckCircle, AlertCircle, Clock, MapPin, Calendar as CalendarIcon, Navigation } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
const MIAMI_CENTER = { lat: 25.7617, lng: -80.1918 };

interface Route {
  id: string;
  workerId: string;
  poolIds: string[];
  completedPools?: string[];
  status: 'pending' | 'in-progress' | 'completed';
  lastPoolId?: string;
  lastStatus?: 'ok' | 'issue';
  date: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  lastLocation?: { lat: number; lng: number };
  lastActive?: any;
}

interface Pool {
  id: string;
  name: string;
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [poolsCount, setPoolsCount] = useState(0);
  const [workersCount, setWorkersCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [incidentsCount, setIncidentsCount] = useState(0);
  
  const [routes, setRoutes] = useState<Route[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [pools, setPools] = useState<Record<string, string>>({});
  const [liveWorkers, setLiveWorkers] = useState<User[]>([]);

  useEffect(() => {
    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      setPoolsCount(snap.size);
      const pMap: Record<string, string> = {};
      snap.docs.forEach(d => pMap[d.id] = d.data().name);
      setPools(pMap);
    });
    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      const workerDocs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as User))
        .filter(u => u.role === 'worker');
      
      setWorkersCount(workerDocs.length);
      setLiveWorkers(workerDocs.filter(w => w.lastLocation));
      
      const uMap: Record<string, string> = {};
      snap.docs.forEach(d => uMap[d.id] = d.data().name);
      setUsers(uMap);
    });
    
    const routesQ = query(collection(db, 'routes'), where('date', '==', selectedDate));
    const unsubRoutes = onSnapshot(routesQ, (snap) => {
      const routeDocs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Route));
      setRoutes(routeDocs);
      setCompletedCount(routeDocs.filter(d => d.status === 'completed').length);
    });

    const logsQ = query(collection(db, 'logs'), where('date', '==', selectedDate));
    const unsubLogs = onSnapshot(logsQ, (snap) => {
      setIncidentsCount(snap.docs.filter(d => d.data().status === 'issue').length);
    });

    return () => {
      unsubPools();
      unsubUsers();
      unsubRoutes();
      unsubLogs();
    };
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Vista General</h2>
          <p className="text-slate-500 font-medium">Estado actual de la operación en Miami</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <input 
            type="date" 
            className="text-sm font-bold text-slate-700 border-none focus:ring-0 p-0"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card 
          className="p-6 bg-blue-50 border-blue-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
          onClick={() => navigate('/pools')}
        >
          <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase mb-1">Total Piscinas</div>
            <div className="text-3xl font-black text-blue-900">{poolsCount}</div>
          </div>
        </Card>

        <Card 
          className="p-6 bg-slate-50 border-slate-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
          onClick={() => navigate('/team')}
        >
          <div className="bg-slate-600 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-slate-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase mb-1">Personal Activo</div>
            <div className="text-3xl font-black text-slate-900">{workersCount}</div>
          </div>
        </Card>

        <Card 
          className="p-6 bg-emerald-50 border-emerald-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
          onClick={() => navigate('/routes')}
        >
          <div className="bg-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-200">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Completados</div>
            <div className="text-3xl font-black text-emerald-900">{completedCount}</div>
          </div>
        </Card>

        <Card 
          className="p-6 bg-red-50 border-red-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
          onClick={() => navigate('/incidents')}
        >
          <div className="bg-red-600 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-red-200">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-red-600 uppercase mb-1">Incidencias</div>
            <div className="text-3xl font-black text-red-900">{incidentsCount}</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-slate-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Estado de Rutas</h3>
                <p className="text-xs text-slate-500">
                  {selectedDate === format(new Date(), 'yyyy-MM-dd') 
                    ? 'Progreso en tiempo real de todas las rutas activas hoy' 
                    : `Historial de rutas para el día ${format(new Date(selectedDate + 'T00:00:00'), 'dd/MM/yyyy')}`}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> En Vivo
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-100">
                    <th className="px-6 py-3">Técnico</th>
                    <th className="px-6 py-3">Horario</th>
                    <th className="px-6 py-3">Última Parada</th>
                    <th className="px-6 py-3">Progreso</th>
                    <th className="px-6 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                        No hay rutas asignadas para el día {format(new Date(selectedDate + 'T00:00:00'), 'dd/MM/yyyy')}
                      </td>
                    </tr>
                  ) : (
                    routes.map(route => {
                      const progress = Math.round(((route.completedPools?.length || 0) / route.poolIds.length) * 100);
                      const isIncident = route.lastStatus === 'issue';
                      
                      return (
                        <tr key={route.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                {users[route.workerId]?.charAt(0) || '?'}
                              </div>
                              <span className="text-sm font-bold text-slate-700">{users[route.workerId] || 'Cargando...'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-[11px] font-mono text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {route.startTime ? format(new Date(route.startTime), 'HH:mm') : '--:--'}
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> {route.endTime ? format(new Date(route.endTime), 'HH:mm') : '--:--'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {route.lastPoolId ? pools[route.lastPoolId] : <span className="text-slate-300 italic">Sin actividad</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full max-w-[100px]">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-slate-900">{progress}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-500",
                                    progress === 100 ? "bg-emerald-500" : isIncident ? "bg-red-500" : "bg-blue-500"
                                  )}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded text-[10px] font-bold uppercase",
                              route.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                              isIncident ? "bg-red-100 text-red-700" :
                              route.status === 'in-progress' ? "bg-blue-100 text-blue-700" :
                              "bg-slate-100 text-slate-600"
                            )}>
                              {isIncident ? 'Incidencia' : route.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border-slate-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600" /> Ubicación en Tiempo Real
              </h3>
            </div>
            <div className="h-[400px] relative">
              {GOOGLE_MAPS_API_KEY ? (
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                  <Map
                    defaultCenter={MIAMI_CENTER}
                    defaultZoom={11}
                    mapId="admin_tracking_map"
                  >
                    {liveWorkers.map((worker) => (
                      <AdvancedMarker
                        key={worker.id}
                        position={worker.lastLocation!}
                      >
                        <Pin 
                          background={'#2563eb'} 
                          glyphColor={'#fff'} 
                          borderColor={'#000'}
                        >
                          <Users className="w-3 h-3" />
                        </Pin>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white px-2 py-1 rounded shadow-md border border-slate-200 text-[10px] font-bold whitespace-nowrap">
                          {worker.name}
                        </div>
                      </AdvancedMarker>
                    ))}
                  </Map>
                </APIProvider>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-400 text-xs text-center p-8">
                  Configura GOOGLE_MAPS_API_KEY para ver el mapa de seguimiento
                </div>
              )}
            </div>
            <div className="p-4 bg-white">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Técnicos Activos</h4>
              <div className="space-y-3">
                {liveWorkers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay técnicos con GPS activo en este momento.</p>
                ) : (
                  liveWorkers.map(worker => (
                    <div key={worker.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-700">{worker.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {worker.lastActive?.toDate ? format(worker.lastActive.toDate(), 'HH:mm:ss') : 'Hace un momento'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
