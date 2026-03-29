'use client';

import { createContext, use, type ReactNode } from 'react';
import { usePlanningSession, type PlanningSession } from './usePlanningSession';

export type { Message } from './usePlanningSession';

const PlanningSessionContext = createContext<PlanningSession | null>(null);

export const usePlanningSessionContext = (): PlanningSession => {
  const ctx = use(PlanningSessionContext);
  if (!ctx) {
    throw new Error(
      'usePlanningSessionContext must be used within PlanningSessionProvider'
    );
  }
  return ctx;
};

export const PlanningSessionProvider = ({
  questId,
  children,
}: {
  questId: string;
  children: ReactNode;
}): ReactNode => {
  const session = usePlanningSession(questId);
  return (
    <PlanningSessionContext value={session}>{children}</PlanningSessionContext>
  );
};
