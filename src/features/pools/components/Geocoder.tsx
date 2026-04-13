import React, { useCallback, useEffect, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AlertCircle, Search } from 'lucide-react';
import { Button } from '../../../components/ui/Common';

export function Geocoder({
  address,
  onResult,
  setApiError,
}: {
  address: string;
  onResult: (coords: { lat: number; lng: number }) => void;
  setApiError: (error: string | null) => void;
}) {
  const { t } = useTranslation();
  const geocodingLib = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocodingLib) return;
    setGeocoder(new geocodingLib.Geocoder());
  }, [geocodingLib]);

  const handleGeocode = useCallback(async () => {
    if (!geocoder || !address) return;
    setLoading(true);
    try {
      const response = await geocoder.geocode({ address });
      if (response.results && response.results[0]) {
        const location = response.results[0].geometry.location;
        onResult({ lat: location.lat(), lng: location.lng() });
        toast.success(t('pools.geocodeSuccess'));
      } else {
        toast.error(t('pools.geocodeNotFound'));
      }
    } catch (e: unknown) {
      console.error('Geocoding error:', e);
      const err = e as { message?: string; code?: string };
      const isApiError = err.message?.includes('not activated') || err.code === 'REQUEST_DENIED';

      if (isApiError) {
        setApiError(t('pools.geocodeApiError'));
        toast.error(t('pools.geocodeApiToastTitle'), {
          description: t('pools.geocodeApiToastDescription'),
          duration: 8000,
        });
      } else {
        toast.error(t('pools.geocodeGenericError'));
      }
    } finally {
      setLoading(false);
    }
  }, [geocoder, address, onResult, setApiError, t]);

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleGeocode} disabled={loading || !address} className="gap-2">
        {loading ? t('pools.validating') : <><Search className="w-4 h-4" /> {t('pools.validateAddress')}</>}
      </Button>
      {!geocodingLib && (
        <p className="text-[10px] text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {t('pools.loadingMaps')}
        </p>
      )}
    </div>
  );
}
