const JOB_MANAGER_URL = 'http://localhost:33333';

const parseJson = <T>(text: string): T =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  JSON.parse(text);

export const apiClient = {
  baseUrl: JOB_MANAGER_URL,

  url: (path: string): string => `${JOB_MANAGER_URL}${path}`,

  fetch: async <T>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(`${JOB_MANAGER_URL}${path}`, init);
    const text = await res.text();
    if (!res.ok) {
      const body = parseJson<{ error?: string }>(text);
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    return parseJson<T>(text);
  },

  post: async <T>(path: string, body: unknown): Promise<T> =>
    apiClient.fetch<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  put: async <T = void>(path: string, body: unknown): Promise<T> =>
    apiClient.fetch<T>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  delete: async (path: string): Promise<void> => {
    const res = await fetch(`${JOB_MANAGER_URL}${path}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },

  streamUrl: (jobId: string): string =>
    `${JOB_MANAGER_URL}/api/jobs/${jobId}/stream`,

  parseJson,
};
