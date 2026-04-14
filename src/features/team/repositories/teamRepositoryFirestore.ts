import { httpsCallable } from 'firebase/functions';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, functions } from '../../../lib/firebase';
import type { TeamRepository } from '../ports';
import type { TeamUser } from '../types';

function mapUiRoleToCompanyRole(role: string): 'admin' | 'supervisor' | 'technician' | 'client' {
  if (role === 'worker') return 'technician';
  if (role === 'admin' || role === 'client' || role === 'supervisor') return role;
  return 'technician';
}

export function createTeamRepositoryFirestore(companyId: string): TeamRepository {
  return {
    subscribeUsers(onNext, onError) {
      return onSnapshot(
        query(collection(db, 'companies', companyId, 'members'), where('status', '==', 'active')),
        (snap) => {
          onNext(
            snap.docs.map((d) => {
              const data = d.data();
              const r = (data.role as string) || 'technician';
              const legacyRole = r === 'technician' ? 'worker' : r;
              return {
                id: d.id,
                name: (data.name as string) || '',
                email: (data.email as string) || '',
                role: legacyRole,
                membershipRole: r,
              } as TeamUser;
            })
          );
        },
        onError
      );
    },

    async updateUser(id, data) {
      await updateDoc(doc(db, 'companies', companyId, 'members', id), {
        name: data.name,
        email: data.email,
        updatedAt: new Date().toISOString(),
      });
    },

    async createPreregisteredUser(data) {
      const role = mapUiRoleToCompanyRole(data.role);
      if (role === 'admin') {
        throw new Error('Cannot invite admin role');
      }
      /** Technicians: active roster + Firebase Auth via Cloud Function. Clients: invited until accept-invite. */
      const status = role === 'technician' ? 'active' : 'invited';
      const ref = await addDoc(collection(db, 'companies', companyId, 'members'), {
        name: data.name.trim().slice(0, 120),
        email: data.email.trim().toLowerCase().slice(0, 200),
        role,
        status,
        updatedAt: new Date().toISOString(),
      });
      const id = ref.id;

      if (role !== 'technician') {
        return { id };
      }

      const CALLABLE_TIMEOUT_MS = 120_000;
      try {
        const fn = httpsCallable(functions, 'provisionTechnicianAuthUser', { timeout: CALLABLE_TIMEOUT_MS });
        const res = await fn({ companyId, memberDocId: id });
        const payload = res.data as { temporaryPassword?: string };
        return { id, temporaryPassword: payload.temporaryPassword };
      } catch (e) {
        await deleteDoc(doc(db, 'companies', companyId, 'members', id));
        throw e;
      }
    },

    async deleteUser(id) {
      const memberRef = doc(db, 'companies', companyId, 'members', id);
      const snap = await getDoc(memberRef);
      const uid = typeof snap.data()?.uid === 'string' ? snap.data()?.uid : '';
      await deleteDoc(memberRef);
      if (uid) {
        await deleteDoc(doc(db, 'users', uid, 'memberships', companyId));
      }
    },

    async setUserRole(memberDocId, role) {
      const companyRole = mapUiRoleToCompanyRole(role);
      const memberRef = doc(db, 'companies', companyId, 'members', memberDocId);
      const snap = await getDoc(memberRef);
      const uid = typeof snap.data()?.uid === 'string' ? snap.data()?.uid : '';
      await updateDoc(memberRef, {
        role: companyRole,
        updatedAt: new Date().toISOString(),
      });
      if (uid) {
        await updateDoc(doc(db, 'users', uid, 'memberships', companyId), {
          role: companyRole,
          updatedAt: new Date().toISOString(),
        });
      }
    },
  };
}
