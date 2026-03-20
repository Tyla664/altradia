// ═══════════════════════════════════════════════
// TradeWatch — Trade Journal
// Dedicated journal page: log, review, study trades
// Images uploaded to Supabase Storage
// ═══════════════════════════════════════════════

let journalEntries     = [];
let jnlDirection       = 'long';
let jnlBeforeFile      = null;
let jnlAfterFile       = null;
let jnlBeforeUrl       = null;
let jnlAfterUrl        = null;

// ── DB helpers ─────────────────────────────────────────────────────────────
async function loadJournalFromDB() {
  if (!currentUserId) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/trade_journal?user_id=eq.${currentUserId}&order=trade_date.desc`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch(e) { return []; }
}

async function saveJournalToDB(entry) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/trade_journal`, {
      method:  'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation',
      },
      body: JSON.stringify(entry),
    });
    const rows = await res.json();
    return rows?.[0] || null;
  } catch(e) { console.warn('saveJournal failed:', e); return null; }
}

async function deleteJournalEntryFromDB(id) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/trade_journal?id=eq.${id}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    });
  } catch(e) {}
}

// ── Supabase Storage: upload screenshot ────────────────────────────────────
async function uploadScreenshot(file, slot) {
  if (!file || !currentUserId) return null;
  try {
    const ext      = file.name.split('.').pop() || 'jpg';
    const path     = `${currentUserId}/${Date.now()}_${slot}.${ext}`;
    const res      = await fetch(
      `${SUPABASE_URL}/storage/v1/object/trade-screenshots/${path}`,
      {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type':  file.type || 'image/jpeg',
        },
        body: file,
      }
    );
    if (!res.ok) throw new Error('Upload failed');
    return `${SUPABASE_URL}/storage/v1/object/public/trade-screenshots/${path}`;
  } catch(e) {
    console.warn('Screenshot upload failed:', e);
    return null;
  }
}

// ── Preview uploaded image inline before save ──────────────────────────────
function handleScreenshotUpload(slot, input) {
  const file = input.files?.[0];
  if (!file) return;
  const previewId = `jnl-${slot}-preview`;
  const areaId    = `jnl-${slot}-area`;
  const el        = document.getElementById(previewId);
  if (!el) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    el.innerHTML = `<img src="${e.target.result}" class="screenshot-preview-img" alt="screenshot">`;
  };
  reader.readAsDataURL(file);

  if (slot === 'before') jnlBeforeFile = file;
  else                    jnlAfterFile  = file;
}

// ── Journal direction toggle ───────────────────────────────────────────────
function setJnlDir(dir) {
  jnlDirection = dir;
  document.getElementById('jnl-long-btn').classList.toggle('active', dir === 'long');
  document.getElementById('jnl-short-btn').classList.toggle('active', dir === 'short');
}

