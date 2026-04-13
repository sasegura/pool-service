import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button, Card } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';

export default function CompanyOnboarding() {
  const { t } = useTranslation();
  const { submitCreateCompany } = useAuth();
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t('tenant.companyNameRequired'));
      return;
    }
    setBusy(true);
    try {
      await submitCreateCompany({
        name: trimmed,
        taxId: taxId.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      toast.success(t('tenant.companyCreated'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('tenant.companyCreateError');
      toast.error(t('tenant.companyCreateError'), { description: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">{t('tenant.onboardingTitle')}</h1>
        <p className="text-slate-500 text-sm">{t('tenant.onboardingSubtitle')}</p>
      </div>
      <Card className="p-6 space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('tenant.fieldCompanyName')}</label>
            <input
              className="w-full rounded-lg border border-slate-200 p-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('tenant.fieldTaxId')}</label>
            <input className="w-full rounded-lg border border-slate-200 p-2 text-sm" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.address')}</label>
            <input className="w-full rounded-lg border border-slate-200 p-2 text-sm" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('tenant.fieldPhone')}</label>
              <input className="w-full rounded-lg border border-slate-200 p-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.email')}</label>
              <input type="email" className="w-full rounded-lg border border-slate-200 p-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full" isLoading={busy}>
            {t('tenant.createCompany')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
