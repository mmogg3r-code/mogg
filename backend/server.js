import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const sessions = new Map();

const BANKROLL_START = 1000;

const createSession = (clientSeed = crypto.randomUUID()) => {
  const id = crypto.randomUUID();
  const serverSeed = crypto.randomBytes(32).toString('hex');
  const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

  const session = {
    id,
    clientSeed,
    serverSeed,
    serverSeedHash,
    handsPlayed: 0,
    bankroll: BANKROLL_START,
    history: []
  };

  sessions.set(id, session);
  return session;
};

const getRoll = (serverSeed, clientSeed, nonce) => {
  const hmac = crypto
    .createHmac('sha256', serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest('hex');

  const randomValue = parseInt(hmac.slice(0, 13), 16) / 0x1fffffffffffff;
  return { roll: randomValue, proof: hmac };
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/game/session', (req, res) => {
  const { clientSeed } = req.body ?? {};
  const session = createSession(clientSeed);

  res.json({
    sessionId: session.id,
    clientSeed: session.clientSeed,
    serverSeedHash: session.serverSeedHash,
    bankroll: session.bankroll,
    handsPlayed: session.handsPlayed
  });
});

app.post('/api/game/flip', (req, res) => {
  const { sessionId, side, amount } = req.body ?? {};
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  if (!['heads', 'tails'].includes(side)) {
    return res.status(400).json({ error: 'Bet side must be heads or tails.' });
  }

  const betAmount = Number(amount);
  if (!Number.isFinite(betAmount) || betAmount <= 0) {
    return res.status(400).json({ error: 'Bet amount must be greater than zero.' });
  }

  if (betAmount > session.bankroll) {
    return res.status(400).json({ error: 'Insufficient session bankroll.' });
  }

  const nonce = session.handsPlayed;
  const { roll, proof } = getRoll(session.serverSeed, session.clientSeed, nonce);
  const result = roll < 0.5 ? 'heads' : 'tails';
  const won = side === result;
  const payout = won ? betAmount : -betAmount;

  session.bankroll += payout;
  session.handsPlayed += 1;

  const hand = {
    nonce,
    side,
    amount: betAmount,
    result,
    won,
    payout,
    bankroll: session.bankroll,
    proof
  };

  session.history.unshift(hand);
  session.history = session.history.slice(0, 20);

  return res.json({
    hand,
    handsPlayed: session.handsPlayed,
    bankroll: session.bankroll,
    canWithdraw: session.handsPlayed >= 10
  });
});

app.post('/api/game/withdraw', (req, res) => {
  const { sessionId } = req.body ?? {};
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  if (session.handsPlayed < 10) {
    return res.status(400).json({
      error: `Withdrawal is locked. Play ${10 - session.handsPlayed} more hand(s).`
    });
  }

  const amount = session.bankroll;
  session.bankroll = 0;

  return res.json({
    message: 'Withdrawal approved in this demo environment.',
    amount,
    reveal: {
      serverSeed: session.serverSeed,
      serverSeedHash: session.serverSeedHash,
      clientSeed: session.clientSeed
    }
  });
});

app.get('/api/game/history/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  return res.json({
    handsPlayed: session.handsPlayed,
    bankroll: session.bankroll,
    history: session.history,
    serverSeedHash: session.serverSeedHash,
    clientSeed: session.clientSeed
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    return res.sendFile(frontendIndexPath);
  });
} else {
  app.get('/', (_req, res) => {
    res.type('text/plain').send(
      'Backend is running. Build and deploy frontend/dist to serve the UI from this root. API is available under /api/*.'
    );
  });
}

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Coinflip backend listening on http://localhost:${port}`);
});
