import type { Quest } from '@expedition/shared';

export type JobContext = {
  quest: Quest;
  instruction?: string;
};

export type JobHandler = {
  buildPrompt: (context: JobContext) => string;
  onComplete: (context: JobContext, stdout: string) => Promise<void>;
};
