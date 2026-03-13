// ═══════════════════════════════════════════════
// API KEYS
// ═══════════════════════════════════════════════
const TD_KEY   = '6d7175c59a1546a28e37b0b23c402ec5'; // Twelve Data (indices fallback only)

// ═══════════════════════════════════════════════
// DATA DEFINITIONS
// source: CoinGecko = fetched via CoinGecko API
//         Twelve Data = fetched via TD batch /price
//         Simulated = indices only (TD free tier blocks)
// ═══════════════════════════════════════════════
const ASSETS = {
  crypto: [
    { id: 'bitcoin',     symbol: 'BTC',     name: 'Bitcoin',            tdSymbol: 'BTC/USD',   source: 'CoinGecko' },
    { id: 'ethereum',    symbol: 'ETH',     name: 'Ethereum',           tdSymbol: 'ETH/USD',   source: 'CoinGecko' },
    { id: 'solana',      symbol: 'SOL',     name: 'Solana',             tdSymbol: 'SOL/USD',   source: 'CoinGecko' },
    { id: 'ripple',      symbol: 'XRP',     name: 'XRP',                tdSymbol: 'XRP/USD',   source: 'CoinGecko' },
    { id: 'binancecoin', symbol: 'BNB',     name: 'BNB',                tdSymbol: 'BNB/USD',   source: 'CoinGecko' },
  ],
  stocks: [
    { id: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.',      tdSymbol: 'AAPL', source: 'Twelve Data' },
    { id: 'TSLA', symbol: 'TSLA', name: 'Tesla Inc.',      tdSymbol: 'TSLA', source: 'Twelve Data' },
    { id: 'NVDA', symbol: 'NVDA', name: 'NVIDIA Corp.',    tdSymbol: 'NVDA', source: 'Twelve Data' },
    { id: 'MSFT', symbol: 'MSFT', name: 'Microsoft Corp.', tdSymbol: 'MSFT', source: 'Twelve Data' },
  ],
  forex: [
    { id: 'EUR/USD', symbol: 'EUR/USD', name: 'Euro / US Dollar',       tdSymbol: 'EUR/USD', source: 'Twelve Data' },
    { id: 'GBP/USD', symbol: 'GBP/USD', name: 'Pound / US Dollar',      tdSymbol: 'GBP/USD', source: 'Twelve Data' },
    { id: 'USD/JPY', symbol: 'USD/JPY', name: 'Dollar / Japanese Yen',  tdSymbol: 'USD/JPY', source: 'Twelve Data' },
    { id: 'AUD/USD', symbol: 'AUD/USD', name: 'Australian / US Dollar', tdSymbol: 'AUD/USD', source: 'Twelve Data' },
  ],
  commodities: [
    { id: 'XAU/USD', symbol: 'XAU/USD', name: 'Gold Spot',     tdSymbol: 'XAU/USD', source: 'Twelve Data' },
    { id: 'XAG/USD', symbol: 'XAG/USD', name: 'Silver Spot',   tdSymbol: 'XAG/USD', source: 'Twelve Data' },
    { id: 'WTI/USD', symbol: 'WTI/USD', name: 'WTI Crude Oil', tdSymbol: 'WTI/USD', source: 'Twelve Data' },
    { id: 'XNG/USD', symbol: 'XNG/USD', name: 'Natural Gas',   tdSymbol: 'XNG/USD', source: 'Twelve Data' },
  ],
  indices: [
    { id: 'SPX',  symbol: 'S&P 500',  name: 'S&P 500 Index',        tdSymbol: 'SPX',  source: 'Simulated' },
    { id: 'IXIC', symbol: 'NASDAQ',   name: 'NASDAQ Composite',     tdSymbol: 'IXIC', source: 'Simulated' },
    { id: 'DJI',  symbol: 'DOW',      name: 'Dow Jones Industrial', tdSymbol: 'DJI',  source: 'Simulated' },
    { id: 'FTSE', symbol: 'FTSE 100', name: 'FTSE 100 Index',       tdSymbol: 'FTSE', source: 'Simulated' },
  ]
};

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let prices = {};
let priceData = {};  // { id: { price, change, high, low, vol, mcap } }
let alerts = [];
let alertHistory = [];   // { id, symbol, assetId, condition, targetPrice, triggeredAt (timestamp), triggeredPrice, note }
let alertHistoryFilter = '7d'; // '7d' | '30d' | '3m' | 'custom'
let historyCustomFrom = null;  // Date object
let historyCustomTo   = null;  // Date object
let historyExpandedAsset = null; // assetId currently expanded in history view
let selectedAsset = null;
let alertIdCounter = 1;
let currentTF = '1H';
let chartData = [];
let chartCtx = null;
let triggeredToday = 0;
let currentLibTab = 'ALL';
let libSearchQuery = '';
let currentWLTab = 'hot'; // 'hot' | 'watchlist'
// When true, selectAsset will switch to the chart tab on mobile.
// Set to true only on explicit user taps — never during background refreshes.
let navigateToChartOnSelect = false;

// ═══════════════════════════════════════════════
// HOT LIST — seed + dynamic rankings
// ═══════════════════════════════════════════════

// Seed: shown before DB has enough data, and used to fill gaps
const HOT_LIST_SEED = {
  crypto:      ['bitcoin', 'ethereum', 'solana', 'ripple'],
  forex:       ['EUR/USD', 'GBP/USD'],
  commodities: ['XAU/USD', 'WTI/USD'],
  indices:     ['SPX', 'IXIC'],
};

// Live hot list — starts as seed, gets replaced by DB rankings on load
let HOT_LIST = { ...HOT_LIST_SEED };

// ═══════════════════════════════════════════════
// FETCH HELPERS — CORS proxy chain
// Tries direct → allorigins proxy → corsproxy.io
// ═══════════════════════════════════════════════

// CORS proxy wrappers
const CORS_PROXIES = [
  url => url,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

// ── CORS-safe fetch helper ────────────────────────
// ── SIMULATED BASE PRICES (realistic as of early 2026) ───
// ── REAL PRICE FETCHING ───────────────────────────
// Crypto  → CoinGecko (free, no key)
// Stocks/Forex/Commodities → Twelve Data (free key)
// Indices → simulated only (Twelve Data blocks on free tier)

// Fallback seed prices for indices only (kept in sync manually)
const INDEX_SEEDS = {
  SPX:  { price: 5632,  open: 5600 },
  IXIC: { price: 17480, open: 17300 },
  DJI:  { price: 41800, open: 41500 },
  FTSE: { price: 8420,  open: 8380 },
};
const indexSim = {};

function getIndexSim(id) {
  if (!indexSim[id]) {
    const s = INDEX_SEEDS[id] || { price: 1000, open: 1000 };
    indexSim[id] = { price: s.price, open: s.open, high: s.price * 1.003, low: s.price * 0.997 };
  }
  const drift = (Math.random() - 0.5) * 0.0008;
  indexSim[id].price *= (1 + drift);
  indexSim[id].high = Math.max(indexSim[id].high, indexSim[id].price);
  indexSim[id].low  = Math.min(indexSim[id].low,  indexSim[id].price);
  return indexSim[id];
}

function formatVol(n) {
  if (n >= 1e12) return (n/1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n/1e9).toFixed(1)  + 'B';
  if (n >= 1e6)  return (n/1e6).toFixed(1)  + 'M';
  return n.toLocaleString();
}

// ── CoinGecko — one batch call for all crypto ────
async function fetchCryptoPrices(assets) {
  const ids = assets.map(a => a.id).join(',');
  try {
    const res  = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}` +
      `&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    );
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Bad CoinGecko response');
    data.forEach(coin => {
      priceData[coin.id] = {
        price:  coin.current_price,
        change: coin.price_change_percentage_24h?.toFixed(2) || '0.00',
        high:   coin.high_24h,
        low:    coin.low_24h,
        vol:    coin.total_volume ? formatVol(coin.total_volume) : '—',
        mcap:   coin.market_cap   ? formatVol(coin.market_cap)   : '—',
        live:   true,
      };
      prices[coin.id] = coin.current_price;
    });
    return true;
  } catch(e) { console.warn('CoinGecko fetch failed', e); return false; }
}

