// altradia — Telegram Proxy Worker
// Deploy on Cloudflare Workers (free tier)
//
// Environment variables to set (Settings → Variables):
//   TELEGRAM_TOKEN       = alert bot token from @BotFather (@tradewatchalert_bot)
//   ALLOWED_ORIGIN       = your app URL e.g. https://altradia.app (or * to allow any)
//   SUPPORT_BOT_TOKEN    = support bot token (@altradia_support_bot) — for /support-webhook
//   ANTHROPIC_API_KEY    = Anthropic Claude API key — for /support-webhook
//   ADMIN_CHAT_ID        = your personal Telegram chat_id — escalation target
//   SUPPORT_WEBHOOK_SECRET = (optional) Telegram secret_token for webhook validation
//   SUPABASE_URL         = your Supabase project URL — for support history
//   SUPABASE_SERVICE_KEY = Supabase service_role key — for support history writes
//
// Routes:
//   POST /                — send a Telegram text message (alerts, notifications)
//   POST /export          — send a journal file (CSV or HTML) via sendDocument
//   GET  /yahoo-chart     — proxy Yahoo Finance OHLC (stocks, ADRs)
//   POST /support-webhook — Telegram webhook handler for @altradia_support_bot

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const url           = new URL(request.url);

    // ── CORS preflight ───────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin':  allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Bot-Api-Secret-Token',
        },
      });
    }

    // ── Route: GET /yahoo-chart — public proxy for Yahoo Finance OHLC ────
    // No origin check here because the Mini App needs to call this from
    // the browser, and chart data is non-sensitive public market data.
    if (url.pathname === '/yahoo-chart' && request.method === 'GET') {
      return handleYahooChart(request, allowedOrigin);
    }

    // ── Route: /support-webhook — Telegram bot webhook (POST) + health ping (GET)
    // This is called BY Telegram, not by the app, so no Origin check.
    // Telegram's secret_token header is the auth boundary instead.
    if (url.pathname === '/support-webhook') {
      return handleSupportWebhook(request, env);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, allowedOrigin);
    }

    // ── Origin check ─────────────────────────────────────────────────────
    const origin = request.headers.get('Origin') || '';
    if (allowedOrigin !== '*' && origin !== allowedOrigin) {
      return json({ error: 'Forbidden' }, 403, allowedOrigin);
    }

    if (!env.TELEGRAM_TOKEN) {
      return json({ error: 'TELEGRAM_TOKEN not set in Worker environment' }, 500, allowedOrigin);
    }

    // ── Route: POST /export — send journal file via sendDocument ─────────
    if (url.pathname === '/export') {
      return handleExport(request, env, allowedOrigin);
    }

    // ── Route: POST / — send a Telegram text message ─────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400, allowedOrigin);
    }

    const { message, chat_id } = body;

    if (!message || typeof message !== 'string') {
      return json({ error: 'Missing message' }, 400, allowedOrigin);
    }
    if (!chat_id) {
      return json({ error: 'Missing chat_id' }, 400, allowedOrigin);
    }

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          chat_id,
          text:       message,
          parse_mode: 'HTML',
        }),
      }
    );

    const result = await telegramRes.json();

    if (!telegramRes.ok) {
      return json(
        { error: result.description || 'Telegram API error', result },
        500,
        allowedOrigin
      );
    }

    return json({ ok: true, result }, 200, allowedOrigin);
  },
};

