import "./globals.css";

export const metadata = {
  title: "SepoliaSwap",
  description: "PancakeSwap-like ETH testnet swap UI for Sepolia"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
