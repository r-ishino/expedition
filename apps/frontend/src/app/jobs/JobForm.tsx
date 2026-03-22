"use client";

import { useRef, useState, type ReactNode } from "react";
import type {
  JobResponse,
  JobStatus,
  JobStreamDelta,
  JobStreamDone,
  JobStreamError,
} from "@expedition/shared";

const JOB_MANAGER_URL = "http://localhost:33333";

const parseJson = <T,>(text: string): T =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  JSON.parse(text);

const fetchJson = async <T,>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> => {
  const res = await fetch(input, init);
  const text = await res.text();
  if (!res.ok) {
    const body = parseJson<{ error?: string }>(text);
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return parseJson<T>(text);
};

type JobFormState = {
  prompt: string;
  submitting: boolean;
  streaming: boolean;
  job: JobResponse | null;
  streamedOutput: string;
  error: string | null;
};

const initialState: JobFormState = {
  prompt: "",
  submitting: false,
  streaming: false,
  job: null,
  streamedOutput: "",
  error: null,
};

const StatusBadge = ({
  status,
  streaming,
}: {
  status: JobStatus;
  streaming: boolean;
}): ReactNode => {
  const styles: Record<string, string> = {
    running:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    failed:
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}
    >
      {status === "running" && streaming && (
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
      )}
      {status}
    </span>
  );
};

export const JobForm = (): ReactNode => {
  const [state, setState] = useState<JobFormState>(initialState);
  const eventSourceRef = useRef<EventSource | null>(null);

  const patch = (partial: Partial<JobFormState>): void => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  const startStream = (jobId: string): void => {
    eventSourceRef.current?.close();

    const es = new EventSource(
      `${JOB_MANAGER_URL}/api/jobs/${jobId}/stream`
    );
    eventSourceRef.current = es;
    patch({ streaming: true });

    es.addEventListener("delta", (e: MessageEvent<string>) => {
      const data = parseJson<JobStreamDelta>(e.data);
      setState((prev) => ({
        ...prev,
        streamedOutput: prev.streamedOutput + data.text,
      }));
    });

    es.addEventListener("done", (e: MessageEvent<string>) => {
      const data = parseJson<JobStreamDone>(e.data);
      setState((prev) => ({
        ...prev,
        streaming: false,
        job: prev.job
          ? {
              ...prev.job,
              status: data.status,
              exitCode: data.exitCode,
              completedAt: new Date().toISOString(),
            }
          : prev.job,
      }));
      es.close();
    });

    es.addEventListener("error", (e: MessageEvent<string>) => {
      if (e.data) {
        const data = parseJson<JobStreamError>(e.data);
        patch({ streaming: false, error: data.message });
      } else {
        patch({ streaming: false });
      }
      es.close();
    });

    es.onerror = (): void => {
      patch({ streaming: false });
      es.close();
    };
  };

  const submit = async (): Promise<void> => {
    if (!state.prompt.trim()) return;

    patch({
      submitting: true,
      error: null,
      job: null,
      streamedOutput: "",
    });

    try {
      const job = await fetchJson<JobResponse>(
        `${JOB_MANAGER_URL}/api/jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: state.prompt }),
        }
      );
      patch({ job });

      if (job.status === "running") {
        startStream(job.id);
      }
    } catch (err) {
      patch({
        error: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      patch({ submitting: false });
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Prompt
        <textarea
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 font-normal"
          onChange={(e) => patch({ prompt: e.target.value })}
          placeholder="Claude Codeに実行させたい指示を入力..."
          rows={4}
          value={state.prompt}
        />
      </label>

      <button
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={state.submitting || !state.prompt.trim()}
        onClick={submit}
        type="button"
      >
        {state.submitting ? "送信中..." : "実行"}
      </button>

      {state.error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </div>
      )}

      {state.job && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Status:
            </span>
            <StatusBadge
              status={state.job.status}
              streaming={state.streaming}
            />
            <span className="text-xs text-zinc-400 font-mono">
              {state.job.id}
            </span>
          </div>

          {state.streamedOutput && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                stdout
              </span>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                {state.streamedOutput}
              </pre>
            </div>
          )}

          {state.job.stderr && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-red-500">
                stderr
              </span>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-mono text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {state.job.stderr}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
