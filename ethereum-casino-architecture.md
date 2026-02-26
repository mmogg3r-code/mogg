# Centralized Ethereum Casino Platform — Production Technical Design

## 1. Executive architecture summary

This platform is a **custodial, centralized casino** that uses Ethereum only for deposits/withdrawals while keeping all balances, game logic, and controls off-chain.

Hard rules implemented as immutable policy:
- Minimum deposit: **0.04 ETH**.
- Withdrawal unlock: **total eligible wagered >= 10 × cumulative deposits**.
- Withdrawals are **manual/admin-approved** (never auto-paid).
- All accounting is off-chain in PostgreSQL double-entry ledger.
- No smart contracts/Solidity/on-chain game logic.

Design goals:
- Financial integrity first (immutable journal + deterministic workflows).
- Real-time UX (WebSocket-first eventing).
- Horizontal scale at API/websocket layers.
- Operationally safe custody (manual withdrawals, risk review, hot/cold wallet separation).

---

## 2. High-level system diagram (textual)

```text
[Client: Next.js App]
  | HTTPS/WebSocket
  v
[Cloudflare WAF + DDoS + Bot Mgmt]
  |
[Nginx/API Gateway]
  |-------------------------> [Auth/API Service (Fastify)]
  |-------------------------> [Game Engine Service (Fastify)]
  |-------------------------> [Wallet/Blockchain Service (Fastify + ethers.js)]
  |-------------------------> [Withdrawal Ops Service (Fastify)]
  |-------------------------> [Admin Service (Fastify)]
  |
  +--> [WebSocket Gateway]
          |
          +--> Redis Pub/Sub or Streams (fan-out + replay cursor)

Core Data Plane:
  [PostgreSQL primary + read replica]
     - users/accounts/ledger/deposits/bets/outcomes/withdrawals/risk/admin logs
  [Redis cluster]
     - sessions, rate limit buckets, cache, pubsub, presence

Background workers:
  [Deposit Monitor + Confirmation Indexer]
  [Reconciliation Worker]
  [Risk Scoring Worker]
  [Notification Worker]

Treasury:
  [Hot Wallet signer service/HSM]
  [Cold wallet ops (manual process)]
```

---

## 3. Service breakdown and responsibilities

### 3.1 Frontend (Next.js App Router)
- Renders game lobby, wallet pages, fairness verifier, admin panel (RBAC).
- State management via Zustand/Redux for auth, balances, sessions, game states.
- WebSocket client with sequence tracking + resync endpoint.
- React Three Fiber used for subtle depth/parallax effects; automatic mobile 2D fallback.
- Tailwind + design tokens for premium cyber-luxury theme.

### 3.2 API Service (Fastify)
- User auth/session, profile, settings, wallet views.
- Deposit address retrieval and deposit history.
- Wager-progress endpoint (live + historical).
- Enforces global policy checks (deposit floor, withdrawal gate, rate limits).

### 3.3 Game Engine Service
- Shared RNG and bet lifecycle orchestration.
- Pluggable game modules (Dice, Crash, Plinko, Roulette, Blackjack).
- Deterministic resolution pipeline:
  1) pre-validate stake,
  2) lock funds via ledger hold,
  3) resolve outcome,
  4) settle win/loss ledger lines,
  5) emit real-time events.
- House-edge parameters loaded from config + admin overrides with approvals.

### 3.4 Wallet/Blockchain Service
- Generates user deposit mapping references (preferred: per-user address via HD derivation).
- Monitors blockchain via ethers.js against Infura/Alchemy with fallback providers.
- Confirmation indexer credits deposits only after threshold (e.g., 12 blocks configurable).
- Persists tx metadata, confirmation state, and idempotency key.

### 3.5 Withdrawal Ops Service
- Withdrawal request validation and state machine handling.
- Applies unlock rule (10× deposits wagered), cooldown, velocity, tier limits, risk flags.
- Manual review queue and operator workflow.
- Broadcasts approved payout tx and records tx hash/finality status.

### 3.6 Risk & Compliance Service (worker-first)
- Rule engine for anomalies: velocity spikes, linked accounts, chip-dumping patterns.
- Scores requests/users and sets `risk_flags`.
- Creates case objects for manual review.

