import React, { useEffect, useState } from 'react';
import {
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui/Common';
import { Waves, LogIn, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_ACCOUNT_EMAIL } from '../config/demoAccount';
import { googleSignInErrorMessage } from '../shared/lib/firebaseGoogleAuthErrors';

function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { authUser, loading: authLoading } = useAuth();

  if (!authLoading && authUser) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    void getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          toast.success(t('login.toastSuccess'));
          navigate('/', { replace: true });
        }
      })
      .catch((error: unknown) => {
        console.error(error);
        const code =
          error && typeof error === 'object' && 'code' in error ? String((error as { code: string }).code) : '';
        if (code) toast.error(googleSignInErrorMessage(code, t));
      });
  }, [navigate, t]);

  const fillDemoEmail = () => {
    setEmail(DEMO_ACCOUNT_EMAIL);
    setPassword('');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password) {
      toast.error(t('login.emailPasswordRequired'));
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmed, password);
      toast.success(t('login.toastSuccess'));
      navigate('/');
    } catch (error: unknown) {
      console.error(error);
      toast.error(t('login.toastError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (isEmbedded()) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      await signInWithPopup(auth, googleProvider);
      toast.success(t('login.toastSuccess'));
      navigate('/');
    } catch (error: unknown) {
      console.error(error);
      const code =
        error && typeof error === 'object' && 'code' in error ? String((error as { code: string }).code) : '';
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          console.error(redirectErr);
        }
      }
      toast.error(googleSignInErrorMessage(code, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 flex flex-col items-center text-center space-y-6">
        <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-200">
          <Waves className="text-white w-12 h-12" />
        </div>

        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{t('login.title')}</h1>
          <p className="text-slate-500 text-sm">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={(e) => void handleEmailLogin(e)} className="w-full space-y-3 text-left">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('login.email')}</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={DEMO_ACCOUNT_EMAIL}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('login.password')}</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" className="w-full flex items-center justify-center gap-2" isLoading={loading}>
            <Mail className="w-4 h-4 shrink-0" />
            {t('login.signInEmail')}
          </Button>
          <button
            type="button"
            onClick={fillDemoEmail}
            className="w-full text-xs font-bold text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline"
          >
            {t('login.useDemoEmail', { email: DEMO_ACCOUNT_EMAIL })}
          </button>
          <Link
            to="/register"
            className="block w-full text-center text-xs font-bold text-slate-600 hover:text-slate-800 underline-offset-2 hover:underline"
          >
            {t('login.switchToSignUp')}
          </Link>
        </form>

        <div className="w-full flex items-center gap-3">
          <span className="flex-1 h-px bg-slate-200" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">{t('login.or')}</span>
          <span className="flex-1 h-px bg-slate-200" />
        </div>

        <Button variant="secondary" size="xl" onClick={() => void handleGoogleLogin()} isLoading={loading} className="w-full flex gap-3">
          <LogIn className="w-6 h-6" />
          {t('login.signInGoogle')}
        </Button>

        <p className="text-xs text-slate-400 max-w-[320px] leading-relaxed">{t('login.demoSetupHint', { email: DEMO_ACCOUNT_EMAIL })}</p>
        <p className="text-[11px] text-slate-400 max-w-[280px]">{t('login.footer')}</p>
      </Card>
    </div>
  );
}
