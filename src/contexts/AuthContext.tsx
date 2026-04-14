import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDocsFromServer,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useTranslation } from 'react-i18next';
import type { AppUser } from '../features/auth/types';
import { runDemoBootstrap } from '../features/auth/services/demoBootstrap';
import { isDemoAccountEmail } from '../config/demoAccount';
import { bootstrapEmailDemoWorkspace, createTenantWorkspace } from '../features/tenant/services/tenantClientSetup';
import type { CompanyMembershipRole } from '../features/tenant/types';

const DEMO_DASHBOARD_VIEW_KEY = 'pool-service-demo-dashboard-view';

export type DemoDashboardView = 'admin' | 'worker' | 'client';

export type MembershipRole = CompanyMembershipRole | null;

function readStoredDemoView(): DemoDashboardView {
  try {
    const v = sessionStorage.getItem(DEMO_DASHBOARD_VIEW_KEY);
    if (v === 'worker' || v === 'client' || v === 'admin') return v;
  } catch {
    /* ignore */
  }
  return 'admin';
}

export function demoDashboardViewToNavRole(view: DemoDashboardView): CompanyMembershipRole {
  if (view === 'worker') return 'technician';
  if (view === 'client') return 'client';
  return 'admin';
}

function parseMembershipRole(raw: string | null | undefined): MembershipRole {
  if (raw === 'admin' || raw === 'supervisor' || raw === 'technician' || raw === 'client') return raw;
  return null;
}

interface AuthContextType {
  user: AppUser | null;
  authUser: User | null;
  membershipRole: MembershipRole;
  companyId: string | null;
  tenantLoading: boolean;
  needsCompanyOnboarding: boolean;
  tenantError: string | null;
  refreshClaims: () => Promise<void>;
  submitCreateCompany: (payload: {
    name: string;
    taxId?: string;
    address?: string;
    phone?: string;
    email?: string;
  }) => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isWorker: boolean;
  isClient: boolean;
  /** Legacy UI role for copy that still keys off admin | worker | client */
  role: 'admin' | 'worker' | 'client' | null;
  /** True when the active company is the preset demo workspace (`isAnonymousSandbox` or `isDemoWorkspace`). */
  isDemoCompany: boolean;
  /** In demo company: which dashboard to show (Firestore role stays admin). */
  demoDashboardView: DemoDashboardView;
  setDemoDashboardView: (view: DemoDashboardView) => void;
  /** Maps demo view to a membership-like role for nav and labels when `isDemoCompany`. */
  navRoleForUi: MembershipRole;
  setRole: (_: 'admin' | 'worker' | 'client') => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  authUser: null,
  membershipRole: null,
  companyId: null,
  tenantLoading: true,
  needsCompanyOnboarding: false,
  tenantError: null,
  refreshClaims: async () => {},
  submitCreateCompany: async () => {},
  loading: true,
  isAdmin: false,
  isSupervisor: false,
  isWorker: false,
  isClient: false,
  role: null,
  isDemoCompany: false,
  demoDashboardView: 'admin',
  setDemoDashboardView: () => {},
  navRoleForUi: null,
  setRole: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [membershipRole, setMembershipRole] = useState<MembershipRole>(null);
  const [needsCompanyOnboarding, setNeedsCompanyOnboarding] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [isDemoCompany, setIsDemoCompany] = useState(false);
  const [demoDashboardView, setDemoDashboardViewState] = useState<DemoDashboardView>('admin');
  const demoWorkspaceBootstrapLock = useRef(false);

