import type { Quest, Waypoint } from '@expedition/shared';
import type { FetcherReturnType } from '~/hooks/useFetcher';
import { useFetcher } from '~/hooks/useFetcher';

type QuestWithWaypoints = Quest & { waypoints: Waypoint[] };

type ReturnType = {
  useIndex: () => FetcherReturnType<Quest[]>;
  useShow: (id: string) => FetcherReturnType<QuestWithWaypoints>;
};

export const useQuests = (): ReturnType => {
  const useIndex = (): FetcherReturnType<Quest[]> =>
    useFetcher<Quest[]>('/api/quests');

  const useShow = (id: string): FetcherReturnType<QuestWithWaypoints> =>
    useFetcher<QuestWithWaypoints>(`/api/quests/${id}`, {
      refreshInterval: 3000,
    });

  return { useIndex, useShow };
};
