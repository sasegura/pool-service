import React from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  LogOut,
  Waves,
  LayoutDashboard,
  Map as MapIcon,
  Waves as PoolsIcon,
  Users,
  Languages,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

function roleLabelKey(membershipRole: string | null): string {
  if (membershipRole === 'technician') return 'worker';
  if (membershipRole === 'supervisor') return 'supervisor';
  if (membershipRole === 'admin') return 'admin';
  if (membershipRole === 'client') return 'client';
  return 'role';
}

export default function Layout() {
  const { user, membershipRole } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (!user) return <Outlet />;

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, roles: ['admin', 'supervisor', 'technician', 'client'] },
    { to: '/pools', label: t('nav.pools'), icon: PoolsIcon, roles: ['admin', 'supervisor'] },
    { to: '/routes', label: t('nav.routes'), icon: MapIcon, roles: ['admin', 'supervisor'] },
    { to: '/team', label: t('nav.team'), icon: Users, roles: ['admin', 'supervisor'] },
    { to: '/incidents', label: t('nav.incidents'), icon: AlertCircle, roles: ['admin', 'supervisor'] },
  ];

  const filteredNav = navItems.filter((item) => membershipRole && item.roles.includes(membershipRole));

  const showDemoRoleSwitcher = import.meta.env.VITE_SHOW_DEMO_ROLE_SWITCHER === 'true';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Waves className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-slate-900 tracking-tight hidden sm:block">{t('layout.brandName')}</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold text-slate-600"
            >
              <Languages className="w-4 h-4" />
              <span className="uppercase">{i18n.language}</span>
            </button>
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900">{user.displayName}</span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                {membershipRole ? t(`common.${roleLabelKey(membershipRole)}`) : '—'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
              title={t('nav.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {filteredNav.length > 1 && (
          <nav className="border-t border-slate-100 px-4 flex justify-center gap-1 sm:gap-4 overflow-x-auto no-scrollbar">
            {filteredNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all',
                    isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 p-6 flex flex-col items-center gap-4">
        {showDemoRoleSwitcher ? (
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['admin', 'worker', 'client'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => navigate('/')}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                  'text-slate-400 hover:text-slate-600'
                )}
              >
                {t(`common.${r}`)}
              </button>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-slate-400 font-medium">{t('layout.footerDemo')}</p>
      </footer>
    </div>
  );
}
