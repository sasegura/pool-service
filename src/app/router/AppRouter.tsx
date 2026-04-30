import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../../components/Layout';
import AcceptInvitePage from '../../pages/AcceptInvitePage';
import IncidentsPage from '../../pages/IncidentsPage';
import Login from '../../pages/Login';
import Register from '../../pages/Register';
import PoolDetailPage from '../../pages/PoolDetailPage';
import PoolVisitPage from '../../pages/PoolVisitPage';
import PoolsPage from '../../pages/PoolsPage';
import RoutesPage from '../../pages/RoutesPage';
import TeamPage from '../../pages/TeamPage';
import { DashboardSwitcher } from './DashboardSwitcher';
import { ProtectedRoute, RequireAuth } from './guards';

export function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route element={<RequireAuth />}>
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
              path="wateroptions/:poolId"
              element={
                <ProtectedRoute membershipRoles={['admin', 'supervisor', 'technician']}>
                  <PoolVisitPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="route/:idRuta"
              element={
                <ProtectedRoute membershipRoles={['technician']}>
                  <DashboardSwitcher />
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
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
