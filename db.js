// ═══════════════════════════════════════════════
// db.js — altradia Supabase Database Layer
//
// Authenticates each user with a real Supabase JWT (HS256, signed by the
// `mint-jwt` Edge Function after Telegram init_data verification). The
// publishable anon key is still sent as the `apikey` header — PostgREST
// requires it for routing — but the `Authorization: Bearer <jwt>` header
// carries the user's identity, which RLS policies use to scope row access.
//
// Token lifecycle:
//   - On boot, ensureAuth() calls /functions/v1/mint-jwt with init_data
//     and stashes the returned JWT.
//   - Every db.* call uses the JWT.
//   - On a 401 response, the wrapper re-mints once and retries — handles
//     expiry transparently without leaking auth errors to callers.
// ═══════════════════════════════════════════════

const SUPABASE_URL = 'https://etugovdinpbqiygsbemc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0dWdvdmRpbnBicWl5Z3NiZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzA3NTEsImV4cCI6MjA4ODgwNjc1MX0.4gDZXjYlRsco96Ocuw_qexsgTIhElfr59HqFIaT_06Y';

// ── User identity (set by ensureAuth) ──────────────────────────────────
let currentUserId       = null;       // UUID returned by mint-jwt
let currentTelegramId   = null;       // Telegram user.id, set after auth
let _altradiaJwt        = null;       // active access token
let _jwtExpiresAt       = 0;          // unix-seconds expiry
let _authPromise        = null;       // dedupes concurrent ensureAuth() calls

// Detect Telegram user ID for the dev fallback path. The real auth still
// goes through mint-jwt — this just feeds the local console with a value
// for debugging; it does not influence what user_id the server picks.
// Read initData from the URL hash. Telegram WebApps are launched
// with #tgWebAppData=... which is present BEFORE the SDK script has
// finished parsing. This gives us a reliable signal of "we are in
// Telegram" that doesn't depend on telegram-web-app.js timing.
function _readInitDataFromHash() {
  try {
    const hash = (window.location.hash || '').replace(/^#/, '');
    if (!hash) return '';
    const params = new URLSearchParams(hash);
    return params.get('tgWebAppData') || '';
  } catch (_) { return ''; }
}

// True if there's ANY indication we're inside Telegram, regardless of
// SDK readiness. Used to decide whether we should keep waiting for
// initData rather than falling back to dev/browser mode.
function _inTelegramContext() {
  try {
    // Hash check — most reliable.
    if (_readInitDataFromHash()) return true;
    // SDK object exists.
    if (window.Telegram?.WebApp) return true;
    // Inside an iframe (Telegram embeds WebApps in iframes on most platforms).
    if (window.self !== window.top) return true;
  } catch (_) { /* cross-origin frame access can throw — treat as Telegram */ return true; }
  return false;
}

function _getTelegramHints() {
  try {
    const tg = window.Telegram?.WebApp;
    // Preferred: the SDK is ready and has initData.
    if (tg && (tg.initDataUnsafe?.user?.id || (typeof tg.initData === 'string' && tg.initData.length > 0))) {
      try { tg.ready();  } catch (_) {}
      try { tg.expand(); } catch (_) {}
      return {
        initData:   tg.initData || '',
        telegramId: tg.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : '',
      };
    }
    // Fallback: SDK isn't ready but the launch URL has the initData in
    // the hash. This is the path that saves us on slow Telegram WebViews
    // (notably 6.0) where the SDK script hasn't parsed yet. The hash
    // is set by Telegram before our page even loads.
    const hashInitData = _readInitDataFromHash();
    if (hashInitData) {
      return { initData: hashInitData, telegramId: '' };
    }
  } catch (e) { /* not in Telegram */ }
  return { initData: '', telegramId: '' };
}

// Wait for Telegram.WebApp.initDataUnsafe to be populated before attempting
// auth. After a Telegram cache clear, the WebView reloads and our app boot
// can race ahead of telegram-web-app.js initialization. Without this wait,
// ensureAuth() runs with empty init_data, mint-jwt 401s, every DB call
// returns null, and the UI renders empty (no watchlist, no alerts, no
// journal). Polls every 50ms up to ~3s. Resolves when ready, or times
// out and lets the caller fall through to dev-mode fallback (browser).
// Some Telegram clients (notably 6.0) won't populate initData until the
// WebApp explicitly calls tg.ready(). Calling it as soon as the SDK
// object appears unblocks the data flow.
let _twaReadyCalled = false;
function _kickTwaReady() {
  if (_twaReadyCalled) return;
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    _twaReadyCalled = true;
    try { tg.ready();  } catch (_) {}
    try { tg.expand(); } catch (_) {}
  } catch (_) {}
}

