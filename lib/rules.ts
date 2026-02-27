export const TREASURY_DEPOSIT_ADDRESS = '0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89';
export const MIN_DEPOSIT_ETH = 0.04;
export const USD_PER_ETH = 3000;
export const WITHDRAW_WAGER_MULTIPLIER = 20;
export const MAX_BET_PER_LINE_USD = 5;
export const LINES_PER_SLOT = 50;
export const MAX_LINE_MULTIPLIER = 20000;
export const MAX_PROGRESSIVE_JACKPOT_USD = 1_000_000;

export function wagerRequiredUsd(totalDepositsUsd: number) {
  return Number((totalDepositsUsd * WITHDRAW_WAGER_MULTIPLIER).toFixed(2));
}

export function withdrawUnlocked(totalDepositsUsd: number, wageredUsd: number) {
  return wageredUsd >= wagerRequiredUsd(totalDepositsUsd);
}
