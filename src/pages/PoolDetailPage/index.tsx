import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useAppServices } from '../../app/providers/AppServicesContext';
import { estimateVolumeM3, computeAvgDepthM } from '../../lib/poolVolume';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import type { PoolRecord, PoolVisitRecord } from '../../types/pool';
import { subscribePoolDetail } from '../../features/pools/application/subscribePoolDetail';
import { PoolDetailLoadingState } from './components/PoolDetailLoadingState';
import { PoolDetailNotFoundState } from './components/PoolDetailNotFoundState';
import { PoolDetailHero } from './components/PoolDetailHero';
import { PoolDetailMetricCards } from './components/PoolDetailMetricCards';
import { PoolDetailNextMaintCard } from './components/PoolDetailNextMaintCard';
import { PoolDetailGeneralSection } from './components/PoolDetailGeneralSection';
import { PoolDetailEquipmentSection } from './components/PoolDetailEquipmentSection';
import { PoolDetailHistorySection } from './components/PoolDetailHistorySection';
import { PoolDetailVisitsSection } from './components/PoolDetailVisitsSection';
import { PoolDetailFooterActions } from './components/PoolDetailFooterActions';

export default function PoolDetailPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate = useNavigate();
  const { companyId } = useAuth();
  const { poolDetailRepository } = useAppServices();
  const { i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : es;

  const [pool, setPool] = useState<PoolRecord | null>(null);
  const [visits, setVisits] = useState<PoolVisitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!poolId || !companyId || !poolDetailRepository) return;
    return subscribePoolDetail(poolDetailRepository, {
      poolId,
      maxVisits: 24,
      onPool: (nextPool) => {
        setPool(nextPool as PoolRecord | null);
        setLoading(false);
      },
      onVisits: (nextVisits) => {
        setVisits(nextVisits as PoolVisitRecord[]);
      },
      onError: () => setLoading(false),
    });
  }, [poolId, companyId, poolDetailRepository]);

  const computedVolume = useMemo(() => {
    if (!pool) return undefined;
    if (pool.volumeM3 && pool.volumeM3 > 0) return pool.volumeM3;
    const avg = pool.avgDepthM ?? computeAvgDepthM(pool.minDepthM, pool.maxDepthM) ?? undefined;
    return estimateVolumeM3({
      shape: pool.shape,
      lengthM: pool.lengthM,
      widthM: pool.widthM,
      avgDepthM: avg,
    });
  }, [pool]);

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return format(parseISO(iso), 'PPp', { locale: dateLocale });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return <PoolDetailLoadingState />;
  }

  if (!pool || !poolId) {
    return <PoolDetailNotFoundState onBack={() => navigate('/pools')} />;
  }

  const lastVisit = visits[0];

  return (
    <div className="space-y-5 pb-8">
      <PoolDetailHero pool={pool} onBack={() => navigate('/pools')} />
      <PoolDetailMetricCards pool={pool} computedVolume={computedVolume} lastVisit={lastVisit} fmtDate={fmtDate} />
      <PoolDetailNextMaintCard pool={pool} fmtDate={fmtDate} />
      <PoolDetailGeneralSection pool={pool} />
      <PoolDetailEquipmentSection pool={pool} />
      <PoolDetailHistorySection pool={pool} />
      <PoolDetailVisitsSection visits={visits} lastVisit={lastVisit} fmtDate={fmtDate} />
      <PoolDetailFooterActions poolId={pool.id} onBackToList={() => navigate('/pools')} />
    </div>
  );
}
