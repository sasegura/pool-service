/**
 * Typed accessors for environment variables (Vite + optional Vite `define` overrides).
 */

export function getGoogleMapsApiKey(): string | undefined {
  const k = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!k || k === 'undefined') return undefined;
  return k;
}

export function isMapsIntegrationEnabled(): boolean {
  const raw = import.meta.env.VITE_ENABLE_MAPS_INTEGRATION;
  if (!raw || raw === 'undefined') return false;
  const normalized = raw.trim().toLowerCase();
  return normalized !== 'false' && normalized !== '0' && normalized !== 'off' && normalized !== 'no';
}

/**
 * Gemini API key: from Vite `define` mapping `GEMINI_API_KEY` in .env (see vite.config.ts),
 * or `VITE_GEMINI_API_KEY` if set for client-side use.
 */
export function getGeminiApiKey(): string | undefined {
  const fromDefine =
    typeof process !== 'undefined' && process.env
      ? (process.env as Record<string, string | undefined>).GEMINI_API_KEY
      : undefined;
  if (fromDefine && fromDefine !== 'undefined') return fromDefine;
  const fromVite = import.meta.env.VITE_GEMINI_API_KEY;
  if (fromVite && fromVite !== 'undefined') return fromVite;
  return undefined;
}
