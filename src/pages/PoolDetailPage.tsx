import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  limit,
} from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { Button, Card } from '../components/ui/Common';
import { PoolStatusBadge } from '../components/PoolStatusBadge';
import { estimateVolumeM3, computeAvgDepthM } from '../lib/poolVolume';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import type { PoolRecord, PoolVisitRecord } from '../types/pool';

export default function PoolDetailPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : es;

  const [pool, setPool] = useState<PoolRecord | null>(null);
  const [visits, setVisits] = useState<PoolVisitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!poolId) return;
    const unsubPool = onSnapshot(doc(db, 'pools', poolId), (snap) => {
      if (!snap.exists()) {
        setPool(null);
        setLoading(false);
        return;
      }
      setPool({ id: snap.id, ...snap.data() } as PoolRecord);
      setLoading(false);
    });
    const q = query(collection(db, 'pools', poolId, 'visits'), orderBy('visitedAt', 'desc'), limit(24));
    const unsubVisits = onSnapshot(q, (snap) => {
      setVisits(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as PoolVisitRecord))
      );
    });
    return () => {
      unsubPool();
      unsubVisits();
    };
  }, [poolId]);

  const computedVolume = useMemo(() => {
    if (!pool) return undefined;
    if (pool.volumeM3 && pool.volumeM3 > 0) return pool.volumeM3;
    const avg =
      pool.avgDepthM ?? computeAvgDepthM(pool.minDepthM, pool.maxDepthM) ?? undefined;
    return estimateVolumeM3({
      shape: pool.shape,
      lengthM: pool.lengthM,
      widthM: pool.widthM,
      avgDepthM: avg,
    });
  }, [pool]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="font-medium">{t('poolDetail.loading')}</p>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-bold mb-4">{t('poolDetail.notFound')}</p>
        <Button onClick={() => navigate('/pools')}>{t('poolDetail.backList')}</Button>
      </div>
    );
  }

  const lastVisit = visits[0];
  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return format(parseISO(iso), 'PPp', { locale: dateLocale });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-start gap-3">
        <Button type="button" variant="outline" size="sm" className="h-10 w-10 p-0 rounded-xl shrink-0" onClick={() => navigate('/pools')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-slate-900 leading-tight">{pool.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{pool.address}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <PoolStatusBadge status={pool.healthStatus} />
            {pool.poolSystemType && (
              <span className="text-[10px] font-black uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                {t(`poolDetail.system.${pool.poolSystemType}`)}
              </span>
            )}
            {pool.usage && (
              <span className="text-[10px] font-black uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                {t(`poolDetail.usage.${pool.usage}`)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('poolDetail.cardVolume')}</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {(pool.volumeM3 ?? computedVolume ?? 0).toFixed(1)} m³
          </p>
          {pool.volumeManualOverride && (
            <p className="text-[11px] text-amber-700 font-bold mt-1">{t('poolDetail.manualVolume')}</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('poolDetail.cardLastReading')}</p>
          <p className="text-sm text-slate-700 mt-2">
            {lastVisit
              ? fmtDate(lastVisit.visitedAt)
              : t('poolDetail.noVisits')}
          </p>
          {pool.lastMeasurement?.ph != null && (
            <p className="text-xs text-slate-500 mt-1">
              pH {pool.lastMeasurement.ph} · FC {pool.lastMeasurement.freeChlorinePpm ?? '—'} ppm
            </p>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('poolDetail.nextMaint')}</h2>
          <PoolStatusBadge status={pool.healthStatus} size="sm" />
        </div>
        <p className="text-lg font-bold text-slate-900">{fmtDate(pool.nextRecommendedMaintenance)}</p>
        <p className="text-xs text-slate-500 mt-1">{t('poolDetail.nextMaintHint')}</p>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('poolDetail.sectionGeneral')}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolDetail.owner')}</dt>
            <dd className="font-semibold text-slate-900">{pool.ownerLabel || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolDetail.shapeLabel')}</dt>
            <dd className="font-semibold text-slate-900">
              {pool.shape ? t(`poolForm.shape.${pool.shape}`) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolDetail.dims')}</dt>
            <dd className="font-semibold text-slate-900">
              {pool.lengthM ?? '—'} × {pool.widthM ?? '—'} m · {t('poolDetail.depths')}{' '}
              {pool.minDepthM ?? '—'}–{pool.maxDepthM ?? '—'} m
            </dd>
          </div>
          <div>
            <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolDetail.avgDepth')}</dt>
            <dd className="font-semibold text-slate-900">
              {(
                pool.avgDepthM ??
                computeAvgDepthM(pool.minDepthM, pool.maxDepthM) ??
                '—'
              ).toString()}
              {pool.avgDepthM != null || (pool.minDepthM != null && pool.maxDepthM != null) ? ' m' : ''}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('poolDetail.sectionEquipment')}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.filterType')}</dt>
            <dd className="font-semibold">{pool.equipment?.filterType || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.pumpType')}</dt>
            <dd className="font-semibold">{pool.equipment?.pumpType || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.chlorination')}</dt>
            <dd className="font-semibold">{pool.equipment?.chlorinationSystem || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.skimmers')}</dt>
            <dd className="font-semibold">{pool.equipment?.skimmerType || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.lastReview')}</dt>
            <dd className="font-semibold">{pool.equipment?.lastTechnicalReview || '—'}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('poolDetail.sectionHistory')}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.lastMaintenance')}</dt>
            <dd className="font-semibold">{pool.history?.lastMaintenance || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.lastFilterClean')}</dt>
            <dd className="font-semibold">{pool.history?.lastFilterClean || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-400 text-[10px] font-bold uppercase">{t('poolForm.incidents')}</dt>
            <dd className="font-semibold whitespace-pre-wrap">{pool.history?.previousIncidents || '—'}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-4">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t('poolDetail.visitsTitle')}</h2>
        {visits.length === 0 ? (
          <p className="text-sm text-slate-500">{t('poolDetail.noVisits')}</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 font-black uppercase tracking-wider">
                  <th className="py-2 pr-3">{t('poolDetail.colDate')}</th>
                  <th className="py-2 pr-3">pH</th>
                  <th className="py-2 pr-3">FC</th>
                  <th className="py-2 pr-3">TA</th>
                  <th className="py-2 pr-3">{t('poolDetail.colTech')}</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3 whitespace-nowrap font-semibold text-slate-800">
                      {fmtDate(v.visitedAt)}
                    </td>
                    <td className="py-2 pr-3">{v.chemistry?.ph ?? '—'}</td>
                    <td className="py-2 pr-3">{v.chemistry?.freeChlorinePpm ?? '—'}</td>
                    <td className="py-2 pr-3">{v.chemistry?.totalAlkalinityPpm ?? '—'}</td>
                    <td className="py-2 pr-3 text-slate-600">{v.technicianName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lastVisit?.appliedTreatment && (
          <div className="mt-4 text-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase">{t('poolDetail.lastTreatment')}</p>
            <p className="text-slate-800 whitespace-pre-wrap mt-1">{lastVisit.appliedTreatment}</p>
          </div>
        )}
      </Card>

      <div className="flex gap-2">
        <Link to={`/pools/${pool.id}/visit`} className="flex-1">
          <Button variant="outline" className="w-full min-h-[48px] font-black gap-2">
            <ExternalLink className="w-4 h-4" />
            {t('poolDetail.openVisit')}
          </Button>
        </Link>
        <Button className="flex-1 min-h-[48px] font-black" onClick={() => navigate('/pools')}>
          {t('poolDetail.backList')}
        </Button>
      </div>
    </div>
  );
}
