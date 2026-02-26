import { createHash } from 'crypto';

export function fairnessHash(serverSeed: string, clientSeed: string, nonce: number): string {
  return createHash('sha256').update(`${serverSeed}:${clientSeed}:${nonce}`).digest('hex');
}

export function rollDice(hash: string): number {
  const int = parseInt(hash.slice(0, 8), 16);
  return (int % 10000) / 100;
}
