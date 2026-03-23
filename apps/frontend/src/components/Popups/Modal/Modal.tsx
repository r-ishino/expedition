import type { ReactNode } from 'react';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
};

export const Modal = ({
  title,
  onClose,
  children,
  actions,
}: ModalProps): ReactNode => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        <div className="flex gap-2">{actions}</div>
      </div>
      <div className="overflow-auto px-6 py-5">{children}</div>
    </div>
  </div>
);
