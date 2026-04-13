import type { Unsubscribe } from 'firebase/firestore';
import type { TeamUser } from './types';

export type TeamUsersSubscriber = (users: TeamUser[]) => void;

export interface TeamRepository {
  subscribeUsers(onNext: TeamUsersSubscriber, onError?: (e: unknown) => void): Unsubscribe;
  updateUser(id: string, data: { name: string; email: string; role: string }): Promise<void>;
  /** Creates an invited `members` row; returns document id for the accept-invite link. */
  createPreregisteredUser(data: { name: string; email: string; role: string }): Promise<string>;
  deleteUser(id: string): Promise<void>;
  setUserRole(userId: string, role: string): Promise<void>;
}
