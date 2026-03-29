import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import QuestsContent from './QuestsContent';

export const metadata: Metadata = { title: 'Quests' };

const QuestsPage = (): ReactNode => <QuestsContent />;

export default QuestsPage;
