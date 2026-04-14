// altradia — Telegram Proxy Worker
// Deploy on Cloudflare Workers (free tier)
//
// Environment variables to set (Settings → Variables):
//   TELEGRAM_TOKEN  = your bot token from @BotFather
//   ALLOWED_ORIGIN  = your app URL e.g. https://altradia.app  (or * to allow any)
//
// Routes:
//   POST /         — send a Telegram text message (alerts, notifications)
//   POST /export   — send a journal file (CSV or HTML) via sendDocument

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const url           = new URL(request.url);

    // ── CORS preflight ───────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin':  allowedOrigin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
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
