import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useAppServices } from '../../app/providers/AppServicesContext';
import { acceptInvite } from '../../features/tenant/application/acceptInvite';
import { RegisterScreen } from './components/RegisterScreen';

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
    <RegisterScreen
      email={email}
      password={password}
      confirmPassword={confirmPassword}
      companyId={companyId}
      loading={loading}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onCompanyIdChange={setCompanyId}
      onSubmit={handleEmailSignup}
    />
  );
}
