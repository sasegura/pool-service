import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { AdminOverviewRepository, AdminOverviewRoute, AdminOverviewWorkerUser } from '../ports';

export function createAdminOverviewRepositoryFirestore(companyId: string): AdminOverviewRepository {
  return {
    subscribePools(onNext, onError) {
      return onSnapshot(
        collection(db, 'companies', companyId, 'pools'),
        (snap) => {
          const map: Record<string, string> = {};
          snap.docs.forEach((d) => {
            const data = d.data() as { name?: string };
            map[d.id] = data.name || '';
          });
          onNext({ count: snap.size, map });
        },
        onError
      );
    },
    subscribeMembers(onNext, onError) {
      return onSnapshot(
        collection(db, 'companies', companyId, 'members'),
        (snap) => {
          const users: Record<string, string> = {};
          const workers = snap.docs
            .map((d) => {
              const data = d.data();
              users[d.id] = (data.name as string) || (data.email as string) || '';
              const role = (data.role as string) || '';
              return {
                id: d.id,
                name: (data.name as string) || '',
                role,
                lastLocation: data.lastLocation as AdminOverviewWorkerUser['lastLocation'],
                lastActive: data.lastActive as AdminOverviewWorkerUser['lastActive'],
              } as AdminOverviewWorkerUser;
            })
            .filter((u) => u.role === 'technician' || u.role === 'supervisor');
          onNext({ users, workers });
        },
        onError
      );
    },
    subscribeRoutesByDate(selectedDate, onNext, onError) {
      const routesQ = query(
        collection(db, 'companies', companyId, 'routes'),
        where('date', '==', selectedDate)
      );
      return onSnapshot(
        routesQ,
        (snap) => onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AdminOverviewRoute)),
        onError
      );
    },
    subscribeIncidentsCountByDate(selectedDate, onNext, onError) {
      const logsQ = query(collection(db, 'companies', companyId, 'logs'), where('date', '==', selectedDate));
      return onSnapshot(
        logsQ,
        (snap) => onNext(snap.docs.filter((d) => d.data().status === 'issue').length),
        onError
      );
    },
  };
}
