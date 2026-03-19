// TradeWatch — Chart Engine
// Lightweight Charts, OHLC fetchers, alert price lines


let lwChart        = null;
let lwSeries       = null;
let lwAlertLines   = [];
let lwCurrentTF    = '1D'; // default
let lwCurrentAsset = null;

// ── Timeframe config ──────────────────────────────────────────────────────
// Deriv valid granularities (seconds): 60 120 180 300 600 900 1800 3600 7200 14400 28800 86400
// Binance supports: 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M
// Counts are generous — Deriv max is 5000, Binance max is 1000
const TF_CONFIG = {
  '1m':  { granularity:    60, count: 500,  binance: '1m'  }, // ~8 hours
  '5m':  { granularity:   300, count: 500,  binance: '5m'  }, // ~1.7 days
  '15m': { granularity:   900, count: 500,  binance: '15m' }, // ~5 days
  '30m': { granularity:  1800, count: 500,  binance: '30m' }, // ~10 days
  '1H':  { granularity:  3600, count: 500,  binance: '1h'  }, // ~21 days
  '4H':  { granularity: 14400, count: 500,  binance: '4h'  }, // ~83 days
  '1D':  { granularity: 86400, count: 365,  binance: '1d'  }, // 1 year
  '1W':  { granularity: 86400, count: 365,  binance: '1d'  }, // use daily, group to weekly display
  '1M':  { granularity: 86400, count: 730,  binance: '1d'  }, // use daily, group to monthly display
};

const BINANCE_SYMBOL = {
  'bitcoin':'BTCUSDT',       'ethereum':'ETHUSDT',      'solana':'SOLUSDT',
  'ripple':'XRPUSDT',        'binancecoin':'BNBUSDT',   'dogecoin':'DOGEUSDT',
  'cardano':'ADAUSDT',       'avalanche-2':'AVAXUSDT',  'chainlink':'LINKUSDT',
  'litecoin':'LTCUSDT',      'polkadot':'DOTUSDT',      'shiba-inu':'SHIBUSDT',
  'uniswap':'UNIUSDT',       'cosmos':'ATOMUSDT',       'stellar':'XLMUSDT',
  'monero':'XMRUSDT',        'tron':'TRXUSDT',          'aave':'AAVEUSDT',
  'near':'NEARUSDT',         'aptos':'APTUSDT',         'arbitrum':'ARBUSDT',
  'optimism':'OPUSDT',       'sui':'SUIUSDT',           'toncoin':'TONUSDT',
  'pepe':'PEPEUSDT',         'bonk':'BONKUSDT',         'maker':'MKRUSDT',
  'kaspa':'KASUSDT',         'render-token':'RENDERUSDT','fetch-ai':'FETUSDT',
  'worldcoin-wld':'WLDUSDT','celestia':'TIAUSDT',       'starknet':'STRKUSDT',
  'hedera':'HBARUSDT',       'vechain':'VETUSDT',       'algorand':'ALGOUSDT',
  'internet-computer':'ICPUSDT','filecoin':'FILUSDT',
  'injective-protocol':'INJUSDT','sei-network':'SEIUSDT',
  'immutable-x':'IMXUSDT',  'polygon':'MATICUSDT',
};
// Binance intervals now stored in TF_CONFIG.binance

// ── Timeframe button handler ───────────────────────────────────────────────
function setChartTF(tf) {
  lwCurrentTF = tf;
  document.querySelectorAll('.chart-tf-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === tf);
  });
  if (lwCurrentAsset) loadLWChart(lwCurrentAsset);
}

// ── Create chart instance ──────────────────────────────────────────────────
function ensureLWChart() {
  const container = document.getElementById('lw-chart');
  if (!container) return false;
  if (lwChart) return true; // already created

  // Measure from the parent tv-container (has explicit CSS height)
  const tvCont = document.getElementById('tv-container');
  const w = (tvCont && tvCont.offsetWidth  > 10 ? tvCont.offsetWidth  : 400);
  const h = (tvCont && tvCont.offsetHeight > 10 ? tvCont.offsetHeight : 460);

  lwChart = LightweightCharts.createChart(container, {
    width:  w,
    height: h,
    layout: {
      background: { type: 'solid', color: '#080c12' },
      textColor:  '#8899aa',
      fontSize:   11,
    },
    grid: {
      vertLines: { color: 'rgba(26,45,69,0.4)' },
      horzLines: { color: 'rgba(26,45,69,0.4)' },
    },
    crosshair: { mode: 1 }, // 1 = Normal
    rightPriceScale: { borderColor: 'rgba(26,45,69,0.6)' },
    timeScale: {
      borderColor:    'rgba(26,45,69,0.6)',
      timeVisible:    true,
      secondsVisible: false,
      rightOffset:    8,
    },
    handleScroll: true,
    handleScale:  true,
  });

  lwSeries = lwChart.addCandlestickSeries({
    upColor:         '#26a69a',
    downColor:       '#ef5350',
    borderUpColor:   '#26a69a',
    borderDownColor: '#ef5350',
    wickUpColor:     '#26a69a',
    wickDownColor:   '#ef5350',
  });

  // Resize observer — keeps chart sized to its container
  try {
    const ro = new ResizeObserver(() => {
      if (!lwChart || !tvCont) return;
      const nw = tvCont.offsetWidth;
      const nh = tvCont.offsetHeight;
      if (nw > 10 && nh > 10) lwChart.applyOptions({ width: nw, height: nh });
    });
    ro.observe(tvCont || container);
  } catch(e) {}

  return true;
}

