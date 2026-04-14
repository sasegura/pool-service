import { createHash, randomBytes } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

/** Gen2 runs on Cloud Run: public invoker so browsers can call (OPTIONS + POST); handlers still enforce Firebase Auth. */
const callableWithCors = { cors: true as const, invoker: 'public' as const };

const app = getApps().length ? getApps()[0]! : initializeApp();

const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || 'ai-studio-4eed925e-a375-4f96-a5c2-f845a152f2af';

const db = getFirestore(app, FIRESTORE_DATABASE_ID);
const auth = getAuth(app);

export type CompanyRole = 'admin' | 'supervisor' | 'technician' | 'client';

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

async function assertActiveMembership(uid: string, companyId: string): Promise<CompanyRole> {
  const memRef = db.doc(`users/${uid}/memberships/${companyId}`);
  const snap = await memRef.get();
  if (!snap.exists) {
    throw new HttpsError('permission-denied', 'No membership for this company');
  }
  const data = snap.data() as { status?: string; role?: CompanyRole };
  if (data.status !== 'active') {
    throw new HttpsError('permission-denied', 'Membership is not active');
  }
  if (!data.role) {
    throw new HttpsError('failed-precondition', 'Membership missing role');
  }
  return data.role;
}

async function assertAdmin(uid: string, companyId: string): Promise<void> {
  const role = await assertActiveMembership(uid, companyId);
  if (role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin required');
  }
}

async function assertAdminOrSupervisor(uid: string, companyId: string): Promise<CompanyRole> {
  const role = await assertActiveMembership(uid, companyId);
  if (role !== 'admin' && role !== 'supervisor') {
    throw new HttpsError('permission-denied', 'Admin or supervisor required');
  }
  return role;
}

