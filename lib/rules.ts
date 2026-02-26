export const MIN_DEPOSIT_ETH = 0.04;
export const WAGER_MULTIPLIER = 10;

export type WagerProgress = {
  lifetimeDepositsEth: number;
  eligibleWageredEth: number;
};

export function requiredWagerEth(totalDepositsEth: number): number {
  return Number((totalDepositsEth * WAGER_MULTIPLIER).toFixed(8));
}

export function withdrawalUnlocked(progress: WagerProgress): boolean {
  return progress.eligibleWageredEth >= requiredWagerEth(progress.lifetimeDepositsEth);
}
