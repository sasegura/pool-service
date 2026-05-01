import React from 'react';
import { Card } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';

type PoolVisitNotesCardProps = {
  notes: string;
  onNotesChange: (v: string) => void;
  showAdvanced: boolean;
  appliedTreatment: string;
  onAppliedTreatmentChange: (v: string) => void;
  photoUrlInput: string;
  onPhotoUrlInputChange: (v: string) => void;
};

export function PoolVisitNotesCard({
  notes,
  onNotesChange,
  showAdvanced,
  appliedTreatment,
  onAppliedTreatmentChange,
  photoUrlInput,
  onPhotoUrlInputChange,
}: PoolVisitNotesCardProps) {
  const { t } = useTranslation();

  return (
    <section>
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('poolVisit.sectionNotes')}</h2>
      <Card className="p-4 space-y-3">
        <textarea
          className="w-full rounded-xl border-slate-200 p-3 text-sm min-h-[96px]"
          placeholder={t('poolVisit.notesPlaceholder')}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
        {showAdvanced && (
          <>
            <textarea
              className="w-full rounded-xl border-slate-200 p-3 text-sm min-h-[72px]"
              placeholder={t('poolVisit.appliedPlaceholder')}
              value={appliedTreatment}
              onChange={(e) => onAppliedTreatmentChange(e.target.value)}
            />
            <input
              className="w-full rounded-xl border-slate-200 p-3 text-sm"
              placeholder={t('poolVisit.photoUrlsPlaceholder')}
              value={photoUrlInput}
              onChange={(e) => onPhotoUrlInputChange(e.target.value)}
            />
          </>
        )}
      </Card>
    </section>
  );
}
