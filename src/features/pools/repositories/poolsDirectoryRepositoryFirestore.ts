import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { PoolRecord } from '../../../types/pool';
import type { ClientDirectoryEntry, PoolsDirectoryRepository } from '../ports';

export const poolsDirectoryRepositoryFirestore: PoolsDirectoryRepository = {
  subscribePools(onNext, onError) {
    return onSnapshot(
      collection(db, 'pools'),
      (snap) => {
        onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PoolRecord)));
      },
      onError
    );
  },

  subscribeClientUsers(onNext, onError) {
    return onSnapshot(
      collection(db, 'users'),
      (snap) => {
        onNext(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as ClientDirectoryEntry))
            .filter((c) => c.role === 'client')
        );
      },
      onError
    );
  },

  async createPool(data) {
    const ref = await addDoc(collection(db, 'pools'), data);
    return ref.id;
  },

  async updatePool(id, data) {
    await updateDoc(doc(db, 'pools', id), data);
  },

  async deletePool(id) {
    await deleteDoc(doc(db, 'pools', id));
  },

  async updatePoolOwner(poolId, clientId) {
    await updateDoc(doc(db, 'pools', poolId), {
      clientId: clientId ? clientId : deleteField(),
    });
  },
};
