import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MOGG Slots Casino',
  description: 'Play 20 animated slots with Ethereum deposits and off-chain wallet tracking.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
