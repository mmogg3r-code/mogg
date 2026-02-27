'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { BrowserProvider, parseEther } from 'ethers';
import { AnimatePresence, motion } from 'framer-motion';
import { progressView, useCasinoStore } from '@/lib/store';
import { LINES_PER_SLOT, MAX_BET_PER_LINE_USD, TREASURY_DEPOSIT_ADDRESS } from '@/lib/rules';

type Lang = 'en' | 'es' | 'fr' | 'de' | 'ja';

const L10N: Record<Lang, Record<string, string>> = {
  en: {
    title: 'MOGG Slots — 20 Interactive Machines',
    connect: 'Connect MetaMask',
    connected: 'Wallet Connected',
    playTopup: '+ Play Tokens',
    realMode: 'Real Mode',
    playMode: 'Play Token Mode',
    deposit: 'ETH Deposit',
    sendEth: 'Send ETH + Track Funds',
    spinControls: 'Spin Controls',
    withdraw: 'Withdrawal Request',
    manualWithdraw: 'Request Manual Withdrawal',
    openSlot: 'Open Slot Page',
    winAlert: 'WIN ALERT',
    close: 'Click anywhere to close'
  },
  es: { title: 'MOGG Slots — 20 Máquinas Interactivas', connect: 'Conectar MetaMask', connected: 'Billetera Conectada', playTopup: '+ Tokens Demo', realMode: 'Modo Real', playMode: 'Modo Token', deposit: 'Depósito ETH', sendEth: 'Enviar ETH y Registrar Fondos', spinControls: 'Control de Giro', withdraw: 'Solicitud de Retiro', manualWithdraw: 'Solicitar Revisión Manual', openSlot: 'Abrir Página', winAlert: 'ALERTA DE PREMIO', close: 'Haz clic para cerrar' },
  fr: { title: 'MOGG Slots — 20 Machines Interactives', connect: 'Connecter MetaMask', connected: 'Portefeuille Connecté', playTopup: '+ Jetons Démo', realMode: 'Mode Réel', playMode: 'Mode Jeton', deposit: 'Dépôt ETH', sendEth: 'Envoyer ETH + Suivre Fonds', spinControls: 'Contrôle des Spins', withdraw: 'Demande de Retrait', manualWithdraw: 'Soumettre Retrait Manuel', openSlot: 'Ouvrir la Page', winAlert: 'ALERTE GAIN', close: 'Cliquez pour fermer' },
  de: { title: 'MOGG Slots — 20 Interaktive Automaten', connect: 'MetaMask Verbinden', connected: 'Wallet Verbunden', playTopup: '+ Spieltoken', realMode: 'Echtmodus', playMode: 'Tokenmodus', deposit: 'ETH Einzahlung', sendEth: 'ETH Senden + Guthaben Buchen', spinControls: 'Spin Steuerung', withdraw: 'Auszahlungsanfrage', manualWithdraw: 'Manuelle Auszahlung Anfragen', openSlot: 'Slot-Seite Öffnen', winAlert: 'GEWINN ALARM', close: 'Zum Schließen klicken' },
  ja: { title: 'MOGG Slots — 20のインタラクティブ台', connect: 'MetaMask接続', connected: 'ウォレット接続済み', playTopup: '+ プレイトークン', realMode: 'リアルモード', playMode: 'プレイモード', deposit: 'ETH入金', sendEth: 'ETH送金して残高反映', spinControls: 'スピン設定', withdraw: '出金リクエスト', manualWithdraw: '手動審査で出金申請', openSlot: '台ページを開く', winAlert: '勝利アラート', close: 'クリックして閉じる' }
};

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
  const [lang, setLang] = useState<Lang>('en');
  const [sending, setSending] = useState(false);

  const t = L10N[lang];
  const ping = useSound();
  const wallet = useCasinoStore((s) => s.wallet);
  const mode = useCasinoStore((s) => s.mode);
  const setMode = useCasinoStore((s) => s.setMode);
  const addPlayTokens = useCasinoStore((s) => s.addPlayTokens);
  const connectWallet = useCasinoStore((s) => s.connectWallet);
  const trackDeposit = useCasinoStore((s) => s.trackDeposit);
  const slots = useCasinoStore((s) => s.slots);
  const selectedSlotId = useCasinoStore((s) => s.selectedSlotId);
  const selectSlot = useCasinoStore((s) => s.selectSlot);
  const spin = useCasinoStore((s) => s.spin);
  const requestWithdrawal = useCasinoStore((s) => s.requestWithdrawal);
  const dismissPopup = useCasinoStore((s) => s.dismissPopup);

  const realFundsUsd = useCasinoStore((s) => s.realFundsUsd);
  const playFundsUsd = useCasinoStore((s) => s.playFundsUsd);
  const totalDepositsUsd = useCasinoStore((s) => s.totalDepositsUsd);
  const totalWageredUsd = useCasinoStore((s) => s.totalWageredUsd);
  const jackpots = useCasinoStore((s) => s.jackpots);
  const spins = useCasinoStore((s) => s.spins);
  const deposits = useCasinoStore((s) => s.deposits);
  const reel = useCasinoStore((s) => s.lastReel);
  const popup = useCasinoStore((s) => s.popup);

  const p = useMemo(() => progressView(), [realFundsUsd, playFundsUsd, totalDepositsUsd, totalWageredUsd]);

  const onConnect = async () => {
    try {
      const eth = (window as any).ethereum;
      if (!eth) return setStatus('MetaMask not detected.');
      const provider = new BrowserProvider(eth);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      connectWallet(address);
      ping(700, 0.1);
      setStatus(`Wallet connected: ${address}`);
    } catch (error: any) {
      setStatus(error?.shortMessage || error?.message || 'Wallet connection failed.');
    }
  };

  const onDeposit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const eth = (window as any).ethereum;
      if (!eth) return setStatus('MetaMask required for deposit.');
      if (!depositEth || Number(depositEth) <= 0) return setStatus('Enter a valid ETH amount.');
      const provider = new BrowserProvider(eth);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      setStatus('Sending transaction...');
      const tx = await signer.sendTransaction({ to: TREASURY_DEPOSIT_ADDRESS, value: parseEther(depositEth) });
      setStatus(`Waiting confirmation: ${tx.hash}`);
      await tx.wait();
      const result = trackDeposit(tx.hash, Number(depositEth));
      ping(result.ok ? 820 : 220, 0.12);
      setStatus(result.message);
    } catch (error: any) {
      ping(200, 0.09);
      setStatus(error?.shortMessage || error?.message || 'ETH transfer failed.');
    } finally {
      setSending(false);
    }
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
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} className="panel glow mb-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-fuchsia-500/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-white/70">Deposit ETH directly to <span className="font-mono text-cyan-300">{TREASURY_DEPOSIT_ADDRESS}</span></p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="rounded bg-black/40 px-2 py-2 text-sm">
            <option value="en">EN</option><option value="es">ES</option><option value="fr">FR</option><option value="de">DE</option><option value="ja">JP</option>
          </select>
          <button className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-black" onClick={onConnect}>{wallet ? t.connected : t.connect}</button>
          <button className="rounded-lg bg-violet-400 px-4 py-2 font-semibold text-black" onClick={() => addPlayTokens(5000)}>{t.playTopup}</button>
        </div>
      </motion.div>

      <div className="panel mb-4 flex items-center gap-3">
        <button onClick={() => setMode('real')} className={`rounded px-3 py-1 text-sm ${mode === 'real' ? 'bg-emerald-400 text-black' : 'bg-white/10'}`}>{t.realMode}</button>
        <button onClick={() => setMode('play')} className={`rounded px-3 py-1 text-sm ${mode === 'play' ? 'bg-fuchsia-400 text-black' : 'bg-white/10'}`}>{t.playMode}</button>
        <p className="text-sm text-white/70">Active bankroll: {mode === 'real' ? `$${realFundsUsd.toLocaleString()}` : `${playFundsUsd.toLocaleString()} PT`}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-4">
        {[[ 'Real Funds', `$${realFundsUsd.toLocaleString()}`], ['Play Tokens', `${playFundsUsd.toLocaleString()} PT`], ['Deposits', `$${totalDepositsUsd.toLocaleString()}`], ['Wagered', `$${totalWageredUsd.toLocaleString()}`]].map((card, i) => (
          <motion.div key={card[0]} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="panel">
            <p className="text-white/70">{card[0]}</p><p className="text-2xl font-bold">{card[1]}</p>
          </motion.div>
        ))}
      </div>

      <div className="panel mb-4"><div className="flex items-center justify-between text-sm text-white/75 mb-2"><span>20x wagering requirement</span><span>{p.unlocked ? 'Unlocked' : `Need $${p.required.toLocaleString()}`}</span></div><div className="h-2 bg-white/10 rounded"><motion.div className="h-2 bg-cyan-400 rounded" animate={{ width: `${p.progressPct}%` }} /></div></div>

      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={onDeposit} className="panel space-y-2">
          <h3 className="font-semibold">{t.deposit}</h3>
          <input className="w-full rounded bg-black/30 px-3 py-2" value={depositEth} onChange={(e) => setDepositEth(e.target.value)} />
          <button disabled={sending} className="w-full rounded bg-emerald-400 px-3 py-2 font-semibold text-black disabled:opacity-60">{sending ? 'Processing...' : t.sendEth}</button>
        </form>
        <form onSubmit={onSpin} className="panel space-y-2"><h3 className="font-semibold">{t.spinControls} ({mode})</h3><p className="text-xs text-white/70">50 fixed lines • max ${MAX_BET_PER_LINE_USD}/line • max 20,000x multiplier</p><input className="w-full rounded bg-black/30 px-3 py-2" value={betPerLine} onChange={(e) => setBetPerLine(e.target.value)} /><button className="w-full rounded bg-fuchsia-400 px-3 py-2 font-semibold text-black">SPIN ({LINES_PER_SLOT} lines)</button></form>
        <form onSubmit={onWithdraw} className="panel space-y-2"><h3 className="font-semibold">{t.withdraw}</h3><input className="w-full rounded bg-black/30 px-3 py-2" value={withdrawUsd} onChange={(e) => setWithdrawUsd(e.target.value)} /><button className="w-full rounded bg-amber-300 px-3 py-2 font-semibold text-black">{t.manualWithdraw}</button></form>
      </div>

      <div className="panel mt-4"><h3 className="mb-2 font-semibold">20 Unique Slots — each has its own page</h3><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{slots.map((s, i) => (
        <motion.div key={s.id} whileHover={{ scale: 1.03, y: -2 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }} className={`rounded-lg border px-2 py-2 text-left ${selectedSlotId === s.id ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/15 bg-white/5'}`}>
          <button onClick={() => selectSlot(s.id)} className="w-full text-left"><div className="relative h-20 w-full overflow-hidden rounded mb-2 border border-white/10"><Image src={s.icon} alt={s.name} fill className="object-cover" sizes="220px" /></div><p className="font-semibold">{s.name}</p><p className="text-xs text-white/70">Volatility: {s.volatility}</p><p className="text-xs" style={{ color: s.accent }}>Jackpot: ${Math.min(1_000_000, jackpots[s.id] ?? 0).toLocaleString()}</p></button>
          <Link href={`/slots/${s.id}`} className="mt-2 inline-block rounded bg-white/10 px-2 py-1 text-xs">{t.openSlot}</Link>
        </motion.div>
      ))}</div></div>

      <div className="panel mt-4"><h3 className="mb-3 font-semibold">Live Reel</h3><div className="flex gap-3">{reel.map((col, i) => (<motion.div key={i} initial={{ y: -36, opacity: 0.4, rotateX: -35 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18, delay: i * 0.05 }} className="space-y-2">{col.map((sym, j) => <motion.div key={`${i}-${j}`} whileHover={{ scale: 1.08 }} className="reel-cell">{sym}</motion.div>)}</motion.div>))}</div></div>

      <div className="grid gap-4 lg:grid-cols-2 mt-4"><div className="panel"><h3 className="mb-2 font-semibold">Recent Spins</h3><div className="space-y-1 text-sm">{spins.length ? spins.slice(0, 12).map((s) => <p key={s.id}>[{s.mode}] {s.slotName} • Bet ${s.totalBetUsd} • Win ${s.result.totalWinUsd}</p>) : <p className="text-white/60">No spins yet.</p>}</div></div><div className="panel"><h3 className="mb-2 font-semibold">Deposits</h3><div className="space-y-1 text-sm">{deposits.length ? deposits.slice(0, 12).map((d) => <p key={d.txHash}><span className="font-mono">{d.txHash.slice(0, 12)}...</span> • {d.eth} ETH • ${d.usd}</p>) : <p className="text-white/60">No deposits yet.</p>}</div></div></div>
      <p className="mt-4 rounded bg-white/5 p-3 text-sm text-white/85">{status}</p>

      <AnimatePresence>{popup ? <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={dismissPopup}><motion.div initial={{ rotate: -1.5 }} animate={{ rotate: [0, -1.5, 1.5, 0] }} transition={{ repeat: Infinity, duration: 0.9 }} className="glow rounded-2xl border border-cyan-400/50 bg-slate-900 p-8 text-center"><h2 className="text-3xl font-bold text-cyan-300">{t.winAlert}</h2><p className="mt-3 text-lg">{popup}</p><p className="mt-4 text-xs text-white/60">{t.close}</p></motion.div></motion.div> : null}</AnimatePresence>
    </main>
  );
}
