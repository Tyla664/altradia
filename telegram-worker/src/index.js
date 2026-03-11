// TradeWatch — Telegram Proxy Worker
// Deploy on Cloudflare Workers (free tier)
//
// Environment variables to set (Settings → Variables):
//   TELEGRAM_TOKEN  = your bot token from @BotFather
//   ALLOWED_ORIGIN  = your app URL e.g. http://127.0.0.1:5500  (or * to allow any)
//
// The chat_id is now sent per-request from the app — no need to set it here.

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, allowedOrigin);
    }

    // Origin check
    const origin = request.headers.get('Origin') || '';
    if (allowedOrigin !== '*' && origin !== allowedOrigin) {
      return json({ error: 'Forbidden' }, 403, allowedOrigin);
    }

    // Parse body
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
    if (!env.TELEGRAM_TOKEN) {
      return json({ error: 'TELEGRAM_TOKEN not set in Worker environment' }, 500, allowedOrigin);
    }

    // Forward to Telegram Bot API
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );

    const result = await telegramRes.json();

    if (!telegramRes.ok) {
      return json({ error: result.description || 'Telegram API error', result }, 500, allowedOrigin);
    }

    return json({ ok: true, result }, 200, allowedOrigin);
  }
};

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
    },
  });
}