import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogOut, Waves, User as UserIcon } from 'lucide-react';

export default function Layout() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (!user) return <Outlet />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Waves className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-slate-900 tracking-tight">Miami Pool Care</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-slate-900">{user.displayName}</span>
            <span className="text-xs text-slate-500 capitalize">{role}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:max-w-4xl">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 p-4 text-center text-xs text-slate-400">
        &copy; 2026 Miami Pool Care. Todos los derechos reservados.
      </footer>
    </div>
  );
}
