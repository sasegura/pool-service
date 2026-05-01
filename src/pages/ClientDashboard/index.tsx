import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { es, enUS } from 'date-fns/locale';
import { useClientDashboard } from '../../features/client-dashboard/hooks/useClientDashboard';
import { ClientDashboardHeader } from './components/ClientDashboardHeader';
import { ClientNoPoolsCard } from './components/ClientNoPoolsCard';
import { ClientPoolSection } from './components/ClientPoolSection';

export default function ClientDashboard() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : es;
  const { user, companyId } = useAuth();
  const { pools, logs, workers, loading } = useClientDashboard(user?.uid, companyId ?? undefined);

  if (loading) return <div className="p-8 text-center">{t('client.loadingHistory')}</div>;

  return (
    <div className="space-y-6">
      <ClientDashboardHeader />

      {pools.length === 0 ? (
        <ClientNoPoolsCard />
      ) : (
        <div className="space-y-8">
          {pools.map((pool) => (
            <ClientPoolSection key={pool.id} pool={pool} logs={logs} workers={workers} dateLocale={dateLocale} />
          ))}
        </div>
      )}
    </div>
  );
}
