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
  reset: () => void;
};

export const useStreamBlocks = (options?: {
  onDone?: (event: JobStreamDone) => void;
  onError?: (event: JobStreamError) => void;
}): UseStreamBlocksReturn => {
  const [blocks, setBlocks] = useState<StreamBlock[]>([]);
  const [streaming, setStreaming] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const reset = (): void => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setBlocks([]);
    setStreaming(false);
  };

  const startStream = (jobId: string): void => {
    reset();
    setStreaming(true);

    const es = new EventSource(apiClient.streamUrl(jobId));
    esRef.current = es;

    es.addEventListener('block_start', (e: MessageEvent<string>) => {
      const data = apiClient.parseJson<BlockStartPayload>(e.data);
      setBlocks((prev) => [
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
      setBlocks((prev) => {
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
      setBlocks((prev) => {
        const targetIdx = prev.findLastIndex((b) => b.index === data.index);
        if (targetIdx === -1) return prev;

        const updated = [...prev];
        updated[targetIdx] = {
          ...updated[targetIdx],
          completed: true,
        };
        return updated;
      });
    });

    es.addEventListener('done', (e: MessageEvent<string>) => {
      const data = apiClient.parseJson<JobStreamDone>(e.data);
      setStreaming(false);
      es.close();
      esRef.current = null;
      options?.onDone?.(data);
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

  return { blocks, streaming, startStream, reset };
};
