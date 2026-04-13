import React from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogOut, Waves, LayoutDashboard, Map as MapIcon, Waves as PoolsIcon, Users, Languages } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export default function Layout() {
  const { user, role, setRole } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (!user) return <Outlet />;

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, roles: ['admin', 'worker', 'client'] },
    { to: '/pools', label: t('nav.pools'), icon: PoolsIcon, roles: ['admin'] },
    { to: '/routes', label: t('nav.routes'), icon: MapIcon, roles: ['admin'] },
    { to: '/team', label: t('nav.team'), icon: Users, roles: ['admin'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(role as string));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Waves className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-slate-900 tracking-tight hidden sm:block">Miami Pool Care</h1>
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
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{t(`common.${role}`)}</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        {filteredNav.length > 1 && (
          <nav className="border-t border-slate-100 px-4 flex justify-center gap-1 sm:gap-4 overflow-x-auto no-scrollbar">
            {filteredNav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  "flex items-center gap-2 px-3 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
                  isActive 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                )}
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
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {(['admin', 'worker', 'client'] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                navigate('/');
              }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                role === r ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 font-medium">
          &copy; 2026 Miami Pool Care. Modo Demo (Sin Autenticación)
        </p>
      </footer>
    </div>
  );
}
