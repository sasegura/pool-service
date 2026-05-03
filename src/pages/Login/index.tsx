import React, { useEffect, useState } from 'react';
import {
  getRedirectResult,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { DEMO_ACCOUNT_EMAIL } from '../../config/demoAccount';
import { googleSignInErrorMessage, passwordResetErrorMessage } from '../../shared/lib/firebaseGoogleAuthErrors';
import { isEmbedded } from './components/isEmbedded';
import { LoginScreen } from './components/LoginScreen';

export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const forgotPasswordMode = searchParams.get('mode') === 'reset';
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { authUser, loading: authLoading } = useAuth();

  const setForgotPasswordModeInUrl = (on: boolean) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (on) next.set('mode', 'reset');
        else next.delete('mode');
        return next;
      },
      { replace: true },
    );
  };

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

  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error(t('login.resetEmailRequired'));
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      toast.success(t('login.resetEmailSent'));
      setForgotPasswordModeInUrl(false);
    } catch (error: unknown) {
      console.error(error);
      const code =
        error && typeof error === 'object' && 'code' in error ? String((error as { code: string }).code) : '';
      if (code === 'auth/user-not-found') {
        toast.success(t('login.resetEmailSent'));
        setForgotPasswordModeInUrl(false);
        return;
      }
      toast.error(passwordResetErrorMessage(code, t));
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
    <LoginScreen
      email={email}
      password={password}
      loading={loading}
      forgotPasswordMode={forgotPasswordMode}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleEmailLogin}
      onForgotPassword={() => setForgotPasswordModeInUrl(true)}
      onBackFromReset={() => setForgotPasswordModeInUrl(false)}
      onResetSubmit={handleSendPasswordReset}
      onGoogleLogin={handleGoogleLogin}
      onFillDemoEmail={fillDemoEmail}
    />
  );
}