// ── Open journal modal (standalone or from alert) ─────────────────────────
function openJournalEntryForm(prefill = null) {
  // Reset form
  jnlBeforeFile = null; jnlAfterFile = null;
  jnlBeforeUrl  = null; jnlAfterUrl  = null;
  setJnlDir('long');
  ['jnl-symbol','jnl-entry','jnl-exit','jnl-sl','jnl-tp1','jnl-tp2','jnl-tp3','jnl-pnl','jnl-entry-reason','jnl-htf','jnl-lessons'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['jnl-outcome','jnl-timeframe','jnl-setup-type','jnl-emotion-before','jnl-emotion-after'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  ['jnl-before-preview','jnl-after-preview'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.4" fill="none" opacity="0.4"/><circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.6"/><path d="M3 17l5-5 3 3 3-3 5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.5"/></svg><span>Tap to upload</span>`;
    if (el) el.className = 'screenshot-preview-empty';
  });
  document.getElementById('jnl-alert-id').value = '';

  // Pre-fill from setup alert if provided
  if (prefill) {
    if (prefill.symbol) document.getElementById('jnl-symbol').value = prefill.symbol;
    if (prefill.direction) setJnlDir(prefill.direction);
    if (prefill.entry)  document.getElementById('jnl-entry').value  = prefill.entry;
    if (prefill.sl)     document.getElementById('jnl-sl').value     = prefill.sl;
    if (prefill.tp1)    document.getElementById('jnl-tp1').value    = prefill.tp1;
    if (prefill.tp2)    document.getElementById('jnl-tp2').value    = prefill.tp2 || '';
    if (prefill.tp3)    document.getElementById('jnl-tp3').value    = prefill.tp3 || '';
    if (prefill.alertId) document.getElementById('jnl-alert-id').value = prefill.alertId;
    if (prefill.setupType) {
      const sel = document.getElementById('jnl-setup-type');
      if (sel) sel.value = prefill.setupType;
    }
    if (prefill.entryReason) document.getElementById('jnl-entry-reason').value = prefill.entryReason;
    if (prefill.htfContext)  document.getElementById('jnl-htf').value           = prefill.htfContext;
    if (prefill.emotionBefore) {
      const sel = document.getElementById('jnl-emotion-before');
      if (sel) sel.value = prefill.emotionBefore;
    }
    if (prefill.outcome) {
      const sel = document.getElementById('jnl-outcome');
      if (sel) sel.value = prefill.outcome;
    }
    if (prefill.timeframe) {
      const sel = document.getElementById('jnl-timeframe');
      if (sel) sel.value = prefill.timeframe;
    }
    if (prefill.emotionAfter) {
      const sel = document.getElementById('jnl-emotion-after');
      if (sel) sel.value = prefill.emotionAfter;
    }
    if (prefill.exitPrice) {
      const el = document.getElementById('jnl-exit');
      if (el) el.value = prefill.exitPrice;
    }
    if (prefill.closeReason) {
      // Put close reason in lessons box as a starting note
      const el = document.getElementById('jnl-lessons');
      if (el && !el.value) el.value = `Closed early: ${prefill.closeReason}`;
    }
  }

  document.getElementById('journal-modal').style.display = 'block';
}

function closeJournalModal() {
  document.getElementById('journal-modal').style.display = 'none';
}

// ── Save a journal entry ────────────────────────────────────────────────────
async function saveJournalEntry() {
  const symbol = (document.getElementById('jnl-symbol').value || '').trim().toUpperCase();
  const entry  = parseFloat(document.getElementById('jnl-entry').value);
  if (!symbol) return showToast('Missing Asset', 'Enter an asset symbol.', 'error');

  showToast('Saving…', 'Uploading screenshots and saving entry.', 'info');

  // Upload screenshots to Supabase Storage
  const [beforeUrl, afterUrl] = await Promise.all([
    uploadScreenshot(jnlBeforeFile, 'before'),
    uploadScreenshot(jnlAfterFile,  'after'),
  ]);

  const record = {
    user_id:          currentUserId,
    asset_id:         symbol.toLowerCase().replace('/', '_'),
    symbol,
    direction:        jnlDirection,
    entry_price:      isNaN(entry) ? null : entry,
    exit_price:       parseFloat(document.getElementById('jnl-exit').value) || null,
    sl_price:         parseFloat(document.getElementById('jnl-sl').value)   || null,
    tp1_price:        parseFloat(document.getElementById('jnl-tp1').value)  || null,
    tp2_price:        parseFloat(document.getElementById('jnl-tp2').value)  || null,
    tp3_price:        parseFloat(document.getElementById('jnl-tp3').value)  || null,
    outcome:          document.getElementById('jnl-outcome').value,
    pnl_pct:          parseFloat(document.getElementById('jnl-pnl').value) || null,
    timeframe:        document.getElementById('jnl-timeframe').value || null,
    setup_type:       document.getElementById('jnl-setup-type').value || null,
    entry_reason:     document.getElementById('jnl-entry-reason').value.trim() || null,
    htf_context:      document.getElementById('jnl-htf').value.trim() || null,
    emotion_before:   document.getElementById('jnl-emotion-before').value || null,
    emotion_after:    document.getElementById('jnl-emotion-after').value || null,
    lessons:          document.getElementById('jnl-lessons').value.trim() || null,
    screenshot_before: beforeUrl,
    screenshot_after:  afterUrl,
    trade_date:        new Date().toISOString(),
  };

  const saved = await saveJournalToDB(record);
  if (saved) {
    journalEntries.unshift(saved);
    closeJournalModal();
    renderJournal();
    showToast('Trade Logged', `${symbol} saved to your journal.`, 'success');

    // If linked to a setup alert, dismiss it from active list
    const linkedAlertId = document.getElementById('jnl-alert-id').value;
    if (linkedAlertId) {
      alerts = alerts.filter(a => a.id !== linkedAlertId);
      await deleteAlertFromDB(linkedAlertId);
      renderAlerts();
    }

    // Navigate to journal tab
    if (isMobileLayout()) mobileTab('journal');
  } else {
    showToast('Save Failed', 'Could not save entry. Check your connection.', 'error');
  }
}

// ── Open log form from a completed setup alert ─────────────────────────────
function logTradeFromAlert(alertId) {
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) return;
  let j = {};
  try { j = JSON.parse(alert.note || '{}'); } catch(e) {}

  // Map trade status to outcome
  const outcomeMap = {
    full_tp:  'full_tp',
    tp2_hit:  'tp2_hit',
    tp1_hit:  'tp1_hit',
    sl_hit:   'sl_hit',
    running:  'manual_exit',
    watching: 'manual_exit',
  };

  openJournalEntryForm({
    alertId:       alertId,
    symbol:        alert.symbol,
    direction:     j.direction,
    entry:         alert.targetPrice,
    sl:            j.sl,
    tp1:           j.tp1,
    tp2:           j.tp2,
    tp3:           j.tp3,
    outcome:       outcomeMap[j.tradeStatus] || 'manual_exit',
    timeframe:     alert.timeframe,
    setupType:     j.setupType,
    entryReason:   j.entryReason,
    htfContext:    j.htfContext,
    emotionBefore: j.emotionBefore,
  });
}

// ── Render journal page ────────────────────────────────────────────────────
async function renderJournal() {
  const listEl  = document.getElementById('journal-list');
  const statsEl = document.getElementById('journal-stats');
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:0.72rem;padding:40px 0;font-family:var(--mono)">Loading journal…</div>';

  // Load from DB if empty
  if (!journalEntries.length) {
    journalEntries = await loadJournalFromDB();
  }

  // Apply time filter
  const filter = document.getElementById('journal-filter')?.value || 'all';
  const cutoff = filter === 'all' ? 0 : Date.now() - parseInt(filter) * 86400000;
  const filtered = journalEntries.filter(e => {
    const ts = new Date(e.trade_date || e.created_at).getTime();
    return ts >= cutoff;
  });

  // ── Stats strip ──────────────────────────────────────────────────────────
  const total    = filtered.length;
  const wins     = filtered.filter(e => ['full_tp','tp2_hit','tp1_hit'].includes(e.outcome)).length;
  const losses   = filtered.filter(e => e.outcome === 'sl_hit').length;
  const winRate  = total ? Math.round((wins / total) * 100) : 0;
  const avgPnl   = filtered.filter(e => e.pnl_pct).length
    ? (filtered.reduce((s,e) => s + (e.pnl_pct || 0), 0) / filtered.filter(e => e.pnl_pct).length).toFixed(1)
    : '—';

  if (statsEl) statsEl.innerHTML = `
    <div class="journal-stat"><span class="journal-stat-value">${total}</span><span class="journal-stat-label">TRADES</span></div>
    <div class="journal-stat"><span class="journal-stat-value" style="color:var(--green)">${wins}</span><span class="journal-stat-label">WINS</span></div>
    <div class="journal-stat"><span class="journal-stat-value" style="color:var(--red)">${losses}</span><span class="journal-stat-label">LOSSES</span></div>
    <div class="journal-stat"><span class="journal-stat-value" style="color:${winRate >= 50 ? 'var(--green)' : 'var(--red)'}">${winRate}%</span><span class="journal-stat-label">WIN RATE</span></div>
    <div class="journal-stat"><span class="journal-stat-value" style="color:${parseFloat(avgPnl) >= 0 ? 'var(--green)' : 'var(--red)'}">${avgPnl !== '—' ? avgPnl + '%' : '—'}</span><span class="journal-stat-label">AVG P&L</span></div>`;

  // ── Entry cards ─────────────────────────────────────────────────────────
  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state" style="padding:40px 0">
            <p style="font-family:var(--mono);font-size:0.75rem;color:var(--muted);text-align:center">No trades logged yet.<br>Complete a trade setup and tap<br><b style="color:var(--text)">LOG TRADE</b> to record it here.</p>
    </div>`;
    return;
  }

  const outcomeMeta = {
    full_tp:     { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polygon points="5,1 6.2,3.8 9.3,3.8 6.8,5.8 7.7,8.8 5,7 2.3,8.8 3.2,5.8 0.7,3.8 3.8,3.8" fill="currentColor"/></svg> FULL TP',     cls: 'joutcome-full-tp' },
    tp2_hit:     { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> TP2 HIT',     cls: 'joutcome-tp2-hit' },
    tp1_hit:     { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> TP1 HIT',     cls: 'joutcome-tp1-hit' },
    breakeven:   { label: 'BREAKEVEN',   cls: 'joutcome-breakeven' },
    sl_hit:      { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1.5" y="1.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><line x1="3.2" y1="3.2" x2="6.8" y2="6.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6.8" y1="3.2" x2="3.2" y2="6.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> SL HIT',      cls: 'joutcome-sl-hit' },
    manual_exit: { label: 'MANUAL EXIT', cls: 'joutcome-manual-exit' },
  };

  listEl.innerHTML = '';
  filtered.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'journal-card';

    const om  = outcomeMeta[entry.outcome] || outcomeMeta['manual_exit'];
    const dir = entry.direction === 'long' ? '▲ LONG' : '▼ SHORT';
    const dirColor = entry.direction === 'long' ? 'var(--green)' : 'var(--red)';
    const date = new Date(entry.trade_date || entry.created_at).toLocaleDateString([], {day:'numeric',month:'short',year:'2-digit'});
    const f = (n) => n ? parseFloat(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:6}) : '—';

    // Levels row
    const levels = [
      `<div class="journal-level-item"><span class="journal-level-label">ENTRY</span><span class="journal-level-value">${f(entry.entry_price)}</span></div>`,
      `<div class="journal-level-item"><span class="journal-level-label">EXIT</span><span class="journal-level-value">${f(entry.exit_price)}</span></div>`,
      `<div class="journal-level-item"><span class="journal-level-label" style="color:var(--red)">SL</span><span class="journal-level-value" style="color:var(--red)">${f(entry.sl_price)}</span></div>`,
      `<div class="journal-level-item"><span class="journal-level-label" style="color:var(--green)">TP1</span><span class="journal-level-value" style="color:var(--green)">${f(entry.tp1_price)}</span></div>`,
      entry.tp2_price ? `<div class="journal-level-item"><span class="journal-level-label" style="color:var(--green)">TP2</span><span class="journal-level-value" style="color:var(--green)">${f(entry.tp2_price)}</span></div>` : '',
      entry.tp3_price ? `<div class="journal-level-item"><span class="journal-level-label" style="color:var(--green)">TP3</span><span class="journal-level-value" style="color:var(--green)">${f(entry.tp3_price)}</span></div>` : '',
    ].join('');

    // Notes
    const notes = [
      entry.setup_type    ? `<b>Setup:</b> ${entry.setup_type}` : null,
      entry.entry_reason  ? `<b>Reason:</b> ${entry.entry_reason}` : null,
      entry.htf_context   ? `<b>HTF:</b> ${entry.htf_context}` : null,
      entry.emotion_before && entry.emotion_after
        ? `<b>Emotions:</b> ${entry.emotion_before} → ${entry.emotion_after}` : null,
      entry.lessons       ? `<b>Lessons:</b> ${entry.lessons}` : null,
    ].filter(Boolean).join('<br>');

    // Screenshots
    const shots = (entry.screenshot_before || entry.screenshot_after) ? `
      <div class="journal-screenshots">
        ${entry.screenshot_before ? `<img src="${entry.screenshot_before}" class="journal-screenshot-thumb" onclick="openImageFullscreen('${entry.screenshot_before}')" alt="Before">` : ''}
        ${entry.screenshot_after  ? `<img src="${entry.screenshot_after}"  class="journal-screenshot-thumb" onclick="openImageFullscreen('${entry.screenshot_after}')"  alt="After">` : ''}
      </div>` : '';

    const pnlStr = entry.pnl_pct != null
      ? `<span style="color:${entry.pnl_pct >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:700">${entry.pnl_pct >= 0 ? '+' : ''}${entry.pnl_pct}%</span>`
      : '';

    card.innerHTML = `
      <div class="journal-card-header" onclick="toggleJournalCard('${entry.id}')">
        <div>
          <span class="journal-card-symbol">${entry.symbol}</span>
          <span class="journal-card-dir" style="color:${dirColor}">${dir}</span>
          ${entry.timeframe ? `<span style="font-family:var(--mono);font-size:0.58rem;color:var(--muted);margin-left:4px">${entry.timeframe}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${pnlStr}
          <span class="journal-card-outcome ${om.cls}">${om.label}</span>
          <span style="color:var(--muted);font-size:0.75rem">›</span>
        </div>
      </div>
      <div class="journal-card-body" id="jcard-${entry.id}">
        <div class="journal-levels">${levels}</div>
        ${notes ? `<div class="journal-notes">${notes}</div>` : ''}
        ${shots}
        <div class="journal-card-meta">
          <span>${date}</span>
          <button onclick="deleteJournalEntry('${entry.id}')" style="background:none;border:none;color:var(--muted);font-family:var(--mono);font-size:0.6rem;cursor:pointer;letter-spacing:0.06em">DELETE</button>
        </div>
      </div>`;

    listEl.appendChild(card);
  });
}

function toggleJournalCard(id) {
  const body = document.getElementById(`jcard-${id}`);
  if (body) body.classList.toggle('open');
}

function openImageFullscreen(url) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  ov.innerHTML = `<img src="${url}" style="max-width:95vw;max-height:90vh;object-fit:contain;border-radius:8px">`;
  ov.onclick = () => ov.remove();
  document.body.appendChild(ov);
}

async function deleteJournalEntry(id) {
  journalEntries = journalEntries.filter(e => e.id !== id);
  await deleteJournalEntryFromDB(id);
  renderJournal();
}

// ── mobileTab extension for journal panel ─────────────────────────────────
// Journal panel is outside the panels-wrap, so handle separately
const _origMobileTab = typeof mobileTab === 'function' ? mobileTab : null;
function mobileTab(tab, pushState = true) {
  const journalPanel = document.getElementById('panel-journal');

  // Hide journal when switching to any other tab
  if (journalPanel) journalPanel.style.display = tab === 'journal' ? 'flex' : 'none';

  if (tab === 'journal') {
    // Deactivate all other nav buttons
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('mnav-journal')?.classList.add('active');
    if (pushState) window.history.pushState({ twTab: 'journal' }, '', '');
    renderJournal();
    return;
  }

  // Delegate everything else to original mobileTab
  if (_origMobileTab) _origMobileTab(tab, pushState);
}