// ── Loading overlay ────────────────────────────────────────────────────────
function setChartLoading(on) {
  const el = document.getElementById('chart-loading');
  if (el) el.classList.toggle('visible', on);
}

// ── Main chart loader ──────────────────────────────────────────────────────
async function loadLWChart(asset) {
  if (!asset) return;
  // Don't reload chart while user is actively filling the alert form
  // It causes the page to scroll back up mid-input
  if (userTypingInForm) return;
  lwCurrentAsset = asset;

  // Destroy stale chart so it remeasures correctly
  if (lwChart) {
    try { lwChart.remove(); } catch(e) {}
    lwChart = null; lwSeries = null; lwAlertLines = [];
  }
  if (!ensureLWChart()) return;
  setChartLoading(true);

  const candles = await fetchOHLC(asset, lwCurrentTF);

  setChartLoading(false);
  if (!candles || candles.length === 0) {
    showChartMsg('No chart data available for ' + asset.symbol);
    return;
  }

  hideChartMsg();
  try {
    lwSeries.setData(candles);
    // Show last ~80 candles on screen by default, but allow scrolling back
    const ts = lwChart.timeScale();
    ts.fitContent();
    // After fitContent, zoom in to show last 80 bars so chart isn't squished
    if (candles.length > 80) {
      const last80 = candles.slice(-80);
      ts.setVisibleRange({
        from: last80[0].time,
        to:   candles[candles.length - 1].time,
      });
    }
    // Allow scrolling past the right edge and back into history
    lwChart.applyOptions({
      timeScale: {
        rightOffset:   5,
        barSpacing:    8,
        fixLeftEdge:   false,
        fixRightEdge:  false,
        lockVisibleTimeRangeOnResize: false,
      },
    });
  } catch(e) {
    console.warn('LW setData error:', e);
  }

  drawAlertLines(asset.id);
}

// ── OHLC routing ──────────────────────────────────────────────────────────
async function fetchOHLC(asset, tf) {
  const cfg = TF_CONFIG[tf] || TF_CONFIG['1D'];

  // ── Crypto path ──────────────────────────────────────────────────────────
  if (asset.cat === 'crypto' || BINANCE_SYMBOL[asset.id]) {
    // Race Binance (direct + proxy) against Deriv CFD in parallel
    // First valid response wins — eliminates sequential timeout waits
    const racers = [];

    if (BINANCE_SYMBOL[asset.id]) {
      // Direct Binance
      racers.push(fetchBinanceOHLC(asset.id, cfg, tf, false));
      // Proxied Binance (slight delay so direct gets priority)
      racers.push(
        new Promise(r => setTimeout(r, 300))
          .then(() => fetchBinanceOHLC(asset.id, cfg, tf, true))
      );
    }

    // Deriv CFD for BTC/ETH/SOL/XRP/DOGE/ADA/LTC
    if (asset.derivSym) {
      racers.push(fetchDerivOHLC(asset.derivSym, cfg));
    }

    if (racers.length) {
      // Use Promise.any — resolves with first non-null result
      const d = await raceForData(racers);
      if (d && d.length) return d;
    }

    // Last resort: CoinGecko OHLC (30min/4H/1D granularity only)
    if (asset.cgId) {
      const d = await fetchCoinGeckoOHLC(asset, cfg, tf);
      if (d && d.length) return d;
    }

    return null;
  }

  // ── Forex / commodities / synthetics / indices → Deriv WebSocket ─────────
  if (asset.derivSym) {
    const d = await fetchDerivOHLC(asset.derivSym, cfg);
    if (d && d.length) return d;
  }

  // ── Stocks CFD → OANDA ───────────────────────────────────────────────────
  if (OANDA_KEY && asset.oandaSym) {
    const d = await fetchOandaOHLC(asset.oandaSym, cfg);
    if (d && d.length) return d;
  }

  return null;
}

