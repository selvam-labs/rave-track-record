# Corrections

This file records every manual correction ever applied to the published track record.
Corrections are rare, documented, and permanently visible here and in the commit
history — that history is the audit trail, so nothing is ever silently rewritten.

---

## 2026-08-24 — published trade statistics did not implement the disclosed cutover rule

**Defect.** This is a documentation-vs-code defect, not a data error. The 2026-08-15
CHANGELOG entry and the README both state that win rate and profit factor are "counted
from the cutover forward," because a figure blended across two different rule sets
describes neither of them. **The code never implemented that filter.** From the 2026-08-17
strategy change until this correction, the published profit factor and win rate were
computed over the entire history, mixing sessions run under the old rules with sessions
run under the new ones — exactly the blend the disclosure said had been excluded.

**Impact on published numbers.** The blended figures shown during that window were a
profit factor of 0.63 across 19 closed trades. They were wrong in the sense that they did
not match the stated method; they were not flattering — a correctly filtered figure for
that period is *worse*, not better (see below).

**Fix.** Trade statistics are now counted from 2026-08-17 forward, as originally stated.
Two further decisions were made while implementing it, both disclosed here because both
move published numbers:

1. **Cutover-migration exits are excluded from win rate and profit factor.** Those three
   fills closed positions that the *previous* rules had opened, so their outcome measures
   the old strategy's entry decisions, not the new one's. **Note the direction: this
   removes a $2,322 gain.** Counting them would have produced a profit factor of 8.78 on
   four trades — a spectacular-looking number generated entirely by liquidating three
   legacy positions. Excluding them is the conservative choice, and it partially
   supersedes the CHANGELOG sentence saying that migration P&L "counts in the trade
   statistics." Its realized P&L remains fully visible: it stays in the equity curve and
   in the total realized P&L figure, which is unfiltered.
2. **Ratios are suppressed below 20 closed trades**, displaying as "—" rather than a
   number. This mirrors the existing rule that gates Sharpe below 20 sessions. A profit
   factor computed over one or two trades is noise, and publishing it invites a reader to
   draw a conclusion the sample cannot support.

**Current state.** As of this correction there is **1** closed trade under the new rules,
so win rate and profit factor display as "—" and will stay that way until 20 accumulate.
Total return, Sharpe, drawdown and the equity curve are unaffected by any of this — they
were always continuous and always correct, and the migration's P&L is in them.

**How this was found.** A routine post-deployment review compared what the public files
promised against what `reporting/metrics.py` actually did. The gap had existed since the
disclosure was published on 2026-08-15.

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
| 2026-07-06 | +$14,689.87 | TMF (289 sh; own close $34.62) snapshotted at its underlying TLT's higher close $85.45: 289 × ($85.45 − $34.62) |
| 2026-07-09 | +$16,383.60 | NAIL (3x homebuilders) snapshotted at its underlying XHB's higher close instead of NAIL's own; same mechanism as the row above |

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