### 3.7 Admin Service
- Finance ops dashboards, queue operations, ledger drill-down.
- Game controls: enable/disable, edge parameters, seed lifecycle operations.
- Immutable admin action capture with reason-required overrides.

### 3.8 Reconciliation Service
- Periodic balance checks:
  - account balance = sum(journal lines)
  - user wallet total = account aggregates
  - treasury movement matches withdrawal/deposit records
- Raises incidents on drift.

---

## 4. Database schema and ledger model

### 4.1 Core relational model (PostgreSQL)

#### `users`
- `id (uuid pk)`
- `email (unique)`
- `status` (active, locked, self_excluded)
- `vip_tier`
- `created_at`
- indexes: `(email)`, `(status)`

#### `wallet_identities`
- `id`
- `user_id fk users`
- `eth_address` (unique)
- `derivation_path` (optional)
- `created_at`
- index: `(user_id)`, unique `(eth_address)`

#### `accounts`
- `id`
- `user_id fk users nullable` (null for platform control accounts)
- `currency` (ETH, USD display ledger shadow if needed)
- `type` (user_cash, user_bonus, house_bankroll, pending_withdrawal, fee, reserve)
- `status`
- unique index: `(user_id, currency, type)`

#### `journal_entries` (immutable)
- `id (bigserial pk)`
- `entry_type` (deposit_credit, bet_stake, bet_payout, withdrawal_lock, withdrawal_paid, adjustment)
- `idempotency_key (unique)`
- `external_ref` (tx hash/bet id/withdrawal id)
- `created_by` (system/admin id)
- `created_at`
- indexes: unique `(idempotency_key)`, `(entry_type, created_at)`, `(external_ref)`

#### `journal_lines` (immutable)
- `id`
- `journal_entry_id fk journal_entries`
- `account_id fk accounts`
- `direction` (debit/credit)
- `amount_wei (numeric(78,0))`
- `created_at`
- indexes: `(account_id, created_at)`, `(journal_entry_id)`
- invariant: for each entry, sum(debits) == sum(credits)

#### `deposits`
- `id`
- `user_id fk users`
- `tx_hash`
- `log_index` (for uniqueness on ERC20 style future-proofing; for ETH native use 0)
- `from_address`
- `to_address`
- `amount_wei`
- `confirmations`
- `required_confirmations`
- `status` (detected, confirming, credited, orphaned)
- `credited_entry_id fk journal_entries nullable`
- `block_number`, `block_hash`
- `idempotency_key`
- unique indexes: `(tx_hash, log_index)`, `(idempotency_key)`

#### `bets`
- `id`
- `user_id`
- `game_type`
- `stake_wei`
- `client_seed`
- `server_seed_hash`
- `nonce`
- `status` (placed, settled, void)
- `placed_at`, `settled_at`
- indexes: `(user_id, placed_at)`, `(game_type, placed_at)`

#### `outcomes`
- `id`
- `bet_id fk bets unique`
- `result_payload jsonb`
- `payout_wei`
- `house_edge_bps_snapshot`
- `fairness_hash`
- `created_at`

#### `wager_progress`
- `user_id pk`
- `lifetime_deposit_wei`
- `required_wager_wei` (= lifetime deposit × 10)
- `eligible_wagered_wei`
- `progress_ratio`
- `is_unlocked`
- `updated_at`

#### `withdrawals`
- `id`
- `user_id`
- `amount_wei`
- `address`
- `state` (pending, reviewing, approved, paid, rejected, on_hold)
- `risk_score`
- `requested_at`, `updated_at`
- `approved_by admin_user_id nullable`
- `tx_hash nullable`
- `reason_code`, `review_notes`
- `idempotency_key`
- indexes: `(state, requested_at)`, `(user_id, requested_at)`, unique `(idempotency_key)`

#### `admin_actions`
- `id`
- `admin_user_id`
- `action_type`
- `target_type`, `target_id`
- `reason`
- `before jsonb`, `after jsonb`
- `created_at`
- immutable append-only with index `(admin_user_id, created_at)`

