// ═══════════════════════════════════════════════
// db.js — TradeWatch Supabase Database Layer
// ═══════════════════════════════════════════════

const SUPABASE_URL = 'https://etugovdinpbqiygsbemc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0dWdvdmRpbnBicWl5Z3NiZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzA3NTEsImV4cCI6MjA4ODgwNjc1MX0.4gDZXjYlRsco96Ocuw_qexsgTIhElfr59HqFIaT_06Y';

// ── Supabase client (lightweight, no npm needed) ──
const db = {
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },

  async query(table, options = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    const params = new URLSearchParams();
    if (options.select)  params.set('select', options.select);
    if (options.filter)  Object.entries(options.filter).forEach(([k, v]) => params.set(k, v));
    if (options.order)   params.set('order', options.order);
    if (options.limit)   params.set('limit', options.limit);
    if (params.toString()) url += '?' + params.toString();

    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...this.headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async upsert(table, data, onConflict) {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Prefer': `resolution=merge-duplicates,return=representation`,
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
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { ...this.headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async delete(table, filter) {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => params.set(k, v));
    url += '?' + params.toString();
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  },
};

// ═══════════════════════════════════════════════
// USER — get or create user by telegram_id
// Detects Telegram user ID from WebApp SDK,
// falls back to persistent guest ID for browser testing
// ═══════════════════════════════════════════════
let currentUserId = null;

// Detect Telegram user ID
function detectTelegramId() {
  try {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.id) {
      window.Telegram.WebApp.ready(); // signal app is ready
      window.Telegram.WebApp.expand(); // expand to full screen
      return String(tgUser.id);
    }
  } catch(e) {}
  // Fallback — persistent guest ID for browser/dev testing
  let guestId = localStorage.getItem('tw_user_id');
  if (!guestId) {
    guestId = 'guest_' + Math.random().toString(36).slice(2);
    localStorage.setItem('tw_user_id', guestId);
  }
  return guestId;
}

let currentTelegramId = detectTelegramId();

async function getOrCreateUser(telegramId) {
  try {
    const rows = await db.query('users', {
      select: 'id',
      filter: { 'telegram_id': `eq.${telegramId}` },
      limit: 1,
    });

    if (rows.length > 0) {
      currentUserId = rows[0].id;
      return currentUserId;
    }

    // Create new user
    const created = await db.insert('users', { telegram_id: telegramId });
    currentUserId = created[0].id;
    return currentUserId;
  } catch (e) {
    console.warn('DB: getOrCreateUser failed, using offline mode', e);
    return null;
  }
}

// ═══════════════════════════════════════════════
// PREFERENCES
// ═══════════════════════════════════════════════
async function loadPreferencesFromDB() {
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
  if (!currentUserId) return;
  try {
    await db.upsert('preferences', {
      user_id: currentUserId,
      ...prefs,
    }, 'user_id');
  } catch (e) {
    console.warn('DB: savePreferences failed', e);
  }
}

// ═══════════════════════════════════════════════
// WATCHLIST
// ═══════════════════════════════════════════════
async function loadWatchlist() {
  if (!currentUserId) return null;
  try {
    const rows = await db.query('watchlist', {
      select: '*',
      filter: { 'user_id': `eq.${currentUserId}` },
      order: 'created_at.asc',
    });
    return rows;
  } catch (e) {
    console.warn('DB: loadWatchlist failed', e);
    return null;
  }
}

async function addToWatchlist(asset, category) {
  if (!currentUserId) return;
  try {
    await db.upsert('watchlist', {
      user_id: currentUserId,
      asset_id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      category,
    }, 'user_id,asset_id');
  } catch (e) {
    console.warn('DB: addToWatchlist failed', e);
  }
}

async function removeFromWatchlist(assetId) {
  if (!currentUserId) return;
  try {
    await db.delete('watchlist', {
      'user_id': `eq.${currentUserId}`,
      'asset_id': `eq.${assetId}`,
    });
  } catch (e) {
    console.warn('DB: removeFromWatchlist failed', e);
  }
}

