import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button, Card } from '../components/ui/Common';
import { useAuth } from '../contexts/AuthContext';
import { useAppServices } from '../app/providers/AppServicesContext';
import { auth } from '../lib/firebase';
import { acceptInvite } from '../features/tenant/application/acceptInvite';

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
      /** Firestore `members` document id for the invited row */
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-4 text-center">
        <h1 className="text-xl font-black text-slate-900">{t('tenant.inviteTitle')}</h1>
        <p className="text-sm text-slate-500">{t('tenant.inviteBody')}</p>
        <Button onClick={() => void accept()} isLoading={busy} className="w-full">
          {t('tenant.inviteAcceptButton')}
        </Button>
      </Card>
    </div>
  );
}
