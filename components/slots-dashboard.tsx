'use client';

import Image from 'next/image';
import { FormEvent, useMemo, useState } from 'react';
import { BrowserProvider, parseEther } from 'ethers';
import { AnimatePresence, motion } from 'framer-motion';
import { progressView, useCasinoStore } from '@/lib/store';
import { LINES_PER_SLOT, MAX_BET_PER_LINE_USD, TREASURY_DEPOSIT_ADDRESS } from '@/lib/rules';

function useSound() {
  return (freq = 440, duration = 0.08) => {
    if (typeof window === 'undefined') return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };
}

export default function SlotsDashboard() {
  const [depositEth, setDepositEth] = useState('0.04');
  const [betPerLine, setBetPerLine] = useState('1');
  const [withdrawUsd, setWithdrawUsd] = useState('100');
  const [status, setStatus] = useState('Welcome to MOGG Slots');

  const ping = useSound();

  const wallet = useCasinoStore((s) => s.wallet);
  const connectWallet = useCasinoStore((s) => s.connectWallet);
  const trackDeposit = useCasinoStore((s) => s.trackDeposit);
  const slots = useCasinoStore((s) => s.slots);
  const selectedSlotId = useCasinoStore((s) => s.selectedSlotId);
  const selectSlot = useCasinoStore((s) => s.selectSlot);
  const spin = useCasinoStore((s) => s.spin);
  const requestWithdrawal = useCasinoStore((s) => s.requestWithdrawal);
  const dismissPopup = useCasinoStore((s) => s.dismissPopup);

  const playerFundsUsd = useCasinoStore((s) => s.playerFundsUsd);
  const totalDepositsUsd = useCasinoStore((s) => s.totalDepositsUsd);
  const totalWageredUsd = useCasinoStore((s) => s.totalWageredUsd);
  const jackpots = useCasinoStore((s) => s.jackpots);
  const spins = useCasinoStore((s) => s.spins);
  const deposits = useCasinoStore((s) => s.deposits);
  const reel = useCasinoStore((s) => s.lastReel);
  const popup = useCasinoStore((s) => s.popup);

  const p = useMemo(() => progressView(), [playerFundsUsd, totalDepositsUsd, totalWageredUsd]);

  const onConnect = async () => {
    const eth = (window as any).ethereum;
    if (!eth) return setStatus('MetaMask not detected.');
    const provider = new BrowserProvider(eth);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    connectWallet(address);
    ping(700, 0.1);
    setStatus(`Wallet connected: ${address}`);
  };

  const onDeposit = async (e: FormEvent) => {
    e.preventDefault();
    const eth = (window as any).ethereum;
    if (!eth) return setStatus('MetaMask required for deposit.');
    const provider = new BrowserProvider(eth);
    const signer = await provider.getSigner();
    const tx = await signer.sendTransaction({ to: TREASURY_DEPOSIT_ADDRESS, value: parseEther(depositEth) });
    const result = trackDeposit(tx.hash, Number(depositEth));
    ping(result.ok ? 820 : 220, 0.12);
    setStatus(result.message);
  };

  const onSpin = (e: FormEvent) => {
    e.preventDefault();
    const result = spin(Number(betPerLine));
    ping(result.ok ? 520 : 200, 0.08);
    if (result.ok) ping(680, 0.08);
    setStatus(result.message);
  };

  const onWithdraw = (e: FormEvent) => {
    e.preventDefault();
    const result = requestWithdrawal(Number(withdrawUsd));
    ping(result.ok ? 900 : 250, 0.12);
    setStatus(result.message);
  };

  return (
    <main className="mx-auto max-w-7xl p-5">
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} className="panel glow mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">MOGG Slots — 20 Interactive Machines</h1>
          <p className="text-white/70">Deposit ETH directly to <span className="font-mono text-cyan-300">{TREASURY_DEPOSIT_ADDRESS}</span></p>
        </div>
        <button className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-black" onClick={onConnect}>{wallet ? 'Wallet Connected' : 'Connect MetaMask'}</button>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-4 mb-4">
        {[
          ['Player Funds', `$${playerFundsUsd.toLocaleString()}`],
          ['Deposits', `$${totalDepositsUsd.toLocaleString()}`],
          ['Wagered', `$${totalWageredUsd.toLocaleString()}`],
          ['Withdrawal Unlock', `${p.progressPct}%`]
        ].map((card, i) => (
          <motion.div key={card[0]} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="panel">
            <p className="text-white/70">{card[0]}</p>
            <p className="text-2xl font-bold">{card[1]}</p>
          </motion.div>
        ))}
      </div>

      <div className="panel mb-4">
        <div className="flex items-center justify-between text-sm text-white/75 mb-2"><span>20x wagering requirement</span><span>{p.unlocked ? 'Unlocked' : `Need $${p.required.toLocaleString()}`}</span></div>
        <div className="h-2 bg-white/10 rounded"><motion.div className="h-2 bg-cyan-400 rounded" animate={{ width: `${p.progressPct}%` }} /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={onDeposit} className="panel space-y-2">
          <h3 className="font-semibold">ETH Deposit</h3>
          <input className="w-full rounded bg-black/30 px-3 py-2" value={depositEth} onChange={(e) => setDepositEth(e.target.value)} />
          <button className="w-full rounded bg-emerald-400 px-3 py-2 font-semibold text-black">Send ETH + Track Funds</button>
        </form>

        <form onSubmit={onSpin} className="panel space-y-2">
          <h3 className="font-semibold">Spin Controls</h3>
          <p className="text-xs text-white/70">50 fixed lines • max ${MAX_BET_PER_LINE_USD}/line • max 20,000x multiplier</p>
          <input className="w-full rounded bg-black/30 px-3 py-2" value={betPerLine} onChange={(e) => setBetPerLine(e.target.value)} />
          <button className="w-full rounded bg-fuchsia-400 px-3 py-2 font-semibold text-black">SPIN ({LINES_PER_SLOT} lines)</button>
        </form>

        <form onSubmit={onWithdraw} className="panel space-y-2">
          <h3 className="font-semibold">Withdrawal Request</h3>
          <input className="w-full rounded bg-black/30 px-3 py-2" value={withdrawUsd} onChange={(e) => setWithdrawUsd(e.target.value)} />
          <button className="w-full rounded bg-amber-300 px-3 py-2 font-semibold text-black">Request Manual Withdrawal</button>
        </form>
      </div>

      <div className="panel mt-4">
        <h3 className="mb-2 font-semibold">20 Unique Slots (progressive jackpot up to $1,000,000)</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {slots.map((s, i) => (
            <motion.button
              key={s.id}
              onClick={() => selectSlot(s.id)}
              whileHover={{ scale: 1.03, y: -2 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.015 }}
              className={`rounded-lg border px-2 py-2 text-left ${selectedSlotId === s.id ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/15 bg-white/5'}`}
            >
              <div className="relative h-20 w-full overflow-hidden rounded mb-2 border border-white/10">
                <Image src={s.icon} alt={s.name} fill className="object-cover" sizes="220px" />
              </div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-white/70">Volatility: {s.volatility}</p>
              <p className="text-xs" style={{ color: s.accent }}>Jackpot: ${Math.min(1_000_000, jackpots[s.id] ?? 0).toLocaleString()}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="panel mt-4">
        <h3 className="mb-3 font-semibold">Live Reel</h3>
        <div className="flex gap-3">
          {reel.map((col, i) => (
            <motion.div key={i} initial={{ y: -36, opacity: 0.4, rotateX: -35 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18, delay: i * 0.05 }} className="space-y-2">
              {col.map((sym, j) => (
                <motion.div key={`${i}-${j}`} whileHover={{ scale: 1.08 }} className="reel-cell">{sym}</motion.div>
              ))}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        <div className="panel"><h3 className="mb-2 font-semibold">Recent Spins</h3><div className="space-y-1 text-sm">{spins.length ? spins.slice(0, 12).map((s) => <p key={s.id}>{s.slotName} • Bet ${s.totalBetUsd} • Win ${s.result.totalWinUsd}</p>) : <p className="text-white/60">No spins yet.</p>}</div></div>
        <div className="panel"><h3 className="mb-2 font-semibold">Deposits</h3><div className="space-y-1 text-sm">{deposits.length ? deposits.slice(0, 12).map((d) => <p key={d.txHash}><span className="font-mono">{d.txHash.slice(0, 12)}...</span> • {d.eth} ETH • ${d.usd}</p>) : <p className="text-white/60">No deposits yet.</p>}</div></div>
      </div>

      <p className="mt-4 rounded bg-white/5 p-3 text-sm text-white/85">{status}</p>

      <AnimatePresence>
        {popup ? (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={dismissPopup}>
            <motion.div initial={{ rotate: -1.5 }} animate={{ rotate: [0, -1.5, 1.5, 0] }} transition={{ repeat: Infinity, duration: 0.9 }} className="glow rounded-2xl border border-cyan-400/50 bg-slate-900 p-8 text-center">
              <h2 className="text-3xl font-bold text-cyan-300">WIN ALERT</h2>
              <p className="mt-3 text-lg">{popup}</p>
              <p className="mt-4 text-xs text-white/60">Click anywhere to close</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
