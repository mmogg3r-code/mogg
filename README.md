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
3. Framework: **Next.js**.
4. Root directory: `/`.
5. Install command: `npm install`
6. Build command: `npm run build`
7. Start command: `npm run start`
8. Node version: `18+` (recommended `20`).
9. Add environment variables from `.env.example`.
10. Deploy.

### Fix for "Unsupported framework or invalid project structure"
If Hostinger cannot detect the framework, verify:
- `package.json` is at repo root and includes `next` dependency + build/start scripts.
- `app/layout.tsx` and `app/page.tsx` exist.
- `next.config.js` exists at root.
- Deployment root is set to `/` (not a subfolder).
- Branch selected in Hostinger is the one containing this scaffold.

## Project structure

- `app/` UI + API route handlers
- `components/` premium UI modules (Framer Motion + React Three Fiber)
- `lib/rules.ts` hard business rules
- `lib/games.ts` deterministic fairness hash utilities

> Note: this is a production-oriented starter scaffold. You should connect PostgreSQL/Redis, add Fastify microservices, queue workers, and real blockchain indexers for full production use.
