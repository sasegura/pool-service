import React, { useState } from 'react';
import { Button } from '../../components/ui/Common';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTeamUsers } from '../../features/team/hooks/useTeamUsers';
import type { TeamUser } from '../../features/team/types';
import { TeamWorkerForm } from './components/TeamWorkerForm';
import { TeamMemberCard } from './components/TeamMemberCard';

export default function TeamPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading, companyId } = useAuth();
  const { allUsers, commands } = useTeamUsers(!authLoading && !!user, companyId ?? undefined);
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newWorker, setNewWorker] = useState({ name: '', email: '', role: 'worker' });

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commands || !companyId) return;
    try {
      if (editingUserId) {
        const email = newWorker.email.trim().toLowerCase();
        await commands.updateUser(editingUserId, {
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

        const created = await commands.createPreregisteredUser({
          name: newWorker.name.trim(),
          email,
          role: newWorker.role,
        });
        if (newWorker.role === 'worker') {
          toast.success(t('team.toastTechnicianRegistered'));
        } else {
          const link = `${window.location.origin}/accept-invite?companyId=${encodeURIComponent(companyId)}&inviteId=${encodeURIComponent(created.id)}`;
          toast.success(t('team.toastPreregistered'), { description: link });
        }
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
    if (!commands) return;
    const roles: ('admin' | 'worker' | 'client')[] = ['admin', 'worker', 'client'];
    const currentIndex = roles.indexOf(member.role as 'admin' | 'worker' | 'client');
    const nextRole = roles[(currentIndex + 1) % roles.length];

    try {
      await commands.setUserRole(member.id, nextRole);
      toast.success(t('team.roleUpdated', { role: t(`common.${nextRole}`) }));
    } catch {
      toast.error(t('team.toastRoleError'));
    }
  };

  const deleteUser = async (id: string) => {
    if (!commands) return;
    if (confirm(t('team.confirmDelete'))) {
      await commands.deleteUser(id);
      toast.info(t('team.toastDeleted'));
    }
  };

  if (!commands) {
    return <div className="p-8 text-center text-slate-600">{t('common.loadingGeneric')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-900">{t('team.title')}</h2>
        <Button
          size="sm"
          onClick={() => {
            setShowWorkerForm(true);
            setEditingUserId(null);
            setNewWorker({ name: '', email: '', role: 'worker' });
          }}
          className="gap-1"
        >
          <Plus className="w-4 h-4" /> {t('team.addUser')}
        </Button>
      </div>

      {showWorkerForm && (
        <TeamWorkerForm
          editingUserId={editingUserId}
          newWorker={newWorker}
          setNewWorker={setNewWorker}
          onSubmit={handleAddWorker}
          onCancel={() => {
            setShowWorkerForm(false);
            setEditingUserId(null);
          }}
        />
      )}

      <div className="grid gap-3">
        {allUsers.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            onEdit={handleEdit}
            onToggleRole={toggleRole}
            onDelete={deleteUser}
          />
        ))}
      </div>
    </div>
  );
}
