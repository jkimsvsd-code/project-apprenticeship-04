import { useEffect, useState } from 'react';

// Updates display labels only. Never starts a source request or changes a record date.
export function useClock(initialNow: number | null) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return [now, setNow] as const;
}
