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

const fallbackUiPath = path.resolve(__dirname, './public/index.html');


const DEFAULT_FALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset the Odds | Backend Running</title>
    <style>
      body { margin:0; font-family: Inter, Segoe UI, Roboto, sans-serif; background:#070912; color:#e5f6ff; }
      .wrap { max-width:900px; margin:3rem auto; padding:1rem; }
      .card { background:rgba(15,23,42,.75); border:1px solid rgba(53,242,255,.3); border-radius:14px; padding:1rem; }
      a { color:#35f2ff; }
      code { background: rgba(255,255,255,.08); padding:.1rem .35rem; border-radius:6px; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <h1>Reset the Odds</h1>
        <p>The backend is running and the API is available.</p>
        <p>If you are deploying only the backend process, upload either:</p>
        <ul>
          <li>a built frontend at <code>frontend/dist</code>, or</li>
          <li>the fallback page at <code>backend/public/index.html</code>.</li>
        </ul>
        <p>Quick API check: <a href="/api/health">/api/health</a></p>
      </section>
    </main>
  </body>
</html>`;


if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    return res.sendFile(frontendIndexPath);
  });
} else if (fs.existsSync(fallbackUiPath)) {
  app.use(express.static(path.resolve(__dirname, './public')));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    return res.sendFile(fallbackUiPath);
  });
} else {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    return res.type('html').send(DEFAULT_FALLBACK_HTML);
  });
}

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Coinflip backend listening on http://localhost:${port}`);
});
