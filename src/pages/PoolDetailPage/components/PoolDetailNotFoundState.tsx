import React from 'react';
import { Button } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';

type PoolDetailNotFoundStateProps = {
  onBack: () => void;
};

export function PoolDetailNotFoundState({ onBack }: PoolDetailNotFoundStateProps) {
  const { t } = useTranslation();
  return (
    <div className="p-6 text-center">
      <p className="text-red-600 font-bold mb-4">{t('poolDetail.notFound')}</p>
      <Button onClick={onBack}>{t('poolDetail.backList')}</Button>
    </div>
  );
}
