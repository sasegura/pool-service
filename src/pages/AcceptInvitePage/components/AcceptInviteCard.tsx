import React from 'react';
import { Button, Card } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';

type AcceptInviteCardProps = {
  busy: boolean;
  onAccept: () => void;
};

export function AcceptInviteCard({ busy, onAccept }: AcceptInviteCardProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-4 text-center">
        <h1 className="text-xl font-black text-slate-900">{t('tenant.inviteTitle')}</h1>
        <p className="text-sm text-slate-500">{t('tenant.inviteBody')}</p>
        <Button onClick={() => void onAccept()} isLoading={busy} className="w-full">
          {t('tenant.inviteAcceptButton')}
        </Button>
      </Card>
    </div>
  );
}
