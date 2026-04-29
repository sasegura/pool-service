import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import CompanyOnboarding from '../../features/tenant/components/CompanyOnboarding';
import AdminOverview from '../../pages/AdminOverview';
import ClientDashboard from '../../pages/ClientDashboard';
import WorkerDashboard from '../../pages/WorkerDashboard';

export function DashboardSwitcher() {
  const {
    membershipRole,
    loading,
    needsCompanyOnboarding,
    tenantError,
    isDemoCompany,
    demoDashboardView,
  } = useAuth();
  const { t } = useTranslation();

  if (loading) return <div className="p-8 text-center">{t('app.loading')}</div>;
  if (tenantError) {
    return (
      <div className="p-8 text-center text-red-600 max-w-md mx-auto">
        <p className="font-bold">{t('tenant.companyCreateError')}</p>
        <p className="text-sm mt-2">{tenantError}</p>
      </div>
    );
  }
  if (needsCompanyOnboarding) return <CompanyOnboarding />;
  if (isDemoCompany) {
    if (demoDashboardView === 'client') return <ClientDashboard />;
    if (demoDashboardView === 'worker') return <WorkerDashboard />;
    return <AdminOverview />;
  }

  if (membershipRole === 'client') return <ClientDashboard />;
  if (membershipRole === 'technician') return <WorkerDashboard />;
  if (membershipRole === 'admin' || membershipRole === 'supervisor') return <AdminOverview />;

  return <div className="p-8 text-center text-red-500 font-bold">{t('common.roleUndefined')}</div>;
}
