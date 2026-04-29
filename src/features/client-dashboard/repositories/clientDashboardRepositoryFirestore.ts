import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { ClientDashboardLog, ClientDashboardPool, ClientDashboardRepository } from '../ports';

const FIRESTORE_IN_MAX = 30;

export function createClientDashboardRepositoryFirestore(companyId: string): ClientDashboardRepository {
  return {
    subscribeWorkers(onNext, onError) {
      return onSnapshot(
        collection(db, 'companies', companyId, 'members'),
        (snap) => {
          const map: Record<string, string> = {};
          snap.docs.forEach((d) => {
            const data = d.data();
            map[d.id] = (data.name as string) || (data.email as string) || '';
          });
          onNext(map);
        },
        onError
      );
    },
    subscribePoolsAndLogs(userUid, onNext, onError) {
      let unsubLogs: UnsubscribeFn | undefined;
      const qPools = query(collection(db, 'companies', companyId, 'pools'), where('clientId', '==', userUid));
      const unsubPools = onSnapshot(
        qPools,
        (snap) => {
          unsubLogs?.();
          unsubLogs = undefined;
          const pools = snap.docs.map(
            (d) => ({ ...(d.data() as Omit<ClientDashboardPool, 'id'>), id: d.id }) as ClientDashboardPool
          );
          if (pools.length === 0) {
            onNext({ pools, logs: [] });
            return;
          }
          const poolIds = pools.map((p) => p.id).slice(0, FIRESTORE_IN_MAX);
          const qLogs = query(
            collection(db, 'companies', companyId, 'logs'),
            where('poolId', 'in', poolIds),
            orderBy('date', 'desc')
          );
          unsubLogs = onSnapshot(
            qLogs,
            (logSnap) => {
              const logs = logSnap.docs
                .map(
                  (d) =>
                    ({ ...(d.data() as Omit<ClientDashboardLog, 'id'>), id: d.id }) as ClientDashboardLog
                )
                .filter((log) => log.notifyClient !== false)
                .sort((a, b) => (b.arrivalTime?.toMillis?.() || 0) - (a.arrivalTime?.toMillis?.() || 0));
              onNext({ pools, logs });
            },
            onError
          );
        },
        onError
      );
      return () => {
        unsubPools();
        unsubLogs?.();
      };
    },
  };
}

type UnsubscribeFn = () => void;
