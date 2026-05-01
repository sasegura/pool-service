import React from 'react';
import { Button, Card } from '../../../components/ui/Common';
import { Map as MapIcon } from 'lucide-react';
import { Map, Marker } from '@vis.gl/react-google-maps';
import { useTranslation } from 'react-i18next';
import { MIAMI_CENTER } from '../../../features/routes/constants';
import { DeferredMapMount } from '../../../features/routes/components/DeferredMapMount';
import type { RouteDocument as Route, RoutesPool as Pool } from '../../../features/routes/types';

type RoutesMapOverviewCardProps = {
  routes: Route[];
  selectedRouteId: string | null;
  onClearSelection: () => void;
  poolsForMapView: Pool[];
  mapViewCenter: { lat: number; lng: number };
};

export function RoutesMapOverviewCard({
  routes,
  selectedRouteId,
  onClearSelection,
  poolsForMapView,
  mapViewCenter,
}: RoutesMapOverviewCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 border-blue-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-blue-600" />
          {t('routesPage.mapTitle')}{' '}
          {selectedRouteId
            ? routes.find((r) => r.id === selectedRouteId)?.routeName ||
              routes.find((r) => r.id === selectedRouteId)?.id ||
              t('routesPage.routeFallback')
            : t('routesPage.overview')}
        </h3>
        {selectedRouteId ? (
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            {t('routesPage.overview')}
          </Button>
        ) : null}
      </div>
      <div className="h-80 min-h-[320px] w-full rounded-xl overflow-hidden border border-slate-200 relative">
        <DeferredMapMount deferKey={selectedRouteId ?? 'all-pools'}>
          <Map defaultCenter={mapViewCenter} defaultZoom={selectedRouteId ? 12 : 11}>
            {poolsForMapView.map((pool, index) => (
              <Marker
                key={`${selectedRouteId ?? 'all'}-${pool.id}`}
                position={pool.coordinates || MIAMI_CENTER}
                title={pool.name}
                label={String(index + 1)}
              />
            ))}
          </Map>
        </DeferredMapMount>
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {poolsForMapView.map((pool, index) => (
          <div key={pool.id} className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[10px]">
            <span className="font-black text-blue-600 mr-1">#{index + 1}</span>
            <span className="font-bold text-slate-700">{pool.name || '…'}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