// ── Export handler ────────────────────────────────────────────────────────
async function handleExport(request, env, allowedOrigin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, allowedOrigin);
  }

  const { chat_id, fmt, entries } = body;

  if (!chat_id) {
    return json({ error: 'Missing chat_id' }, 400, allowedOrigin);
  }
  if (!entries?.length) {
    return json({ error: 'No entries provided' }, 400, allowedOrigin);
  }

  const isCsv   = fmt !== 'pdf';
  const filename = `altradia-journal-${new Date().toISOString().slice(0, 10)}.${isCsv ? 'csv' : 'html'}`;

  const fileContent = isCsv ? buildCSV(entries) : buildPDFHtml(entries);
  const fileBytes   = new TextEncoder().encode(fileContent);

  const totalTrades = entries.length;
  const wins = entries.filter(e =>
    ['full_tp', 'tp2_hit', 'tp1_hit', 'breakeven', 'trail_stop'].includes(e.outcome)
  ).length;
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

  const caption = [
    `📊 <b>altradia Journal Export</b>`,
    ``,
    `<code>Trades    ${String(totalTrades).padStart(8)}</code>`,
    `<code>Wins      ${String(wins).padStart(8)}</code>`,
    `<code>Win Rate  ${String(winRate + '%').padStart(8)}</code>`,
    ``,
    `<i>Save the file to view your full journal.</i>`,
  ].join('\n');

  const form = new FormData();
  form.append('chat_id',    String(chat_id));
  form.append('caption',    caption);
  form.append('parse_mode', 'HTML');
  form.append(
    'document',
    new Blob([fileBytes], { type: isCsv ? 'text/csv' : 'text/html' }),
    filename
  );

  const tgRes  = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendDocument`,
    { method: 'POST', body: form }
  );
  const tgData = await tgRes.json();

  if (!tgData.ok) {
    console.error('Telegram sendDocument error:', tgData);
    return json(
      { ok: false, error: tgData.description || 'Telegram API error' },
      500,
      allowedOrigin
    );
  }

  return json({ ok: true }, 200, allowedOrigin);
}

// ── CSV builder ───────────────────────────────────────────────────────────
function buildCSV(entries) {
  const headers = [
    'Date', 'Symbol', 'Direction', 'Outcome', 'Entry', 'Exit',
    'SL', 'TP1', 'TP2', 'TP3', 'P&L %', 'Timeframe', 'Setup Type',
    'Entry Reason', 'HTF Context', 'Emotion Before', 'Emotion After', 'Lessons',
  ];

  const rows = entries.map(e => [
    new Date(e.trade_date || e.created_at).toLocaleDateString(),
    e.symbol         || '',
    e.direction      || '',
    e.outcome        || '',
    e.entry_price    || '',
    e.exit_price     || '',
    e.sl_price       || '',
    e.tp1_price      || '',
    e.tp2_price      || '',
    e.tp3_price      || '',
    e.pnl_pct != null ? e.pnl_pct : '',
    e.timeframe      || '',
    e.setup_type     || '',
    (e.entry_reason  || '').replace(/"/g, '""'),
    (e.htf_context   || '').replace(/"/g, '""'),
    e.emotion_before || '',
    e.emotion_after  || '',
    (e.lessons       || '').replace(/"/g, '""'),
  ].map(v => `"${v}"`).join(','));

  return [headers.join(','), ...rows].join('\n');
}

// ── HTML export builder ───────────────────────────────────────────────────
function buildPDFHtml(entries) {
  const totalTrades = entries.length;
  const wins = entries.filter(e =>
    ['full_tp', 'tp2_hit', 'tp1_hit', 'breakeven', 'trail_stop'].includes(e.outcome)
  ).length;
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

  const rows = entries.map(e => {
    const date     = new Date(e.trade_date || e.created_at).toLocaleDateString();
    const outcome  = (e.outcome || '').replace(/_/g, ' ').toUpperCase();
    const pnl      = e.pnl_pct != null
      ? `${e.pnl_pct >= 0 ? '+' : ''}${e.pnl_pct}%`
      : '—';
    const isWin    = ['FULL TP', 'TP2 HIT', 'TP1 HIT', 'BREAKEVEN', 'TRAIL STOP']
      .some(o => outcome.startsWith(o.split(' ')[0]));
    const oColor   = isWin ? '#00e676' : outcome.includes('SL') ? '#ff3d5a' : '#b0b8c8';
    const dirColor = (e.direction || '').toLowerCase() === 'long' ? '#00e676' : '#ff3d5a';
    const pnlColor = e.pnl_pct != null && e.pnl_pct >= 0 ? '#00e676' : '#ff3d5a';

    return `<tr>
      <td>${date}</td>
      <td><strong>${e.symbol || '—'}</strong></td>
      <td style="color:${dirColor}">${(e.direction || '').toUpperCase()}</td>
      <td style="color:${oColor};font-weight:700">${outcome || '—'}</td>
      <td>${e.entry_price || '—'}</td>
      <td>${e.exit_price  || '—'}</td>
      <td>${e.sl_price    || '—'}</td>
      <td style="color:${pnlColor};font-weight:700">${pnl}</td>
      <td>${e.setup_type  || '—'}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font-family:-apple-system,Arial,sans-serif; background:#080c12; color:#e8f4f8; margin:0; padding:16px; }
    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid #1a2d45; padding-bottom:14px; }
    .logo { font-size:1.3rem; font-weight:800; }
    .logo .alt { color:#025a91; } .logo .radia { color:#115c28; }
    .stats { display:flex; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
    .stat { background:#0d1520; border:1px solid #1a2d45; border-radius:8px; padding:10px 16px; text-align:center; min-width:76px; }
    .stat-val { font-size:1.1rem; font-weight:700; color:#00d4ff; font-family:monospace; }
    .stat-lbl { font-size:0.58rem; color:#4a6a80; text-transform:uppercase; letter-spacing:0.1em; margin-top:2px; }
    table { width:100%; border-collapse:collapse; font-size:0.75rem; }
    th { font-size:0.55rem; letter-spacing:0.1em; color:#4a6a80; text-transform:uppercase; padding:7px 8px; border-bottom:1px solid #1a2d45; text-align:left; }
    td { padding:8px; border-bottom:1px solid rgba(26,45,69,0.5); }
    tr:nth-child(even) td { background:rgba(13,21,32,0.4); }
    .footer { margin-top:20px; font-size:0.6rem; color:#4a6a80; text-align:center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><span class="alt">alt</span><span class="radia">radia</span></div>
    <div style="font-size:0.65rem;color:#4a6a80">Export · ${new Date().toLocaleDateString()}</div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-val">${totalTrades}</div><div class="stat-lbl">Trades</div></div>
    <div class="stat"><div class="stat-val">${wins}</div><div class="stat-lbl">Wins</div></div>
    <div class="stat">
      <div class="stat-val" style="color:${winRate >= 50 ? '#00e676' : '#ff3d5a'}">${winRate}%</div>
      <div class="stat-lbl">Win Rate</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Symbol</th><th>Dir</th><th>Outcome</th>
        <th>Entry</th><th>Exit</th><th>SL</th><th>P&amp;L</th><th>Setup</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Generated by altradia · ${new Date().toUTCString()}</div>
</body>
</html>`;
}


// ══════════════════════════════════════════════════════════════════════════
// YAHOO FINANCE CHART PROXY
// Yahoo's chart endpoint is the simplest free source of US stock OHLC data
// (AAPL, NVDA, plus all major foreign-company ADRs like NVO, BABA, SAP).
// It enforces CORS though, so the browser can't call it directly. We act
// as a server-side proxy: receive the symbol+interval+range, fetch from
// Yahoo, transform the response into our standard candle shape, return.
// ══════════════════════════════════════════════════════════════════════════
async function handleYahooChart(request, allowedOrigin) {
  const u        = new URL(request.url);
  const symbol   = u.searchParams.get('symbol');
  const interval = u.searchParams.get('interval') || '1d';
  const range    = u.searchParams.get('range')    || '1y';

  if (!symbol || !/^[A-Z0-9.\-]{1,12}$/i.test(symbol)) {
    return json({ ok: false, error: 'Bad symbol' }, 400, allowedOrigin);
  }
  // Whitelist intervals/ranges to prevent open-redirect / SSRF abuse.
  const validIntervals = ['1m','2m','5m','15m','30m','60m','90m','1h','1d','5d','1wk','1mo','3mo'];
  const validRanges    = ['1d','5d','1mo','3mo','6mo','1y','2y','5y','10y','ytd','max'];
  if (!validIntervals.includes(interval) || !validRanges.includes(range)) {
    return json({ ok: false, error: 'Bad interval or range' }, 400, allowedOrigin);
  }

  // ── Worker-level cache: keyed by the upper-cased symbol + interval + range
  // so case variants don't fragment the cache. We use a synthetic URL as the
  // cache key (must be a same-origin URL string per Cache API spec). The TTL
  // applies via the Cache-Control header on the cached Response — Cloudflare
  // honours that for cache.put() / cache.match().
  const cache    = caches.default;
  const cacheKey = new Request(
    `https://altradia-cache.invalid/yahoo-chart?` +
    `s=${encodeURIComponent(symbol.toUpperCase())}&i=${interval}&r=${range}`,
    { method: 'GET' }
  );

  // Try the Worker cache first. A hit returns immediately — no Yahoo call,
  // no candle-processing, just a quick edge response. We MUST clone before
  // returning so the cached body remains intact for future requests.
  const cached = await cache.match(cacheKey);
  if (cached) {
    // Re-emit with the caller's CORS header — the cached response was
    // generated for whatever Origin sent the first request, but we want
    // the same payload to work for any allowed Origin.
    const body = await cached.text();
    return new Response(body, {
      status:  cached.status,
      headers: {
        'Content-Type':                 'application/json',
        'Access-Control-Allow-Origin':  allowedOrigin,
        'X-Altradia-Cache':             'HIT',
      },
    });
  }

  const yahooUrl =
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${interval}&range=${range}&includePrePost=false`;

  try {
    // Yahoo blocks default fetch UAs — provide a real-browser one.
    const yRes = await fetch(yahooUrl, {
      headers: {
        'User-Agent':       'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
                            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                            'Chrome/121.0.0.0 Safari/537.36',
        'Accept':           'application/json',
        'Accept-Language':  'en-US,en;q=0.9',
      },
      cf: { cacheTtl: 60, cacheEverything: true },
    });
    if (!yRes.ok) {
      return json({ ok: false, error: `Yahoo HTTP ${yRes.status}` }, 502, allowedOrigin);
    }
    const data = await yRes.json();
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      return json({ ok: false, error: 'Empty response' }, 502, allowedOrigin);
    }
    const ts    = result.timestamp;
    const q     = result.indicators.quote[0];
    const opens = q.open  || [];
    const highs = q.high  || [];
    const lows  = q.low   || [];
    const closes= q.close || [];

    // Yahoo emits `null` for missing-data candles (illiquid intraday slots).
    // Drop those entirely — LightweightCharts can't render null OHLC.
    const candles = [];
    for (let i = 0; i < ts.length; i++) {
      const o = opens[i], h = highs[i], l = lows[i], c = closes[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({ time: ts[i], open: o, high: h, low: l, close: c });
    }

    const payload = JSON.stringify({ ok: true, candles, symbol, interval, range });

    // Store in the edge cache for 60s. The Cache API requires a
    // Cache-Control header to honour the TTL; without it the response
    // wouldn't be cached at all. We don't gate on caller Origin in the
    // cached response — the cache hit branch above re-emits with the
    // current request's allowed origin instead.
    const cacheableRes = new Response(payload, {
      status:  200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
    // Fire-and-forget the cache write — don't block the user's response on it.
    // (Workers automatically allow waitUntil-style work after the response,
    // but cache.put returns a Promise we can simply not await.)
    cache.put(cacheKey, cacheableRes.clone()).catch(() => {});

    return new Response(payload, {
      status:  200,
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'X-Altradia-Cache':            'MISS',
      },
    });
  } catch (e) {
    return json({ ok: false, error: e.message || String(e) }, 500, allowedOrigin);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// CLAUDE-POWERED SUPPORT BOT WEBHOOK
// Routes incoming messages from @altradia_support_bot through Claude Haiku
// 4.5 with an altradia-specific system prompt. Claude responds in JSON so
// we can branch on `escalate` to forward unresolved tickets to admin.
// ══════════════════════════════════════════════════════════════════════════

// Altradia-specific system prompt. Edit this block to update what Claude
// knows about your product, plans, behaviour, and escalation rules.
const SUPPORT_SYSTEM_PROMPT = `You are altradia's customer support assistant.
You help traders using the altradia Telegram Mini App, which provides real-time
trading alerts, a trade journal, currency strength meter, broker sync, and
analytics.

ABOUT ALTRADIA:
- Telegram Mini App accessed via @tradewatchalert_bot
- Asset coverage: forex, metals, indices, commodities, US stocks (incl. ADRs), crypto
- Three tiers planned: Free, Pro ($4.99/mo), Elite ($9/mo)
- Free: basic alerts, watchlist, chart access, limited journal entries
- Pro: unlimited alerts, full journal, CSV export, currency strength meter, broker sync
- Elite: all Pro features + AI insights, economic briefings, breakout signals, advanced analytics
- IMPORTANT — current state: payments are temporarily disabled while we
  finalize the launch. EVERY user currently has full Elite-tier access at
  no charge. If a user asks about pricing, plans, or paying, tell them
  the app is currently free for everyone and that billing will resume
  later with a 7-day free trial when it launches. Do NOT direct anyone
  to a payment page.
- Payments will use Paddle (card) and NOWPayments (crypto) when active

COMMON ISSUES:
- Alerts not firing: Check that the asset is in the watchlist, the alert is active
  (not paused/triggered), and conditions are correctly set
- Can't export journal: Export is delivered via the bot — file appears in chat with
  @tradewatchalert_bot. CSV/HTML formats supported
- Stock chart empty: We use Yahoo Finance for stock data, occasionally rate-limited.
  Suggest pulling-to-refresh or trying a different timeframe
- Currency strength stuck: User can pick timeframe (15M / 1H / 4H / 1D / 1W) above
  the strength bars
- Pull-to-refresh on chart: PTR is intentionally disabled over the chart canvas to
  avoid conflicts with chart pan/pinch — pull from below the chart instead
- Upgrade not reflecting: Can take up to 5 minutes; suggest closing and reopening
  the app
- Refunds: 7-day free trial covers most cases; escalate if user wants a refund on a
  paid period

YOUR BEHAVIOR:
- Be concise, friendly, and use plain language. Most users aren't engineers
- If you cannot resolve confidently, escalate (set escalate: true)
- NEVER guess about billing, account-specific data, or payment status
- NEVER tell the user about Anthropic, Claude, or that you are an AI — you are
  "altradia's support assistant"
- Respond in the language the user wrote in, when possible
- Keep responses under 4 short paragraphs unless the user asked for detail
- If the user types /human, escalate immediately with category "other"

RESPONSE FORMAT (strict JSON, no markdown fences):
{
  "message": "your reply to the user, plain text or simple HTML <b>bold</b> <i>italic</i>",
  "escalate": true | false,
  "category": "billing" | "technical" | "feature" | "account" | "other"
}`;

async function handleSupportWebhook(request, env) {
  // Health-check: GET /support-webhook?ping=1 returns a small status JSON
  // without requiring the secret token. Useful for confirming the worker
  // is alive + has the env vars it needs, without sending a real Telegram
  // message to do it.
  if (request.method === 'GET') {
    try {
      const url   = new URL(request.url);
      if (url.searchParams.get('ping') === '1') {
        return new Response(JSON.stringify({
          ok:                 true,
          worker:             'altradia-support',
          has_support_token:  !!env.SUPPORT_BOT_TOKEN,
          has_claude_key:     !!env.ANTHROPIC_API_KEY,
          has_admin_chat:     !!env.ADMIN_CHAT_ID,
          has_webhook_secret: !!env.SUPPORT_WEBHOOK_SECRET,
          has_supabase:       !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY),
          time:               new Date().toISOString(),
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    } catch (_) { /* fall through */ }
    return new Response('Method not allowed', { status: 405 });
  }

  // Optional secret_token validation. Set SUPPORT_WEBHOOK_SECRET in Worker
  // env AND pass the same value to Telegram's setWebhook call.
  if (env.SUPPORT_WEBHOOK_SECRET) {
    const got = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (got !== env.SUPPORT_WEBHOOK_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  if (!env.SUPPORT_BOT_TOKEN) {
    return new Response('Missing SUPPORT_BOT_TOKEN', { status: 500 });
  }
  if (!env.ANTHROPIC_API_KEY) {
    return new Response('Missing ANTHROPIC_API_KEY', { status: 500 });
  }

  let update;
  try { update = await request.json(); }
  catch { return new Response('Bad JSON', { status: 400 }); }

  const msg     = update.message || update.edited_message;
  if (!msg || !msg.text || !msg.chat?.id) {
    // Ignore non-message updates (joins, leaves, callback queries, etc.)
    return new Response('OK', { status: 200 });
  }

  const chatId   = msg.chat.id;
  const userText = (msg.text || '').trim();
  const username = msg.from?.username ? '@' + msg.from.username : (msg.from?.first_name || 'user');

  // ── Admin reply path ──────────────────────────────────────────────────
  // /r <chatId> <message text> — only honored when sent from ADMIN_CHAT_ID
  // (your own chat). Forwards the message to the target user via the
  // support bot. Lets the admin answer escalated tickets without leaving
  // the support-bot chat. Stores the response in support_history so
  // Claude has context if the conversation continues.
  if (env.ADMIN_CHAT_ID && String(chatId) === String(env.ADMIN_CHAT_ID) && /^\/r\b/.test(userText)) {
    // Parse: "/r 1234567 your message here"
    const m = userText.match(/^\/r\s+(\d+)\s+([\s\S]+)$/);
    if (!m) {
      await sendSupportMessage(env, chatId,
        `Usage: <code>/r &lt;chatId&gt; &lt;message&gt;</code>\n` +
        `Example: <code>/r 1139777394 Fixed — your alert should fire now.</code>`
      );
      return new Response('OK', { status: 200 });
    }
    const targetChatId = m[1];
    const adminReply   = m[2].trim();

    // Send to the user
    const prefix = `<b>👤 altradia support:</b>\n\n`;
    const ok = await sendSupportMessage(env, targetChatId, prefix + adminReply);

    // Confirm back to admin
    if (ok) {
      await sendSupportMessage(env, chatId,
        `✅ Sent to <code>${targetChatId}</code>:\n<i>${escapeHtml(adminReply.slice(0, 200))}</i>`
      );
      // Persist so Claude has context next time the user writes in.
      await saveSupportTurn(env, targetChatId, '(admin replied)', adminReply, 'other', false);
    } else {
      await sendSupportMessage(env, chatId,
        `❌ Couldn't deliver to <code>${targetChatId}</code>. The user may have blocked the bot, or the chatId is wrong.`
      );
    }
    return new Response('OK', { status: 200 });
  }

  // ── Hard-coded commands (faster + more deterministic than Claude) ──────
  if (/^\/start\b/.test(userText) || /^\/help\b/.test(userText)) {
    await sendSupportMessage(env, chatId,
      `👋 <b>Hi, I'm altradia's support assistant.</b>\n\n` +
      `Ask me anything about altradia — alerts, the journal, billing, ` +
      `or how features work. I'm available 24/7.\n\n` +
      `If you'd rather talk to a human, send /human at any time.`
    );
    return new Response('OK', { status: 200 });
  }

  if (/^\/human\b/.test(userText)) {
    await sendSupportMessage(env, chatId,
      `🙋 Connecting you to the altradia team. They'll respond within 24 hours.\n\n` +
      `You can also email <code>support@altradia.app</code> if you prefer.`
    );
    await escalateToAdmin(env, {
      chatId, username, userText: '(user requested /human)',
      reply: '(no Claude response — direct escalation)',
      category: 'other',
    });
    return new Response('OK', { status: 200 });
  }

  // ── Anything else: send through Claude ────────────────────────────────
  // Pull last ~10 turns of conversation history from Supabase so Claude
  // has context. If Supabase isn't configured, skip and treat each
  // message as a one-shot.
  const history  = await loadSupportHistory(env, chatId, 10);
  const messages = [
    ...history,
    { role: 'user', content: userText },
  ];

  let claudeData;
  try {
    const cRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5',
        max_tokens: 600,
        system:     SUPPORT_SYSTEM_PROMPT,
        messages,
      }),
    });
    claudeData = await cRes.json();
    if (!cRes.ok) {
      console.error('Claude API error:', cRes.status, claudeData);
      await sendSupportMessage(env, chatId,
        `Sorry, I'm having trouble right now. Please try again in a moment, ` +
        `or send /human to reach the team directly.`
      );
      return new Response('OK', { status: 200 });
    }
  } catch (e) {
    console.error('Claude fetch failed:', e);
    await sendSupportMessage(env, chatId,
      `Sorry, I couldn't reach my brain just now. Try again in a minute, ` +
      `or send /human to reach the team.`
    );
    return new Response('OK', { status: 200 });
  }

  // Extract & parse Claude's JSON response.
  const rawText = claudeData?.content?.[0]?.text || '';
  let parsed;
  try {
    // Strip any accidental markdown fences before parsing.
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // Claude went off-format. Fall back to using its raw text as the reply
    // and don't escalate — better than crashing.
    parsed = { message: rawText || 'Sorry, I lost track. Could you rephrase?', escalate: false, category: 'other' };
  }

  const reply = String(parsed.message || '').trim() || 'Sorry, I had no answer for that.';
  const escalate = !!parsed.escalate;
  const category = String(parsed.category || 'other').toLowerCase();

  // Send Claude's reply to the user
  await sendSupportMessage(env, chatId, reply);

  // Persist this turn for context on future messages
  await saveSupportTurn(env, chatId, userText, reply, category, escalate);

  // Escalate if needed
  if (escalate) {
    await escalateToAdmin(env, { chatId, username, userText, reply, category });
  }

  return new Response('OK', { status: 200 });
}

