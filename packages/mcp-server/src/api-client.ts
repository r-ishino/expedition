const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:33333';
const questId = process.env.QUEST_ID;

if (!questId) {
  console.error('QUEST_ID environment variable is required');
  process.exit(1);
}

export const buildUrl = (path: string): string =>
  `${apiBaseUrl}/api/quests/${questId}${path}`;

export const fetchJson = async (
  input: string,
  init?: globalThis.RequestInit
): Promise<unknown> => {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return JSON.parse(await res.text());
};
