// TradeWatch — Data Layer
// Deriv WebSocket connections, price fetchers, formatters


// ═══════════════════════════════════════════════
// DERIV WEBSOCKET — real-time price ticks
// Connects once, subscribes to all active assets.
// Falls back gracefully if unavailable.
// ═══════════════════════════════════════════════
// Two Deriv WS connections to stay within ~50 subscription limit per connection
// ws1 = forex, commodities, watchlist assets, hot list
// ws2 = synthetics (they need their own connection for volume)
let derivWs     = null;   // primary — forex, commodities, indices, watchlist
let derivWs2    = null;   // secondary — synthetic indices only
let derivReady  = false;
let derivReady2 = false;
let derivRetryTimer  = null;
let derivRetryTimer2 = null;

function getDerivSymbols() {
  // Assets in watchlist + hot list get subscribed
  const watchedIds = new Set(Object.values(ASSETS).flat().map(a => a.id));
  const hotIds     = new Set(Object.values(HOT_LIST).flat());
  const allIds     = new Set([...watchedIds, ...hotIds]);

  const fromWatchlist = ALL_ASSETS
    .filter(a => a.derivSym && allIds.has(a.id))
    .map(a => a.derivSym);

  // Synthetics are always subscribed — they run 24/7 and users expect
  // live prices when browsing the library even before adding to watchlist
  const synthSymbols = ALL_ASSETS
    .filter(a => a.cat === 'synthetics' && a.derivSym)
    .map(a => a.derivSym);

  return [...new Set([...fromWatchlist, ...synthSymbols])];
}

function resubscribeAllDeriv() {
  // Conn 1: non-synthetic assets in watchlist + hot list
  if (_conn1.ready && _conn1.ws && _conn1.ws.readyState === WebSocket.OPEN) {
    const nonSynthSyms = ALL_ASSETS
      .filter(a => a.derivSym && a.cat !== 'synthetics')
      .map(a => a.derivSym);
    nonSynthSyms.forEach(sym => _conn1.ws.send(JSON.stringify({ ticks: sym, subscribe: 1 })));
    derivReady = true;
  }
  // Conn 2: always covers all synthetics — already subscribed on connect
  if (_conn2.ws && _conn2.ws.readyState === WebSocket.OPEN) {
    derivReady2 = true;
  };
}

// ── Managed Deriv WS connection factory ─────────────────────────────────
function makeDerivWS(symbols, retryRef) {
  if (!symbols.length) return null;
  const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=" + DERIV_APP_ID);
  ws.onopen = () => {
    // Subscribe in batches of 25
    for (let i = 0; i < symbols.length; i += 25) {
      const batch = symbols.slice(i, i + 25);
      batch.forEach(sym => ws.send(JSON.stringify({ ticks: sym, subscribe: 1 })));
    }
    // Also request last-price snapshot for each symbol so price shows immediately
    // without waiting for the first natural tick
    symbols.forEach((sym, i) => {
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ ticks_history: sym, end: 'latest', count: 1, style: 'ticks' }));
      }, Math.floor(i / 20) * 200); // stagger in batches of 20
    });
    if (retryRef) retryRef.ready = true;
    setStatusPill(true);
  };
  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);

      // Last-price snapshot (ticks_history count:1) — sets initial price immediately
      if (msg.msg_type === 'history' && msg.history?.prices?.length) {
        const sym   = msg.echo_req?.ticks_history;
        const asset = sym ? ASSET_BY_DERIV.get(sym) : null;
        if (asset) {
          const price = parseFloat(msg.history.prices[msg.history.prices.length - 1]);
          if (price && !priceData[asset.id]?.price) {
            priceData[asset.id] = {
              price, change: '0.0000', high: price, low: price,
              open: price, vol: '—', mcap: '—', live: true, src: 'deriv',
            };
            prices[asset.id] = price;
          }
        }
        return;
      }

      // Live tick updates
      if (msg.msg_type === 'tick' && msg.tick) {
        const sym   = msg.tick.symbol;
        const asset = ASSET_BY_DERIV.get(sym);
        if (!asset) return;
        const newPrice = parseFloat(msg.tick.quote);
        if (!newPrice) return;
        const prev = priceData[asset.id];
        priceData[asset.id] = {
          price:  newPrice,
          change: prev && prev.open ? (((newPrice - prev.open) / prev.open) * 100).toFixed(4) : '0.0000',
          high:   prev && prev.high ? Math.max(prev.high, newPrice) : newPrice,
          low:    prev && prev.low  ? Math.min(prev.low,  newPrice) : newPrice,
          open:   (prev && prev.open) || newPrice,
          vol: '—', mcap: '—', live: true, src: 'deriv',
        };
        prices[asset.id] = newPrice;
      }
    } catch(e) {}
  };
  ws.onclose = (e) => {
    if (retryRef) retryRef.ready = false;
    if (e.code !== 1000 && retryRef) {
      retryRef.timer = setTimeout(() => {
        retryRef.ws = makeDerivWS(symbols, retryRef);
      }, 10000);
    }
  };
  ws.onerror = () => { try { ws.close(); } catch(err) {} };
  return ws;
}