// ── Helper: send message via the SUPPORT bot (not the alert bot) ──────────
async function sendSupportMessage(env, chatId, html) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.SUPPORT_BOT_TOKEN}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:    chatId,
        text:       html,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('sendSupportMessage non-OK', res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error('sendSupportMessage failed:', e);
    return false;
  }
}

// ── Helper: escalate to admin chat ────────────────────────────────────────
async function escalateToAdmin(env, { chatId, username, userText, reply, category }) {
  if (!env.ADMIN_CHAT_ID) {
    console.warn('ADMIN_CHAT_ID not set — escalation skipped');
    return;
  }
  const ticketId = 'AT-' + Math.floor(Math.random() * 9000 + 1000);
  const adminMsg = [
    `🚨 <b>Support Escalation #${ticketId}</b>`,
    ``,
    `<b>User:</b> ${username} (chat: <code>${chatId}</code>)`,
    `<b>Category:</b> ${category}`,
    ``,
    `<b>Issue:</b>`,
    `<code>${escapeHtml(userText)}</code>`,
    ``,
    `<b>Bot's response:</b>`,
    `<code>${escapeHtml(reply.slice(0, 800))}</code>`,
    ``,
    `Reply with <code>/r ${chatId} your message</code> to respond to the user.`,
  ].join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${env.SUPPORT_BOT_TOKEN}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:    env.ADMIN_CHAT_ID,
        text:       adminMsg,
        parse_mode: 'HTML',
      }),
    });
  } catch (e) { console.error('escalateToAdmin failed:', e); }

  // Also log the ticket to Supabase if configured
  await logSupportTicket(env, { ticketId, chatId, username, userText, category, reply });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Supabase helpers (optional — silently no-op if env not set) ───────────
