import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type AdminOverviewPageHeaderProps = {
  selectedDate: string;
  onSelectedDateChange: (v: string) => void;
};

export function AdminOverviewPageHeader({ selectedDate, onSelectedDateChange }: AdminOverviewPageHeaderProps) {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900">{t('admin.overview')}</h2>
        <p className="text-slate-500 font-medium">{t('admin.operationStatus')}</p>
      </div>
      <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
          <CalendarIcon className="w-4 h-4" />
        </div>
        <input
          type="date"
          className="text-sm font-bold text-slate-700 border-none focus:ring-0 p-0"
          value={selectedDate}
          onChange={(e) => onSelectedDateChange(e.target.value)}
        />
      </div>
    </header>
  );
}