  const setDemoDashboardView = useCallback((view: DemoDashboardView) => {
    setDemoDashboardViewState(view);
    try {
      sessionStorage.setItem(DEMO_DASHBOARD_VIEW_KEY, view);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!companyId) {
      setIsDemoCompany(false);
      return;
    }
    const ref = doc(db, 'companies', companyId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        const v = data?.isAnonymousSandbox === true || data?.isDemoWorkspace === true;
        setIsDemoCompany(v);
      },
      () => setIsDemoCompany(false)
    );
    return () => unsub();
  }, [companyId]);

  useEffect(() => {
    if (isDemoCompany) {
      setDemoDashboardViewState(readStoredDemoView());
    } else {
      setDemoDashboardViewState('admin');
    }
  }, [isDemoCompany]);

  const membershipQuery = useMemo(() => {
    if (!authUser) return null;
    return query(
      collection(db, 'users', authUser.uid, 'memberships'),
      where('status', '==', 'active'),
      limit(1)
    );
  }, [authUser]);

  const refreshClaims = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    const q = query(
      collection(db, 'users', u.uid, 'memberships'),
      where('status', '==', 'active'),
      limit(1)
    );
    const snap = await getDocsFromServer(q);
    const d = snap.docs[0];
    if (d) {
      setCompanyId(d.id);
      setMembershipRole(parseMembershipRole(String(d.data().role ?? '')));
      setNeedsCompanyOnboarding(false);
    } else {
      setCompanyId(null);
      setMembershipRole(null);
      setNeedsCompanyOnboarding(!u.isAnonymous && !isDemoAccountEmail(u.email));
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setTenantError(null);
      if (user) {
        setAuthUser(user);
        setAuthLoading(false);
      } else {
        setAuthUser(null);
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser || !membershipQuery) {
      setCompanyId(null);
      setMembershipRole(null);
      setNeedsCompanyOnboarding(false);
      setTenantLoading(false);
      return;
    }

    setTenantLoading(true);

    const unsub = onSnapshot(
      membershipQuery,
      (snap) => {
        const d = snap.docs[0];
        if (d) {
          setCompanyId(d.id);
          setMembershipRole(parseMembershipRole(String(d.data().role ?? '')));
          setNeedsCompanyOnboarding(false);
          setTenantLoading(false);
          return;
        }

        if (isDemoAccountEmail(authUser.email)) {
          if (demoWorkspaceBootstrapLock.current) return;
          demoWorkspaceBootstrapLock.current = true;
          setTenantLoading(true);
          void (async () => {
            try {
              await bootstrapEmailDemoWorkspace(db, authUser.uid, {
                displayName: authUser.displayName || authUser.email?.split('@')[0] || 'Demo',
                email: authUser.email || '',
              });
            } catch (e) {
              console.error(e);
              setTenantError(e instanceof Error ? e.message : 'tenant_error');
              setTenantLoading(false);
            } finally {
              demoWorkspaceBootstrapLock.current = false;
            }
          })();
          return;
        }

        setCompanyId(null);
        setMembershipRole(null);
        setNeedsCompanyOnboarding(true);
        setTenantLoading(false);
      },
      (e) => {
        console.error(e);
        setTenantError(e instanceof Error ? e.message : 'tenant_error');
        setCompanyId(null);
        setMembershipRole(null);
        setNeedsCompanyOnboarding(!authUser.isAnonymous && !isDemoAccountEmail(authUser.email));
        setTenantLoading(false);
      }
    );

    return () => unsub();
  }, [authUser, membershipQuery]);

  const submitCreateCompany = useCallback(
    async (payload: { name: string; taxId?: string; address?: string; phone?: string; email?: string }) => {
      const u = auth.currentUser;
      if (!u || u.isAnonymous) return;
      await createTenantWorkspace(db, u.uid, {
        ...payload,
        ownerDisplayName: u.displayName ?? undefined,
        ownerEmail: u.email ?? null,
      });
      await refreshClaims();
    },
    [refreshClaims]
  );

  const user = useMemo((): AppUser | null => {
    if (!authUser) return null;
    return {
      uid: authUser.uid,
      displayName: authUser.displayName || authUser.email || 'User',
      email: authUser.email || '',
    };
  }, [authUser]);

  useEffect(() => {
    if (!membershipRole || !authUser || !user || !companyId) return;
    void runDemoBootstrap({
      db,
      companyId,
      authUser,
      user,
      t,
      seedSamplePoolsAndRoutes: isDemoCompany,
    });
  }, [membershipRole, authUser, user, companyId, t, isDemoCompany]);

  const isAdmin = membershipRole === 'admin';
  const isSupervisor = membershipRole === 'supervisor';
  const isWorker = membershipRole === 'technician';
  const isClient = membershipRole === 'client';

  const role: 'admin' | 'worker' | 'client' | null = useMemo(() => {
    if (membershipRole === 'technician') return 'worker';
    if (membershipRole === 'admin' || membershipRole === 'supervisor') return 'admin';
    if (membershipRole === 'client') return 'client';
    return null;
  }, [membershipRole]);

  const loading = authLoading || (!!authUser && tenantLoading);

  const navRoleForUi: MembershipRole = useMemo(
    () => (isDemoCompany ? demoDashboardViewToNavRole(demoDashboardView) : membershipRole),
    [isDemoCompany, demoDashboardView, membershipRole]
  );

  const setRole = useCallback(() => {}, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authUser,
        membershipRole,
        companyId,
        tenantLoading,
        needsCompanyOnboarding,
        tenantError,
        refreshClaims,
        submitCreateCompany,
        loading,
        isAdmin,
        isSupervisor,
        isWorker,
        isClient,
        role,
        isDemoCompany,
        demoDashboardView,
        setDemoDashboardView,
        navRoleForUi,
        setRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