async function loadSupportHistory(env, chatId, limit) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return [];
  try {
    const url = `${env.SUPABASE_URL}/rest/v1/support_history` +
      `?chat_id=eq.${chatId}&order=created_at.desc&limit=${limit * 2}` +
      `&select=role,content`;
    const res = await fetch(url, {
      headers: {
        'apikey':         env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
    });
    if (!res.ok) return [];
    const rows = await res.json();
    // Reverse to chronological + map to {role, content} for Claude
    return rows.reverse().map(r => ({ role: r.role, content: r.content }));
  } catch (e) { console.warn('loadSupportHistory:', e); return []; }
}

async function saveSupportTurn(env, chatId, userMsg, botReply, category, escalated) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return;
  try {
    const rows = [
      { chat_id: chatId, role: 'user',      content: userMsg,  category, escalated: false },
      { chat_id: chatId, role: 'assistant', content: botReply, category, escalated },
    ];
    await fetch(`${env.SUPABASE_URL}/rest/v1/support_history`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(rows),
    });
  } catch (e) { console.warn('saveSupportTurn:', e); }
}

async function logSupportTicket(env, { ticketId, chatId, username, userText, category, reply }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/support_tickets`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        ticket_id:  ticketId,
        chat_id:    chatId,
        username,
        user_text:  userText,
        bot_reply:  reply,
        category,
        escalated:  true,
        resolved:   false,
      }),
    });
  } catch (e) { console.warn('logSupportTicket:', e); }
}

// ── Shared JSON response helper ────────────────────────────────────────────
function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type':               'application/json',
      'Access-Control-Allow-Origin': origin,
    },
  });
}
