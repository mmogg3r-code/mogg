'use client';

import { create } from 'zustand';
import { MIN_DEPOSIT_ETH } from './rules';

type WalletState = {
  balanceEth: number;
  depositsEth: number;
  eligibleWageredEth: number;
  addDeposit: (amount: number) => { ok: boolean; message: string };
  addWagerVolume: (amount: number) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  balanceEth: 0,
  depositsEth: 0,
  eligibleWageredEth: 0,
  addDeposit: (amount) => {
    if (amount < MIN_DEPOSIT_ETH) {
      return { ok: false, message: `Minimum deposit is ${MIN_DEPOSIT_ETH} ETH.` };
    }
    set((s) => ({
      balanceEth: Number((s.balanceEth + amount).toFixed(8)),
      depositsEth: Number((s.depositsEth + amount).toFixed(8))
    }));
    return { ok: true, message: 'Deposit accepted and credited after confirmations.' };
  },
  addWagerVolume: (amount) => {
    set((s) => ({
      eligibleWageredEth: Number((s.eligibleWageredEth + amount).toFixed(8))
    }));
  }
}));