// ── Twelve Data — ONE batch call for all non-crypto ──
// Free tier allows 8 req/min — batching all symbols into a single
// /price?symbol=A,B,C call uses just 1 request.
async function fetchTDBatch(assets) {
  if (!assets.length) return;
  const symbols = assets.map(a => a.tdSymbol || a.id);
  const symStr  = symbols.join(',');

  // Build a lookup: tdSymbol → assetId
  const symToId = {};
  assets.forEach(a => { symToId[a.tdSymbol || a.id] = a.id; });

  try {
    // Use /price for a lightweight batch (returns just latest close price)
    const res  = await fetch(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symStr)}&apikey=${TD_KEY}`
    );
    const data = await res.json();

    // Response shape differs: single symbol → { price } ; multiple → { SYM: { price }, ... }
    const isSingle = symbols.length === 1;
    const map      = isSingle ? { [symbols[0]]: data } : data;

    symbols.forEach(sym => {
      const entry  = map[sym];
      if (!entry || entry.code || !entry.price) return; // rate-limited or error
      const assetId = symToId[sym];
      const newPrice = parseFloat(entry.price);
      const prev     = priceData[assetId];

      // Keep existing OHLC if we already have it; just update close price
      priceData[assetId] = {
        price:  newPrice,
        change: prev ? (((newPrice - (prev.open || newPrice)) / (prev.open || newPrice)) * 100).toFixed(2) : '0.00',
        high:   prev?.high  || newPrice,
        low:    prev?.low   || newPrice,
        open:   prev?.open  || newPrice,
        vol:    prev?.vol   || '—',
        mcap:   '—',
        live:   true,
      };
      prices[assetId] = newPrice;
    });

    // Also fire a single /quote batch on first load to get OHLC data
    // (only if we don't have it yet — avoids burning extra req/min quota)
    const needOHLC = assets.filter(a => !priceData[a.id]?.open);
    if (needOHLC.length) {
      fetchTDOHLC(needOHLC, symToId).catch(() => {});
    }
  } catch(e) { console.warn('TD batch fetch failed', e); }
}

// Fetch OHLC data once — used to populate high/low/change on first load
async function fetchTDOHLC(assets, symToId) {
  const symStr = assets.map(a => a.tdSymbol || a.id).join(',');
  const res    = await fetch(
    `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symStr)}&apikey=${TD_KEY}`
  );
  const data   = await res.json();
  const isSingle = assets.length === 1;
  const map      = isSingle ? { [assets[0].tdSymbol || assets[0].id]: data } : data;

  assets.forEach(a => {
    const sym   = a.tdSymbol || a.id;
    const entry = map[sym];
    if (!entry || entry.status === 'error' || !entry.close) return;
    const price  = parseFloat(entry.close);
    const open   = parseFloat(entry.open  || entry.close);
    const high   = parseFloat(entry.high  || entry.close);
    const low    = parseFloat(entry.low   || entry.close);
    const change = (((price - open) / open) * 100).toFixed(2);
    priceData[a.id] = {
      price, change, high, low, open,
      vol:  entry.volume || priceData[a.id]?.vol || '—',
      mcap: '—', live: true,
    };
    prices[a.id] = price;
  });
}

// ── Main fetch — all asset categories ────────────
async function fetchAllPrices() {
  const cryptoAssets = (ASSETS.crypto || []).filter(a => a.source === 'CoinGecko');
  const tdAssets     = [
    ...(ASSETS.stocks      || []),
    ...(ASSETS.forex       || []),
    ...(ASSETS.commodities || []),
  ];
  const indexAssets  = (ASSETS.indices || []);

  // Fire crypto + TD batch in parallel — just 2 HTTP requests total
  await Promise.all([
    cryptoAssets.length ? fetchCryptoPrices(cryptoAssets) : Promise.resolve(),
    tdAssets.length     ? fetchTDBatch(tdAssets)          : Promise.resolve(),
  ]);

  // Indices — simulated drift only
  indexAssets.forEach(asset => {
    const sim    = getIndexSim(asset.id);
    const change = (((sim.price - sim.open) / sim.open) * 100).toFixed(2);
    priceData[asset.id] = { price: sim.price, change, high: sim.high, low: sim.low, vol: '—', mcap: '—', live: false };
    prices[asset.id]    = sim.price;
  });

  // Update alert engine only — no price display
  checkAlerts();
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
}

// Keep alias for legacy call sites
const fetchAllTwelveData = fetchAllPrices;

// ── Single asset refresh ──────────────────────────
async function fetchSingleAsset(asset) {
  if (asset.source === 'CoinGecko') {
    return await fetchCryptoPrices([asset]);
  }
  if (INDEX_SEEDS[asset.id]) {
    const sim = getIndexSim(asset.id);
    priceData[asset.id] = {
      price:  sim.price,
      change: (((sim.price - sim.open) / sim.open) * 100).toFixed(2),
      high: sim.high, low: sim.low, vol: '—', mcap: '—', live: false,
    };
    prices[asset.id] = sim.price;
    return true;
  }
  // Single TD asset — still just 1 request
  await fetchTDBatch([asset]);
  return !!priceData[asset.id];
}

// ═══════════════════════════════════════════════





function formatPrice(p, id) {
  if (!p) return '';
  if (p < 0.01) return '$' + p.toFixed(6);
  if (p < 1) return '$' + p.toFixed(4);
  if (id && (id.includes('/') && !id.startsWith('XAU') && !id.startsWith('XAG'))) return p.toFixed(4);
  return '$' + p.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ═══════════════════════════════════════════════
// REFRESH SELECTED ASSET PANEL (single source of truth)
// Called by selectAsset, 8s tick, and live data callbacks.
// Never redraws chart — callers handle that separately.
// ═══════════════════════════════════════════════
function refreshSelectedAssetPanel() {
  if (!selectedAsset) return;
  const asset = selectedAsset;
  // Update asset header identity only — no price display
  document.getElementById('sel-symbol').textContent = asset.symbol;
  document.getElementById('sel-name').textContent   = asset.name;

  // Keep alert form note neutral
  const noteEl = document.getElementById('current-price-note');
  if (noteEl) noteEl.textContent = 'Enter your target price below';
}

// ═══════════════════════════════════════════════
// ALERT TARGET LINE OVERLAY ON CHART
// ═══════════════════════════════════════════════
// UPDATE WATCHLIST SELECTION HIGHLIGHT ONLY
// Lightweight — just flips CSS classes, no full re-render.
// ═══════════════════════════════════════════════
function updateWatchlistSelection() {
  document.querySelectorAll('.asset-card').forEach(card => {
    const assetId = card.dataset.assetId;
    const isSelected = selectedAsset && assetId === selectedAsset.id;
    card.classList.toggle('selected', isSelected);
    if (isSelected) {
      card.classList.add('selected');
      card.style.setProperty('--before-opacity', '1');
    }
  });
}

// ═══════════════════════════════════════════════
// ASSET ICONS
// ═══════════════════════════════════════════════

// Maps asset id → { type, ... }
// type 'crypto'  → CoinGecko asset image
// type 'stock'   → logo.dev favicon
// type 'forex'   → two stacked flag images (base + quote currency)
// type 'commodity'→ static SVG inline (no good free CDN)
function renderWatchlist() {
  let totalCount = 0;
  Object.entries(ASSETS).forEach(([cat, assets]) => {
    const container = document.getElementById(cat + '-list');
    if (!container) return;
    container.innerHTML = '';
    assets.forEach(asset => {
      const hasAlert = alerts.some(a => a.assetId === asset.id && a.status === 'active');
      const isSelected = selectedAsset && selectedAsset.id === asset.id;

      const card = document.createElement('div');
      card.className = `asset-card${isSelected ? ' selected' : ''}${hasAlert ? ' has-alert' : ''}`;
      card.dataset.assetId = asset.id;
      card.innerHTML = `
        <button class="asset-remove" title="Remove from watchlist" onclick="removeAssetFromWatchlist('${asset.id}','${cat}',event)"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        <div class="asset-left">
          <div class="asset-symbol">${asset.symbol}</div>
          <div class="asset-name">${asset.name}</div>
        </div>
        ${hasAlert ? '<div class="asset-right"><div class="alert-dot" title="Alert active"></div></div>' : ''}`;
      card.onclick = (e) => {
        // Don't trigger selectAsset if the remove button was clicked
        if (e.target.classList.contains('asset-remove') || e.target.closest('.asset-remove')) return;
        navigateToChartOnSelect = true; // user explicitly tapped — allow tab switch
        selectAsset(asset);
      };
      container.appendChild(card);
      totalCount++;
    });
  });
  // Update watchlist count in tab label
  const wlCountEl = document.getElementById('wl-count');
  if (wlCountEl) wlCountEl.textContent = totalCount;

  // Show/hide empty state
  const empty = document.getElementById('wl-empty');
  if (empty) empty.style.display = totalCount === 0 ? '' : 'none';
}

// ═══════════════════════════════════════════════
// HOT LIST RENDERING
// ═══════════════════════════════════════════════
function renderHotList() {
  Object.entries(HOT_LIST).forEach(([cat, assetIds]) => {
    const container = document.getElementById('hot-' + cat + '-list');
    if (!container) return;
    container.innerHTML = '';
    assetIds.forEach(assetId => {
      const asset = Object.values(ASSETS).flat().find(a => a.id === assetId);
      if (!asset) return;
      const hasAlert = alerts.some(a => a.assetId === asset.id && a.status === 'active');
      const isSelected = selectedAsset && selectedAsset.id === asset.id;
      const inWatchlist = ASSETS[cat]?.some(a => a.id === assetId);

      const card = document.createElement('div');
      card.className = `asset-card${isSelected ? ' selected' : ''}${hasAlert ? ' has-alert' : ''}`;
      card.dataset.assetId = asset.id;
      card.innerHTML = `
        <button class="asset-add-btn${inWatchlist ? ' in-watchlist' : ''}" title="${inWatchlist ? 'In watchlist' : 'Add to watchlist'}" onclick="hotListAdd('${asset.id}','${cat}',event)">
          ${inWatchlist
            ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="5" y1="1" x2="5" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
          }
        </button>
        <div class="asset-left">
          <div class="asset-symbol">${asset.symbol}</div>
          <div class="asset-name">${asset.name}</div>
        </div>
        ${hasAlert ? '<div class="asset-right"><div class="alert-dot" title="Alert active"></div></div>' : ''}`;
      card.onclick = (e) => {
        if (e.target.closest('.asset-add-btn')) return;
        navigateToChartOnSelect = true;
        selectAsset(asset);
      };
      container.appendChild(card);
    });
  });
}

function hotListAdd(assetId, cat, e) {
  e.stopPropagation();
  const asset = Object.values(ASSETS).flat().find(a => a.id === assetId);
  if (!asset) return;
  const already = ASSETS[cat]?.some(a => a.id === assetId);
  if (already) {
    showToast('Already Added', `${asset.symbol} is already in your watchlist.`, 'info');
    return;
  }
  if (!ASSETS[cat]) ASSETS[cat] = [];
  ASSETS[cat].push(asset);
  addToWatchlist(asset, cat);
  showToast('Added', `${asset.symbol} added to your watchlist.`, 'success');
  renderHotList();
  renderWatchlist();
}

// ═══════════════════════════════════════════════
// WATCHLIST TAB SWITCHER
// ═══════════════════════════════════════════════
function switchWLTab(tab) {
  currentWLTab = tab;
  localStorage.setItem('tw_last_wl_tab', tab);
  document.getElementById('panel-hot').style.display          = tab === 'hot'       ? '' : 'none';
  document.getElementById('panel-my-watchlist').style.display = tab === 'watchlist' ? '' : 'none';

  // Show FAB only on watchlist tab on mobile
  const fab = document.getElementById('wl-fab');
  if (fab) fab.classList.toggle('visible', tab === 'watchlist' && window.innerWidth <= 768);

  // Sync nav button highlights
  if (window.innerWidth <= 768) {
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
    const btnId = tab === 'watchlist' ? 'mnav-my-watchlist' : 'mnav-watchlist';
    document.getElementById(btnId)?.classList.add('active');
  }
}
function selectAsset(asset) {
  selectedAsset = asset;

  // Track click for dynamic Hot List rankings (non-blocking)
  const cat = Object.entries(ASSETS).find(([, list]) => list.some(a => a.id === asset.id))?.[0]
           || Object.entries(HOT_LIST_SEED).find(([, ids]) => ids.includes(asset.id))?.[0];
  if (cat) trackAssetClick(asset.id, cat);

  // Reset price input so it pre-fills with new asset's price
  const priceInput = document.getElementById('alert-price');
  if (priceInput) { priceInput.value = ''; delete priceInput.dataset.userEdited; }

  // Update panel content via shared function
  refreshSelectedAssetPanel();

  // Update the alert form's asset display to show the selected asset name.
  const display = document.getElementById('alert-asset-display');
  if (display) {
    display.textContent = `${asset.symbol} — ${asset.name}`;
    display.classList.remove('placeholder');
  }

  // Update selection highlight — lightweight on mobile (no full re-render),
  // full re-render on desktop to also refresh prices on all cards
  if (window.innerWidth <= 768) {
    updateWatchlistSelection();
    if (navigateToChartOnSelect) {
      navigateToChartOnSelect = false;
      mobileTab('chart');
    }
  } else {
    renderHotList();
    renderWatchlist();
    loadTVChart(asset);
  }
}

// ═══════════════════════════════════════════════
// MOBILE TAB NAVIGATION
// ═══════════════════════════════════════════════
// ── NAVIGATION HISTORY STACK ──────────────────────
// Tracks panel history so back button/swipe works correctly
const navStack = ['watchlist']; // start on watchlist

function mobileTab(tab, pushState = true) {
  if (window.innerWidth > 768) return;

  const current = navStack[navStack.length - 1];

  // Push to stack only if navigating to a different tab
  if (pushState && tab !== current) {
    navStack.push(tab);
    // Push a browser history state so Android back button fires popstate
    window.history.pushState({ twTab: tab }, '', '');
  }

  // Hide all panels
  document.getElementById('panel-watchlist').classList.remove('mobile-active');
  document.getElementById('panel-main').classList.remove('mobile-active');
  document.getElementById('panel-alerts').classList.remove('mobile-active');

  // Deactivate all nav buttons
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

  // Hide FAB unless staying on watchlist tab
  const fab = document.getElementById('wl-fab');

  if (tab === 'watchlist') {
    document.getElementById('panel-watchlist').classList.add('mobile-active');
    // Nav highlight handled by switchWLTab caller
  } else if (tab === 'chart') {
    if (fab) fab.classList.remove('visible');
    const panel = document.getElementById('panel-main');
    panel.classList.add('mobile-active');
    panel.scrollTop = 0;
    document.getElementById('mnav-chart').classList.add('active');
    setTimeout(() => { if (selectedAsset) loadTVChart(selectedAsset); }, 60);
  } else if (tab === 'alerts') {
    if (fab) fab.classList.remove('visible');
    const panel = document.getElementById('panel-alerts');
    panel.classList.add('mobile-active');
    panel.scrollTop = 0;
    document.getElementById('mnav-alerts').classList.add('active');
  }
}

// ── BACK NAVIGATION (Android back button + swipe back) ──
function goBack() {
  if (navStack.length > 1) {
    navStack.pop();
    const prev = navStack[navStack.length - 1];
    mobileTab(prev, false); // false = don't push another state
    // Also update WL subtab if going back to watchlist
    if (prev === 'watchlist') {
      const lastWLTab = localStorage.getItem('tw_last_wl_tab') || 'hot';
      switchWLTab(lastWLTab);
    }
    return true;
  }
  return false;
}

// Android physical/gesture back button
window.addEventListener('popstate', (e) => {
  if (window.innerWidth > 768) return;
  if (navStack.length > 1) {
    navStack.pop();
    const prev = navStack[navStack.length - 1];
    mobileTab(prev, false);
    if (prev === 'watchlist') {
      const lastWLTab = localStorage.getItem('tw_last_wl_tab') || 'hot';
      switchWLTab(lastWLTab);
    }
    // Push a replacement so back button doesn't exit the app
    window.history.pushState({ twTab: prev }, '', '');
  } else {
    // At root — push state back so app stays open
    window.history.pushState({ twTab: 'watchlist' }, '', '');
  }
});

// ═══════════════════════════════════════════════
// TRADINGVIEW CHART
// ═══════════════════════════════════════════════

// Maps our asset IDs to TradingView symbols
function getTVSymbol(asset) {
  if (!asset) return 'BINANCE:BTCUSDT';
  const id = asset.id;
  const cat = asset.cat ||
    (Object.entries(ASSETS).find(([, arr]) => arr.find(a => a.id === id)) || [])[0];

  // Crypto — use Binance pairs
  const cryptoMap = {
    bitcoin: 'BINANCE:BTCUSDT', ethereum: 'BINANCE:ETHUSDT',
    solana: 'BINANCE:SOLUSDT', ripple: 'BINANCE:XRPUSDT',
    binancecoin: 'BINANCE:BNBUSDT', cardano: 'BINANCE:ADAUSDT',
    dogecoin: 'BINANCE:DOGEUSDT', polkadot: 'BINANCE:DOTUSDT',
    avalanche: 'BINANCE:AVAXUSDT', chainlink: 'BINANCE:LINKUSDT',
    litecoin: 'BINANCE:LTCUSDT', uniswap: 'BINANCE:UNIUSDT',
    stellar: 'BINANCE:XLMUSDT', monero: 'BINANCE:XMRUSDT',
    tron: 'BINANCE:TRXUSDT', 'shiba-inu': 'BINANCE:SHIBUSDT',
    'wrapped-bitcoin': 'BINANCE:WBTCUSDT', cosmos: 'BINANCE:ATOMUSDT',
    filecoin: 'BINANCE:FILUSDT', 'internet-computer': 'BINANCE:ICPUSDT',
    aptos: 'BINANCE:APTUSDT', arbitrum: 'BINANCE:ARBUSDT',
    optimism: 'BINANCE:OPUSDT', 'near-protocol': 'BINANCE:NEARUSDT',
    vechain: 'BINANCE:VETUSDT', algorand: 'BINANCE:ALGOUSDT',
    hedera: 'BINANCE:HBARUSDT', 'the-graph': 'BINANCE:GRTUSDT',
    aave: 'BINANCE:AAVEUSDT', maker: 'BINANCE:MKRUSDT',
    'fetch-ai': 'BINANCE:FETUSDT', injective: 'BINANCE:INJUSDT',
    sui: 'BINANCE:SUIUSDT', 'sei-network': 'BINANCE:SEIUSDT',
    'render-token': 'BINANCE:RENDERUSDT', 'stacks': 'BINANCE:STXUSDT',
  };
  if (cryptoMap[id]) return cryptoMap[id];

  // Forex — use FX_ prefix
  if (cat === 'forex' || id.includes('/')) {
    const clean = id.replace('/', '');
    return `FX:${clean}`;
  }

  // Commodities
  const commodityMap = {
    'XAU/USD': 'TVC:GOLD', 'XAG/USD': 'TVC:SILVER',
    'WTI/USD': 'TVC:USOIL', 'XNG/USD': 'TVC:NGAS',
    'XPT/USD': 'TVC:PLATINUM', 'XPD/USD': 'TVC:PALLADIUM',
    'BRENT/USD': 'TVC:UKOIL',
  };
  if (commodityMap[id]) return commodityMap[id];

  // Indices
  const indexMap = {
    'SPX': 'SP:SPX', 'IXIC': 'NASDAQ:IXIC', 'DJI': 'DJ:DJI',
    'FTSE': 'SPREADEX:FTSE', 'DAX': 'XETR:DAX', 'CAC': 'EURONEXT:PX1',
    'N225': 'TVC:NI225', 'HSI': 'TVC:HSI', 'ASX200': 'ASX:XJO',
    'KOSPI': 'KRX:KOSPI', 'SENSEX': 'BSE:SENSEX', 'NDX': 'NASDAQ:NDX',
  };
  if (indexMap[id]) return indexMap[id];

  // Stocks — use NASDAQ by default, NYSE for known ones
  const nyse = ['BRK.A','BRK.B','JPM','BAC','WFC','GS','XOM','CVX','JNJ','PG','KO','DIS','WMT','V','MA'];
  if (nyse.includes(id)) return `NYSE:${id}`;
  return `NASDAQ:${id}`;
}

let tvWidget = null;
function loadTVChart(asset) {
  const container = document.getElementById('tradingview-widget');
  if (!container) return;
  container.innerHTML = '';

  const symbol = getTVSymbol(asset);
  const isMobile = window.innerWidth <= 768;

  if (!window.TradingView) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-family:var(--mono);font-size:0.75rem;letter-spacing:1px">LOADING CHART...</div>';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.onload = () => {
      container.innerHTML = '';
      createTVWidget(symbol, isMobile);
    };
    script.onerror = () => {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-family:var(--mono);font-size:0.72rem;text-align:center;padding:20px">Chart unavailable.<br>Check your internet connection.</div>';
    };
    document.head.appendChild(script);
  } else {
    createTVWidget(symbol, isMobile);
  }
}

function createTVWidget(symbol, isMobile) {
  const container = document.getElementById('tradingview-widget');
  if (!container || !window.TradingView) return;
  container.innerHTML = '';

  const tvContainer = document.getElementById('tv-container');
  let w = tvContainer ? tvContainer.offsetWidth : 0;
  let h = tvContainer ? tvContainer.offsetHeight : 0;
  if (w < 10 || h < 10) {
    setTimeout(() => createTVWidget(symbol, isMobile), 100);
    return;
  }

  new window.TradingView.widget({
    container_id: 'tradingview-widget',
    symbol,
    interval: 'D',
    timezone: 'Etc/UTC',
    theme: 'dark',
    style: '1',
    locale: 'en',
    toolbar_bg: '#0d1520',
    enable_publishing: false,
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: false,
    backgroundColor: '#080c12',
    gridColor: 'rgba(26,45,69,0.5)',
    allow_symbol_change: false,
    withdateranges: !isMobile,
    hide_side_toolbar: isMobile,
    studies: [],
    autosize: true,
  });

  // Draw alert lines after chart has had time to render
}

// Keep stubs so nothing else breaks
function generateChartData() {}
function drawChart() {}
function setTF() {}

// ═══════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════
// ── Toggle zone vs single price UI ───────────────
function onConditionChange() {
  const condition = document.getElementById('alert-condition').value;
  const isZone = condition === 'zone';
  document.getElementById('alert-single-row').style.display = isZone ? 'none' : '';
  document.getElementById('alert-zone-row').style.display   = isZone ? '' : 'none';
}

async function createAlert() {
  if (!selectedAsset) return showToast('No Asset', 'Tap any asset from the Hot List or Watchlist first.', 'error');

  const assetId    = selectedAsset.id;
  const condition  = document.getElementById('alert-condition').value;
  const timeframe  = document.getElementById('alert-timeframe').value;
  const isZone     = condition === 'zone';

  let targetPrice = 0, zoneLow = 0, zoneHigh = 0, note = '', repeatInterval = 0;

  if (isZone) {
    zoneLow  = parseFloat(document.getElementById('alert-zone-low').value);
    zoneHigh = parseFloat(document.getElementById('alert-zone-high').value);
    note     = document.getElementById('alert-note-zone').value.trim();
    repeatInterval = parseInt(document.getElementById('alert-repeat').value) || 0;
    if (isNaN(zoneLow) || isNaN(zoneHigh) || zoneLow <= 0 || zoneHigh <= 0)
      return showToast('Invalid Zone', 'Enter valid zone low and high prices.', 'error');
    if (zoneLow >= zoneHigh)
      return showToast('Invalid Zone', 'Zone low must be less than zone high.', 'error');
    targetPrice = zoneLow;
  } else {
    targetPrice = parseFloat(document.getElementById('alert-price').value);
    note        = document.getElementById('alert-note').value.trim();
    if (isNaN(targetPrice) || targetPrice <= 0)
      return showToast('Invalid Price', 'Enter a valid target price.', 'error');
  }

  // ── Duplicate check ───────────────────────────────
  const duplicate = alerts.find(a => {
    if (a.assetId !== assetId || a.status === 'triggered') return false;
    if (isZone && a.condition === 'zone')
      return a.zoneLow === zoneLow && a.zoneHigh === zoneHigh;
    if (!isZone && a.condition === condition)
      return a.targetPrice === targetPrice;
    return false;
  });
  if (duplicate) {
    const label = isZone
      ? `a zone alert (${formatPrice(zoneLow, assetId)}–${formatPrice(zoneHigh, assetId)})`
      : `a ${condition} alert at ${formatPrice(targetPrice, assetId)}`;
    return showToast('Duplicate Alert', `You already have ${label} for ${selectedAsset.symbol}.`, 'error');
  }

  const assetInfo    = selectedAsset;
  const currentPrice = priceData[assetId]?.price || 0;

  const newAlert = {
    id: 'temp_' + alertIdCounter++,
    assetId,
    symbol:       assetInfo.symbol,
    name:         assetInfo.name,
    condition,
    targetPrice,
    zoneLow:      isZone ? zoneLow  : null,
    zoneHigh:     isZone ? zoneHigh : null,
    timeframe:    timeframe || null,
    repeatInterval,
    note,
    sound:        selectedAlertSound,
    status:       'active',
    createdAt:    new Date().toLocaleTimeString(),
    currentPriceWhenCreated: currentPrice,
  };

  alerts.push(newAlert);

  try {
    const saved = await saveAlert(newAlert);
    const idx = alerts.findIndex(a => a.id === newAlert.id);
    if (idx !== -1 && saved?.id) alerts[idx].id = saved.id;
  } catch(e) {
    console.warn('createAlert: DB save failed', e);
  }

  // Reset form
  document.getElementById('alert-price').value     = '';
  document.getElementById('alert-zone-low').value  = '';
  document.getElementById('alert-zone-high').value = '';
  document.getElementById('alert-note').value      = '';
  document.getElementById('alert-note-zone').value = '';
  document.getElementById('alert-timeframe').value = '';
  document.getElementById('alert-repeat').value    = '0';
  delete document.getElementById('alert-price').dataset.userEdited;

  const tfLabel = timeframe ? ` · ${timeframe}` : '';
  if (isZone) {
    showToast('Zone Alert Created', `${assetInfo.symbol} zone ${formatPrice(zoneLow, assetId)}–${formatPrice(zoneHigh, assetId)}${tfLabel} is now active.`, 'success');
  } else {
    showToast('Alert Created', `${assetInfo.symbol} ${condition} ${formatPrice(targetPrice, assetId)}${tfLabel} is now active.`, 'success');
  }

  sendBrowserNotification(
    `Alert Set — ${assetInfo.symbol}`,
    isZone
      ? `Zone ${formatPrice(zoneLow, assetId)}–${formatPrice(zoneHigh, assetId)}${tfLabel}`
      : `Price ${condition} ${formatPrice(targetPrice, assetId)}${tfLabel}`
  );

  if (telegramEnabled) {
    sendTelegram(tgCreatedMessage(assetInfo.symbol, condition, targetPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval));
  }

  renderAlerts();
  renderWatchlist();
  if (window.innerWidth <= 768) {
    switchAlertTab('active');
    mobileTab('alerts');
  }
}

function deleteAlert(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;

  const isZone  = alert.condition === 'zone';
  const label   = isZone
    ? `${alert.symbol} zone ${formatPrice(alert.zoneLow, alert.assetId)}–${formatPrice(alert.zoneHigh, alert.assetId)}`
    : `${alert.symbol} ${alert.condition} ${formatPrice(alert.targetPrice, alert.assetId)}`;
  const tf      = alert.timeframe ? ` · ${alert.timeframe}` : '';

  showConfirm(
    'Delete Alert',
    `Remove <b>${label}${tf}</b>?<br><small style="opacity:0.65;font-size:0.75rem">This cannot be undone.</small>`,
    () => {
      deleteAlertFromDB(id);
      alerts = alerts.filter(a => a.id !== id);
      renderAlerts();
      renderWatchlist();
      showToast('Alert Deleted', `${alert.symbol} alert removed.`, 'success');
    }
  );
}

// ── Generic confirmation modal ────────────────────
function showConfirm(title, bodyHtml, onConfirm) {
  // Remove any existing confirm modal
  const existing = document.getElementById('confirm-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'confirm-modal';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99998;
    background:rgba(0,0,0,0.6);
    display:flex;align-items:center;justify-content:center;
    padding:24px;backdrop-filter:blur(4px);
  `;
  overlay.innerHTML = `
    <div style="
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:14px;
      padding:24px 22px;
      max-width:320px;width:100%;
      box-shadow:0 8px 40px rgba(0,0,0,0.5);
    ">
      <div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;color:var(--muted);margin-bottom:8px;">${title.toUpperCase()}</div>
      <div style="font-size:0.9rem;line-height:1.5;margin-bottom:22px;">${bodyHtml}</div>
      <div style="display:flex;gap:10px;">
        <button id="confirm-cancel" style="
          flex:1;padding:12px;border-radius:8px;
          background:transparent;border:1px solid var(--border);
          color:var(--muted);font-family:var(--mono);font-size:0.7rem;
          letter-spacing:0.08em;cursor:pointer;
        ">CANCEL</button>
        <button id="confirm-ok" style="
          flex:1;padding:12px;border-radius:8px;
          background:rgba(255,61,90,0.15);border:1px solid rgba(255,61,90,0.4);
          color:var(--red);font-family:var(--mono);font-size:0.7rem;
          letter-spacing:0.08em;cursor:pointer;font-weight:700;
        ">DELETE</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#confirm-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#confirm-ok').onclick     = () => { overlay.remove(); onConfirm(); };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

function toggleAlert(id) {
  const a = alerts.find(a => a.id === id);
  if (!a) return;
  if (a.status === 'active') a.status = 'paused';
  else if (a.status === 'paused') a.status = 'active';
  updateAlert(id, { status: a.status });
  renderAlerts();
}

function dismissAlert(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;
  // Save to history in DB
  saveAlertToHistory(alert);
  // Add to local history array
  alertHistory.unshift({
    id: Date.now() + Math.random(),
    symbol: alert.symbol,
    assetId: alert.assetId,
    condition: alert.condition,
    targetPrice: alert.targetPrice,
    triggeredAt: Date.now(),
    triggeredPrice: alert.triggeredPrice,
    note: alert.note || '',
  });
  saveAlertHistory();
  // Remove from active alerts
  deleteAlertFromDB(id);
  alerts = alerts.filter(a => a.id !== id);
  renderAlerts();
  renderWatchlist();
}

function renderAlerts() {
  const container = document.getElementById('alerts-list');
  const active = alerts.filter(a => a.status === 'active').length;
  document.getElementById('alert-count').textContent = alerts.length;
  document.getElementById('activeCount').textContent = active;
  document.getElementById('triggeredCount').textContent = triggeredToday;

  if (alerts.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon"><svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 6C16.27 6 10 12.27 10 20v13L6 37h36l-4-4V20C38 12.27 31.73 6 24 6z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" fill="none" opacity="0.4"/><path d="M19 38c0 2.76 2.24 5 5 5s5-2.24 5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.4"/></svg></div><p>No alerts yet.<br>Select an asset and set a<br>price target to get started.</p></div>`;
    return;
  }

  container.innerHTML = '';
  [...alerts].reverse().forEach(alert => {
    const div = document.createElement('div');
    const isTriggered = alert.status === 'triggered';
    const dir = alert.triggeredDirection || alert.condition;

    if (isTriggered) {
      div.className = `alert-item triggered-${dir}`;
    } else {
      div.className = `alert-item active-alert`;
    }

    let badgeClass, badgeLabel;
    if (isTriggered) {
      badgeClass = `badge-triggered-${dir}`;
      badgeLabel = dir === 'above' ? '▲ TRIGGERED' : '▼ TRIGGERED';
    } else if (alert.status === 'paused') {
      badgeClass = 'badge-inactive'; badgeLabel = 'PAUSED';
    } else {
      badgeClass = 'badge-active'; badgeLabel = 'ACTIVE';
    }

    const triggeredLine = isTriggered
      ? `<span style="color:${dir === 'above' ? 'var(--green)' : 'var(--red)'}">
           Hit ${formatPrice(alert.triggeredPrice, alert.assetId)} at ${alert.triggeredAt}
         </span><br>`
      : '';

    const actions = isTriggered
      ? `<button class="alert-action-btn dismiss" onclick="dismissAlert('${alert.id}')">
           <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px">
             <polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>DISMISS
         </button>
         <button class="alert-action-btn delete" onclick="deleteAlert('${alert.id}')">
           <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>DELETE
         </button>`
      : `<button class="alert-action-btn toggle" onclick="toggleAlert('${alert.id}')">${alert.status === 'paused'
          ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><polygon points="1,1 9,5 1,9" fill="currentColor"/></svg>RESUME'
          : '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><rect x="1.5" y="1" width="2.5" height="8" rx="1" fill="currentColor"/><rect x="6" y="1" width="2.5" height="8" rx="1" fill="currentColor"/></svg>PAUSE'
        }</button>
        <button class="alert-action-btn delete" onclick="deleteAlert('${alert.id}')">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>DELETE
        </button>`;

    div.innerHTML = `
      <div class="alert-header-row">
        <div class="alert-symbol">${alert.symbol}</div>
        <div class="alert-badge ${badgeClass}">${badgeLabel}</div>
      </div>
      <div class="alert-detail">
        <strong>${alert.condition === 'above'
          ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><polyline points="1,7 5,3 9,7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>ABOVE'
          : '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><polyline points="1,3 5,7 9,3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>BELOW'
        }</strong> ${formatPrice(alert.targetPrice, alert.assetId)}<br>
        ${triggeredLine}
        ${alert.note ? `<em style="color:var(--muted)">"${alert.note}"</em><br>` : ''}
        Set at ${alert.createdAt}
      </div>
      <div class="alert-actions">${actions}</div>`;
    container.appendChild(div);
  });

  // Update mobile alert badge dot — only for active (waiting) alerts
  const dot = document.getElementById('alert-dot');
  if (dot) dot.classList.toggle('show', alerts.some(a => a.status === 'active'));
}

