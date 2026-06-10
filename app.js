/* RAVE track record — renders data/{summary,nav,trades}.json. No build step. */
"use strict";

const $ = (sel) => document.querySelector(sel);
const fmtUsd = (x) => "$" + Number(x).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtPct = (x, digits = 2) =>
  x == null ? "—" : (x * 100 >= 0 ? "+" : "") + (x * 100).toFixed(digits) + "%";
const cls = (x) => (x > 0 ? "pos" : x < 0 ? "neg" : "");

const PLOT_LAYOUT = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { color: "#8b949e", size: 12 },
  margin: { l: 70, r: 16, t: 8, b: 36 },
  xaxis: { gridcolor: "#21262d" },
  yaxis: { gridcolor: "#21262d" },
  showlegend: false,
};
const PLOT_CONFIG = { displayModeBar: false, responsive: true };

async function load(name) {
  const res = await fetch(`data/${name}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${name}.json ${res.status}`);
  return res.json();
}

function renderHeadline(s) {
  $("#headline").innerHTML = `
    <span>NAV <b>${fmtUsd(s.current_nav)}</b></span>
    <span>Total return <b class="${cls(s.total_return)}">${fmtPct(s.total_return)}</b></span>
    <span>Drawdown <b class="${cls(-s.current_drawdown)}">${fmtPct(-s.current_drawdown)}</b></span>
    <span>Sessions <b>${s.sessions}</b></span>`;
}

function renderTiles(s) {
  const building = `building — ${s.sessions}/20 sessions`;
  const gated = (v, render) => (s.sharpe_ready && v != null ? render(v) : building);
  const tiles = [
    ["Sharpe (ann.)", gated(s.sharpe, (v) => v.toFixed(2)), s.sharpe],
    ["Ann. return", gated(s.annualized_return, fmtPct), s.annualized_return],
    ["Ann. volatility", gated(s.annualized_vol, (v) => fmtPct(v).replace("+", "")), 0],
    ["Max drawdown", fmtPct(-s.max_drawdown), -s.max_drawdown],
    ["Win rate", s.win_rate == null ? "—" : (s.win_rate * 100).toFixed(0) + "%", 0],
    ["Profit factor", s.profit_factor == null ? "—" : s.profit_factor.toFixed(2), 0],
    ["Closed trades", String(s.n_closed), 0],
    ["Realized P&L", fmtUsd(s.total_realized), s.total_realized],
  ];
  $("#tiles").innerHTML = tiles
    .map(([label, value, sign]) => {
      const buildingTile = String(value).startsWith("building");
      return `<div class="tile"><div class="label">${label}</div>
        <div class="value ${buildingTile ? "building" : cls(sign)}">${value}</div></div>`;
    })
    .join("");
}

function renderCharts(nav, startingCash) {
  const dates = nav.map((r) => r.date);
  const navs = nav.map((r) => r.nav);
  // A 0–1 point curve renders as an awkward dot; anchor with the starting cash.
  if (nav.length <= 1) {
    dates.unshift("start");
    navs.unshift(startingCash);
  }
  Plotly.newPlot("equity", [{
    x: dates, y: navs, mode: "lines+markers",
    line: { color: "#3fb950", width: 2 }, marker: { size: 4 },
    hovertemplate: "%{x}<br>NAV $%{y:,.0f}<extra></extra>",
  }], { ...PLOT_LAYOUT, yaxis: { ...PLOT_LAYOUT.yaxis, tickprefix: "$", tickformat: ",.0f" } }, PLOT_CONFIG);

  Plotly.newPlot("drawdown", [{
    x: nav.map((r) => r.date), y: nav.map((r) => -r.drawdown_pct * 100),
    mode: "lines", fill: "tozeroy",
    line: { color: "#f85149", width: 1.5 }, fillcolor: "rgba(248,81,73,.15)",
    hovertemplate: "%{x}<br>drawdown %{y:.2f}%<extra></extra>",
  }], { ...PLOT_LAYOUT, margin: { ...PLOT_LAYOUT.margin, b: 24 },
        yaxis: { ...PLOT_LAYOUT.yaxis, ticksuffix: "%", rangemode: "tozero" } }, PLOT_CONFIG);
}

function renderTrades(trades) {
  const tbody = $("#trades tbody");
  if (!trades.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty">No fills yet — the engine is waiting for its first signal.</td></tr>`;
    return;
  }
  $("#tradecount").textContent = `(latest ${trades.length})`;
  tbody.innerHTML = trades
    .map((t) => `<tr>
      <td>${t.date}</td><td>${t.symbol}</td><td>${t.action}</td><td>${t.side}</td>
      <td class="num">${t.qty}</td><td class="num">$${t.price.toFixed(2)}</td>
      <td class="num ${cls(t.realized_pnl)}">${t.realized_pnl ? fmtUsd(t.realized_pnl) : "—"}</td>
      <td>${t.rule}</td><td class="num">${t.vix ?? "—"}</td>
    </tr>`)
    .join("");
}

async function main() {
  try {
    const [summary, nav, trades] = await Promise.all([load("summary"), load("nav"), load("trades")]);
    renderHeadline(summary);
    renderTiles(summary);
    renderCharts(nav, summary.starting_cash);
    renderTrades(trades);
    $("#asof").textContent = `data as of ${summary.as_of} (UTC)`;
  } catch (err) {
    $("#headline").textContent = `failed to load data: ${err.message}`;
  }
}

main();
