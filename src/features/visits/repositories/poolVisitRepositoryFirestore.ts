import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { PoolRecord } from '../../../types/pool';
import type { PoolVisitRepository } from '../ports';

export function createPoolVisitRepositoryFirestore(companyId: string): PoolVisitRepository {
  return {
    fetchPoolById(poolId) {
      return fetchPoolById(companyId, poolId);
    },
    fetchRecentVisitDocs(poolId, maxDocs) {
      return fetchRecentVisitDocs(companyId, poolId, maxDocs);
    },
    savePoolVisitWithPoolUpdate(poolId, visitPayload, buildPoolUpdate) {
      return savePoolVisitWithPoolUpdate(companyId, poolId, visitPayload, buildPoolUpdate);
    },
  };
}

export async function fetchPoolById(companyId: string, poolId: string): Promise<PoolRecord | null> {
  const snap = await getDoc(doc(db, 'companies', companyId, 'pools', poolId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<PoolRecord, 'id'>), id: snap.id } as PoolRecord;
}

export async function fetchRecentVisitDocs(
  companyId: string,
  poolId: string,
  maxDocs: number
): Promise<Record<string, unknown>[]> {
  const visitsSnap = await getDocs(
    query(
      collection(db, 'companies', companyId, 'pools', poolId, 'visits'),
      orderBy('visitedAt', 'desc'),
      limit(maxDocs)
    )
  );
  return visitsSnap.docs.map((d) => d.data() as Record<string, unknown>);
}

export async function savePoolVisitWithPoolUpdate(
  companyId: string,
  poolId: string,
  visitPayload: Record<string, unknown>,
  buildPoolUpdate: (visitDocId: string) => Record<string, unknown>
): Promise<string> {
  const visitRef = await addDoc(
    collection(db, 'companies', companyId, 'pools', poolId, 'visits'),
    visitPayload
  );
  await updateDoc(doc(db, 'companies', companyId, 'pools', poolId), buildPoolUpdate(visitRef.id));
  return visitRef.id;
}
