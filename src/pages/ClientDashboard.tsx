import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Common';
import { Waves, Calendar, CheckCircle2, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

interface Pool {
  id: string;
  name: string;
  address: string;
  clientId?: string;
}

interface Log {
  id: string;
  poolId: string;
  workerId: string;
  arrivalTime: any;
  status: 'ok' | 'issue';
  notes?: string;
  date: string;
  notifyClient?: boolean;
}

const FIRESTORE_IN_MAX = 30;

export default function ClientDashboard() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : es;
  const { user } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [workers, setWorkers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  /** IDs de documento `users` que representan a este cliente (Auth UID + perfiles con el mismo email). */
  const [poolOwnerDocIds, setPoolOwnerDocIds] = useState<string[]>([]);

  const poolOwnerKey = useMemo(() => poolOwnerDocIds.slice().sort().join(','), [poolOwnerDocIds]);

  useEffect(() => {
    if (!user?.uid) {
      setPoolOwnerDocIds([]);
      return;
    }
    const email = (user.email || '').trim().toLowerCase();
    setPoolOwnerDocIds([user.uid]);
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const ids = new Set<string>([user.uid]);
      if (email) {
        snap.docs.forEach((d) => {
          const em = (d.data().email as string | undefined)?.trim().toLowerCase();
          if (em && em === email) ids.add(d.id);
        });
      }
      setPoolOwnerDocIds(Array.from(ids));
    });
    return () => unsub();
  }, [user?.uid, user?.email]);

  useEffect(() => {
    if (!user?.uid || poolOwnerDocIds.length === 0) {
      setPools([]);
      setLogs([]);
      setLoading(false);
      return;
    }

    let unsubLogs: (() => void) | undefined;

    const unsubWorkers = onSnapshot(collection(db, 'users'), (snap) => {
      const wMap: Record<string, string> = {};
      snap.docs.forEach((d) => {
        wMap[d.id] = d.data().name as string;
      });
      setWorkers(wMap);
    });

    const inIds = poolOwnerDocIds.slice(0, FIRESTORE_IN_MAX);
    const qPools =
      inIds.length === 1
        ? query(collection(db, 'pools'), where('clientId', '==', inIds[0]))
        : query(collection(db, 'pools'), where('clientId', 'in', inIds));

    const unsubPools = onSnapshot(
      qPools,
      (snap) => {
        unsubLogs?.();
        unsubLogs = undefined;

        const poolsData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pool));
        setPools(poolsData);

        if (poolsData.length > 0) {
          const poolIds = poolsData.map((p) => p.id);
          const qLogs = query(
            collection(db, 'logs'),
            where('poolId', 'in', poolIds),
            orderBy('date', 'desc')
          );

          unsubLogs = onSnapshot(qLogs, (logSnap) => {
            const logsData = logSnap.docs
              .map((d) => ({ id: d.id, ...d.data() } as Log))
              .filter((log) => log.notifyClient !== false);

            const sortedLogs = logsData.sort((a, b) => {
              const timeA = a.arrivalTime?.toMillis?.() || 0;
              const timeB = b.arrivalTime?.toMillis?.() || 0;
              return timeB - timeA;
            });
            setLogs(sortedLogs);
            setLoading(false);
          });
        } else {
          setLogs([]);
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
      }
    );

    return () => {
      unsubWorkers();
      unsubPools();
      unsubLogs?.();
    };
  }, [user?.uid, poolOwnerKey]);

  if (loading) return <div className="p-8 text-center">{t('client.loadingHistory')}</div>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black text-slate-900">{t('client.title')}</h2>
        <p className="text-slate-500">{t('client.subtitle')}</p>
      </header>

      {pools.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-2">
          <Waves className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">{t('client.noPoolsTitle')}</h3>
          <p className="text-slate-500">{t('client.noPoolsBody')}</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {pools.map((pool) => (
            <div key={pool.id} className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <Waves className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">{pool.name}</h3>
                  <div className="flex items-center text-xs text-slate-500 font-bold uppercase tracking-wider">
                    <MapPin className="w-3 h-3 mr-1" /> {pool.address}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  {t('client.recentReviews')}
                </h4>
                {logs.filter((l) => l.poolId === pool.id).length === 0 ? (
                  <p className="text-sm text-slate-400 italic ml-1">{t('client.noLogs')}</p>
                ) : (
                  logs
                    .filter((l) => l.poolId === pool.id)
                    .map((log) => (
                      <Card key={log.id} className="p-4 hover:border-blue-200 transition-colors group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4">
                            <div
                              className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                                log.status === 'ok' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                              )}
                            >
                              {log.status === 'ok' ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <AlertTriangle className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-black text-slate-900">
                                  {log.status === 'ok'
                                    ? t('client.serviceCompleted')
                                    : t('client.incidentReported')}
                                </span>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-tighter">
                                  {workers[log.workerId] || t('client.technicianFallback')}
                                </span>
                              </div>
                              <div className="flex items-center text-xs text-slate-500 font-bold gap-3">
                                <div className="flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {log.arrivalTime?.toDate
                                    ? format(log.arrivalTime.toDate(), 'd MMM, yyyy', { locale: dateLocale })
                                    : log.date}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {log.arrivalTime?.toDate ? format(log.arrivalTime.toDate(), 'HH:mm') : '--:--'}
                                </div>
                              </div>
                              {log.notes && (
                                <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-600 border border-slate-100 italic">
                                  "{log.notes}"
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