/** Creates a company and makes the caller the initial admin. */
export const createCompany = onCall(callableWithCors, async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Sign in required');
      }
      const uid = request.auth.uid;
      const data = request.data as Record<string, unknown>;
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name || name.length > 200) {
        throw new HttpsError('invalid-argument', 'Invalid company name');
      }

      const existing = await db.collection(`users/${uid}/memberships`).limit(1).get();
      if (!existing.empty) {
        throw new HttpsError(
          'failed-precondition',
          'User already belongs to a company. If you used anonymous sign-in before linking Google, use that workspace or contact support.'
        );
      }

      const companyRef = db.collection('companies').doc();
      const companyId = companyRef.id;
      const email = typeof data.email === 'string' ? normalizeEmail(data.email) : '';
      const batch = db.batch();

      batch.set(companyRef, {
        name,
        taxId: typeof data.taxId === 'string' ? data.taxId.trim().slice(0, 32) : '',
        address: typeof data.address === 'string' ? data.address.trim().slice(0, 500) : '',
        phone: typeof data.phone === 'string' ? data.phone.trim().slice(0, 40) : '',
        email: email.slice(0, 200),
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
      });

      const displayName =
        (typeof request.auth.token.name === 'string' && request.auth.token.name) ||
        (typeof request.auth.token.email === 'string' && request.auth.token.email) ||
        'User';

      batch.set(
        db.doc(`users/${uid}`),
        {
          displayName,
          email: request.auth.token.email ?? email ?? null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      batch.set(db.doc(`users/${uid}/memberships/${companyId}`), {
        companyId,
        role: 'admin' as CompanyRole,
        status: 'active',
        updatedAt: FieldValue.serverTimestamp(),
      });

      batch.set(db.doc(`companies/${companyId}/members/${uid}`), {
        uid,
        name: displayName,
        email: request.auth.token.email ?? email ?? '',
        role: 'admin',
        status: 'active',
        updatedAt: FieldValue.serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (commitErr: unknown) {
        console.error('[createCompany] Firestore batch.commit failed', commitErr);
        throw new HttpsError(
          'failed-precondition',
          `Firestore write failed (${toErrorMessage(commitErr)}). Check FIRESTORE_DATABASE_ID matches your client database id.`
        );
      }

      try {
        await auth.setCustomUserClaims(uid, { activeCompanyId: companyId, role: 'admin' });
      } catch (claimsErr: unknown) {
        console.error('[createCompany] setCustomUserClaims failed', claimsErr);
        throw new HttpsError(
          'failed-precondition',
          `Auth claims failed (${toErrorMessage(claimsErr)}). Company was created; set claims manually in Firebase Console if needed.`
        );
      }

      return { companyId };
    } catch (e: unknown) {
      if (e instanceof HttpsError) throw e;
      console.error('[createCompany] unexpected', e);
      throw new HttpsError('failed-precondition', toErrorMessage(e).slice(0, 480));
    }
  }
);

/** Anonymous users get a personal sandbox company (demo continuity). */
export const bootstrapAnonymousTenant = onCall(callableWithCors, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  const uid = request.auth.uid;
  const signInProvider = (request.auth.token as { firebase?: { sign_in_provider?: string } }).firebase
    ?.sign_in_provider;
  if (signInProvider !== 'anonymous') {
    throw new HttpsError('failed-precondition', 'Only anonymous sessions use this bootstrap');
  }

  const existing = await db.collection(`users/${uid}/memberships`).limit(1).get();
  if (!existing.empty) {
    const companyId = existing.docs[0].id;
    const role = ((existing.docs[0].data() as { role?: CompanyRole }).role) ?? 'admin';
    await auth.setCustomUserClaims(uid, { activeCompanyId: companyId, role });
    return { companyId, reused: true };
  }

  const companyRef = db.collection('companies').doc();
  const companyId = companyRef.id;
  const batch = db.batch();
  batch.set(companyRef, {
    name: 'Demo workspace',
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    isAnonymousSandbox: true,
  });
  batch.set(
    db.doc(`users/${uid}`),
    {
      displayName: 'Demo user',
      email: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  batch.set(db.doc(`users/${uid}/memberships/${companyId}`), {
    companyId,
    role: 'admin' as CompanyRole,
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.doc(`companies/${companyId}/members/${uid}`), {
    uid,
    name: 'Demo user',
    email: '',
    role: 'admin',
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  await auth.setCustomUserClaims(uid, { activeCompanyId: companyId, role: 'admin' });
  return { companyId, reused: false };
});

/**
 * Creates a Firebase Auth user for an existing active technician member row (no uid yet),
 * writes `users/{uid}` + membership, and sets `uid` on the member document.
 */
export const provisionTechnicianAuthUser = onCall(callableWithCors, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  const caller = request.auth.uid;
  const body = request.data as Record<string, unknown>;
  const companyId = typeof body.companyId === 'string' ? body.companyId : '';
  const memberDocId = typeof body.memberDocId === 'string' ? body.memberDocId : '';
  if (!companyId || !memberDocId) {
    throw new HttpsError('invalid-argument', 'companyId and memberDocId are required');
  }

  await assertAdminOrSupervisor(caller, companyId);

  const memRef = db.doc(`companies/${companyId}/members/${memberDocId}`);
  const memSnap = await memRef.get();
  if (!memSnap.exists) {
    throw new HttpsError('not-found', 'Member not found');
  }
  const m = memSnap.data() as {
    email?: string;
    name?: string;
    role?: string;
    status?: string;
    uid?: string;
  };
  if (m.role !== 'technician') {
    throw new HttpsError('failed-precondition', 'Only technician members can be provisioned here');
  }
  if (m.status !== 'active') {
    throw new HttpsError('failed-precondition', 'Member must be active');
  }
  const existingUid = typeof m.uid === 'string' ? m.uid.trim() : '';
  if (existingUid.length > 0) {
    throw new HttpsError('failed-precondition', 'Member already linked to Firebase Auth');
  }
  const email = normalizeEmail(String(m.email ?? ''));
  if (!email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Member must have a valid email');
  }
  const displayName = String(m.name ?? email.split('@')[0] ?? 'Technician').trim().slice(0, 120);

  const password = `${randomBytes(18).toString('base64url')}Aa1!`;

  let newUid: string;
  try {
    const created = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false,
      disabled: false,
    });
    newUid = created.uid;
  } catch (e: unknown) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/email-already-exists') {
      throw new HttpsError(
        'already-exists',
        'A Firebase Auth user already exists for this email. They should sign in with that account; remove this roster row or link manually.'
      );
    }
    throw new HttpsError('internal', `Auth createUser failed: ${toErrorMessage(e)}`.slice(0, 480));
  }

  const batch = db.batch();
  batch.set(
    db.doc(`users/${newUid}`),
    {
      displayName,
      email,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  batch.set(db.doc(`users/${newUid}/memberships/${companyId}`), {
    companyId,
    role: 'technician' as CompanyRole,
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(memRef, {
    uid: newUid,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return { uid: newUid, temporaryPassword: password };
});

export const inviteCompanyUser = onCall(callableWithCors, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  const caller = request.auth.uid;
  const body = request.data as Record<string, unknown>;
  const companyId = typeof body.companyId === 'string' ? body.companyId : '';
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const rawRole = typeof body.role === 'string' ? body.role : '';
  const invitedName = typeof body.invitedName === 'string' ? body.invitedName.trim().slice(0, 120) : '';

  if (!companyId || !email || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'companyId and valid email required');
  }
  if (!['supervisor', 'technician', 'client'].includes(rawRole)) {
    throw new HttpsError('invalid-argument', 'Invalid invite role');
  }
  const role = rawRole as CompanyRole;
  const callerRole = await assertActiveMembership(caller, companyId);
  if (callerRole !== 'admin' && callerRole !== 'supervisor') {
    throw new HttpsError('permission-denied', 'Not allowed to invite users');
  }
  if (callerRole === 'supervisor' && role !== 'technician' && role !== 'client') {
    throw new HttpsError('permission-denied', 'Supervisor can only invite technicians or clients');
  }
  if (callerRole === 'admin' && !['supervisor', 'technician', 'client'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid invite role');
  }

  const token = randomBytes(24).toString('hex');
  const tokenHash = hashToken(token);
  const inviteRef = db.collection(`companies/${companyId}/invites`).doc();
  const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await inviteRef.set({
    email,
    role,
    tokenHash,
    invitedName,
    createdBy: caller,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  return { inviteId: inviteRef.id, token, companyId };
});

export const acceptCompanyInvite = onCall(callableWithCors, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  const uid = request.auth.uid;
  const body = request.data as Record<string, unknown>;
  const companyId = typeof body.companyId === 'string' ? body.companyId : '';
  const inviteId = typeof body.inviteId === 'string' ? body.inviteId : '';
  const token = typeof body.token === 'string' ? body.token : '';
  const authEmail = request.auth.token.email ? normalizeEmail(String(request.auth.token.email)) : '';

  if (!companyId || !inviteId || !token) {
    throw new HttpsError('invalid-argument', 'companyId, inviteId, and token are required');
  }
  if (!authEmail) {
    throw new HttpsError('failed-precondition', 'Account must have an email to accept invite');
  }

  const inviteRef = db.doc(`companies/${companyId}/invites/${inviteId}`);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) {
    throw new HttpsError('not-found', 'Invite not found');
  }
  const inv = inviteSnap.data() as {
    email?: string;
    role?: CompanyRole;
    tokenHash?: string;
    status?: string;
    expiresAt?: Timestamp;
    invitedName?: string;
  };
  if (inv.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Invite is no longer valid');
  }
  if (inv.expiresAt && inv.expiresAt.toMillis() < Date.now()) {
    throw new HttpsError('failed-precondition', 'Invite expired');
  }
  if (normalizeEmail(inv.email ?? '') !== authEmail) {
    throw new HttpsError('permission-denied', 'Signed-in email does not match invite');
  }
  if (hashToken(token) !== inv.tokenHash) {
    throw new HttpsError('permission-denied', 'Invalid token');
  }

  const role = inv.role ?? 'technician';
  const displayName =
    (typeof request.auth.token.name === 'string' && request.auth.token.name) || inv.invitedName || authEmail;

  const batch = db.batch();
  batch.set(
    db.doc(`users/${uid}`),
    {
      displayName,
      email: authEmail,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  batch.set(db.doc(`users/${uid}/memberships/${companyId}`), {
    companyId,
    role,
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.doc(`companies/${companyId}/members/${uid}`), {
    uid,
    name: displayName,
    email: authEmail,
    role,
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(inviteRef, { status: 'accepted', acceptedAt: FieldValue.serverTimestamp(), acceptedBy: uid });
  await batch.commit();

  await auth.setCustomUserClaims(uid, { activeCompanyId: companyId, role });
  return { companyId, role };
});

export const removeCompanyMember = onCall(callableWithCors, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  const caller = request.auth.uid;
  const body = request.data as Record<string, unknown>;
  const companyId = typeof body.companyId === 'string' ? body.companyId : '';
  const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : '';
  if (!companyId || !targetUserId) {
    throw new HttpsError('invalid-argument', 'companyId and targetUserId required');
  }
  await assertAdmin(caller, companyId);
  if (targetUserId === caller) {
    throw new HttpsError('invalid-argument', 'Cannot remove yourself');
  }

  const batch = db.batch();
  batch.delete(db.doc(`users/${targetUserId}/memberships/${companyId}`));
  batch.delete(db.doc(`companies/${companyId}/members/${targetUserId}`));
  await batch.commit();

  const userRecord = await auth.getUser(targetUserId);
  const claims = userRecord.customClaims as { activeCompanyId?: string } | undefined;
  if (claims?.activeCompanyId === companyId) {
    await auth.setCustomUserClaims(targetUserId, { activeCompanyId: '', role: '' });
  }
  return { ok: true };
});

export const setCompanyMemberRole = onCall(callableWithCors, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  const caller = request.auth.uid;
  const body = request.data as Record<string, unknown>;
  const companyId = typeof body.companyId === 'string' ? body.companyId : '';
  const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : '';
  const newRole = body.newRole as CompanyRole;
  const roles: CompanyRole[] = ['admin', 'supervisor', 'technician', 'client'];
  if (!companyId || !targetUserId || !roles.includes(newRole)) {
    throw new HttpsError('invalid-argument', 'Invalid arguments');
  }
  await assertAdmin(caller, companyId);

  const batch = db.batch();
  batch.update(db.doc(`users/${targetUserId}/memberships/${companyId}`), {
    role: newRole,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(db.doc(`companies/${companyId}/members/${targetUserId}`), {
    role: newRole,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  const userRecord = await auth.getUser(targetUserId);
  const claims = userRecord.customClaims as { activeCompanyId?: string } | undefined;
  if (claims?.activeCompanyId === companyId) {
    await auth.setCustomUserClaims(targetUserId, { activeCompanyId: companyId, role: newRole });
  }
  return { ok: true };
});