// ═══════════════════════════════════════════════
// ALERT HISTORY — persistence + rendering
// ═══════════════════════════════════════════════
async function saveAlertHistory() {
  // Always keep localStorage as fast local cache
  try { localStorage.setItem('tw_alert_history', JSON.stringify(alertHistory)); } catch(e) {}
}
async function initAlertHistory() {
  // Try DB first, fall back to localStorage
  const dbHistory = await loadAlertHistoryFromDB();
  if (dbHistory !== null) {
    alertHistory = dbHistory;
  } else {
    try {
      const raw = localStorage.getItem('tw_alert_history');
      if (raw) alertHistory = JSON.parse(raw);
    } catch(e) {}
  }
}

function clearAlertHistory() {
  const btn = document.querySelector('.hist-clear-btn');
  if (!btn) return;
  if (btn.classList.contains('confirming')) {
    alertHistory = [];
    saveAlertHistory();
    clearAlertHistoryFromDB(); // also clear from DB
    renderHistory();
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="display:inline-block;vertical-align:middle;margin-right:5px"><polyline points="1,3 11,3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2.5 3l.7 7h5.6l.7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="4.5,3 4.5,1.5 7.5,1.5 7.5,3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Clear History`;
    btn.classList.remove('confirming');
  } else {
    btn.textContent = 'Tap again to confirm';
    btn.classList.add('confirming');
    setTimeout(() => {
      if (btn.classList.contains('confirming')) {
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="display:inline-block;vertical-align:middle;margin-right:5px"><polyline points="1,3 11,3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2.5 3l.7 7h5.6l.7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="4.5,3 4.5,1.5 7.5,1.5 7.5,3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Clear History`;
        btn.classList.remove('confirming');
      }
    }, 3000);
  }
}

let currentAlertTab = 'active';
function switchAlertTab(tab) {
  currentAlertTab = tab;
  document.getElementById('alerts-list').style.display    = tab === 'active'  ? '' : 'none';
  document.getElementById('alerts-history').style.display = tab === 'history' ? '' : 'none';
  document.getElementById('atab-active').classList.toggle('active',  tab === 'active');
  document.getElementById('atab-history').classList.toggle('active', tab === 'history');
  if (tab === 'history') renderHistory();
}

function setHistoryFilter(f) {
  alertHistoryFilter = f;
  ['7d','30d','3m','custom'].forEach(k => {
    document.getElementById('hf-' + k).classList.toggle('active', k === f);
  });
  document.getElementById('hf-custom-row').classList.toggle('show', f === 'custom');
  if (f !== 'custom') renderHistory();
}

function applyCustomHistoryFilter() {
  const from = document.getElementById('hf-from').value;
  const to   = document.getElementById('hf-to').value;
  if (!from || !to) return;
  historyCustomFrom = new Date(from);
  historyCustomTo   = new Date(to); historyCustomTo.setHours(23,59,59,999);
  renderHistory();
}

