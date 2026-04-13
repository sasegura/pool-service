/**
 * Application-facing user (demo roles map to stable demo UIDs; real auth uses Firebase uid).
 */
export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
}
