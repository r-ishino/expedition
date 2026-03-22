import type { ReactNode } from 'react';
import Link from 'next/link';

const Home = (): ReactNode => (
  <div className="flex flex-1 flex-col items-center justify-center font-sans">
    <main className="flex flex-col items-center gap-8">
      <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        Expedition
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        AI Agent Orchestration Platform
      </p>
      <div className="flex gap-4">
        <Link
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          href="/quests"
        >
          Quests
        </Link>
        <Link
          className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          href="/jobs"
        >
          Claude Code Runner
        </Link>
      </div>
    </main>
  </div>
);

export default Home;
