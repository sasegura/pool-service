import type { TeamUser } from './types';

export type TeamUsersSubscriber = (users: TeamUser[]) => void;
export type UnsubscribeFn = () => void;

export type CreatePreregisteredUserResult = {
  id: string;
  /** Present when a technician was provisioned in Firebase Auth via Cloud Function. */
  temporaryPassword?: string;
};

export interface TeamRepository {
  subscribeUsers(onNext: TeamUsersSubscriber, onError?: (e: unknown) => void): UnsubscribeFn;
  updateUser(id: string, data: { name: string; email: string; role: string }): Promise<void>;
  /**
   * Creates a `members` row: technicians as `active` + Firebase Auth (callable); clients as `invited` (accept-invite link).
   */
  createPreregisteredUser(data: { name: string; email: string; role: string }): Promise<CreatePreregisteredUserResult>;
  deleteUser(id: string): Promise<void>;
  setUserRole(userId: string, role: string): Promise<void>;
}