function _waitForTelegramReady(maxMs = 3000) {
  return new Promise((resolve) => {
    const start = Date.now();
    // Check ONCE up-front whether we have a reliable Telegram signal
    // (URL hash). If we do, there's no point bailing to "browser" —
    // we ARE in Telegram, the SDK is just slow.
    const inTelegram = _inTelegramContext();
    const hashHasData = !!_readInitDataFromHash();

    const check = () => {
      try {
        const tg = window.Telegram?.WebApp;
        if (tg) _kickTwaReady();
        // Resolve TRUE as soon as we have initData from EITHER the SDK
        // (preferred) OR the URL hash (fallback for slow SDK).
        if (tg && typeof tg.initData === 'string' && tg.initData.length > 0) {
          console.log('[auth] Telegram.WebApp ready after', Date.now() - start, 'ms');
          return resolve(true);
        }
        if (hashHasData) {
          // Hash already has initData — we have what mint-jwt needs.
          // No need to wait further.
          console.log('[auth] initData found in URL hash after', Date.now() - start, 'ms');
          return resolve(true);
        }
        // ONLY bail to browser mode if we have NO Telegram signals at
        // all. Previously we bailed on "!tg after 200ms" which mis-
        // identified slow Telegram WebViews (6.0 etc.) as browsers,
        // causing a wrong-user JWT via the dev fallback.
        if (!inTelegram && !tg && Date.now() - start > 200) {
          console.log('[auth] no Telegram signals after 200ms — assuming browser');
          return resolve(false);
        }
      } catch (_) { /* keep polling */ }
      if (Date.now() - start >= maxMs) {
        console.warn('[auth] Telegram.WebApp not ready after', maxMs, 'ms — proceeding anyway');
        _kickTwaReady();
        return resolve(false);
      }
      setTimeout(check, 50);
    };
    check();
  });
}

