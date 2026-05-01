import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Common';
import { Waves, MapPin, Trash2, Edit2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PoolStatusBadge } from '../../../components/PoolStatusBadge';
import type { PoolRecord } from '../../../types/pool';
import type { ClientDirectoryEntry } from '../../../features/pools/ports';
import {
  isPoolClientInDirectory,
  resolveClientDirectoryDocId,
  resolveClientName,
} from '../../../features/pools/domain/poolClients';

type PoolDirectoryRowProps = {
  pool: PoolRecord;
  clients: ClientDirectoryEntry[];
  onOwnerChange: (poolId: string, nextClientId: string) => void;
  onEdit: (pool: PoolRecord) => void;
  onDelete: (id: string) => void;
};

export function PoolDirectoryRow({ pool, clients, onOwnerChange, onEdit, onDelete }: PoolDirectoryRowProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:border-blue-200 transition-colors gap-3">
      <Link to={`/pools/${pool.id}`} className="flex items-center gap-3 min-w-0 flex-1">
        <div className="bg-blue-50 p-2 rounded-lg text-blue-600 shrink-0">
          <Waves className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-slate-900">{pool.name}</h4>
            <PoolStatusBadge status={pool.healthStatus} size="sm" />
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" /> {pool.address}
          </p>
          {pool.clientId && (
            <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase truncate">
              {t('pools.propLabel')} {resolveClientName(clients, pool.clientId) || t('pools.loadingName')}
            </p>
          )}
          {pool.volumeM3 != null && pool.volumeM3 > 0 && (
            <p className="text-[10px] text-slate-500 font-bold mt-1">{pool.volumeM3.toFixed(1)} m³</p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
      </Link>
      <div className="flex flex-col gap-2 shrink-0 w-full sm:w-48">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{t('pools.ownerClient')}</label>
        <select
          className="w-full rounded-lg border-slate-200 p-2 text-sm bg-white"
          value={resolveClientDirectoryDocId(clients, pool.clientId)}
          onChange={(e) => {
            const v = e.target.value;
            void onOwnerChange(pool.id, v);
          }}
        >
          <option value="">{t('pools.noOwner')}</option>
          {pool.clientId && !isPoolClientInDirectory(clients, pool.clientId) ? (
            <option value={pool.clientId}>
              {resolveClientName(clients, pool.clientId) || `${pool.clientId.slice(0, 8)}…`}
            </option>
          ) : null}
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(pool)}
          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(pool.id)}
          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
}
