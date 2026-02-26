# MOGG Casino (Hostinger-ready Next.js starter)

This is a deployable **Next.js App Router** starter aligned to your centralized Ethereum casino rules:

- Minimum deposit: `0.04 ETH`
- Withdrawal unlock: `eligible wagered >= 10x deposits`
- Withdrawals are manual/admin-reviewed
- Off-chain accounting model
- No smart contracts required

## Hostinger compatibility

This repository is configured for Hostinger-supported runtimes:

- Frontend framework: **Next.js**
- Backend framework: **Next.js** (API routes)
- Node.js: **20.x** (also compatible with 18/22/24 via `engines`)
- Package manager: **npm**

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
5. Package manager: `npm`.
6. Node version: `20`.
7. Install command: `npm install`.
8. Build command: `npm run build`.
9. Start command: `npm run start`.
10. Add environment variables from `.env.example`.
11. Deploy.

### If you still get "Unsupported framework or invalid project structure"

Verify all of the following in Hostinger settings and repo:

- `package.json` exists at repository root.
- `next` is in dependencies.
- `scripts.build` and `scripts.start` exist.
- `app/layout.tsx` and `app/page.tsx` exist.
- `next.config.js` exists at root.
- Deployment root is `/` (not a subfolder).
- Selected branch is the branch that contains these files.

## Project structure

- `app/` UI + API route handlers
- `components/` premium UI modules (Framer Motion + React Three Fiber)
- `lib/rules.ts` hard business rules
- `lib/games.ts` deterministic fairness hash utilities

> Note: this is a production-oriented starter scaffold. You should connect PostgreSQL/Redis, add Fastify microservices, queue workers, and real blockchain indexers for full production use.
