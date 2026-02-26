import { NextRequest, NextResponse } from 'next/server';
import { MIN_DEPOSIT_ETH } from '@/lib/rules';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { amountEth?: number };
  const amountEth = Number(body.amountEth ?? 0);

  if (amountEth < MIN_DEPOSIT_ETH) {
    return NextResponse.json({ ok: false, message: `Minimum deposit is ${MIN_DEPOSIT_ETH} ETH.` }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    status: 'confirming',
    confirmationsRequired: 12,
    message: 'Deposit detected. Credit will happen after required confirmations.'
  });
}
