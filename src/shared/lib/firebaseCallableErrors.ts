import { FirebaseError } from 'firebase/app';

/**
 * Human-readable message for Firebase Callable (httpsCallable) failures.
 */
export function getCallableErrorMessage(err: unknown, t?: (key: string) => string): string {
  if (err instanceof FirebaseError) {
    const code = err.code;
    const msg = (err.message || '').trim();

    if (code === 'functions/not-found') {
      return t?.('tenant.errorFunctionsNotDeployed') ?? 'Cloud Function not found. Deploy with: firebase deploy --only functions';
    }
    if (code === 'functions/unavailable') {
      return t?.('tenant.errorFunctionsUnavailable') ?? 'Cloud Functions temporarily unavailable. Try again.';
    }
    if (code === 'functions/deadline-exceeded') {
      return t?.('tenant.errorFunctionsTimeout') ?? 'Request timed out. Try again.';
    }
    if (code === 'functions/failed-precondition') {
      return msg || (t?.('tenant.errorFailedPrecondition') ?? 'Request could not be completed.');
    }
    if (code === 'functions/permission-denied') {
      return msg || (t?.('tenant.errorPermissionDenied') ?? 'Permission denied.');
    }
    if (code === 'functions/unauthenticated') {
      return msg || (t?.('tenant.errorUnauthenticated') ?? 'Sign in required.');
    }
    if (code === 'functions/internal') {
      if (msg && msg.toLowerCase() !== 'internal') return msg;
      return (
        t?.('tenant.errorInternalGeneric') ??
        'Server error. In Firebase Console open Functions → select createCompany → Logs for details.'
      );
    }
    return msg ? `${code}: ${msg}` : code;
  }

  if (err instanceof Error) return err.message;
  return String(err);
}
