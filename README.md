# Reset the Odds - Fair Coinflip Demo

A minimalistic, professional web app focused on **responsible gambling messaging** with a cyberpunk-inspired UI and a provably fair coinflip simulation.

## Why this project exists

This app is intentionally framed as an educational tool for people stuck in loss-chasing behavior:

- RTP is a long-term statistic, not a short-term promise.
- Chasing losses can intensify harm.
- The demo shows transparent randomness mechanics without handling real funds.

## Stack

- Frontend: **React + Vite** (npm)
- Backend: **Express** (npm)
- Smart contract sample: Solidity admin-withdraw treasury contract

This setup is deployable on generic Node.js hosting (including Hostinger-compatible Node deployments).

## Run locally

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:3001`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and calls the backend at `http://localhost:3001` by default.

### Single-service deployment (fixes `Cannot GET /`)

If your host runs only the Express app, build the frontend and keep `frontend/dist` next to `backend/`:

```bash
cd frontend
npm install
npm run build
```

The backend auto-serves `frontend/dist` at `/` when present, and falls back to an informative root message when not built yet.

## Fairness approach

Each game session is generated with:

- secret `serverSeed`
- public `serverSeedHash`
- public `clientSeed`
- per-hand `nonce`

The outcome is computed from `HMAC_SHA256(serverSeed, clientSeed:nonce)`, producing an unbiased heads/tails split over time.

## Withdrawal behavior in app

For parity with your requested flow, the demo enforces a **minimum of 10 hands** before allowing withdrawal from the demo balance.

## Solidity contract

`contracts/FairCoinflipBank.sol` includes:

- payable deposit via `receive()`
- `withdraw(address,uint256)` restricted by `onlyOwner`
- owner defaults to deployer wallet
