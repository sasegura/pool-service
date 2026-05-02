import React, { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useAppServices } from '../../app/providers/AppServicesContext';
import { useTranslation } from 'react-i18next';
import { getGoogleMapsApiKey, isMapsIntegrationEnabled } from '../../config/env';
import {
  useAdminOverviewData,
  type AdminOverviewRoute as Route,
} from '../../features/admin-overview/hooks/useAdminOverviewData';
import { AdminOverviewPageHeader } from './components/AdminOverviewPageHeader';
import { AdminOverviewStatGrid } from './components/AdminOverviewStatGrid';
import { AdminRoutesStatusTable } from './components/AdminRoutesStatusTable';
import { AdminLiveTrackingCard } from './components/AdminLiveTrackingCard';

const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
const MAPS_INTEGRATION_ENABLED = isMapsIntegrationEnabled();

export default function AdminOverview() {
  const { user, loading, companyId } = useAuth();
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const {
    poolsCount,
    workersCount,
    completedCount,
    incidentsCount,
    routes,
    users,
    allWorkers,
    pools,
    liveWorkers,
    logsForSelectedDate,
  } = useAdminOverviewData(selectedDate, !loading && !!user, companyId ?? undefined);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ workerId: '', date: '' });
  const { routesCommands } = useAppServices();
  const canUseMaps =
    MAPS_INTEGRATION_ENABLED && !!GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'MY_GOOGLE_MAPS_API_KEY';

  const handleStartEdit = (route: Route) => {
    setEditingRouteId(route.id);
    setEditData({
      workerId: route.workerId ?? '',
      date: route.date ?? selectedDate,
    });
  };

  const handleSaveEdit = async (routeId: string) => {
    if (!routesCommands) return;
    try {
      await routesCommands.updateRoute(routeId, {
        workerId: editData.workerId,
        date: editData.date,
      });
      setEditingRouteId(null);
      toast.success(t('admin.toastRouteUpdated'));
    } catch {
      toast.error(t('admin.toastRouteUpdateError'));
    }
  };

  return (
    <div className="space-y-6">
      <AdminOverviewPageHeader selectedDate={selectedDate} onSelectedDateChange={setSelectedDate} />

      <AdminOverviewStatGrid
        poolsCount={poolsCount}
        workersCount={workersCount}
        completedCount={completedCount}
        incidentsCount={incidentsCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AdminRoutesStatusTable
            selectedDate={selectedDate}
            routes={routes}
            logsForSelectedDate={logsForSelectedDate}
            users={users}
            allWorkers={allWorkers}
            pools={pools}
            editingRouteId={editingRouteId}
            editData={editData}
            onEditDataChange={setEditData}
            onStartEdit={handleStartEdit}
            onCancelEdit={() => setEditingRouteId(null)}
            onSaveEdit={handleSaveEdit}
          />
        </div>

        <div className="space-y-6">
          {canUseMaps ? <AdminLiveTrackingCard apiKey={GOOGLE_MAPS_API_KEY} liveWorkers={liveWorkers} /> : null}
        </div>
      </div>
    </div>
  );
}
