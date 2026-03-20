// TradeWatch — UI & App Init
// Telegram, library modal, toast, onboarding, init()

// ═══════════════════════════════════════════════
// (declared in app-config.js)

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
// (declared in app-config.js)

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
// (declared in app-config.js)

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
    sendTelegram('<b>TRADEWATCH CONNECTED</b>\n\nYour alerts are live. You\'ll get notified here the moment a price target is hit.\n\n<i>Stay sharp. </i>');
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
  const ok = await sendTelegram('<b>TEST SUCCESSFUL</b>\n\nTradeWatch is connected and ready to fire alerts.\n\n<i>You\'re all set. </i>');
  if (ok) {
    setTgStatus('Message sent! Check your Telegram.', 'ok');
  } else {
    setTgStatus('Failed. Please try again.', 'err');
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

function tgAlertMessage(type, symbol, condition, targetPrice, currentPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval, tapTolerance) {
  const isZone  = condition === 'zone';
  const isAbove = condition === 'above';
  const isTap   = condition === 'tap';
  let header, subtitle, rows = [];

  if (isZone) {
    header   = `[ZONE] <b>ZONE ALERT — ${symbol}</b>`;
    subtitle = `Price has entered your zone`;
    rows.push(tgRow('Zone',          `<b>${formatPrice(zoneLow, assetId)} – ${formatPrice(zoneHigh, assetId)}</b>`));
    rows.push(tgRow('Current price', `<b>${formatPrice(currentPrice, assetId)}</b>`));
    if (timeframe)                            rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
    if (repeatInterval && repeatInterval > 0) rows.push(tgRow('Repeat',   `<b>Every ${repeatInterval} min</b>`));
  } else if (isTap) {
    header   = `[TAP] <b>TAP ALERT — ${symbol}</b>`;
    subtitle = `Price touched your level`;
    rows.push(tgRow('Level',         `<b>${formatPrice(targetPrice, assetId)}</b>`));
    rows.push(tgRow('Current price', `<b>${formatPrice(currentPrice, assetId)}</b>`));
    rows.push(tgRow('Tolerance',     `<b>±${tapTolerance}%</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  } else {
    const emoji   = isAbove ? '[UP]' : '[DOWN]';
    const dirWord = isAbove ? 'broke above' : 'dropped below';
    header   = `${emoji} <b>ALERT TRIGGERED — ${symbol}</b>`;
    subtitle = `Price ${dirWord} your target`;
    rows.push(tgRow('Target',        `<b>${formatPrice(targetPrice, assetId)}</b>`));
    rows.push(tgRow('Current price', `<b>${formatPrice(currentPrice, assetId)}</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  }

  if (note) rows.push(tgRow('Note', `<i>${note}</i>`));
  return [header, ``, subtitle, ``, ...rows, ``, `<a href="https://t.me/tradewatchalert_bot/assistant">Dismiss in TradeWatch →</a>`].join('\n');
}

function tgCreatedMessage(symbol, condition, targetPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval, tapTolerance) {
  const isZone  = condition === 'zone';
  const isAbove = condition === 'above';
  const isTap   = condition === 'tap';

  let header, subtitle, rows = [];

  if (isZone) {
    header   = `[ZONE SET] <b>Zone Alert Set — ${symbol}</b>`;
    subtitle = `You'll be notified when <b>${symbol}</b> enters the zone`;
    rows.push(tgRow('Zone',      `<b>${formatPrice(zoneLow, assetId)} – ${formatPrice(zoneHigh, assetId)}</b>`));
    if (timeframe)                            rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
    if (repeatInterval && repeatInterval > 0) rows.push(tgRow('Repeat',   `<b>Every ${repeatInterval} min</b>`));
  } else if (isTap) {
    header   = `[TAP SET] <b>Tap Alert Set — ${symbol}</b>`;
    subtitle = `You'll be notified when <b>${symbol}</b> touches your level`;
    rows.push(tgRow('Level',     `<b>${formatPrice(targetPrice, assetId)}</b>`));
    rows.push(tgRow('Tolerance', `<b>±${tapTolerance}%</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  } else {
    const emoji   = isAbove ? '' : '';
    const dirWord = isAbove ? 'rises above' : 'falls below';
    header   = `${emoji} <b>Alert Set — ${symbol}</b>`;
    subtitle = `You'll be notified when <b>${symbol}</b> ${dirWord}`;
    rows.push(tgRow('Target',    `<b>${formatPrice(targetPrice, assetId)}</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  }

  if (note) rows.push(tgRow('Note', `<i>${note}</i>`));
  return [header, ``, subtitle, ``, ...rows, ``, `<i>Watching the markets for you.</i>`].join('\n');
}

// ── Telegram message for edited alerts ────────────────────────────────────
function tgEditedMessage(symbol, condition, targetPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval, tapTolerance) {
  const isZone  = condition === 'zone';
  const isAbove = condition === 'above';
  const isTap   = condition === 'tap';

  let header, subtitle, rows = [];

  if (isZone) {
    header   = `[UPDATED] <b>Alert Updated — ${symbol}</b>`;
    subtitle = `Your zone alert has been updated`;
    rows.push(tgRow('Zone',      `<b>${formatPrice(zoneLow, assetId)} – ${formatPrice(zoneHigh, assetId)}</b>`));
    if (timeframe)                            rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
    if (repeatInterval && repeatInterval > 0) rows.push(tgRow('Repeat',   `<b>Every ${repeatInterval} min</b>`));
  } else if (isTap) {
    header   = `[UPDATED] <b>Alert Updated — ${symbol}</b>`;
    subtitle = `Your tap alert has been updated`;
    rows.push(tgRow('Level',     `<b>${formatPrice(targetPrice, assetId)}</b>`));
    rows.push(tgRow('Tolerance', `<b>±${tapTolerance}%</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  } else {
    const emoji   = isAbove ? '' : '';
    const dirWord = isAbove ? 'rises above' : 'falls below';
    header   = `[UPDATED] <b>Alert Updated — ${symbol}</b>`;
    subtitle = `Now watching for <b>${symbol}</b> to ${dirWord}`;
    rows.push(tgRow('New target', `<b>${formatPrice(targetPrice, assetId)}</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  }

  if (note) rows.push(tgRow('Note', `<i>${note}</i>`));
  return [header, '', subtitle, '', ...rows, '', '<i>Alert is active and watching.</i>'].join('\n');
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

// ═══════════════════════════════════════════════
// ASSET LIBRARY — derived from ALL_ASSETS master catalogue
// Used by the "Add Asset" modal browser.
// This replaces the old static ASSET_LIBRARY.
// ═══════════════════════════════════════════════
// (declared in app-config.js)


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
    const catLabels = { crypto:'Crypto', stocks:'Stocks', forex:'Forex', commodities:'Commodities', indices:'Indices', synthetics:'Synthetics', etf:'ETFs' };
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
  const catOrder = ['crypto','forex','indices','synthetics','commodities','stocks','etf'];
  const catLabels = { crypto:'Crypto', stocks:'Stocks', forex:'Forex', commodities:'Commodities', indices:'Indices', synthetics:'Synthetics', etf:'ETFs' };

  body.innerHTML = '';
  catOrder.forEach(cat => {
    if (!groups[cat]) return;
    const sec = document.createElement('div');
    sec.innerHTML = `<div class="lib-section-title">${catLabels[cat]} · ${groups[cat].length} assets</div>`;
    const grid = document.createElement('div');
    grid.className = 'lib-grid';
    groups[cat].forEach(asset => {
      const inWatch    = allWatchIds.has(asset.id);
      const isUnavail  = asset.sources?.[0] === 'unavailable';
      const card = document.createElement('div');
      card.className = `lib-card${inWatch ? ' in-watch' : ''}${isUnavail ? ' unavailable' : ''}`;
      card.innerHTML = `
        <div>
          <div class="lib-sym" style="${isUnavail ? 'opacity:0.45' : ''}">${asset.symbol}</div>
          <div class="lib-name" style="${isUnavail ? 'opacity:0.45' : ''}">${asset.name}</div>
          ${isUnavail ? '<div style="font-size:0.6rem;letter-spacing:0.06em;color:var(--muted);margin-top:2px;opacity:0.7">NO BROKER</div>' : ''}
        </div>
        <div class="lib-action">${
          inWatch
            ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
          : isUnavail
            ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="opacity:0.3"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/><line x1="6" y1="3" x2="6" y2="7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="6" cy="9" r="0.7" fill="currentColor"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
        }</div>`;
      if (!inWatch && !isUnavail) card.onclick = (e) => { e.stopPropagation(); addAssetToWatchlist(asset); };
      else if (isUnavail) card.title = 'No broker connected for this asset yet';
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

  ASSETS[asset.cat].push(ASSET_BY_ID.get(asset.id) || asset);
  subscribeDerivAsset(asset);
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
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

// 8-second UI tick — Deriv WebSocket keeps prices live between REST refreshes
setInterval(() => {
  // Skip heavy DOM rebuilds while user is focused on alert form inputs
  // This prevents the page from jumping/scrolling while they type
  if (!userTypingInForm) {
    renderHotList();
    renderWatchlist();
  }
  refreshSelectedAssetPanel();
  checkAlerts();
  const el = document.getElementById('lastUpdate');
  if (el) el.textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}, 8000);

// REST refresh every 60 seconds — CoinGecko + OANDA snapshot (Deriv WS covers the rest)
// Deriv WebSocket handles intraday ticks; REST fills OHLC + catches up after reconnects
setInterval(() => {
  fetchAllPrices();
  // Reconnect / re-subscribe Deriv on every REST cycle to catch any dropped ticks
  // Reconnect both WS connections if needed
  if (!_conn1.ws || _conn1.ws.readyState > 1) connectDeriv();
  else resubscribeAllDeriv();
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
    savePreferencesDB({
      telegram_chat_id: telegramChatId,
      telegram_enabled: true,
      sound_enabled:    soundEnabled,
      timezone:         Intl.DateTimeFormat().resolvedOptions().timeZone,
      utc_offset_mins:  -new Date().getTimezoneOffset(),
    });

    // ── New user onboarding: show linking screen, auto send test ──
    const hasOnboarded = localStorage.getItem('tw_onboarded');
    if (!hasOnboarded) {
      // Show the onboarding splash — it will resolve when test passes
      const onboardOk = await showOnboardingScreen();
      if (!onboardOk) return; // user is stuck on error screen — halt
      localStorage.setItem('tw_onboarded', '1');
    }
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

  // ── Load user's personal watchlist from DB ──────
  // Clear all default assets — only show what the user has saved
  Object.keys(ASSETS).forEach(cat => { ASSETS[cat] = []; });

  const dbWatchlist = await loadWatchlist();
  if (dbWatchlist && dbWatchlist.length > 0) {
    dbWatchlist.forEach(row => {
      const cat = row.category;
      if (!cat) return;
      if (!ASSETS[cat]) ASSETS[cat] = [];
      if (ASSETS[cat].some(a => a.id === row.asset_id)) return; // no dupes
      // Prefer ALL_ASSETS master for full metadata, fall back to DB row data
      const meta = ALL_ASSETS.find(a => a.id === row.asset_id);
      ASSETS[cat].push(meta || {
        id:       row.asset_id,
        symbol:   row.symbol,
        name:     row.name,
        derivSym: row.td_symbol || null,
        sources:  row.sources  || ['deriv'],
        cat,
      });
    });
  }

  // Build hot list from DB click rankings — all categories
  // Falls back to HOT_LIST_SEED (forex defaults) if no DB data yet.
  // Hot list is independent of the user's personal watchlist.
  const rankings = await loadHotListRankings();
  if (rankings && Object.keys(rankings).length > 0) {
    // Replace HOT_LIST entirely with DB-ranked results per category
    HOT_LIST = {};
    Object.entries(rankings).forEach(([cat, ids]) => {
      // Only include assets that exist in ALL_ASSETS catalogue
      HOT_LIST[cat] = ids.filter(id => ALL_ASSETS.some(a => a.id === id));
    });
    // Fill in seed defaults for any category missing from DB rankings
    Object.entries(HOT_LIST_SEED).forEach(([cat, ids]) => {
      if (!HOT_LIST[cat] || HOT_LIST[cat].length === 0) {
        HOT_LIST[cat] = ids;
      }
    });
  } else {
    // No DB data yet — use seed defaults
    HOT_LIST = { ...HOT_LIST_SEED };
  }

  populateDropdown();
  renderHotList();
  renderWatchlist();
  renderAlerts();
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

  // Connect Deriv WebSocket — connects and subscribes to all watchlist + hot list assets
  connectDeriv();
  setTimeout(resubscribeAllDeriv, 3000);

  // ── Alert form focus tracking ─────────────────────────────────────────────
  // Set userTypingInForm=true while any alert input is focused.
  // This pauses chart reloads and DOM rebuilds so the page doesn't jump.
  const alertFormInputs = [
    'alert-price', 'alert-zone-low', 'alert-zone-high',
    'alert-note', 'alert-note-zone', 'alert-tap-custom',
  ];
  alertFormInputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', () => { userTypingInForm = true; });
    el.addEventListener('blur',  () => {
      // Small delay so flag isn't cleared before click events process
      setTimeout(() => { userTypingInForm = false; }, 300);
    });
  });
  // Also track the dropdowns — they don't type but interaction matters
  ['alert-condition','alert-timeframe','alert-repeat','alert-tap-tolerance'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', () => { userTypingInForm = true; });
    el.addEventListener('blur',  () => { setTimeout(() => { userTypingInForm = false; }, 300); });
  });

  // Initial REST fetch — CoinGecko + OANDA snapshot (Deriv WS already running)
  await fetchAllPrices();
  setStatusPill(true);

  // Re-subscribe Deriv with confirmed symbols now that ASSETS is fully populated
  resubscribeAllDeriv();

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

window.addEventListener('resize', () => {
  if (selectedAsset && !isMobileLayout()) loadTVChart(selectedAsset);
  // Re-activate correct panel after orientation change
  const activePanel = navStack[navStack.length - 1];
  if (isMobileLayout()) {
    mobileTab(activePanel, false);
  } else {
    // Desktop — ensure all panels visible
    ['panel-watchlist','panel-main','panel-alerts'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('mobile-active');
    });
  }
});

// Refresh prices when user returns to the tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    fetchAllPrices();
    // Reconnect both WS connections if they dropped
    if (!_conn1.ws || _conn1.ws.readyState > 1) connectDeriv();
    if (!_conn2.ws || _conn2.ws.readyState > 1) connectDerivSynthetics();
    if (isMobileLayout()) mobileTab(navStack[navStack.length-1], false);
  }
});

// ═══════════════════════════════════════════════
// ONBOARDING SCREEN — shown once for new users
// Automatically links Telegram and sends a test
// message. Dismisses only when confirmed sent.
// ═══════════════════════════════════════════════

function cancelEditAlert() {
  if (!editingAlertId) return;
  userTypingInForm = false;
  editingAlertId = null;
  const setBtn = document.getElementById('set-alert-btn');
  if (setBtn) {
    setBtn.textContent = 'SET ALERT';
    setBtn.style.background = '';
    setBtn.style.borderColor = '';
  }
  // Clear form
  ['alert-price','alert-zone-low','alert-zone-high','alert-note','alert-note-zone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; delete el.dataset.userEdited; }
  });
}

function showOnboardingScreen() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:var(--bg);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      padding:32px;text-align:center;
    `;

    // ── Phase 1: Linking splash ──────────────────
    // Inject spin keyframe once
    if (!document.getElementById('tw-spin-style')) {
      const s = document.createElement('style');
      s.id = 'tw-spin-style';
      s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }

    function showLinking() {
      overlay.innerHTML = `
        <div style="margin-bottom:28px">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="25" stroke="var(--accent)" stroke-width="2" stroke-dasharray="157" stroke-dashoffset="0" opacity="0.2"/>
            <circle cx="26" cy="26" r="25" stroke="var(--accent)" stroke-width="2" stroke-dasharray="40 117"
              style="animation:spin 1.2s linear infinite;transform-origin:center"/>
          </svg>
        </div>
        <div style="font-size:1rem;font-weight:700;letter-spacing:0.1em;color:var(--text);margin-bottom:10px;">LINKING YOUR ACCOUNT</div>
        <div style="font-size:0.82rem;color:var(--muted);line-height:1.6;max-width:260px;">
          Connecting TradeWatch to your Telegram.<br>This only takes a moment…
        </div>`;
      document.body.appendChild(overlay);

      // Auto-send test message after a brief linking pause
      setTimeout(() => attemptTestMessage(), 1800);
    }

    // ── Phase 2: Test message ─────────────────────
    async function attemptTestMessage() {
      const msg = '<b>TRADEWATCH CONNECTED</b>\n\nYour account is linked. You\'ll receive instant alerts here the moment a price target is hit.\n\n<i>You\'re all set. </i>';
      const ok  = await sendTelegram(msg);

      if (ok) {
        showSuccess();
      } else {
        showError();
      }
    }

    // ── Phase 3a: Success — auto-dismiss ──────────
    function showSuccess() {
      overlay.innerHTML = `
        <div style="margin-bottom:24px">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="27" stroke="var(--green)" stroke-width="2" fill="none" opacity="0.2"/>
            <circle cx="28" cy="28" r="27" stroke="var(--green)" stroke-width="2" fill="none"/>
            <polyline points="16,28 24,36 40,20" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>
        <div style="font-size:1rem;font-weight:700;letter-spacing:0.1em;color:var(--green);margin-bottom:10px;">TELEGRAM CONNECTED</div>
        <div style="font-size:0.82rem;color:var(--muted);line-height:1.6;max-width:260px;margin-bottom:20px;">
          Check your Telegram — a confirmation message has been sent.<br>Taking you to the app…
        </div>`;

      // Dismiss after 2 seconds and continue into app
      setTimeout(() => {
        overlay.remove();
        resolve(true);
      }, 2000);
    }

    // ── Phase 3b: Error — show retry ─────────────
    function showError() {
      overlay.innerHTML = `
        <div style="margin-bottom:24px">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="27" stroke="var(--red)" stroke-width="2" fill="none" opacity="0.2"/>
            <circle cx="28" cy="28" r="27" stroke="var(--red)" stroke-width="2" fill="none"/>
            <line x1="18" y1="18" x2="38" y2="38" stroke="var(--red)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="38" y1="18" x2="18" y2="38" stroke="var(--red)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div style="font-size:1rem;font-weight:700;letter-spacing:0.1em;color:var(--red);margin-bottom:10px;">CONNECTION FAILED</div>
        <div style="font-size:0.82rem;color:var(--muted);line-height:1.6;max-width:270px;margin-bottom:28px;">
          We couldn't send a test message to your Telegram.<br>
          Make sure you've started a conversation with<br>
          <b style="color:var(--text)">@tradewatchalert_bot</b> and try again.
        </div>
        <button onclick="window.__onboardRetry()" style="
          background:var(--accent);color:#000;
          font-weight:700;font-size:0.85rem;
          letter-spacing:0.08em;padding:14px 32px;
          border:none;border-radius:10px;cursor:pointer;
          margin-bottom:12px;width:100%;max-width:260px;
        ">RETRY</button>
        <a href="https://t.me/tradewatchalert_bot" target="_blank" style="
          font-size:0.75rem;color:var(--muted);text-decoration:none;
        ">Open @tradewatchalert_bot →</a>`;

      window.__onboardRetry = () => {
        showLinking();
      };
    }

    showLinking();
  });
}

// ═══════════════════════════════════════════════
// EDIT ALERT — opens prefilled alert form for
// an existing alert. Saves changes to DB.
// ═══════════════════════════════════════════════
// (declared in app-config.js)

function editAlert(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;

  // Select the alert's asset so the form targets the right asset
  const asset = ASSET_BY_ID.get(alert.assetId);
  if (asset) {
    // Navigate to chart page (where form lives) and select asset
    navigateToChartOnSelect = true;
    selectAsset(asset);
  }

  // Mark edit mode
  editingAlertId = id;

  // Populate form fields with existing alert values
  const condEl = document.getElementById('alert-condition');
  if (condEl) { condEl.value = alert.condition; onConditionChange(); }

  const tfEl = document.getElementById('alert-timeframe');
  if (tfEl) tfEl.value = alert.timeframe || '';

  if (alert.condition === 'zone') {
    const lowEl  = document.getElementById('alert-zone-low');
    const highEl = document.getElementById('alert-zone-high');
    const noteEl = document.getElementById('alert-note-zone');
    const repEl  = document.getElementById('alert-repeat');
    if (lowEl)  { lowEl.value  = alert.zoneLow;  lowEl.dataset.userEdited  = '1'; }
    if (highEl) { highEl.value = alert.zoneHigh; highEl.dataset.userEdited = '1'; }
    if (noteEl) noteEl.value = alert.note || '';
    if (repEl)  repEl.value  = alert.repeatInterval || 0;
  } else {
    const priceEl = document.getElementById('alert-price');
    const noteEl  = document.getElementById('alert-note');
    if (priceEl) { priceEl.value = alert.targetPrice; priceEl.dataset.userEdited = '1'; }
    if (noteEl)  noteEl.value = alert.note || '';
    if (alert.condition === 'tap') {
      const tolEl = document.getElementById('alert-tap-tolerance');
      if (tolEl) tolEl.value = alert.tapTolerance || 0.2;
    }
  }

  // Change the SET ALERT button label to UPDATE ALERT
  const setBtn = document.getElementById('set-alert-btn');
  if (setBtn) {
    setBtn.textContent = 'UPDATE ALERT';
    setBtn.style.background = 'rgba(0,212,255,0.15)';
    setBtn.style.borderColor = 'rgba(0,212,255,0.5)';
  }

  // Show a toast so user knows they're in edit mode
  showToast('Edit Mode', `Editing ${alert.symbol} alert — adjust values and tap UPDATE ALERT.`, 'alert');

  // Switch to chart panel on mobile
  if (isMobileLayout()) mobileTab('chart');
}

async function saveEditedAlert() {
  if (!editingAlertId) return createAlert(); // fall through to create if no edit in progress

  const alert = alerts.find(a => a.id === editingAlertId);
  if (!alert) { editingAlertId = null; return createAlert(); }

  const condition = document.getElementById('alert-condition').value;
  const timeframe = document.getElementById('alert-timeframe').value;
  const isZone    = condition === 'zone';
  const isTap     = condition === 'tap';

  let targetPrice = 0, zoneLow = 0, zoneHigh = 0, note = '', repeatInterval = 0, tapTolerance = 0.2;

  if (isZone) {
    zoneLow        = parseFloat(document.getElementById('alert-zone-low').value);
    zoneHigh       = parseFloat(document.getElementById('alert-zone-high').value);
    note           = document.getElementById('alert-note-zone').value.trim();
    repeatInterval = parseInt(document.getElementById('alert-repeat').value) || 0;
    if (isNaN(zoneLow) || isNaN(zoneHigh) || zoneLow <= 0 || zoneHigh <= 0)
      return showToast('Invalid Zone', 'Enter valid zone low and high prices.', 'error');
    if (zoneLow >= zoneHigh)
      return showToast('Invalid Zone', 'Zone low must be less than zone high.', 'error');
    targetPrice = zoneLow;
  } else if (isTap) {
    targetPrice  = parseFloat(document.getElementById('alert-price').value);
    note         = document.getElementById('alert-note').value.trim();
    if (isNaN(targetPrice) || targetPrice <= 0)
      return showToast('Invalid Price', 'Enter a valid target price.', 'error');
    const tolSel = document.getElementById('alert-tap-tolerance').value;
    tapTolerance = tolSel === 'custom'
      ? parseFloat(document.getElementById('alert-tap-custom').value) || 0.2
      : parseFloat(tolSel);
  } else {
    targetPrice = parseFloat(document.getElementById('alert-price').value);
    note        = document.getElementById('alert-note').value.trim();
    if (isNaN(targetPrice) || targetPrice <= 0)
      return showToast('Invalid Price', 'Enter a valid target price.', 'error');
  }

  // Apply changes locally
  Object.assign(alert, {
    condition, timeframe: timeframe || null,
    targetPrice, note,
    zoneLow:       isZone ? zoneLow      : null,
    zoneHigh:      isZone ? zoneHigh     : null,
    tapTolerance:  isTap  ? tapTolerance : null,
    repeatInterval,
    status: 'active', // reset to active if it was paused/triggered
    zoneTriggeredOnce: false,
  });

  // Save to DB
  await updateAlert(editingAlertId, {
    condition,
    target_price:    targetPrice,
    zone_low:        isZone ? zoneLow      : null,
    zone_high:       isZone ? zoneHigh     : null,
    tap_tolerance:   isTap  ? tapTolerance : null,
    timeframe:       timeframe || null,
    repeat_interval: repeatInterval,
    note,
    status:          'active',
    last_triggered_at: null,
    proximity_warn_count: 0,
  });

  // Exit edit mode
  editingAlertId = null;

  // Reset button
  const setBtn = document.getElementById('set-alert-btn');
  if (setBtn) {
    setBtn.textContent = 'SET ALERT';
    setBtn.style.background = '';
    setBtn.style.borderColor = '';
  }

  // Reset form
  document.getElementById('alert-price').value         = '';
  document.getElementById('alert-zone-low').value      = '';
  document.getElementById('alert-zone-high').value     = '';
  document.getElementById('alert-note').value          = '';
  document.getElementById('alert-note-zone').value     = '';
  document.getElementById('alert-timeframe').value     = '';
  document.getElementById('alert-repeat').value        = '0';
  delete document.getElementById('alert-price').dataset.userEdited;
  delete document.getElementById('alert-zone-low').dataset.userEdited;
  delete document.getElementById('alert-zone-high').dataset.userEdited;

  renderAlerts();
  renderWatchlist();
  showToast('Alert Updated', `${alert.symbol} alert has been updated.`, 'success');

  // Telegram notification — inform user their alert was updated
  if (telegramEnabled && telegramChatId) {
    sendTelegram(tgEditedMessage(
      alert.symbol, condition, targetPrice, alert.assetId,
      note, timeframe, zoneLow, zoneHigh, repeatInterval, tapTolerance
    ));
  }

  // Switch to alerts panel to show the updated alert
  if (isMobileLayout()) {
    switchAlertTab('active');
    mobileTab('alerts');
  }
}

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
    <a href="https://t.me/tradewatchalert_bot/assistant" target="_blank"
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

  let touchStartedInChart = false;

  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    // Track if touch started inside the chart canvas
    const chartEl = document.getElementById('lw-chart');
    touchStartedInChart = chartEl ? chartEl.contains(e.target) : false;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!isMobileLayout()) return;
    if (document.getElementById('add-modal').style.display !== 'none') return;
    if (document.getElementById('tg-modal').style.display !== 'none') return;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // If touch started inside the chart, only allow edge-swipe back
    // (left 30px of screen) — this lets chart pan/zoom work freely
    const current = navStack[navStack.length - 1];
    if (touchStartedInChart && current === 'chart') {
      // Only trigger back if swipe started from left edge of screen
      if (touchStartX > 30) return;
    }

    // Stricter threshold: 80px horizontal, must be much more horizontal than vertical
    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2.5) return;

    if (dx > 0) {
      goBack();
    } else {
      if (current === 'watchlist' && selectedAsset) {
        mobileTab('chart');
      } else if (current === 'chart') {
        mobileTab('alerts');
      }
    }
  }, { passive: true });
})();

init();