const _conn1 = { ws: null, ready: false, timer: null };
const _conn2 = { ws: null, ready: false, timer: null };

function connectDeriv() {
  // Connection 1: forex, commodities, indices, stock CFDs on Deriv
  const nonSynthSyms = ALL_ASSETS
    .filter(a => a.derivSym && a.cat !== 'synthetics')
    .map(a => a.derivSym);

  if (!_conn1.ws || _conn1.ws.readyState > 1) {
    clearTimeout(_conn1.timer);
    _conn1.ws = makeDerivWS(nonSynthSyms, _conn1);
    derivWs   = _conn1.ws;
  }

  // Connection 2: synthetic indices (separate — high subscription volume)
  const synthSyms = ALL_ASSETS
    .filter(a => a.cat === 'synthetics' && a.derivSym)
    .map(a => a.derivSym);

  if (!_conn2.ws || _conn2.ws.readyState > 1) {
    clearTimeout(_conn2.timer);
    _conn2.ws = makeDerivWS(synthSyms, _conn2);
    derivWs2  = _conn2.ws;
  }
}

function connectDerivSynthetics() {
  const synthSyms = ALL_ASSETS
    .filter(a => a.cat === 'synthetics' && a.derivSym)
    .map(a => a.derivSym);
  if (!_conn2.ws || _conn2.ws.readyState > 1) {
    clearTimeout(_conn2.timer);
    _conn2.ws = makeDerivWS(synthSyms, _conn2);
    derivWs2  = _conn2.ws;
  }
}

function subscribeDerivAsset(asset) {
  if (!asset.derivSym) return;
  const conn  = asset.cat === 'synthetics' ? _conn2 : _conn1;
  if (conn.ready && conn.ws && conn.ws.readyState === WebSocket.OPEN) {
    conn.ws.send(JSON.stringify({ ticks: asset.derivSym, subscribe: 1 }));
  }
}

