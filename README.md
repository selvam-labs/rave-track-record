# RAVE — Live Paper Track Record

**Dashboard: https://selvam-labs.github.io/rave-track-record/**

This repo is the public, tamper-evident track record of **RAVE** (Raja Automated
Volatility Engine) — a fully automated, deterministic, rules-only paper-trading
engine.

## How this works

- RAVE runs unattended on AWS Lambda every trading day at **10:00 AM ET**,
  trades an Alpaca **paper** account, and commits its results here — `data/summary.json`,
  `data/nav.json`, `data/trades.json` — in the same run.
- **The commit history is the audit trail.** Every data point was committed by the
  engine on the day it happened. Nothing is backfilled; nothing can be, without it
  showing in the git history.
- The dashboard (`index.html`) is a static GitHub Pages site that renders those
  three JSON files. No server, no build step.

## The engine, in one paragraph

A locked rule set, no discretion: status-timed entries and exits, a VIX-regime
position governor that caps position size per volatility band, a 325-session
trend gate, per-position hard stop-losses, and a portfolio-level drawdown
circuit breaker. Sharpe and annualized statistics stay hidden until 20 sessions
exist — before that they are noise, and an honest "building" beats a fake number.

## What this is not

- Not real money (paper account).
- Not investment advice.
- Not discretionary — humans don't pick the trades, the rule set does.

The engine's source code is in a separate (currently private) repository,
scheduled to be published after its security audit.

---

*Data files are written only by the engine's daily run. Manual commits touch
dashboard code, never `data/`.*
