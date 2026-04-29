export type UnsubscribeFn = () => void;

export interface AdminOverviewRoute {
  id: string;
  workerId: string;
  poolIds: string[];
  completedPools?: string[];
  status: 'pending' | 'in-progress' | 'completed';
  lastPoolId?: string;
  lastStatus?: 'ok' | 'issue';
  date: string;
  startDate?: string;
  endDate?: string;
  recurrence?: string;
  assignedDay?: number;
  startTime?: string;
  endTime?: string;
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
  subscribeIncidentsCountByDate(
    selectedDate: string,
    onNext: (count: number) => void,
    onError?: (e: unknown) => void
  ): UnsubscribeFn;
}
