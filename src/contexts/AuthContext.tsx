import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
  collection,
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
import { bootstrapAnonymousSandbox, createTenantWorkspace } from '../features/tenant/services/tenantClientSetup';
import type { CompanyMembershipRole } from '../features/tenant/types';

export type MembershipRole = CompanyMembershipRole | null;

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
  const anonBootstrapLock = useRef(false);

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
      setNeedsCompanyOnboarding(!u.isAnonymous);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setTenantError(null);
      if (user) {
        setAuthUser(user);
        setAuthLoading(false);
      } else {
        setAuthUser(null);
        setAuthLoading(false);
        try {
          await signInAnonymously(auth);
        } catch (error: unknown) {
          if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/admin-restricted-operation') {
            console.warn(
              'Firebase Anonymous Auth is disabled. Enable Anonymous in Firebase Console → Authentication.'
            );
          } else {
            console.error('Error signing in anonymously:', error);
          }
        }
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

        if (authUser.isAnonymous) {
          if (anonBootstrapLock.current) return;
          anonBootstrapLock.current = true;
          setTenantLoading(true);
          void (async () => {
            try {
              await bootstrapAnonymousSandbox(db, authUser.uid);
            } catch (e) {
              console.error(e);
              setTenantError(e instanceof Error ? e.message : 'tenant_error');
              setTenantLoading(false);
            } finally {
              anonBootstrapLock.current = false;
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
        setNeedsCompanyOnboarding(!authUser.isAnonymous);
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
    void runDemoBootstrap({ db, companyId, authUser, membershipRole, user, t });
  }, [membershipRole, authUser, user, companyId, t]);

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
        setRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
