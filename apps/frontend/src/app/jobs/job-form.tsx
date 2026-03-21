"use client";

import { useState, type ReactNode } from "react";
import type { JobResponse } from "@expedition/shared";

const JOB_MANAGER_URL = "http://localhost:33333";

const StatusBadge = ({ status, polling }: { status: string; polling: boolean }): ReactNode => {
  const styles: Record<string, string> = {
    running:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}
    >
      {status === "running" && polling && (
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
      )}
      {status}
    </span>
  );
};

export const JobForm = (): ReactNode => {
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const pollJob = (id: string): void => {
    const interval: ReturnType<typeof setInterval> = setInterval(async () => {
      try {
        const res: Response = await fetch(`${JOB_MANAGER_URL}/api/jobs/${id}`);
        if (!res.ok) return;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const job: JobResponse = await res.json();
        setResult(job);

        if (job.status !== "running") {
          clearInterval(interval);
          setPolling(false);
        }
      } catch {
        // ポーリングエラーは無視して次回リトライ
      }
    }, 2000);
  };

  const submit = async (): Promise<void> => {
    if (!prompt.trim()) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res: Response = await fetch(`${JOB_MANAGER_URL}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const body: { error?: string } = await res.json();
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const job: JobResponse = await res.json();
      setResult(job);

      // ポーリングで結果を取得
      if (job.status === "running") {
        setPolling(true);
        pollJob(job.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Prompt
        <textarea
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 font-normal"
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Claude Codeに実行させたい指示を入力..."
          rows={4}
          value={prompt}
        />
      </label>

      <button
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={submitting || !prompt.trim()}
        onClick={submit}
        type="button"
      >
        {submitting ? "送信中..." : "実行"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Status:</span>
            <StatusBadge polling={polling} status={result.status} />
            <span className="text-xs text-zinc-400 font-mono">{result.id}</span>
          </div>

          {result.stdout && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">stdout</span>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                {result.stdout}
              </pre>
            </div>
          )}

          {result.stderr && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-red-500">stderr</span>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-mono text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {result.stderr}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