async function syncWatchlistToDB(assets) {
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
  if (!currentUserId) return null;
  try {
    const rows = await db.query('alerts', {
      select: '*',
      filter: { 'user_id': `eq.${currentUserId}` },
      order: 'created_at.asc',
    });
    // Map DB rows to app format
    return rows.map(r => ({
      id: r.id,
      assetId: r.asset_id,
      symbol: r.symbol,
      condition: r.condition,
      targetPrice: parseFloat(r.target_price),
      status: r.status,
      sound: r.sound,
      note: r.note,
      createdAt: new Date(r.created_at).toLocaleTimeString(),
      triggeredAt: r.triggered_at,
      triggeredPrice: r.triggered_price ? parseFloat(r.triggered_price) : null,
      triggeredDirection: r.triggered_direction,
    }));
  } catch (e) {
    console.warn('DB: loadAlerts failed', e);
    return null;
  }
}

async function saveAlert(alert) {
  if (!currentUserId) return alert;
  try {
    const rows = await db.insert('alerts', {
      user_id: currentUserId,
      asset_id: alert.assetId,
      symbol: alert.symbol,
      condition: alert.condition,
      target_price: alert.targetPrice,
      status: alert.status || 'active',
      sound: alert.sound || 'chime',
      note: alert.note || '',
    });
    // Return alert with DB-generated UUID as id
    return { ...alert, id: rows[0].id };
  } catch (e) {
    console.warn('DB: saveAlert failed', e);
    return alert;
  }
}

async function updateAlert(alertId, data) {
  if (!currentUserId) return;
  try {
    await db.update('alerts', data, {
      'id': `eq.${alertId}`,
      'user_id': `eq.${currentUserId}`,
    });
  } catch (e) {
    console.warn('DB: updateAlert failed', e);
  }
}

async function deleteAlertFromDB(alertId) {
  if (!currentUserId) return;
  try {
    await db.delete('alerts', {
      'id': `eq.${alertId}`,
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
  if (!currentUserId) return;
  try {
    await db.insert('alert_history', {
      user_id: currentUserId,
      asset_id: alert.assetId,
      symbol: alert.symbol,
      condition: alert.condition,
      target_price: alert.targetPrice,
      triggered_price: alert.triggeredPrice,
      triggered_at: Date.now(),
      note: alert.note || '',
    });
  } catch (e) {
    console.warn('DB: saveAlertToHistory failed', e);
  }
}

async function clearAlertHistoryFromDB() {
  if (!currentUserId) return;
  try {
    await db.delete('alert_history', {
      'user_id': `eq.${currentUserId}`,
    });
  } catch (e) {
    console.warn('DB: clearAlertHistory failed', e);
  }
}

// ═══════════════════════════════════════════════
// ASSET CLICK TRACKING — powers dynamic Hot List
// ═══════════════════════════════════════════════

async function trackAssetClick(assetId, category) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_asset_click`, {
      method: 'POST',
      headers: { ...db.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_asset_id:  assetId,
        p_category:  category,
        p_user_id:   currentUserId || null,
      }),
    });
  } catch (e) {
    // Non-critical — silently fail
  }
}

async function loadHotListRankings() {
  try {
    // Use combined ranking RPC if we have a user — personalised + global
    // Fall back to global-only if no user yet
    const endpoint = currentUserId
      ? `${SUPABASE_URL}/rest/v1/rpc/get_hot_list_rankings`
      : `${SUPABASE_URL}/rest/v1/asset_clicks?select=asset_id,category,click_count&order=click_count.desc`;

    const res = await fetch(endpoint, {
      method: currentUserId ? 'POST' : 'GET',
      headers: { ...db.headers, 'Content-Type': 'application/json' },
      ...(currentUserId ? { body: JSON.stringify({ p_user_id: currentUserId }) } : {}),
    });

    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || rows.length === 0) return null;

    // Group by category in score order (already sorted by RPC/query)
    const ranked = {};
    rows.forEach(r => {
      if (!ranked[r.category]) ranked[r.category] = [];
      ranked[r.category].push(r.asset_id);
    });
    return ranked;
  } catch (e) {
    console.warn('DB: loadHotListRankings failed', e);
    return null;
  }
}