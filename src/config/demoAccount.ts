const raw = (import.meta.env.VITE_DEMO_ACCOUNT_EMAIL as string | undefined)?.trim().toLowerCase();

/** Email that receives the preset demo workspace on first sign-in (Firebase Auth must have this user). */
export const DEMO_ACCOUNT_EMAIL = raw && raw.length > 0 ? raw : 'demo@demo.com';

export function isDemoAccountEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === DEMO_ACCOUNT_EMAIL;
}
