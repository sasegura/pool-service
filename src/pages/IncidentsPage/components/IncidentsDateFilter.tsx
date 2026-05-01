import React from 'react';
import { Calendar, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type IncidentsDateFilterProps = {
  filterDate: string;
  onChange: (v: string) => void;
};

export function IncidentsDateFilter({ filterDate, onChange }: IncidentsDateFilterProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <Calendar className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="date"
          className="pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          value={filterDate}
          onChange={(e) => onChange(e.target.value)}
        />
        {filterDate && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            title={t('incidents.clearFilter')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
