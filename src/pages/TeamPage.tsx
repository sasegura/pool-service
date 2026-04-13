import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button, Card } from '../components/ui/Common';
import { cn } from '../lib/utils';
import { Plus, Users, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Worker {
  id: string;
  name: string;
  email: string;
  role: string;
}

import { useAuth } from '../contexts/AuthContext';

export default function TeamPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [allUsers, setAllUsers] = useState<Worker[]>([]);
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newWorker, setNewWorker] = useState({ name: '', email: '', role: 'worker' });

  useEffect(() => {
    if (authLoading || !user) return;

    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Worker)));
    });
    return () => unsubUsers();
  }, []);

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        await updateDoc(doc(db, 'users', editingUserId), newWorker);
        toast.success(t('team.toastUpdated'));
      } else {
        const existing = allUsers.find(u => u.email === newWorker.email);
        if (existing) {
          toast.error(t('team.toastEmailExists'));
          return;
        }

        await addDoc(collection(db, 'users'), {
          ...newWorker,
          createdAt: new Date().toISOString(),
        });
        toast.success(t('team.toastPreregistered'));
      }
      setNewWorker({ name: '', email: '', role: 'worker' });
      setShowWorkerForm(false);
      setEditingUserId(null);
    } catch (e) {
      toast.error(t('team.toastSaveError'));
    }
  };

  const handleEdit = (user: Worker) => {
    setNewWorker({ name: user.name, email: user.email, role: user.role });
    setEditingUserId(user.id);
    setShowWorkerForm(true);
  };

  const toggleRole = async (user: Worker) => {
    const roles: ('admin' | 'worker' | 'client')[] = ['admin', 'worker', 'client'];
    const currentIndex = roles.indexOf(user.role as any);
    const nextRole = roles[(currentIndex + 1) % roles.length];
    
    try {
      await updateDoc(doc(db, 'users', user.id), { role: nextRole });
      toast.success(t('team.roleUpdated', { role: t(`common.${nextRole}`) }));
    } catch (e) {
      toast.error(t('team.toastRoleError'));
    }
  };

  const deleteUser = async (id: string) => {
    if (confirm(t('team.confirmDelete'))) {
      await deleteDoc(doc(db, 'users', id));
      toast.info(t('team.toastDeleted'));
    }
  };

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
              <Button variant="outline" onClick={() => {
                setShowWorkerForm(false);
                setEditingUserId(null);
              }}>{t('common.cancel')}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-3">
        {allUsers.map(user => (
          <Card key={user.id} className="p-4 flex items-center justify-between hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-full",
                user.role === 'admin' ? "bg-purple-100 text-purple-600" : 
                user.role === 'client' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
              )}>
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{user.name}</h4>
                <p className="text-xs text-slate-500">{user.email}</p>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {user.id}</p>
                <span className={cn(
                  "inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                  user.role === 'admin' ? "bg-purple-50 text-purple-700" : 
                  user.role === 'client' ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                )}>
                  {t(`common.${user.role}`)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleEdit(user)}
                title={t('team.editUser')}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toggleRole(user)}
                title={t('team.toggleRole')}
              >
                <Users className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => deleteUser(user.id)}
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
