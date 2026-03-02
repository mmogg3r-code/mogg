# Crypto Gambling + Swap DApp (Next.js + Solidity)

This repository includes:

- A Solidity contract (`contracts/CryptoGambleSwap.sol`) with:
  - Buy/sell swap for a house ERC-20 token.
  - Coin-flip gambling function.
  - Admin emergency ETH withdraw and ERC-20 unstuck rescue.
- A Next.js / React frontend (`app/page.js`) that connects with MetaMask and calls contract methods.

## Deployed contract address

Current deployed address used by default in the UI:

`0x98719d465A56242d98589085E5D608D80d10b631`

You can still replace it in the input field if you deploy another instance.

## 1) Install

```bash
npm install
```

## 2) Run frontend

```bash
npm run dev
```

Then visit `http://localhost:3000`.

## 3) Deploy contract

Use your preferred Solidity tooling (Hardhat/Foundry/Remix), compile with Solidity `^0.8.24`, and deploy `CryptoGambleSwap`.

After deployment, paste the contract address into the frontend.

## Security note

The coin-flip randomness in this demo contract is pseudo-random and **not production secure**. For real-value gambling, use a verifiable randomness source (e.g., Chainlink VRF), comprehensive audits, and jurisdictional compliance.
