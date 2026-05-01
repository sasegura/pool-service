import React from 'react';
import { Button, Card } from '../../../components/ui/Common';
import { cn } from '../../../lib/utils';
import { Users, Trash2, Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TeamUser } from '../../../features/team/types';

type TeamMemberCardProps = {
  member: TeamUser;
  onEdit: (member: TeamUser) => void;
  onToggleRole: (member: TeamUser) => void;
  onDelete: (id: string) => void;
};

export function TeamMemberCard({ member, onEdit, onToggleRole, onDelete }: TeamMemberCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 flex items-center justify-between hover:border-blue-200 transition-colors">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'p-3 rounded-full',
            member.role === 'admin'
              ? 'bg-purple-100 text-purple-600'
              : member.role === 'client'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-blue-100 text-blue-600'
          )}
        >
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900">{member.name}</h4>
          <p className="text-xs text-slate-500">{member.email}</p>
          <p className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {member.id}</p>
          <span
            className={cn(
              'inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase',
              member.role === 'admin'
                ? 'bg-purple-50 text-purple-700'
                : member.role === 'client'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-blue-50 text-blue-700'
            )}
          >
            {t(`common.${member.role}`)}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(member)} title={t('team.editUser')}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onToggleRole(member)} title={t('team.toggleRole')}>
          <Users className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(member.id)}
          className="text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
