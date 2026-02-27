import { MAX_LINE_MULTIPLIER, MAX_PROGRESSIVE_JACKPOT_USD } from './rules';

export type SlotTheme = {
  id: string;
  name: string;
  symbols: string[];
  volatility: 'low' | 'mid' | 'high';
  baseRtp: number;
  jackpotSeedUsd: number;
  icon: string;
  accent: string;
};

export type SpinResult = {
  reel: string[][];
  lineWinUsd: number;
  lineMultiplier: number;
  jackpotWinUsd: number;
  totalWinUsd: number;
  hitType: 'none' | 'win' | 'big_win' | 'jackpot';
  message: string;
};

type SlotSeed = [id: string, name: string, symbols: string[], icon: string, accent: string];

const SLOT_SEEDS: SlotSeed[] = [
  ['neon-district', 'Neon District', ['💎', '7️⃣', '⚡', '🦊', '🍒'], '/slots/neon-district.svg', '#22d3ee'],
  ['dragon-vault', 'Dragon Vault', ['🐉', '🔥', '🪙', '🧧', '💠'], '/slots/dragon-vault.svg', '#f97316'],
  ['deep-space', 'Deep Space', ['🪐', '🌌', '🚀', '👽', '⭐'], '/slots/deep-space.svg', '#818cf8'],
  ['pharaoh-gold', 'Pharaoh Gold', ['👑', '🦂', '☀️', '🪬', '🏺'], '/slots/pharaoh-gold.svg', '#facc15'],
  ['samurai-storm', 'Samurai Storm', ['⚔️', '🎴', '⛩️', '🌀', '🐺'], '/slots/samurai-storm.svg', '#fb7185'],
  ['fruit-frenzy-x', 'Fruit Frenzy X', ['🍉', '🍋', '🍇', '🍒', '🍊'], '/slots/fruit-frenzy-x.svg', '#34d399'],
  ['wild-west-cash', 'Wild West Cash', ['🤠', '🐎', '💰', '🧨', '⭐'], '/slots/wild-west-cash.svg', '#f59e0b'],
  ['cyber-racer', 'Cyber Racer', ['🏎️', '🧪', '🔋', '🛞', '⚡'], '/slots/cyber-racer.svg', '#38bdf8'],
  ['tiki-tide', 'Tiki Tide', ['🌊', '🗿', '🥥', '🌺', '🐠'], '/slots/tiki-tide.svg', '#2dd4bf'],
  ['mythic-forge', 'Mythic Forge', ['🛡️', '🔨', '🐲', '🧿', '💍'], '/slots/mythic-forge.svg', '#a78bfa'],
  ['moon-heist', 'Moon Heist', ['🌙', '🕶️', '💼', '💣', '💎'], '/slots/moon-heist.svg', '#c084fc'],
  ['lotus-empire', 'Lotus Empire', ['🪷', '🐯', '💮', '🧿', '🪙'], '/slots/lotus-empire.svg', '#f472b6'],
  ['pirate-plunder', 'Pirate Plunder', ['🏴‍☠️', '🦜', '⚓', '🗺️', '💰'], '/slots/pirate-plunder.svg', '#60a5fa'],
  ['arctic-riches', 'Arctic Riches', ['❄️', '🐻', '🧊', '🌨️', '💎'], '/slots/arctic-riches.svg', '#67e8f9'],
  ['aztec-prime', 'Aztec Prime', ['🗿', '🪙', '🐍', '☀️', '💠'], '/slots/aztec-prime.svg', '#84cc16'],
  ['phantom-circus', 'Phantom Circus', ['🎪', '🎭', '🃏', '✨', '🎟️'], '/slots/phantom-circus.svg', '#e879f9'],
  ['robotica-777', 'Robotica 777', ['🤖', '7️⃣', '⚙️', '🔩', '🧠'], '/slots/robotica-777.svg', '#93c5fd'],
  ['royal-sakura', 'Royal Sakura', ['🌸', '👘', '🦢', '💮', '👑'], '/slots/royal-sakura.svg', '#fda4af'],
  ['lava-kingdom', 'Lava Kingdom', ['🌋', '🔥', '🪨', '🐲', '💰'], '/slots/lava-kingdom.svg', '#fb923c'],
  ['quantum-rush', 'Quantum Rush', ['🧬', '⚛️', '🌀', '💠', '✨'], '/slots/quantum-rush.svg', '#22d3ee']
];

const THEMES: SlotTheme[] = SLOT_SEEDS.map((seed, idx) => {
  const [id, name, symbols, icon, accent] = seed;
  return {
    id,
    name,
    symbols,
    icon,
    accent,
    volatility: (idx % 3 === 0 ? 'high' : idx % 2 === 0 ? 'mid' : 'low') as SlotTheme['volatility'],
    baseRtp: 0.94 + (idx % 4) * 0.01,
    jackpotSeedUsd: 5000 + idx * 750
  };
});

export function getAllSlots() {
  return THEMES;
}

export function spinSlot(theme: SlotTheme, betPerLineUsd: number, jackpotUsd: number): SpinResult {
  const lines = 50;
  const reel = Array.from({ length: 3 }).map(() => Array.from({ length: 3 }).map(() => theme.symbols[Math.floor(Math.random() * theme.symbols.length)]));
  const chance = Math.random();

  let lineMultiplier = 0;
  if (chance > 0.995) lineMultiplier = MAX_LINE_MULTIPLIER;
  else if (chance > 0.97) lineMultiplier = 250;
  else if (chance > 0.9) lineMultiplier = 50;
  else if (chance > 0.78) lineMultiplier = 8;
  else if (chance > 0.55) lineMultiplier = 2;

  const lineWinUsd = Number((betPerLineUsd * lines * lineMultiplier).toFixed(2));

  const jackpotHit = Math.random() > 0.9995;
  const jackpotWinUsd = jackpotHit ? Number(Math.min(jackpotUsd, MAX_PROGRESSIVE_JACKPOT_USD).toFixed(2)) : 0;
  const totalWinUsd = Number((lineWinUsd + jackpotWinUsd).toFixed(2));

  const hitType = jackpotHit ? 'jackpot' : totalWinUsd >= 1000 ? 'big_win' : totalWinUsd > 0 ? 'win' : 'none';
  const message = jackpotHit
    ? `JACKPOT! ${theme.name} paid $${jackpotWinUsd.toLocaleString()}`
    : totalWinUsd > 0
      ? `${theme.name} win ${lineMultiplier}x for $${totalWinUsd.toLocaleString()}`
      : `${theme.name} spin missed. Try again.`;

  return { reel, lineWinUsd, lineMultiplier, jackpotWinUsd, totalWinUsd, hitType, message };
}