// ── CoinGecko OHLC — crypto fallback ────────────────────────────────────
async function fetchCoinGeckoOHLC(asset, cfg, tf) {
  if (!asset.cgId) return null;
  // CoinGecko OHLC free tier auto-selects granularity by days param:
  //   days=1  → 30-min candles (best for 1m/5m/15m/30m/1H)
  //   days=7  → 4H candles     (best for 4H)
  //   days=90 → daily candles  (best for 1D)
  //   days=365→ daily candles  (best for 1W/1M)
  const daysMap = { '1m':1,'5m':1,'15m':1,'30m':1,'1H':1,'4H':7,'1D':90,'1W':365,'1M':365 };
  const days = daysMap[tf] || 90;
  try {
    const res  = await fetch(
      `https://api.coingecko.com/api/v3/coins/${asset.cgId}/ohlc?vs_currency=usd&days=${days}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const raw = dedupe(data.map(([t, o, h, l, c]) => ({
      time: Math.floor(t / 1000), open: o, high: h, low: l, close: c,
    })));
    if (tf === '1W') return aggregateCandles(raw, 'week');
    if (tf === '1M') return aggregateCandles(raw, 'month');
    return raw;
  } catch(e) { console.warn('CoinGecko OHLC:', e); return null; }
}

// ── Binance klines — crypto ────────────────────────────────────────────────
async function fetchBinanceOHLC(assetId, cfg, tf, useProxy = false) {
  const sym      = BINANCE_SYMBOL[assetId];
  if (!sym) return null;
  const interval = cfg.binance || '1d';
  const limit    = Math.min(cfg.count, 1000);
  const directUrl = `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`;
  const url = useProxy
    ? `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`
    : directUrl;
  try {
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const raw = dedupe(data.map(k => ({
      time: Math.floor(k[0] / 1000),
      open: +k[1], high: +k[2], low: +k[3], close: +k[4],
    })));
    // For 1W and 1M, aggregate daily candles into weekly/monthly bars
    if (tf === '1W') return aggregateCandles(raw, 'week');
    if (tf === '1M') return aggregateCandles(raw, 'month');
    return raw;
  } catch(e) { console.warn('Binance OHLC:', e); return null; }
}

// Aggregate daily candles into weekly or monthly bars
function aggregateCandles(candles, period) {
  if (!candles.length) return [];
  const groups = {};
  candles.forEach(c => {
    const d = new Date(c.time * 1000);
    let key;
    if (period === 'week') {
      // Start of the ISO week (Monday)
      const day = d.getUTCDay() || 7;
      const mon = new Date(d);
      mon.setUTCDate(d.getUTCDate() - day + 1);
      mon.setUTCHours(0, 0, 0, 0);
      key = Math.floor(mon.getTime() / 1000);
    } else {
      // Start of the month
      key = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000);
    }
    if (!groups[key]) groups[key] = { time: key, open: c.open, high: c.high, low: c.low, close: c.close };
    else {
      groups[key].high  = Math.max(groups[key].high,  c.high);
      groups[key].low   = Math.min(groups[key].low,   c.low);
      groups[key].close = c.close;
    }
  });
  return Object.values(groups).sort((a, b) => a.time - b.time);
}

// ── Deriv WebSocket candles ──────────────────────────────────────────────
// Uses the live derivWs if open — avoids opening a new WS per chart request.
// Falls back to a dedicated one-shot WS if live connection isn't ready.
const _derivOHLCCallbacks = new Map(); // reqId → resolve fn

function fetchDerivOHLC(derivSym, cfg) {
  return new Promise(resolve => {
    const reqId  = `ohlc_${derivSym}_${Date.now()}`;
    let   done   = false;
    const finish = (result) => { if (!done) { done = true; resolve(result); } };

    // Register callback so onmessage can route the response back
    _derivOHLCCallbacks.set(reqId, finish);
    const t = setTimeout(() => {
      _derivOHLCCallbacks.delete(reqId);
      finish(null);
    }, 10000);

    const req = {
      ticks_history:     derivSym,
      style:             'candles',
      granularity:       cfg.granularity,
      count:             cfg.count,
      end:               'latest',
      adjust_start_time: 1,
      req_id:            reqId, // echo'd back in response
    };

    const sendReq = (ws) => ws.send(JSON.stringify(req));

    // Try live WS first
    if (derivWs && derivWs.readyState === WebSocket.OPEN) {
      sendReq(derivWs);
    } else {
      // Fallback: dedicated one-shot WS
      const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`);
      ws.onopen    = () => sendReq(ws);
      ws.onmessage = (evt) => handleDerivOHLCMsg(JSON.parse(evt.data), ws);
      ws.onerror   = () => { clearTimeout(t); _derivOHLCCallbacks.delete(reqId); finish(null); };
    }
  });
}

