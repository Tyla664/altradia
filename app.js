// ═══════════════════════════════════════════════
// TradeWatch — Server-Side Alert Monitor
// Supabase Edge Function (Deno runtime)
//
// Runs every minute via pg_cron.
// Uses CoinGecko (crypto) + Twelve Data (everything else)
// ═══════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('APP_SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('APP_SERVICE_ROLE_KEY')!;
const TD_KEY           = Deno.env.get('TD_KEY')!;
const TELEGRAM_TOKEN   = Deno.env.get('TELEGRAM_TOKEN')!;

const CRYPTO_IDS = new Set(['bitcoin','ethereum','solana','ripple','binancecoin']);

const TD_SYMBOL: Record<string, string> = {
  AAPL:'AAPL', TSLA:'TSLA', NVDA:'NVDA', MSFT:'MSFT',
  'EUR/USD':'EUR/USD','GBP/USD':'GBP/USD','USD/JPY':'USD/JPY','AUD/USD':'AUD/USD',
  'XAU/USD':'XAU/USD','XAG/USD':'XAG/USD','WTI/USD':'WTI/USD','XNG/USD':'XNG/USD',
  SPX:'SPX', IXIC:'IXIC', DJI:'DJI', FTSE:'FTSE',
};

async function fetchCryptoPrices(ids: string[]): Promise<Record<string,number>> {
  const out: Record<string,number> = {};
  if (!ids.length) return out;
  try {
    const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`);
    const data = await res.json();
    for (const id of ids) if (data[id]?.usd) out[id] = data[id].usd;
  } catch(e) { console.error('CoinGecko error:', e); }
  return out;
}

async function fetchTDPrices(ids: string[]): Promise<Record<string,number>> {
  const out: Record<string,number> = {};
  const mapped = ids.filter(id => TD_SYMBOL[id]);
  if (!mapped.length) return out;
  try {
    const symbols = mapped.map(id => TD_SYMBOL[id]).join(',');
    const res  = await fetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbols)}&apikey=${TD_KEY}`);
    const data = await res.json();
    for (const id of mapped) {
      const sym   = TD_SYMBOL[id];
      const entry = mapped.length === 1 ? data : data[sym];
      if (entry?.price) out[id] = parseFloat(entry.price);
    }
  } catch(e) { console.error('TwelveData error:', e); }
  return out;
}

