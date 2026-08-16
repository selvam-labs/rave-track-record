# Backtest — the research record

This is the honest version. The headline finding is negative: **RAVE has no edge.** It does not
beat holding the index, and five years of testing did not produce a version that does.

That result is published here because it is the useful part. Anyone can show you a curve that
went up. The interesting question is whether the person showing it knows *why*, and whether
they checked the obvious alternative explanation. This document is that check.

---

## 1. The method

The harness replays five years of archived daily signal data, one session at a time, and asks
the engine what it would have done.

Three properties matter:

**It tests the code that actually runs.** The harness imports the live signal functions
unmodified and calls them exactly the way production does. Only the broker and the ledger are
simulated. It is not a reimplementation that might quietly differ.

**It cannot see the future.** A signal for a given day uses price history only through the
previous close. Orders fill at that day's **open** — you decide in the morning, so you cannot
fill at a close that has not happened. The account is then valued at that day's close.

**Idle cash earns the real Treasury-bill return**, day by day, from actual historical data.
The system deliberately holds a large cash balance, so this is not a rounding detail — it is a
material part of the return and omitting it would understate every result.

---

## 2. The control that decides everything

Every candidate improvement is judged against a **pre-registered null**: holding the index at
that run's *own average exposure*, with the remainder in T-bills.

This is the whole discipline. If a system is 18% invested and returns 3%, you cannot compare
that to an index at 100% — of course it lost. The fair comparison holds the index at 18% too.
That strips out "was I in the market at all" and isolates the only question that matters:
**did choosing these particular instruments, at these particular moments, beat choosing
nothing?**

Raising exposure raises returns by itself. That is beta, not skill, and without this control it
is trivially easy to mistake one for the other.

---

## 3. The finding

**As originally specified, the system returned 0.5% a year** — indistinguishable from holding
T-bills once cash yield is credited, while the index returned 13.4% over the same window.

**Root cause: a mean-reverting trigger driving a trend-following ambition.** The signal marks
instruments as cheap near the bottom of a range and rich near the top. In an uptrend, price
rides the top of its range — so the sell trigger fired on 18.1% of instrument-days against the
buy trigger's 9.4%. The book trimmed roughly twice as often as it built and could never
accumulate a position. Average exposure over five years: **18%**.

That diagnosis rules out an entire category of fix. The instinct is to add a filter — a
macro regime overlay, a volatility timing rule, a trend gate. But every filter makes the system
*less* invested, and under-investment was the disease.

---

## 4. The graveyard

This is the centrepiece. Ideas tested and rejected on evidence:

- **Volatility as a *timing* tool** — three separate schemes. All lost to simpler static
  alternatives. Volatility is coincident: it spikes *after* the drawdown, so you de-risk at the
  bottom and miss the recovery. Volatility is a sizing input, not a timing one.
- **Fast moving-average crossovers** — all lost to buy-and-hold.
- **A reversal-entry signal** — killed five separate ways, including a control that entered at
  *random* on the same days and **beat it**.
- **Two full position-management redesigns** — 13 configurations. None beat the null. The
  structural finding: the gap did not narrow as the logic improved, because every improvement
  worked by adding exposure, which lifted the benchmark in lockstep. That is the signature of
  pure beta.
- **A breakout / pyramid "buy strength" system** — looked like a clear winner at +5.2 points
  over its control, until attribution showed **two instruments** carried the entire result.
  Excluding them turned five years negative while still taking a 40% drawdown.
- **Removing a hysteresis band from the volatility governor** — cost ~0.6 points of annual
  return. Rejected.
- **The first version of the 2026-08-15 ladder change** — failed its own pre-registered risk
  bar (12.3% drawdown, Sharpe 0.40, no return gained over the prior version despite double the
  exposure). Attribution isolated leveraged instruments as the entire cause. Rejected and
  redesigned; see [CHANGELOG.md](CHANGELOG.md).

---

## 5. What survived

Two things, and neither is an edge:

**Participation.** Fixing the accumulation defect took average exposure from 18% to 54% and
annual return from 3.3% to 7.5%. But the null rose too. The remaining gap is **−1.5 points a
year** — the smallest the project has measured, and still a gap.

**Drawdown control.** Maximum drawdown of 11.3% against the index's 24.5% over the same window.
In 2022 the system returned +1.0% with a 3.4% intra-year drawdown while the index fell about
18%. Be precise about why: the long-term trend filter kept it roughly 13% invested for most of
that year, and much of the +1.0% is Treasury-bill yield. The claim is "the trend filter sat out
the bear market," not "it traded 2022 well."

---

## 6. What RAVE is therefore for

A deterministic, unattended system that stays roughly half invested, bounds its drawdown, and
publishes what it does every day — including its own defects and its own negative results.

It is a risk tool and an engineering artifact. It is not an alpha machine, and this document
exists so that nobody, including its author, can pretend otherwise later.

---

## 7. What this cannot tell you

**Five years is one market cycle, and mostly a rising one.** The window contains a single
sustained bear market and excludes the 2020 crash entirely. That cuts both ways, and both
directions are worth stating:

- It makes the *negative* results **less damning than they look**. A mostly-rising sample is
  the friendliest possible regime for simply holding the index and the most hostile one for a
  defensive system that holds cash. Losing to the null over this window is roughly what you
  would predict from a defensive design in a rising market. It is not proof the same gap holds
  across a full cycle.
- It makes the *positive* claim **less proven than it looks**. The drawdown result — the
  headline — rests on one slow, grinding bear market. This system has never been tested through
  a fast, gapping crash where correlations converge.

The archive also has gaps (roughly six months missing, one partial month). The comparison is
computed on the same date series for the system and for every benchmark, so no side is
flattered by them — but a period neither one was measured through is still a period neither one
was tested in.

**A backtest is not a prediction.** What this one did was *falsify*: every result came back
negative. Negative results survive sample bias considerably better than positive ones, because
the claim is not "this pattern will persist" but "this pattern was not there even where
conditions favoured finding it."
