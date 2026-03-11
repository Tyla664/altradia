// ═══════════════════════════════════════════════
// API KEYS
// ═══════════════════════════════════════════════
const TD_KEY = '6d7175c59a1546a28e37b0b23c402ec5'; // Twelve Data

// ═══════════════════════════════════════════════
// DATA DEFINITIONS
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
    { id: 'EUR/USD', symbol: 'EUR/USD', name: 'Euro / US Dollar',         tdSymbol: 'EUR/USD', source: 'Twelve Data' },
    { id: 'GBP/USD', symbol: 'GBP/USD', name: 'Pound / US Dollar',        tdSymbol: 'GBP/USD', source: 'Twelve Data' },
    { id: 'USD/JPY', symbol: 'USD/JPY', name: 'Dollar / Japanese Yen',    tdSymbol: 'USD/JPY', source: 'Twelve Data' },
    { id: 'AUD/USD', symbol: 'AUD/USD', name: 'Australian / US Dollar',   tdSymbol: 'AUD/USD', source: 'Twelve Data' },
  ],
  commodities: [
    { id: 'XAU/USD', symbol: 'XAU/USD',  name: 'Gold Spot',      tdSymbol: 'XAU/USD',  source: 'Twelve Data' },
    { id: 'XAG/USD', symbol: 'XAG/USD',  name: 'Silver Spot',    tdSymbol: 'XAG/USD',  source: 'Twelve Data' },
    { id: 'WTI/USD', symbol: 'WTI/USD',  name: 'WTI Crude Oil',  tdSymbol: 'WTI/USD',  source: 'Twelve Data' },
    { id: 'XNG/USD', symbol: 'XNG/USD',  name: 'Natural Gas',    tdSymbol: 'XNG/USD',  source: 'Twelve Data' },
  ],
  indices: [
    { id: 'SPX',  symbol: 'S&P 500', name: 'S&P 500 Index',        tdSymbol: 'SPX',  source: 'Twelve Data' },
    { id: 'IXIC', symbol: 'NASDAQ',  name: 'NASDAQ Composite',     tdSymbol: 'IXIC', source: 'Twelve Data' },
    { id: 'DJI',  symbol: 'DOW',     name: 'Dow Jones Industrial', tdSymbol: 'DJI',  source: 'Twelve Data' },
    { id: 'FTSE', symbol: 'FTSE 100',name: 'FTSE 100 Index',       tdSymbol: 'FTSE', source: 'Twelve Data' },
  ]
};