// Mint a fresh JWT via the Edge Function. Falls back to dev mode in a
// regular browser ONLY if the Edge Function is configured with
// ALTRADIA_DEV_MODE=1 in its secrets.
async function _mintJwt() {
  // Self-heal: if a previous session got stuck on the dev fallback path
  // (e.g. slow Telegram SDK load mis-classified as "browser"), the dev
  // telegram_id can linger in localStorage and keep auth'ing as the
  // wrong user. If we detect ANY Telegram context now, wipe it so this
  // session uses real init_data only.
  try {
    if (_inTelegramContext() && localStorage.getItem('altradia_dev_telegram_id')) {
      console.warn('[auth] clearing stale dev_telegram_id — we are in Telegram');
      localStorage.removeItem('altradia_dev_telegram_id');
    }
  } catch (_) {}

  const hints = _getTelegramHints();

  let body;
  if (hints.initData) {
    body = { init_data: hints.initData };
  } else if (_inTelegramContext()) {
    // We KNOW we're in Telegram (hash or iframe signal) but initData
    // is unavailable. Refuse to mint with the dev fallback — it would
    // auth as the wrong user. Throw so the caller can surface this
    // clearly rather than silently picking the wrong account.
    throw new Error('Telegram context detected but initData unavailable — cannot auth');
  } else {
    // Browser dev fallback: needs the Edge Function in dev mode AND a
    // persistent fake telegram id stored locally so repeated reloads keep
    // the same user.
    let devId = localStorage.getItem('altradia_dev_telegram_id');
    if (!devId) {
      devId = '99' + Math.floor(Math.random() * 1e8).toString();
      localStorage.setItem('altradia_dev_telegram_id', devId);
    }
    body = { dev: 1, telegram_id: devId };
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/mint-jwt`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      // The Edge Function itself also needs an apikey header for the
      // Supabase gateway; the bearer is the anon key here because we're
      // literally trying to obtain user auth.
      'apikey':         SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`mint-jwt failed: HTTP ${res.status} ${text}`);
  }
  const data = await res.json();
  if (!data.ok || !data.token) throw new Error(`mint-jwt rejected: ${data.error || 'unknown'}`);

  _altradiaJwt      = data.token;
  _jwtExpiresAt     = data.expires_at;
  currentUserId     = data.user_id;
  currentTelegramId = data.telegram_id;
  console.log('[auth] minted JWT for user', currentUserId, 'expires in',
    Math.round((data.expires_at - Date.now() / 1000) / 60) + 'm');
  // If we just authenticated via real init_data (not the dev fallback),
  // wipe any stored dev_telegram_id so a slow SDK load on a later
  // session can't accidentally fall back to that stale dev user.
  if (body && body.init_data) {
    try { localStorage.removeItem('altradia_dev_telegram_id'); } catch (_) {}
  }
  return _altradiaJwt;
}

// Public helper. Concurrent callers share a single in-flight mint; once
// the token is fresh, subsequent calls return immediately.
//
// Failure semantics: returns null rather than throwing. This means callers
// must check the result before assuming a JWT is available — but it also
// means a single auth failure never cascades through every awaited db
// call and brick the whole boot. We surface the last error on
// `lastAuthError` so app.js can show a toast.
let lastAuthError = null;
async function ensureAuth() {
  // Fast path: token still fresh.
  const nowSec = Math.floor(Date.now() / 1000);
  if (_altradiaJwt && _jwtExpiresAt > nowSec + 30) return _altradiaJwt;
  // Dedupe: if another caller is already auth'ing, share its promise.
  // Critically, the SDK wait happens INSIDE this promise — concurrent
  // callers all await the same wait rather than each spending their own
  // 3 seconds independently.
  if (_authPromise) return _authPromise;
  _authPromise = (async () => {
    try {
      lastAuthError = null;
      // Wait for the Telegram SDK to populate initData before minting.
      // After a Telegram cache clear, the WebView reloads and our boot
      // can race ahead of telegram-web-app.js init.
      await _waitForTelegramReady();
      return await _mintJwt();
    } catch (e) {
      lastAuthError = e?.message || String(e);
      console.error('[auth] ensureAuth failed:', lastAuthError);
      return null;
    } finally {
      _authPromise = null;
    }
  })();
  return _authPromise;
}

// Force re-mint (used on 401 retries). Returns null on failure rather
// than throwing — the caller decides whether to proceed without auth.
async function _forceReauth() {
  _altradiaJwt    = null;
  _jwtExpiresAt   = 0;
  return ensureAuth();
}

// Build headers for a request with the current JWT. If auth failed
// (token is null), we degrade to the anon key so the request at least
// reaches the server — RLS will then reject any user-scoped read/write
// with a 401, and the caller can surface that gracefully instead of
// hanging indefinitely.
async function _authHeaders(extra = {}) {
  const tok = await ensureAuth();
  return {
    'Content-Type':  'application/json',
    'apikey':         SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${tok || SUPABASE_ANON_KEY}`,
    ...extra,
  };
}

// Auto-retry-on-401 wrapper. PostgREST returns 401 if the JWT is invalid
// or expired; we re-mint once and retry transparently.
async function _authedFetch(url, init = {}) {
  let res = await fetch(url, { ...init, headers: { ...(await _authHeaders()), ...(init.headers || {}) } });
  if (res.status === 401) {
    console.warn('[auth] 401 — re-minting JWT and retrying');
    await _forceReauth();
    res = await fetch(url, { ...init, headers: { ...(await _authHeaders()), ...(init.headers || {}) } });
  }
  return res;
}

