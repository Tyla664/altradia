// TradeWatch — Alerts
// createAlert, renderAlerts, checkAlerts, history, sound


// ═══════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════
// ── Toggle zone vs single price UI ───────────────
// onConditionChange: see setup alert section below

async function createAlert() {
  userTypingInForm = false;
  if (editingAlertId) return saveEditedAlert();
  // Route setup condition to its own handler
  if (document.getElementById('alert-condition').value === 'setup') return createSetupAlert();

  if (!selectedAsset) return showToast('No Asset', 'Tap any asset from the Hot List or Watchlist first.', 'error');

  const assetId    = selectedAsset.id;
  const condition  = document.getElementById('alert-condition').value;
  const timeframe  = document.getElementById('alert-timeframe').value;
  const isZone  = condition === 'zone';
  const isTap   = condition === 'tap';

  let targetPrice = 0, zoneLow = 0, zoneHigh = 0, note = '', repeatInterval = 0, tapTolerance = 0.2;

  if (isZone) {
    zoneLow  = parseFloat(document.getElementById('alert-zone-low').value);
    zoneHigh = parseFloat(document.getElementById('alert-zone-high').value);
    note     = document.getElementById('alert-note-zone').value.trim();
    repeatInterval = parseInt(document.getElementById('alert-repeat').value) || 0;
    if (isNaN(zoneLow) || isNaN(zoneHigh) || zoneLow <= 0 || zoneHigh <= 0)
      return showToast('Invalid Zone', 'Enter valid zone low and high prices.', 'error');
    if (zoneLow >= zoneHigh)
      return showToast('Invalid Zone', 'Zone low must be less than zone high.', 'error');
    targetPrice = zoneLow;
  } else if (isTap) {
    targetPrice = parseFloat(document.getElementById('alert-price').value);
    note        = document.getElementById('alert-note').value.trim();
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

  // ── Duplicate check ───────────────────────────────
  const duplicate = alerts.find(a => {
    if (a.assetId !== assetId || a.status === 'triggered') return false;
    if (isZone && a.condition === 'zone')
      return a.zoneLow === zoneLow && a.zoneHigh === zoneHigh;
    if (!isZone && a.condition === condition)
      return a.targetPrice === targetPrice;
    return false;
  });
  if (duplicate) {
    const label = isZone
      ? `a zone alert (${formatPrice(zoneLow, assetId)}–${formatPrice(zoneHigh, assetId)})`
      : `a ${condition} alert at ${formatPrice(targetPrice, assetId)}`;
    return showToast('Duplicate Alert', `You already have ${label} for ${selectedAsset.symbol}.`, 'error');
  }

  const assetInfo    = selectedAsset;
  const currentPrice = priceData[assetId]?.price || 0;

  const newAlert = {
    id: 'temp_' + alertIdCounter++,
    assetId,
    symbol:          assetInfo.symbol,
    name:            assetInfo.name,
    condition,
    targetPrice,
    zoneLow:         isZone     ? zoneLow      : null,
    zoneHigh:        isZone     ? zoneHigh     : null,
    tapTolerance:    isTap      ? tapTolerance : null,

    timeframe:       timeframe || null,
    repeatInterval,
    note,
    sound:           selectedAlertSound,
    status:          'active',
    createdAt:       new Date().toLocaleTimeString(),
    currentPriceWhenCreated: currentPrice,
  };

  alerts.push(newAlert);

  try {
    const saved = await saveAlert(newAlert);
    const idx = alerts.findIndex(a => a.id === newAlert.id);
    if (idx !== -1 && saved?.id) alerts[idx].id = saved.id;
  } catch(e) {
    console.warn('createAlert: DB save failed', e);
  }

  // Reset form
  document.getElementById('alert-price').value            = '';
  document.getElementById('alert-zone-low').value         = '';
  document.getElementById('alert-zone-high').value        = '';
  document.getElementById('alert-note').value             = '';
  document.getElementById('alert-note-zone').value        = '';

  document.getElementById('alert-timeframe').value        = '';
  document.getElementById('alert-repeat').value           = '0';
  document.getElementById('alert-tap-tolerance').value    = '0.2';


  delete document.getElementById('alert-price').dataset.userEdited;
  delete document.getElementById('alert-zone-low').dataset.userEdited;
  delete document.getElementById('alert-zone-high').dataset.userEdited;

  const tfLabel = timeframe ? ` · ${timeframe}` : '';
  if (isZone) {
    showToast('Zone Alert Created', `${assetInfo.symbol} zone ${formatPrice(zoneLow, assetId)}–${formatPrice(zoneHigh, assetId)}${tfLabel} is now active.`, 'success');
  } else if (isTap) {
    showToast('Tap Alert Created', `${assetInfo.symbol} tap at ${formatPrice(targetPrice, assetId)} (±${tapTolerance}%)${tfLabel} is now active.`, 'success');
  } else {
    showToast('Alert Created', `${assetInfo.symbol} ${condition} ${formatPrice(targetPrice, assetId)}${tfLabel} is now active.`, 'success');
  }

  if (telegramEnabled) {
    sendTelegram(tgCreatedMessage(assetInfo.symbol, condition, targetPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval, tapTolerance));
  }

  renderAlerts();
  renderWatchlist();
  if (isMobileLayout()) {
    switchAlertTab('active');
    mobileTab('alerts');
  }
}

function deleteAlert(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;

  const isZone  = alert.condition === 'zone';
  const label   = isZone
    ? `${alert.symbol} zone ${formatPrice(alert.zoneLow, alert.assetId)}–${formatPrice(alert.zoneHigh, alert.assetId)}`
    : `${alert.symbol} ${alert.condition} ${formatPrice(alert.targetPrice, alert.assetId)}`;
  const tf      = alert.timeframe ? ` · ${alert.timeframe}` : '';

  showConfirm(
    'Delete Alert',
    `Remove <b>${label}${tf}</b>?<br><small style="opacity:0.65;font-size:0.75rem">This cannot be undone.</small>`,
    () => {
      deleteAlertFromDB(id);
      alerts = alerts.filter(a => a.id !== id);
      renderAlerts();
      renderWatchlist();
      showToast('Alert Deleted', `${alert.symbol} alert removed.`, 'success');
    }
  );
}

// ── Generic confirmation modal ────────────────────
function showConfirm(title, bodyHtml, onConfirm) {
  // Remove any existing confirm modal
  const existing = document.getElementById('confirm-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'confirm-modal';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99998;
    background:rgba(0,0,0,0.6);
    display:flex;align-items:center;justify-content:center;
    padding:24px;backdrop-filter:blur(4px);
  `;
  overlay.innerHTML = `
    <div style="
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:14px;
      padding:24px 22px;
      max-width:320px;width:100%;
      box-shadow:0 8px 40px rgba(0,0,0,0.5);
    ">
      <div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;color:var(--muted);margin-bottom:8px;">${title.toUpperCase()}</div>
      <div style="font-size:0.9rem;line-height:1.5;margin-bottom:22px;">${bodyHtml}</div>
      <div style="display:flex;gap:10px;">
        <button id="confirm-cancel" style="
          flex:1;padding:12px;border-radius:8px;
          background:transparent;border:1px solid var(--border);
          color:var(--muted);font-family:var(--mono);font-size:0.7rem;
          letter-spacing:0.08em;cursor:pointer;
        ">CANCEL</button>
        <button id="confirm-ok" style="
          flex:1;padding:12px;border-radius:8px;
          background:rgba(255,61,90,0.15);border:1px solid rgba(255,61,90,0.4);
          color:var(--red);font-family:var(--mono);font-size:0.7rem;
          letter-spacing:0.08em;cursor:pointer;font-weight:700;
        ">DELETE</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#confirm-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#confirm-ok').onclick     = () => { overlay.remove(); onConfirm(); };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

function toggleAlert(id) {
  const a = alerts.find(a => a.id === id);
  if (!a) return;
  if (a.status === 'active') a.status = 'paused';
  else if (a.status === 'paused') a.status = 'active';
  updateAlert(id, { status: a.status });
  renderAlerts();
}

function dismissAlert(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;
  // Save to history in DB
  saveAlertToHistory(alert);
  // Add to local history array
  alertHistory.unshift({
    id: Date.now() + Math.random(),
    symbol: alert.symbol,
    assetId: alert.assetId,
    condition: alert.condition,
    targetPrice: alert.targetPrice,
    triggeredAt: Date.now(),
    triggeredPrice: alert.triggeredPrice,
    note: alert.note || '',
  });
  saveAlertHistory();
  // Remove from active alerts
  deleteAlertFromDB(id);
  alerts = alerts.filter(a => a.id !== id);
  renderAlerts();
  renderWatchlist();
  if (lwCurrentAsset) drawAlertLines(lwCurrentAsset.id);
}

// ── Alert condition SVG icons ─────────────────────────
// Used in badge labels and detail lines throughout the alert card UI.
const ALERT_ICONS = {
  above:     `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><polyline points="1,7 5,3 9,7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  below:     `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><polyline points="1,3 5,7 9,3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  zone:      `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><rect x="1" y="3" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" stroke-width="0.8" stroke-dasharray="1.5 1.5"/></svg>`,
  tap:       `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><circle cx="5" cy="5" r="3.5" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="5" r="1" fill="currentColor"/></svg>`,
  paused:    `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><rect x="1.5" y="1" width="2.5" height="8" rx="1" fill="currentColor" opacity="0.7"/><rect x="6" y="1" width="2.5" height="8" rx="1" fill="currentColor" opacity="0.7"/></svg>`,
  triggered: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  inzone:    `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><rect x="1" y="3" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/><circle cx="5" cy="5" r="1.2" fill="currentColor"/></svg>`,
  near:      `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 1.5"/><circle cx="5" cy="5" r="1.5" fill="currentColor" opacity="0.8"/></svg>`,
  active:    `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><circle cx="5" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="5" r="1" fill="currentColor"/></svg>`,
};

// ── Button SVG icons for alert actions ───────────────────────────────────────
const SVG_DELETE  = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const SVG_DISMISS = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SVG_RESUME  = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><polygon points="1,1 9,5 1,9" fill="currentColor"/></svg>';
const SVG_PAUSE   = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><rect x="1.5" y="1" width="2.5" height="8" rx="1" fill="currentColor"/><rect x="6" y="1" width="2.5" height="8" rx="1" fill="currentColor"/></svg>';

function renderAlerts() {
  const container = document.getElementById('alerts-list');
  const active = alerts.filter(a => a.status === 'active').length;
  document.getElementById('alert-count').textContent = alerts.length;
  document.getElementById('activeCount').textContent = active;
  document.getElementById('triggeredCount').textContent = triggeredToday;

  if (alerts.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon"><svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 6C16.27 6 10 12.27 10 20v13L6 37h36l-4-4V20C38 12.27 31.73 6 24 6z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" fill="none" opacity="0.4"/><path d="M19 38c0 2.76 2.24 5 5 5s5-2.24 5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.4"/></svg></div><p>No alerts yet.<br>Select an asset and set a<br>price target to get started.</p></div>`;
    return;
  }

  container.innerHTML = '';
  [...alerts].reverse().forEach(alert => {
    const div = document.createElement('div');

    // Setup/trade alerts get their own card renderer
    if (alert.condition === 'setup') {
      renderSetupCard(alert, div);
      container.appendChild(div);
      return;
    }

    const isTriggered = alert.status === 'triggered';
    const dir = alert.triggeredDirection || alert.condition;

    if (isTriggered) {
      div.className = `alert-item triggered-${dir}`;
    } else {
      div.className = `alert-item active-alert`;
    }

    let badgeClass, badgeLabel;
    const isRepeatingZone  = alert.condition === 'zone' && (alert.repeatInterval || 0) > 0;
    const zoneInProgress   = isRepeatingZone && alert.zoneTriggeredOnce;
    // Check if price is currently inside the zone (live data)
    const currentLivePrice = priceData[alert.assetId]?.price || 0;
    const isCurrentlyInZone = alert.condition === 'zone' && currentLivePrice > 0
      && currentLivePrice >= alert.zoneLow && currentLivePrice <= alert.zoneHigh;

    if (isTriggered) {
      if (alert.condition === 'zone')      { badgeClass = 'badge-triggered-below'; badgeLabel = `${ALERT_ICONS.zone}TRIGGERED`; }
      else if (alert.condition === 'tap')  { badgeClass = 'badge-triggered-above'; badgeLabel = `${ALERT_ICONS.triggered}TAPPED`; }
      else                                 { badgeClass = `badge-triggered-${dir}`; badgeLabel = dir === 'above' ? `${ALERT_ICONS.above}TRIGGERED` : `${ALERT_ICONS.below}TRIGGERED`; }
    } else if (zoneInProgress && isCurrentlyInZone) {
      // Has fired before AND price is still inside
      badgeClass = 'badge-zone-active'; badgeLabel = `${ALERT_ICONS.inzone}IN ZONE`;
    } else if (zoneInProgress && !isCurrentlyInZone) {
      // Has fired before BUT price has since left — waiting for re-entry
      badgeClass = 'badge-zone-exited'; badgeLabel = `${ALERT_ICONS.zone}EXITED`;
    } else if (alert.status === 'paused') {
      badgeClass = 'badge-inactive'; badgeLabel = `${ALERT_ICONS.paused}PAUSED`;
    } else {
      badgeClass = 'badge-active'; badgeLabel = `${ALERT_ICONS.active}ACTIVE`;
    }

    const triggeredLine = isTriggered
      ? `<span style="color:${dir === 'above' || alert.condition === 'tap' ? 'var(--green)' : 'var(--red)'}">
           Hit ${formatPrice(alert.triggeredPrice, alert.assetId)} at ${formatTriggeredAt(alert.triggeredAt)}
         </span><br>`
      : (zoneInProgress && isCurrentlyInZone)
        ? `<span style="color:var(--accent);font-size:0.78rem;">Price inside zone · alerting every ${alert.repeatInterval}m</span><br>`
      : (zoneInProgress && !isCurrentlyInZone)
        ? `<span style="color:var(--red);font-size:0.78rem;">Price exited zone · watching for re-entry</span><br>`
      : '';

    // Detail line — all condition types
    let detailLine;
    if (alert.condition === 'zone') {
      detailLine = `<strong>${ALERT_ICONS.zone}ZONE</strong> ${formatPrice(alert.zoneLow, alert.assetId)} – ${formatPrice(alert.zoneHigh, alert.assetId)}${alert.timeframe ? ` <span style="opacity:0.6;font-size:0.75em">· ${alert.timeframe}</span>` : ''}${alert.repeatInterval ? ` <span style="opacity:0.6;font-size:0.75em">· every ${alert.repeatInterval}m</span>` : ''}`;
    } else if (alert.condition === 'tap') {
      detailLine = `<strong>${ALERT_ICONS.tap}TAP LEVEL</strong> ${formatPrice(alert.targetPrice, alert.assetId)} <span style="opacity:0.6;font-size:0.75em">· ±${alert.tapTolerance}% tolerance</span>${alert.timeframe ? ` <span style="opacity:0.6;font-size:0.75em">· ${alert.timeframe}</span>` : ''}`;

    } else {
      detailLine = `<strong>${alert.condition === 'above' ? ALERT_ICONS.above + 'ABOVE' : ALERT_ICONS.below + 'BELOW'}</strong> ${formatPrice(alert.targetPrice, alert.assetId)}${alert.timeframe ? ` <span style="opacity:0.6;font-size:0.75em">· ${alert.timeframe}</span>` : ''}`;
    }

    const isRepeat      = (alert.condition === 'zone' || alert.condition === 'tap') && (alert.repeatInterval || 0) > 0;
    const hasEverFired  = !!alert.zoneTriggeredOnce || !!alert.tapTriggeredOnce || alert.status === 'triggered';
    const SVG_EDIT    = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><path d="M1 7.5L2.5 9 8 3.5 6.5 2 1 7.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/><line x1="5.5" y1="2.5" x2="7.5" y2="4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const btnDelete     = `<button class="alert-action-btn delete" onclick="deleteAlert('${alert.id}')">${SVG_DELETE}DELETE</button>`;
    const btnDismiss    = `<button class="alert-action-btn dismiss" onclick="dismissAlert('${alert.id}')">${SVG_DISMISS}DISMISS</button>`;
    const btnEdit       = `<button class="alert-action-btn toggle" onclick="editAlert('${alert.id}')" title="Edit alert">${SVG_EDIT}EDIT</button>`;
    const btnPause      = alert.status === 'paused'
      ? `<button class="alert-action-btn toggle" onclick="toggleAlert('${alert.id}')">${SVG_RESUME}RESUME</button>`
      : `<button class="alert-action-btn toggle" onclick="toggleAlert('${alert.id}')">${SVG_PAUSE}PAUSE</button>`;

    // Triggered/repeating-fired: DISMISS + DELETE only
    // Active/paused: EDIT + PAUSE/RESUME + DELETE
    const actions = isTriggered || (isRepeat && hasEverFired)
      ? btnDismiss + btnDelete
      : btnEdit + btnPause + btnDelete;

        div.innerHTML = `
      <div class="alert-header-row">
        <div class="alert-symbol">${alert.symbol}</div>
        <div class="alert-badge ${badgeClass}">${badgeLabel}</div>
      </div>
      <div class="alert-detail">
        ${detailLine}<br>
        ${triggeredLine}
        ${alert.note ? `<em style="color:var(--muted)">"${alert.note}"</em><br>` : ''}
        Set at ${alert.createdAt}
      </div>
      <div class="alert-actions">${actions}</div>`;
    container.appendChild(div);
  });

  // Update mobile alert badge dot — only for active (waiting) alerts
  const dot = document.getElementById('alert-dot');
  if (dot) dot.classList.toggle('show', alerts.some(a => a.status === 'active'));

  // Refresh alert lines on the chart for the currently viewed asset
  if (lwCurrentAsset) drawAlertLines(lwCurrentAsset.id);
}

// ═══════════════════════════════════════════════
// ALERT HISTORY — persistence + rendering
// ═══════════════════════════════════════════════
async function saveAlertHistory() {
  // Always keep localStorage as fast local cache
  try { localStorage.setItem('tw_alert_history', JSON.stringify(alertHistory)); } catch(e) {}
}
async function initAlertHistory() {
  // Try DB first, fall back to localStorage
  const dbHistory = await loadAlertHistoryFromDB();
  if (dbHistory !== null) {
    alertHistory = dbHistory;
  } else {
    try {
      const raw = localStorage.getItem('tw_alert_history');
      if (raw) alertHistory = JSON.parse(raw);
    } catch(e) {}
  }
}

function clearAlertHistory() {
  const btn = document.querySelector('.hist-clear-btn');
  if (!btn) return;
  if (btn.classList.contains('confirming')) {
    alertHistory = [];
    saveAlertHistory();
    clearAlertHistoryFromDB(); // also clear from DB
    renderHistory();
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="display:inline-block;vertical-align:middle;margin-right:5px"><polyline points="1,3 11,3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2.5 3l.7 7h5.6l.7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="4.5,3 4.5,1.5 7.5,1.5 7.5,3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Clear History`;
    btn.classList.remove('confirming');
  } else {
    btn.textContent = 'Tap again to confirm';
    btn.classList.add('confirming');
    setTimeout(() => {
      if (btn.classList.contains('confirming')) {
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="display:inline-block;vertical-align:middle;margin-right:5px"><polyline points="1,3 11,3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2.5 3l.7 7h5.6l.7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="4.5,3 4.5,1.5 7.5,1.5 7.5,3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Clear History`;
        btn.classList.remove('confirming');
      }
    }, 3000);
  }
}

let currentAlertTab = 'active';
function switchAlertTab(tab) {
  currentAlertTab = tab;
  document.getElementById('alerts-list').style.display    = tab === 'active'  ? '' : 'none';
  document.getElementById('alerts-history').style.display = tab === 'history' ? '' : 'none';
  document.getElementById('atab-active').classList.toggle('active',  tab === 'active');
  document.getElementById('atab-history').classList.toggle('active', tab === 'history');
  if (tab === 'history') renderHistory();
}

function setHistoryFilter(f) {
  alertHistoryFilter = f;
  ['7d','30d','3m','custom'].forEach(k => {
    document.getElementById('hf-' + k).classList.toggle('active', k === f);
  });
  document.getElementById('hf-custom-row').classList.toggle('show', f === 'custom');
  if (f !== 'custom') renderHistory();
}

function applyCustomHistoryFilter() {
  const from = document.getElementById('hf-from').value;
  const to   = document.getElementById('hf-to').value;
  if (!from || !to) return;
  historyCustomFrom = new Date(from);
  historyCustomTo   = new Date(to); historyCustomTo.setHours(23,59,59,999);
  renderHistory();
}

function getHistoryWindowMs() {
  const now = Date.now();
  if (alertHistoryFilter === '7d')     return [now - 7  * 864e5, now];
  if (alertHistoryFilter === '30d')    return [now - 30 * 864e5, now];
  if (alertHistoryFilter === '3m')     return [now - 91 * 864e5, now];
  if (alertHistoryFilter === 'custom' && historyCustomFrom && historyCustomTo)
    return [historyCustomFrom.getTime(), historyCustomTo.getTime()];
  return [now - 7 * 864e5, now];
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const [fromMs, toMs] = getHistoryWindowMs();
  const filtered = alertHistory.filter(h => h.triggeredAt >= fromMs && h.triggeredAt <= toMs);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="hist-empty">No triggered alerts<br>in this time period.</div>`;
    return;
  }

  // Build summary counts
  const aboveCount = filtered.filter(h => h.condition === 'above').length;
  const belowCount = filtered.filter(h => h.condition === 'below').length;

  // Group by assetId
  const groups = {};
  filtered.forEach(h => {
    if (!groups[h.assetId]) groups[h.assetId] = { symbol: h.symbol, entries: [] };
    groups[h.assetId].entries.push(h);
  });
  // Sort each group newest first
  Object.values(groups).forEach(g => g.entries.sort((a,b) => b.triggeredAt - a.triggeredAt));
  // Sort groups by most recent trigger
  const sortedGroups = Object.entries(groups).sort((a,b) =>
    b[1].entries[0].triggeredAt - a[1].entries[0].triggeredAt
  );

  let html = `<div class="hist-summary">
    <div>${filtered.length} trigger${filtered.length !== 1 ? 's' : ''}</div>
    <div>${ALERT_ICONS.above}Above: <span>${aboveCount}</span></div>
    <div>${ALERT_ICONS.below}Below: <span>${belowCount}</span></div>
  </div>`;

  sortedGroups.forEach(([assetId, group]) => {
    const isOpen = historyExpandedAsset === assetId;
    const lastTrigger = new Date(group.entries[0].triggeredAt).toLocaleDateString();
    html += `
      <div class="hist-asset-group">
        <div class="hist-asset-header" onclick="toggleHistoryGroup('${assetId}')">
          <div class="hist-asset-name">${group.symbol}</div>
          <div class="hist-asset-meta">
            <span class="hist-count">${group.entries.length} alert${group.entries.length !== 1 ? 's' : ''}</span>
            <span style="font-family:var(--mono);font-size:0.6rem;color:var(--muted)">${lastTrigger}</span>
            <svg class="hist-chevron${isOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <polyline points="2,4 6,8 10,4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <div class="hist-entries${isOpen ? ' open' : ''}">
          ${group.entries.map(h => {
            const ts = new Date(h.triggeredAt);
            const dateStr = ts.toLocaleDateString(undefined, { month:'short', day:'numeric' });
            const timeStr = ts.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
            return `
            <div class="hist-entry">
              <div class="hist-entry-left">
                <span class="hist-entry-dir hist-dir-${h.condition}">${h.condition === 'above' ? ALERT_ICONS.above + 'ABOVE' : h.condition === 'below' ? ALERT_ICONS.below + 'BELOW' : h.condition === 'zone' ? ALERT_ICONS.zone + 'ZONE' : ALERT_ICONS.tap + 'TAP'}</span>
                <span class="hist-entry-price">Target: ${formatPrice(h.targetPrice, h.assetId)}</span>
                ${h.note ? `<span class="hist-entry-note">"${h.note}"</span>` : ''}
              </div>
              <div class="hist-entry-right">
                <div class="hist-triggered-price">${formatPrice(h.triggeredPrice, h.assetId)}</div>
                <div>${dateStr}</div>
                <div>${timeStr}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

function toggleHistoryGroup(assetId) {
  historyExpandedAsset = historyExpandedAsset === assetId ? null : assetId;
  renderHistory();
}
// ── Market hours helpers (client-side mirror of Edge Function logic) ──────────
function isForexOpen(now) {
  const day = now.getUTCDay(), hour = now.getUTCHours();
  if (day === 6) return false;
  if (day === 0 && hour < 21) return false;
  return true;
}
function isStockOpen(now) {
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  return mins >= 870 && mins < 1260;
}
function isMarketOpenForAsset(assetId, now) {
  const asset = ASSET_BY_ID.get(assetId);
  if (!asset) return true; // unknown asset — don't block

  // Synthetics category (all Deriv synthetic indices) trade 24/7
  if (asset.cat === 'synthetics') return true;

  // Crypto — always open
  if (asset.cat === 'crypto') return true;

  // Unavailable assets — no live price, don't trigger alerts on them
  if (asset.sources?.[0] === 'unavailable') return false;

  // Indices via Deriv (US500, UK100 etc) — Deriv runs extended hours / near 24/7
  if (asset.cat === 'indices' && asset.derivSym) return true;

  // Indices via OANDA only — follow exchange hours (treat as stock hours)
  if (asset.cat === 'indices' && asset.oandaSym) return isStockOpen(now);

  // Commodities and Forex — follow forex hours (Sun 21:00 UTC → Fri 22:00 UTC)
  if (asset.cat === 'commodities' || asset.cat === 'forex') return isForexOpen(now);

  // Stocks — US market hours (Mon–Fri 09:30–16:00 ET = 13:30–20:00 UTC)
  return isStockOpen(now);
}

function checkAlerts() {
  const now = Date.now();
  const nowDate = new Date(now);
  alerts.forEach(alert => {
    if (alert.status !== 'active') return;

    // Don't fire on stale weekend/after-hours prices
    if (!isMarketOpenForAsset(alert.assetId, nowDate)) return;

    const currentPrice = priceData[alert.assetId]?.price || prices[alert.assetId];
    if (!currentPrice) return;

    const isZone      = alert.condition === 'zone';
    const isTap       = alert.condition === 'tap';
    let fired = false;

    if (isZone) {
      const inZone = currentPrice >= alert.zoneLow && currentPrice <= alert.zoneHigh;
      if (!inZone) {
        // Price left the zone — reset so it can fire again on re-entry
        if (alert.zoneTriggeredOnce) {
          alert.zoneTriggeredOnce = false;
          updateAlert(alert.id, { last_triggered_at: null });
        }
        return;
      }
      const repeatMs = (alert.repeatInterval || 0) * 60 * 1000;
      const lastFired = alert.lastTriggeredAt || 0;
      if (repeatMs === 0) {
        if (alert.zoneTriggeredOnce) return;
        alert.zoneTriggeredOnce = true;
        alert.status = 'triggered';
      } else {
        if (now - lastFired < repeatMs) return;
        alert.lastTriggeredAt = now;
        alert.zoneTriggeredOnce = true;
        // Persist so badge survives reload
        updateAlert(alert.id, { last_triggered_at: new Date().toISOString() });
      }
      fired = true;
    } else if (isTap) {
      const tol = (alert.tapTolerance || 0.2) / 100;
      const withinRange = Math.abs(currentPrice - alert.targetPrice) / alert.targetPrice <= tol;
      if (!withinRange) { alert.tapTriggeredOnce = false; return; }
      if (alert.tapTriggeredOnce) return;
      alert.tapTriggeredOnce = true;
      alert.status = 'triggered';
      fired = true;
    } else {
      fired =
        (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
        (alert.condition === 'below' && currentPrice <= alert.targetPrice);
      if (!fired) return;
      alert.status = 'triggered';
    }

    alert.triggeredDirection = alert.condition;
    alert.triggeredAt    = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    alert.triggeredPrice = currentPrice;
    triggeredToday++;

    if (!isZone || (alert.repeatInterval || 0) === 0) {
      updateAlert(alert.id, {
        status:          'triggered',
        triggered_at:    new Date().toISOString(),
        triggered_price: currentPrice,
        triggered_direction: alert.condition,
      });
    }

    const tfLabel = alert.timeframe ? ` [${alert.timeframe}]` : '';
    let msg;
    if (isZone) {
      msg = `Entered zone ${formatPrice(alert.zoneLow, alert.assetId)}–${formatPrice(alert.zoneHigh, alert.assetId)}${tfLabel} | Current price: ${formatPrice(currentPrice, alert.assetId)}`;
    } else if (isTap) {
      msg = `Tapped ${formatPrice(alert.targetPrice, alert.assetId)} (±${alert.tapTolerance}%)${tfLabel} | Current: ${formatPrice(currentPrice, alert.assetId)}`;
    } else {
      msg = `${alert.condition === 'above' ? 'Rose above' : 'Fell below'} ${formatPrice(alert.targetPrice, alert.assetId)}${tfLabel} | Current: ${formatPrice(currentPrice, alert.assetId)}`;
    }

    showToast(`ALERT TRIGGERED — ${alert.symbol}`, msg, 'alert');
    playAlertSound(alert.sound || selectedAlertSound);
    const isRepeating = isZone && (alert.repeatInterval || 0) > 0;
    if (telegramEnabled && !isRepeating) {
      sendTelegram(tgAlertMessage('trigger', alert.symbol, alert.condition,
        alert.targetPrice, currentPrice, alert.assetId,
        alert.note, alert.timeframe, alert.zoneLow, alert.zoneHigh,
        alert.repeatInterval, alert.tapTolerance));
    }
    renderAlerts();
  });
}

// ═══════════════════════════════════════════════
// SOUND ENGINE (Web Audio API — no external files)

// ═══════════════════════════════════════════════
// TRADE SETUP ALERT — Entry/SL/TP1/TP2/TP3
// A single "setup" alert tracks the full trade lifecycle
// ═══════════════════════════════════════════════

let setupDirection  = 'long';
let setupTp2Notify  = true;

function setSetupDirection(dir) {
  setupDirection = dir;
  document.getElementById('setup-long-btn').classList.toggle('active', dir === 'long');
  document.getElementById('setup-short-btn').classList.toggle('active', dir === 'short');
}

function setTp2Notify(val) {
  setupTp2Notify = val;
  document.getElementById('setup-tp2notify-yes').classList.toggle('active', val);
  document.getElementById('setup-tp2notify-no').classList.toggle('active', !val);
}

function onConditionChange() {
  const condition = document.getElementById('alert-condition').value;
  const isZone    = condition === 'zone';
  const isTap     = condition === 'tap';
  const isSetup   = condition === 'setup';
  document.getElementById('alert-single-row').style.display = (isZone || isSetup) ? 'none' : '';
  document.getElementById('alert-zone-row').style.display   = isZone  ? '' : 'none';
  document.getElementById('alert-tap-row').style.display    = isTap   ? '' : 'none';
  document.getElementById('alert-setup-row').style.display  = isSetup ? '' : 'none';
  // Hide timeframe + sound rows when setup (has its own timeframe)
  const row3 = document.querySelector('.alert-form .form-row:has(#alert-timeframe)');
  if (row3) row3.style.display = isSetup ? 'none' : '';
}

async function createSetupAlert() {
  if (!selectedAsset) return showToast('No Asset', 'Select an asset first.', 'error');

  const entry     = parseFloat(document.getElementById('setup-entry').value);
  const sl        = parseFloat(document.getElementById('setup-sl').value);
  const tp1       = parseFloat(document.getElementById('setup-tp1').value);
  const tp2       = parseFloat(document.getElementById('setup-tp2').value) || null;
  const tp3       = parseFloat(document.getElementById('setup-tp3').value) || null;
  const timeframe = document.getElementById('setup-timeframe').value;
  const setupType = document.getElementById('setup-type').value;
  const entryReason    = document.getElementById('setup-entry-reason').value.trim();
  const htfContext     = document.getElementById('setup-htf-context').value.trim();
  const emotionBefore  = document.getElementById('setup-emotion-before').value;
  const screenshot     = document.getElementById('setup-screenshot').value.trim();

  if (isNaN(entry) || entry <= 0) return showToast('Missing Entry', 'Enter a valid entry price.', 'error');
  if (isNaN(sl)    || sl    <= 0) return showToast('Missing SL', 'Enter a valid stop loss.', 'error');
  if (isNaN(tp1)   || tp1   <= 0) return showToast('Missing TP1', 'Enter at least TP1.', 'error');

  // Validate direction logic
  if (setupDirection === 'long') {
    if (sl >= entry) return showToast('Invalid SL', 'For a long, SL must be below entry.', 'error');
    if (tp1 <= entry) return showToast('Invalid TP1', 'For a long, TP1 must be above entry.', 'error');
  } else {
    if (sl <= entry) return showToast('Invalid SL', 'For a short, SL must be above entry.', 'error');
    if (tp1 >= entry) return showToast('Invalid TP1', 'For a short, TP1 must be below entry.', 'error');
  }

  // Pack all journal + trade data into the note field as JSON
  const journal = {
    direction:       setupDirection,
    sl,
    tp1,
    tp2:             tp2 || null,
    tp3:             tp3 || null,
    tp2Notify:       setupTp2Notify,
    setupType:       setupType || null,
    entryReason:     entryReason    || null,
    htfContext:      htfContext     || null,
    emotionBefore:   emotionBefore  || null,
    screenshotBefore: screenshotUrlBefore || null,
    screenshotAfter:  screenshotUrlAfter  || null,
    tradeStatus:     'watching',
  };

  const newAlert = {
    id:           'temp_' + alertIdCounter++,
    assetId:      selectedAsset.id,
    symbol:       selectedAsset.symbol,
    name:         selectedAsset.name,
    condition:    'setup',
    targetPrice:  entry,   // entry price
    zoneLow:      Math.min(entry, sl),
    zoneHigh:     Math.max(entry, sl),
    tapTolerance: null,
    timeframe:    timeframe || null,
    repeatInterval: 0,
    note:         JSON.stringify(journal),
    sound:        selectedAlertSound,
    status:       'active',
    createdAt:    new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
  };

  alerts.push(newAlert);

  try {
    const saved = await saveAlert(newAlert);
    const idx = alerts.findIndex(a => a.id === newAlert.id);
    if (idx !== -1 && saved?.id) alerts[idx].id = saved.id;
  } catch(e) {
    console.warn('createSetupAlert: DB save failed', e);
  }

  // Send Telegram setup confirmation
  if (telegramEnabled && telegramChatId) {
    sendTelegram(tgSetupCreatedMessage(selectedAsset.symbol, setupDirection, entry, sl, tp1, tp2, tp3, timeframe, journal));
  }

  // Reset screenshots and form
  resetScreenshotUploads();
  ['setup-entry','setup-sl','setup-tp1','setup-tp2','setup-tp3','setup-entry-reason','setup-htf-context'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; delete el.dataset.userEdited; }
  });
  ['setup-type','setup-timeframe','setup-emotion-before'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  renderAlerts();
  showToast('Trade Setup Created', `${selectedAsset.symbol} setup alert active — watching for entry at ${formatPrice(entry, selectedAsset.id)}.`, 'success');
  if (isMobileLayout()) { switchAlertTab('active'); mobileTab('alerts'); }
}

// ── Parse journal from alert.note ─────────────────────────────────────────
function getJournal(alert) {
  try { return JSON.parse(alert.note || '{}'); } catch(e) { return {}; }
}

// ── Trade status badge info ────────────────────────────────────────────────
function getSetupBadge(alert) {
  const j = getJournal(alert);
  const status = j.tradeStatus || 'watching';
  switch (status) {
    case 'watching':  return { cls: 'badge-watching', label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><ellipse cx="5" cy="5" rx="4" ry="2.5" stroke="currentColor" stroke-width="1.4"/><circle cx="5" cy="5" r="1.2" fill="currentColor"/></svg> WATCHING' };
    case 'entry_hit': return { cls: 'badge-running',  label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polygon points="2,1.5 9,5 2,8.5" fill="currentColor"/></svg> ENTRY HIT' };
    case 'running':   return { cls: 'badge-running',  label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polygon points="2,1.5 9,5 2,8.5" fill="currentColor"/></svg> RUNNING' };
    case 'tp1_hit':   return { cls: 'badge-tp1-hit',  label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> TP1 HIT' };
    case 'tp2_hit':   return { cls: 'badge-tp2-hit',  label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> TP2 HIT' };
    case 'full_tp':   return { cls: 'badge-full-tp',  label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polygon points="5,1 6.2,3.8 9.3,3.8 6.8,5.8 7.7,8.8 5,7 2.3,8.8 3.2,5.8 0.7,3.8 3.8,3.8" fill="currentColor"/></svg> FULL TP' };
    case 'sl_hit':    return { cls: 'badge-sl-hit',   label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1.5" y="1.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><line x1="3.2" y1="3.2" x2="6.8" y2="6.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6.8" y1="3.2" x2="3.2" y2="6.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> SL HIT' };
    default:          return { cls: 'badge-watching',  label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><ellipse cx="5" cy="5" rx="4" ry="2.5" stroke="currentColor" stroke-width="1.4"/><circle cx="5" cy="5" r="1.2" fill="currentColor"/></svg> WATCHING' };
  }
}

// ── Render setup alert card ────────────────────────────────────────────────
function renderSetupCard(alert, div) {
  const j   = getJournal(alert);
  const dir = j.direction === 'long' ? '▲ LONG' : '▼ SHORT';
  const dirColor = j.direction === 'long' ? 'var(--green)' : 'var(--red)';
  const badge = getSetupBadge(alert);

  const rrRaw = j.tp1 && j.sl && alert.targetPrice
    ? Math.abs(j.tp1 - alert.targetPrice) / Math.abs(alert.targetPrice - j.sl)
    : null;
  const rr = rrRaw ? ` · RR ${rrRaw.toFixed(1)}:1` : '';

  const statusClass = {
    watching:  'trade-watching', entry_hit: 'trade-running', running: 'trade-running',
    tp1_hit: 'trade-running', tp2_hit: 'trade-running',
    full_tp: 'trade-full-tp', sl_hit: 'trade-sl-hit',
  }[j.tradeStatus || 'watching'] || 'trade-watching';

  div.className = `alert-item ${statusClass}`;

  const levels = [
    `<span style="color:var(--muted);font-size:0.72rem">Entry</span> <b>${formatPrice(alert.targetPrice, alert.assetId)}</b>`,
    `<span style="color:var(--red);font-size:0.72rem">SL</span> <b>${formatPrice(j.sl, alert.assetId)}</b>`,
    `<span style="color:var(--green);font-size:0.72rem">TP1</span> <b>${formatPrice(j.tp1, alert.assetId)}</b>`,
    j.tp2 ? `<span style="color:var(--green);font-size:0.72rem">TP2</span> <b>${formatPrice(j.tp2, alert.assetId)}</b>` : null,
    j.tp3 ? `<span style="color:var(--green);font-size:0.72rem">TP3</span> <b>${formatPrice(j.tp3, alert.assetId)}</b>` : null,
  ].filter(Boolean).join('  ');

  const journalLines = [
    j.setupType    ? `<span style="opacity:0.6">Setup:</span> ${j.setupType}` : null,
    j.entryReason  ? `<span style="opacity:0.6">Reason:</span> ${j.entryReason}` : null,
    j.htfContext   ? `<span style="opacity:0.6">HTF:</span> ${j.htfContext}` : null,
    j.emotionBefore ? `<span style="opacity:0.6">Emotion:</span> ${j.emotionBefore}` : null,
    j.screenshot   ? `<a href="${j.screenshot}" target="_blank" style="color:var(--accent);font-size:0.7rem">Screenshot</a>` : null,
  ].filter(Boolean).join('<br>');

  const isFinalState = ['full_tp','sl_hit'].includes(j.tradeStatus || '');
  const btnLog    = `<button class="alert-action-btn dismiss" onclick="logTradeFromAlert('${alert.id}')">LOG TRADE</button>`;
  const btnClose  = `<button class="alert-action-btn toggle"  onclick="dismissSetupAlert('${alert.id}')">CLOSE</button>`;
  const btnDelete = `<button class="alert-action-btn delete"  onclick="deleteAlert('${alert.id}')">DELETE</button>`;
  const btnDismiss = isFinalState ? btnLog : btnClose;

  div.innerHTML = `
    <div class="alert-header-row">
      <div class="alert-symbol">${alert.symbol} <span style="color:${dirColor};font-size:0.65rem;font-weight:700">${dir}</span>${rr ? `<span style="color:var(--muted);font-size:0.62rem"> ${rr}</span>` : ''}</div>
      <div class="alert-badge ${badge.cls}">${badge.label}</div>
    </div>
    <div class="alert-detail" style="font-size:0.75rem;line-height:1.9">
      ${levels}
      ${alert.timeframe ? `<br><span style="opacity:0.5;font-size:0.68rem">· ${alert.timeframe}</span>` : ''}
      ${journalLines ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);font-size:0.72rem;line-height:1.7">${journalLines}</div>` : ''}
    </div>
    <div class="alert-actions">${btnDismiss}${btnDelete}</div>`;
}

function dismissSetupAlert(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;
  showManualCloseForm(alert, getJournal(alert));
}

function showManualCloseForm(alert, journal) {
  const currentPrice = priceData[alert.assetId]?.price || '';
  const emotions = ['Calm','Confident','Satisfied','Frustrated','Disappointed','Relieved','Neutral','Anxious'];
  showConfirm(
    'Close Trade',
    `<div style="font-size:0.72rem;color:var(--muted);margin-bottom:14px;font-family:var(--mono)">Record how and why you closed this trade early</div>
     <div style="display:flex;flex-direction:column;gap:10px">
       <div>
         <label style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--muted);display:block;margin-bottom:4px">EXIT PRICE</label>
         <input id="manual-close-price" type="number" step="any" value="${currentPrice}"
           style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:0.8rem;padding:8px 10px;border-radius:7px;box-sizing:border-box">
       </div>
       <div>
         <label style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--muted);display:block;margin-bottom:4px">REASON FOR CLOSING</label>
         <select id="manual-close-reason"
           style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:0.75rem;padding:8px 10px;border-radius:7px;box-sizing:border-box">
           <option value="Secured TP1">Secured TP1 — letting rest run</option>
           <option value="Partial profit">Took partial profit</option>
           <option value="Moved SL to BE">Moved SL to breakeven</option>
           <option value="Reversal signal">Saw reversal signal</option>
           <option value="News event">News event — exiting early</option>
           <option value="End of session">End of trading session</option>
           <option value="Changed bias">Changed market bias</option>
           <option value="Risk management">Risk management</option>
           <option value="Fear / anxiety">Fear / anxiety</option>
           <option value="Target reached">Target reached</option>
           <option value="Manual decision">Manual decision</option>
           <option value="Other">Other</option>
         </select>
       </div>
       <div>
         <label style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--muted);display:block;margin-bottom:6px">EMOTION AFTER</label>
         <div style="display:flex;flex-wrap:wrap;gap:6px">
           ${emotions.map(e => `<button onclick="setManualCloseEmotion('${e}',this)"
             data-emotion="${e}"
             style="background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--muted);padding:5px 10px;border-radius:6px;cursor:pointer;font-size:0.72rem;font-family:var(--mono);transition:all 0.15s">${e}</button>`).join('')}
         </div>
       </div>
       <button onclick="confirmManualClose('${alert.id}')"
         style="width:100%;background:var(--accent);color:#000;font-family:var(--mono);font-weight:700;font-size:0.78rem;letter-spacing:0.08em;padding:12px;border:none;border-radius:8px;cursor:pointer;margin-top:4px">
         CLOSE TRADE
       </button>
     </div>`,
    null
  );
}

let _manualCloseEmotion = '';
function setManualCloseEmotion(emotion, btn) {
  _manualCloseEmotion = emotion;
  btn.closest('div').querySelectorAll('[data-emotion]').forEach(b => {
    b.style.background = 'rgba(255,255,255,0.05)';
    b.style.color = 'var(--muted)';
    b.style.borderColor = 'var(--border)';
  });
  btn.style.background = 'rgba(0,212,255,0.12)';
  btn.style.color = 'var(--accent)';
  btn.style.borderColor = 'var(--accent)';
}

async function confirmManualClose(alertId) {
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.style.display = 'none';

  const exitPrice    = parseFloat(document.getElementById('manual-close-price')?.value) || null;
  const reason       = document.getElementById('manual-close-reason')?.value || 'Manual decision';
  const emotionAfter = _manualCloseEmotion || null;
  _manualCloseEmotion = '';

  const alert = alerts.find(a => a.id === alertId);
  if (!alert) return;
  const j = getJournal(alert);
  j.emotionAfter = emotionAfter;
  j.closeReason  = reason;
  j.exitPrice    = exitPrice;
  j.tradeStatus  = j.tradeStatus === 'watching' ? 'cancelled' : 'manual_exit';

  saveAlertToHistory({ ...alert, note: JSON.stringify(j) });
  alertHistory.unshift({
    id: Date.now() + Math.random(),
    symbol: alert.symbol, assetId: alert.assetId,
    condition: 'setup', targetPrice: alert.targetPrice,
    triggeredAt: Date.now(), triggeredPrice: exitPrice,
    note: JSON.stringify(j),
  });
  saveAlertHistory();
  deleteAlertFromDB(alertId);
  alerts = alerts.filter(a => a.id !== alertId);
  renderAlerts();
  renderWatchlist();

  // Open journal form pre-filled — user lands there to add screenshots + lessons
  openJournalEntryForm({
    symbol:        alert.symbol,
    direction:     j.direction,
    entry:         alert.targetPrice,
    sl:            j.sl,
    tp1:           j.tp1,
    tp2:           j.tp2,
    tp3:           j.tp3,
    outcome:       'manual_exit',
    timeframe:     alert.timeframe,
    setupType:     j.setupType,
    entryReason:   j.entryReason,
    htfContext:    j.htfContext,
    emotionBefore: j.emotionBefore,
    emotionAfter,
    exitPrice,
    closeReason:   reason,
  });
}

// ── Telegram messages for setup alerts ────────────────────────────────────
function tgSetupCreatedMessage(symbol, direction, entry, sl, tp1, tp2, tp3, timeframe, journal) {
  const dir     = direction === 'long' ? '▲ LONG' : '▼ SHORT';
  const emoji   = direction === 'long' ? '' : '';
  const rrRaw   = tp1 && sl ? Math.abs(tp1 - entry) / Math.abs(entry - sl) : null;
  const rows = [
    tgRow('Direction', `<b>${emoji} ${dir}</b>`),
    tgRow('Entry',     `<b>${entry}</b>`),
    tgRow('Stop Loss', `<b>${sl}</b>`),
    tgRow('TP1',       `<b>${tp1}</b>`),
    tp2 ? tgRow('TP2', `<b>${tp2}</b>`) : null,
    tp3 ? tgRow('TP3', `<b>${tp3}</b>`) : null,
    rrRaw ? tgRow('Risk:Reward', `<b>${rrRaw.toFixed(1)}:1</b>`) : null,
    timeframe ? tgRow('Timeframe', `<b>${timeframe}</b>`) : null,
    journal.setupType    ? tgRow('Setup',     `<i>${journal.setupType}</i>`) : null,
    journal.entryReason  ? tgRow('Reason',    `<i>${journal.entryReason}</i>`) : null,
    journal.htfContext   ? tgRow('HTF',       `<i>${journal.htfContext}</i>`) : null,
  ].filter(Boolean);
  return [
    `[SETUP] <b>TRADE SETUP ACTIVE — ${symbol}</b>`,
    ``,
    `Your trade is queued. Alerts will fire at each level.`,
    ``,
    ...rows,
    ``,
    `<i>Open your trading platform and place your orders.</i>`,
    ``,
    `<a href="https://t.me/tradewatchalert_bot/assistant">Open TradeWatch →</a>`,
  ].join('\n');
}

function tgSetupLevelMessage(symbol, level, price, assetId, journal) {
  const templates = {
    entry_hit: {
      header: `[ENTRY TRIGGERED] <b>ENTRY — ${symbol}</b>`,
      body:   `Price has hit your entry level. <b>Your trade may now be active.</b>`,
      action: `Open your trading platform and confirm your position is filled. Manage your SL and monitor TP levels.`,
    },
    sl_hit: {
      header: `[SL HIT] <b>STOP LOSS — ${symbol}</b>`,
      body:   `Price reached your stop loss level. Trade is likely closed.`,
      action: `Review your trading platform. Log your emotion and lessons in TradeWatch.`,
    },
    tp1_approaching: {
      header: `[APPROACHING] <b>TP1 NEAR — ${symbol}</b>`,
      body:   `Price is getting close to your first take profit.`,
      action: `Consider securing partial profits at TP1. Move SL to breakeven if your plan allows.`,
    },
    tp1_hit: {
      header: `[TP1 HIT] <b>TAKE PROFIT 1 — ${symbol}</b>`,
      body:   `Price reached your first take profit target.`,
      action: `Consider banking partial profits. Manage your SL to protect remaining position.`,
    },
    tp2_approaching: {
      header: `[APPROACHING] <b>TP2 NEAR — ${symbol}</b>`,
      body:   `Price is approaching your second take profit.`,
      action: `Decide whether to secure profits at TP2 or let it run to TP3.`,
    },
    tp2_hit: {
      header: `[TP2 HIT] <b>TAKE PROFIT 2 — ${symbol}</b>`,
      body:   `Price reached your second take profit.`,
      action: `Excellent! Consider protecting remaining position or letting it run to TP3.`,
    },
    full_tp: {
      header: `[FULL TP] <b>ALL TARGETS HIT — ${symbol}</b>`,
      body:   `Price reached your final take profit. Trade fully complete.`,
      action: `Amazing execution! Close your position and log this trade in your journal.`,
    },
  };
  const t = templates[level] || templates['entry_hit'];
  const rows = [
    tgRow('Price', `<b>${price}</b>`),
    journal.direction ? tgRow('Direction', `<b>${journal.direction === 'long' ? '▲ LONG' : '▼ SHORT'}</b>`) : null,
  ].filter(Boolean);
  return [
    t.header, ``, t.body, ``, ...rows, ``, `<i>${t.action}</i>`, ``,
    `<a href="https://t.me/tradewatchalert_bot/assistant">Open TradeWatch →</a>`,
  ].join('\n');
}
