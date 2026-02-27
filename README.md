# MOGG Slots (Node.js + Next.js)

A playable **Ethereum-powered slots casino app** built with Next.js.

## Core behavior
- Players connect MetaMask.
- Players send ETH directly to treasury: `0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89`.
- App tracks player funds off-chain (client demo store).
- 20 unique slot games.
- Each slot uses **50 lines**.
- Max bet: **$5 per line**.
- Multipliers up to **20,000x**.
- Progressive jackpot per slot up to **$1,000,000**.
- Withdrawal requests allowed only after **20x wagering requirement**.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run start
```

## Deploy on Hostinger
- Framework: **Next.js**
- Node: **20**
- Package manager: **npm**
- Install: `npm install`
- Build: `npm run build`
- Start: `npm run start`
