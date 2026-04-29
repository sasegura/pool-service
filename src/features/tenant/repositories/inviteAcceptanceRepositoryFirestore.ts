import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { InviteAcceptanceRepository } from '../ports.invite';

export function createInviteAcceptanceRepositoryFirestore(): InviteAcceptanceRepository {
  return {
    async acceptInvite(input) {
      await runTransaction(db, async (tx) => {
        const mRef = doc(db, 'companies', input.companyId, 'members', input.memberId);
        const mSnap = await tx.get(mRef);
        if (!mSnap.exists()) throw new Error('invite_not_found');
        const inv = mSnap.data();
        if (inv.status !== 'invited') throw new Error('invite_already_used');
        const role = inv.role as string;
        if (!['supervisor', 'technician', 'client'].includes(role)) throw new Error('invite_invalid_role');
        const membershipRef = doc(db, 'users', input.uid, 'memberships', input.companyId);
        tx.set(membershipRef, {
          companyId: input.companyId,
          role,
          status: 'active',
          fromInvitedMemberId: input.memberId,
          updatedAt: serverTimestamp(),
        });
        tx.update(mRef, {
          uid: input.uid,
          status: 'active',
          updatedAt: serverTimestamp(),
        });
      });
    },
  };
}
