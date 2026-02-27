'use client';

import { FormEvent, useMemo, useState } from 'react';
import { BrowserProvider, parseEther } from 'ethers';
import { motion } from 'framer-motion';
import { GameType } from '@/lib/games';
import { getProgressSnapshot, TREASURY_DEPOSIT_ADDRESS, useWalletStore } from '@/lib/store';

const GAMES: GameType[] = ['dice', 'roulette', 'crash', 'plinko', 'blackjack'];

export default function Dashboard() {
  const [deposit, setDeposit] = useState('0.04');
  const [stake, setStake] = useState('0.01');
  const [chance, setChance] = useState('49.5');
  const [selectedGame, setSelectedGame] = useState<GameType>('dice');
  const [withdraw, setWithdraw] = useState('0.1');
  const [message, setMessage] = useState('');

  const walletAddress = useWalletStore((s) => s.walletAddress);
  const setWalletAddress = useWalletStore((s) => s.setWalletAddress);
  const setClientSeed = useWalletStore((s) => s.setClientSeed);
  const creditDeposit = useWalletStore((s) => s.creditDeposit);
  const play = useWalletStore((s) => s.play);
  const bets = useWalletStore((s) => s.bets);
  const deposits = useWalletStore((s) => s.deposits);

  const balanceEth = useWalletStore((s) => s.balanceEth);
  const depositsEth = useWalletStore((s) => s.depositsEth);
  const eligibleWageredEth = useWalletStore((s) => s.eligibleWageredEth);

  const snapshot = useMemo(() => getProgressSnapshot(), [balanceEth, depositsEth, eligibleWageredEth]);

  const connectMetaMask = async () => {
    const eth = (window as any).ethereum;
    if (!eth) {
      setMessage('MetaMask not detected. Please install MetaMask.');
      return;
    }
    const provider = new BrowserProvider(eth);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    setWalletAddress(address);
    setMessage(`Connected: ${address}`);
  };

  const sendDeposit = async (e: FormEvent) => {
    e.preventDefault();
    const eth = (window as any).ethereum;
    if (!eth) {
      setMessage('MetaMask required for direct deposit transfer.');
      return;
    }

    const amount = Number(deposit);
    const apiRes = await fetch('/api/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountEth: amount })
    });
    const apiBody = (await apiRes.json()) as { ok: boolean; message: string };
    if (!apiBody.ok) {
      setMessage(apiBody.message);
      return;
    }

    const provider = new BrowserProvider(eth);
    const signer = await provider.getSigner();
    const tx = await signer.sendTransaction({ to: TREASURY_DEPOSIT_ADDRESS, value: parseEther(deposit || '0') });

    const credit = creditDeposit(tx.hash, amount);
    setMessage(`${credit.message} TX: ${tx.hash}`);
  };

  const onPlay = (e: FormEvent) => {
    e.preventDefault();
    const result = play(selectedGame, Number(stake), Number(chance));
    setMessage(result.message);
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
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">GCasino — Centralized ETH Casino</h1>
          <p className="mt-2 text-white/70">Direct deposit wallet: <span className="font-mono text-cyan-300">{TREASURY_DEPOSIT_ADDRESS}</span></p>
        </div>
        <button className="rounded bg-cyan-400 px-4 py-2 font-semibold text-black" onClick={connectMetaMask}>
          {walletAddress ? 'Wallet Connected' : 'Connect MetaMask'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="card"><p>Player Funds</p><p className="text-2xl font-semibold">{snapshot.balanceEth.toFixed(4)} ETH</p></div>
        <div className="card"><p>Total Deposits</p><p className="text-2xl font-semibold">{snapshot.depositsEth.toFixed(4)} ETH</p></div>
        <div className="card"><p>Eligible Wagered</p><p className="text-2xl font-semibold">{snapshot.eligibleWageredEth.toFixed(4)} ETH</p></div>
      </div>

      <div className="mt-6 card">
        <div className="flex justify-between text-sm text-white/80"><span>Withdrawal unlock progress</span><span>{snapshot.progressPct}%</span></div>
        <div className="mt-2 h-2 rounded bg-white/10"><motion.div className="h-2 rounded bg-neon shadow-neon" animate={{ width: `${snapshot.progressPct}%` }} /></div>
        <p className="mt-2 text-sm text-white/70">Required wager: {snapshot.requiredWagerEth.toFixed(4)} ETH • {snapshot.unlocked ? 'Unlocked' : 'Locked'}</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <form onSubmit={sendDeposit} className="card space-y-3">
          <h2 className="font-semibold">Direct Deposit (MetaMask)</h2>
          <input className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          <button className="w-full rounded bg-neon px-3 py-2 font-semibold text-black">Send to Treasury</button>
        </form>

        <form onSubmit={onPlay} className="card space-y-3">
          <h2 className="font-semibold">Play Games</h2>
          <select className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" value={selectedGame} onChange={(e) => setSelectedGame(e.target.value as GameType)}>
            {GAMES.map((g) => <option key={g} value={g}>{g.toUpperCase()}</option>)}
          </select>
          <input className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" value={stake} onChange={(e) => setStake(e.target.value)} />
          {selectedGame === 'dice' ? <input className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" value={chance} onChange={(e) => setChance(e.target.value)} /> : null}
          <input className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" placeholder="Client seed" onChange={(e) => setClientSeed(e.target.value)} />
          <button className="w-full rounded bg-white/90 px-3 py-2 font-semibold text-black">Resolve Bet</button>
        </form>

        <form onSubmit={onWithdraw} className="card space-y-3">
          <h2 className="font-semibold">Manual Withdrawal Request</h2>
          <input className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" value={withdraw} onChange={(e) => setWithdraw(e.target.value)} />
          <button className="w-full rounded bg-fuchsia-400 px-3 py-2 font-semibold text-black">Submit for Review</button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-semibold">Recent Deposits</h3>
          <div className="space-y-2 text-sm">
            {deposits.length === 0 ? <p className="text-white/60">No deposits tracked yet.</p> : deposits.map((d) => (
              <p key={d.txHash}><span className="font-mono text-cyan-300">{d.txHash.slice(0, 12)}...</span> • {d.amountEth} ETH</p>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 font-semibold">Recent Bets</h3>
          <div className="space-y-2 text-sm">
            {bets.length === 0 ? <p className="text-white/60">No bets yet.</p> : bets.map((b) => (
              <p key={b.id}>{b.game.toUpperCase()} stake {b.stakeEth} => payout {b.payoutEth} • nonce {b.nonce}</p>
            ))}
          </div>
        </div>
      </div>

      {message ? <p className="mt-4 rounded bg-white/10 p-3 text-sm">{message}</p> : null}
    </main>
  );
}
