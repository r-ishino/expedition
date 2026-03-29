'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { UserMessageBlock } from '~/components/stream/UserMessageBlock';
import { AssistantMessageBlock } from '~/components/stream/AssistantMessageBlock';
import { usePlanningSessionContext } from './PlanningSessionProvider';

export const WorkspacePane = (): ReactNode => {
  const {
    messages,
    blocks,
    streaming,
    instruction,
    setInstruction,
    cancelJob,
    sendInstruction,
    resetSession,
  } = usePlanningSessionContext();

  const streamAreaRef = useRef<HTMLDivElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleReset = (): void => {
    setConfirmOpen(false);
    resetSession().catch(() => {});
  };

  const scrollToBottom = (): void => {
    if (streamAreaRef.current) {
      streamAreaRef.current.scrollTop = streamAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  if (streaming) {
    setTimeout(scrollToBottom, 0);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Confirm dialog */}
      <Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>やり取りを初期化しますか？</DialogTitle>
            <DialogDescription>
              すべてのメッセージ履歴が削除されます。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setConfirmOpen(false)}
              size="sm"
              variant="ghost"
            >
              キャンセル
            </Button>
            <Button
              className="bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={handleReset}
              size="sm"
            >
              初期化する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5">
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

      {/* Sub header */}
      <div className="flex h-10 shrink-0 items-center justify-end border-b border-zinc-200 px-5">
        <Button
          onClick={() => setConfirmOpen(true)}
          size="xs"
          variant="outline"
        >
          初期化
        </Button>
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
            {messages.map((msg, i) =>
              msg.role === 'user' && msg.text ? (
                <UserMessageBlock
                  key={`${msg.role}-${String(i)}`}
                  text={msg.text}
                />
              ) : (
                <AssistantMessageBlock
                  blocks={msg.blocks}
                  key={`${msg.role}-${String(i)}`}
                />
              )
            )}
            {streaming && blocks.length > 0 && (
              <AssistantMessageBlock blocks={blocks} streaming />
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
            <button
              className="text-xs text-zinc-400 hover:text-zinc-600"
              onClick={() => {
                cancelJob().catch(() => {});
              }}
              type="button"
            >
              Esc でキャンセル
            </button>
          </div>
        )}
        <div className="flex items-end gap-2.5">
          <textarea
            className="min-h-10 max-h-40 flex-1 resize-none rounded-md border border-zinc-200 px-3.5 py-2 text-[13px] text-zinc-950 placeholder-zinc-400 outline-none [field-sizing:content] focus:border-zinc-400"
            disabled={streaming}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.nativeEvent.isComposing &&
                (e.ctrlKey || e.metaKey)
              ) {
                e.preventDefault();
                sendInstruction().catch(() => {});
              }
            }}
            placeholder="Claudeに返信..."
            rows={1}
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
