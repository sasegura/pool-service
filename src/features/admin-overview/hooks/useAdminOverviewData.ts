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

export function useAdminOverviewData(selectedDate: string, enabled: boolean, companyId: string | undefined) {
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
    if (!enabled || !companyId) return;

    const unsubPools = onSnapshot(collection(db, 'companies', companyId, 'pools'), (snap) => {
      setPoolsCount(snap.size);
      const pMap: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as { name?: string };
        pMap[d.id] = data.name || '';
      });
      setPools(pMap);
    });

    const unsubMembers = onSnapshot(collection(db, 'companies', companyId, 'members'), (snap) => {
      const uMap: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        uMap[d.id] = (data.name as string) || (data.email as string) || '';
      });
      setUsers(uMap);

      const workerDocs = snap.docs
        .map((d) => {
          const data = d.data();
          const r = (data.role as string) || '';
          return {
            id: d.id,
            name: (data.name as string) || '',
            role: r,
            lastLocation: data.lastLocation as AdminOverviewWorkerUser['lastLocation'],
            lastActive: data.lastActive as AdminOverviewWorkerUser['lastActive'],
          } as AdminOverviewWorkerUser;
        })
        .filter((u) => u.role === 'technician' || u.role === 'supervisor');

      setAllWorkers(workerDocs);
      setWorkersCount(workerDocs.length);
      setLiveWorkers(workerDocs.filter((w) => w.lastLocation));
    });

    const routesQ = query(
      collection(db, 'companies', companyId, 'routes'),
      where('date', '==', selectedDate)
    );
    const unsubRoutes = onSnapshot(routesQ, (snap) => {
      const routeDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminOverviewRoute));
      setRoutes(routeDocs);
      setCompletedCount(routeDocs.filter((d) => d.status === 'completed').length);
    });

    const logsQ = query(
      collection(db, 'companies', companyId, 'logs'),
      where('date', '==', selectedDate)
    );
    const unsubLogs = onSnapshot(logsQ, (snap) => {
      setIncidentsCount(snap.docs.filter((d) => d.data().status === 'issue').length);
    });

    return () => {
      unsubPools();
      unsubMembers();
      unsubRoutes();
      unsubLogs();
    };
  }, [selectedDate, enabled, companyId]);

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
