import React from 'react';
import { Button } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';

type PoolVisitSaveBarProps = {
  saving: boolean;
  onSave: () => void;
};

export function PoolVisitSaveBar({ saving, onSave }: PoolVisitSaveBarProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-slate-200 max-w-4xl mx-auto">
      <Button type="button" size="lg" className="w-full min-h-[52px] text-lg font-black" isLoading={saving} onClick={onSave}>
        {t('poolVisit.saveVisit')}
      </Button>
    </div>
  );
}
