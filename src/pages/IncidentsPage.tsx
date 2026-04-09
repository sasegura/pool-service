import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card } from '../components/ui/Common';
import { AlertCircle, Calendar, MapPin, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Incident {
  id: string;
  poolId: string;
  workerId: string;
  notes: string;
  status: string;
  date: string;
  arrivalTime?: any;
}

interface Pool {
  id: string;
  name: string;
}

interface Worker {
  id: string;
  name: string;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [pools, setPools] = useState<Record<string, string>>({});
  const [workers, setWorkers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      const pMap: Record<string, string> = {};
      snap.docs.forEach(d => pMap[d.id] = d.data().name);
      setPools(pMap);
    });

    const unsubWorkers = onSnapshot(collection(db, 'users'), (snap) => {
      const wMap: Record<string, string> = {};
      snap.docs.forEach(d => wMap[d.id] = d.data().name);
      setWorkers(wMap);
    });

    const q = query(collection(db, 'logs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(q, (snap) => {
      const allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Incident));
      setIncidents(allLogs.filter(log => log.status === 'issue'));
      setLoading(false);
    });

    return () => {
      unsubPools();
      unsubWorkers();
      unsubLogs();
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black text-slate-900">Incidencias Reportadas</h2>
        <p className="text-slate-500 font-medium">Historial de problemas detectados durante los servicios</p>
      </header>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Cargando incidencias...</div>
      ) : incidents.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2">
          <div className="bg-emerald-50 p-4 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No hay incidencias</h3>
          <p className="text-slate-500">Todo parece estar funcionando correctamente.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {incidents.map(incident => (
            <Card key={incident.id} className="p-5 border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      Incidencia
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ID: {incident.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {pools[incident.poolId] || 'Piscina desconocida'}
                  </h3>
                  <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg italic border border-slate-100">
                    "{incident.notes}"
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 md:text-right md:flex-col md:items-end">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {workers[incident.workerId] || 'Técnico desconocido'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(incident.date + 'T00:00:00'), 'dd MMM, yyyy', { locale: es })}
                  </div>
                  {incident.arrivalTime && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Reportado a las {format(incident.arrivalTime.toDate(), 'HH:mm')}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
