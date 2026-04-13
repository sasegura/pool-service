import { collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { TeamRepository } from '../ports';
import type { TeamUser } from '../types';

export const teamRepositoryFirestore: TeamRepository = {
  subscribeUsers(onNext, onError) {
    return onSnapshot(
      query(collection(db, 'users')),
      (snap) => {
        onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamUser)));
      },
      onError
    );
  },

  async updateUser(id, data) {
    await updateDoc(doc(db, 'users', id), data);
  },

  async createPreregisteredUser(data) {
    const ref = doc(collection(db, 'users'));
    await setDoc(ref, {
      ...data,
      uid: ref.id,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  },

  async deleteUser(id) {
    await deleteDoc(doc(db, 'users', id));
  },
};
