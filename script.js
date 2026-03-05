const symbols = ["🍒", "🍋", "🔔", "🍀", "7️⃣", "💎"];
const payouts = {
  "🍒": 6,
  "🍋": 5,
  "🔔": 10,
  "🍀": 8,
  "7️⃣": 15,
  "💎": 20,
};

const state = {
  balance: 1000,
  bet: 20,
  minBet: 10,
  maxBet: 200,
  lastWin: 0,
  isSpinning: false,
};

const balanceEl = document.getElementById("balance");
const betEl = document.getElementById("bet");
const lastWinEl = document.getElementById("lastWin");
const messageEl = document.getElementById("message");
const reels = [1, 2, 3].map((n) => document.getElementById(`reel${n}`));
const spinBtn = document.getElementById("spin");
const upBtn = document.getElementById("increaseBet");
const downBtn = document.getElementById("decreaseBet");

function randomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function updateUI() {
  balanceEl.textContent = String(state.balance);
  betEl.textContent = String(state.bet);
  lastWinEl.textContent = String(state.lastWin);
  downBtn.disabled = state.bet <= state.minBet || state.isSpinning;
  upBtn.disabled = state.bet >= state.maxBet || state.isSpinning;
  spinBtn.disabled = state.isSpinning || state.balance < state.bet;
}

function setMessage(text) {
  messageEl.textContent = text;
}

function evaluate(result) {
  const allMatch = result.every((symbol) => symbol === result[0]);
  if (!allMatch) {
    return 0;
  }

  return state.bet * payouts[result[0]];
}

async function spin() {
  if (state.isSpinning || state.balance < state.bet) {
    return;
  }

  state.isSpinning = true;
  state.balance -= state.bet;
  state.lastWin = 0;
  setMessage("Spinning...");
  updateUI();

  for (let i = 0; i < 12; i += 1) {
    reels.forEach((reel) => {
      reel.textContent = randomSymbol();
    });
    await new Promise((resolve) => setTimeout(resolve, 70));
  }

  const result = reels.map(() => randomSymbol());
  reels.forEach((reel, index) => {
    reel.textContent = result[index];
  });

  const win = evaluate(result);
  state.lastWin = win;
  state.balance += win;

  if (win > 0) {
    setMessage(`Jackpot! ${result[0]} paid ${win} credits.`);
  } else {
    setMessage(`No win this time (${result.join(" ")}). Try again!`);
  }

  if (state.balance < state.minBet) {
    setMessage("Game over. Refresh to reset your demo credits.");
  }

  state.isSpinning = false;
  updateUI();
}

upBtn.addEventListener("click", () => {
  state.bet = Math.min(state.maxBet, state.bet + 10);
  updateUI();
});

downBtn.addEventListener("click", () => {
  state.bet = Math.max(state.minBet, state.bet - 10);
  updateUI();
});

spinBtn.addEventListener("click", spin);

updateUI();
