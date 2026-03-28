import type { JobHandler, JobContext } from './types';

const buildPrompt = (context: JobContext): string => {
  if (!context.instruction) {
    throw new Error('freeform job requires an instruction');
  }
  return context.instruction;
};

const onComplete = async (): Promise<void> => {
  // freeform はストリーミング表示のみ。結果処理なし。
};

export const freeformHandler: JobHandler = {
  buildPrompt,
  onComplete,
};
