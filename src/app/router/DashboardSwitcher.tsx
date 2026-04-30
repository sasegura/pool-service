import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
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
  const isResolvingRole =
    !loading &&
    !tenantError &&
    !needsCompanyOnboarding &&
    !isDemoCompany &&
    membershipRole === null;

  if (loading || isResolvingRole) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-600">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <p className="text-sm font-medium">{t('app.loading')}</p>
      </div>
    );
  }
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
