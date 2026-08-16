# Strategy Changelog

Deliberate changes to how the system decides and sizes trades. Defects that were *found and
fixed* live in [CORRECTIONS.md](CORRECTIONS.md); this file is for changes that were *chosen*.
Every entry states what changed, when it went live, why, and what it does **not** claim. The
commit history is the audit trail. Nothing here is edited after the fact.

---

## 2026-08-15 — v0.6 → v0.7: the ladder cutover

**What changed.** Four rules, plus one change to how uninvested cash is held.

*Entry.* The system now builds a position anywhere in the **lower half** of an instrument's
expected range, taking 25% of its volatility-governed target per qualifying day. Previously it
built only in the bottom 20% of the range, in fixed 1%-of-account increments.

*Exit.* It no longer trims into strength. The old rule cut 25% of a position whenever price
reached the top of its range. The new rule trims only when an instrument's own range **low**
has made consecutive lower lows — to 75% of target after three, 50% after six, and no deeper.
It cuts on structural deterioration, not on success.

*Forced reduction.* The rule that cut a long position to a 1% floor whenever price broke
outside its range is **removed for long positions**. It re-created the same trim-into-strength
problem in a harsher form, and on breakdowns it fired ahead of the new ladder, making the
ladder's floor meaningless in exactly the conditions it was designed for. Short positions keep
the rule. Downside on longs is still covered by the −10% stop, the long-term trend exit, and
the ladder itself.

*Leveraged instruments.* **Retired. The book is now 1x only.** See below — this was not a
design preference.

*Idle cash.* Cash above a 2%-of-account working buffer is now held in short-term Treasury
bills. The system deliberately runs about half its capital uninvested, so the yield on that
half is a material part of its return and was previously being discarded.

**Why.** A five-year replay of the shipped engine measured a structural defect: it could not
accumulate. Its sell trigger fired roughly twice as often as its buy trigger, so the book
trimmed faster than it could build and held an average of **18%** of capital invested. It
returned 3.3% a year — while taking drawdowns that cash does not.

**Effect (five-year replay, same window, T-bill yield credited to idle cash in both arms):**

| | before (v0.6) | after (v0.7) |
|---|---|---|
| average exposure | 18% | **54%** |
| annualised return | 3.3% | **7.5%** |
| Sharpe | 0.74 | **0.82** |
| maximum drawdown | 6.1% | **11.3%** |

**The system now takes visibly more risk than it did.** That is the deliberate trade, and the
drawdown figure is published beside the return, not beneath it.

**The first version of this change failed and was thrown away.** Before deploying, a risk bar
was written down: maximum drawdown ≤12%, return above T-bills, average exposure ≥35%. The
first candidate — identical rules, but still using leveraged instruments — **failed it**:
12.3% drawdown, Sharpe 0.40, and *zero additional return* over the old system despite carrying
double the exposure. Attribution isolated the cause: a wider entry trigger buys far more
leveraged exposure into the same −10% stop, and a 3.3% move in an underlying trips a stop on a
3x instrument. Retiring leveraged instruments is what produced the version above.

A second proposal — removing one of the volatility governor's hysteresis bands — was also
tested and **rejected**: it cost roughly 0.6 points of annual return. Both rejected variants
remain reproducible in the research code.

**What this change does NOT claim.** It does not produce alpha. Measured against a control
that simply holds the index at the *same average exposure*, this version still underperforms
by about **1.5 points a year**. That is the smallest gap the project has recorded, and it is
still a gap. The change makes the system better at what it is actually good at — staying
invested with a bounded drawdown — and does not make it a market-beating strategy. The full
research record, including every rejected idea, is in [BACKTEST.md](BACKTEST.md).

**One-time position migration.** Leveraged positions opened under the old rules were closed in
a single migration on the cutover date rather than being left to run off. Leaving them would
have carried into the new regime precisely the risk this change removes, and would have frozen
each affected instrument (the engine will not open a 1x position while a legacy leveraged one
is held). **The realized profit and loss from that migration counts in the trade statistics and
appears in the equity curve** — it is a real consequence of positions the system chose to open,
and excluding it would flatter the record.

**Track record continuity.** The published equity curve is **not** restarted. Sessions before
and after this date ran different logic, and the change date is marked on the dashboard. Any
statistic quoted across the boundary is a blend of two systems and is labelled as such. Trade
statistics (win rate, profit factor) are counted from the cutover forward, because a blended
figure describes neither system.

**Treasury holdings are excluded from trade statistics.** Their yield is real and appears in
account value, return, Sharpe and drawdown — those measure the account. Win rate and profit
factor measure the *signal's decisions*, and Treasury is where money sits when the signal has
nothing to say. Including a stack of near-certain small gains from a money-market instrument
would put the profit factor on the T-bill rate rather than on the strategy; cut rates to zero
and the figure would collapse without anything about the system having changed.
