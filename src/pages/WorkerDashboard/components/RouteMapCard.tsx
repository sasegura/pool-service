import { Map as MapIcon } from 'lucide-react';
import { Card } from '../../../components/ui/Common';
import type { PoolRecord } from '../../../types/pool';
import { WorkerRouteMap } from './WorkerRouteMap';

type Props = {
  poolIds: string[];
  pools: Record<string, PoolRecord>;
  completedPoolIds?: string[];
  progressTitle: string;
  poolsProgressLabel: string;
};

export function RouteMapCard({ poolIds, pools, completedPoolIds, progressTitle, poolsProgressLabel }: Props) {
  return (
    <Card className="overflow-hidden h-64 relative border-none shadow-lg">
      <div className="absolute inset-0 z-0 min-h-[16rem]">
        <WorkerRouteMap poolIds={poolIds} pools={pools} completedPoolIds={completedPoolIds} />
      </div>
      <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/90 backdrop-blur p-3 rounded-xl shadow-xl flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <MapIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{progressTitle}</div>
            <div className="text-sm font-black text-slate-900">{poolsProgressLabel}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