// ── Supabase REST helper (lightweight, no npm needed) ──────────────────
const db = {
  async query(table, options = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    const params = new URLSearchParams();
    if (options.select)  params.set('select', options.select);
    if (options.filter)  Object.entries(options.filter).forEach(([k, v]) => params.set(k, v));
    if (options.order)   params.set('order', options.order);
    if (options.limit)   params.set('limit', options.limit);
    if (params.toString()) url += '?' + params.toString();
    const res = await _authedFetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async insert(table, data) {
    const res = await _authedFetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:  'POST',
      headers: { 'Prefer': 'return=representation' },
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async upsert(table, data, onConflict) {
    // PostgREST conflict resolution goes via the ?on_conflict= query
    // parameter, NOT a header. Previous header-based attempt was ignored,
    // making upsert act like a plain insert (which then hit unique
    // constraint errors on existing rows).
    const url = onConflict
      ? `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`
      : `${SUPABASE_URL}/rest/v1/${table}`;
    const res = await _authedFetch(url, {
      method:  'POST',
      headers: {
        'Prefer': 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async update(table, data, filter) {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => params.set(k, v));
    url += '?' + params.toString();
    const res = await _authedFetch(url, {
      method:  'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async delete(table, filter) {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => params.set(k, v));
    url += '?' + params.toString();
    const res = await _authedFetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    return true;
  },
};

// ═══════════════════════════════════════════════
// USER bootstrap — kept as a name-compat shim
// ═══════════════════════════════════════════════
// The legacy getOrCreateUser() created the row via direct SQL. Now mint-jwt
// owns user creation server-side, and ensureAuth() returns the user_id as a
// side effect. This shim exists so existing callers in app.js (e.g.
// `await getOrCreateUser(currentTelegramId)`) keep working without edits.
async function getOrCreateUser(_telegramId) {
  try {
    await ensureAuth();
    return currentUserId;
  } catch (e) {
    console.error('DB: getOrCreateUser FAILED', e.message || e);
    return null;
  }
}

// ═══════════════════════════════════════════════
// PREFERENCES
// ═══════════════════════════════════════════════
async function loadPreferencesFromDB() {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) return null;
  try {
    const rows = await db.query('preferences', {
      select: '*',
      filter: { 'user_id': `eq.${currentUserId}` },
      limit: 1,
    });
    return rows[0] || null;
  } catch (e) {
    console.warn('DB: loadPreferences failed', e);
    return null;
  }
}

async function savePreferencesDB(prefs) {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) return;
  try {
    await db.upsert('preferences', { user_id: currentUserId, ...prefs }, 'user_id');
  } catch (e) {
    console.warn('DB: savePreferences failed', e);
  }
}

// ═══════════════════════════════════════════════
// WATCHLIST
// ═══════════════════════════════════════════════
async function loadWatchlist() {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) return null;
  try {
    return await db.query('watchlist', {
      select: 'asset_id,symbol,name,category',
      filter: { 'user_id': `eq.${currentUserId}` },
      order: 'created_at.asc',
    });
  } catch (e) {
    console.warn('DB: loadWatchlist failed', e);
    return null;
  }
}

async function addToWatchlist(asset, category) {
  console.log('[watchlist] add attempt', { assetId: asset.id, symbol: asset.symbol, category, currentUserId });
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) {
    console.warn('[watchlist] add aborted — no currentUserId after ensureAuth');
    return;
  }
  try {
    // Direct fetch so we can inspect status + body, instead of relying on
    // db.upsert which only throws on res.ok === false. Some RLS failures
    // return 201 with empty body and we want to catch that case too.
    const url = `${SUPABASE_URL}/rest/v1/watchlist?on_conflict=user_id,asset_id`;
    const res = await _authedFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        user_id:  currentUserId,
        asset_id: asset.id,
        symbol:   asset.symbol,
        name:     asset.name,
        category,
      }),
    });
    const status = res.status;
    let bodyText = '';
    try { bodyText = await res.text(); } catch (_) {}
    console.log('[watchlist] add response', { status, ok: res.ok, body: bodyText.slice(0, 400) });
    if (!res.ok) {
      console.error('[watchlist] add FAILED — non-2xx', asset.id, status, bodyText.slice(0, 200));
      return;
    }
    // Parse the body. If it's an empty array, the INSERT was silently
    // filtered by RLS — PostgREST returns 201 with [] when no rows were
    // affected. This is the smoking gun for missing INSERT policy.
    let parsed = null;
    try { parsed = JSON.parse(bodyText); } catch (_) {}
    if (Array.isArray(parsed) && parsed.length === 0) {
      console.error('[watchlist] add SILENTLY DROPPED — RLS likely missing INSERT policy on watchlist table');
      return;
    }
    console.log('[watchlist] add OK', asset.id, parsed);
  } catch (e) {
    console.error('[watchlist] add EXCEPTION', asset.id, e?.message || e);
  }
}

