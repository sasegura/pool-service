import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card } from '../components/ui/Common';
import { Waves, Users, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminOverview() {
  const [poolsCount, setPoolsCount] = useState(0);
  const [workersCount, setWorkersCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [incidentsCount, setIncidentsCount] = useState(0);

  useEffect(() => {
    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      setPoolsCount(snap.size);
    });
    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      setWorkersCount(snap.docs.filter(d => d.data().role === 'worker').length);
    });
    const unsubRoutes = onSnapshot(collection(db, 'routes'), (snap) => {
      setCompletedCount(snap.docs.filter(d => d.data().status === 'completed').length);
    });
    const unsubLogs = onSnapshot(collection(db, 'logs'), (snap) => {
      setIncidentsCount(snap.docs.filter(d => d.data().status === 'issue').length);
    });

    return () => {
      unsubPools();
      unsubUsers();
      unsubRoutes();
      unsubLogs();
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black text-slate-900">Vista General</h2>
        <p className="text-slate-500 font-medium">Estado actual de la operación en Miami</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-6 bg-blue-50 border-blue-100 flex flex-col justify-between">
          <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase mb-1">Total Piscinas</div>
            <div className="text-3xl font-black text-blue-900">{poolsCount}</div>
          </div>
        </Card>

        <Card className="p-6 bg-slate-50 border-slate-100 flex flex-col justify-between">
          <div className="bg-slate-600 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-slate-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase mb-1">Personal Activo</div>
            <div className="text-3xl font-black text-slate-900">{workersCount}</div>
          </div>
        </Card>

        <Card className="p-6 bg-emerald-50 border-emerald-100 flex flex-col justify-between">
          <div className="bg-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-200">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Completados</div>
            <div className="text-3xl font-black text-emerald-900">{completedCount}</div>
          </div>
        </Card>

        <Card className="p-6 bg-red-50 border-red-100 flex flex-col justify-between">
          <div className="bg-red-600 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-red-200">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-red-600 uppercase mb-1">Incidencias</div>
            <div className="text-3xl font-black text-red-900">{incidentsCount}</div>
          </div>
        </Card>
      </div>

      {/* Recent Activity or Quick Links could go here */}
      <Card className="p-8 border-dashed border-2 flex flex-col items-center justify-center text-center">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Clock className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Actividad Reciente</h3>
        <p className="text-slate-500 max-w-xs">Próximamente: Historial de actividad en tiempo real de todos los técnicos.</p>
      </Card>
    </div>
  );
}

function Clock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
