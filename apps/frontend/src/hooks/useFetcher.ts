import useSWR from 'swr';
import type { SWRConfiguration, SWRResponse } from 'swr';
import { apiClient } from '~/lib/apiClient';

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return res.json();
};

export type FetcherReturnType<T> = {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: SWRResponse<T, Error>['mutate'];
};

export const useFetcher = <T>(
  path: string | null,
  options?: SWRConfiguration<T, Error>
): FetcherReturnType<T> => {
  const url = path !== null ? apiClient.url(path) : null;
  const { data, error, isLoading, mutate } = useSWR<T, Error>(
    url,
    fetcher,
    options
  );
  return { data, error, isLoading, mutate };
};
