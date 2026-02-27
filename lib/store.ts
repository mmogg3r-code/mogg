'use client';

import { create } from 'zustand';
import { GameType, resolveGame } from './games';
import { MIN_DEPOSIT_ETH, requiredWagerEth, withdrawalUnlocked } from './rules';

export const TREASURY_DEPOSIT_ADDRESS = '0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89';

type BetRecord = {
  id: string;
  game: GameType;
  stakeEth: number;
  payoutEth: number;
  detail: string;
  fairHash: string;
  nonce: number;
  createdAt: string;
};

type DepositRecord = {
  txHash: string;
  amountEth: number;
  createdAt: string;
};

type WalletState = {
  walletAddress: string | null;
  balanceEth: number;
  depositsEth: number;
  eligibleWageredEth: number;
  nonce: number;
  serverSeed: string;
  clientSeed: string;
  bets: BetRecord[];
  deposits: DepositRecord[];
  setWalletAddress: (address: string | null) => void;
  setClientSeed: (seed: string) => void;
  creditDeposit: (txHash: string, amount: number) => { ok: boolean; message: string };
  play: (game: GameType, stakeEth: number, chance?: number) => { ok: boolean; message: string };
};

export const useWalletStore = create<WalletState>((set, get) => ({
  walletAddress: null,
  balanceEth: 0,
  depositsEth: 0,
  eligibleWageredEth: 0,
  nonce: 0,
  serverSeed: 'house-seed-v1',
  clientSeed: 'player-seed',
  bets: [],
  deposits: [],
  setWalletAddress: (address) => set({ walletAddress: address }),
  setClientSeed: (seed) => set({ clientSeed: seed || 'player-seed' }),
  creditDeposit: (txHash, amount) => {
    if (amount < MIN_DEPOSIT_ETH) {
      return { ok: false, message: `Minimum deposit is ${MIN_DEPOSIT_ETH} ETH.` };
    }
    if (get().deposits.some((d) => d.txHash.toLowerCase() === txHash.toLowerCase())) {
      return { ok: false, message: 'This deposit tx was already tracked.' };
    }
    set((s) => ({
      balanceEth: Number((s.balanceEth + amount).toFixed(8)),
      depositsEth: Number((s.depositsEth + amount).toFixed(8)),
      deposits: [{ txHash, amountEth: amount, createdAt: new Date().toISOString() }, ...s.deposits]
    }));
    return { ok: true, message: 'Deposit tracked and credited to player funds.' };
  },
  play: (game, stakeEth, chance) => {
    const state = get();
    if (stakeEth <= 0) return { ok: false, message: 'Stake must be > 0.' };
    if (state.balanceEth < stakeEth) return { ok: false, message: 'Insufficient player funds.' };

    const nonce = state.nonce + 1;
    const result = resolveGame({
      game,
      stakeEth,
      serverSeed: state.serverSeed,
      clientSeed: state.clientSeed,
      nonce,
      chance
    });

    set((s) => ({
      nonce,
      balanceEth: Number((s.balanceEth - stakeEth + result.payoutEth).toFixed(8)),
      eligibleWageredEth: Number((s.eligibleWageredEth + stakeEth).toFixed(8)),
      bets: [
        {
          id: `${Date.now()}-${nonce}`,
          game,
          stakeEth,
          payoutEth: result.payoutEth,
          detail: result.detail,
          fairHash: result.fairHash,
          nonce,
          createdAt: new Date().toISOString()
        },
        ...s.bets
      ].slice(0, 100)
    }));

    return { ok: true, message: `${game.toUpperCase()} settled: ${result.detail}` };
  }
}));

export function getProgressSnapshot() {
  const s = useWalletStore.getState();
  const required = requiredWagerEth(s.depositsEth);
  const ratio = required === 0 ? 0 : Math.min(100, (s.eligibleWageredEth / required) * 100);
  return {
    balanceEth: s.balanceEth,
    depositsEth: s.depositsEth,
    eligibleWageredEth: s.eligibleWageredEth,
    requiredWagerEth: required,
    unlocked: withdrawalUnlocked({ lifetimeDepositsEth: s.depositsEth, eligibleWageredEth: s.eligibleWageredEth }),
    progressPct: Number(ratio.toFixed(2))
  };
}
