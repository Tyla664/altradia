/**
 * Altradia Support Bot
 * Bot username: @altradia_support_bot
 *
 * Deploy on any Node.js server:
 *   npm install node-telegram-bot-api
 *   node altradia-support-bot.js
 *
 * Deep link format from the app:
 *   https://t.me/altradia_support_bot?start=TELEGRAM_USER_ID
 *
 * The ?start= parameter lets the bot identify who is coming in
 * so support can look up their alerts, journal, and broker status.
 */

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// ── User context store (in-memory; replace with DB in production) ──────────────
const userContexts = {}; // { chatId: { altradiaUserId, firstName } }

// ── START — captures user context from deep link ──────────────────────────────
bot.onText(/\/start(?:\s+(\S+))?/, (msg, match) => {
  const chatId          = msg.chat.id;
  const firstName       = msg.from?.first_name || 'there';
  const altradiaUserId  = match?.[1] || null; // the ?start=USER_ID parameter

  // Store context for this session
  userContexts[chatId] = { altradiaUserId, firstName };

  const contextNote = altradiaUserId
    ? `\n\n_(Your Altradia account has been identified — we can look up your alerts and trade history.)_`
    : '';

  bot.sendMessage(chatId,
    `👋 Hi ${firstName}, welcome to *Altradia Support*!${contextNote}\n\n` +
    `I can help you with:\n` +
    `/faq — Quick answers\n` +
    `/alerts — How alerts work\n` +
    `/journal — Trade journaling\n` +
    `/brokers — Broker integrations\n` +
    `/newsalerts — Economic event warnings\n` +
    `/terms — Terms of Use\n` +
    `/privacy — Privacy Policy\n` +
    `/cookies — Cookies Policy\n` +
    `/status — Check your connection status\n` +
    `/feedback — Send feedback\n` +
    `/agent — Talk to a live agent\n\n` +
    `Type any command or describe your issue.`,
    { parse_mode: 'Markdown' }
  );
});

// ── HELP ──────────────────────────────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Altradia Support Commands:*\n\n` +
    `/alerts — How alerts work\n` +
    `/journal — Trade journaling help\n` +
    `/brokers — Broker integration info\n` +
    `/newsalerts — Economic event warnings\n` +
    `/faq — Frequently asked questions\n` +
    `/terms — Terms of Use\n` +
    `/privacy — Privacy Policy\n` +
    `/cookies — Cookies & Tracking Policy\n` +
    `/consent — About your data consent\n` +
    `/status — Check your account/broker status\n` +
    `/feedback — Send feedback or report a bug\n` +
    `/agent — Connect with a live support agent`,
    { parse_mode: 'Markdown' }
  );
});

// ── FAQ ───────────────────────────────────────────────────────────────────────
bot.onText(/\/faq/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Quick FAQs:*\n\n` +
    `• /alerts — How price alerts work\n` +
    `• /journal — How to log trades\n` +
    `• /brokers — Supported broker integrations\n` +
    `• /newsalerts — Economic event warnings\n\n` +
    `Need more help? Type /agent to connect with support.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/alerts/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Price Alerts* 🔔\n\n` +
    `Altradia monitors prices in real-time and notifies you when:\n` +
    `• A price rises above or falls below your target\n` +
    `• Price enters a zone you defined\n` +
    `• A trade setup's entry, SL, or TP is hit\n\n` +
    `You can log triggered trade alerts directly into your journal with one tap.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/journal/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Trade Journal* 📓\n\n` +
    `Tap "Log Trade" on any alert card to save it to your journal. You can:\n` +
    `• Add entry/exit prices, SL/TP levels\n` +
    `• Record your emotions and notes\n` +
    `• Attach before/after screenshots\n` +
    `• Export all entries to CSV\n\n` +
    `Your journal helps you track your performance and improve your strategy.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/brokers/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Broker Integrations* 🔗\n\n` +
    `Altradia currently supports:\n` +
    `• *OANDA* — Forex & CFD trading\n` +
    `• *Deriv* — Forex, synthetics & indices\n\n` +
    `Your API keys are encrypted and only used for reading market data. Altradia never places trades on your behalf.\n\n` +
    `Broker Sync (auto-import of trades) is coming soon.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/newsalerts/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Economic News Warnings* 📰\n\n` +
    `Altradia can issue warnings for high-impact economic events such as:\n` +
    `• US Non-Farm Payrolls (NFP)\n` +
    `• Consumer Price Index (CPI)\n` +
    `• Central bank rate decisions\n\n` +
    `These warnings are based on publicly available data. Altradia does not guarantee accuracy or timeliness.`,
    { parse_mode: 'Markdown' }
  );
});