// Base prices for simulation fallback — updated March 2026
const BASE_PRICES = {
  bitcoin: 85000, ethereum: 2200, solana: 135, ripple: 2.30, binancecoin: 590,
  AAPL: 225.0, TSLA: 280.0, NVDA: 115.0, MSFT: 410.0,
  'EUR/USD': 1.0820, 'GBP/USD': 1.2900, 'USD/JPY': 148.50, 'AUD/USD': 0.6280,
  'XAU/USD': 2910.0, 'XAG/USD': 32.50, 'WTI/USD': 69.50, 'XNG/USD': 4.10,
  SPX: 5620.0, IXIC: 17600.0, DJI: 41800.0, FTSE: 8600.0
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
// FETCH HELPERS — CORS proxy chain + simulation fallback
// Tries direct → allorigins proxy → corsproxy.io → simulation
// ═══════════════════════════════════════════════

// CORS proxy wrappers
const CORS_PROXIES = [
  url => url, // try direct first (works when hosted)
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

async function fetchWithCORSFallback(url) {
  for (const proxy of CORS_PROXIES) {
    try {
      const proxiedUrl = proxy(url);
      const res = await fetch(proxiedUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const text = await res.text();
      return JSON.parse(text);
    } catch (e) {
      // try next proxy
    }
  }
  throw new Error('All proxies failed for: ' + url);
}

// ── TWELVE DATA ──────────────────────────────────
async function fetchTwelveDataBatch(assets) {
  const symbols = assets.map(a => a.tdSymbol).join(',');
  try {
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols)}&apikey=${TD_KEY}`;
    const data = await fetchWithCORSFallback(url);

    assets.forEach(asset => {
      const q = assets.length === 1 ? data : (data[asset.tdSymbol] || data);
      if (!q || q.status === 'error' || !q.close) return;

      const price  = parseFloat(q.close);
      const high   = parseFloat(q.high  || price * 1.01);
      const low    = parseFloat(q.low   || price * 0.99);
      const change = parseFloat(q.percent_change || 0);
      const vol    = parseFloat(q.volume || 0);

      priceData[asset.id] = {
        price, change: change.toFixed(2), high, low,
        vol: vol ? formatLarge(vol) : '—', mcap: '—', live: true
      };
      prices[asset.id]      = price;
      BASE_PRICES[asset.id] = price;
    });
    return true;
  } catch(e) {
    console.warn('Twelve Data batch failed:', e.message);
    return false;
  }
}

async function fetchAllTwelveData() {
  const nonCrypto = [
    ...(ASSETS.stocks || []),
    ...(ASSETS.forex  || []),
    ...(ASSETS.commodities || []),
    ...(ASSETS.indices || []),
    ...(ASSETS.etf    || []),
  ];

  const batchSize = 8;
  for (let i = 0; i < nonCrypto.length; i += batchSize) {
    const batch = nonCrypto.slice(i, i + batchSize);
    await fetchTwelveDataBatch(batch);
    if (i + batchSize < nonCrypto.length) {
      await new Promise(r => setTimeout(r, 900));
    }
  }

  renderWatchlist();
  refreshSelectedAssetPanel();
  checkAlerts();
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
}

// ── COINGECKO ────────────────────────────────────
async function fetchCryptoFromCoinGecko() {
  const ids = (ASSETS.crypto || []).map(a => a.id).join(',');
  if (!ids) return false;
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_high_24h=true&include_low_24h=true`;
    const data = await fetchWithCORSFallback(url);

    (ASSETS.crypto || []).forEach(asset => {
      const d = data[asset.id];
      if (!d) return;
      priceData[asset.id] = {
        price: d.usd,
        change: (d.usd_24h_change || 0).toFixed(2),
        high: d.usd_24h_high  || d.usd * 1.02,
        low:  d.usd_24h_low   || d.usd * 0.98,
        vol:  d.usd_24h_vol   || 0,
        mcap: d.usd_market_cap || 0,
        live: true
      };
      prices[asset.id]      = d.usd;
      BASE_PRICES[asset.id] = d.usd;
    });
    return true;
  } catch(e) {
    console.log('CoinGecko fallback:', e.message);
    return false;
  }
}



function simulatePrice(id) {
  const base = BASE_PRICES[id] || 100;
  const prev = prices[id] || base;
  const drift = (Math.random() - 0.499) * 0.003;
  return parseFloat((prev * (1 + drift)).toFixed(base < 0.001 ? 8 : base < 1 ? 6 : base < 10 ? 4 : 2));
}

function updateSimulatedPrices() {
  // Simulate ALL non-crypto assets that don't have a live price yet
  const nonCryptoCategories = ['stocks','forex','commodities','indices','etf'];
  nonCryptoCategories.forEach(cat => {
    (ASSETS[cat] || []).forEach(asset => {
      if (priceData[asset.id]?.live) return; // skip if we have real data
      const newPrice = simulatePrice(asset.id);
      const change = ((newPrice - (BASE_PRICES[asset.id] || newPrice)) / (BASE_PRICES[asset.id] || newPrice) * 100);
      prices[asset.id] = newPrice;
      priceData[asset.id] = {
        price: newPrice, change: change.toFixed(2),
        high: (newPrice * 1.015).toFixed(asset.id.includes('/') ? 4 : 2),
        low:  (newPrice * 0.985).toFixed(asset.id.includes('/') ? 4 : 2),
        vol: formatLarge((BASE_PRICES[asset.id] || 100) * 1e6 * (0.5 + Math.random())),
        mcap: '—', live: false
      };
    });
  });

  // Simulate crypto only if CoinGecko hasn't responded yet
  (ASSETS.crypto || []).forEach(asset => {
    if (priceData[asset.id]?.live) return;
    const newPrice = simulatePrice(asset.id);
    const change = ((newPrice - (BASE_PRICES[asset.id] || newPrice)) / (BASE_PRICES[asset.id] || newPrice) * 100);
    prices[asset.id] = newPrice;
    priceData[asset.id] = {
      price: newPrice, change: change.toFixed(2),
      high: (newPrice * 1.025).toFixed(2), low: (newPrice * 0.975).toFixed(2),
      vol: formatLarge((BASE_PRICES[asset.id] || 100) * 1e6),
      mcap: formatLarge((BASE_PRICES[asset.id] || 100) * 19e6),
      live: false
    };
  });
}

function formatLarge(n) {
  if (n >= 1e12) return (n/1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(2) + 'K';
  return n.toFixed(2);
}

function formatPrice(p, id) {
  if (!p) return '—';
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
  const d = priceData[asset.id];
  const price = d ? d.price : (BASE_PRICES[asset.id] || 0);
  const change = d ? parseFloat(d.change) : 0;
  const isUp = change >= 0;

  // Header
  document.getElementById('sel-symbol').textContent = asset.symbol;
  document.getElementById('sel-name').textContent = asset.name;
  document.getElementById('sel-source').textContent = d?.live
    ? asset.source + ' (Live ✓)'
    : (asset.source || '—') + ' (Simulated)';
  const priceEl = document.getElementById('sel-price');
  priceEl.textContent = price ? formatPrice(price, asset.id) : '—';
  priceEl.style.color = isUp ? 'var(--green)' : 'var(--red)';
  const changeEl = document.getElementById('sel-change');
  changeEl.textContent = price ? (isUp ? '▲ +' : '▼ ') + Math.abs(change).toFixed(2) + '% (24h)' : '';
  changeEl.className = 'big-change ' + (isUp ? 'up' : 'down');

  // Stats — smart label for MKT CAP based on asset type
  const high = d?.high ? formatPrice(parseFloat(d.high), asset.id) : '—';
  const low  = d?.low  ? formatPrice(parseFloat(d.low),  asset.id) : '—';
  const vol  = d?.vol  ? (typeof d.vol  === 'string' ? d.vol  : formatLarge(d.vol))  : '—';

  // MKT CAP: only meaningful for crypto. Stocks/forex get a contextual label.
  let mcapLabel, mcapVal;
  if (asset.source === 'CoinGecko') {
    mcapLabel = 'MKT CAP';
    mcapVal = d?.mcap ? (typeof d.mcap === 'string' ? d.mcap : formatLarge(d.mcap)) : '—';
  } else if (asset.cat === 'stocks' || (asset.source === 'Twelve Data' && !asset.id.includes('/'))) {
    mcapLabel = 'MKT CAP';
    mcapVal = 'N/A';
  } else if (asset.id.includes('/') && !asset.id.startsWith('X')) {
    mcapLabel = 'SPREAD';
    mcapVal = '—';
  } else {
    mcapLabel = 'MKT CAP';
    mcapVal = '—';
  }

  document.getElementById('stat-high').textContent = high;
  document.getElementById('stat-low').textContent  = low;
  document.getElementById('stat-vol').textContent  = vol;
  document.getElementById('stat-mcap').textContent = mcapVal;
  // Update label dynamically
  const mcapLabelEl = document.querySelector('#stat-mcap')?.previousElementSibling;
  if (mcapLabelEl) mcapLabelEl.textContent = mcapLabel;

  // Alert form — pre-fill price input with current price (editable)
  const priceInput = document.getElementById('alert-price');
  if (priceInput && price) {
    // Only pre-fill if the user hasn't already typed something
    if (!priceInput.dataset.userEdited) {
      priceInput.value = parseFloat(price.toFixed(price >= 1000 ? 2 : price >= 1 ? 4 : 6));
    }
  }
  document.getElementById('current-price-note').textContent = price
    ? `Current price: ${formatPrice(price, asset.id)} — Your alert will trigger when the condition is met.`
    : 'Select an asset to see current price';
  // NOTE: alert-asset dropdown is kept in sync by populateDropdown() and createAlert().
  // Do NOT set it here — doing so causes mobile browsers to scroll the panel to the select every tick.
}

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
      const d = priceData[asset.id];
      const price = d ? d.price : (BASE_PRICES[asset.id] || 0);
      const change = d ? d.change : '0.00';
      const isUp = parseFloat(change) >= 0;
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
        <div class="asset-right">
          <div class="asset-price">${formatPrice(price, asset.id)}</div>
          <div class="asset-change ${isUp ? 'up' : 'down'}">${isUp ? '▲' : '▼'} ${Math.abs(change)}%</div>
        </div>`;
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
      const d = priceData[asset.id];
      const price = d ? d.price : (BASE_PRICES[asset.id] || 0);
      const change = d ? d.change : '0.00';
      const isUp = parseFloat(change) >= 0;
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
        <div class="asset-right">
          <div class="asset-price">${formatPrice(price, asset.id)}</div>
          <div class="asset-change ${isUp ? 'up' : 'down'}">${isUp ? '▲' : '▼'} ${Math.abs(change)}%</div>
        </div>`;
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
function mobileTab(tab) {
  if (window.innerWidth > 768) return;

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
}

// Keep stubs so nothing else breaks
function generateChartData() {}
function drawChart() {}
function setTF() {}

// ═══════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════
async function createAlert() {
  if (!selectedAsset) return showToast('No Asset', 'Tap any asset from the Hot List or Watchlist first.', 'error');

  const assetId = selectedAsset.id;
  const condition = document.getElementById('alert-condition').value;
  const targetPrice = parseFloat(document.getElementById('alert-price').value);
  const note = document.getElementById('alert-note').value.trim();

  if (isNaN(targetPrice) || targetPrice <= 0) return showToast('Invalid Price', 'Enter a valid target price.', 'error');

  const assetInfo = selectedAsset;
  const currentPrice = priceData[assetId]?.price || BASE_PRICES[assetId];

  const newAlert = {
    id: 'temp_' + alertIdCounter++,  // temp id until DB returns UUID
    assetId,
    symbol: assetInfo.symbol,
    name: assetInfo.name,
    condition,
    targetPrice,
    note,
    sound: selectedAlertSound,
    status: 'active',
    createdAt: new Date().toLocaleTimeString(),
    currentPriceWhenCreated: currentPrice
  };

  alerts.push(newAlert);

  // Save to DB — await UUID back and replace temp id
  try {
    const saved = await saveAlert(newAlert);
    const idx = alerts.findIndex(a => a.id === newAlert.id);
    if (idx !== -1 && saved?.id) alerts[idx].id = saved.id;
  } catch(e) {
    console.warn('createAlert: DB save failed, keeping temp id', e);
  }

  document.getElementById('alert-price').value = '';
  delete document.getElementById('alert-price').dataset.userEdited;
  document.getElementById('alert-note').value = '';

  showToast('Alert Created', `${assetInfo.symbol} ${condition} ${formatPrice(targetPrice, assetId)} is now active.`, 'success');

  sendBrowserNotification(
    `Alert Set — ${assetInfo.symbol}`,
    `Watching for price ${condition} ${formatPrice(targetPrice, assetId)}`
  );

  if (telegramEnabled) {
    const dir = condition === 'above' ? 'above' : 'below';
    sendTelegram(`<b>Alert Created — ${assetInfo.symbol}</b>\n\nWatching for price ${dir} <b>${formatPrice(targetPrice, assetId)}</b>${note ? `\nNote: ${note}` : ''}\n\n${new Date().toLocaleTimeString()}`);
  }

  renderAlerts();
  renderWatchlist();

  // On mobile, switch to the Alerts tab so the user sees their new alert
  if (window.innerWidth <= 768) {
    switchAlertTab('active');
    mobileTab('alerts');
  }
}

function deleteAlert(id) {
  deleteAlertFromDB(id);
  alerts = alerts.filter(a => a.id !== id);
  renderAlerts();
  renderWatchlist();
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
  alerts.forEach(alert => {
    if (alert.status !== 'active') return;
    const currentPrice = priceData[alert.assetId]?.price || prices[alert.assetId];
    if (!currentPrice) return;

    const triggered =
      (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
      (alert.condition === 'below' && currentPrice <= alert.targetPrice);

    if (triggered) {
      alert.triggeredDirection = alert.condition;
      triggeredToday++;

      // Mark as triggered — stays in Active panel until user taps Dismiss
      alert.status = 'triggered';
      alert.triggeredAt = new Date().toLocaleTimeString();
      alert.triggeredPrice = currentPrice;

      // Persist triggered status to DB
      updateAlert(alert.id, {
        status: 'triggered',
        triggered_at: alert.triggeredAt,
        triggered_price: currentPrice,
        triggered_direction: alert.condition,
      });

      const msg = `${alert.condition === 'above' ? 'Rose above' : 'Fell below'} ${formatPrice(alert.targetPrice, alert.assetId)} | Now: ${formatPrice(currentPrice, alert.assetId)}`;

      showToast(`ALERT TRIGGERED — ${alert.symbol}`, msg, 'alert');
      playAlertSound(alert.sound || selectedAlertSound);
      sendBrowserNotification(`${alert.symbol} Alert Triggered`, msg);
      if (telegramEnabled) {
        sendTelegram(tgAlertMessage('trigger', alert.symbol, alert.condition, alert.targetPrice, currentPrice, alert.assetId, alert.note));
      }
      renderAlerts();
    }
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

async function requestNotifPermission() {
  if (!('Notification' in window)) {
    showToast('Not Supported', 'Browser notifications are not supported here.', 'error');
    return;
  }
  // Toggle off if already enabled
  if (Notification.permission === 'granted' && notifEnabled) {
    notifEnabled = false;
    updateNotifBtn();
    showToast('Notifications OFF', 'Price alerts will no longer send notifications.', 'success');
    return;
  }
  // Re-enable if already granted
  if (Notification.permission === 'granted') {
    notifEnabled = true;
    updateNotifBtn();
    showToast('Notifications ON', 'You will receive alerts when price targets are hit.', 'success');
    sendBrowserNotification('TradeWatch Active', 'Price alert notifications are enabled.');
    return;
  }
  // Request permission
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    notifEnabled = true;
    updateNotifBtn();
    showToast('Notifications Enabled', 'Browser alerts will fire when your price targets are hit.', 'success');
    sendBrowserNotification('TradeWatch Active', 'You will now receive price alert notifications.');
  } else {
    showToast('Permission Denied', 'Enable notifications in your browser settings to use this feature.', 'error');
  }
}

function updateNotifBtn() {
  const btn  = document.getElementById('notif-btn');
  const dot  = document.getElementById('notif-dot');
  if (notifEnabled) {
    btn.classList.add('active');
    btn.title = 'Notifications ON — click to toggle off';
    if (dot) dot.style.display = '';
  } else {
    btn.classList.remove('active');
    btn.title = 'Enable browser notifications';
    if (dot) dot.style.display = 'none';
  }
}

// Route through service worker's showNotification when available —
// this fires even when the tab is in the background or on mobile lock screens.
// Falls back to new Notification() if SW isn't registered (e.g. file:// context).
async function sendBrowserNotification(title, body) {
  if (!notifEnabled || Notification.permission !== 'granted') return;
  try {
    // Prefer SW-backed notification (works in background, mobile lock screen)
    const reg = swRegistration || (await navigator.serviceWorker?.ready?.catch(() => null));
    if (reg?.showNotification) {
      await reg.showNotification(title, {
        body,
        icon: './icon-192.png',
        badge: './icon-96.png',
        vibrate: [200, 100, 200],
        tag: 'tradewatch-alert-' + Date.now(),
        renotify: true
      });
    } else {
      // Fallback: direct Notification API (foreground-only)
      new Notification(title, { body, tag: 'tradewatch-alert-' + Date.now() });
    }
  } catch(e) {
    // Last-resort fallback
    try { new Notification(title, { body }); } catch(_) {}
  }
}

// Restore notif state if permission was already granted in a previous session
if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
  notifEnabled = true;
  setTimeout(updateNotifBtn, 100);
}

// ═══════════════════════════════════════════════
// TELEGRAM ALERTS
// ═══════════════════════════════════════════════
const TELEGRAM_WORKER_URL = 'https://telegram-worker.meet-tyla.workers.dev';
let telegramEnabled = false;
let telegramChatId  = localStorage.getItem('tg_chat_id') || '';

// Restored after DB loads in init()

function openTelegramModal() {
  const modal = document.getElementById('tg-modal');
  modal.style.display = 'flex';
  modal.classList.add('tg-open');
  document.getElementById('tg-chat-id').value = telegramChatId;
  updateTgModalState();
}

function closeTelegramModal() {
  const modal = document.getElementById('tg-modal');
  modal.style.display = 'none';
  modal.classList.remove('tg-open');
  telegramChatId = document.getElementById('tg-chat-id').value.trim();
  if (telegramChatId) localStorage.setItem('tg_chat_id', telegramChatId);
}

function closeTgModalIfBg(e) {
  if (e.target.id === 'tg-modal') closeTelegramModal();
}

function updateTgModalState() {
  const chatId = document.getElementById('tg-chat-id').value.trim() || telegramChatId;
  const sub = document.getElementById('tg-toggle-sub');
  const btn = document.getElementById('tg-toggle-btn');
  if (!chatId) {
    sub.textContent = 'Enter your Chat ID above to enable';
    btn.textContent = 'OFF';
    btn.classList.remove('on');
  } else if (telegramEnabled) {
    sub.textContent = 'Alerts will be sent to your Telegram';
    btn.textContent = 'ON';
    btn.classList.add('on');
  } else {
    sub.textContent = 'Ready — toggle to enable';
    btn.textContent = 'OFF';
    btn.classList.remove('on');
  }
}

function toggleTelegram() {
  telegramChatId = document.getElementById('tg-chat-id').value.trim();
  if (!telegramChatId) { setTgStatus('Enter your Telegram Chat ID first.', 'err'); return; }
  telegramEnabled = !telegramEnabled;
  localStorage.setItem('tg_enabled', telegramEnabled);
  localStorage.setItem('tg_chat_id', telegramChatId);
  // Save to DB
  savePreferencesDB({ telegram_chat_id: telegramChatId, telegram_enabled: telegramEnabled });
  updateTgModalState();
  updateTgBtn();
  if (telegramEnabled) {
    sendTelegram('<b>TradeWatch Connected ✓</b>\nTelegram alerts are now active.');
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
  telegramChatId = document.getElementById('tg-chat-id').value.trim();
  if (!telegramChatId) { setTgStatus('Enter your Chat ID first.', 'err'); return; }
  setTgStatus('Sending…', '');
  const ok = await sendTelegram('<b>TradeWatch Test ✓</b>\nYour Telegram alerts are working correctly!');
  if (ok) {
    setTgStatus('✓ Message sent! Check your Telegram.', 'ok');
    localStorage.setItem('tg_chat_id', telegramChatId);
  } else {
    setTgStatus('✗ Failed. Check your Chat ID and try again.', 'err');
  }
}

function setTgStatus(msg, type) {
  const el = document.getElementById('tg-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'tg-status ' + type;
}

// Core send function — posts to the hardcoded Cloudflare Worker proxy
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
function tgAlertMessage(type, symbol, condition, targetPrice, currentPrice, assetId, note) {
  const dir = condition === 'above' ? 'Rose above' : 'Fell below';
  const lines = [
    `<b>TradeWatch Alert</b>`,
    ``,
    `<b>${symbol}</b> ${dir} ${formatPrice(targetPrice, assetId)}`,
    `Now: <b>${formatPrice(currentPrice, assetId)}</b>`,
  ];
  if (note) lines.push(`Note: ${note}`);
  lines.push(``, `Time: ${new Date().toLocaleTimeString()}`);
  return lines.join('\n');
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
    document.getElementById('sel-price').textContent = '—';
    document.getElementById('sel-change').textContent = '';
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
    assets.filter(a => !libIds.has(a.id)).map(a => ({ ...a, cat, base: BASE_PRICES[a.id] || 100 }))
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
  BASE_PRICES[asset.id] = asset.base || 100;
  const p = BASE_PRICES[asset.id];
  priceData[asset.id] = { price: p, change: '0.00', high:(p*1.015).toFixed(4), low:(p*0.985).toFixed(4), vol:'—', mcap:'—', live:false };
  prices[asset.id] = p;

  renderWatchlist();
  populateDropdown();
  showToast(`＋ ${asset.symbol} Added`, `${asset.name} is now on your watchlist.`, 'success');

  // Defer renderLibrary so the current click event fully completes before DOM is rebuilt.
  // Without this, rebuilding lib-body mid-click causes the event to retarget to the
  // modal overlay, which triggers closeModalIfBg and closes the modal immediately.
  setTimeout(() => renderLibrary(), 0);

  // Fetch live price
  if (asset.source === 'Twelve Data') {
    fetchTwelveDataBatch([asset]).then(() => renderWatchlist());
  } else if (asset.source === 'CoinGecko') {
    fetchCryptoFromCoinGecko().then(() => renderWatchlist());
  }
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
  updateSimulatedPrices();
  renderHotList();
  renderWatchlist();
  const cgOk = await fetchCryptoFromCoinGecko();
  fetchAllTwelveData().then(() => {
    const anyLive = Object.values(priceData).some(d => d.live);
    setStatusPill(cgOk || anyLive);
    renderHotList();
    renderWatchlist();
  });
  refreshSelectedAssetPanel();
  checkAlerts();
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
}

// Auto-tick every 8 seconds
setInterval(() => {
  updateSimulatedPrices();
  renderHotList();
  renderWatchlist();
  refreshSelectedAssetPanel();
  checkAlerts();
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
}, 8000);

// Real crypto every 60 seconds
setInterval(async () => {
  await fetchCryptoFromCoinGecko();
  renderHotList();
  renderWatchlist();
  refreshSelectedAssetPanel();
}, 60000);

// Twelve Data refresh every 5 minutes (800 req/day free tier)
setInterval(() => {
  fetchAllTwelveData();
}, 5 * 60 * 1000);

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
async function init() {
  // ── Bootstrap DB user (temp guest ID until Telegram Mini App) ──
  await getOrCreateUser(currentTelegramId);

  // ── Load preferences from DB ──
  const prefs = await loadPreferencesFromDB();
  if (prefs) {
    telegramChatId  = prefs.telegram_chat_id || localStorage.getItem('tg_chat_id') || '';
    telegramEnabled = prefs.telegram_enabled ?? (localStorage.getItem('tg_enabled') === 'true');
    soundEnabled    = prefs.sound_enabled ?? true;
  } else {
    telegramChatId  = localStorage.getItem('tg_chat_id') || '';
    telegramEnabled = localStorage.getItem('tg_enabled') === 'true';
  }
  if (telegramChatId) updateTgBtn();

  // ── Load alerts from DB ──
  const dbAlerts = await loadAlertsFromDB();
  if (dbAlerts !== null) alerts = dbAlerts;

  // ── Load alert history from DB ──
  await initAlertHistory();

  // ── Load dynamic Hot List rankings from DB ──
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
  updateSimulatedPrices();
  renderHotList();
  renderWatchlist();
  renderAlerts();
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();

  // Fetch live data — all assets needed for hot list prices
  const cgOk = await fetchCryptoFromCoinGecko();
  const tdOk = await fetchTwelveDataBatch([
    ...(ASSETS.stocks || []),
    ...(ASSETS.forex || []),
    ...(ASSETS.commodities || []),
    ...(ASSETS.indices || []),
  ]);
  setStatusPill(cgOk || tdOk);

  renderHotList();
  renderWatchlist();
  refreshSelectedAssetPanel();

  // Fetch remainder non-blocking
  fetchAllTwelveData();

  renderAlerts();
  renderHotList();
  renderWatchlist();
}

function setStatusPill(isLive) {
  const pill = document.getElementById('status-pill');
  if (isLive) {
    pill.textContent = '● LIVE';
    pill.style.borderColor = 'var(--green)';
    pill.style.color = 'var(--green)';
  } else {
    pill.textContent = '◈ SIMULATED';
    pill.style.borderColor = 'var(--gold)';
    pill.style.color = 'var(--gold)';
    pill.title = 'Live APIs unreachable. Open this file via a local server or Claude.ai to enable live data.';
  }
}

window.addEventListener('resize', () => { if (selectedAsset && window.innerWidth > 768) loadTVChart(selectedAsset); });

// ── SWIPE GESTURES (mobile) ──────────────────────
(function() {
  let touchStartX = 0, touchStartY = 0;
  let ptrActive = false;
  let ptrTriggered = false;
  const PTR_THRESHOLD = 72; // px to pull before triggering

  function getActivePanel() {
    if (document.getElementById('panel-watchlist').classList.contains('mobile-active')) return document.getElementById('panel-watchlist');
    if (document.getElementById('panel-main').classList.contains('mobile-active')) return document.getElementById('panel-main');
    if (document.getElementById('panel-alerts').classList.contains('mobile-active')) return document.getElementById('panel-alerts');
    return null;
  }

  function setPTRHeight(h) {
    const el = document.getElementById('ptr-indicator');
    if (el) el.style.height = h + 'px';
  }

  function setPTRLabel(text) {
    const el = document.getElementById('ptr-label');
    if (el) el.textContent = text;
  }

  function setPTRSpinnerRotation(deg) {
    const el = document.getElementById('ptr-spinner');
    if (el && !el.classList.contains('spinning')) el.style.transform = `rotate(${deg}deg)`;
  }

  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    ptrActive = false;
    ptrTriggered = false;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (window.innerWidth > 768) return;
    if (document.getElementById('add-modal').style.display !== 'none') return;
    if (document.getElementById('tg-modal').style.display !== 'none') return;

    const dy = e.touches[0].clientY - touchStartY;
    const dx = e.touches[0].clientX - touchStartX;

    // Only activate PTR on downward pull, not horizontal swipes
    if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) return;

    const panel = getActivePanel();
    if (!panel || panel.scrollTop > 0) return;

    ptrActive = true;
    const pull = Math.min(dy * 0.45, PTR_THRESHOLD + 16); // rubber band damping
    setPTRHeight(pull);

    const progress = Math.min(pull / PTR_THRESHOLD, 1);
    setPTRSpinnerRotation(progress * 280);

    if (pull >= PTR_THRESHOLD) {
      setPTRLabel('Release to refresh');
      ptrTriggered = true;
    } else {
      setPTRLabel('Pull down to refresh');
      ptrTriggered = false;
    }
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (window.innerWidth > 768) return;

    // ── Pull to refresh release ──
    if (ptrActive) {
      ptrActive = false;
      if (ptrTriggered) {
        // Show spinner while refreshing
        setPTRHeight(52);
        setPTRLabel('Refreshing...');
        const spinner = document.getElementById('ptr-spinner');
        if (spinner) { spinner.classList.add('spinning'); spinner.style.transform = ''; }

        refreshAll().then(() => {
          setPTRLabel('Updated');
          setTimeout(() => {
            setPTRHeight(0);
            if (spinner) spinner.classList.remove('spinning');
          }, 600);
        });
      } else {
        setPTRHeight(0);
      }
      return;
    }

    // ── Horizontal swipe navigation ──
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (document.getElementById('add-modal').style.display !== 'none') return;
    if (document.getElementById('tg-modal').style.display !== 'none') return;

    if (dx > 0) {
      const mainActive = document.getElementById('panel-main').classList.contains('mobile-active');
      const alertsActive = document.getElementById('panel-alerts').classList.contains('mobile-active');
      if (mainActive || alertsActive) mobileTab('watchlist');
    } else {
      const watchActive = document.getElementById('panel-watchlist').classList.contains('mobile-active');
      if (watchActive && selectedAsset) mobileTab('chart');
    }
  }, { passive: true });
})();

init();