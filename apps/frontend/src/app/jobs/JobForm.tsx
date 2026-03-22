'use client';

import { useRef, useState, type ReactNode } from 'react';
import type {
  JobResponse,
  JobStatus,
  JobStreamDelta,
  JobStreamDone,
  JobStreamError,
} from '@expedition/shared';

const JOB_MANAGER_URL = 'http://localhost:33333';

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

type JobEntry = {
  job: JobResponse;
  streamedOutput: string;
  streaming: boolean;
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
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    completed:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? ''}`}
    >
      {status === 'running' && streaming && (
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
      )}
      {status}
    </span>
  );
};

const JobCard = ({ entry }: { entry: JobEntry }): ReactNode => {
  const { job, streamedOutput, streaming } = entry;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-3">
        <StatusBadge status={job.status} streaming={streaming} />
        <span className="text-xs text-zinc-400 font-mono">
          {job.id.slice(0, 8)}
        </span>
        {job.branch && (
          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-mono text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            {job.branch}
          </span>
        )}
      </div>

      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
        {job.prompt}
      </p>

      {streamedOutput && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            stdout
          </span>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
            {streamedOutput}
          </pre>
        </div>
      )}

      {job.stderr && (
        <div className="mt-2 flex flex-col gap-1">
          <span className="text-xs font-medium text-red-500">stderr</span>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-mono text-xs text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {job.stderr}
          </pre>
        </div>
      )}
    </div>
  );
};

export const JobForm = (): ReactNode => {
  const [prompt, setPrompt] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<JobEntry[]>([]);
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());

  const updateEntry = (
    jobId: string,
    updater: (prev: JobEntry) => JobEntry
  ): void => {
    setEntries((prev) =>
      prev.map((e) => (e.job.id === jobId ? updater(e) : e))
    );
  };

  const startStream = (jobId: string): void => {
    const es = new EventSource(`${JOB_MANAGER_URL}/api/jobs/${jobId}/stream`);
    eventSourcesRef.current.set(jobId, es);

    es.addEventListener('delta', (e: MessageEvent<string>) => {
      const data = parseJson<JobStreamDelta>(e.data);
      updateEntry(jobId, (prev) => ({
        ...prev,
        streamedOutput: prev.streamedOutput + data.text,
      }));
    });

    es.addEventListener('done', (e: MessageEvent<string>) => {
      const data = parseJson<JobStreamDone>(e.data);
      updateEntry(jobId, (prev) => ({
        ...prev,
        streaming: false,
        job: {
          ...prev.job,
          status: data.status,
          exitCode: data.exitCode,
          completedAt: new Date().toISOString(),
        },
      }));
      es.close();
      eventSourcesRef.current.delete(jobId);
    });

    es.addEventListener('error', (e: MessageEvent<string>) => {
      if (e.data) {
        const data = parseJson<JobStreamError>(e.data);
        setError(data.message);
      }
      updateEntry(jobId, (prev) => ({
        ...prev,
        streaming: false,
      }));
      es.close();
      eventSourcesRef.current.delete(jobId);
    });

    es.onerror = (): void => {
      updateEntry(jobId, (prev) => ({
        ...prev,
        streaming: false,
      }));
      es.close();
      eventSourcesRef.current.delete(jobId);
    };
  };

  const submit = async (): Promise<void> => {
    if (!prompt.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const job = await fetchJson<JobResponse>(`${JOB_MANAGER_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          repoPath: repoPath.trim() || undefined,
        }),
      });

      const newEntry: JobEntry = {
        job,
        streamedOutput: '',
        streaming: true,
      };
      setEntries((prev) => [newEntry, ...prev]);
      setPrompt('');

      if (job.status === 'running') {
        startStream(job.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const runningCount = entries.filter((e) => e.job.status === 'running').length;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Prompt
          <textarea
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500 font-normal"
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Claude Codeに実行させたい指示を入力..."
            rows={3}
            value={prompt}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Repository Path
          <input
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500 font-normal font-mono"
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="/path/to/repo（空欄でworktreeなし）"
            type="text"
            value={repoPath}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting || !prompt.trim()}
            onClick={submit}
            type="button"
          >
            {submitting ? '送信中...' : '実行'}
          </button>

          {runningCount > 0 && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {runningCount} 件実行中
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {entries.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Jobs ({entries.length})
          </h2>
          {entries.map((entry) => (
            <JobCard entry={entry} key={entry.job.id} />
          ))}
        </div>
      )}
    </div>
  );
};
