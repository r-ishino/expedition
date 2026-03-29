import { useEffect, useRef, useState } from 'react';
import type { Quest, QuestPlanningMessage, Waypoint } from '@expedition/shared';
import { useQuests } from '~/hooks/api/useQuests';
import { useStreamBlocks, type StreamBlock } from '~/hooks/useStreamBlocks';
import { apiClient } from '~/lib/apiClient';
import type { WaypointUpdateData } from './WaypointEditModal';

type QuestWithWaypoints = Quest & { waypoints: Waypoint[] };

export type Message = {
  role: 'user' | 'assistant';
  blocks: StreamBlock[];
  text?: string;
};

export type PlanningSession = {
  quest: QuestWithWaypoints | undefined;
  messages: Message[];
  blocks: StreamBlock[];
  decomposing: boolean;
  streaming: boolean;
  instruction: string;
  setInstruction: (value: string) => void;
  startDecompose: () => Promise<void>;
  cancelJob: () => Promise<void>;
  sendInstruction: () => Promise<void>;
  updateWaypoint: (id: string, data: WaypointUpdateData) => void;
  mutateQuest: () => void;
};

const DECOMPOSE_INSTRUCTION =
  'このQuestの内容をもとに、中継地点のたたき台を作成してください';

const POLLING_INTERVAL_MS = 2000;

export const usePlanningSession = (questId: string): PlanningSession => {
  const { data: quest, mutate } = useQuests().useShow(questId);
  const [manualDecomposing, setManualDecomposing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [instruction, setInstruction] = useState('');

  const decomposing = manualDecomposing || quest?.status === 'decomposing';

  // --- ストリーミング ---
  const {
    blocks,
    streaming,
    startStream,
    cancel: rawCancel,
  } = useStreamBlocks({
    questId,
    onDone: (_event, finalBlocks) => {
      if (finalBlocks.length > 0) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', blocks: finalBlocks },
        ]);
      }
      setTimeout(() => {
        mutate().catch(() => {});
      }, 1000);
    },
  });

  // --- ポーリング（decomposing 中に waypoints を監視） ---
  const pollingRef = useRef(false);

  useEffect(() => {
    if (!decomposing) {
      pollingRef.current = false;
      return;
    }

    pollingRef.current = true;
    let timerId: ReturnType<typeof setInterval> | null = null;

    const poll = async (): Promise<void> => {
      if (!pollingRef.current) return;
      try {
        const data = await apiClient.fetch<QuestWithWaypoints>(
          `/api/quests/${questId}`
        );
        if (!pollingRef.current) return;
        if (data.waypoints.length > 0) {
          pollingRef.current = false;
          if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
          }
          mutate(data, false).catch(() => {});
          setManualDecomposing(false);
        }
      } catch {
        // fetch 失敗時は次回ポーリングでリトライ
      }
    };

    poll().catch(() => {});
    timerId = setInterval(() => {
      poll().catch(() => {});
    }, POLLING_INTERVAL_MS);

    return (): void => {
      pollingRef.current = false;
      if (timerId !== null) {
        clearInterval(timerId);
      }
    };
  }, [decomposing, questId, mutate]);

  // --- メッセージ履歴の復元 ---
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    apiClient
      .fetch<QuestPlanningMessage[]>(`/api/quests/${questId}/planning-messages`)
      .then((msgs) => {
        if (msgs.length === 0) return;

        const restored: Message[] = [];
        let lastAssistantJobId: string | null = null;

        for (const msg of msgs) {
          if (msg.role === 'user') {
            restored.push({
              role: 'user',
              blocks: [],
              text: msg.content ?? '',
            });
          } else if (msg.role === 'assistant' && msg.runtimeJobId) {
            lastAssistantJobId = msg.runtimeJobId;
            restored.push({ role: 'assistant', blocks: [] });
          }
        }

        if (lastAssistantJobId) {
          setMessages(restored.slice(0, -1));
          startStream(lastAssistantJobId);
        } else {
          setMessages(restored);
        }
      })
      .catch(() => {});
  }, [questId, startStream]);

  // --- アクション ---
  const startJob = async (jobType: string, text: string): Promise<void> => {
    if (!text) return;

    setMessages((prev) => [...prev, { role: 'user', blocks: [], text }]);
    setInstruction('');

    try {
      const { jobId } = await apiClient.post<{ jobId: string }>(
        `/api/quests/${questId}/jobs`,
        { jobType, instruction: text }
      );
      startStream(jobId);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          blocks: [
            {
              index: 0,
              blockType: 'text',
              content: err instanceof Error ? err.message : 'Unknown error',
              completed: true,
              turnIndex: 0,
            },
          ],
        },
      ]);
    }
  };

  const startDecompose = async (): Promise<void> => {
    setManualDecomposing(true);
    try {
      if (quest && quest.waypoints.length > 0) {
        await apiClient.delete(`/api/quests/${questId}/waypoints`);
        await mutate({ ...quest, waypoints: [] }, false);
      }
      await startJob('decompose', DECOMPOSE_INSTRUCTION);
    } catch {
      setManualDecomposing(false);
    }
  };

  const cancelJob = async (): Promise<void> => {
    await rawCancel();
    setManualDecomposing(false);
    mutate().catch(() => {});
  };

  // --- Esc キーでキャンセル ---
  useEffect(() => {
    if (!streaming) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        cancelJob().catch(() => {});
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [streaming]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendInstruction = async (): Promise<void> => {
    const text = instruction.trim();
    if (!text) return;
    await startJob('freeform', text);
  };

  const updateWaypoint = (id: string, data: WaypointUpdateData): void => {
    apiClient
      .put(`/api/quests/${questId}/waypoints/${id}`, data)
      .then(() => mutate())
      .catch(() => {});
  };

  const mutateQuest = (): void => {
    mutate().catch(() => {});
  };

  return {
    quest,
    messages,
    blocks,
    decomposing,
    streaming,
    instruction,
    setInstruction,
    startDecompose,
    cancelJob,
    sendInstruction,
    updateWaypoint,
    mutateQuest,
  };
};
