import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { QuestDetail } from './QuestDetail';

export const metadata: Metadata = { title: 'Quest Details' };

const QuestPage = async (props: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> => {
  const params = await props.params;
  return <QuestDetail questId={params.id} />;
};

export default QuestPage;
