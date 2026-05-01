import React from 'react';
import { Card } from '../../../components/ui/Common';
import { Waves } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ClientNoPoolsCard() {
  const { t } = useTranslation();
  return (
    <Card className="p-8 text-center border-dashed border-2">
      <Waves className="w-12 h-12 text-slate-300 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-slate-900">{t('client.noPoolsTitle')}</h3>
      <p className="text-slate-500">{t('client.noPoolsBody')}</p>
    </Card>
  );
}
