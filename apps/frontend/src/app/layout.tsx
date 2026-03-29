import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Expedition',
    template: '%s | Expedition',
  },
  description: 'AI Agent Orchestration Platform',
};

const RootLayout = ({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactNode => (
  <html
    className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    lang="en"
  >
    <body className="min-h-full flex flex-col">{children}</body>
  </html>
);

export default RootLayout;
