'use client';

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import type { QuestPlanningMessage } from '@expedition/shared';
import { useQuests } from '~/hooks/api/useQuests';
import { useStreamBlocks, type StreamBlock } from '~/hooks/useStreamBlocks';
import { StreamOutput } from '~/components/stream/StreamOutput';
import { apiClient } from '~/lib/apiClient';

type Message = {
  role: 'user' | 'assistant';
  blocks: StreamBlock[];
  text?: string;
};

const MessageBubble = ({ message }: { message: Message }): ReactNode => {
  const isUser = message.role === 'user';

  return (
    <div className="flex gap-3">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
          isUser
            ? 'bg-zinc-900 text-white'
            : 'border border-zinc-200 bg-zinc-100 text-zinc-500'
        }`}
      >
        {isUser ? 'U' : 'C'}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-zinc-950">
          {isUser ? 'あなた' : 'Claude'}
        </span>
        {isUser && message.text ? (
          <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-950">
            {message.text}
          </pre>
        ) : (
          <StreamOutput blocks={message.blocks} streaming={false} />
        )}
      </div>
    </div>
  );
};

export type WorkspacePaneHandle = {
  runJob: (jobType: string, text: string) => Promise<void>;
};

export const WorkspacePane = ({
  questId,
  ref,
}: {
  questId: string;
  ref?: Ref<WorkspacePaneHandle>;
}): ReactNode => {
  const { mutate } = useQuests().useShow(questId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [instruction, setInstruction] = useState('');
  const streamAreaRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (): void => {
    if (streamAreaRef.current) {
      streamAreaRef.current.scrollTop = streamAreaRef.current.scrollHeight;
    }
  };

  const { blocks, streaming, startStream } = useStreamBlocks({
    onDone: (_event, finalBlocks) => {
      // ストリーム完了時にブロックをメッセージ履歴に追加
      // blocksRef 経由で取得するため、Reactバッチ処理の影響を受けない
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

  // マウント時に会話メッセージを復元
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
            // 最後の assistant 以外は placeholder（startStream の onDone で埋まらないため空）
            restored.push({ role: 'assistant', blocks: [] });
          }
        }

        // 最後の assistant メッセージ以外を先に表示
        // 最後の assistant はストリーム再接続で復元するため除外
        if (lastAssistantJobId) {
          setMessages(restored.slice(0, -1));
          startStream(lastAssistantJobId);
        } else {
          setMessages(restored);
        }
      })
      .catch(() => {
        // 復元失敗は無視
      });
  }, [questId, startStream]);

  // blocks 変更時にスクロール
  if (streaming) {
    setTimeout(scrollToBottom, 0);
  }

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

  const sendInstruction = async (): Promise<void> => {
    const text = instruction.trim();
    if (!text) return;
    await startJob('freeform', text);
  };

  useImperativeHandle(ref, () => ({
    runJob: (jobType: string, text: string): Promise<void> =>
      startJob(jobType, text),
  }));

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-200 px-5">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] font-bold text-zinc-950">
            &gt;_
          </span>
          <span className="text-sm font-semibold text-zinc-950">
            作業スペース
          </span>
          <span className="text-[13px] text-zinc-400">/</span>
          <span className="text-[13px] text-zinc-500">
            中継地点を決めるための対話
          </span>
        </div>
      </div>

      {/* Stream area */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6"
        ref={streamAreaRef}
      >
        {messages.length === 0 && !streaming ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-sm text-zinc-400">
              指示を送信すると、ここに結果が表示されます
            </span>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={`${msg.role}-${String(i)}`} message={msg} />
            ))}
            {streaming && blocks.length > 0 && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[11px] font-semibold text-zinc-500">
                  C
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-zinc-950">
                    Claude
                  </span>
                  <StreamOutput blocks={blocks} streaming={streaming} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input area */}
      <div className="flex shrink-0 flex-col gap-2.5 border-t border-zinc-200 px-5 py-3">
        {streaming && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-xs text-green-600">
                応答をストリーミング中...
              </span>
            </div>
            <span className="text-xs text-zinc-400">Esc でキャンセル</span>
          </div>
        )}
        <div className="flex h-10 items-center gap-2.5">
          <input
            className="h-full flex-1 rounded-md border border-zinc-200 px-3.5 text-[13px] text-zinc-950 placeholder-zinc-400 outline-none focus:border-zinc-400"
            disabled={streaming}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendInstruction().catch(() => {});
              }
            }}
            placeholder="Claudeに返信..."
            value={instruction}
          />
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            disabled={streaming}
            onClick={() => {
              sendInstruction().catch(() => {});
            }}
            type="button"
          >
            &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
