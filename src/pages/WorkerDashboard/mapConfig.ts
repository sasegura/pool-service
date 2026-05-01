import { getGoogleMapsApiKey, isMapsIntegrationEnabled } from '../../config/env';

export const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
export const MAPS_INTEGRATION_ENABLED = isMapsIntegrationEnabled();
export const MIAMI_CENTER = { lat: 25.7617, lng: -80.1918 };
