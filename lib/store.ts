'use client';

import { create } from 'zustand';
import { getAllSlots, spinSlot, SlotTheme, SpinResult } from './slots';
import {
  LINES_PER_SLOT,
  MAX_BET_PER_LINE_USD,
  MAX_PROGRESSIVE_JACKPOT_USD,
  MIN_DEPOSIT_ETH,
  TREASURY_DEPOSIT_ADDRESS,
  USD_PER_ETH,
  wagerRequiredUsd,
  withdrawUnlocked
} from './rules';

export type BalanceMode = 'real' | 'play';

export type Deposit = { txHash: string; eth: number; usd: number; at: string };
export type SpinLog = {
  id: string;
  slotId: string;
  slotName: string;
  mode: BalanceMode;
  betPerLineUsd: number;
  totalBetUsd: number;
  result: SpinResult;
  at: string;
};

export type JackpotPool = Record<string, number>;

type State = {
  wallet: string | null;
  mode: BalanceMode;
  realFundsUsd: number;
  playFundsUsd: number;
  totalDepositsUsd: number;
  totalWageredUsd: number;
  requestedWithdrawalUsd: number;
  slots: SlotTheme[];
  selectedSlotId: string;
  jackpots: JackpotPool;
  deposits: Deposit[];
  spins: SpinLog[];
  lastReel: string[][];
  popup: string | null;
  connectWallet: (address: string) => void;
  setMode: (mode: BalanceMode) => void;
  addPlayTokens: (usd: number) => void;
  trackDeposit: (txHash: string, eth: number) => { ok: boolean; message: string };
  selectSlot: (id: string) => void;
  spin: (betPerLineUsd: number, forcedSlotId?: string) => { ok: boolean; message: string };
  requestWithdrawal: (usd: number) => { ok: boolean; message: string };
  dismissPopup: () => void;
};

const slots = getAllSlots();
const jackpots: JackpotPool = Object.fromEntries(slots.map((s) => [s.id, s.jackpotSeedUsd]));
const initialReel = Array.from({ length: 3 }).map(() => Array.from({ length: 3 }).map(() => '✨'));

export const useCasinoStore = create<State>((set, get) => ({
  wallet: null,
  mode: 'real',
  realFundsUsd: 0,
  playFundsUsd: 10000,
  totalDepositsUsd: 0,
  totalWageredUsd: 0,
  requestedWithdrawalUsd: 0,
  slots,
  selectedSlotId: slots[0].id,
  jackpots,
  deposits: [],
  spins: [],
  lastReel: initialReel,
  popup: null,

  connectWallet: (address) => set({ wallet: address }),
  setMode: (mode) => set({ mode }),
  addPlayTokens: (usd) => set((s) => ({ playFundsUsd: Number((s.playFundsUsd + Math.max(0, usd)).toFixed(2)) })),

  trackDeposit: (txHash, eth) => {
    if (eth < MIN_DEPOSIT_ETH) return { ok: false, message: `Minimum deposit is ${MIN_DEPOSIT_ETH} ETH.` };
    if (get().deposits.some((d) => d.txHash.toLowerCase() === txHash.toLowerCase())) return { ok: false, message: 'Deposit already tracked.' };

    const usd = Number((eth * USD_PER_ETH).toFixed(2));
    set((s) => ({
      realFundsUsd: Number((s.realFundsUsd + usd).toFixed(2)),
      totalDepositsUsd: Number((s.totalDepositsUsd + usd).toFixed(2)),
      deposits: [{ txHash, eth, usd, at: new Date().toISOString() }, ...s.deposits]
    }));
    return { ok: true, message: `Deposit tracked: ${eth} ETH (~$${usd.toLocaleString()}) to ${TREASURY_DEPOSIT_ADDRESS}` };
  },

  selectSlot: (id) => set({ selectedSlotId: id }),

  spin: (betPerLineUsd, forcedSlotId) => {
    const s = get();
    if (betPerLineUsd <= 0 || betPerLineUsd > MAX_BET_PER_LINE_USD) {
      return { ok: false, message: `Bet per line must be > 0 and <= $${MAX_BET_PER_LINE_USD}.` };
    }

    const totalBet = Number((betPerLineUsd * LINES_PER_SLOT).toFixed(2));
    const activeFunds = s.mode === 'real' ? s.realFundsUsd : s.playFundsUsd;
    if (activeFunds < totalBet) return { ok: false, message: `Insufficient ${s.mode} funds.` };

    const slotId = forcedSlotId ?? s.selectedSlotId;
    const slot = s.slots.find((x) => x.id === slotId) ?? s.slots[0];
    const result = spinSlot(slot, betPerLineUsd, s.jackpots[slot.id]);

    const jackpotContribution = Number((totalBet * 0.015).toFixed(2));
    const nextJackpot = Math.min(MAX_PROGRESSIVE_JACKPOT_USD, Number((s.jackpots[slot.id] - result.jackpotWinUsd + jackpotContribution).toFixed(2)));
    const nextFunds = Number((activeFunds - totalBet + result.totalWinUsd).toFixed(2));
    const popup = result.hitType === 'jackpot' || result.hitType === 'big_win' ? result.message : null;

    set((prev) => ({
      realFundsUsd: prev.mode === 'real' ? nextFunds : prev.realFundsUsd,
      playFundsUsd: prev.mode === 'play' ? nextFunds : prev.playFundsUsd,
      totalWageredUsd: Number((prev.totalWageredUsd + totalBet).toFixed(2)),
      jackpots: { ...prev.jackpots, [slot.id]: nextJackpot },
      lastReel: result.reel,
      spins: [
        {
          id: `${Date.now()}-${prev.spins.length}`,
          slotId: slot.id,
          slotName: slot.name,
          mode: prev.mode,
          betPerLineUsd,
          totalBetUsd: totalBet,
          result,
          at: new Date().toISOString()
        },
        ...prev.spins
      ].slice(0, 120),
      popup
    }));

    return { ok: true, message: result.message };
  },

  requestWithdrawal: (usd) => {
    const s = get();
    if (s.mode !== 'real') return { ok: false, message: 'Switch to Real mode to request withdrawals.' };
    if (usd <= 0) return { ok: false, message: 'Withdrawal must be > 0.' };
    if (usd > s.realFundsUsd) return { ok: false, message: 'Insufficient available real funds.' };

    const unlocked = withdrawUnlocked(s.totalDepositsUsd, s.totalWageredUsd);
    const required = wagerRequiredUsd(s.totalDepositsUsd);
    if (!unlocked) return { ok: false, message: `Withdrawal locked. Need $${required.toLocaleString()} wagered (20x deposits).` };

    set((prev) => ({ requestedWithdrawalUsd: Number((prev.requestedWithdrawalUsd + usd).toFixed(2)), realFundsUsd: Number((prev.realFundsUsd - usd).toFixed(2)) }));
    return { ok: true, message: `Withdrawal request submitted for manual review: $${usd.toLocaleString()}` };
  },

  dismissPopup: () => set({ popup: null })
}));

export function progressView() {
  const s = useCasinoStore.getState();
  const required = wagerRequiredUsd(s.totalDepositsUsd);
  const pct = required === 0 ? 0 : Math.min(100, Number(((s.totalWageredUsd / required) * 100).toFixed(2)));
  return { required, progressPct: pct, unlocked: withdrawUnlocked(s.totalDepositsUsd, s.totalWageredUsd) };
}