function getHistoryWindowMs() {
  const now = Date.now();
  if (alertHistoryFilter === '7d')     return [now - 7  * 864e5, now];
  if (alertHistoryFilter === '30d')    return [now - 30 * 864e5, now];
  if (alertHistoryFilter === '3m')     return [now - 91 * 864e5, now];
  if (alertHistoryFilter === 'custom' && historyCustomFrom && historyCustomTo)
    return [historyCustomFrom.getTime(), historyCustomTo.getTime()];
  return [now - 7 * 864e5, now];
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const [fromMs, toMs] = getHistoryWindowMs();
  const filtered = alertHistory.filter(h => h.triggeredAt >= fromMs && h.triggeredAt <= toMs);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="hist-empty">No triggered alerts<br>in this time period.</div>`;
    return;
  }

  // Build summary counts
  const aboveCount = filtered.filter(h => h.condition === 'above').length;
  const belowCount = filtered.filter(h => h.condition === 'below').length;

  // Group by assetId
  const groups = {};
  filtered.forEach(h => {
    if (!groups[h.assetId]) groups[h.assetId] = { symbol: h.symbol, entries: [] };
    groups[h.assetId].entries.push(h);
  });
  // Sort each group newest first
  Object.values(groups).forEach(g => g.entries.sort((a,b) => b.triggeredAt - a.triggeredAt));
  // Sort groups by most recent trigger
  const sortedGroups = Object.entries(groups).sort((a,b) =>
    b[1].entries[0].triggeredAt - a[1].entries[0].triggeredAt
  );

  let html = `<div class="hist-summary">
    <div>${filtered.length} trigger${filtered.length !== 1 ? 's' : ''}</div>
    <div>▲ Above: <span>${aboveCount}</span></div>
    <div>▼ Below: <span>${belowCount}</span></div>
  </div>`;

  sortedGroups.forEach(([assetId, group]) => {
    const isOpen = historyExpandedAsset === assetId;
    const lastTrigger = new Date(group.entries[0].triggeredAt).toLocaleDateString();
    html += `
      <div class="hist-asset-group">
        <div class="hist-asset-header" onclick="toggleHistoryGroup('${assetId}')">
          <div class="hist-asset-name">${group.symbol}</div>
          <div class="hist-asset-meta">
            <span class="hist-count">${group.entries.length} alert${group.entries.length !== 1 ? 's' : ''}</span>
            <span style="font-family:var(--mono);font-size:0.6rem;color:var(--muted)">${lastTrigger}</span>
            <svg class="hist-chevron${isOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <polyline points="2,4 6,8 10,4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <div class="hist-entries${isOpen ? ' open' : ''}">
          ${group.entries.map(h => {
            const ts = new Date(h.triggeredAt);
            const dateStr = ts.toLocaleDateString(undefined, { month:'short', day:'numeric' });
            const timeStr = ts.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
            return `
            <div class="hist-entry">
              <div class="hist-entry-left">
                <span class="hist-entry-dir hist-dir-${h.condition}">${h.condition === 'above' ? '▲ ABOVE' : '▼ BELOW'}</span>
                <span class="hist-entry-price">Target: ${formatPrice(h.targetPrice, h.assetId)}</span>
                ${h.note ? `<span class="hist-entry-note">"${h.note}"</span>` : ''}
              </div>
              <div class="hist-entry-right">
                <div class="hist-triggered-price">${formatPrice(h.triggeredPrice, h.assetId)}</div>
                <div>${dateStr}</div>
                <div>${timeStr}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

function toggleHistoryGroup(assetId) {
  historyExpandedAsset = historyExpandedAsset === assetId ? null : assetId;
  renderHistory();
}
function checkAlerts() {
  const now = Date.now();
  alerts.forEach(alert => {
    if (alert.status !== 'active') return;
    const currentPrice = priceData[alert.assetId]?.price || prices[alert.assetId];
    if (!currentPrice) return;

    const isZone = alert.condition === 'zone';
    let fired = false;

    if (isZone) {
      const inZone = currentPrice >= alert.zoneLow && currentPrice <= alert.zoneHigh;
      if (!inZone) { alert.zoneTriggeredOnce = false; return; }
      const repeatMs = (alert.repeatInterval || 0) * 60 * 1000;
      const lastFired = alert.lastTriggeredAt || 0;
      if (repeatMs === 0) {
        if (alert.zoneTriggeredOnce) return;
        alert.zoneTriggeredOnce = true;
        alert.status = 'triggered';
      } else {
        if (now - lastFired < repeatMs) return;
        alert.lastTriggeredAt = now;
      }
      fired = true;
    } else {
      fired =
        (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
        (alert.condition === 'below' && currentPrice <= alert.targetPrice);
      if (!fired) return;
      alert.status = 'triggered';
    }

    alert.triggeredDirection = alert.condition;
    alert.triggeredAt    = new Date().toLocaleTimeString();
    alert.triggeredPrice = currentPrice;
    triggeredToday++;

    if (!isZone || (alert.repeatInterval || 0) === 0) {
      updateAlert(alert.id, {
        status: 'triggered',
        triggered_at: alert.triggeredAt,
        triggered_price: currentPrice,
        triggered_direction: alert.condition,
      });
    }

    const tfLabel = alert.timeframe ? ` [${alert.timeframe}]` : '';
    let msg;
    if (isZone) {
      msg = `Entered zone ${formatPrice(alert.zoneLow, alert.assetId)}–${formatPrice(alert.zoneHigh, alert.assetId)}${tfLabel} | Current price: ${formatPrice(currentPrice, alert.assetId)}`;
    } else {
      msg = `${alert.condition === 'above' ? 'Rose above' : 'Fell below'} ${formatPrice(alert.targetPrice, alert.assetId)}${tfLabel} | Current price: ${formatPrice(currentPrice, alert.assetId)}`;
    }

    showToast(`ALERT TRIGGERED — ${alert.symbol}`, msg, 'alert');
    playAlertSound(alert.sound || selectedAlertSound);
    sendBrowserNotification(`${alert.symbol} Alert Triggered`, msg);
    if (telegramEnabled) {
      sendTelegram(tgAlertMessage('trigger', alert.symbol, alert.condition,
        alert.targetPrice, currentPrice, alert.assetId,
        alert.note, alert.timeframe, alert.zoneLow, alert.zoneHigh, alert.repeatInterval));
    }
    renderAlerts();
  });
}

// ═══════════════════════════════════════════════
// SOUND ENGINE (Web Audio API — no external files)
// ═══════════════════════════════════════════════
let audioCtx = null;
let soundEnabled = true;
let selectedAlertSound = 'chime';

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playAlertSound(type = 'chime') {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const sounds = {
      chime: () => {
        // Ascending chime — three notes
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
          gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
          gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + i * 0.18 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.5);
          osc.start(ctx.currentTime + i * 0.18);
          osc.stop(ctx.currentTime + i * 0.18 + 0.55);
        });
      },
      beep: () => {
        // Two-tone alert beep
        [880, 1100].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.12);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.15);
        });
      },
      bell: () => {
        // Rich bell with harmonics
        const freqs = [440, 880, 1320];
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.3 / (i + 1), ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 1.6);
        });
      },
      ding: () => {
        // Short bright ding
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1318.5, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.65);
      }
    };
    (sounds[type] || sounds.chime)();
  } catch(e) { console.warn('Audio error:', e); }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('sound-btn');
  const waves = document.getElementById('sound-waves');
  const mute  = document.getElementById('sound-mute');
  if (soundEnabled) {
    btn.classList.add('active');
    btn.classList.remove('muted-sound');
    btn.title = 'Sound ON — click to mute';
    if (waves) waves.style.display = '';
    if (mute)  mute.style.display  = 'none';
  } else {
    btn.classList.remove('active');
    btn.classList.add('muted-sound');
    btn.title = 'Sound OFF — click to enable';
    if (waves) waves.style.display = 'none';
    if (mute)  mute.style.display  = '';
  }
  if (soundEnabled) playAlertSound(selectedAlertSound);
}

function selectSound(type, btn) {
  selectedAlertSound = type;
  document.querySelectorAll('.sound-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function previewSound() {
  playAlertSound(selectedAlertSound);
}

// ═══════════════════════════════════════════════
// BROWSER NOTIFICATIONS
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// SERVICE WORKER + PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════
let notifEnabled = false;
let swRegistration = null;

// Register the service worker as soon as the page loads.
// Requires the app to be served over HTTPS or localhost — not file://.
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('./sw.js');
  } catch (e) {
    // SW registration fails silently on file:// — fallback to Notification API
    swRegistration = null;
  }
}
registerServiceWorker();



// Browser notifications removed — Telegram is the sole alert channel
function sendBrowserNotification() {}



// ═══════════════════════════════════════════════
// TELEGRAM ALERTS
// ═══════════════════════════════════════════════
const TELEGRAM_WORKER_URL = 'https://telegram-worker.meet-tyla.workers.dev';
let telegramEnabled = false;
let telegramChatId  = localStorage.getItem('tg_chat_id') || '';
let telegramUserName = '';

// ── Auto-detect user from Telegram WebApp SDK ─────
(function detectTelegramUser() {
  try {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.id) {
      telegramChatId   = String(tgUser.id);
      telegramUserName = tgUser.first_name || tgUser.username || 'there';
      localStorage.setItem('tg_chat_id', telegramChatId);
      telegramEnabled = true;
      localStorage.setItem('tg_enabled', 'true');
    }
  } catch(e) {}
})();

function openTelegramModal() {
  const modal = document.getElementById('tg-modal');
  modal.style.display = 'flex';
  modal.classList.add('tg-open');
  updateTgModalState();
}

function closeTelegramModal() {
  const modal = document.getElementById('tg-modal');
  modal.style.display = 'none';
  modal.classList.remove('tg-open');
}

function closeTgModalIfBg(e) {
  if (e.target.id === 'tg-modal') closeTelegramModal();
}

function updateTgModalState() {
  const sub = document.getElementById('tg-toggle-sub');
  const btn = document.getElementById('tg-toggle-btn');
  const detectedBox   = document.getElementById('tg-detected-box');
  const notDetectedBox = document.getElementById('tg-not-detected-box');

  if (telegramChatId) {
    // Show detected state
    if (detectedBox)    detectedBox.style.display = 'block';
    if (notDetectedBox) notDetectedBox.style.display = 'none';
    const nameEl = document.getElementById('tg-detected-name');
    if (nameEl) nameEl.textContent = telegramUserName
      ? `Logged in as ${telegramUserName} — alerts will be delivered to your Telegram.`
      : `Your account has been detected. Alerts will be delivered to your Telegram.`;
    if (telegramEnabled) {
      sub.textContent = 'Alerts will be sent to your Telegram';
      btn.textContent = 'ON';
      btn.classList.add('on');
    } else {
      sub.textContent = 'Ready — toggle to enable';
      btn.textContent = 'OFF';
      btn.classList.remove('on');
    }
  } else {
    // Not inside Telegram
    if (detectedBox)    detectedBox.style.display = 'none';
    if (notDetectedBox) notDetectedBox.style.display = 'block';
    sub.textContent = 'Open via @tradewatchalert_bot to enable';
    btn.textContent = 'OFF';
    btn.classList.remove('on');
  }
}

function toggleTelegram() {
  if (!telegramChatId) {
    setTgStatus('Open the app via @tradewatchalert_bot to enable alerts.', 'err');
    return;
  }
  telegramEnabled = !telegramEnabled;
  localStorage.setItem('tg_enabled', telegramEnabled);
  savePreferencesDB({ telegram_chat_id: telegramChatId, telegram_enabled: telegramEnabled });
  updateTgModalState();
  updateTgBtn();
  if (telegramEnabled) {
    sendTelegram('🔔 <b>TradeWatch Connected!</b>\n\nYour alerts are live. You\'ll get notified here the moment a price target is hit.\n\n<i>Stay sharp. 📊</i>');
  }
}

function updateTgBtn() {
  const btn = document.getElementById('tg-btn');
  if (!btn) return;
  if (telegramEnabled) {
    btn.classList.add('active');
    btn.style.borderColor = '#2AABEE';
    btn.style.color = '#2AABEE';
    btn.title = 'Telegram alerts ON';
  } else {
    btn.classList.remove('active');
    btn.style.borderColor = '';
    btn.style.color = '';
    btn.title = 'Set up Telegram alerts';
  }
}

async function testTelegram() {
  if (!telegramChatId) {
    setTgStatus('Open the app via @tradewatchalert_bot first.', 'err');
    return;
  }
  setTgStatus('Sending…', '');
  const ok = await sendTelegram('✅ <b>Test Successful!</b>\n\nTradeWatch is connected and ready to fire alerts.\n\n<i>You\'re all set. 🎯</i>');
  if (ok) {
    setTgStatus('✓ Message sent! Check your Telegram.', 'ok');
  } else {
    setTgStatus('✗ Failed. Please try again.', 'err');
  }
}

function setTgStatus(msg, type) {
  const el = document.getElementById('tg-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'tg-status ' + type;
}

// Core send function — posts to Cloudflare Worker proxy
async function sendTelegram(message) {
  if (!telegramChatId) return false;
  try {
    const res = await fetch(TELEGRAM_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, chat_id: telegramChatId })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// Format a rich alert message for Telegram
// Build a monospace-aligned detail block for Telegram
// Labels are left-padded to a fixed width so values line up cleanly
function tgRow(label, value) {
  return `<code>${label.padEnd(16)}</code>${value}`;
}

function tgAlertMessage(type, symbol, condition, targetPrice, currentPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval) {
  const isZone  = condition === 'zone';
  const isAbove = condition === 'above';
  const time    = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let header, subtitle, rows = [];

  if (isZone) {
    header   = `📍 <b>ZONE ALERT — ${symbol}</b>`;
    subtitle = `Price has entered your zone`;
    rows.push(tgRow('Zone',          `<b>${formatPrice(zoneLow, assetId)} – ${formatPrice(zoneHigh, assetId)}</b>`));
    rows.push(tgRow('Current price', `<b>${formatPrice(currentPrice, assetId)}</b>`));
    if (timeframe)                            rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
    if (repeatInterval && repeatInterval > 0) rows.push(tgRow('Repeat',    `<b>Every ${repeatInterval} min</b>`));
  } else {
    const emoji   = isAbove ? '🚀' : '📉';
    const dirWord = isAbove ? 'broke above' : 'dropped below';
    header   = `${emoji} <b>ALERT TRIGGERED — ${symbol}</b>`;
    subtitle = `Price ${dirWord} your target`;
    rows.push(tgRow('Target',        `<b>${formatPrice(targetPrice, assetId)}</b>`));
    rows.push(tgRow('Current price', `<b>${formatPrice(currentPrice, assetId)}</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  }

  if (note) rows.push(tgRow('Note', `<i>${note}</i>`));

  return [header, ``, subtitle, ``, ...rows, ``, `⏰ ${time}`, ``, `<i>Tap to open TradeWatch</i>`].join('\n');
}

function tgCreatedMessage(symbol, condition, targetPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval) {
  const isZone  = condition === 'zone';
  const isAbove = condition === 'above';

  let header, subtitle, rows = [];

  if (isZone) {
    header   = `📍 <b>Zone Alert Set — ${symbol}</b>`;
    subtitle = `You'll be notified when <b>${symbol}</b> enters the zone`;
    rows.push(tgRow('Zone',      `<b>${formatPrice(zoneLow, assetId)} – ${formatPrice(zoneHigh, assetId)}</b>`));
    if (timeframe)                            rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
    if (repeatInterval && repeatInterval > 0) rows.push(tgRow('Repeat',   `<b>Every ${repeatInterval} min</b>`));
  } else {
    const emoji   = isAbove ? '🟢' : '🔴';
    const dirWord = isAbove ? 'rises above' : 'falls below';
    header   = `${emoji} <b>Alert Set — ${symbol}</b>`;
    subtitle = `You'll be notified when <b>${symbol}</b> ${dirWord}`;
    rows.push(tgRow('Target',    `<b>${formatPrice(targetPrice, assetId)}</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  }

  if (note) rows.push(tgRow('Note', `<i>${note}</i>`));

  return [header, ``, subtitle, ``, ...rows, ``, `<i>Watching the markets for you 👀</i>`].join('\n');
}

// ═══════════════════════════════════════════════
// REMOVE ASSET FROM WATCHLIST
// ═══════════════════════════════════════════════
function removeAssetFromWatchlist(assetId, cat, event) {
  event.stopPropagation();
  const catAssets = ASSETS[cat];
  if (!catAssets) return;
  const asset = catAssets.find(a => a.id === assetId);
  if (!asset) return;

  // Deselect if currently selected
  if (selectedAsset && selectedAsset.id === assetId) {
    selectedAsset = null;
    document.getElementById('sel-symbol').textContent = 'Select Asset';
    document.getElementById('sel-name').textContent = 'Tap any asset to view its chart';
  }

  ASSETS[cat] = catAssets.filter(a => a.id !== assetId);
  removeFromWatchlist(assetId); // sync to DB
  renderWatchlist();
  renderHotList();  // refresh + button state on hot list
  populateDropdown();
  showToast(`${asset.symbol} Removed`, `${asset.name} removed from your watchlist.`, 'error');
}

// ═══════════════════════════════════════════════
// COMPREHENSIVE ASSET LIBRARY (500+ assets)
// Includes ALL default watchlist assets so removed
// assets always reappear here for re-adding.
// ═══════════════════════════════════════════════
const ASSET_LIBRARY = [

  // ── CRYPTO (50+) ──────────────────────────────
  { id:'bitcoin',      symbol:'BTC',    name:'Bitcoin',            cat:'crypto', tdSymbol:'BTC/USD',    source:'CoinGecko', base:68400 },
  { id:'ethereum',     symbol:'ETH',    name:'Ethereum',           cat:'crypto', tdSymbol:'ETH/USD',    source:'CoinGecko', base:3520 },
  { id:'solana',       symbol:'SOL',    name:'Solana',             cat:'crypto', tdSymbol:'SOL/USD',    source:'CoinGecko', base:148 },
  { id:'ripple',       symbol:'XRP',    name:'XRP',                cat:'crypto', tdSymbol:'XRP/USD',    source:'CoinGecko', base:0.52 },
  { id:'binancecoin',  symbol:'BNB',    name:'BNB',                cat:'crypto', tdSymbol:'BNB/USD',    source:'CoinGecko', base:412 },
  { id:'dogecoin',     symbol:'DOGE',   name:'Dogecoin',           cat:'crypto', tdSymbol:'DOGE/USD',   source:'CoinGecko', base:0.16 },
  { id:'cardano',      symbol:'ADA',    name:'Cardano',            cat:'crypto', tdSymbol:'ADA/USD',    source:'CoinGecko', base:0.47 },
  { id:'polkadot',     symbol:'DOT',    name:'Polkadot',           cat:'crypto', tdSymbol:'DOT/USD',    source:'CoinGecko', base:7.8 },
  { id:'avalanche-2',  symbol:'AVAX',   name:'Avalanche',          cat:'crypto', tdSymbol:'AVAX/USD',   source:'CoinGecko', base:35.4 },
  { id:'chainlink',    symbol:'LINK',   name:'Chainlink',          cat:'crypto', tdSymbol:'LINK/USD',   source:'CoinGecko', base:14.2 },
  { id:'shiba-inu',    symbol:'SHIB',   name:'Shiba Inu',          cat:'crypto', tdSymbol:'SHIB/USD',   source:'CoinGecko', base:0.0000095 },
  { id:'litecoin',     symbol:'LTC',    name:'Litecoin',           cat:'crypto', tdSymbol:'LTC/USD',    source:'CoinGecko', base:82.5 },
  { id:'uniswap',      symbol:'UNI',    name:'Uniswap',            cat:'crypto', tdSymbol:'UNI/USD',    source:'CoinGecko', base:9.8 },
  { id:'cosmos',       symbol:'ATOM',   name:'Cosmos',             cat:'crypto', tdSymbol:'ATOM/USD',   source:'CoinGecko', base:8.2 },
  { id:'stellar',      symbol:'XLM',    name:'Stellar',            cat:'crypto', tdSymbol:'XLM/USD',    source:'CoinGecko', base:0.11 },
  { id:'monero',       symbol:'XMR',    name:'Monero',             cat:'crypto', tdSymbol:'XMR/USD',    source:'CoinGecko', base:162 },
  { id:'tron',         symbol:'TRX',    name:'TRON',               cat:'crypto', tdSymbol:'TRX/USD',    source:'CoinGecko', base:0.12 },
  { id:'aave',         symbol:'AAVE',   name:'Aave',               cat:'crypto', tdSymbol:'AAVE/USD',   source:'CoinGecko', base:92 },
  { id:'near',         symbol:'NEAR',   name:'NEAR Protocol',      cat:'crypto', tdSymbol:'NEAR/USD',   source:'CoinGecko', base:6.5 },
  { id:'aptos',        symbol:'APT',    name:'Aptos',              cat:'crypto', tdSymbol:'APT/USD',    source:'CoinGecko', base:8.9 },
  { id:'arbitrum',     symbol:'ARB',    name:'Arbitrum',           cat:'crypto', tdSymbol:'ARB/USD',    source:'CoinGecko', base:0.92 },
  { id:'optimism',     symbol:'OP',     name:'Optimism',           cat:'crypto', tdSymbol:'OP/USD',     source:'CoinGecko', base:1.8 },
  { id:'sui',          symbol:'SUI',    name:'Sui',                cat:'crypto', tdSymbol:'SUI/USD',    source:'CoinGecko', base:1.35 },
  { id:'toncoin',      symbol:'TON',    name:'Toncoin',            cat:'crypto', tdSymbol:'TON/USD',    source:'CoinGecko', base:5.6 },
  { id:'pepe',         symbol:'PEPE',   name:'Pepe',               cat:'crypto', tdSymbol:'PEPE/USD',   source:'CoinGecko', base:0.0000115 },
  { id:'bonk',         symbol:'BONK',   name:'Bonk',               cat:'crypto', tdSymbol:'BONK/USD',   source:'CoinGecko', base:0.000022 },
  { id:'maker',        symbol:'MKR',    name:'MakerDAO',           cat:'crypto', tdSymbol:'MKR/USD',    source:'CoinGecko', base:1850 },
  { id:'injective-protocol',symbol:'INJ',name:'Injective',        cat:'crypto', tdSymbol:'INJ/USD',    source:'CoinGecko', base:25 },
  { id:'kaspa',        symbol:'KAS',    name:'Kaspa',              cat:'crypto', tdSymbol:'KAS/USD',    source:'CoinGecko', base:0.115 },
  { id:'render-token', symbol:'RENDER', name:'Render',             cat:'crypto', tdSymbol:'RENDER/USD', source:'CoinGecko', base:6.8 },
  { id:'fetch-ai',     symbol:'FET',    name:'Fetch.AI',           cat:'crypto', tdSymbol:'FET/USD',    source:'CoinGecko', base:1.5 },
  { id:'worldcoin-wld',symbol:'WLD',    name:'Worldcoin',          cat:'crypto', tdSymbol:'WLD/USD',    source:'CoinGecko', base:2.4 },
  { id:'celestia',     symbol:'TIA',    name:'Celestia',           cat:'crypto', tdSymbol:'TIA/USD',    source:'CoinGecko', base:6.2 },
  { id:'starknet',     symbol:'STRK',   name:'Starknet',           cat:'crypto', tdSymbol:'STRK/USD',   source:'CoinGecko', base:0.88 },
  { id:'immutable-x',  symbol:'IMX',   name:'Immutable X',        cat:'crypto', tdSymbol:'IMX/USD',    source:'CoinGecko', base:1.6 },
  { id:'hedera',       symbol:'HBAR',   name:'Hedera',             cat:'crypto', tdSymbol:'HBAR/USD',   source:'CoinGecko', base:0.09 },
  { id:'vechain',      symbol:'VET',    name:'VeChain',            cat:'crypto', tdSymbol:'VET/USD',    source:'CoinGecko', base:0.035 },
  { id:'algorand',     symbol:'ALGO',   name:'Algorand',           cat:'crypto', tdSymbol:'ALGO/USD',   source:'CoinGecko', base:0.18 },
  { id:'filecoin',     symbol:'FIL',    name:'Filecoin',           cat:'crypto', tdSymbol:'FIL/USD',    source:'CoinGecko', base:5.8 },
  { id:'the-graph',    symbol:'GRT',    name:'The Graph',          cat:'crypto', tdSymbol:'GRT/USD',    source:'CoinGecko', base:0.18 },
  { id:'curve-dao-token',symbol:'CRV',  name:'Curve DAO',          cat:'crypto', tdSymbol:'CRV/USD',    source:'CoinGecko', base:0.42 },
  { id:'floki',        symbol:'FLOKI',  name:'Floki',              cat:'crypto', tdSymbol:'FLOKI/USD',  source:'CoinGecko', base:0.000175 },

  // ── STOCKS — US Tech ──────────────────────────
  { id:'AAPL', symbol:'AAPL', name:'Apple Inc.',         cat:'stocks', tdSymbol:'AAPL', source:'Twelve Data', base:189.4 },
  { id:'TSLA', symbol:'TSLA', name:'Tesla Inc.',         cat:'stocks', tdSymbol:'TSLA', source:'Twelve Data', base:175.2 },
  { id:'NVDA', symbol:'NVDA', name:'NVIDIA Corp.',       cat:'stocks', tdSymbol:'NVDA', source:'Twelve Data', base:875.3 },
  { id:'MSFT', symbol:'MSFT', name:'Microsoft Corp.',    cat:'stocks', tdSymbol:'MSFT', source:'Twelve Data', base:418.7 },
  { id:'AMZN', symbol:'AMZN', name:'Amazon',             cat:'stocks', tdSymbol:'AMZN', source:'Twelve Data', base:185.2 },
  { id:'GOOGL',symbol:'GOOGL',name:'Alphabet (Google)',  cat:'stocks', tdSymbol:'GOOGL',source:'Twelve Data', base:175.8 },
  { id:'META', symbol:'META', name:'Meta Platforms',     cat:'stocks', tdSymbol:'META', source:'Twelve Data', base:510.3 },
  { id:'NFLX', symbol:'NFLX', name:'Netflix',            cat:'stocks', tdSymbol:'NFLX', source:'Twelve Data', base:625.7 },
  { id:'AMD',  symbol:'AMD',  name:'AMD',                cat:'stocks', tdSymbol:'AMD',  source:'Twelve Data', base:172.4 },
  { id:'INTC', symbol:'INTC', name:'Intel',              cat:'stocks', tdSymbol:'INTC', source:'Twelve Data', base:31.2 },
  { id:'QCOM', symbol:'QCOM', name:'Qualcomm',           cat:'stocks', tdSymbol:'QCOM', source:'Twelve Data', base:168.5 },
  { id:'CRM',  symbol:'CRM',  name:'Salesforce',         cat:'stocks', tdSymbol:'CRM',  source:'Twelve Data', base:285 },
  { id:'ORCL', symbol:'ORCL', name:'Oracle',             cat:'stocks', tdSymbol:'ORCL', source:'Twelve Data', base:122 },
  { id:'ADBE', symbol:'ADBE', name:'Adobe',              cat:'stocks', tdSymbol:'ADBE', source:'Twelve Data', base:460 },
  { id:'NOW',  symbol:'NOW',  name:'ServiceNow',         cat:'stocks', tdSymbol:'NOW',  source:'Twelve Data', base:780 },
  { id:'SNOW', symbol:'SNOW', name:'Snowflake',          cat:'stocks', tdSymbol:'SNOW', source:'Twelve Data', base:148 },
  { id:'PLTR', symbol:'PLTR', name:'Palantir',           cat:'stocks', tdSymbol:'PLTR', source:'Twelve Data', base:22.5 },
  { id:'COIN', symbol:'COIN', name:'Coinbase',           cat:'stocks', tdSymbol:'COIN', source:'Twelve Data', base:195 },
  { id:'UBER', symbol:'UBER', name:'Uber',               cat:'stocks', tdSymbol:'UBER', source:'Twelve Data', base:72 },
  { id:'ABNB', symbol:'ABNB', name:'Airbnb',             cat:'stocks', tdSymbol:'ABNB', source:'Twelve Data', base:142 },
  { id:'SPOT', symbol:'SPOT', name:'Spotify',            cat:'stocks', tdSymbol:'SPOT', source:'Twelve Data', base:320 },
  { id:'SQ',   symbol:'SQ',   name:'Block (Square)',     cat:'stocks', tdSymbol:'SQ',   source:'Twelve Data', base:68 },
  { id:'PYPL', symbol:'PYPL', name:'PayPal',             cat:'stocks', tdSymbol:'PYPL', source:'Twelve Data', base:62 },
  // Finance
  { id:'JPM',  symbol:'JPM',  name:'JPMorgan Chase',     cat:'stocks', tdSymbol:'JPM',  source:'Twelve Data', base:198.5 },
  { id:'GS',   symbol:'GS',   name:'Goldman Sachs',      cat:'stocks', tdSymbol:'GS',   source:'Twelve Data', base:463.2 },
  { id:'BAC',  symbol:'BAC',  name:'Bank of America',    cat:'stocks', tdSymbol:'BAC',  source:'Twelve Data', base:38.7 },
  { id:'MS',   symbol:'MS',   name:'Morgan Stanley',     cat:'stocks', tdSymbol:'MS',   source:'Twelve Data', base:92 },
  { id:'WFC',  symbol:'WFC',  name:'Wells Fargo',        cat:'stocks', tdSymbol:'WFC',  source:'Twelve Data', base:55.8 },
  { id:'V',    symbol:'V',    name:'Visa',               cat:'stocks', tdSymbol:'V',    source:'Twelve Data', base:275 },
  { id:'MA',   symbol:'MA',   name:'Mastercard',         cat:'stocks', tdSymbol:'MA',   source:'Twelve Data', base:465 },
  // Healthcare
  { id:'JNJ',  symbol:'JNJ',  name:'Johnson & Johnson',  cat:'stocks', tdSymbol:'JNJ',  source:'Twelve Data', base:156 },
  { id:'PFE',  symbol:'PFE',  name:'Pfizer',             cat:'stocks', tdSymbol:'PFE',  source:'Twelve Data', base:27.5 },
  { id:'MRNA', symbol:'MRNA', name:'Moderna',            cat:'stocks', tdSymbol:'MRNA', source:'Twelve Data', base:82 },
  { id:'LLY',  symbol:'LLY',  name:'Eli Lilly',          cat:'stocks', tdSymbol:'LLY',  source:'Twelve Data', base:758 },
  { id:'UNH',  symbol:'UNH',  name:'UnitedHealth',       cat:'stocks', tdSymbol:'UNH',  source:'Twelve Data', base:492 },
  // Consumer / Energy
  { id:'WMT',  symbol:'WMT',  name:'Walmart',            cat:'stocks', tdSymbol:'WMT',  source:'Twelve Data', base:172 },
  { id:'COST', symbol:'COST', name:'Costco',             cat:'stocks', tdSymbol:'COST', source:'Twelve Data', base:730 },
  { id:'NKE',  symbol:'NKE',  name:'Nike',               cat:'stocks', tdSymbol:'NKE',  source:'Twelve Data', base:92 },
  { id:'DIS',  symbol:'DIS',  name:'Walt Disney',        cat:'stocks', tdSymbol:'DIS',  source:'Twelve Data', base:95 },
  { id:'XOM',  symbol:'XOM',  name:'ExxonMobil',         cat:'stocks', tdSymbol:'XOM',  source:'Twelve Data', base:112 },
  { id:'CVX',  symbol:'CVX',  name:'Chevron',            cat:'stocks', tdSymbol:'CVX',  source:'Twelve Data', base:155 },

  // ── FOREX — Majors ────────────────────────────
  { id:'EUR/USD', symbol:'EUR/USD', name:'Euro / US Dollar',              cat:'forex', tdSymbol:'EUR/USD', source:'Twelve Data', base:1.0842 },
  { id:'GBP/USD', symbol:'GBP/USD', name:'British Pound / US Dollar',    cat:'forex', tdSymbol:'GBP/USD', source:'Twelve Data', base:1.2645 },
  { id:'USD/JPY', symbol:'USD/JPY', name:'US Dollar / Japanese Yen',     cat:'forex', tdSymbol:'USD/JPY', source:'Twelve Data', base:149.32 },
  { id:'AUD/USD', symbol:'AUD/USD', name:'Australian Dollar / USD',      cat:'forex', tdSymbol:'AUD/USD', source:'Twelve Data', base:0.6531 },
  { id:'USD/CHF', symbol:'USD/CHF', name:'US Dollar / Swiss Franc',      cat:'forex', tdSymbol:'USD/CHF', source:'Twelve Data', base:0.8932 },
  { id:'USD/CAD', symbol:'USD/CAD', name:'US Dollar / Canadian Dollar',  cat:'forex', tdSymbol:'USD/CAD', source:'Twelve Data', base:1.3612 },
  { id:'NZD/USD', symbol:'NZD/USD', name:'New Zealand Dollar / USD',     cat:'forex', tdSymbol:'NZD/USD', source:'Twelve Data', base:0.6082 },
  // Crosses — EUR
  { id:'EUR/GBP', symbol:'EUR/GBP', name:'Euro / British Pound',         cat:'forex', tdSymbol:'EUR/GBP', source:'Twelve Data', base:0.8542 },
  { id:'EUR/JPY', symbol:'EUR/JPY', name:'Euro / Japanese Yen',          cat:'forex', tdSymbol:'EUR/JPY', source:'Twelve Data', base:162.5 },
  { id:'EUR/CHF', symbol:'EUR/CHF', name:'Euro / Swiss Franc',           cat:'forex', tdSymbol:'EUR/CHF', source:'Twelve Data', base:0.967 },
  { id:'EUR/CAD', symbol:'EUR/CAD', name:'Euro / Canadian Dollar',       cat:'forex', tdSymbol:'EUR/CAD', source:'Twelve Data', base:1.475 },
  { id:'EUR/AUD', symbol:'EUR/AUD', name:'Euro / Australian Dollar',     cat:'forex', tdSymbol:'EUR/AUD', source:'Twelve Data', base:1.659 },
  { id:'EUR/NZD', symbol:'EUR/NZD', name:'Euro / New Zealand Dollar',    cat:'forex', tdSymbol:'EUR/NZD', source:'Twelve Data', base:1.782 },
  { id:'EUR/SEK', symbol:'EUR/SEK', name:'Euro / Swedish Krona',         cat:'forex', tdSymbol:'EUR/SEK', source:'Twelve Data', base:11.32 },
  { id:'EUR/NOK', symbol:'EUR/NOK', name:'Euro / Norwegian Krone',       cat:'forex', tdSymbol:'EUR/NOK', source:'Twelve Data', base:11.65 },
  { id:'EUR/DKK', symbol:'EUR/DKK', name:'Euro / Danish Krone',          cat:'forex', tdSymbol:'EUR/DKK', source:'Twelve Data', base:7.462 },
  { id:'EUR/PLN', symbol:'EUR/PLN', name:'Euro / Polish Zloty',          cat:'forex', tdSymbol:'EUR/PLN', source:'Twelve Data', base:4.26 },
  { id:'EUR/HUF', symbol:'EUR/HUF', name:'Euro / Hungarian Forint',      cat:'forex', tdSymbol:'EUR/HUF', source:'Twelve Data', base:392 },
  { id:'EUR/CZK', symbol:'EUR/CZK', name:'Euro / Czech Koruna',          cat:'forex', tdSymbol:'EUR/CZK', source:'Twelve Data', base:25.1 },
  { id:'EUR/RON', symbol:'EUR/RON', name:'Euro / Romanian Leu',          cat:'forex', tdSymbol:'EUR/RON', source:'Twelve Data', base:4.97 },
  { id:'EUR/TRY', symbol:'EUR/TRY', name:'Euro / Turkish Lira',          cat:'forex', tdSymbol:'EUR/TRY', source:'Twelve Data', base:35.1 },
  { id:'EUR/ZAR', symbol:'EUR/ZAR', name:'Euro / South African Rand',    cat:'forex', tdSymbol:'EUR/ZAR', source:'Twelve Data', base:20.3 },
  // Crosses — GBP
  { id:'GBP/JPY', symbol:'GBP/JPY', name:'British Pound / Japanese Yen',cat:'forex', tdSymbol:'GBP/JPY', source:'Twelve Data', base:188.9 },
  { id:'GBP/CHF', symbol:'GBP/CHF', name:'British Pound / Swiss Franc',  cat:'forex', tdSymbol:'GBP/CHF', source:'Twelve Data', base:1.128 },
  { id:'GBP/CAD', symbol:'GBP/CAD', name:'British Pound / Canadian Dollar',cat:'forex',tdSymbol:'GBP/CAD',source:'Twelve Data',base:1.712 },
  { id:'GBP/AUD', symbol:'GBP/AUD', name:'British Pound / Australian Dollar',cat:'forex',tdSymbol:'GBP/AUD',source:'Twelve Data',base:1.939 },
  { id:'GBP/NZD', symbol:'GBP/NZD', name:'British Pound / New Zealand Dollar',cat:'forex',tdSymbol:'GBP/NZD',source:'Twelve Data',base:2.074 },
  // Crosses — AUD
  { id:'AUD/JPY', symbol:'AUD/JPY', name:'Australian Dollar / Japanese Yen',cat:'forex',tdSymbol:'AUD/JPY',source:'Twelve Data',base:97.5 },
  { id:'AUD/CAD', symbol:'AUD/CAD', name:'Australian Dollar / Canadian Dollar',cat:'forex',tdSymbol:'AUD/CAD',source:'Twelve Data',base:0.897 },
  { id:'AUD/CHF', symbol:'AUD/CHF', name:'Australian Dollar / Swiss Franc',cat:'forex',tdSymbol:'AUD/CHF',source:'Twelve Data',base:0.584 },
  { id:'AUD/NZD', symbol:'AUD/NZD', name:'Australian Dollar / New Zealand Dollar',cat:'forex',tdSymbol:'AUD/NZD',source:'Twelve Data',base:1.074 },
  // Crosses — NZD
  { id:'NZD/JPY', symbol:'NZD/JPY', name:'New Zealand Dollar / Japanese Yen',cat:'forex',tdSymbol:'NZD/JPY',source:'Twelve Data',base:90.8 },
  { id:'NZD/CAD', symbol:'NZD/CAD', name:'New Zealand Dollar / Canadian Dollar',cat:'forex',tdSymbol:'NZD/CAD',source:'Twelve Data',base:0.835 },
  { id:'NZD/CHF', symbol:'NZD/CHF', name:'New Zealand Dollar / Swiss Franc',cat:'forex',tdSymbol:'NZD/CHF',source:'Twelve Data',base:0.544 },
  // Crosses — CAD
  { id:'CAD/JPY', symbol:'CAD/JPY', name:'Canadian Dollar / Japanese Yen',cat:'forex',tdSymbol:'CAD/JPY',source:'Twelve Data',base:109.7 },
  { id:'CAD/CHF', symbol:'CAD/CHF', name:'Canadian Dollar / Swiss Franc',cat:'forex',tdSymbol:'CAD/CHF',source:'Twelve Data',base:0.656 },
  // Crosses — CHF
  { id:'CHF/JPY', symbol:'CHF/JPY', name:'Swiss Franc / Japanese Yen',  cat:'forex', tdSymbol:'CHF/JPY', source:'Twelve Data', base:167.2 },
  // USD EM & Exotics
  { id:'USD/SGD', symbol:'USD/SGD', name:'US Dollar / Singapore Dollar', cat:'forex', tdSymbol:'USD/SGD', source:'Twelve Data', base:1.342 },
  { id:'USD/HKD', symbol:'USD/HKD', name:'US Dollar / Hong Kong Dollar', cat:'forex', tdSymbol:'USD/HKD', source:'Twelve Data', base:7.824 },
  { id:'USD/MXN', symbol:'USD/MXN', name:'US Dollar / Mexican Peso',    cat:'forex', tdSymbol:'USD/MXN', source:'Twelve Data', base:17.15 },
  { id:'USD/ZAR', symbol:'USD/ZAR', name:'US Dollar / South African Rand',cat:'forex',tdSymbol:'USD/ZAR',source:'Twelve Data',base:18.72 },
  { id:'USD/TRY', symbol:'USD/TRY', name:'US Dollar / Turkish Lira',    cat:'forex', tdSymbol:'USD/TRY', source:'Twelve Data', base:32.45 },
  { id:'USD/SEK', symbol:'USD/SEK', name:'US Dollar / Swedish Krona',   cat:'forex', tdSymbol:'USD/SEK', source:'Twelve Data', base:10.42 },
  { id:'USD/NOK', symbol:'USD/NOK', name:'US Dollar / Norwegian Krone', cat:'forex', tdSymbol:'USD/NOK', source:'Twelve Data', base:10.58 },
  { id:'USD/DKK', symbol:'USD/DKK', name:'US Dollar / Danish Krone',    cat:'forex', tdSymbol:'USD/DKK', source:'Twelve Data', base:6.88 },
  { id:'USD/INR', symbol:'USD/INR', name:'US Dollar / Indian Rupee',    cat:'forex', tdSymbol:'USD/INR', source:'Twelve Data', base:83.2 },
  { id:'USD/CNY', symbol:'USD/CNY', name:'US Dollar / Chinese Yuan',    cat:'forex', tdSymbol:'USD/CNY', source:'Twelve Data', base:7.24 },
  { id:'USD/CNH', symbol:'USD/CNH', name:'US Dollar / Offshore CNY',    cat:'forex', tdSymbol:'USD/CNH', source:'Twelve Data', base:7.26 },
  { id:'USD/KRW', symbol:'USD/KRW', name:'US Dollar / South Korean Won',cat:'forex', tdSymbol:'USD/KRW', source:'Twelve Data', base:1322 },
  { id:'USD/BRL', symbol:'USD/BRL', name:'US Dollar / Brazilian Real',  cat:'forex', tdSymbol:'USD/BRL', source:'Twelve Data', base:4.97 },
  { id:'USD/IDR', symbol:'USD/IDR', name:'US Dollar / Indonesian Rupiah',cat:'forex',tdSymbol:'USD/IDR', source:'Twelve Data', base:15850 },
  { id:'USD/MYR', symbol:'USD/MYR', name:'US Dollar / Malaysian Ringgit',cat:'forex',tdSymbol:'USD/MYR', source:'Twelve Data', base:4.72 },
  { id:'USD/PHP', symbol:'USD/PHP', name:'US Dollar / Philippine Peso', cat:'forex', tdSymbol:'USD/PHP', source:'Twelve Data', base:56.4 },
  { id:'USD/THB', symbol:'USD/THB', name:'US Dollar / Thai Baht',       cat:'forex', tdSymbol:'USD/THB', source:'Twelve Data', base:35.8 },
  { id:'USD/TWD', symbol:'USD/TWD', name:'US Dollar / Taiwan Dollar',   cat:'forex', tdSymbol:'USD/TWD', source:'Twelve Data', base:31.9 },
  { id:'USD/PLN', symbol:'USD/PLN', name:'US Dollar / Polish Zloty',    cat:'forex', tdSymbol:'USD/PLN', source:'Twelve Data', base:3.94 },
  { id:'USD/HUF', symbol:'USD/HUF', name:'US Dollar / Hungarian Forint',cat:'forex', tdSymbol:'USD/HUF', source:'Twelve Data', base:362 },
  { id:'USD/CZK', symbol:'USD/CZK', name:'US Dollar / Czech Koruna',    cat:'forex', tdSymbol:'USD/CZK', source:'Twelve Data', base:23.2 },
  { id:'USD/ILS', symbol:'USD/ILS', name:'US Dollar / Israeli Shekel',  cat:'forex', tdSymbol:'USD/ILS', source:'Twelve Data', base:3.73 },
  { id:'USD/AED', symbol:'USD/AED', name:'US Dollar / UAE Dirham',      cat:'forex', tdSymbol:'USD/AED', source:'Twelve Data', base:3.673 },
  { id:'USD/SAR', symbol:'USD/SAR', name:'US Dollar / Saudi Riyal',     cat:'forex', tdSymbol:'USD/SAR', source:'Twelve Data', base:3.751 },
  { id:'USD/EGP', symbol:'USD/EGP', name:'US Dollar / Egyptian Pound',  cat:'forex', tdSymbol:'USD/EGP', source:'Twelve Data', base:30.9 },
  { id:'USD/NGN', symbol:'USD/NGN', name:'US Dollar / Nigerian Naira',  cat:'forex', tdSymbol:'USD/NGN', source:'Twelve Data', base:1520 },
  { id:'USD/KES', symbol:'USD/KES', name:'US Dollar / Kenyan Shilling', cat:'forex', tdSymbol:'USD/KES', source:'Twelve Data', base:129 },
  { id:'USD/GHS', symbol:'USD/GHS', name:'US Dollar / Ghanaian Cedi',   cat:'forex', tdSymbol:'USD/GHS', source:'Twelve Data', base:12.4 },
  { id:'USD/PKR', symbol:'USD/PKR', name:'US Dollar / Pakistani Rupee', cat:'forex', tdSymbol:'USD/PKR', source:'Twelve Data', base:278 },
  { id:'USD/BDT', symbol:'USD/BDT', name:'US Dollar / Bangladeshi Taka',cat:'forex', tdSymbol:'USD/BDT', source:'Twelve Data', base:110 },
  { id:'USD/VND', symbol:'USD/VND', name:'US Dollar / Vietnamese Dong', cat:'forex', tdSymbol:'USD/VND', source:'Twelve Data', base:24850 },
  { id:'USD/CLP', symbol:'USD/CLP', name:'US Dollar / Chilean Peso',    cat:'forex', tdSymbol:'USD/CLP', source:'Twelve Data', base:948 },
  { id:'USD/COP', symbol:'USD/COP', name:'US Dollar / Colombian Peso',  cat:'forex', tdSymbol:'USD/COP', source:'Twelve Data', base:3920 },
  { id:'USD/PEN', symbol:'USD/PEN', name:'US Dollar / Peruvian Sol',    cat:'forex', tdSymbol:'USD/PEN', source:'Twelve Data', base:3.72 },
  { id:'USD/ARS', symbol:'USD/ARS', name:'US Dollar / Argentine Peso',  cat:'forex', tdSymbol:'USD/ARS', source:'Twelve Data', base:920 },
  { id:'USD/UAH', symbol:'USD/UAH', name:'US Dollar / Ukrainian Hryvnia',cat:'forex',tdSymbol:'USD/UAH', source:'Twelve Data', base:39.4 },
  { id:'USD/RUB', symbol:'USD/RUB', name:'US Dollar / Russian Ruble',   cat:'forex', tdSymbol:'USD/RUB', source:'Twelve Data', base:91.5 },

  // ── COMMODITIES ───────────────────────────────
  { id:'XAU/USD', symbol:'XAU/USD', name:'Gold Spot',         cat:'commodities', tdSymbol:'XAU/USD', source:'Twelve Data', base:2312.5 },
  { id:'XAG/USD', symbol:'XAG/USD', name:'Silver Spot',       cat:'commodities', tdSymbol:'XAG/USD', source:'Twelve Data', base:27.45 },
  { id:'WTI/USD', symbol:'WTI/USD', name:'WTI Crude Oil',     cat:'commodities', tdSymbol:'WTI/USD', source:'Twelve Data', base:78.65 },
  { id:'XNG/USD', symbol:'XNG/USD', name:'Natural Gas',       cat:'commodities', tdSymbol:'XNG/USD', source:'Twelve Data', base:1.98 },
  { id:'XPT/USD', symbol:'XPT/USD', name:'Platinum Spot',     cat:'commodities', tdSymbol:'XPT/USD', source:'Twelve Data', base:915.4 },
  { id:'XPD/USD', symbol:'XPD/USD', name:'Palladium Spot',    cat:'commodities', tdSymbol:'XPD/USD', source:'Twelve Data', base:965 },
  { id:'XCU/USD', symbol:'XCU/USD', name:'Copper Spot',       cat:'commodities', tdSymbol:'XCU/USD', source:'Twelve Data', base:4.12 },
  { id:'BRENT',   symbol:'BRENT',   name:'Brent Crude Oil',   cat:'commodities', tdSymbol:'BRENT',   source:'Twelve Data', base:82.45 },
  { id:'WHEAT',   symbol:'WHEAT',   name:'Wheat Futures',     cat:'commodities', tdSymbol:'WHEAT',   source:'Twelve Data', base:548 },
  { id:'CORN',    symbol:'CORN',    name:'Corn Futures',      cat:'commodities', tdSymbol:'CORN',    source:'Twelve Data', base:432 },
  { id:'SOYBEAN', symbol:'SOYBEAN', name:'Soybean Futures',   cat:'commodities', tdSymbol:'SOYBEAN', source:'Twelve Data', base:1178 },
  { id:'COFFEE',  symbol:'COFFEE',  name:'Coffee Futures',    cat:'commodities', tdSymbol:'COFFEE',  source:'Twelve Data', base:178.5 },
  { id:'SUGAR',   symbol:'SUGAR',   name:'Sugar Futures',     cat:'commodities', tdSymbol:'SUGAR',   source:'Twelve Data', base:19.8 },
  { id:'COCOA',   symbol:'COCOA',   name:'Cocoa Futures',     cat:'commodities', tdSymbol:'COCOA',   source:'Twelve Data', base:3850 },
  { id:'COTTON',  symbol:'COTTON',  name:'Cotton Futures',    cat:'commodities', tdSymbol:'COTTON',  source:'Twelve Data', base:78.2 },
  { id:'LUMBER',  symbol:'LUMBER',  name:'Lumber Futures',    cat:'commodities', tdSymbol:'LUMBER',  source:'Twelve Data', base:448 },

  // ── INDICES — Americas ────────────────────────
  { id:'SPX',    symbol:'S&P 500',  name:'S&P 500 Index',           cat:'indices', tdSymbol:'SPX',    source:'Twelve Data', base:5234.1 },
  { id:'IXIC',   symbol:'NASDAQ',   name:'NASDAQ Composite',        cat:'indices', tdSymbol:'IXIC',   source:'Twelve Data', base:16380.2 },
  { id:'DJI',    symbol:'DOW',      name:'Dow Jones Industrial',    cat:'indices', tdSymbol:'DJI',    source:'Twelve Data', base:39170.4 },
  { id:'RUT',    symbol:'Russell',  name:'Russell 2000',            cat:'indices', tdSymbol:'RUT',    source:'Twelve Data', base:2048 },
  { id:'VIX',    symbol:'VIX',      name:'CBOE Volatility Index',   cat:'indices', tdSymbol:'VIX',    source:'Twelve Data', base:14.8 },
  { id:'DXY',    symbol:'DXY',      name:'US Dollar Index',         cat:'indices', tdSymbol:'DXY',    source:'Twelve Data', base:104.2 },
  { id:'TNX',    symbol:'US10Y',    name:'US 10-Year Treasury',     cat:'indices', tdSymbol:'TNX',    source:'Twelve Data', base:4.32 },
  { id:'TYX',    symbol:'US30Y',    name:'US 30-Year Treasury',     cat:'indices', tdSymbol:'TYX',    source:'Twelve Data', base:4.55 },
  { id:'NDX',    symbol:'NDX 100',  name:'NASDAQ 100',              cat:'indices', tdSymbol:'NDX',    source:'Twelve Data', base:18250 },
  { id:'BVSP',   symbol:'BOVESPA',  name:'Bovespa (Brazil)',        cat:'indices', tdSymbol:'BVSP',   source:'Twelve Data', base:125800 },
  { id:'MXX',    symbol:'IPC',      name:'IPC (Mexico)',            cat:'indices', tdSymbol:'MXX',    source:'Twelve Data', base:56400 },
  { id:'MERVAL', symbol:'MERVAL',   name:'Merval (Argentina)',      cat:'indices', tdSymbol:'MERVAL', source:'Twelve Data', base:1125000 },
  { id:'IPSA',   symbol:'IPSA',     name:'IPSA (Chile)',            cat:'indices', tdSymbol:'IPSA',   source:'Twelve Data', base:6420 },
  { id:'COLCAP', symbol:'COLCAP',   name:'COLCAP (Colombia)',       cat:'indices', tdSymbol:'COLCAP', source:'Twelve Data', base:1380 },
  // Indices — Europe
  { id:'FTSE',   symbol:'FTSE 100', name:'FTSE 100 (UK)',           cat:'indices', tdSymbol:'FTSE',   source:'Twelve Data', base:7735.6 },
  { id:'DAX',    symbol:'DAX 40',   name:'DAX 40 (Germany)',        cat:'indices', tdSymbol:'DAX',    source:'Twelve Data', base:18420 },
  { id:'CAC',    symbol:'CAC 40',   name:'CAC 40 (France)',         cat:'indices', tdSymbol:'CAC',    source:'Twelve Data', base:8080 },
  { id:'IBEX',   symbol:'IBEX 35',  name:'IBEX 35 (Spain)',         cat:'indices', tdSymbol:'IBEX',   source:'Twelve Data', base:10842 },
  { id:'FTSEMIB',symbol:'FTSE MIB', name:'FTSE MIB (Italy)',        cat:'indices', tdSymbol:'FTSEMIB',source:'Twelve Data', base:33420 },
  { id:'SMI',    symbol:'SMI',      name:'Swiss Market Index',      cat:'indices', tdSymbol:'SMI',    source:'Twelve Data', base:11245 },
  { id:'AEX',    symbol:'AEX',      name:'AEX (Netherlands)',       cat:'indices', tdSymbol:'AEX',    source:'Twelve Data', base:872 },
  { id:'BEL20',  symbol:'BEL 20',   name:'BEL 20 (Belgium)',        cat:'indices', tdSymbol:'BEL20',  source:'Twelve Data', base:3842 },
  { id:'OMX',    symbol:'OMXS30',   name:'OMX Stockholm 30',        cat:'indices', tdSymbol:'OMX',    source:'Twelve Data', base:2315 },
  { id:'OMXH25', symbol:'OMXH25',   name:'OMX Helsinki 25',         cat:'indices', tdSymbol:'OMXH25', source:'Twelve Data', base:4820 },
  { id:'OMXC25', symbol:'OMXC25',   name:'OMX Copenhagen 25',       cat:'indices', tdSymbol:'OMXC25', source:'Twelve Data', base:2450 },
  { id:'OBX',    symbol:'OBX',      name:'OBX (Norway)',            cat:'indices', tdSymbol:'OBX',    source:'Twelve Data', base:1142 },
  { id:'WIG20',  symbol:'WIG20',    name:'WIG 20 (Poland)',         cat:'indices', tdSymbol:'WIG20',  source:'Twelve Data', base:2380 },
  { id:'BUX',    symbol:'BUX',      name:'Budapest Stock Exchange',  cat:'indices', tdSymbol:'BUX',    source:'Twelve Data', base:67500 },
  { id:'PX',     symbol:'PX',       name:'Prague Stock Exchange',   cat:'indices', tdSymbol:'PX',     source:'Twelve Data', base:1560 },
  { id:'ATX',    symbol:'ATX',      name:'ATX (Austria)',           cat:'indices', tdSymbol:'ATX',    source:'Twelve Data', base:3640 },
  { id:'PSI20',  symbol:'PSI 20',   name:'PSI 20 (Portugal)',       cat:'indices', tdSymbol:'PSI20',  source:'Twelve Data', base:6820 },
  { id:'MOEX',   symbol:'MOEX',     name:'MOEX (Russia)',           cat:'indices', tdSymbol:'MOEX',   source:'Twelve Data', base:3240 },
  { id:'ISE100', symbol:'BIST 100', name:'BIST 100 (Turkey)',       cat:'indices', tdSymbol:'ISE100', source:'Twelve Data', base:9840 },
  { id:'TA35',   symbol:'TA-35',    name:'Tel Aviv 35 (Israel)',    cat:'indices', tdSymbol:'TA35',   source:'Twelve Data', base:1945 },
  // Indices — Asia-Pacific
  { id:'N225',   symbol:'Nikkei',   name:'Nikkei 225 (Japan)',      cat:'indices', tdSymbol:'N225',   source:'Twelve Data', base:38540 },
  { id:'HSI',    symbol:'Hang Seng',name:'Hang Seng (Hong Kong)',   cat:'indices', tdSymbol:'HSI',    source:'Twelve Data', base:17123 },
  { id:'ASX200', symbol:'ASX 200',  name:'ASX 200 (Australia)',     cat:'indices', tdSymbol:'ASX',    source:'Twelve Data', base:7802 },
  { id:'KOSPI',  symbol:'KOSPI',    name:'KOSPI (South Korea)',     cat:'indices', tdSymbol:'KOSPI',  source:'Twelve Data', base:2590 },
  { id:'SENSEX', symbol:'SENSEX',   name:'SENSEX (India)',          cat:'indices', tdSymbol:'SENSEX', source:'Twelve Data', base:72500 },
  { id:'NIFTY',  symbol:'NIFTY 50', name:'Nifty 50 (India)',        cat:'indices', tdSymbol:'NIFTY',  source:'Twelve Data', base:21980 },
  { id:'TWII',   symbol:'TAIEX',    name:'Taiwan Weighted (TAIEX)', cat:'indices', tdSymbol:'TWII',   source:'Twelve Data', base:19840 },
  { id:'STI',    symbol:'STI',      name:'Straits Times (Singapore)',cat:'indices',tdSymbol:'STI',    source:'Twelve Data', base:3240 },
  { id:'KLCI',   symbol:'KLCI',     name:'KLCI (Malaysia)',         cat:'indices', tdSymbol:'KLCI',   source:'Twelve Data', base:1542 },
  { id:'JCI',    symbol:'IDX',      name:'IDX Composite (Indonesia)',cat:'indices',tdSymbol:'JCI',    source:'Twelve Data', base:7320 },
  { id:'SET',    symbol:'SET',      name:'SET Index (Thailand)',    cat:'indices', tdSymbol:'SET',    source:'Twelve Data', base:1385 },
  { id:'PSEi',   symbol:'PSEi',     name:'PSEi (Philippines)',      cat:'indices', tdSymbol:'PSEi',   source:'Twelve Data', base:6540 },
  { id:'CSI300', symbol:'CSI 300',  name:'CSI 300 (China)',         cat:'indices', tdSymbol:'CSI300', source:'Twelve Data', base:3520 },
  { id:'SHCOMP', symbol:'SSE',      name:'Shanghai Composite',      cat:'indices', tdSymbol:'SHCOMP', source:'Twelve Data', base:3092 },
  { id:'SZCOMP', symbol:'SZSE',     name:'Shenzhen Composite',      cat:'indices', tdSymbol:'SZCOMP', source:'Twelve Data', base:1820 },
  { id:'HSCEi',  symbol:'HSCEI',    name:'Hang Seng China Ent.',    cat:'indices', tdSymbol:'HSCEI',  source:'Twelve Data', base:6120 },
  { id:'NZ50',   symbol:'NZX 50',   name:'NZX 50 (New Zealand)',    cat:'indices', tdSymbol:'NZ50',   source:'Twelve Data', base:11840 },
  // Indices — Middle East & Africa
  { id:'TADAWUL',symbol:'TASI',     name:'Tadawul (Saudi Arabia)',  cat:'indices', tdSymbol:'TADAWUL',source:'Twelve Data', base:11250 },
  { id:'ADX',    symbol:'ADX',      name:'Abu Dhabi Securities Exch.',cat:'indices',tdSymbol:'ADX',   source:'Twelve Data', base:9380 },
  { id:'DFM',    symbol:'DFM',      name:'Dubai Financial Market',  cat:'indices', tdSymbol:'DFM',    source:'Twelve Data', base:4120 },
  { id:'EGX30',  symbol:'EGX 30',   name:'EGX 30 (Egypt)',          cat:'indices', tdSymbol:'EGX30',  source:'Twelve Data', base:24500 },
  { id:'JSE',    symbol:'JSE TOP40',name:'JSE Top 40 (South Africa)',cat:'indices',tdSymbol:'JSE',    source:'Twelve Data', base:68200 },
  { id:'NSE',    symbol:'NSE ASI',  name:'NSE All-Share (Nigeria)', cat:'indices', tdSymbol:'NSE',    source:'Twelve Data', base:97500 },

  // ── ETFs ──────────────────────────────────────
  { id:'SPY',  symbol:'SPY',  name:'SPDR S&P 500 ETF',         cat:'etf', tdSymbol:'SPY',  source:'Twelve Data', base:523.4 },
  { id:'QQQ',  symbol:'QQQ',  name:'Invesco QQQ (NASDAQ)',     cat:'etf', tdSymbol:'QQQ',  source:'Twelve Data', base:441.8 },
  { id:'IWM',  symbol:'IWM',  name:'iShares Russell 2000',     cat:'etf', tdSymbol:'IWM',  source:'Twelve Data', base:198.2 },
  { id:'DIA',  symbol:'DIA',  name:'SPDR Dow Jones ETF',       cat:'etf', tdSymbol:'DIA',  source:'Twelve Data', base:389.5 },
  { id:'GLD',  symbol:'GLD',  name:'SPDR Gold Shares ETF',     cat:'etf', tdSymbol:'GLD',  source:'Twelve Data', base:215.4 },
  { id:'SLV',  symbol:'SLV',  name:'iShares Silver Trust ETF', cat:'etf', tdSymbol:'SLV',  source:'Twelve Data', base:24.8 },
  { id:'USO',  symbol:'USO',  name:'US Oil Fund ETF',           cat:'etf', tdSymbol:'USO',  source:'Twelve Data', base:74.3 },
  { id:'TLT',  symbol:'TLT',  name:'iShares 20Y Treasury ETF', cat:'etf', tdSymbol:'TLT',  source:'Twelve Data', base:95.8 },
  { id:'XLF',  symbol:'XLF',  name:'Financial Select ETF',     cat:'etf', tdSymbol:'XLF',  source:'Twelve Data', base:40.2 },
  { id:'XLK',  symbol:'XLK',  name:'Technology Select ETF',    cat:'etf', tdSymbol:'XLK',  source:'Twelve Data', base:208.5 },
  { id:'XLE',  symbol:'XLE',  name:'Energy Select ETF',        cat:'etf', tdSymbol:'XLE',  source:'Twelve Data', base:88.4 },
  { id:'XLV',  symbol:'XLV',  name:'Health Care Select ETF',   cat:'etf', tdSymbol:'XLV',  source:'Twelve Data', base:143.2 },
  { id:'ARKK', symbol:'ARKK', name:'ARK Innovation ETF',        cat:'etf', tdSymbol:'ARKK', source:'Twelve Data', base:48.5 },
  { id:'BITO', symbol:'BITO', name:'ProShares Bitcoin ETF',     cat:'etf', tdSymbol:'BITO', source:'Twelve Data', base:28.2 },
  { id:'VWO',  symbol:'VWO',  name:'Vanguard Emerging Markets', cat:'etf', tdSymbol:'VWO',  source:'Twelve Data', base:40.8 },
  { id:'EEM',  symbol:'EEM',  name:'iShares MSCI Emerging Mkts',cat:'etf', tdSymbol:'EEM',  source:'Twelve Data', base:40.2 },
  { id:'EFA',  symbol:'EFA',  name:'iShares MSCI EAFE ETF',     cat:'etf', tdSymbol:'EFA',  source:'Twelve Data', base:78.4 },
  { id:'XBI',  symbol:'XBI',  name:'Biotech ETF (SPDR)',        cat:'etf', tdSymbol:'XBI',  source:'Twelve Data', base:95.6 },
];

function openAddModal() {
  document.getElementById('add-modal').style.display = 'flex';
  document.getElementById('modal-search').value = '';
  libSearchQuery = '';
  currentLibTab = 'ALL';
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.modal-tab').classList.add('active');
  document.getElementById('lib-total-count').textContent = ASSET_LIBRARY.length;
  renderLibrary();
  setTimeout(() => document.getElementById('modal-search').focus(), 100);
}

function closeAddModal() { document.getElementById('add-modal').style.display = 'none'; }
function closeModalIfBg(e) { if (e.target.id === 'add-modal') closeAddModal(); }

function setLibTab(tab, btn) {
  currentLibTab = tab;
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderLibrary();
}

function filterLibrary() {
  libSearchQuery = document.getElementById('modal-search').value.toLowerCase().trim();
  renderLibrary();
}

function renderLibrary() {
  const body = document.getElementById('lib-body');
  const allWatchIds = new Set(Object.values(ASSETS).flat().map(a => a.id));

  // Build full pool = ASSET_LIBRARY + any watchlist assets not already in ASSET_LIBRARY
  // This ensures removed default assets always reappear here
  const libIds = new Set(ASSET_LIBRARY.map(a => a.id));
  const extraAssets = Object.entries(ASSETS).flatMap(([cat, assets]) =>
    assets.filter(a => !libIds.has(a.id)).map(a => ({ ...a, cat }))
  );
  const fullLibrary = [...ASSET_LIBRARY, ...extraAssets];

  // Filter by tab
  let pool = currentLibTab === 'ALL'
    ? fullLibrary
    : currentLibTab === 'watchlist'
      ? Object.entries(ASSETS).flatMap(([cat, assets]) => assets.map(a => ({ ...a, cat })))
      : fullLibrary.filter(a => a.cat === currentLibTab);

  // Filter by search (search always scans full library, not just current tab)
  if (libSearchQuery) {
    pool = fullLibrary.filter(a =>
      a.symbol.toLowerCase().includes(libSearchQuery) ||
      a.name.toLowerCase().includes(libSearchQuery) ||
      a.cat.toLowerCase().includes(libSearchQuery)
    );
  }

  document.getElementById('lib-result-count').textContent = `${pool.length} results`;

  if (currentLibTab === 'watchlist') {
    body.innerHTML = '';
    const allWatchAssets = Object.entries(ASSETS).flatMap(([cat, assets]) =>
      assets.map(a => ({ ...a, cat }))
    );
    if (allWatchAssets.length === 0) {
      body.innerHTML = '<div class="lib-empty">Your watchlist is empty.<br>Switch to another tab to add assets.</div>';
      return;
    }
    const groups = {};
    allWatchAssets.forEach(a => { if (!groups[a.cat]) groups[a.cat] = []; groups[a.cat].push(a); });
    const catLabels = { crypto:'Crypto', stocks:'Stocks', forex:'Forex', commodities:'Commodities', indices:'Indices', etf:'ETFs' };
    Object.entries(groups).forEach(([cat, assets]) => {
      const sec = document.createElement('div');
      sec.innerHTML = `<div class="lib-section-title">${catLabels[cat] || cat} · ${assets.length} assets</div>`;
      const grid = document.createElement('div');
      grid.className = 'lib-grid';
      assets.forEach(asset => {
        const card = document.createElement('div');
        card.className = 'lib-card in-watch';
        card.style.opacity = '1'; card.style.cursor = 'pointer';
        card.style.borderColor = 'rgba(255,61,90,0.4)';
        card.innerHTML = `<div><div class="lib-sym">${asset.symbol}</div><div class="lib-name">${asset.name}</div></div><div class="lib-action" style="color:var(--red)"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>`;
        card.onclick = (e) => { e.stopPropagation(); removeAssetFromWatchlist(asset.id, cat, { stopPropagation:()=>{} }); renderLibrary(); };
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      body.appendChild(sec);
    });
    return;
  }

  if (pool.length === 0) {
    body.innerHTML = '<div class="lib-empty">No assets found.<br>Try a different keyword.</div>';
    return;
  }

  const groups = {};
  pool.forEach(a => { if (!groups[a.cat]) groups[a.cat] = []; groups[a.cat].push(a); });
  const catOrder = ['crypto','stocks','forex','commodities','indices','etf'];
  const catLabels = { crypto:'Crypto', stocks:'Stocks', forex:'Forex', commodities:'Commodities', indices:'Indices', etf:'ETFs' };

  body.innerHTML = '';
  catOrder.forEach(cat => {
    if (!groups[cat]) return;
    const sec = document.createElement('div');
    sec.innerHTML = `<div class="lib-section-title">${catLabels[cat]} · ${groups[cat].length} assets</div>`;
    const grid = document.createElement('div');
    grid.className = 'lib-grid';
    groups[cat].forEach(asset => {
      const inWatch = allWatchIds.has(asset.id);
      const card = document.createElement('div');
      card.className = `lib-card${inWatch ? ' in-watch' : ''}`;
      card.innerHTML = `
        <div>
          <div class="lib-sym">${asset.symbol}</div>
          <div class="lib-name">${asset.name}</div>
        </div>
        <div class="lib-action">${inWatch
          ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
        }</div>`;
      if (!inWatch) card.onclick = (e) => { e.stopPropagation(); addAssetToWatchlist(asset); };
      grid.appendChild(card);
    });
    sec.appendChild(grid);
    body.appendChild(sec);
  });
}

function getCatForAsset(id) {
  for (const [cat, assets] of Object.entries(ASSETS)) {
    if (assets.find(a => a.id === id)) return cat;
  }
  return 'stocks';
}

function addAssetToWatchlist(asset) {
  if (!ASSETS[asset.cat]) ASSETS[asset.cat] = [];
  if (ASSETS[asset.cat].find(a => a.id === asset.id)) return;

  ASSETS[asset.cat].push({ id: asset.id, symbol: asset.symbol, name: asset.name, tdSymbol: asset.tdSymbol, source: asset.source });
  // Start with no price — will be populated by next fetch cycle
  priceData[asset.id] = priceData[asset.id] || null;
  prices[asset.id]    = prices[asset.id]    || null;

  renderWatchlist();
  populateDropdown();
  showToast(`＋ ${asset.symbol} Added`, `${asset.name} is now on your watchlist.`, 'success');

  // Defer renderLibrary so the current click event fully completes before DOM is rebuilt.
  // Without this, rebuilding lib-body mid-click causes the event to retarget to the
  // modal overlay, which triggers closeModalIfBg and closes the modal immediately.
  setTimeout(() => renderLibrary(), 0);

  // Fetch latest price data
  // Price fetch happens on background interval — no per-click fetch needed
}




// populateDropdown — kept as no-op; asset is now shown as plain text via selectAsset()
function populateDropdown() {}

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
function showToast(title, body, type = 'success') {
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') toast.style.borderColor = 'var(--red)';
  if (type === 'alert') toast.style.borderColor = 'var(--gold)';
  toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-body">${body}</div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ═══════════════════════════════════════════════
// REFRESH & TICK
// ═══════════════════════════════════════════════
async function refreshAll() {
  document.getElementById('status-pill').textContent = '◌ CONNECTING';
  document.getElementById('status-pill').style.borderColor = 'var(--muted)';
  document.getElementById('status-pill').style.color = 'var(--muted)';
  renderHotList();
  renderWatchlist();
  await fetchAllPrices();
  setStatusPill(true);
  renderHotList();
  renderWatchlist();
  refreshSelectedAssetPanel();
  checkAlerts();
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
}

// Auto-tick every 8 seconds — picks up WS price updates
setInterval(() => {
  renderHotList();
  renderWatchlist();
  refreshSelectedAssetPanel();
  checkAlerts();
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
}, 8000);

// Real price refresh every 60 seconds
setInterval(() => {
  fetchAllPrices();
}, 60 * 1000);

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
async function init() {
  // Push initial history state so Android back button is interceptable from the start
  window.history.replaceState({ twTab: 'watchlist' }, '', '');

  await getOrCreateUser(currentTelegramId);

  const prefs = await loadPreferencesFromDB();
  const isTelegramApp = !!window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  if (isTelegramApp) {
    soundEnabled = prefs?.sound_enabled ?? true;
    if (!prefs?.telegram_chat_id) {
      savePreferencesDB({ telegram_chat_id: telegramChatId, telegram_enabled: true, sound_enabled: soundEnabled });
    }
    // Silent connection — no nag toast
  } else {
    // Not inside Telegram — show blocking connect prompt
    soundEnabled = prefs?.sound_enabled ?? true;
    showTgConnectPrompt();
    return; // halt init until user opens via bot
  }
  updateTgBtn();

  const dbAlerts = await loadAlertsFromDB();
  if (dbAlerts !== null) alerts = dbAlerts;

  await initAlertHistory();

  const rankings = await loadHotListRankings();
  if (rankings) {
    Object.keys(HOT_LIST_SEED).forEach(cat => {
      const dbOrder  = rankings[cat] || [];
      const seedIds  = HOT_LIST_SEED[cat];
      const merged   = [...new Set([...dbOrder, ...seedIds])];
      HOT_LIST[cat]  = merged.filter(id =>
        Object.values(ASSETS).flat().some(a => a.id === id)
      );
    });
  }

  populateDropdown();
  renderHotList();
  renderWatchlist();
  renderAlerts();
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();

  // Initial REST fetch — all assets
  await fetchAllPrices();
  setStatusPill(true);

  renderHotList();
  renderWatchlist();
  refreshSelectedAssetPanel();
  renderAlerts();

}

function setStatusPill(isLive) {
  const pill = document.getElementById('status-pill');
  if (isLive) {
    pill.textContent = '● LIVE';
    pill.style.borderColor = 'var(--green)';
    pill.style.color = 'var(--green)';
  } else {
    pill.textContent = '◈ OFFLINE';
    pill.style.borderColor = 'var(--red)';
    pill.style.color = 'var(--red)';
    pill.title = 'Live price APIs unreachable. Check your connection.';
  }
}

window.addEventListener('resize', () => { if (selectedAsset && window.innerWidth > 768) loadTVChart(selectedAsset); });

// Refresh prices when user returns to the tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') fetchAllPrices();
});

// ── TELEGRAM CONNECT PROMPT (blocks app if not in Telegram) ──
function showTgConnectPrompt() {
  // Hide the main app content
  document.querySelector('.app').style.display = 'none';

  // Build and show a full-screen connect gate
  const gate = document.createElement('div');
  gate.id = 'tg-gate';
  gate.style.cssText = `
    position:fixed;inset:0;z-index:99999;
    background:var(--bg);
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    padding:32px;text-align:center;
  `;
  gate.innerHTML = `
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style="margin-bottom:24px;opacity:0.9">
      <circle cx="28" cy="28" r="27" stroke="#2AABEE" stroke-width="2"/>
      <path d="M38 18L18 25l7 3 2 7 3-4 6 4 2-17z" stroke="#2AABEE" stroke-width="2" stroke-linejoin="round" fill="none"/>
      <line x1="25" y1="28" x2="30" y2="26" stroke="#2AABEE" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
    <div style="font-size:1.2rem;font-weight:700;letter-spacing:0.08em;margin-bottom:10px;color:var(--text)">CONNECT TELEGRAM</div>
    <div style="font-size:0.85rem;color:var(--muted);line-height:1.6;max-width:280px;margin-bottom:28px">
      TradeWatch delivers alerts directly to your Telegram.<br><br>
      To continue, open the app through the bot so your account can be linked automatically.
    </div>
    <a href="https://t.me/tradewatchalert_bot" target="_blank"
       style="display:inline-flex;align-items:center;gap:8px;background:#2AABEE;color:#fff;font-weight:700;font-size:0.9rem;letter-spacing:0.06em;padding:14px 28px;border-radius:10px;text-decoration:none;">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L2 6.5l4 1.5 1.5 4 2-3 3.5 2.5L14 2z" stroke="white" stroke-width="1.3" stroke-linejoin="round" fill="none"/></svg>
      OPEN @tradewatchalert_bot
    </a>
    <div style="margin-top:16px;font-size:0.72rem;color:var(--muted);opacity:0.6">
      Tap the bot → tap START → open the app link
    </div>
  `;
  document.body.appendChild(gate);
}

// ── TELEGRAM CONNECTION TOAST ─────────────────────
function showTgToast(msg) {
  const el = document.getElementById('tg-toast');
  if (!el) return;
  el.innerHTML = msg;
  el.style.display = 'block';
  el.style.opacity = '1';
  setTimeout(() => {
    el.style.transition = 'opacity 0.6s';
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; el.style.transition = ''; }, 600);
  }, 4000);
}

// ── SWIPE GESTURES (mobile) ──────────────────────
(function() {
  let touchStartX = 0, touchStartY = 0;

  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (window.innerWidth > 768) return;
    if (document.getElementById('add-modal').style.display !== 'none') return;
    if (document.getElementById('tg-modal').style.display !== 'none') return;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // Must be mostly horizontal and at least 60px
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    if (dx > 0) {
      // Swipe RIGHT → go back
      goBack();
    } else {
      // Swipe LEFT → go forward contextually
      const current = navStack[navStack.length - 1];
      if (current === 'watchlist' && selectedAsset) {
        mobileTab('chart');
      } else if (current === 'chart') {
        mobileTab('alerts');
      }
    }
  }, { passive: true });
})();

init();
