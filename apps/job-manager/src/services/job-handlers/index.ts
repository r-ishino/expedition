import { decomposeHandler } from './decompose';
import { freeformHandler } from './freeform';
import type { JobHandler } from './types';

const handlers: Record<string, JobHandler> = {
  decompose: decomposeHandler,
  freeform: freeformHandler,
};

export const getHandler = (jobType: string): JobHandler => {
  const handler = handlers[jobType];
  if (!handler) throw new Error(`Unknown job type: ${jobType}`);
  return handler;
};

export type { JobContext, JobHandler } from './types';
