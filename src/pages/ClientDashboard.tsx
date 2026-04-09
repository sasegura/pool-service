import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Common';
import { Waves, Calendar, CheckCircle2, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Pool {
  id: string;
  name: string;
  address: string;
  clientId: string;
}

interface Log {
  id: string;
  poolId: string;
  workerName: string;
  timestamp: any;
  status: 'ok' | 'issue';
  notes?: string;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch pools owned by this client
    const qPools = query(collection(db, 'pools'), where('clientId', '==', user.uid));
    const unsubPools = onSnapshot(qPools, (snap) => {
      const poolsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Pool));
      setPools(poolsData);
      
      if (poolsData.length > 0) {
        // Fetch logs for these pools
        const poolIds = poolsData.map(p => p.id);
        const qLogs = query(
          collection(db, 'logs'), 
          where('poolId', 'in', poolIds),
          orderBy('timestamp', 'desc')
        );
        
        const unsubLogs = onSnapshot(qLogs, (snap) => {
          setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Log)));
          setLoading(false);
        });

        return () => unsubLogs();
      } else {
        setLoading(false);
      }
    });

    return () => unsubPools();
  }, [user]);

  if (loading) return <div className="p-8 text-center">Cargando historial...</div>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black text-slate-900">Mi Piscina</h2>
        <p className="text-slate-500">Historial de mantenimiento y limpieza</p>
      </header>

      {pools.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-2">
          <Waves className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No hay piscinas vinculadas</h3>
          <p className="text-slate-500">Contacta con administración para vincular tu propiedad.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {pools.map(pool => (
            <div key={pool.id} className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <Waves className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">{pool.name}</h3>
                  <div className="flex items-center text-xs text-slate-500 font-bold uppercase tracking-wider">
                    <MapPin className="w-3 h-3 mr-1" /> {pool.address}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Revisiones Recientes</h4>
                {logs.filter(l => l.poolId === pool.id).length === 0 ? (
                  <p className="text-sm text-slate-400 italic ml-1">Aún no hay registros de servicio.</p>
                ) : (
                  logs.filter(l => l.poolId === pool.id).map(log => (
                    <Card key={log.id} className="p-4 hover:border-blue-200 transition-colors group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                            log.status === 'ok' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                          )}>
                            {log.status === 'ok' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-black text-slate-900">
                                {log.status === 'ok' ? 'Servicio Completado' : 'Incidencia Reportada'}
                              </span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-tighter">
                                {log.workerName}
                              </span>
                            </div>
                            <div className="flex items-center text-xs text-slate-500 font-bold gap-3">
                              <div className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {log.timestamp?.toDate ? format(log.timestamp.toDate(), "d MMM, yyyy", { locale: es }) : 'Recientemente'}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {log.timestamp?.toDate ? format(log.timestamp.toDate(), "HH:mm") : ''}
                              </div>
                            </div>
                            {log.notes && (
                              <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-600 border border-slate-100 italic">
                                "{log.notes}"
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