async function removeFromWatchlist(assetId) {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) {
    console.warn('[watchlist] remove skip — no currentUserId', assetId);
    return;
  }
  console.log('[watchlist] remove attempt', { assetId, currentUserId });
  try {
    const url = `${SUPABASE_URL}/rest/v1/watchlist?user_id=eq.${currentUserId}&asset_id=eq.${assetId}`;
    const res = await _authedFetch(url, { method: 'DELETE' });
    const status = res.status;
    const body = await res.text().catch(() => '<no body>');
    console.log('[watchlist] remove response', { status, ok: res.ok, body: body.slice(0, 200) });
    if (!res.ok) {
      console.error('[watchlist] remove FAILED', status, body.slice(0, 300));
    }
  } catch (e) {
    console.warn('[watchlist] remove EXCEPTION', e?.message || e);
  }
}

async function syncWatchlistToDB(assets) {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) return;
  for (const [category, assetList] of Object.entries(assets)) {
    for (const asset of assetList) {
      await addToWatchlist(asset, category);
    }
  }
}

// ═══════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════
async function loadAlertsFromDB() {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) return null;
  try {
    const rows = await db.query('alerts', {
      select: '*',
      filter: { 'user_id': `eq.${currentUserId}` },
      order: 'created_at.asc',
    });
    // Log raw rows BEFORE mapping (was previously placed after the return,
    // which made it dead code — the function exited before logging fired).
    // Log unconditionally — "no setup rows found" is a useful signal too.
    try {
      const allCount   = (rows || []).length;
      const setups     = (rows || []).filter(r => r.condition === 'setup');
      console.log('[shot] step4 loadAlertsFromDB:', {
        totalRows:   allCount,
        setupRows:   setups.length,
        setups: setups.map(r => ({
          id:                       r.id,
          symbol:                   r.symbol,
          raw_setup_screenshot_url: r.setup_screenshot_url,
          column_exists:            ('setup_screenshot_url' in r),
          note_has_screenshot:      (r.note || '').includes('setupScreenshot'),
          note_preview:             (r.note || '').slice(0, 220),
        })),
      });
    } catch(e) { console.warn('[shot] step4 log failed:', e); }

    return rows.map(r => ({
      id: r.id,
      assetId: r.asset_id,
      symbol: r.symbol,
      condition: r.condition,
      targetPrice: parseFloat(r.target_price),
      zoneLow:  r.zone_low  ? parseFloat(r.zone_low)  : null,
      zoneHigh: r.zone_high ? parseFloat(r.zone_high) : null,
      timeframe: r.timeframe || null,
      repeatInterval: parseInt(r.repeat_interval) || 0,
      tapTolerance:  r.tap_tolerance  ? parseFloat(r.tap_tolerance)  : null,
      status: r.status,
      sound: r.sound,
      note: r.note,
      createdAt: new Date(r.created_at).toLocaleDateString([], {day:'2-digit',month:'short',year:'numeric'}) + ' · ' + new Date(r.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:true}),
      createdMs: new Date(r.created_at).getTime(),
      triggeredAt: r.triggered_at,
      triggeredPrice: r.triggered_price ? parseFloat(r.triggered_price) : null,
      triggeredDirection: r.triggered_direction,
      lastTriggeredAt: r.last_triggered_at ? new Date(r.last_triggered_at).getTime() : 0,
      zoneTriggeredOnce: r.condition === 'zone' && parseInt(r.repeat_interval) > 0 && !!r.last_triggered_at,
      setupScreenshotUrl: r.setup_screenshot_url || null,
    }));
  } catch (e) {
    console.warn('DB: loadAlerts failed', e);
    return null;
  }
}