#### `risk_flags`
- `id`
- `user_id`
- `flag_type`
- `severity`
- `status` (open, dismissed, escalated)
- `metadata jsonb`
- `created_at`, `resolved_at`
- indexes: `(user_id, status)`, `(severity, created_at)`

### 4.2 Double-entry ledger rules
- Every money movement is exactly one `journal_entry` with >=2 lines.
- No mutable balances table as source of truth; balances are derived/materialized from journal lines.
- Idempotency key required on every financial API command.
- All financial writes in SERIALIZABLE transaction boundary.
- Immutable tables (`journal_entries`, `journal_lines`, `admin_actions`) enforce no UPDATE/DELETE via DB permissions.

---

## 5. Core workflows (deposit, bet, payout, withdrawal)

### 5.1 Deposit detection and crediting
1. User receives assigned deposit destination (HD-derived address preferred).
2. Monitor subscribes to new blocks + backfill scan window.
3. On tx hit to known address:
   - create `deposits` row (`detected`) with tx metadata,
   - enforce min amount >= 0.04 ETH; otherwise mark `below_minimum` and no credit.
4. Confirmation indexer updates confirmations until threshold met.
5. On threshold, perform atomic transaction:
   - insert `journal_entry` (`deposit_credit`) with idempotency key `deposit:{tx_hash}:{log_index}`,
   - insert journal lines (debit treasury clearing, credit user_cash),
   - link `deposits.credited_entry_id`, status -> `credited`,
   - update `wager_progress.lifetime_deposit_wei` and required wager.
6. Emit `wallet.deposit.credited` event to WebSocket.

Reorg/replay safety:
- keep block hash snapshot; if canonical hash changes before final threshold, move to `orphaned`/re-evaluate.
- idempotency unique key prevents duplicate credits on worker retries.
- scanner stores last finalized block cursor; replay job safely reprocesses from N blocks behind.

### 5.2 Bet placement and settlement
1. Client submits signed session request with idempotency key.
2. Engine validates stake and account balance.
3. Transaction:
   - `bet_stake` journal entry: debit user_cash, credit house_bankroll.
   - create `bets` record.
4. Deterministic game module resolves result using fairness RNG pipeline.
5. If payout > 0:
   - `bet_payout` journal entry: debit house_bankroll, credit user_cash.
6. Update `outcomes`, increment `wager_progress.eligible_wagered_wei` for eligible game volume.
7. Emit events: `bet.placed`, `bet.settled`, `balance.updated`, `leaderboard.updated`.

### 5.3 Withdrawal unlock engine
- `required_wager_wei = lifetime_deposit_wei * 10`.
- `eligible_wagered_wei` increments from settled qualifying wagers only.
- `is_unlocked = eligible_wagered_wei >= required_wager_wei`.
- expose progress percent in realtime.
- anti-abuse filters:
  - cancel/self-neutralizing loops excluded from eligible wager.
  - suspicious reciprocal betting patterns discounted.
  - bonus-funded bets can be weighted (configurable multiplier).
- admin override allowed, always reason-required and logged in `admin_actions`.

### 5.4 Manual withdrawal ops flow
State machine:
`Pending -> Reviewing -> Approved -> Paid` with side branches `Rejected`, `On Hold`.

Flow:
1. User requests withdrawal; prechecks:
   - unlocked status true,
   - cooldown window passed,
   - amount + velocity + tier limits valid.
2. Create `withdrawals` as `pending`; lock funds via ledger transfer user_cash -> pending_withdrawal.
3. Risk worker scores request; can auto-move to `on_hold`.
4. Operator reviews in admin queue (`reviewing`) with KYC/risk context.
5. On approve:
   - treasury signer creates chain tx,
   - record tx hash and move `approved`.
6. On sufficient chain finality, move `paid`, ledger transfer pending_withdrawal -> treasury payout account.
7. On reject, release lock pending_withdrawal -> user_cash with reason.

All transitions append immutable `admin_actions` + transition timestamps.

---

## 6. Provably fair implementation details

Algorithm per bet:
- server keeps active `server_seed` secret and publishes `server_seed_hash = SHA256(server_seed)`.
- user has editable `client_seed`.
- nonce is monotonic per user per game seed epoch.
- random source: `SHA256(server_seed + ':' + client_seed + ':' + nonce)`.

