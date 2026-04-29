import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import type { CompanyMembershipRole } from '../../features/tenant/types';

export function RequireAuth() {
  const { authUser, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 text-sm font-medium">
        {t('app.loading')}
      </div>
    );
  }
  if (!authUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  membershipRoles?: CompanyMembershipRole[];
}> = ({ children, membershipRoles }) => {
  const { membershipRole, loading, needsCompanyOnboarding, isDemoCompany } = useAuth();
  const { t } = useTranslation();

  if (loading) return <div className="flex items-center justify-center h-screen">{t('app.loading')}</div>;
  if (needsCompanyOnboarding) return <Navigate to="/" replace />;
  if (isDemoCompany) return <>{children}</>;
  if (membershipRoles?.length) {
    if (!membershipRole || !membershipRoles.includes(membershipRole)) return <Navigate to="/" replace />;
    return <>{children}</>;
  }
  return <>{children}</>;
};
