import React, { useState } from 'react';
import { Map, Marker } from '@vis.gl/react-google-maps';
import type { AdminOverviewWorkerUser as User } from '../../../features/admin-overview/hooks/useAdminOverviewData';

const MIAMI_CENTER = { lat: 25.7617, lng: -80.1918 };

type AdminOverviewTrackingMapProps = {
  workers: User[];
};

export function AdminOverviewTrackingMap({ workers }: AdminOverviewTrackingMapProps) {
  const [mapReadyForMarkers, setMapReadyForMarkers] = useState(false);
  return (
    <Map defaultCenter={MIAMI_CENTER} defaultZoom={11} onTilesLoaded={() => setMapReadyForMarkers(true)}>
      {mapReadyForMarkers
        ? workers.map((worker) => (
            <Marker key={worker.id} position={worker.lastLocation!} title={worker.name} />
          ))
        : null}
    </Map>
  );
}