function handleDerivOHLCMsg(msg, wsToClose) {
  // Route candle responses to the correct pending callback via req_id
  const reqId  = msg.req_id || msg.echo_req?.req_id;
  const cb     = reqId ? _derivOHLCCallbacks.get(reqId) : null;

  if (msg.msg_type === 'candles' || msg.candles) {
    if (cb) {
      _derivOHLCCallbacks.delete(reqId);
      const raw = msg.candles || [];
      if (wsToClose) try { wsToClose.close(); } catch(e) {}
      cb(raw.length ? dedupe(raw.map(c => ({
        time: c.epoch,
        open: +c.open, high: +c.high, low: +c.low, close: +c.close,
      }))) : null);
    }
  } else if (msg.error && cb) {
    _derivOHLCCallbacks.delete(reqId);
    if (wsToClose) try { wsToClose.close(); } catch(e) {}
    console.warn('Deriv candles error:', msg.error.message);
    cb(null);
  }
}

// ── OANDA mid-price candles — stocks CFD ──────────────────────────────────
async function fetchOandaOHLC(oandaSym, cfg) {
  const tfGranMap = {
    '1m':'M1','5m':'M5','15m':'M15','30m':'M30',
    '1H':'H1','4H':'H4','1D':'D','1W':'W','1M':'M'
  };
  const gran = tfGranMap[lwCurrentTF] || 'D';
  try {
    const res = await fetch(
      `${OANDA_BASE}/instruments/${oandaSym}/candles?granularity=${gran}&count=${cfg.count}&price=M`,
      { headers: { Authorization: `Bearer ${OANDA_KEY}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.candles?.length) return null;
    return dedupe(
      data.candles
        .filter(c => c.complete !== false)
        .map(c => ({
          time:  Math.floor(new Date(c.time).getTime() / 1000),
          open:  +c.mid.o, high: +c.mid.h, low: +c.mid.l, close: +c.mid.c,
        }))
    );
  } catch(e) { console.warn('OANDA OHLC:', e); return null; }
}

// ── Helpers ────────────────────────────────────────────────────────────────
// Race multiple OHLC fetches — returns first non-null, non-empty result
async function raceForData(promises) {
  return new Promise(resolve => {
    let settled = 0;
    const total = promises.length;
    if (!total) return resolve(null);
    promises.forEach(p => {
      Promise.resolve(p).then(result => {
        settled++;
        if (result && result.length) {
          resolve(result); // first valid result wins
        } else if (settled === total) {
          resolve(null); // all exhausted with no data
        }
      }).catch(() => {
        settled++;
        if (settled === total) resolve(null);
      });
    });
  });
}

function dedupe(candles) {
  const seen = new Set();
  return candles
    .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true; })
    .sort((a, b) => a.time - b.time);
}

function showChartMsg(msg) {
  const el = document.getElementById('chart-msg');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 6000);
}
function hideChartMsg() {
  const el = document.getElementById('chart-msg');
  if (el) el.classList.remove('visible');
}

// ── Alert price lines ──────────────────────────────────────────────────────
function clearAlertLines() {
  lwAlertLines.forEach(l => { try { if (lwSeries) lwSeries.removePriceLine(l); } catch(e){} });
  lwAlertLines = [];
}

function drawAlertLines(assetId) {
  if (!lwSeries) return;
  clearAlertLines();
  alerts
    .filter(a => a.assetId === assetId && a.status === 'active')
    .forEach(alert => {
      const green = '#00e676', red = '#ff3d5a', cyan = '#00d4ff', gold = '#f0b429';
      if (alert.condition === 'zone') {
        [[alert.zoneLow, 'Zone Low'], [alert.zoneHigh, 'Zone High']].forEach(([price, lbl]) => {
          try {
            lwAlertLines.push(lwSeries.createPriceLine({
              price, color: cyan, lineWidth: 1, lineStyle: 2, // 2 = Dashed
              axisLabelVisible: true,
              title: lbl + (alert.note ? ' · ' + alert.note : ''),
            }));
          } catch(e) {}
        });
      } else {
        const color = alert.condition === 'above' ? green : alert.condition === 'tap' ? gold : red;
        const pfx   = alert.condition === 'above' ? '▲ ' : alert.condition === 'tap' ? '◎ ' : '▼ ';
        try {
          lwAlertLines.push(lwSeries.createPriceLine({
            price: alert.targetPrice, color, lineWidth: 1, lineStyle: 2,
            axisLabelVisible: true,
            title: pfx + formatPrice(alert.targetPrice, assetId) + (alert.note ? ' · ' + alert.note : ''),
          }));
        } catch(e) {}
      }
    });
}

// ── Compat stubs for old call sites ───────────────────────────────────────
function loadTVChart(asset)   { loadLWChart(asset); }
function getTVSymbol()        { return ''; }
function generateChartData()  {}
function drawChart()          {}
function setTF()              {}
