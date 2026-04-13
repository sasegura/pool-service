import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { PoolRecord } from '../../../types/pool';

export async function fetchPoolById(poolId: string): Promise<PoolRecord | null> {
  const snap = await getDoc(doc(db, 'pools', poolId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PoolRecord;
}

export async function fetchRecentVisitDocs(poolId: string, maxDocs: number): Promise<Record<string, unknown>[]> {
  const visitsSnap = await getDocs(
    query(collection(db, 'pools', poolId, 'visits'), orderBy('visitedAt', 'desc'), limit(maxDocs))
  );
  return visitsSnap.docs.map((d) => d.data() as Record<string, unknown>);
}

export async function savePoolVisitWithPoolUpdate(
  poolId: string,
  visitPayload: Record<string, unknown>,
  buildPoolUpdate: (visitDocId: string) => Record<string, unknown>
): Promise<string> {
  const visitRef = await addDoc(collection(db, 'pools', poolId, 'visits'), visitPayload);
  await updateDoc(doc(db, 'pools', poolId), buildPoolUpdate(visitRef.id));
  return visitRef.id;
}
