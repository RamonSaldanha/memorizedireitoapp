import { useEffect, useState } from 'react';

/**
 * Tempo até `expiresAt` (ISO), atualizado a cada segundo: os milissegundos que
 * faltam e o texto `HH:MM:SS` que a oferta de boas-vindas mostra. Nulo sem data.
 */
export function useCountdown(expiresAt: string | null | undefined) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, [expiresAt]);

  if (!expiresAt) return { msLeft: 0, text: null };

  const msLeft = new Date(expiresAt).getTime() - now;
  const ms = Math.max(0, msLeft);
  const text = [Math.floor(ms / 3_600_000), Math.floor((ms % 3_600_000) / 60_000), Math.floor((ms % 60_000) / 1000)]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');

  return { msLeft, text };
}
