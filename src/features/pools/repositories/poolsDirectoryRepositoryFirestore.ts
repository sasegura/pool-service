import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { PoolRecord } from '../../../types/pool';
import type { ClientDirectoryEntry, PoolsDirectoryRepository } from '../ports';

export function createPoolsDirectoryRepositoryFirestore(companyId: string): PoolsDirectoryRepository {
  return {
    subscribePools(onNext, onError) {
      return onSnapshot(
        collection(db, 'companies', companyId, 'pools'),
        (snap) => {
          onNext(
            snap.docs.map(
              (d) =>
                ({
                  ...(d.data() as Omit<PoolRecord, 'id'>),
                  id: d.id,
                }) as PoolRecord
            )
          );
        },
        onError
      );
    },

    subscribeClientUsers(onNext, onError) {
      return onSnapshot(
        query(collection(db, 'companies', companyId, 'members'), where('role', '==', 'client')),
        (snap) => {
          onNext(
            snap.docs.map(
              (d) =>
                ({
                  id: d.id,
                  name: (d.data().name as string) || '',
                  role: 'client',
                }) as ClientDirectoryEntry
            )
          );
        },
        onError
      );
    },

    async createPool(data) {
      const ref = await addDoc(collection(db, 'companies', companyId, 'pools'), data);
      return ref.id;
    },

    async updatePool(id, data) {
      await updateDoc(doc(db, 'companies', companyId, 'pools', id), data);
    },

    async deletePool(id) {
      await deleteDoc(doc(db, 'companies', companyId, 'pools', id));
    },

    async updatePoolOwner(poolId, clientId) {
      await updateDoc(doc(db, 'companies', companyId, 'pools', poolId), {
        clientId: clientId ? clientId : deleteField(),
      });
    },
  };
}
