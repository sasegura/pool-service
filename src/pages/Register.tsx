import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card } from '../components/ui/Common';
import { Waves, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useAppServices } from '../app/providers/AppServicesContext';
import { acceptInvite } from '../features/tenant/application/acceptInvite';

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { authUser, loading: authLoading, refreshClaims } = useAuth();
  const { inviteAcceptanceRepository } = useAppServices();
  const companyIdFromUrl = (searchParams.get('companyId') || '').trim();
  const inviteIdFromUrl = (searchParams.get('inviteId') || '').trim();
  const [companyId, setCompanyId] = useState(companyIdFromUrl);

  if (!authLoading && authUser) {
    return <Navigate to="/" replace />;
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password) {
      toast.error(t('login.emailPasswordRequired'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('login.passwordsDoNotMatch'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('login.passwordMinLength'));
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, trimmed, password);
      const normalizedCompanyId = companyId.trim();
      if (normalizedCompanyId) {
        if (!inviteIdFromUrl) {
          throw new Error('missing_invite_id');
        }
        await acceptInvite(inviteAcceptanceRepository, {
          companyId: normalizedCompanyId,
          memberId: inviteIdFromUrl,
          uid: cred.user.uid,
        });
        await refreshClaims();
      }
      toast.success(t('login.registerSuccess'));
      navigate('/');
    } catch (error: unknown) {
      console.error(error);
      const code =
        error && typeof error === 'object' && 'code' in error ? String((error as { code: string }).code) : '';
      if (code === 'auth/email-already-in-use') {
        toast.error(t('login.registerEmailInUse'));
      } else if (code === 'auth/invalid-email') {
        toast.error(t('login.registerInvalidEmail'));
      } else if (code === 'auth/weak-password') {
        toast.error(t('login.passwordMinLength'));
      } else if (error instanceof Error && error.message === 'missing_invite_id') {
        toast.error(t('login.registerMissingInviteId'));
      } else if (error instanceof Error && error.message === 'invite_not_found') {
        toast.error(t('login.registerInviteNotFound'));
      } else if (error instanceof Error && error.message === 'invite_already_used') {
        toast.error(t('login.registerInviteAlreadyUsed'));
      } else {
        toast.error(t('login.registerError'));
      }
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
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{t('register.title')}</h1>
          <p className="text-slate-500 text-sm">{t('register.subtitle')}</p>
        </div>

        <form onSubmit={(e) => void handleEmailSignup(e)} className="w-full space-y-3 text-left">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('login.email')}</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('login.password')}</label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-500">{t('login.passwordRules')}</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('login.confirmPassword')}</label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('login.companyId')}</label>
            <input
              type="text"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder={t('login.companyIdPlaceholder')}
            />
            <p className="mt-1 text-[11px] text-slate-500">{t('login.companyIdHint')}</p>
            {!companyId.trim() ? (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                {t('register.noCompanyIdHint')}
              </p>
            ) : null}
          </div>
          <Button type="submit" variant="primary" className="w-full flex items-center justify-center gap-2" isLoading={loading}>
            <Mail className="w-4 h-4 shrink-0" />
            {t('register.submit')}
          </Button>
          <Link
            to="/login"
            className="block w-full text-center text-xs font-bold text-slate-600 hover:text-slate-800 underline-offset-2 hover:underline"
          >
            {t('register.backToLogin')}
          </Link>
        </form>
      </Card>
    </div>
  );
}
