import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

function currentAuthUser() {
  try {
    return getAuth(getApp()).currentUser;
  } catch {
    return null;
  }
}

export enum FirestoreOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: FirestoreOperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export type FirestoreErrorPolicy = 'logOnly' | 'logAndThrow';

function buildAuthInfo(): FirestoreErrorInfo['authInfo'] {
  const u = currentAuthUser();
  return {
    userId: u?.uid,
    email: u?.email,
    emailVerified: u?.emailVerified,
    isAnonymous: u?.isAnonymous,
    tenantId: u?.tenantId,
    providerInfo:
      u?.providerData.map((provider) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL,
      })) ?? [],
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: FirestoreOperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: buildAuthInfo(),
    operationType,
    path,
  };
}

/**
 * Centralized Firestore error reporting. Use `logOnly` during bootstrap/seeding
 * where throwing would crash the app; use `logAndThrow` when callers must handle failure.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: FirestoreOperationType,
  path: string | null,
  policy: FirestoreErrorPolicy = 'logAndThrow'
): void {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo, null, policy === 'logOnly' ? 2 : 0));
  if (policy === 'logAndThrow') {
    throw new Error(JSON.stringify(errInfo));
  }
}
