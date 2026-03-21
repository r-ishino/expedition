import type { ReactNode } from "react";
import { JobForm } from "./job-form";

const JobsPage = (): ReactNode => (
  <div className="flex flex-1 flex-col items-center px-6 py-12 font-sans">
    <div className="w-full max-w-2xl">
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        Claude Code Runner
      </h1>
      <JobForm />
    </div>
  </div>
);

export default JobsPage;
