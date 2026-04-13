import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
export interface AdminOverviewRoute {
  id: string;
  workerId: string;
  poolIds: string[];
  completedPools?: string[];
  status: 'pending' | 'in-progress' | 'completed';
  lastPoolId?: string;
  lastStatus?: 'ok' | 'issue';
  date: string;
  startDate?: string;
  endDate?: string;
  recurrence?: string;
  assignedDay?: number;
  startTime?: string;
  endTime?: string;
}

export interface AdminOverviewWorkerUser {
  id: string;
  name: string;
  role: string;
  lastLocation?: { lat: number; lng: number };
  lastActive?: { toDate?: () => Date };
}

export function useAdminOverviewData(selectedDate: string, enabled: boolean) {
  const [poolsCount, setPoolsCount] = useState(0);
  const [workersCount, setWorkersCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [incidentsCount, setIncidentsCount] = useState(0);
  const [routes, setRoutes] = useState<AdminOverviewRoute[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [allWorkers, setAllWorkers] = useState<AdminOverviewWorkerUser[]>([]);
  const [pools, setPools] = useState<Record<string, string>>({});
  const [liveWorkers, setLiveWorkers] = useState<AdminOverviewWorkerUser[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      setPoolsCount(snap.size);
      const pMap: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as { name?: string };
        pMap[d.id] = data.name || '';
      });
      setPools(pMap);
    });

    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      const workerDocs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AdminOverviewWorkerUser))
        .filter((u) => u.role === 'worker' || (u as { isWorker?: boolean }).isWorker);

      setAllWorkers(workerDocs);
      setWorkersCount(workerDocs.length);
      setLiveWorkers(workerDocs.filter((w) => w.lastLocation));

      const uMap: Record<string, string> = {};
      snap.docs.forEach((d) => {
        uMap[d.id] = d.data().name as string;
      });
      setUsers(uMap);
    });

    const routesQ = query(collection(db, 'routes'), where('date', '==', selectedDate));
    const unsubRoutes = onSnapshot(routesQ, (snap) => {
      const routeDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminOverviewRoute));
      setRoutes(routeDocs);
      setCompletedCount(routeDocs.filter((d) => d.status === 'completed').length);
    });

    const logsQ = query(collection(db, 'logs'), where('date', '==', selectedDate));
    const unsubLogs = onSnapshot(logsQ, (snap) => {
      setIncidentsCount(snap.docs.filter((d) => d.data().status === 'issue').length);
    });

    return () => {
      unsubPools();
      unsubUsers();
      unsubRoutes();
      unsubLogs();
    };
  }, [selectedDate, enabled]);

  return {
    poolsCount,
    workersCount,
    completedCount,
    incidentsCount,
    routes,
    users,
    allWorkers,
    pools,
    liveWorkers,
  };
}
