import React from 'react';
import { Card } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';
import type { PoolVisitRecord } from '../../../types/pool';

type PoolDetailVisitsSectionProps = {
  visits: PoolVisitRecord[];
  lastVisit: PoolVisitRecord | undefined;
  fmtDate: (iso?: string) => string;
};

export function PoolDetailVisitsSection({ visits, lastVisit, fmtDate }: PoolDetailVisitsSectionProps) {
  const { t } = useTranslation();
  return (
    <Card className="p-4">
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t('poolDetail.visitsTitle')}</h2>
      {visits.length === 0 ? (
        <p className="text-sm text-slate-500">{t('poolDetail.noVisits')}</p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 font-black uppercase tracking-wider">
                <th className="py-2 pr-3">{t('poolDetail.colDate')}</th>
                <th className="py-2 pr-3">pH</th>
                <th className="py-2 pr-3">FC</th>
                <th className="py-2 pr-3">TA</th>
                <th className="py-2 pr-3">{t('poolDetail.colTech')}</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="py-2 pr-3 whitespace-nowrap font-semibold text-slate-800">{fmtDate(v.visitedAt)}</td>
                  <td className="py-2 pr-3">{v.chemistry?.ph ?? '—'}</td>
                  <td className="py-2 pr-3">{v.chemistry?.freeChlorinePpm ?? '—'}</td>
                  <td className="py-2 pr-3">{v.chemistry?.totalAlkalinityPpm ?? '—'}</td>
                  <td className="py-2 pr-3 text-slate-600">{v.technicianName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lastVisit?.appliedTreatment && (
        <div className="mt-4 text-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase">{t('poolDetail.lastTreatment')}</p>
          <p className="text-slate-800 whitespace-pre-wrap mt-1">{lastVisit.appliedTreatment}</p>
        </div>
      )}
    </Card>
  );
}
