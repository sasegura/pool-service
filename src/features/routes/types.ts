export interface RoutesPool {
  id: string;
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}

export interface RoutesWorker {
  id: string;
  name: string;
  role: string;
  isWorker?: boolean;
}

export interface RouteDocument {
  id: string;
  workerId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  daysOfWeek?: number[];
  routeName?: string;
  poolIds: string[];
  status: 'pending' | 'in-progress' | 'completed';
  order?: number;
  assignedDay?: number;
  createdAt?: string;
  templateId?: string;
  planningPriority?: number;
}