// ═══════════════════════════════════════════════
// OANDA REST — snapshot prices (when key provided)
// Batch call — one request for all OANDA symbols.
// ═══════════════════════════════════════════════
async function fetchOandaSnapshot(assets) {
  if (!OANDA_KEY || !assets.length) return;
  const instruments = assets.map(a => a.oandaSym).filter(Boolean).join(',');
  if (!instruments) return;
  try {
    const res = await fetch(`${OANDA_BASE}/accounts/${OANDA_ACCOUNT}/pricing?instruments=${instruments}`, {
      headers: { 'Authorization': `Bearer ${OANDA_KEY}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    (data.prices || []).forEach(p => {
      const asset = ASSET_BY_OANDA.get(p.instrument);
      if (!asset) return;
      const bid   = parseFloat(p.bids?.[0]?.price  || 0);
      const ask   = parseFloat(p.asks?.[0]?.price  || 0);
      const price = (bid + ask) / 2;
      if (!price) return;
      const prev = priceData[asset.id];
      priceData[asset.id] = {
        price,
        change: prev?.open ? (((price - prev.open) / prev.open) * 100).toFixed(4) : '0.0000',
        high:   prev?.high  ? Math.max(prev.high, price) : price,
        low:    prev?.low   ? Math.min(prev.low,  price) : price,
        open:   prev?.open  || price,
        vol:    '—', mcap: '—', live: true, src: 'oanda',
      };
      prices[asset.id] = price;
    });
  } catch(e) { console.warn('OANDA snapshot failed:', e); }
}

// ═══════════════════════════════════════════════
// COINGECKO — crypto spot prices (batch)
// ═══════════════════════════════════════════════
function formatVol(n) {
  if (n >= 1e12) return (n/1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n/1e9).toFixed(1)  + 'B';
  if (n >= 1e6)  return (n/1e6).toFixed(1)  + 'M';
  return n?.toLocaleString() || '—';
}

async function fetchCryptoPrices(assets) {
  const cgIds = assets.map(a => a.cgId).filter(Boolean).join(',');
  if (!cgIds) return false;
  try {
    const res  = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${cgIds}` +
      `&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    );
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Bad CoinGecko response');
    data.forEach(coin => {
      const asset = ASSET_BY_CG.get(coin.id);
      if (!asset) return;
      const price = coin.current_price;
      priceData[asset.id] = {
        price,
        change: coin.price_change_percentage_24h?.toFixed(4) || '0.0000',
        high:   coin.high_24h,
        low:    coin.low_24h,
        open:   coin.current_price - (coin.price_change_24h || 0),
        vol:    coin.total_volume ? formatVol(coin.total_volume) : '—',
        mcap:   coin.market_cap   ? formatVol(coin.market_cap)   : '—',
        live:   true, src: 'coingecko',
      };
      prices[asset.id] = price;
    });
    return true;
  } catch(e) { console.warn('CoinGecko failed:', e); return false; }
}


// ═══════════════════════════════════════════════
// MAIN FETCH — orchestrates all broker sources
// Deriv WebSocket handles real-time ticks.
// This REST fetch fills initial prices + OHLC.
// ═══════════════════════════════════════════════
async function fetchAllPrices() {
  // Collect all assets currently needed (watchlist + hot list assets)
  const watchedIds = new Set(Object.values(ASSETS).flat().map(a => a.id));
  const hotIds     = new Set(Object.values(HOT_LIST).flat());
  const allNeeded  = [...new Set([...watchedIds, ...hotIds])].map(id => ASSET_BY_ID.get(id)).filter(Boolean);

  // Partition by source — skip 'unavailable' assets entirely
  const cryptoAssets = allNeeded.filter(a => a.sources?.includes('coingecko'));
  // OANDA: fetch for ALL assets with oandaSym (including deriv+oanda) for initial price
  // Deriv WS will take over with ticks once connected; OANDA gives us the first snapshot
  const oandaAssets  = allNeeded.filter(a => OANDA_KEY && a.oandaSym && a.cat !== 'crypto');
  // Note: Deriv assets are handled by the persistent WebSocket (connectDeriv)
  // This REST call only handles CoinGecko + OANDA initial snapshots

  await Promise.all([
    cryptoAssets.length ? fetchCryptoPrices(cryptoAssets) : Promise.resolve(),
    oandaAssets.length  ? fetchOandaSnapshot(oandaAssets) : Promise.resolve(),
  ]);

  checkAlerts();
  const el = document.getElementById('lastUpdate');
  if (el) el.textContent = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}


// ═══════════════════════════════════════════════
async function fetchSingleAsset(asset) {
  if (!asset) return;
  if (asset.sources?.includes('coingecko')) {
    await fetchCryptoPrices([asset]); return;
  }
  if (OANDA_KEY && asset.oandaSym && !asset.sources?.includes('deriv')) {
    await fetchOandaSnapshot([asset]); return;
  }
  // Deriv assets: covered by WebSocket subscription — subscribe if not already
  if (asset.derivSym) {
    subscribeDerivAsset(asset);
  }
  // unavailable: no live price source — price stays blank
}

// Format a triggeredAt value (ISO string, timestamp, or locale string) → readable time
function formatTriggeredAt(val) {
  if (!val || val === 'null') return '—';
  // Already a locale time string (e.g. "11:02 AM")
  if (typeof val === 'string' && !val.includes('T') && !val.includes('-')) return val;
  // ISO string or timestamp
  try {
    const d = new Date(typeof val === 'number' ? val : val);
    if (!isNaN(d)) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch(e) {}
  return String(val);
}

function formatPrice(p, id) {
  if (!p) return '';
  if (p < 0.01) return '$' + p.toFixed(6);
  if (p < 1) return '$' + p.toFixed(4);
  if (id && (id.includes('/') && !id.startsWith('XAU') && !id.startsWith('XAG'))) return p.toFixed(4);
  return '$' + p.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
