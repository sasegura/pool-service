import type { InviteAcceptanceRepository } from '../ports.invite';

export async function acceptInvite(
  repository: InviteAcceptanceRepository,
  input: { companyId: string; memberId: string; uid: string }
) {
  await repository.acceptInvite(input);
}
