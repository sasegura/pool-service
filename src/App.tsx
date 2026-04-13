import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';
import Login from './pages/Login';
import WorkerDashboard from './pages/WorkerDashboard';
import AdminOverview from './pages/AdminOverview';
import PoolsPage from './pages/PoolsPage';
import RoutesPage from './pages/RoutesPage';
import TeamPage from './pages/TeamPage';
import IncidentsPage from './pages/IncidentsPage';
import ClientDashboard from './pages/ClientDashboard';
import Layout from './components/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'admin' | 'worker' | 'client' }> = ({ children, requiredRole }) => {
  const { role, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) return <div className="flex items-center justify-center h-screen">{t('app.loading')}</div>;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" />;

  return <>{children}</>;
};

const DashboardSwitcher = () => {
  const { role, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) return <div className="p-8 text-center">{t('app.loading')}</div>;
  if (role === 'admin') return <AdminOverview />;
  if (role === 'worker') return <WorkerDashboard />;
  if (role === 'client') return <ClientDashboard />;
  return <div className="p-8 text-center text-red-500 font-bold">{t('common.roleUndefined')}</div>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardSwitcher />} />
            <Route 
              path="pools" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <PoolsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="routes" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <RoutesPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="team" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <TeamPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="incidents" 
              element={
                <ProtectedRoute requiredRole="admin">
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
