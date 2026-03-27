'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Quest, Waypoint } from '@expedition/shared';
import { useTerritories } from '~/hooks/api/useTerritories';

type QuestWithWaypoints = Quest & { waypoints: Waypoint[] };

const Section = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactNode => (
  <div className="flex flex-col gap-2.5 p-4">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold tracking-wider text-zinc-500">
        {label}
      </span>
      <button className="text-zinc-400 hover:text-zinc-600" type="button">
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
    </div>
    {children}
  </div>
);

const Divider = (): ReactNode => <div className="h-px bg-zinc-200" />;

export const QuestInfoPane = ({
  quest,
}: {
  quest: QuestWithWaypoints;
}): ReactNode => {
  const { data: territories = [] } = useTerritories().useIndex();

  const territoryNames = quest.territoryIds.map((id) => {
    const territory = territories.find((t) => t.id === id);
    return territory ? territory.name : id.slice(0, 8);
  });

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-2 p-4">
        <Link
          className="text-[13px] text-zinc-500 hover:text-zinc-700"
          href="/quests"
        >
          &larr; 課題一覧
        </Link>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-950">
            {quest.title}
          </h2>
          <button className="text-zinc-400 hover:text-zinc-600" type="button">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {quest.description && (
          <p className="text-[13px] leading-relaxed text-zinc-500">
            {quest.description}
          </p>
        )}
      </div>

      <Divider />

      {/* Territories */}
      <Section label="修正リポジトリ">
        {territoryNames.length > 0 ? (
          <div className="flex flex-col gap-2">
            {territoryNames.map((name) => (
              <span
                className="w-fit rounded-full bg-zinc-100 px-2.5 py-1.5 text-xs text-zinc-800"
                key={name}
              >
                {name}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-zinc-400">未設定</span>
        )}
      </Section>

      <Divider />

      {/* References */}
      <Section label="補足資料">
        <span className="text-xs text-zinc-400">なし</span>
      </Section>

      <Divider />

      {/* UI Images */}
      <Section label="完成UIイメージ">
        <span className="text-xs text-zinc-400">なし</span>
      </Section>

      <Divider />

      {/* Attributes */}
      <Section label="属性">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-300" />
            <span className="text-xs text-zinc-800">UI変更: 未設定</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-300" />
            <span className="text-xs text-zinc-800">Schema変更: 未設定</span>
          </div>
        </div>
      </Section>
    </div>
  );
};
