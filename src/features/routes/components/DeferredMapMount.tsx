import React, { useEffect, useState } from 'react';

/**
 * Montar <Map> tras varios frames y cuando cambia `deferKey` evita que la API use
 * IntersectionObserver sobre un nodo que aún no es un Element válido.
 */
export function DeferredMapMount({
  children,
  deferKey,
}: {
  children: React.ReactNode;
  /** Al cambiar (p. ej. ruta seleccionada o modo mapa), se vuelve a aplazar el montaje. */
  deferKey?: string | number | null;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    let cancelled = false;
    let r1 = 0;
    let r2 = 0;
    let r3 = 0;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        r3 = requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      cancelAnimationFrame(r3);
    };
  }, [deferKey]);
  if (!ready) {
    return <div className="h-full min-h-[240px] w-full bg-slate-100" aria-hidden />;
  }
  return <>{children}</>;
}
