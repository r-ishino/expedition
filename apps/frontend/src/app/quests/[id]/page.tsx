import type { ReactNode } from 'react';
import { QuestDetail } from './QuestDetail';

const QuestPage = async (props: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> => {
  const params = await props.params;
  return <QuestDetail questId={params.id} />;
};

export default QuestPage;
