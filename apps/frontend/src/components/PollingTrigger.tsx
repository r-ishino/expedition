'use client';

import { useEffect, useRef } from 'react';

type PollingTriggerProps<T> = {
  enabled: boolean;
  intervalMs?: number;
  fetcher: () => Promise<T>;
  shouldStop: (data: T) => boolean;
  onComplete: (data: T) => void;
};

export const PollingTrigger = <T,>({
  enabled,
  intervalMs = 2000,
  fetcher,
  shouldStop,
  onComplete,
}: PollingTriggerProps<T>): null => {
  const fetcherRef = useRef(fetcher);
  const shouldStopRef = useRef(shouldStop);
  const onCompleteRef = useRef(onComplete);

  fetcherRef.current = fetcher;
  shouldStopRef.current = shouldStop;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let timerId: ReturnType<typeof setInterval> | null = null;

    const poll = async (): Promise<void> => {
      if (stopped) return;
      try {
        const data = await fetcherRef.current();
        if (stopped) return;
        if (shouldStopRef.current(data)) {
          stopped = true;
          if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
          }
          onCompleteRef.current(data);
        }
      } catch {
        // fetch 失敗時は次回ポーリングでリトライ
      }
    };

    poll().catch(() => {});
    timerId = setInterval(() => {
      poll().catch(() => {});
    }, intervalMs);

    return (): void => {
      stopped = true;
      if (timerId !== null) {
        clearInterval(timerId);
      }
    };
  }, [enabled, intervalMs]);

  return null;
};
