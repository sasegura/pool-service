import { useEffect, useMemo, useState } from 'react';
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

export function useClientDashboard(userUid: string | undefined, userEmail: string | undefined) {
  const [pools, setPools] = useState<ClientDashboardPool[]>([]);
  const [logs, setLogs] = useState<ClientDashboardLog[]>([]);
  const [workers, setWorkers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [poolOwnerDocIds, setPoolOwnerDocIds] = useState<string[]>([]);

  const poolOwnerKey = useMemo(() => poolOwnerDocIds.slice().sort().join(','), [poolOwnerDocIds]);

  useEffect(() => {
    if (!userUid) {
      setPoolOwnerDocIds([]);
      return;
    }
    const email = (userEmail || '').trim().toLowerCase();
    setPoolOwnerDocIds([userUid]);
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const ids = new Set<string>([userUid]);
      if (email) {
        snap.docs.forEach((d) => {
          const em = (d.data().email as string | undefined)?.trim().toLowerCase();
          if (em && em === email) ids.add(d.id);
        });
      }
      setPoolOwnerDocIds(Array.from(ids));
    });
    return () => unsub();
  }, [userUid, userEmail]);

  useEffect(() => {
    if (!userUid || poolOwnerDocIds.length === 0) {
      setPools([]);
      setLogs([]);
      setLoading(false);
      return;
    }

    let unsubLogs: (() => void) | undefined;

    const unsubWorkers = onSnapshot(collection(db, 'users'), (snap) => {
      const wMap: Record<string, string> = {};
      snap.docs.forEach((d) => {
        wMap[d.id] = d.data().name as string;
      });
      setWorkers(wMap);
    });

    const inIds = poolOwnerDocIds.slice(0, FIRESTORE_IN_MAX);
    const qPools =
      inIds.length === 1
        ? query(collection(db, 'pools'), where('clientId', '==', inIds[0]))
        : query(collection(db, 'pools'), where('clientId', 'in', inIds));

    const unsubPools = onSnapshot(
      qPools,
      (snap) => {
        unsubLogs?.();
        unsubLogs = undefined;

        const poolsData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClientDashboardPool));
        setPools(poolsData);

        if (poolsData.length > 0) {
          const poolIds = poolsData.map((p) => p.id);
          const qLogs = query(
            collection(db, 'logs'),
            where('poolId', 'in', poolIds),
            orderBy('date', 'desc')
          );

          unsubLogs = onSnapshot(qLogs, (logSnap) => {
            const logsData = logSnap.docs
              .map((d) => ({ id: d.id, ...d.data() } as ClientDashboardLog))
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
  }, [userUid, poolOwnerKey]);

  return { pools, logs, workers, loading };
}
