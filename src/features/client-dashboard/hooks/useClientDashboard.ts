import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const FIRESTORE_IN_MAX = 30;

export interface ClientDashboardPool {
  id: string;
  name: string;
  address: string;
  clientId?: string;
}

export interface ClientDashboardLog {
  id: string;
  poolId: string;
  workerId: string;
  arrivalTime: { toMillis?: () => number; toDate?: () => Date };
  status: 'ok' | 'issue';
  notes?: string;
  date: string;
  notifyClient?: boolean;
}

export function useClientDashboard(userUid: string | undefined, companyId: string | undefined) {
  const [pools, setPools] = useState<ClientDashboardPool[]>([]);
  const [logs, setLogs] = useState<ClientDashboardLog[]>([]);
  const [workers, setWorkers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userUid || !companyId) {
      setPools([]);
      setLogs([]);
      setLoading(false);
      return;
    }

    let unsubLogs: (() => void) | undefined;

    const unsubWorkers = onSnapshot(collection(db, 'companies', companyId, 'members'), (snap) => {
      const wMap: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        wMap[d.id] = (data.name as string) || (data.email as string) || '';
      });
      setWorkers(wMap);
    });

    const qPools = query(
      collection(db, 'companies', companyId, 'pools'),
      where('clientId', '==', userUid)
    );

    const unsubPools = onSnapshot(
      qPools,
      (snap) => {
        unsubLogs?.();
        unsubLogs = undefined;

        const poolsData = snap.docs.map(
          (d) => ({ ...(d.data() as Omit<ClientDashboardPool, 'id'>), id: d.id }) as ClientDashboardPool
        );
        setPools(poolsData);

        if (poolsData.length > 0) {
          const poolIds = poolsData.map((p) => p.id).slice(0, FIRESTORE_IN_MAX);
          const qLogs = query(
            collection(db, 'companies', companyId, 'logs'),
            where('poolId', 'in', poolIds),
            orderBy('date', 'desc')
          );

          unsubLogs = onSnapshot(qLogs, (logSnap) => {
            const logsData = logSnap.docs
              .map(
                (d) =>
                  ({ ...(d.data() as Omit<ClientDashboardLog, 'id'>), id: d.id }) as ClientDashboardLog
              )
              .filter((log) => log.notifyClient !== false);

            const sortedLogs = logsData.sort((a, b) => {
              const timeA = a.arrivalTime?.toMillis?.() || 0;
              const timeB = b.arrivalTime?.toMillis?.() || 0;
              return timeB - timeA;
            });
            setLogs(sortedLogs);
            setLoading(false);
          });
        } else {
          setLogs([]);
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
      }
    );

    return () => {
      unsubWorkers();
      unsubPools();
      unsubLogs?.();
    };
  }, [userUid, companyId]);

  return { pools, logs, workers, loading };
}
