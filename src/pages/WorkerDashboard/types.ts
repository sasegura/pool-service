export interface WorkerRoute {
  id: string;
  poolIds: string[];
  status: 'pending' | 'in-progress' | 'completed';
  date?: string;
  startDate?: string;
  endDate?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  daysOfWeek?: number[];
  assignedDay?: number;
  workerId?: string;
  routeName?: string;
  startTime?: string;
  endTime?: string;
  completedPools?: string[];
  lastPoolId?: string;
  lastStatus?: 'ok' | 'issue';
  templateId?: string;
  planningPriority?: number;
}

export type PersistedRouteProgress = {
  status?: WorkerRoute['status'];
  completedPools?: string[];
};