function fmt(price: number, assetId: string): string {
  if (price < 0.01) return '$' + price.toFixed(6);
  if (price < 1)    return '$' + price.toFixed(4);
  if (assetId.includes('/') && !assetId.startsWith('XAU') && !assetId.startsWith('XAG'))
    return price.toFixed(4);
  return '$' + price.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function tgRow(label: string, value: string): string {
  return `<code>${label.padEnd(16)}</code>${value}`;
}

function buildMessage(
  symbol: string, assetId: string, condition: string,
  target: number, current: number, note: string,
  timeframe?: string, zoneLow?: number, zoneHigh?: number, repeatInterval?: number,
  timezone?: string, tapTolerance?: number
): string {
  const isZone  = condition === 'zone';
  const isAbove = condition === 'above';
  const isTap   = condition === 'tap';
  const tz   = timezone || 'UTC';
  const now  = new Date();
  const time = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZone: tz });

  let header: string, subtitle: string, rows: string[] = [];

  if (isZone) {
    header   = `📍 <b>ZONE ALERT — ${symbol}</b>`;
    subtitle = `Price has entered your zone`;
    rows.push(tgRow('Zone',          `<b>${fmt(zoneLow!, assetId)} – ${fmt(zoneHigh!, assetId)}</b>`));
    rows.push(tgRow('Current price', `<b>${fmt(current, assetId)}</b>`));
    if (timeframe)                            rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
    if (repeatInterval && repeatInterval > 0) rows.push(tgRow('Repeat',   `<b>Every ${repeatInterval} min</b>`));
  } else if (isTap) {
    header   = `🎯 <b>TAP ALERT — ${symbol}</b>`;
    subtitle = `Price touched your level`;
    rows.push(tgRow('Level',         `<b>${fmt(target, assetId)}</b>`));
    rows.push(tgRow('Current price', `<b>${fmt(current, assetId)}</b>`));
    rows.push(tgRow('Tolerance',     `<b>±${tapTolerance}%</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  } else {
    const dirWord = isAbove ? 'broke above' : 'dropped below';
    header   = `${isAbove ? '🚀' : '📉'} <b>ALERT TRIGGERED — ${symbol}</b>`;
    subtitle = `Price ${dirWord} your target`;
    rows.push(tgRow('Target',        `<b>${fmt(target, assetId)}</b>`));
    rows.push(tgRow('Current price', `<b>${fmt(current, assetId)}</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  }

  if (note) rows.push(tgRow('Note', `<i>${note}</i>`));

  return [header, ``, subtitle, ``, ...rows, ``, `⏰ ${time}`, ``, `<a href="https://t.me/tradewatchalert_bot/assistant">Dismiss in TradeWatch →</a>`].join('\n');
}

async function sendTelegram(chatId: string, message: string): Promise<boolean> {
  try {
    const res  = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
    const data = await res.json();
    if (!data.ok) console.error('Telegram error:', data.description);
    return data.ok;
  } catch(e) { console.error('Telegram send failed:', e); return false; }
}

// ── Market hours guard ───────────────────────────
// Crypto trades 24/7 — always open.
// Forex trades Sun 5pm ET → Fri 5pm ET (nearly 24/5).
// Stocks trade Mon–Fri 9:30am–4pm ET.
// Commodities follow forex-like hours.
// On weekends/outside hours, TD returns stale last-close price —
// we must not fire alerts on stale data.

function isForexOpen(now: Date): boolean {
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  const hour = now.getUTCHours();
  // Forex closed: Sat 00:00–Sun 21:00 UTC (approx Fri 5pm–Sun 5pm ET)
  if (day === 6) return false;                      // all Saturday
  if (day === 0 && hour < 21) return false;         // Sunday before ~5pm ET
  return true;
}

function isStockOpen(now: Date): boolean {
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;         // weekend
  const hour = now.getUTCHours();
  const min  = now.getUTCMinutes();
  const mins = hour * 60 + min;
  // NYSE: 9:30am–4:00pm ET = 14:30–21:00 UTC (approx, ignores DST)
  return mins >= 870 && mins < 1260;
}

function isCrypto(assetId: string): boolean {
  return CRYPTO_IDS.has(assetId);
}

function isForex(assetId: string): boolean {
  return assetId.includes('/') && !assetId.startsWith('XAU') && !assetId.startsWith('XAG')
      && !assetId.startsWith('WTI') && !assetId.startsWith('XNG');
}

function isCommodity(assetId: string): boolean {
  return ['XAU/USD','XAG/USD','WTI/USD','XNG/USD'].includes(assetId);
}

function shouldCheckAlert(assetId: string, now: Date): boolean {
  if (isCrypto(assetId))     return true;           // always
  if (isForex(assetId))      return isForexOpen(now);
  if (isCommodity(assetId))  return isForexOpen(now); // commodities follow forex hours
  return isStockOpen(now);                           // stocks
}

Deno.serve(async (_req) => {
  const t0 = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // Fetch active alerts + preferences in parallel, join manually by user_id
    const [alertsRes, prefsRes] = await Promise.all([
      supabase.from('alerts')
        .select(`id, asset_id, symbol, condition, target_price, note, user_id,
          zone_low, zone_high, timeframe, repeat_interval, last_triggered_at,
          tap_tolerance`)
        .eq('status', 'active'),
      supabase.from('preferences')
        .select('user_id, telegram_chat_id, telegram_enabled, timezone'),
    ]);

    if (alertsRes.error) throw alertsRes.error;
    const alerts = alertsRes.data || [];
    if (!alerts.length) return new Response(JSON.stringify({ ok:true, checked:0, triggered:0 }), { headers:{'Content-Type':'application/json'} });

    // Build user_id → prefs lookup map
    const prefsMap: Record<string, any> = {};
    (prefsRes.data || []).forEach((p: any) => { prefsMap[p.user_id] = p; });

    console.log(`Checking ${alerts.length} alerts... prefsMap keys: ${Object.keys(prefsMap).length}`);

    const uniqueIds    = [...new Set(alerts.map((a:any) => a.asset_id))];
    const cryptoIds    = uniqueIds.filter(id => CRYPTO_IDS.has(id));
    const nonCryptoIds = uniqueIds.filter(id => !CRYPTO_IDS.has(id));

    const [cp, tp] = await Promise.all([fetchCryptoPrices(cryptoIds), fetchTDPrices(nonCryptoIds)]);
    const prices   = { ...cp, ...tp };
    console.log('Prices fetched:', prices);

    let triggered = 0;
    const nowMs = Date.now();
    const nowDate = new Date(nowMs);

    await Promise.all(alerts.map(async (alert: any) => {
      // Skip non-crypto alerts when their market is closed — avoids stale price false triggers
      if (!shouldCheckAlert(alert.asset_id, nowDate)) return;

      const current = prices[alert.asset_id];
      if (!current) return;

      const isZone      = alert.condition === 'zone';
      const isTap       = alert.condition === 'tap';
      const target      = parseFloat(alert.target_price);
      const zoneLow     = parseFloat(alert.zone_low   || '0');
      const zoneHigh    = parseFloat(alert.zone_high  || '0');
      const tapTol      = parseFloat(alert.tap_tolerance  || '0.2');
      const repeatMs    = (parseInt(alert.repeat_interval) || 0) * 60 * 1000;
      const lastFiredAt = alert.last_triggered_at ? new Date(alert.last_triggered_at).getTime() : 0;

      let fired = false;
      let keepActive = false;

      if (isZone) {
        const inZone = current >= zoneLow && current <= zoneHigh;
        if (!inZone) return;
        if (repeatMs === 0 && lastFiredAt > 0) return;
        if (repeatMs > 0 && (nowMs - lastFiredAt) < repeatMs) return;
        fired = true;
        keepActive = repeatMs > 0;
      } else if (isTap) {
        const tol = tapTol / 100;
        const withinRange = Math.abs(current - target) / target <= tol;
        if (!withinRange) return;
        if (lastFiredAt > 0) return; // tap fires once per touch — reset requires price leaving range
        fired = true;
      } else {
        fired = alert.condition === 'above' ? current >= target : current <= target;
        if (!fired) return;
      }

      triggered++;
      console.log(`TRIGGERED: ${alert.symbol} ${alert.condition} @ ${current}`);

      // Look up prefs directly by user_id
      const prefs  = prefsMap[alert.user_id];
      const chatId = prefs?.telegram_chat_id;
      const tgOn   = prefs?.telegram_enabled;
      const userTz = prefs?.timezone || 'UTC';
      console.log(`User ${alert.user_id} → chatId: ${chatId}, tgOn: ${tgOn}`);

      if (keepActive) {
        // Zone repeat — just update last_triggered_at, keep status active
        await supabase.from('alerts').update({
          last_triggered_at: new Date().toISOString(),
        }).eq('id', alert.id);
      } else {
        await supabase.from('alerts').update({
          status:              'triggered',
          triggered_price:     current,
          triggered_at:        new Date().toISOString(),
          triggered_direction: alert.condition,
          last_triggered_at:   new Date().toISOString(),
        }).eq('id', alert.id);
      }

      await supabase.from('alert_history').insert({
        user_id:         alert.user_id,
        asset_id:        alert.asset_id,
        symbol:          alert.symbol,
        condition:        alert.condition,
        target_price:    isZone ? zoneLow : target,
        triggered_price: current,
        triggered_at:    nowMs,
        note:            alert.note || '',
      });

      if (tgOn && chatId) {
        await sendTelegram(chatId, buildMessage(
          alert.symbol, alert.asset_id, alert.condition,
          target, current, alert.note || '',
          alert.timeframe, zoneLow, zoneHigh, parseInt(alert.repeat_interval) || 0,
          userTz, tapTol
        ));
      }
    }));

    // ── Passive proximity reminders ────────────────────────────────────────
    // For every active alert, check if price is within 2% of the target.
    // Fire a Telegram heads-up a maximum of 2 times before the alert triggers.
    // Tracked via proximity_warn_count column (0 → 1 → 2 = max, no more warnings).
    const PROX_PCT = 0.02; // 2% warning distance
    await Promise.all(alerts.map(async (alert: any) => {
      if (alert.status !== 'active') return;
      const current = prices[alert.asset_id];
      if (!current) return;

      const warnCount = parseInt(alert.proximity_warn_count || '0');
      if (warnCount >= 2) return; // already warned twice, done

      const target = parseFloat(alert.target_price);
      const isZone = alert.condition === 'zone';
      const isTap  = alert.condition === 'tap';

      let refPrice = target;
      if (isZone) {
        // For zones, warn when price is within 2% of either boundary
        const zoneLow  = parseFloat(alert.zone_low  || '0');
        const zoneHigh = parseFloat(alert.zone_high || '0');
        const nearLow  = Math.abs(current - zoneLow)  / zoneLow  <= PROX_PCT;
        const nearHigh = Math.abs(current - zoneHigh) / zoneHigh <= PROX_PCT;
        if (!nearLow && !nearHigh) return;
        refPrice = nearLow ? zoneLow : zoneHigh;
      } else {
        const dist = Math.abs(current - target) / target;
        if (dist > PROX_PCT || dist < 0.001) return; // not close, or already there
      }

      // Don't fire if the alert itself would already be triggered
      const alreadyTriggered =
        (alert.condition === 'above' && current >= target) ||
        (alert.condition === 'below' && current <= target) ||
        (isTap && Math.abs(current - target) / target <= parseFloat(alert.tap_tolerance || '0.2') / 100);
      if (alreadyTriggered) return;

      const distPct = (Math.abs(current - refPrice) / refPrice * 100).toFixed(2);
      const prefs   = prefsMap[alert.user_id];
      const chatId  = prefs?.telegram_chat_id;
      const tgOn    = prefs?.telegram_enabled;
      const tz      = prefs?.timezone || 'UTC';

      // Update warn count in DB
      await supabase.from('alerts')
        .update({ proximity_warn_count: warnCount + 1 })
        .eq('id', alert.id);

      if (tgOn && chatId) {
        const timeStr = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZone: tz });
        const warnNum = warnCount + 1;

        const condLabel = isZone ? `zone boundary ${fmt(refPrice, alert.asset_id)}` :
                          isTap  ? `tap level ${fmt(target, alert.asset_id)}` :
                          alert.condition === 'above' ? `target ${fmt(target, alert.asset_id)}` :
                          `target ${fmt(target, alert.asset_id)}`;

        const msg = [
          `👀 <b>HEADS UP — ${alert.symbol}</b>`,
          ``,
          `Price is approaching your ${condLabel}`,
          ``,
          tgRow('Current price', `<b>${fmt(current, alert.asset_id)}</b>`),
          tgRow('Distance',      `<b>${distPct}% away</b>`),
          alert.timeframe ? tgRow('Timeframe', `<b>${alert.timeframe}</b>`) : null,
          alert.note ? tgRow('Note', `<i>${alert.note}</i>`) : null,
          ``,
          `⏰ ${timeStr}`,
          ``,
          warnNum < 2
            ? `<i>You'll get one more reminder if price keeps approaching.</i>`
            : `<i>Final reminder — next message will be your alert trigger.</i>`,
          `<a href="https://t.me/tradewatchalert_bot/assistant">Open TradeWatch →</a>`,
        ].filter(Boolean).join('\n');

        await sendTelegram(chatId, msg);
        console.log(`Proximity warning ${warnNum}/2 sent for ${alert.symbol} (${alert.condition})`);
      }
    }));

    console.log(`Done. ${triggered} triggered in ${Date.now()-t0}ms`);
    return new Response(JSON.stringify({ ok:true, checked:alerts.length, triggered, elapsed:Date.now()-t0 }), { headers:{'Content-Type':'application/json'} });

  } catch(err) {
    console.error('Edge Function error:', err);
    return new Response(JSON.stringify({ ok:false, error:String(err) }), { status:500, headers:{'Content-Type':'application/json'} });
  }
});
