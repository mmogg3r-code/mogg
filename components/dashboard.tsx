'use client';

import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletStore } from '@/lib/store';
import { requiredWagerEth, withdrawalUnlocked } from '@/lib/rules';

export default function Dashboard() {
  const [deposit, setDeposit] = useState('0.04');
  const [wager, setWager] = useState('0.2');
  const [withdraw, setWithdraw] = useState('0.1');
  const [message, setMessage] = useState('');

  const addDeposit = useWalletStore((s) => s.addDeposit);
  const addWagerVolume = useWalletStore((s) => s.addWagerVolume);
  const balanceEth = useWalletStore((s) => s.balanceEth);
  const depositsEth = useWalletStore((s) => s.depositsEth);
  const eligibleWageredEth = useWalletStore((s) => s.eligibleWageredEth);

  const snapshot = useMemo(() => {
    const required = requiredWagerEth(depositsEth);
    const progressPct = required === 0 ? 0 : Number(Math.min(100, (eligibleWageredEth / required) * 100).toFixed(2));
    return {
      balanceEth,
      depositsEth,
      eligibleWageredEth,
      requiredWagerEth: required,
      unlocked: withdrawalUnlocked({ lifetimeDepositsEth: depositsEth, eligibleWageredEth }),
      progressPct
    };
  }, [balanceEth, depositsEth, eligibleWageredEth]);

  const onDeposit = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(deposit);

    const apiRes = await fetch('/api/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountEth: value })
    });
    const apiBody = (await apiRes.json()) as { ok: boolean; message: string };

    if (!apiBody.ok) {
      setMessage(apiBody.message);
      return;
    }

    const result = addDeposit(value);
    setMessage(result.message);
  };

  const onWager = (e: FormEvent) => {
    e.preventDefault();
    const value = Number(wager);
    if (value > 0) {
      addWagerVolume(value);
      setMessage('Eligible wager volume updated.');
    }
  };

  const onWithdraw = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(withdraw);
    const res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountEth: value, progress: snapshot })
    });
    const body = (await res.json()) as { message: string };
    setMessage(body.message);
  };

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold">MOGG — Ethereum Casino Core Starter</h1>
      <p className="mt-2 text-white/70">Custodial/off-chain accounting demo with Hostinger-ready Next.js deployment.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="card"><p>Balance</p><p className="text-2xl font-semibold">{snapshot.balanceEth.toFixed(4)} ETH</p></div>
        <div className="card"><p>Deposits</p><p className="text-2xl font-semibold">{snapshot.depositsEth.toFixed(4)} ETH</p></div>
        <div className="card"><p>Eligible Wagered</p><p className="text-2xl font-semibold">{snapshot.eligibleWageredEth.toFixed(4)} ETH</p></div>
      </div>

      <div className="mt-6 card">
        <div className="flex justify-between text-sm text-white/80">
          <span>Withdrawal unlock progress</span>
          <span>{snapshot.progressPct}%</span>
        </div>
        <div className="mt-2 h-2 rounded bg-white/10">
          <motion.div className="h-2 rounded bg-neon shadow-neon" animate={{ width: `${snapshot.progressPct}%` }} />
        </div>
        <p className="mt-2 text-sm text-white/70">Required wager: {snapshot.requiredWagerEth.toFixed(4)} ETH • Status: {snapshot.unlocked ? 'Unlocked' : 'Locked'}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <form onSubmit={onDeposit} className="card space-y-3">
          <h2 className="font-semibold">Deposit (min 0.04 ETH)</h2>
          <input className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          <button className="w-full rounded bg-neon px-3 py-2 font-semibold text-black">Credit Deposit</button>
        </form>

        <form onSubmit={onWager} className="card space-y-3">
          <h2 className="font-semibold">Simulate Eligible Wager</h2>
          <input className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" value={wager} onChange={(e) => setWager(e.target.value)} />
          <button className="w-full rounded bg-white/90 px-3 py-2 font-semibold text-black">Add Wager Volume</button>
        </form>

        <form onSubmit={onWithdraw} className="card space-y-3">
          <h2 className="font-semibold">Manual Withdrawal Request</h2>
          <input className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" value={withdraw} onChange={(e) => setWithdraw(e.target.value)} />
          <button className="w-full rounded bg-fuchsia-400 px-3 py-2 font-semibold text-black">Submit for Review</button>
        </form>
      </div>

      {message ? <p className="mt-4 rounded bg-white/10 p-3 text-sm">{message}</p> : null}
    </main>
  );
}
