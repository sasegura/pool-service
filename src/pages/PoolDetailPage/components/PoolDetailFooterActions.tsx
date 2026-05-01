import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/Common';
import { useTranslation } from 'react-i18next';

type PoolDetailFooterActionsProps = {
  poolId: string;
  onBackToList: () => void;
};

export function PoolDetailFooterActions({ poolId, onBackToList }: PoolDetailFooterActionsProps) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2">
      <Link to={`/pools/${poolId}/visit`} className="flex-1">
        <Button variant="outline" className="w-full min-h-[48px] font-black gap-2">
          <ExternalLink className="w-4 h-4" />
          {t('poolDetail.openVisit')}
        </Button>
      </Link>
      <Button className="flex-1 min-h-[48px] font-black" onClick={onBackToList}>
        {t('poolDetail.backList')}
      </Button>
    </div>
  );
}
