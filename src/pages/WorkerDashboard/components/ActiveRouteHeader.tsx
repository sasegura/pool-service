import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { ArrowLeft, CheckCircle2, Loader2, Play } from 'lucide-react';
import { Button } from '../../../components/ui/Common';
import type { WorkerRoute } from '../types';

type Props = {
  dateLocale: Locale;
  datePattern: string;
  todayRoute: WorkerRoute;
  onBack: () => void;
  backLabel: string;
  title: string;
  onStartDay: () => void;
  onEndDay: () => void;
  onContinueDayUiOnly: () => void;
  startDayLabel: string;
  endDayLabel: string;
  continueDayLabel: string;
  finishedLabel: string;
  isEndingDay: boolean;
  endingDayLabel: string;
};

export function ActiveRouteHeader({
  dateLocale,
  datePattern,
  todayRoute,
  onBack,
  backLabel,
  title,
  onStartDay,
  onEndDay,
  onContinueDayUiOnly,
  startDayLabel,
  endDayLabel,
  continueDayLabel,
  finishedLabel,
  isEndingDay,
  endingDayLabel,
}: Props) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 w-11 p-0 rounded-xl"
          onClick={onBack}
          aria-label={backLabel}
          disabled={isEndingDay}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-black text-slate-900">{title}</h2>
          <p className="text-slate-500">{format(new Date(), datePattern, { locale: dateLocale })}</p>
        </div>
      </div>
      <div className="flex gap-2 min-h-[40px] items-center">
        {isEndingDay ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" aria-hidden />
            <span>{endingDayLabel}</span>
          </div>
        ) : null}
        {!isEndingDay && todayRoute.status === 'pending' && (
          <Button type="button" variant="primary" onClick={onStartDay} className="gap-2">
            <Play className="w-4 h-4" /> {startDayLabel}
          </Button>
        )}
        {!isEndingDay && todayRoute.status === 'in-progress' && (
          <Button type="button" variant="danger" onClick={onEndDay} className="gap-2 shadow-lg shadow-red-100">
            {endDayLabel}
          </Button>
        )}
        {!isEndingDay && todayRoute.status === 'completed' && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {(todayRoute.completedPools?.length || 0) < todayRoute.poolIds.length && (
                <Button type="button" variant="primary" onClick={onContinueDayUiOnly} size="sm" className="gap-2">
                  <Play className="w-3 h-3" /> {continueDayLabel}
                </Button>
              )}
              <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {finishedLabel}
              </div>
            </div>
            {todayRoute.startTime && todayRoute.endTime && (
              <span className="text-[10px] text-slate-400 mt-1 font-mono">
                {format(new Date(todayRoute.startTime), 'HH:mm')} - {format(new Date(todayRoute.endTime), 'HH:mm')}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
