# MOGG Casino (Hostinger-ready Next.js starter)

This is a deployable **Next.js App Router** starter aligned to your centralized Ethereum casino rules:

- Minimum deposit: `0.04 ETH`
- Withdrawal unlock: `eligible wagered >= 10x deposits`
- Withdrawals are manual/admin-reviewed
- Off-chain accounting model
- No smart contracts required

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build for production

```bash
npm run build
npm run start
```

## Deploy from GitHub to Hostinger

1. Push this repo to GitHub.
2. In Hostinger hPanel, create a new app from GitHub.
3. Select **Next.js** framework.
4. Set build command: `npm run build`
5. Set start command: `npm run start`
6. Add environment variables from `.env.example`.
7. Deploy.

## Project structure

- `app/` UI + API route handlers
- `components/` premium UI modules (Framer Motion + React Three Fiber)
- `lib/rules.ts` hard business rules
- `lib/games.ts` deterministic fairness hash utilities

> Note: this is a production-oriented starter scaffold. You should connect PostgreSQL/Redis, add Fastify microservices, queue workers, and real blockchain indexers for full production use.
