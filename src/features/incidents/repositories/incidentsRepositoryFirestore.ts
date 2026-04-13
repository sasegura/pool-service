import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { ServiceIncidentLog } from '../types';

export function subscribePoolNames(
  companyId: string,
  onNext: (map: Record<string, string>) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(
    collection(db, 'companies', companyId, 'pools'),
    (snap) => {
      const pMap: Record<string, string> = {};
      snap.docs.forEach((d) => {
        pMap[d.id] = (d.data().name as string) || '';
      });
      onNext(pMap);
    },
    onError
  );
}

export function subscribeWorkerNames(
  companyId: string,
  onNext: (map: Record<string, string>) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(
    collection(db, 'companies', companyId, 'members'),
    (snap) => {
      const wMap: Record<string, string> = {};
      snap.docs.forEach((d) => {
        wMap[d.id] = (d.data().name as string) || '';
      });
      onNext(wMap);
    },
    onError
  );
}

export function subscribeIssueIncidents(
  companyId: string,
  filterDate: string,
  onNext: (incidents: ServiceIncidentLog[]) => void,
  onError?: (e: unknown) => void
) {
  let q = query(collection(db, 'companies', companyId, 'logs'), orderBy('date', 'desc'));
  if (filterDate) {
    q = query(
      collection(db, 'companies', companyId, 'logs'),
      where('date', '==', filterDate),
      orderBy('date', 'desc')
    );
  }
  return onSnapshot(
    q,
    (snap) => {
      const allLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceIncidentLog));
      onNext(allLogs.filter((log) => log.status === 'issue'));
    },
    onError
  );
}
