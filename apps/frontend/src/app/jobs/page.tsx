import type { ReactNode } from 'react';
import { JobForm } from './JobForm';

const JobsPage = (): ReactNode => (
  <div className="flex flex-1 flex-col items-center px-6 py-12 font-sans">
    <div className="w-full max-w-4xl">
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        Claude Code Runner
      </h1>
      <JobForm />
    </div>
  </div>
);

export default JobsPage;
