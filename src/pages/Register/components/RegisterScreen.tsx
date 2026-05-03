import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../../../components/ui/Common';
import { Waves, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type RegisterScreenProps = {
  email: string;
  password: string;
  confirmPassword: string;
  companyId: string;
  loading: boolean;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onCompanyIdChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function RegisterScreen({
  email,
  password,
  confirmPassword,
  companyId,
  loading,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onCompanyIdChange,
  onSubmit,
}: RegisterScreenProps) {
  const { t } = useTranslation();

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

        <form onSubmit={(e) => void onSubmit(e)} className="w-full space-y-3 text-left">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('login.email')}</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('login.password')}</label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
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
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('login.companyId')}</label>
            <input
              type="text"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={companyId}
              onChange={(e) => onCompanyIdChange(e.target.value)}
              placeholder={t('login.companyIdPlaceholder')}
            />
            <p className="mt-1 text-[11px] text-slate-500">{t('login.companyIdHint')}</p>
            {!companyId.trim() ? (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                {t('register.noCompanyIdHint')}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            variant="primary"
            className="w-full flex items-center justify-center gap-2"
            isLoading={loading}
          >
            <Mail className="w-4 h-4 shrink-0" />
            {t('register.submit')}
          </Button>
          <Link
            to="/login"
            className="block w-full text-center text-xs font-bold text-slate-600 hover:text-slate-800 underline-offset-2 hover:underline"
          >
            {t('register.backToLogin')}
          </Link>
          <Link
            to="/login?mode=reset"
            className="block w-full text-center text-xs font-bold text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline"
          >
            {t('login.forgotPassword')}
          </Link>
        </form>
      </Card>
    </div>
  );
}