Lifecycle:
1. Commit phase: publish only hash before bets.
2. Betting phase: outcomes resolved using hidden seed.
3. Rotate phase (time/count based): reveal old server seed, publish new hash.
4. Verification: user can replay every bet with revealed seed + stored client seed + nonce.

Verifier UX:
- “Fairness Hub” page with plain language explanation.
- bet row shows hash inputs, computed roll/result, module mapping math.
- downloadable JSON proof packet for independent verification.

Security:
- seed generation via CSPRNG in isolated service.
- seed access restricted, encrypted at rest.
- admin seed operations require dual authorization.

---

## 7. Real-time design and scaling

Event channels:
- `global.bet_feed`
- `global.win_ticker`
- `leaderboard.updates`
- `chat.messages` (optional)
- `user.{id}.wallet`
- `admin.ops`

Fan-out architecture:
- API/services publish domain events to Redis Streams.
- WebSocket gateway consumers maintain ordered stream consumption per channel group.
- Sequence ID attached to each event (`channel_seq`).

Ordering and recovery:
- client tracks last seq per channel.
- reconnect sends resume token; server replays from stream if retained.
- if gap too large, client forced to REST snapshot + fresh WS subscription.

Scaling approach:
- stateless WS nodes preferred with Redis-backed pub/sub + session store.
- sticky sessions optional but not required.
- shard by user_id for high-volume private events.

---

## 8. Frontend design system + UX behaviors

