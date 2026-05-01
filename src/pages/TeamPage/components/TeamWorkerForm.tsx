import React from 'react';
import { Button, Card } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';

type NewWorker = { name: string; email: string; role: string };

type TeamWorkerFormProps = {
  editingUserId: string | null;
  newWorker: NewWorker;
  setNewWorker: React.Dispatch<React.SetStateAction<NewWorker>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export function TeamWorkerForm({
  editingUserId,
  newWorker,
  setNewWorker,
  onSubmit,
  onCancel,
}: TeamWorkerFormProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 border-blue-200 bg-blue-50">
      <form onSubmit={onSubmit} className="space-y-4">
        <h3 className="font-bold text-blue-900">{editingUserId ? t('team.titleEdit') : t('team.titleNew')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.name')}</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border-slate-200 p-2 text-sm"
              value={newWorker.name}
              onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
              placeholder={t('team.fullName')}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('team.emailGoogle')}</label>
            <input
              type="email"
              required
              className="w-full rounded-lg border-slate-200 p-2 text-sm"
              value={newWorker.email}
              onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
              placeholder={t('team.placeholderEmail')}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.role')}</label>
            <select
              className="w-full rounded-lg border-slate-200 p-2 text-sm"
              value={newWorker.role}
              onChange={(e) => setNewWorker({ ...newWorker, role: e.target.value })}
            >
              <option value="worker">{t('team.technician')}</option>
              <option value="admin">{t('team.administrator')}</option>
              <option value="client">{t('team.customer')}</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {editingUserId ? t('team.submitEditUser') : t('team.submitNewUser')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
