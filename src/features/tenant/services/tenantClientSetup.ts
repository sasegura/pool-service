import type { Firestore } from 'firebase/firestore';
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

export type NewCompanyPayload = {
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  /** Profile name for the initial admin row (defaults to company name if empty). */
  ownerDisplayName?: string;
  ownerEmail?: string | null;
};

/**
 * Creates a company, initial admin membership, and member directory row in one transaction.
 * Used when Cloud Functions are not available (client-only multitenant bootstrap).
 */
export async function createTenantWorkspace(db: Firestore, uid: string, payload: NewCompanyPayload): Promise<string> {
  const existing = await getDocs(query(collection(db, 'users', uid, 'memberships'), limit(1)));
  if (!existing.empty) {
    throw new Error('User already belongs to a company');
  }

  const companyCol = collection(db, 'companies');
  const companyRef = doc(companyCol);

  await runTransaction(db, async (tx) => {
    const companyId = companyRef.id;
    const membershipRef = doc(db, 'users', uid, 'memberships', companyId);
    const memberRef = doc(db, 'companies', companyId, 'members', uid);
    const userRef = doc(db, 'users', uid);

    tx.set(companyRef, {
      name: payload.name.trim().slice(0, 200),
      taxId: (payload.taxId ?? '').trim().slice(0, 32),
      address: (payload.address ?? '').trim().slice(0, 500),
      phone: (payload.phone ?? '').trim().slice(0, 40),
      email: (payload.email ?? '').trim().slice(0, 200),
      status: 'active',
      createdByUid: uid,
      createdAt: serverTimestamp(),
    });

    const ownerName = (payload.ownerDisplayName ?? '').trim().slice(0, 120) || payload.name.trim().slice(0, 120);

    tx.set(
      userRef,
      {
        displayName: ownerName,
        email: payload.ownerEmail ?? null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(membershipRef, {
      companyId,
      role: 'admin',
      status: 'active',
      updatedAt: serverTimestamp(),
    });

    tx.set(memberRef, {
      uid,
      name: ownerName,
      email: (payload.ownerEmail ?? payload.email ?? '').toString().trim().slice(0, 200),
      role: 'admin',
      status: 'active',
      updatedAt: serverTimestamp(),
    });
  });

  return companyRef.id;
}

/**
 * Anonymous demo: creates a sandbox company + admin membership (same transaction shape as createTenantWorkspace).
 */
export async function bootstrapAnonymousSandbox(db: Firestore, uid: string): Promise<string> {
  const existing = await getDocs(query(collection(db, 'users', uid, 'memberships'), limit(1)));
  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const companyRef = doc(collection(db, 'companies'));

  await runTransaction(db, async (tx) => {
    const companyId = companyRef.id;
    const membershipRef = doc(db, 'users', uid, 'memberships', companyId);
    const memberRef = doc(db, 'companies', companyId, 'members', uid);
    const userRef = doc(db, 'users', uid);

    tx.set(companyRef, {
      name: 'Demo workspace',
      status: 'active',
      createdByUid: uid,
      isAnonymousSandbox: true,
      createdAt: serverTimestamp(),
    });

    tx.set(
      userRef,
      {
        displayName: 'Demo user',
        email: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(membershipRef, {
      companyId,
      role: 'admin',
      status: 'active',
      updatedAt: serverTimestamp(),
    });

    tx.set(memberRef, {
      uid,
      name: 'Demo user',
      email: '',
      role: 'admin',
      status: 'active',
      updatedAt: serverTimestamp(),
    });
  });

  return companyRef.id;
}
