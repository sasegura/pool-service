export type UnsubscribeFn = () => void;

export interface AdminOverviewRoute {
  id: string;
  workerId?: string;
  poolIds: string[];
  completedPools?: string[];
  status: 'pending' | 'in-progress' | 'completed';
  lastPoolId?: string;
  lastStatus?: 'ok' | 'issue';
  /** Concrete service day (yyyy-MM-dd); empty for recurrence templates */
  date?: string;
  startDate?: string;
  endDate?: string;
  recurrence?: string;
  daysOfWeek?: number[];
  planningPriority?: number;
  assignedDay?: number;
  startTime?: string;
  endTime?: string;
  templateId?: string;
}

export interface AdminOverviewWorkerUser {
  id: string;
  name: string;
  role: string;
  lastLocation?: { lat: number; lng: number };
  lastActive?: { toDate?: () => Date };
}

export interface AdminOverviewRepository {
  subscribePools(
    onNext: (input: { count: number; map: Record<string, string> }) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
  subscribeMembers(
    onNext: (input: { users: Record<string, string>; workers: AdminOverviewWorkerUser[] }) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
  subscribeRoutesByDate(
    selectedDate: string,
    onNext: (routes: AdminOverviewRoute[]) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
  subscribeLogsForDate(
    selectedDate: string,
    onNext: (logs: Array<Record<string, unknown> & { id: string }>) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
}
