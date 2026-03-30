import { useEffect, useRef, useState } from 'react';

const IDLE_THRESHOLD_MS = 3000;
const TICK_INTERVAL_MS = 1000;

export const useIdleTimer = (
  streaming: boolean,
  lastEventTime: number
): number => {
  const [idleSeconds, setIdleSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!streaming || lastEventTime === 0) {
      setIdleSeconds(0);
      return;
    }

    const tick = (): void => {
      const elapsed = Date.now() - lastEventTime;
      if (elapsed >= IDLE_THRESHOLD_MS) {
        setIdleSeconds(Math.floor(elapsed / 1000));
      } else {
        setIdleSeconds(0);
      }
    };

    tick();
    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);

    return (): void => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [streaming, lastEventTime]);

  return idleSeconds;
};