async function saveAlert(alert) {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) return alert;
  try {
    const insertPayload = {
      // Use the client-generated UUID so Telegram confirmation, DOM card,
      // and DB row share one ID. Supabase will accept it (the column
      // default just generates a new one if id is null).
      id:              alert.id,
      user_id:         currentUserId,
      asset_id:        alert.assetId,
      symbol:          alert.symbol,
      condition:       alert.condition,
      target_price:    alert.targetPrice,
      status:          alert.status || 'active',
      sound:           alert.sound || 'chime',
      note:            alert.note || '',
      zone_low:        alert.zoneLow        || null,
      zone_high:       alert.zoneHigh       || null,
      // Persist which side price was on when the zone alert was created.
      // Server-side cron uses this for directional gating. Previously
      // omitted, so cron always saw null → no direction gate.
      zone_created_above: (typeof alert.zoneCreatedAbove === 'boolean')
        ? alert.zoneCreatedAbove
        : null,
      timeframe:       alert.timeframe      || null,
      repeat_interval: alert.repeatInterval || 0,
      tap_tolerance:   alert.tapTolerance   || null,
      setup_screenshot_url: alert.setupScreenshotUrl || null,
    };
    if (alert.condition === 'setup') {
      console.log('[shot] step3 db.saveAlert payload:', {
        condition:            insertPayload.condition,
        setup_screenshot_url: insertPayload.setup_screenshot_url,
        note_has_screenshot:  (insertPayload.note || '').includes('setupScreenshot'),
        note_preview:         (insertPayload.note || '').slice(0, 200),
      });
    }
    const rows = await db.insert('alerts', insertPayload);
    if (alert.condition === 'setup') {
      console.log('[shot] step3b db.saveAlert response:', {
        gotRow:               !!rows?.[0],
        returnedId:           rows?.[0]?.id,
        returned_screenshot:  rows?.[0]?.setup_screenshot_url,
      });
    }
    return { ...alert, id: rows[0].id };
  } catch (e) {
    console.warn('DB: saveAlert failed', e);
    return alert;
  }
}

async function updateAlert(alertId, data) {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) return;
  try {
    await db.update('alerts', data, {
      'id':      `eq.${alertId}`,
      'user_id': `eq.${currentUserId}`,
    });
  } catch (e) {
    console.warn('DB: updateAlert failed', e);
  }
}

async function deleteAlertFromDB(alertId) {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) return;
  try {
    await db.delete('alerts', {
      'id':      `eq.${alertId}`,
      'user_id': `eq.${currentUserId}`,
    });
  } catch (e) {
    console.warn('DB: deleteAlert failed', e);
  }
}

// ═══════════════════════════════════════════════
// ALERT HISTORY
// ═══════════════════════════════════════════════
async function loadAlertHistoryFromDB() {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) return null;
  try {
    const rows = await db.query('alert_history', {
      select: '*',
      filter: { 'user_id': `eq.${currentUserId}` },
      order: 'triggered_at.desc',
    });
    return rows.map(r => ({
      id: r.id,
      symbol: r.symbol,
      assetId: r.asset_id,
      condition: r.condition,
      targetPrice: parseFloat(r.target_price),
      triggeredAt: parseInt(r.triggered_at),
      triggeredPrice: parseFloat(r.triggered_price),
      note: r.note || '',
    }));
  } catch (e) {
    console.warn('DB: loadAlertHistory failed', e);
    return null;
  }
}

async function saveAlertToHistory(alert) {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) return;
  try {
    await db.insert('alert_history', {
      user_id:          currentUserId,
      asset_id:         alert.assetId,
      symbol:           alert.symbol,
      condition:        alert.condition,
      target_price:     alert.targetPrice,
      triggered_price:  alert.triggeredPrice,
      triggered_at:     Date.now(),
      note:             alert.note || '',
    });
  } catch (e) {
    console.warn('DB: saveAlertToHistory failed', e);
  }
}

async function clearAlertHistoryFromDB() {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) return;
  try {
    await db.delete('alert_history', { 'user_id': `eq.${currentUserId}` });
  } catch (e) {
    console.warn('DB: clearAlertHistory failed', e);
  }
}

