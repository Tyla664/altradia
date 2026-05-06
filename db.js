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
function _getTelegramHints() {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      tg.ready();
      tg.expand();
      return {
        initData:   tg.initData || '',
        telegramId: String(tg.initDataUnsafe.user.id),
      };
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
function _waitForTelegramReady(maxMs = 3000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      try {
        const tg = window.Telegram?.WebApp;
        // Inside Telegram: wait for initDataUnsafe.user.id specifically.
        if (tg?.initDataUnsafe?.user?.id) {
          console.log('[auth] Telegram.WebApp ready after', Date.now() - start, 'ms');
          return resolve(true);
        }
        // Outside Telegram (browser): the SDK script either didn't load OR
        // there's no Telegram context at all. Give up quickly so dev-mode
        // fallback can kick in.
        if (!tg && Date.now() - start > 200) {
          console.log('[auth] no Telegram.WebApp after 200ms — assuming browser');
          return resolve(false);
        }
      } catch (_) { /* keep polling */ }
      if (Date.now() - start >= maxMs) {
        console.warn('[auth] Telegram.WebApp not ready after', maxMs, 'ms — proceeding anyway');
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
  const hints = _getTelegramHints();

  let body;
  if (hints.initData) {
    body = { init_data: hints.initData };
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
  // Wait for Telegram WebApp SDK to populate initDataUnsafe before
  // attempting to mint a JWT. This is critical after Telegram cache
  // clear when our app boot races telegram-web-app.js init.
  await _waitForTelegramReady();
  const nowSec = Math.floor(Date.now() / 1000);
  if (_altradiaJwt && _jwtExpiresAt > nowSec + 30) return _altradiaJwt;
  if (_authPromise) return _authPromise;
  _authPromise = (async () => {
    try {
      lastAuthError = null;
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
    const res = await _authedFetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:  'POST',
      headers: {
        'Prefer': 'resolution=merge-duplicates,return=representation',
        ...(onConflict ? { 'on-conflict': onConflict } : {}),
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
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) { console.warn('DB: addToWatchlist — no currentUserId'); return; }
  try {
    const result = await db.upsert('watchlist', {
      user_id:  currentUserId,
      asset_id: asset.id,
      symbol:   asset.symbol,
      name:     asset.name,
      category,
    }, 'user_id,asset_id');
    console.log('DB: addToWatchlist success', asset.id, result);
  } catch (e) {
    console.error('DB: addToWatchlist FAILED', asset.id, e.message || e);
  }
}

async function removeFromWatchlist(assetId) {
  if (!currentUserId) await ensureAuth();
  if (!currentUserId) return;
  try {
    await db.delete('watchlist', {
      'user_id':  `eq.${currentUserId}`,
      'asset_id': `eq.${assetId}`,
    });
  } catch (e) {
    console.warn('DB: removeFromWatchlist failed', e);
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
