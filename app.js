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

/* Weekdays strictly between the as-of date and today (UTC). Not holiday-aware:
   a Monday market holiday can flag a false warning until Tuesday's 10AM run
   clears it — acceptable next to a real failure going unnoticed. */
function tradingDaysSince(asOfIso) {
  const asOf = new Date(asOfIso);
  if (isNaN(asOf)) return 0;
  const d = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let days = 0;
  while (d < end) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) days++;
  }
  return days;
}

function renderFreshness(asOfIso) {
  const el = $("#fresh");
  if (!el || !asOfIso) return;
  const date = asOfIso.slice(0, 10);
  const stale = tradingDaysSince(asOfIso) > 1;
  el.classList.toggle("stale", stale);
  el.classList.toggle("ok", !stale);
  el.textContent = stale ? `⚠ NO ENGINE REPORT SINCE ${date}` : `ENGINE REPORTED ${date}`;
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

/* Trade log: newest first, PAGE_SIZE rows per page, scrolling inside a fixed-height
   box with a sticky header. The pager is created here, not in index_template.html,
   so this ships without touching the engine's publisher. */
const PAGE_SIZE = 25;

function tradeRow(t) {
  return `<tr>
      <td>${t.date}</td><td>${t.symbol}</td><td>${t.action}</td><td>${t.side}</td>
      <td class="num">${t.qty}</td><td class="num">$${t.price.toFixed(2)}</td>
      <td class="num ${cls(t.realized_pnl)}">${t.realized_pnl ? fmtUsd(t.realized_pnl) : "—"}</td>
      <td>${t.rule}</td><td class="num">${t.vix == null ? "—" : Number(t.vix).toFixed(1)}</td>
    </tr>`;
}

function renderTrades(trades) {
  const tbody = $("#trades tbody");
  if (!trades.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty">No fills yet — the engine is waiting for its first signal.</td></tr>`;
    return;
  }
  $("#tradecount").textContent = `(${trades.length} fills, newest first)`;

  const wrap = $("#trades").closest(".table-wrap");
  wrap.classList.add("scroll");
  let pager = $("#pager");
  if (!pager) {
    pager = document.createElement("nav");
    pager.id = "pager";
    pager.className = "pager";
    pager.setAttribute("aria-label", "Trade log pages");
    wrap.after(pager);
  }

  const pages = Math.ceil(trades.length / PAGE_SIZE);
  let page = 0;

  function show(p) {
    page = Math.max(0, Math.min(pages - 1, p));
    const from = page * PAGE_SIZE;
    const to = Math.min(from + PAGE_SIZE, trades.length);
    tbody.innerHTML = trades.slice(from, to).map(tradeRow).join("");
    wrap.scrollTop = 0;
    if (pages <= 1) { pager.hidden = true; return; }
    pager.innerHTML = `
      <button type="button" data-go="first" ${page === 0 ? "disabled" : ""} aria-label="First page">«</button>
      <button type="button" data-go="prev" ${page === 0 ? "disabled" : ""}>‹ Newer</button>
      <span class="muted">${from + 1}–${to} of ${trades.length} · page ${page + 1}/${pages}</span>
      <button type="button" data-go="next" ${page === pages - 1 ? "disabled" : ""}>Older ›</button>
      <button type="button" data-go="last" ${page === pages - 1 ? "disabled" : ""} aria-label="Last page">»</button>`;
  }

  pager.onclick = (e) => {
    const go = e.target.closest("button")?.dataset.go;
    if (!go) return;
    show({ first: 0, prev: page - 1, next: page + 1, last: pages - 1 }[go]);
  };
  show(0);
}

async function main() {
  // Baked at commit time — works even if the JSON fetch below fails.
  renderFreshness($("#fresh")?.dataset.asof);
  try {
    const [summary, nav, trades] = await Promise.all([load("summary"), load("nav"), load("trades")]);
    renderHeadline(summary);
    renderTiles(summary);
    renderCharts(nav, summary.starting_cash);
    renderTrades(trades);
    renderFreshness(summary.as_of);
    $("#asof").textContent = `data as of ${summary.as_of} (UTC)`;
  } catch (err) {
    // Headline numbers are static text baked at commit time — leave them up.
    console.error("dashboard data load failed:", err);
  }
}

main();
