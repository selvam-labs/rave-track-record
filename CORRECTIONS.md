# Corrections

This file records every manual correction ever applied to the published track record.
Corrections are rare, documented, and permanently visible here and in the commit
history — that history is the audit trail, so nothing is ever silently rewritten.

---

## 2026-07-09 — NAV marking defect on same-day leveraged entries (2 sessions corrected)

**Defect.** A position opened *during* a session was marked in that session's NAV
snapshot at its underlying benchmark's price instead of its own (a leveraged ETF
trades at a very different absolute price than the index fund it tracks). Fills,
cash, and the broker account were always correct — only the ledger's end-of-run NAV
snapshot, and the return/drawdown/Sharpe series derived from it, was inflated on the
entry day, reverting the next session (the tell-tale one-day spikes on the equity
curve).

**Impact.** Exactly two sessions were affected — the first two sessions ever to
enter leveraged instruments:

| Session | Overstatement | Detail |
|---|---|---|
| 2026-07-06 | +$14,689.87 | TMF (289 sh) marked at TLT's price: 289 × ($85.45 − $34.62) |
| 2026-07-09 | +$16,383.60 | Same defect on a newly entered leveraged position (instrument details appear in the trade log after the standard T+1 publication lag) |

**Correction (applied 2026-07-09).**
- Both sessions' NAV re-marked using official same-day closing prices for the
  instruments actually held.
- The running peak / drawdown series recomputed over the full history. Real maximum
  drawdown over the first 22 sessions: **0.31%** (not the 1.56% briefly shown — that
  "drawdown" was measured against the phantom peak).
- The engine was fixed the same day: every open position is re-marked at its own
  price *after* the trading loop, with a regression test pinning the exact failure.
- The pre-correction ledger is archived unmodified; this note and the correction
  commit remain public.

**How it was caught.** Cross-checking the ledger NAV against the broker account's
own equity curve — they disagreed by ~$16K on entry days and matched otherwise.
