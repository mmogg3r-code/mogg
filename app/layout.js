import './globals.css';

export const metadata = {
  title: 'Crypto Gambling Swap DApp',
  description: 'Next.js frontend for a Solidity gambling + token swap contract'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
