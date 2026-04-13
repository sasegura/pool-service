export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Firestore company role when different from legacy UI role */
  membershipRole?: string;
}
