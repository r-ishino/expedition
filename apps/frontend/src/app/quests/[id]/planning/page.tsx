import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { QuestPlanning } from './QuestPlanning';

export const metadata: Metadata = { title: 'Planning' };

const QuestPlanningPage = async (props: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> => {
  const params = await props.params;
  return <QuestPlanning questId={params.id} />;
};

export default QuestPlanningPage;
