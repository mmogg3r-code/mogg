# SepoliaSwap (Next.js)

A PancakeSwap-style swap interface for **Sepolia ETH testnet**, built with **Node.js + Next.js + React**.

## Features

- Injected wallet connection (MetaMask and EIP-1193 compatible wallets)
- Sepolia-only network guard + one-click chain switch
- ETH -> token quoting through Sepolia Uniswap V2 router
- Swap execution via `swapExactETHForTokens`
- Clean, card-style DEX interface

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Notes

- Default token list includes Sepolia WETH, USDC, and `0x703E3dF75127Ea2f52BF36C543E85F896B882306` (as `TEST`).
- This app is for testnet/demo usage.
- Always test with small amounts on Sepolia.
