import type { ReactNode } from 'react';
import { QuestPlanning } from './QuestPlanning';

const QuestPlanningPage = async (props: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> => {
  const params = await props.params;
  return <QuestPlanning questId={params.id} />;
};

export default QuestPlanningPage;
