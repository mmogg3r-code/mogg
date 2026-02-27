'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useCasinoStore } from '@/lib/store';

export default function SlotPageClient({ slotId }: { slotId: string }) {
  const [betPerLine, setBetPerLine] = useState('1');
  const [message, setMessage] = useState('Ready to spin this machine.');

  const slots = useCasinoStore((s) => s.slots);
  const jackpots = useCasinoStore((s) => s.jackpots);
  const mode = useCasinoStore((s) => s.mode);
  const setMode = useCasinoStore((s) => s.setMode);
  const spin = useCasinoStore((s) => s.spin);
  const reel = useCasinoStore((s) => s.lastReel);
  const realFundsUsd = useCasinoStore((s) => s.realFundsUsd);
  const playFundsUsd = useCasinoStore((s) => s.playFundsUsd);

  const slot = useMemo(() => slots.find((x) => x.id === slotId), [slots, slotId]);

  if (!slot) {
    return <main className="mx-auto max-w-3xl p-6"><p>Slot not found.</p><Link href="/" className="underline">Back</Link></main>;
  }

  const onSpin = (e: FormEvent) => {
    e.preventDefault();
    const result = spin(Number(betPerLine), slot.id);
    setMessage(result.message);
  };

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link href="/" className="text-cyan-300 underline">← Back to Lobby</Link>
      <div className="panel mt-3">
        <div className="relative h-44 w-full overflow-hidden rounded-xl border border-white/10">
          <Image src={slot.icon} alt={slot.name} fill className="object-cover" sizes="800px" />
        </div>
        <h1 className="mt-4 text-3xl font-bold">{slot.name}</h1>
        <p className="text-white/70">Unique slot page • Volatility: {slot.volatility} • RTP {Math.round(slot.baseRtp * 100)}%</p>
        <p style={{ color: slot.accent }}>Progressive Jackpot: ${Math.min(1_000_000, jackpots[slot.id] ?? 0).toLocaleString()}</p>
      </div>

      <div className="panel mt-4 flex items-center gap-3">
        <button onClick={() => setMode('real')} className={`rounded px-3 py-1 text-sm ${mode === 'real' ? 'bg-emerald-400 text-black' : 'bg-white/10'}`}>Real</button>
        <button onClick={() => setMode('play')} className={`rounded px-3 py-1 text-sm ${mode === 'play' ? 'bg-fuchsia-400 text-black' : 'bg-white/10'}`}>Play Token</button>
        <span className="text-sm text-white/70">Funds: {mode === 'real' ? `$${realFundsUsd.toLocaleString()}` : `${playFundsUsd.toLocaleString()} PT`}</span>
      </div>

      <form onSubmit={onSpin} className="panel mt-4 space-y-2">
        <h2 className="font-semibold">Spin this machine only</h2>
        <input className="w-full rounded bg-black/30 px-3 py-2" value={betPerLine} onChange={(e) => setBetPerLine(e.target.value)} />
        <button className="w-full rounded bg-fuchsia-400 px-3 py-2 font-semibold text-black">Spin {slot.name}</button>
      </form>

      <div className="panel mt-4">
        <h3 className="mb-2 font-semibold">Reel Animation</h3>
        <div className="flex gap-3">
          {reel.map((col, i) => (
            <motion.div key={i} initial={{ y: -20 }} animate={{ y: 0 }} transition={{ delay: i * 0.06 }} className="space-y-2">
              {col.map((sym, j) => <div key={`${i}-${j}`} className="reel-cell">{sym}</div>)}
            </motion.div>
          ))}
        </div>
      </div>

      <p className="panel mt-4 text-sm">{message}</p>
    </main>
  );
}
