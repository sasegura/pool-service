import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { CompanyMembershipRole } from './features/tenant/types';
import WorkerDashboard from './pages/WorkerDashboard';
import AdminOverview from './pages/AdminOverview';
import PoolsPage from './pages/PoolsPage';
import PoolDetailPage from './pages/PoolDetailPage';
import PoolVisitPage from './pages/PoolVisitPage';
import RoutesPage from './pages/RoutesPage';
import TeamPage from './pages/TeamPage';
import IncidentsPage from './pages/IncidentsPage';
import ClientDashboard from './pages/ClientDashboard';
import AcceptInvitePage from './pages/AcceptInvitePage';
import Layout from './components/Layout';
import CompanyOnboarding from './features/tenant/components/CompanyOnboarding';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  /** If set, user must have one of these Firestore membership roles (JWT claims). */
  membershipRoles?: CompanyMembershipRole[];
}> = ({ children, membershipRoles }) => {
  const { membershipRole, loading, needsCompanyOnboarding } = useAuth();
  const { t } = useTranslation();

  if (loading) return <div className="flex items-center justify-center h-screen">{t('app.loading')}</div>;
  if (needsCompanyOnboarding) return <Navigate to="/" replace />;
  if (membershipRoles?.length) {
    if (!membershipRole || !membershipRoles.includes(membershipRole)) return <Navigate to="/" replace />;
    return <>{children}</>;
  }

  return <>{children}</>;
};

const DashboardSwitcher = () => {
  const { membershipRole, loading, needsCompanyOnboarding, tenantError } = useAuth();
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
  if (membershipRole === 'client') return <ClientDashboard />;
  if (membershipRole === 'technician') return <WorkerDashboard />;
  if (membershipRole === 'admin' || membershipRole === 'supervisor') return <AdminOverview />;
  return <div className="p-8 text-center text-red-500 font-bold">{t('common.roleUndefined')}</div>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardSwitcher />} />
            <Route
              path="pools"
              element={
                <ProtectedRoute membershipRoles={['admin', 'supervisor']}>
                  <PoolsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pools/:poolId"
              element={
                <ProtectedRoute membershipRoles={['admin', 'supervisor']}>
                  <PoolDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pools/:poolId/visit"
              element={
                <ProtectedRoute membershipRoles={['admin', 'supervisor', 'technician']}>
                  <PoolVisitPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="routes"
              element={
                <ProtectedRoute membershipRoles={['admin', 'supervisor']}>
                  <RoutesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="team"
              element={
                <ProtectedRoute membershipRoles={['admin', 'supervisor']}>
                  <TeamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="incidents"
              element={
                <ProtectedRoute membershipRoles={['admin', 'supervisor']}>
                  <IncidentsPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
