import type { Territory } from '@expedition/shared';
import type { FetcherReturnType } from '~/hooks/useFetcher';
import { useFetcher } from '~/hooks/useFetcher';

type ReturnType = {
  useIndex: () => FetcherReturnType<Territory[]>;
};

export const useTerritories = (): ReturnType => {
  const useIndex = (): FetcherReturnType<Territory[]> =>
    useFetcher<Territory[]>('/api/territories');
  return { useIndex };
};
