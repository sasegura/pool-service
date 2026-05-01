import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useAppServices } from '../../app/providers/AppServicesContext';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { APIProvider } from '@vis.gl/react-google-maps';
import { resolveWorkerDashboardState } from '../../features/worker-dashboard/application/resolveWorkerDashboardState';
import type { PoolRecord } from '../../types/pool';
import { GOOGLE_MAPS_API_KEY, MAPS_INTEGRATION_ENABLED } from './mapConfig';
import type { WorkerRoute } from './types';
import { hydrateRouteProgress, persistRouteProgress, statusRank } from './routeProgress';
import { isRouteActiveToday, nextOccurrenceDate } from './routeScheduling';
import { getIsoTime, removeUndefinedFields } from './misc';
import { RouteLoadingView } from './components/RouteLoadingView';
import { RouteSelectionView } from './components/RouteSelectionView';
import { ActiveRouteHeader } from './components/ActiveRouteHeader';
import { RouteMapCard } from './components/RouteMapCard';
import { PoolStopCard } from './components/PoolStopCard';

export default function WorkerDashboard() {
  const { idRuta } = useParams<{ idRuta?: string }>();
  const { user, loading: authLoading, companyId } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const authUid = auth.currentUser?.uid ?? user?.uid;
  const { workerRoutesRepository, workerRoutesCommands } = useAppServices();

  const normalizeOwnerId = (value?: string | null) => (value || '').trim().toLowerCase();

  const routeOwnerIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (authUid) ids.add(normalizeOwnerId(authUid));
    if (user?.uid) ids.add(normalizeOwnerId(user.uid));
    if (user?.email) ids.add(normalizeOwnerId(user.email));
    return ids;
  }, [authUid, user?.uid, user?.email]);

  const isMyWorkerRoute = (workerId?: string | null) =>
    Boolean(workerId && routeOwnerIds.has(normalizeOwnerId(workerId)));

  const dateLocale = i18n.language?.startsWith('en') ? enUS : es;
  const datePattern = i18n.language?.startsWith('en') ? 'EEEE, MMMM d, yyyy' : "EEEE, d 'de' MMMM";

  const [todayRoute, setTodayRoute] = useState<WorkerRoute | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<WorkerRoute[]>([]);
  const [hasOtherRoutes, setHasOtherRoutes] = useState(false);
  const [pools, setPools] = useState<Record<string, PoolRecord>>({});
  const [loading, setLoading] = useState(true);
  const [allMyRoutes, setAllMyRoutes] = useState<WorkerRoute[]>([]);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [activePoolIndex, setActivePoolIndex] = useState<number | null>(null);
  const [visitStatus, setVisitStatus] = useState<'idle' | 'arrived'>('idle');
  const [incidenceMode, setIncidenceMode] = useState(false);
  const [notes, setNotes] = useState('');
  const [notifyClient, setNotifyClient] = useState(true);
  const [companyName, setCompanyName] = useState<string>('');
  const [isEndingDay, setIsEndingDay] = useState(false);

  const recurrenceLabelForRoute = (route: WorkerRoute) => {
    if (route.recurrence === 'daily') return t('worker.periodicityDaily');
    if (route.recurrence === 'weekly') return t('worker.periodicityWeekly');
    if (route.recurrence === 'bi-weekly') return t('worker.periodicityBiWeekly');
    if (route.recurrence === 'monthly') return t('worker.periodicityMonthly');
    return t('worker.periodicityOneOff');
  };

  const routeTimingSubtitle = (route: WorkerRoute) => {
    const periodicity = recurrenceLabelForRoute(route);
    const nextDate = nextOccurrenceDate(route);
    return nextDate ? `${periodicity} • ${t('worker.nextDate', { date: nextDate })}` : periodicity;
  };

  useEffect(() => {
    if (authLoading) return;
    if (!companyId || !workerRoutesRepository) {
      setLoading(false);
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    const unsubRoutes = workerRoutesRepository.subscribeAllRoutes(
      async (allRoutes) => {
        const resolved = resolveWorkerDashboardState(
          allRoutes as any,
          today,
          isMyWorkerRoute,
          (route) => hydrateRouteProgress(route as WorkerRoute) as any
        );
        setAllMyRoutes(resolved.allMyRoutes as WorkerRoute[]);
        setAvailableRoutes(resolved.availableRoutes as WorkerRoute[]);
        setHasOtherRoutes(resolved.hasOtherRoutes);
        if (idRuta) {
          const fromUrl =
            (resolved.allMyRoutes as WorkerRoute[]).find((r) => r.id === idRuta || r.templateId === idRuta) ||
            (resolved.availableRoutes as WorkerRoute[]).find((r) => r.id === idRuta);
          setTodayRoute((prev) => {
            if (fromUrl) return hydrateRouteProgress(fromUrl);
            if (prev && (prev.id === idRuta || prev.templateId === idRuta)) {
              return prev;
            }
            return (resolved.todayRoute as WorkerRoute | null) ?? prev ?? null;
          });
        } else {
          setTodayRoute((resolved.todayRoute as WorkerRoute | null) ?? null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching routes:', error);
        setLoading(false);
      }
    );

    const unsubPools = workerRoutesRepository.subscribeAllPools(
      (allPools) => {
        const poolMap: Record<string, PoolRecord> = {};
        allPools.forEach((pool) => {
          poolMap[pool.id] = pool;
        });
        setPools(poolMap);
      },
      (error) => {
        console.error('Error fetching pools:', error);
      }
    );

    return () => {
      unsubRoutes();
      unsubPools();
    };
  }, [authLoading, authUid, user?.uid, companyId, workerRoutesRepository, idRuta]);

  useEffect(() => {
    if (!MAPS_INTEGRATION_ENABLED) return;
    if (!user || !todayRoute || todayRoute.status !== 'in-progress') return;

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          if (!authUid) return;
          if (!workerRoutesCommands) return;
          await workerRoutesCommands.updateMemberLocation(
            authUid,
            { lat: latitude, lng: longitude },
            new Date().toISOString()
          );
        } catch (error) {
          console.error('Error updating location:', error);
        }
      },
      (error) => {
        console.error('Error watching position:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [authUid, user, todayRoute?.status, workerRoutesCommands]);

  useEffect(() => {
    if (!todayRoute?.id) return;
    persistRouteProgress(todayRoute);
  }, [todayRoute?.id, todayRoute?.status, todayRoute?.completedPools]);

  useEffect(() => {
    if (!companyId) {
      setCompanyName('');
      return;
    }
    void (async () => {
      try {
        const snap = await getDoc(doc(db, 'companies', companyId));
        const name = snap.exists() ? String(snap.data()?.name ?? '').trim() : '';
        setCompanyName(name);
      } catch {
        setCompanyName('');
      }
    })();
  }, [companyId]);

  useEffect(() => {
    if (!todayRoute) return;
    const shouldResume = searchParams.get('resumeVisit') === '1';
    if (!shouldResume) return;

    const resumeRouteId = searchParams.get('routeId');
    const resumePoolId = searchParams.get('poolId');
    if (!resumePoolId) return;
    if (resumeRouteId && resumeRouteId !== todayRoute.id) return;

    const idx = todayRoute.poolIds.findIndex((id) => id === resumePoolId);
    if (idx === -1) return;

    setActivePoolIndex(idx);
    setVisitStatus('arrived');
    setIncidenceMode(false);

    const next = new URLSearchParams(searchParams);
    next.delete('resumeVisit');
    next.delete('routeId');
    next.delete('poolId');
    setSearchParams(next, { replace: true });
  }, [todayRoute, searchParams, setSearchParams]);

  useEffect(() => {
    if (!idRuta) return;
    if (todayRoute?.id === idRuta || todayRoute?.templateId === idRuta) return;

    const routeFromParam =
      allMyRoutes.find((r) => r.id === idRuta || r.templateId === idRuta) ||
      availableRoutes.find((r) => r.id === idRuta);
    if (!routeFromParam) return;

    setTodayRoute(hydrateRouteProgress(routeFromParam as WorkerRoute));
  }, [idRuta, todayRoute?.id, todayRoute?.templateId, allMyRoutes, availableRoutes]);

  const handlePickRoute = async (routeId: string) => {
    if (!authUid) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const sourceRoute = availableRoutes.find((r) => r.id === routeId);
    if (!sourceRoute) return;

    try {
      if (!workerRoutesCommands) return;

      if (sourceRoute.date === today) {
        await workerRoutesCommands.updateRoute(sourceRoute.id, {
          workerId: authUid,
          status: sourceRoute.status || 'pending',
        });
        setTodayRoute(hydrateRouteProgress({ ...sourceRoute, workerId: authUid }));
        navigate(`/route/${encodeURIComponent(sourceRoute.id)}`);
        toast.success(t('worker.toastRouteAssigned'));
        return;
      }

      const existingTodayInstance = allMyRoutes.find(
        (r) => r.date === today && (r.templateId === routeId || r.id === routeId)
      );
      if (existingTodayInstance) {
        setTodayRoute(hydrateRouteProgress(existingTodayInstance));
        navigate(`/route/${encodeURIComponent(existingTodayInstance.id)}`);
        toast.info(t('worker.toastDayResumed'));
        return;
      }

      const newRouteInstance = {
        ...sourceRoute,
        workerId: authUid,
        date: today,
        status: 'pending' as const,
        completedPools: [],
        templateId: routeId,
        createdAt: new Date().toISOString(),
      };
      delete (newRouteInstance as any).id;

      await workerRoutesCommands.createRoute(newRouteInstance);
      navigate(`/route/${encodeURIComponent(routeId)}`);
      toast.success(t('worker.toastRouteAssigned'));
    } catch (e) {
      toast.error(t('worker.toastRouteAssignError'));
    }
  };

  const handleStartDay = async () => {
    if (!todayRoute || !authUid) return;
    const startedAt = new Date().toISOString();

    try {
      if ((todayRoute as any).isVirtual) {
        if (!workerRoutesCommands) return;
        const today = format(new Date(), 'yyyy-MM-dd');
        const existingTodayInstance = allMyRoutes.find(
          (r) => r.date === today && (r.templateId === todayRoute.id || r.id === todayRoute.id)
        );
        if (existingTodayInstance) {
          await workerRoutesCommands.updateRoute(existingTodayInstance.id, {
            status: 'in-progress',
            startTime: existingTodayInstance.startTime || startedAt,
            workerId: authUid,
          });
          setTodayRoute(hydrateRouteProgress({ ...existingTodayInstance, status: 'in-progress' }));
          toast.info(t('worker.toastDayResumed'));
          return;
        }

        setTodayRoute((prev) =>
          prev
            ? {
                ...prev,
                status: 'in-progress',
                startTime: prev.startTime || startedAt,
              }
            : prev
        );
        const newInstance = removeUndefinedFields({
          ...todayRoute,
          workerId: authUid,
          status: 'in-progress',
          startTime: startedAt,
          completedPools: [],
          templateId: todayRoute.id,
          createdAt: startedAt,
        });
        delete (newInstance as any).id;
        delete (newInstance as any).isVirtual;

        await workerRoutesCommands.createRoute(newInstance);
        toast.success(t('worker.toastDayStartedNew'));
      } else {
        setTodayRoute((prev) => (prev ? { ...prev, status: 'in-progress' } : prev));
        persistRouteProgress({ ...todayRoute, status: 'in-progress' });
        if (!workerRoutesCommands) return;
        await workerRoutesCommands.updateRoute(todayRoute.id, {
          status: 'in-progress',
          startTime: todayRoute.startTime || startedAt,
          workerId: authUid,
        });
        toast.info(todayRoute.status === 'completed' ? t('worker.toastDayResumed') : t('worker.toastDayStarted'));
      }
    } catch (e) {
      console.error('Error starting day:', e);
      toast.error(t('worker.toastStartError'));
    }
  };

  const handleContinueDayUiOnly = () => {
    if (todayRoute?.id) {
      navigate(`/route/${encodeURIComponent(todayRoute.id)}`);
    }
    setTodayRoute((prev) => (prev ? { ...prev, status: 'in-progress' } : prev));
    setVisitStatus('idle');
    setActivePoolIndex(null);
    setIncidenceMode(false);
    setNotes('');
    setNotifyClient(true);
  };

  const handleEndDay = async () => {
    if (!todayRoute || !authUid) return;
    if (!workerRoutesCommands) return;
    setIsEndingDay(true);
    try {
      await workerRoutesCommands.updateRoute(todayRoute.id, {
        status: 'completed',
        endTime: new Date().toISOString(),
        workerId: authUid,
      });
      const completedSnapshot: WorkerRoute = { ...todayRoute, status: 'completed' };
      persistRouteProgress(completedSnapshot);
      toast.success(t('worker.toastDayFinished'));
      setTodayRoute(null);
      setActivePoolIndex(null);
      setVisitStatus('idle');
      setIncidenceMode(false);
      setNotes('');
      setNotifyClient(true);
      navigate('/');
    } catch (e) {
      console.error('Error ending day:', e);
      toast.error(t('worker.toastEndDayError'));
    } finally {
      setIsEndingDay(false);
    }
  };

  const handleArrive = (index: number) => {
    setActivePoolIndex(index);
    setVisitStatus('arrived');
    toast.success(t('worker.toastArrival'));
  };

  const handleResumeService = (index: number) => {
    setActivePoolIndex(index);
    setVisitStatus('arrived');
    setIncidenceMode(false);
    toast.info(t('worker.resumeService'));
  };

  const handleCloseActivePool = () => {
    setVisitStatus('idle');
    setActivePoolIndex(null);
    setIncidenceMode(false);
    setNotes('');
    setNotifyClient(true);
  };

  const handleGoToRouteSelection = () => {
    setTodayRoute(null);
    setActivePoolIndex(null);
    setVisitStatus('idle');
    setIncidenceMode(false);
    setNotes('');
    setNotifyClient(true);
    const next = new URLSearchParams(searchParams);
    next.delete('resumeVisit');
    next.delete('routeId');
    next.delete('poolId');
    setSearchParams(next, { replace: true });
    navigate('/');
  };

  const handleFinish = async (status: 'ok' | 'issue') => {
    if (activePoolIndex === null || !todayRoute || !authUid) return;

    const poolId = todayRoute.poolIds[activePoolIndex];

    try {
      const logPayload = removeUndefinedFields({
        workerId: authUid,
        poolId,
        arrivalTime: new Date().toISOString(),
        departureTime: new Date().toISOString(),
        status,
        notes: status === 'issue' ? notes : '',
        notifyClient: status === 'issue' ? notifyClient : true,
        date: todayRoute.date,
      });
      if (!workerRoutesCommands) return;
      await workerRoutesCommands.createLog(logPayload);

      const currentCompleted = todayRoute.completedPools || [];
      if (!currentCompleted.includes(poolId)) {
        const newCompleted = [...currentCompleted, poolId];
        const isAllDone = newCompleted.length === todayRoute.poolIds.length;
        setTodayRoute((prev) =>
          prev
            ? {
                ...prev,
                completedPools: newCompleted,
                status: isAllDone ? 'completed' : 'in-progress',
                lastPoolId: poolId,
                lastStatus: status,
              }
            : prev
        );
        persistRouteProgress({
          id: todayRoute.id,
          templateId: todayRoute.templateId,
          status: isAllDone ? 'completed' : 'in-progress',
          completedPools: newCompleted,
        });

        await workerRoutesCommands.updateRoute(todayRoute.id, {
          completedPools: newCompleted,
          status: isAllDone ? 'completed' : 'in-progress',
          lastPoolId: poolId,
          lastStatus: status,
          workerId: authUid,
        });
      }

      toast.success(status === 'ok' ? t('worker.toastServiceOk') : t('worker.toastIncident'));

      setVisitStatus('idle');
      setActivePoolIndex(null);
      setIncidenceMode(false);
      setNotes('');
      setNotifyClient(true);
    } catch (e: any) {
      console.error('Error saving worker log:', e);
      toast.error(t('worker.toastSaveError'), {
        description: e?.message || e?.code || 'Unknown error',
      });
    }
  };

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  if (authLoading || loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">{t('worker.loadingShift')}</p>
      </div>
    );
  }

  if (!user) {
    return <div className="p-12 text-center text-red-500 font-bold">{t('common.userNotFound')}</div>;
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const assignedTodayRoutes = allMyRoutes
    .filter((r) => isRouteActiveToday(r, todayStr))
    .sort((a, b) => {
      const statusDiff = statusRank[b.status] - statusRank[a.status];
      if (statusDiff !== 0) return statusDiff;
      return getIsoTime(b.startTime) - getIsoTime(a.startTime);
    });

  if (!todayRoute && idRuta) {
    return (
      <RouteLoadingView
        onBack={handleGoToRouteSelection}
        title={t('worker.myRoute')}
        subtitle={t('worker.loadingShift')}
        backLabel={t('common.back', { defaultValue: 'Back' })}
      />
    );
  }

  if (!todayRoute) {
    return (
      <RouteSelectionView
        t={t}
        availableRoutes={availableRoutes}
        assignedTodayRoutes={assignedTodayRoutes}
        hasOtherRoutes={hasOtherRoutes}
        showAllRoutes={showAllRoutes}
        onToggleShowAllRoutes={() => setShowAllRoutes(!showAllRoutes)}
        allMyRoutes={allMyRoutes}
        companyName={companyName}
        userLabel={user.displayName || user.email || user.uid}
        onPickRoute={handlePickRoute}
        onSelectAssignedRoute={(r) => {
          setTodayRoute(hydrateRouteProgress(r));
          navigate(`/route/${encodeURIComponent(r.id)}`);
        }}
        routeTimingSubtitle={routeTimingSubtitle}
      />
    );
  }

  const canUseMaps =
    MAPS_INTEGRATION_ENABLED && !!GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'MY_GOOGLE_MAPS_API_KEY';

  const content = (
    <div className="space-y-6">
      <ActiveRouteHeader
        dateLocale={dateLocale}
        datePattern={datePattern}
        todayRoute={todayRoute}
        onBack={handleGoToRouteSelection}
        backLabel={t('common.back', { defaultValue: 'Back' })}
        title={t('worker.myRoute')}
        onStartDay={handleStartDay}
        onEndDay={handleEndDay}
        onContinueDayUiOnly={handleContinueDayUiOnly}
        startDayLabel={t('worker.startDay')}
        endDayLabel={t('worker.endDay')}
        continueDayLabel={t('worker.continueDay')}
        finishedLabel={t('worker.finished')}
        isEndingDay={isEndingDay}
        endingDayLabel={t('worker.endingDay')}
      />

      {canUseMaps ? (
        <RouteMapCard
          poolIds={todayRoute.poolIds}
          pools={pools}
          completedPoolIds={todayRoute.completedPools}
          progressTitle={t('worker.progress')}
          poolsProgressLabel={t('worker.poolsProgress', {
            done: todayRoute.completedPools?.length || 0,
            total: todayRoute.poolIds.length,
          })}
        />
      ) : null}

      <div className={cn('space-y-4 transition-opacity', isEndingDay && 'pointer-events-none opacity-50')}>
        {todayRoute.poolIds.map((poolId, index) => {
          const pool = pools[poolId];
          if (!pool) return null;
          const isActive = activePoolIndex === index;
          const isCompleted = todayRoute.completedPools?.includes(poolId) ?? false;

          return (
            <PoolStopCard
              key={poolId}
              pool={pool}
              poolId={poolId}
              index={index}
              poolNumberLabel={t('worker.poolNumber', { n: index + 1 })}
              todayRoute={todayRoute}
              isActive={isActive}
              isCompleted={isCompleted}
              visitStatus={visitStatus}
              incidenceMode={incidenceMode}
              notes={notes}
              notifyClient={notifyClient}
              onCloseActivePool={handleCloseActivePool}
              closeLabel={t('common.close')}
              onOpenMaps={openInMaps}
              onArrive={handleArrive}
              onResumeService={handleResumeService}
              onFinish={handleFinish}
              onSetIncidenceMode={setIncidenceMode}
              onNotesChange={setNotes}
              onNotifyClientChange={setNotifyClient}
              t={t}
            />
          );
        })}
      </div>
    </div>
  );

  if (!canUseMaps) return content;
  return <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>{content}</APIProvider>;
}
