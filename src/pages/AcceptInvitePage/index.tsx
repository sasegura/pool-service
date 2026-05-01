import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useAppServices } from '../../app/providers/AppServicesContext';
import { auth } from '../../lib/firebase';
import { acceptInvite } from '../../features/tenant/application/acceptInvite';
import { AcceptInviteCard } from './components/AcceptInviteCard';

export default function AcceptInvitePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshClaims } = useAuth();
  const { inviteAcceptanceRepository } = useAppServices();
  const [busy, setBusy] = useState(false);

  const params = useMemo(
    () => ({
      companyId: searchParams.get('companyId') || '',
      memberId: searchParams.get('inviteId') || '',
    }),
    [searchParams]
  );

  const accept = async () => {
    const u = auth.currentUser;
    if (!u?.email) {
      toast.error(t('tenant.inviteAcceptError'), { description: t('tenant.inviteNeedsEmail') });
      return;
    }
    if (!params.companyId || !params.memberId) {
      toast.error(t('tenant.inviteMissingParams'));
      return;
    }
    setBusy(true);
    try {
      await acceptInvite(inviteAcceptanceRepository, {
        companyId: params.companyId,
        memberId: params.memberId,
        uid: u.uid,
      });
      await refreshClaims();
      toast.success(t('tenant.inviteAccepted'));
      navigate('/');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error';
      toast.error(t('tenant.inviteAcceptError'), { description: message });
    } finally {
      setBusy(false);
    }
  };

  return <AcceptInviteCard busy={busy} onAccept={accept} />;
}
