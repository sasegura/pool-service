import React, { useState } from 'react';
import { Button, Card } from '../components/ui/Common';
import { cn } from '../lib/utils';
import { Plus, Users, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTeamUsers } from '../features/team/hooks/useTeamUsers';
import type { TeamUser } from '../features/team/types';

export default function TeamPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading, companyId } = useAuth();
  const { allUsers, repository } = useTeamUsers(!authLoading && !!user, companyId ?? undefined);
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newWorker, setNewWorker] = useState({ name: '', email: '', role: 'worker' });

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repository || !companyId) return;
    try {
      if (editingUserId) {
        const email = newWorker.email.trim().toLowerCase();
        await repository.updateUser(editingUserId, {
          name: newWorker.name.trim(),
          email,
          role: newWorker.role,
        });
        toast.success(t('team.toastUpdated'));
      } else {
        const email = newWorker.email.trim().toLowerCase();
        const existing = allUsers.find((u) => u.email?.trim().toLowerCase() === email);
        if (existing) {
          toast.error(t('team.toastEmailExists'));
          return;
        }

        const memberDocId = await repository.createPreregisteredUser({
          name: newWorker.name.trim(),
          email,
          role: newWorker.role,
        });
        const link = `${window.location.origin}/accept-invite?companyId=${encodeURIComponent(companyId)}&inviteId=${encodeURIComponent(memberDocId)}`;
        toast.success(t('team.toastPreregistered'), { description: link });
      }
      setNewWorker({ name: '', email: '', role: 'worker' });
      setShowWorkerForm(false);
      setEditingUserId(null);
    } catch {
      toast.error(t('team.toastSaveError'));
    }
  };

  const handleEdit = (member: TeamUser) => {
    setNewWorker({ name: member.name, email: member.email, role: member.role });
    setEditingUserId(member.id);
    setShowWorkerForm(true);
  };

  const toggleRole = async (member: TeamUser) => {
    if (!repository) return;
    const roles: ('admin' | 'worker' | 'client')[] = ['admin', 'worker', 'client'];
    const currentIndex = roles.indexOf(member.role as 'admin' | 'worker' | 'client');
    const nextRole = roles[(currentIndex + 1) % roles.length];

    try {
      await repository.setUserRole(member.id, nextRole);
      toast.success(t('team.roleUpdated', { role: t(`common.${nextRole}`) }));
    } catch {
      toast.error(t('team.toastRoleError'));
    }
  };

  const deleteUser = async (id: string) => {
    if (!repository) return;
    if (confirm(t('team.confirmDelete'))) {
      await repository.deleteUser(id);
      toast.info(t('team.toastDeleted'));
    }
  };

  if (!repository) {
    return <div className="p-8 text-center text-slate-600">{t('common.loadingGeneric')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-900">{t('team.title')}</h2>
        <Button size="sm" onClick={() => {
          setShowWorkerForm(true);
          setEditingUserId(null);
          setNewWorker({ name: '', email: '', role: 'worker' });
        }} className="gap-1">
          <Plus className="w-4 h-4" /> {t('team.addUser')}
        </Button>
      </div>

      {showWorkerForm && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <form onSubmit={handleAddWorker} className="space-y-4">
            <h3 className="font-bold text-blue-900">{editingUserId ? t('team.titleEdit') : t('team.titleNew')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.name')}</label>
                <input 
                  type="text" 
                  required
                  className="w-full rounded-lg border-slate-200 p-2 text-sm"
                  value={newWorker.name}
                  onChange={e => setNewWorker({...newWorker, name: e.target.value})}
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
                  onChange={e => setNewWorker({...newWorker, email: e.target.value})}
                  placeholder={t('team.placeholderEmail')}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.role')}</label>
                <select 
                  className="w-full rounded-lg border-slate-200 p-2 text-sm"
                  value={newWorker.role}
                  onChange={e => setNewWorker({...newWorker, role: e.target.value})}
                >
                  <option value="worker">{t('team.technician')}</option>
                  <option value="admin">{t('team.administrator')}</option>
                  <option value="client">{t('team.customer')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">{editingUserId ? t('team.submitEditUser') : t('team.submitNewUser')}</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowWorkerForm(false);
                  setEditingUserId(null);
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-3">
        {allUsers.map(member => (
          <Card key={member.id} className="p-4 flex items-center justify-between hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-full",
                member.role === 'admin' ? "bg-purple-100 text-purple-600" : 
                member.role === 'client' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
              )}>
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{member.name}</h4>
                <p className="text-xs text-slate-500">{member.email}</p>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {member.id}</p>
                <span className={cn(
                  "inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                  member.role === 'admin' ? "bg-purple-50 text-purple-700" : 
                  member.role === 'client' ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                )}>
                  {t(`common.${member.role}`)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleEdit(member)}
                title={t('team.editUser')}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toggleRole(member)}
                title={t('team.toggleRole')}
              >
                <Users className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => deleteUser(member.id)}
                className="text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
