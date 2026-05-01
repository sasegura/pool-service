import React, { useMemo, useState } from 'react';
import { Map, Marker } from '@vis.gl/react-google-maps';
import type { PoolRecord } from '../../../types/pool';
import { MIAMI_CENTER } from '../mapConfig';

type Props = {
  poolIds: string[];
  pools: Record<string, PoolRecord>;
  completedPoolIds?: string[];
};

export function WorkerRouteMap({ poolIds, pools, completedPoolIds }: Props) {
  const [markersReady, setMarkersReady] = useState(false);
  const defaultCenter = useMemo(() => {
    for (const id of poolIds) {
      const c = pools[id]?.coordinates;
      if (c) return c;
    }
    return MIAMI_CENTER;
  }, [poolIds, pools]);

  return (
    <Map
      defaultCenter={defaultCenter}
      defaultZoom={12}
      style={{ width: '100%', height: '100%', minHeight: 256 }}
      className="h-full w-full"
      onTilesLoaded={() => setMarkersReady(true)}
    >
      {markersReady &&
        poolIds.map((poolId, index) => {
          const pool = pools[poolId];
          if (!pool?.coordinates) return null;
          const done = completedPoolIds?.includes(pool.id) ?? false;
          return (
            <Marker
              key={pool.id}
              position={pool.coordinates}
              title={pool.name}
              label={{
                text: String(index + 1),
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '11px',
              }}
              optimized
              icon={
                typeof google !== 'undefined' && google.maps?.SymbolPath
                  ? {
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: done ? '#10b981' : '#2563eb',
                      fillOpacity: 1,
                      strokeColor: '#0f172a',
                      strokeWeight: 1,
                      labelOrigin: new google.maps.Point(0, 0),
                    }
                  : undefined
              }
            />
          );
        })}
    </Map>
  );
}
