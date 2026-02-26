import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MOGG Casino',
  description: 'Hostinger-ready centralized Ethereum casino starter'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
