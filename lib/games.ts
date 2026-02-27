import { createHash } from 'crypto';

export type GameType = 'dice' | 'roulette' | 'crash' | 'plinko' | 'blackjack';

export type ResolvedGame = {
  game: GameType;
  multiplier: number;
  payoutEth: number;
  detail: string;
  fairHash: string;
};

export function fairnessHash(serverSeed: string, clientSeed: string, nonce: number): string {
  return createHash('sha256').update(`${serverSeed}:${clientSeed}:${nonce}`).digest('hex');
}

function unitFromHash(hash: string, offset = 0): number {
  const slice = hash.slice(offset, offset + 8);
  const n = parseInt(slice, 16);
  return (n % 10000) / 10000;
}

export function resolveGame(params: {
  game: GameType;
  stakeEth: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  chance?: number;
}): ResolvedGame {
  const { game, stakeEth, serverSeed, clientSeed, nonce } = params;
  const hash = fairnessHash(serverSeed, clientSeed, nonce);
  const u = unitFromHash(hash);

  if (game === 'dice') {
    const chance = Math.min(95, Math.max(5, params.chance ?? 49.5));
    const win = u * 100 < chance;
    const multiplier = win ? Number((99 / chance).toFixed(4)) : 0;
    return {
      game,
      multiplier,
      payoutEth: Number((stakeEth * multiplier).toFixed(8)),
      detail: `Roll ${(u * 100).toFixed(2)} vs chance ${chance.toFixed(2)}`,
      fairHash: hash
    };
  }

  if (game === 'roulette') {
    const number = Math.floor(u * 37);
    const win = number === 7;
    const multiplier = win ? 35 : 0;
    return {
      game,
      multiplier,
      payoutEth: Number((stakeEth * multiplier).toFixed(8)),
      detail: `Ball landed on ${number}. Bet assumed on single number 7`,
      fairHash: hash
    };
  }

  if (game === 'crash') {
    const bust = Math.max(1, Number((1 / Math.max(0.01, 1 - u)).toFixed(2)));
    const cashout = 2;
    const win = bust >= cashout;
    const multiplier = win ? cashout : 0;
    return {
      game,
      multiplier,
      payoutEth: Number((stakeEth * multiplier).toFixed(8)),
      detail: `Crash at ${bust}x. Auto cashout ${cashout}x`,
      fairHash: hash
    };
  }

  if (game === 'plinko') {
    const bucket = Math.floor(unitFromHash(hash, 4) * 9);
    const table = [0.2, 0.5, 0.8, 1, 1.2, 1, 0.8, 0.5, 0.2];
    const multiplier = table[bucket] ?? 0.2;
    return {
      game,
      multiplier,
      payoutEth: Number((stakeEth * multiplier).toFixed(8)),
      detail: `Bucket ${bucket} => ${multiplier}x`,
      fairHash: hash
    };
  }

  const player = Math.floor(unitFromHash(hash, 2) * 10) + 12;
  const dealer = Math.floor(unitFromHash(hash, 6) * 10) + 12;
  const playerScore = Math.min(player, 21);
  const dealerScore = Math.min(dealer, 21);
  const win = (playerScore <= 21 && dealerScore > 21) || (playerScore <= 21 && playerScore > dealerScore);
  const push = playerScore <= 21 && playerScore === dealerScore;
  const multiplier = push ? 1 : win ? 2 : 0;
  return {
    game: 'blackjack',
    multiplier,
    payoutEth: Number((stakeEth * multiplier).toFixed(8)),
    detail: `Player ${playerScore} vs Dealer ${dealerScore}`,
    fairHash: hash
  };
}
