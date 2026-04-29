import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createRoutesCommands } from '../../features/routes/application/routesCommands';
import { createRoutesDirectoryRepositoryFirestore } from '../../features/routes/repositories/routesDirectoryRepositoryFirestore';
import { createIncidentsRepositoryFirestore } from '../../features/incidents/repositories/incidentsRepositoryFirestore';
import { createPoolsDirectoryRepositoryFirestore } from '../../features/pools/repositories/poolsDirectoryRepositoryFirestore';
import { createPoolDetailRepositoryFirestore } from '../../features/pools/repositories/poolDetailRepositoryFirestore';
import { createTeamRepositoryFirestore } from '../../features/team/repositories/teamRepositoryFirestore';
import { createAdminOverviewRepositoryFirestore } from '../../features/admin-overview/repositories/adminOverviewRepositoryFirestore';
import { createClientDashboardRepositoryFirestore } from '../../features/client-dashboard/repositories/clientDashboardRepositoryFirestore';
import { createPoolVisitCommands } from '../../features/visits/application/poolVisitService';
import { createPoolVisitRepositoryFirestore } from '../../features/visits/repositories/poolVisitRepositoryFirestore';
import { createWorkerRoutesCommands } from '../../features/worker-dashboard/application/workerRoutesCommands';
import { createWorkerRoutesRepositoryFirestore } from '../../features/worker-dashboard/repositories/workerRoutesRepositoryFirestore';
import { createInviteAcceptanceRepositoryFirestore } from '../../features/tenant/repositories/inviteAcceptanceRepositoryFirestore';

type AppServices = {
  routesRepository: ReturnType<typeof createRoutesDirectoryRepositoryFirestore> | null;
  routesCommands: ReturnType<typeof createRoutesCommands> | null;
  poolsRepository: ReturnType<typeof createPoolsDirectoryRepositoryFirestore> | null;
  incidentsRepository: ReturnType<typeof createIncidentsRepositoryFirestore> | null;
  teamRepository: ReturnType<typeof createTeamRepositoryFirestore> | null;
  workerRoutesRepository: ReturnType<typeof createWorkerRoutesRepositoryFirestore> | null;
  workerRoutesCommands: ReturnType<typeof createWorkerRoutesCommands> | null;
  poolVisitRepository: ReturnType<typeof createPoolVisitRepositoryFirestore> | null;
  poolVisitCommands: ReturnType<typeof createPoolVisitCommands> | null;
  poolDetailRepository: ReturnType<typeof createPoolDetailRepositoryFirestore> | null;
  adminOverviewRepository: ReturnType<typeof createAdminOverviewRepositoryFirestore> | null;
  clientDashboardRepository: ReturnType<typeof createClientDashboardRepositoryFirestore> | null;
  inviteAcceptanceRepository: ReturnType<typeof createInviteAcceptanceRepositoryFirestore>;
};

const AppServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({ children }: PropsWithChildren) {
  const { companyId } = useAuth();

  const services = useMemo<AppServices>(() => {
    const routesRepository = companyId ? createRoutesDirectoryRepositoryFirestore(companyId) : null;
    const poolsRepository = companyId ? createPoolsDirectoryRepositoryFirestore(companyId) : null;
    const incidentsRepository = companyId ? createIncidentsRepositoryFirestore(companyId) : null;
    const teamRepository = companyId ? createTeamRepositoryFirestore(companyId) : null;
    const workerRoutesRepository = companyId ? createWorkerRoutesRepositoryFirestore(companyId) : null;
    const poolVisitRepository = companyId ? createPoolVisitRepositoryFirestore(companyId) : null;
    const poolDetailRepository = companyId ? createPoolDetailRepositoryFirestore(companyId) : null;
    const adminOverviewRepository = companyId ? createAdminOverviewRepositoryFirestore(companyId) : null;
    const clientDashboardRepository = companyId ? createClientDashboardRepositoryFirestore(companyId) : null;

    return {
      routesRepository,
      routesCommands: routesRepository ? createRoutesCommands(routesRepository) : null,
      poolsRepository,
      incidentsRepository,
      teamRepository,
      workerRoutesRepository,
      workerRoutesCommands: workerRoutesRepository
        ? createWorkerRoutesCommands(workerRoutesRepository)
        : null,
      poolVisitRepository,
      poolVisitCommands: poolVisitRepository ? createPoolVisitCommands(poolVisitRepository) : null,
      poolDetailRepository,
      adminOverviewRepository,
      clientDashboardRepository,
      inviteAcceptanceRepository: createInviteAcceptanceRepositoryFirestore(),
    };
  }, [companyId]);

  return <AppServicesContext.Provider value={services}>{children}</AppServicesContext.Provider>;
}

export function useAppServices() {
  const context = useContext(AppServicesContext);
  if (!context) {
    throw new Error('useAppServices must be used inside AppServicesProvider');
  }
  return context;
}
