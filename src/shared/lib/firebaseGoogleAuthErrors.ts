import type { TFunction } from 'i18next';

/** Firebase Auth error `code` from signInWithPopup / signInWithRedirect. */
export function googleSignInErrorMessage(code: string | undefined, t: TFunction): string {
  switch (code) {
    case 'auth/popup-blocked':
      return t('login.googleErrorPopupBlocked');
    case 'auth/cancelled-popup-request':
    case 'auth/popup-closed-by-user':
      return t('login.googleErrorPopupClosed');
    case 'auth/unauthorized-domain':
      return t('login.googleErrorUnauthorizedDomain');
    case 'auth/operation-not-allowed':
      return t('login.googleErrorOperationNotAllowed');
    case 'auth/network-request-failed':
      return t('login.googleErrorNetwork');
    case 'auth/account-exists-with-different-credential':
      return t('login.googleErrorAccountExists');
    case 'auth/internal-error':
      return t('login.googleErrorInternal');
    default:
      return code ? t('login.googleErrorGeneric', { code }) : t('login.toastError');
  }
}