// ── LEGAL POLICIES ────────────────────────────────────────────────────────────
bot.onText(/\/terms/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Terms of Use* 📋\n\n` +
    `Altradia's Terms of Use cover:\n` +
    `• Eligibility (18+ only)\n` +
    `• Account responsibilities\n` +
    `• Broker integration rules\n` +
    `• Alerts as informational only (not financial advice)\n` +
    `• Intellectual property\n` +
    `• Limitation of liability\n\n` +
    `View the full Terms inside the app: Menu → About → Terms of Use.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/privacy/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Privacy Policy* 🔒\n\n` +
    `We collect and use your data to:\n` +
    `• Deliver alerts and journaling features\n` +
    `• Maintain secure broker integrations\n` +
    `• Improve app performance\n\n` +
    `We do not sell your data. You can request deletion at any time.\n\n` +
    `View the full policy inside the app: Menu → About → Privacy Policy.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/cookies/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Cookies & Tracking Policy* 🍪\n\n` +
    `Altradia uses local storage to:\n` +
    `• Keep you logged in\n` +
    `• Save your alert settings and preferences\n` +
    `• Cache trade data for performance\n\n` +
    `You can clear these by resetting the app in Telegram settings.\n\n` +
    `View full policy inside the app: Menu → About → Cookies Policy.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/consent/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Data Consent* ✅\n\n` +
    `When you first use Altradia, you agree to:\n` +
    `• Terms of Use, Privacy Policy, and Cookies Policy\n` +
    `• Altradia processing your data for alerts and journaling\n` +
    `• Alerts being informational only (not financial advice)\n\n` +
    `You can withdraw consent by discontinuing use or requesting account deletion via /agent.`,
    { parse_mode: 'Markdown' }
  );
});

// ── SUPPORT & ESCALATION ──────────────────────────────────────────────────────
bot.onText(/\/agent/, (msg) => {
  const chatId   = msg.chat.id;
  const ctx      = userContexts[chatId];
  const userId   = ctx?.altradiaUserId ? `User ID: ${ctx.altradiaUserId}` : 'User ID: not identified';
  const name     = ctx?.firstName || 'User';

  bot.sendMessage(chatId,
    `⏳ Connecting you to a live support agent...\n\n` +
    `While you wait, you can describe your issue and we'll have context ready for the agent.`
  );

  // TODO: Forward to your support team group or dashboard
  // Example: bot.forwardMessage(SUPPORT_GROUP_ID, chatId, msg.message_id);
  // Or send an alert: bot.sendMessage(SUPPORT_GROUP_ID, `🆘 Support request from ${name} (${userId})`);
  console.log(`[AGENT REQUEST] ${name} | ${userId} | chat: ${chatId}`);
});

bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const ctx    = userContexts[chatId];
  const userId = ctx?.altradiaUserId;

  if (userId) {
    bot.sendMessage(chatId,
      `🔍 *Status for your Altradia account*\n\n` +
      `Account ID: \`${userId}\`\n\n` +
      `To check your live broker connection and alert system status, open Altradia and go to Menu → Settings.\n\n` +
      `If you're experiencing issues, type /agent to connect with support.`,
      { parse_mode: 'Markdown' }
    );
  } else {
    bot.sendMessage(chatId,
      `To check your status, please open Altradia from the app link so your account can be identified automatically.`,
      { parse_mode: 'Markdown' }
    );
  }
});

bot.onText(/\/feedback/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `💬 *Send Feedback*\n\n` +
    `Please type your feedback, bug report, or feature request in your next message. Our team reads every submission.\n\n` +
    `For urgent issues, use /agent to connect with a live agent.`,
    { parse_mode: 'Markdown' }
  );
});

// ── CATCH-ALL: handle free-text after /feedback ───────────────────────────────
bot.on('message', (msg) => {
  if (msg.text?.startsWith('/')) return; // ignore commands (handled above)
  const chatId = msg.chat.id;
  const ctx    = userContexts[chatId];
  const userId = ctx?.altradiaUserId || 'unknown';

  // Log free-text (in production: forward to support team)
  console.log(`[MSG] User ${userId} (chat ${chatId}): ${msg.text}`);

  bot.sendMessage(chatId,
    `✅ Thanks for reaching out. Your message has been received.\n\n` +
    `Type /help to see available commands, or /agent to speak with a live support agent.`
  );
});

// --- Bot logic above ---

// Tiny HTTP server for Render
const http = require("http");
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running\n");
}).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Keep-alive ping for Render free instance
setInterval(() => {
  http.get("https://altradia-support-bot.onrender.com", (res) => {
    console.log("Keep-alive ping sent, status:", res.statusCode);
  }).on("error", (err) => {
    console.error("Keep-alive ping failed:", err.message);
  });
}, 5 * 60 * 1000); // every 5 minutes 
