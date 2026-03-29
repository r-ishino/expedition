import { useRef, useState } from 'react';
import type {
  JobStreamBlockDelta,
  JobStreamBlockStop,
  JobStreamDone,
  JobStreamError,
  StreamBlockType,
} from '@expedition/shared';
import { apiClient } from '~/lib/apiClient';

export type StreamBlock = {
  index: number;
  blockType: StreamBlockType;
  content: string;
  toolName?: string;
  toolUseId?: string;
  completed: boolean;
  status?: 'success' | 'error';
  turnIndex: number;
};

type BlockStartPayload = {
  index: number;
  blockType: StreamBlockType;
  toolName?: string;
  toolUseId?: string;
  turnIndex: number;
};

type UseStreamBlocksReturn = {
  blocks: StreamBlock[];
  streaming: boolean;
  startStream: (jobId: string) => void;
  cancel: () => Promise<void>;
  reset: () => void;
};

export const useStreamBlocks = (options?: {
  questId?: string;
  onDone?: (event: JobStreamDone, finalBlocks: StreamBlock[]) => void;
  onError?: (event: JobStreamError) => void;
}): UseStreamBlocksReturn => {
  const [blocks, setBlocks] = useState<StreamBlock[]>([]);
  const [streaming, setStreaming] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const jobIdRef = useRef<string | null>(null);
  // Reactバッチ処理の影響を受けずに最新のブロックを参照するためのref
  const blocksRef = useRef<StreamBlock[]>([]);

  const reset = (): void => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setBlocks([]);
    blocksRef.current = [];
    setStreaming(false);
  };

  const cancel = async (): Promise<void> => {
    const jobId = jobIdRef.current;
    const questId = options?.questId;
    if (jobId && questId) {
      await apiClient
        .post(`/api/quests/${questId}/jobs/${jobId}/cancel`, {})
        .catch(() => {});
    }
    reset();
  };

  const updateBlocks = (
    updater: (prev: StreamBlock[]) => StreamBlock[]
  ): void => {
    // blocksRef をReactバッチに依存せず同期的に更新する
    // これにより done イベント時に常に最新のブロックを参照できる
    blocksRef.current = updater(blocksRef.current);
    setBlocks(blocksRef.current);
  };

  const startStream = (jobId: string): void => {
    reset();
    jobIdRef.current = jobId;
    setStreaming(true);

    const es = new EventSource(apiClient.streamUrl(jobId));
    esRef.current = es;

    es.addEventListener('block_start', (e: MessageEvent<string>) => {
      const data = apiClient.parseJson<BlockStartPayload>(e.data);
      updateBlocks((prev) => [
        ...prev,
        {
          index: data.index,
          blockType: data.blockType,
          content: '',
          toolName: data.toolName,
          toolUseId: data.toolUseId,
          completed: false,
          turnIndex: data.turnIndex,
        },
      ]);
    });

    es.addEventListener('block_delta', (e: MessageEvent<string>) => {
      const data = apiClient.parseJson<JobStreamBlockDelta>(e.data);
      updateBlocks((prev) => {
        const targetIdx = prev.findLastIndex((b) => b.index === data.index);
        if (targetIdx === -1) return prev;

        const updated = [...prev];
        updated[targetIdx] = {
          ...updated[targetIdx],
          content: updated[targetIdx].content + data.text,
        };
        return updated;
      });
    });

    es.addEventListener('block_stop', (e: MessageEvent<string>) => {
      const data = apiClient.parseJson<JobStreamBlockStop>(e.data);
      updateBlocks((prev) => {
        const targetIdx = prev.findLastIndex((b) => b.index === data.index);
        if (targetIdx === -1) return prev;

        const updated = [...prev];
        updated[targetIdx] = {
          ...updated[targetIdx],
          completed: true,
          status: data.status,
        };
        return updated;
      });
    });

    es.addEventListener('done', (e: MessageEvent<string>) => {
      const data = apiClient.parseJson<JobStreamDone>(e.data);
      setStreaming(false);
      es.close();
      esRef.current = null;
      // blocksRef は同期的に更新されるため、バッチ処理の影響を受けない
      options?.onDone?.(data, [...blocksRef.current]);
    });

    es.addEventListener('error', (e: MessageEvent<string>) => {
      if (e.data) {
        const data = apiClient.parseJson<JobStreamError>(e.data);
        options?.onError?.(data);
      }
      setStreaming(false);
      es.close();
      esRef.current = null;
    });

    es.onerror = (): void => {
      setStreaming(false);
      es.close();
      esRef.current = null;
    };
  };

  return { blocks, streaming, startStream, cancel, reset };
};
