/**
 * Typed accessors for environment variables (Vite + optional Vite `define` overrides).
 */

export function getGoogleMapsApiKey(): string | undefined {
  const k = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!k || k === 'undefined') return undefined;
  return k;
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
