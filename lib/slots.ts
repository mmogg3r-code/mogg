import { MAX_LINE_MULTIPLIER, MAX_PROGRESSIVE_JACKPOT_USD } from './rules';

export type SlotTheme = {
  id: string;
  name: string;
  symbols: string[];
  volatility: 'low' | 'mid' | 'high';
  baseRtp: number;
  jackpotSeedUsd: number;
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

const THEMES: SlotTheme[] = [
  ['neon-district', 'Neon District', ['💎', '7️⃣', '⚡', '🦊', '🍒']],
  ['dragon-vault', 'Dragon Vault', ['🐉', '🔥', '🪙', '🧧', '💠']],
  ['deep-space', 'Deep Space', ['🪐', '🌌', '🚀', '👽', '⭐']],
  ['pharaoh-gold', 'Pharaoh Gold', ['👑', '🦂', '☀️', '🪬', '🏺']],
  ['samurai-storm', 'Samurai Storm', ['⚔️', '🎴', '⛩️', '🌀', '🐺']],
  ['fruit-frenzy-x', 'Fruit Frenzy X', ['🍉', '🍋', '🍇', '🍒', '🍊']],
  ['wild-west-cash', 'Wild West Cash', ['🤠', '🐎', '💰', '🧨', '⭐']],
  ['cyber-racer', 'Cyber Racer', ['🏎️', '🧪', '🔋', '🛞', '⚡']],
  ['tiki-tide', 'Tiki Tide', ['🌊', '🗿', '🥥', '🌺', '🐠']],
  ['mythic-forge', 'Mythic Forge', ['🛡️', '🔨', '🐲', '🧿', '💍']],
  ['moon-heist', 'Moon Heist', ['🌙', '🕶️', '💼', '💣', '💎']],
  ['lotus-empire', 'Lotus Empire', ['🪷', '🐯', '💮', '🧿', '🪙']],
  ['pirate-plunder', 'Pirate Plunder', ['🏴‍☠️', '🦜', '⚓', '🗺️', '💰']],
  ['arctic-riches', 'Arctic Riches', ['❄️', '🐻', '🧊', '🌨️', '💎']],
  ['aztec-prime', 'Aztec Prime', ['🗿', '🪙', '🐍', '☀️', '💠']],
  ['phantom-circus', 'Phantom Circus', ['🎪', '🎭', '🃏', '✨', '🎟️']],
  ['robotica-777', 'Robotica 777', ['🤖', '7️⃣', '⚙️', '🔩', '🧠']],
  ['royal-sakura', 'Royal Sakura', ['🌸', '👘', '🦢', '💮', '👑']],
  ['lava-kingdom', 'Lava Kingdom', ['🌋', '🔥', '🪨', '🐲', '💰']],
  ['quantum-rush', 'Quantum Rush', ['🧬', '⚛️', '🌀', '💠', '✨']]
].map((t, idx) => ({
  id: t[0],
  name: t[1],
  symbols: t[2],
  volatility: (idx % 3 === 0 ? 'high' : idx % 2 === 0 ? 'mid' : 'low') as SlotTheme['volatility'],
  baseRtp: 0.94 + (idx % 4) * 0.01,
  jackpotSeedUsd: 5000 + idx * 750
}));

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
