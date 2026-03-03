import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [session, setSession] = useState(null);
  const [betAmount, setBetAmount] = useState(25);
  const [betSide, setBetSide] = useState('heads');
  const [status, setStatus] = useState('Creating a fair-play session...');
  const [history, setHistory] = useState([]);
  const [withdrawResult, setWithdrawResult] = useState(null);

  useEffect(() => {
    createSession();
  }, []);

  useEffect(() => {
    const updateLight = (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 16;
      const y = (event.clientY / window.innerHeight - 0.5) * 16;
      document.body.style.setProperty('--tilt-x', `${x}deg`);
      document.body.style.setProperty('--tilt-y', `${-y}deg`);
    };

    window.addEventListener('pointermove', updateLight);
    return () => window.removeEventListener('pointermove', updateLight);
  }, []);

  const canWithdraw = session?.handsPlayed >= 10;

  const warningCopy = useMemo(
    () => [
      'Chasing losses is a cognitive trap. Outcomes are independent and random.',
      'RTP is a long-run math expectation, not a guarantee for your next session.',
      'If gambling feels hard to stop, seek support and set strict limits now.'
    ],
    []
  );

  const securityFeatures = useMemo(
    () => [
      '2-step ownership transfer for admin key changes (Ownable2Step).',
      'Pause / unpause controls for incident response.',
      'Reentrancy guard on withdraw paths.',
      'Configurable max single-withdrawal limit + emergency withdraw while paused.'
    ],
    []
  );

  const createSession = async () => {
    try {
      const response = await fetch(`${API_URL}/api/game/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();
      setSession(data);
      setStatus('Session ready. This demo uses provably fair randomness and educational framing.');
      setHistory([]);
      setWithdrawResult(null);
    } catch {
      setStatus('Backend is unavailable. Start the Express server first.');
    }
  };

  const placeBet = async () => {
    if (!session) return;

    const response = await fetch(`${API_URL}/api/game/flip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        amount: Number(betAmount),
        side: betSide
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error || 'Flip failed.');
      return;
    }

    setSession((current) => ({
      ...current,
      bankroll: data.bankroll,
      handsPlayed: data.handsPlayed
    }));
    setHistory((prev) => [data.hand, ...prev].slice(0, 10));
    setStatus(
      data.hand.won
        ? `You won ${data.hand.amount.toFixed(2)} on ${data.hand.result}.`
        : `You lost ${data.hand.amount.toFixed(2)} on ${data.hand.result}.`
    );
  };

  const withdraw = async () => {
    if (!session) return;

    const response = await fetch(`${API_URL}/api/game/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.sessionId })
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || 'Withdraw failed.');
      return;
    }

    setWithdrawResult(data);
    setStatus(`Withdraw approved for ${data.amount.toFixed(2)} (demo balance).`);
    setSession((current) => ({ ...current, bankroll: 0 }));
  };

  return (
    <div className="app">
      <header className="hero glass">
        <p className="eyebrow">Responsible Gaming</p>
        <h1>Reset the Odds</h1>
        <p>
          A professional awareness demo for users stuck in loss-chasing behavior. RTP does not guarantee
          short-session recovery.
        </p>
      </header>

      <section className="glass warning-grid">
        {warningCopy.map((line) => (
          <article key={line} className="warning-card">
            <h3>Reality Check</h3>
            <p>{line}</p>
          </article>
        ))}
      </section>

      <section className="glass game-panel">
        <div>
          <h2>Provably Fair Coinflip (Demo)</h2>
          <p>
            Educational simulation only. No wallet connection, no real funds. Seed hash lets you audit
            fairness after session reveal.
          </p>
          <p className="meta">Server seed hash: {session?.serverSeedHash || 'loading...'}</p>
          <p className="meta">Hands played: {session?.handsPlayed ?? 0} / 10 required for withdrawal</p>
          <p className="meta">Demo bankroll: {session?.bankroll?.toFixed?.(2) ?? '0.00'}</p>
        </div>

        <div className="controls">
          <label>
            Bet amount
            <input type="number" min="1" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} />
          </label>
          <label>
            Side
            <select value={betSide} onChange={(e) => setBetSide(e.target.value)}>
              <option value="heads">Heads</option>
              <option value="tails">Tails</option>
            </select>
          </label>
          <div className="buttons">
            <button onClick={placeBet}>Flip</button>
            <button onClick={withdraw} disabled={!canWithdraw}>
              Withdraw
            </button>
            <button onClick={createSession} className="ghost">
              New session
            </button>
          </div>
          <p className="status">{status}</p>
        </div>
      </section>

      <section className="glass security-grid">
        <div>
          <h2>On-chain Treasury Security</h2>
          <p className="meta">Smart contract hardening designed for investor/customer demos.</p>
        </div>
        {securityFeatures.map((item) => (
          <article className="security-card" key={item}>
            {item}
          </article>
        ))}
      </section>

      <section className="glass">
        <h2>Recent Hands</h2>
        <ul className="history">
          {history.map((hand) => (
            <li key={hand.nonce}>
              <span>#{hand.nonce}</span>
              <span>{hand.side}</span>
              <span>{hand.result}</span>
              <span className={hand.won ? 'win' : 'lose'}>
                {hand.won ? '+' : '-'}
                {hand.amount}
              </span>
            </li>
          ))}
          {!history.length && <li>No hands yet.</li>}
        </ul>
        {withdrawResult && <pre className="reveal">{JSON.stringify(withdrawResult.reveal, null, 2)}</pre>}
      </section>
    </div>
  );
}

export default App;