Visual system (premium futuristic):
- Dark base (#0B0F1A), matte surfaces, glass overlays.
- Neon accents (cyan/violet/emerald) for wins and status.
- Framer Motion micro-interactions at 120–200ms.
- R3F depth layers in lobby/hero; disabled on low-power devices.

Core UX patterns:
- Persistent wallet strip (balance, deposit CTA, wager progress).
- Withdrawal module clearly states manual review + expected SLA.
- Calm trust-centric microcopy; avoid fake urgency.
- Real-time toasts tied to immutable events (deposit credited, withdrawal status updates).

Accessibility/performance:
- reduced-motion mode.
- semantic color + icon cues (not color-only).
- optimistic UI only for non-financial actions; financial actions await server ack.

---

## 9. Trust, retention, and growth systems

Trust layer:
- Live payout/withdrawal feed with masked IDs and timestamps.
- Transparency dashboard: total paid out, avg withdrawal time, uptime, incident history.
- Provably fair hub + weekly signed stats digest.

Ethical retention:
- Wager progress milestone bar (informational, non-coercive copy).
- XP/levels for cosmetics only.
- VIP tiers for support speed, profile flair, UI themes.
- daily streaks and seasonal resets with non-monetary perks.

Growth loops:
- Referral links with clear commission policy and anti-abuse controls.
- shareable win cards/GIF generation (opt-in privacy).
- streamer mode (privacy masking + large typography overlays).
- optional public stats API (rate-limited, cached, no PII).

---

## 10. Admin control center

### Finance ops
- Deposits board with confirmation status and orphan/reorg alerts.
- Withdrawal queue with SLA timers, required reason fields, dual-control for high amounts.
- Manual adjustment workflow (maker-checker model).
- Treasury dashboard: hot wallet balances, sweep schedules, cold wallet status.

### Risk & abuse
- Rule editor (velocity, IP/device clustering, behavior fingerprints).
- Alert inbox with severity routing.
- Case management with evidence timeline.

### Game controls
- per-game enable/disable kill switch.
- house-edge config with guarded ranges + approval chain.
- seed rotation scheduler and forced rotate tool.

### Auditability
- immutable admin action logs with export.
- filter by admin, user, action type, time range.
- overrides require reason and optional second approver.

---

## 11. Security hardening checklist

- Auth: short-lived session tokens + rotating refresh tokens.
- Admin: mandatory 2FA/WebAuthn, IP allowlist, step-up auth for payouts.
- API: per-route rate limits + burst controls (Redis).
- CSRF protection for cookie-authenticated endpoints.
- Replay protection: idempotency keys + request timestamp/HMAC.
- Internal service auth: mutual TLS or HMAC-signed service requests.
- Secrets: centralized manager (Vault/SSM), rotation every 90 days or on incident.
- Wallet security: hot wallet minimized; periodic sweeps to cold wallet.
- DB: least privilege roles; immutable ledger tables protected by grants/triggers.
- Supply chain: pinned dependencies, SCA scanning, signed container images.

---

## 12. Observability and incident operations

Observability stack:
- Structured logs (JSON) with `trace_id`, `user_id`, `request_id`, `idempotency_key`.
- Metrics (Prometheus):
  - deposit detection lag,
  - ws connection counts,
  - withdrawal queue aging,
  - ledger drift gauge,
  - game settle latency p95/p99.
- Tracing (OpenTelemetry) across API → DB → Redis → workers.
- Alerting (PagerDuty/Opsgenie): severity-based, runbook-linked.

Reliability controls:
- reconciliation jobs every 5–15 min + daily full audit.
- anomaly detectors for withdrawal spikes and bankroll drift.
- chaos tests for provider outage and Redis failover.

Incident runbook outline:
1. Detect and classify severity.
2. Freeze risky operations (withdrawal approvals toggle).
3. Preserve evidence (logs, DB snapshots, event stream offsets).
4. Mitigate and communicate status page update.
5. Postmortem with corrective actions.

---

## 13. Deployment playbook

Environment isolation:
- Separate cloud projects/accounts for dev/staging/prod.
- Independent wallets and RPC keys per environment.

Containers and release:
- Docker images per service, versioned and signed.
- Blue/green or rolling deploy via Kubernetes/ECS.
- Schema migrations gated with backward-compatible strategy.

Edge and gateway:
- Cloudflare WAF, bot management, geo rules.
- Nginx as API gateway with websocket upgrade support.

Data safety:
- PostgreSQL PITR backups + replica.
- Redis persistence mode per use-case (AOF for critical queues).
- quarterly restore drills (RTO/RPO validation).

HA posture:
- multi-AZ DB and stateless app replicas.
- redundant RPC providers with circuit breaker.
- failover playbooks for region and provider degradation.

---

## 14. Phased roadmap (MVP -> stabilization -> differentiation -> scale)

### Phase 1: MVP (0–3 months)
- Custodial wallet flow, deposit monitor, ledger core, Dice + Roulette.
- Manual withdrawal queue.
- Basic provably fair + verifier page.
- Essential admin dashboard and alerting.

### Phase 2: Stabilization (3–6 months)
- Crash/Plinko/Blackjack modules.
- Advanced risk rules + anomaly scoring.
- Redis Streams replay + robust reconnect semantics.
- Reconciliation automation and SLA dashboards.

### Phase 3: Differentiation (6–12 months)
- Premium UI polish, social features, seasonal events.
- Referral system and shareable moments.
- Public transparency APIs and richer fairness analytics.

### Phase 4: Scale (12+ months)
- multi-region active/passive.
- service decomposition by domain throughput.
- data partitioning/sharding for bets/events.
- advanced treasury automation under strict approval controls.

---

## 15. Key trade-offs and alternatives considered

1. **Manual withdrawals vs automation**
   - Chosen manual for fraud control and custody safety.
   - Trade-off: slower UX; mitigated with transparent SLA messaging.

2. **PostgreSQL as financial source of truth**
   - Chosen for ACID guarantees and strong consistency.
   - Trade-off: scaling write-heavy event logs; mitigated via partitioning and read replicas.

3. **Redis Streams for event replay vs pure pub/sub**
   - Streams chosen for resumability and ordering.
   - Trade-off: extra operational complexity.

4. **Off-chain provably fair vs on-chain verifiability**
   - Chosen off-chain due to product constraint and speed.
   - Trade-off: trust still centralized; mitigated by seed commitments, verifiers, transparency.

5. **HD deposit addresses vs single address + unique amount**
   - Preferred HD addresses for deterministic user mapping and less ambiguity.
   - unique amount fallback can work but increases collision/UX complexity.

6. **Stateless websocket tier**
   - Preferred for horizontal scaling and resilience.
   - Trade-off: requires Redis-backed session/event coordination.
