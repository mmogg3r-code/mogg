import { NextRequest, NextResponse } from 'next/server';

type Progress = {
  unlocked: boolean;
  progressPct: number;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { amountEth?: number; progress?: Progress };
  const amountEth = Number(body.amountEth ?? 0);
  const progress = body.progress;

  if (!amountEth || amountEth <= 0) {
    return NextResponse.json({ ok: false, message: 'Withdrawal amount must be greater than zero.' }, { status: 400 });
  }

  if (!progress?.unlocked) {
    return NextResponse.json(
      {
        ok: false,
        state: 'pending',
        message: `Withdrawal locked. Wager requirement incomplete (${progress?.progressPct ?? 0}%).`
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    state: 'pending',
    workflow: ['Pending', 'Reviewing', 'Approved', 'Paid'],
    message: 'Withdrawal request submitted and queued for manual admin review.'
  });
}
