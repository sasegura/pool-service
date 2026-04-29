export interface InviteAcceptanceRepository {
  acceptInvite(input: {
    companyId: string;
    memberId: string;
    uid: string;
  }): Promise<void>;
}
