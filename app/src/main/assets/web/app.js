/* PoolHawk – real-time DEX tracker. Data: public GeckoTerminal API (through the native bridge window.Hawk). */
'use strict';

const H = window.Hawk || null;
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/* ---------- texts (English / German) ---------- */
const T = {
  en: {
    tab_trending: 'Trending', tab_new: 'New', tab_watch: 'Watchlist', tab_whales: 'Whales', tab_alerts: 'Alerts',
    search: 'Search token, pair or address', all: 'All', hot: 'Hot', volume: 'Volume', gainers: 'Gainers', losers: 'Losers',
    trending_pools: 'Trending pools', results: 'Results for “%1”', no_results: 'Nothing found.', offline: 'No connection. Pull down or try again.',
    rate: 'Too many requests – wait a few seconds.', retry: 'Try again', liq: 'Liq', age: 'Age', vol24: 'Vol 24h',
    liquidity: 'Liquidity', fdv: 'FDV', mcap: 'Market cap', txns24: 'Txns 24h', buyers: 'Buyers', sellers: 'Sellers', created: 'Pool age',
    buys: 'Buys', sells: 'Sells', buy: 'BUY', sell: 'SELL', trades: 'Latest trades', risk: 'Risk check',
    r_low: 'LOW', r_med: 'MEDIUM', r_high: 'HIGH',
    rf_liq_tiny: 'Very low liquidity', rf_liq_low: 'Low liquidity', rf_new: 'Less than 1 hour old', rf_young: 'Less than 24 hours old',
    rf_fdv: 'FDV far above liquidity', rf_nosell: 'Buys but no sells (honeypot sign)', rf_fewsell: 'Very few sells',
    rf_pump: 'Extreme price spike', rf_dump: 'Price crashed', rf_few: 'Very few traders', rf_unlocked: 'Liquidity not locked', rf_locked: 'Liquidity locked',
    rf_none: 'No red flags found.', risk_note: 'Automatic hints from on-chain numbers – not a guarantee and not financial advice. Always do your own research.',
    watch_add: 'Added to watchlist', watch_rm: 'Removed from watchlist', watch_empty: 'Your watchlist is empty.\nTap ☆ on any pool to add it.',
    watch_limit: 'Free watchlist holds %1 tokens. Pro: unlimited lists and tokens.', new_list: 'New list', list_name: 'List name', my_list: 'My watchlist',
    export: 'Export', edit: 'Edit', done: 'Done', delete_list: 'Delete list', refresh: 'Refresh', updated: 'Updated %1',
    new_pools: 'New pools', hide_high: 'Hide high risk', new_sub: 'Freshly launched pools with an automatic rug & risk check.',
    whales: 'Whale trades', whale_min: 'Minimum', whale_sub: 'Big buys and sells in your watchlist pools, live.', whale_empty: 'Add pools to your watchlist – their big trades show up here.',
    whale_none: 'No trades above %1 recently.', whale_notify: 'Notify me about whale trades',
    alerts: 'Price alerts', alerts_sub: 'Get a notification when a price hits your target – also when the app is closed.', alerts_empty: 'No alerts yet.\nOpen a pool and tap “Alert”.',
    check_now: 'Check now', bg_note: 'Checked in the background about every 15 minutes, and every minute while the app is open.', a_active: 'Active', a_hit: 'Hit %1 at %2', a_paused: 'Paused',
    a_above: 'Price above', a_below: 'Price below', a_up: 'Rises by %', a_down: 'Falls by %', set_alert: 'Set alert', save: 'Save', cancel: 'Cancel', close: 'Close',
    alert_saved: 'Alert saved', alert_value: 'Target', alert_now: 'Now: %1', alerts_checked: 'Checked – %1 triggered',
    a_alert: 'Alert', a_copy: 'Address', a_web: 'Browser', a_share: 'Share', copied: 'Copied',
    pro_title: 'PoolHawk Pro', pro_lead: 'One-time %1 – no subscription.', pro_active: 'Pro is active', licensed_to: 'Licensed to %1',
    f_alerts: 'Price alerts with notifications', f_new: 'New-pool scanner with rug & risk check', f_lists: 'Unlimited watchlists & tokens + CSV export',
    f_whales: 'Whale tracker: big buys & sells live', f_tf: 'Minute charts (1m · 5m · 15m)', f_risk: 'Risk check on every pool',
    pro_how: 'Pay %1 in crypto to one of these addresses, then send your device code to %2. You get a license key for this phone.',
    device_code: 'Your device code', tap_copy: 'Tap to copy', request_mail: 'Request Pro by e-mail', key_ph: 'Paste your license key (SSW1-…)', activate: 'Activate',
    act_ok: 'Pro unlocked – have fun hunting! 🦅', act_bad: 'This key is not valid.', act_dev: 'This key was issued for a different device.',
    locked_title: '%1 is a Pro feature', unlock: 'Unlock Pro', pro_only: 'Pro',
    settings: 'Settings', language: 'Language', about: 'About', version: 'Version', data_src: 'Market data: GeckoTerminal API', disclaimer: 'PoolHawk shows public market data. Nothing in the app is financial advice.',
    mail_subject: 'PoolHawk Pro', mail_body: 'Hi, I would like PoolHawk Pro.\n\nMy device code: %1\nPaid with: \nTransaction ID: \n',
    ago_s: '%1s', ago_m: '%1m', ago_h: '%1h', ago_d: '%1d', just_now: 'now', min_tf: 'Minute charts are Pro',
  },
  de: {
    tab_trending: 'Trends', tab_new: 'Neu', tab_watch: 'Watchlist', tab_whales: 'Wale', tab_alerts: 'Alarme',
    search: 'Token, Paar oder Adresse suchen', all: 'Alle', hot: 'Heiß', volume: 'Volumen', gainers: 'Gewinner', losers: 'Verlierer',
    trending_pools: 'Trend-Pools', results: 'Ergebnisse für „%1“', no_results: 'Nichts gefunden.', offline: 'Keine Verbindung. Bitte erneut versuchen.',
    rate: 'Zu viele Anfragen – kurz warten.', retry: 'Nochmal', liq: 'Liq', age: 'Alter', vol24: 'Vol 24h',
    liquidity: 'Liquidität', fdv: 'FDV', mcap: 'Marktkapitalisierung', txns24: 'Trades 24h', buyers: 'Käufer', sellers: 'Verkäufer', created: 'Pool-Alter',
    buys: 'Käufe', sells: 'Verkäufe', buy: 'KAUF', sell: 'VERK', trades: 'Letzte Trades', risk: 'Risiko-Check',
    r_low: 'NIEDRIG', r_med: 'MITTEL', r_high: 'HOCH',
    rf_liq_tiny: 'Sehr wenig Liquidität', rf_liq_low: 'Wenig Liquidität', rf_new: 'Jünger als 1 Stunde', rf_young: 'Jünger als 24 Stunden',
    rf_fdv: 'FDV weit über der Liquidität', rf_nosell: 'Käufe, aber keine Verkäufe (Honeypot-Zeichen)', rf_fewsell: 'Kaum Verkäufe',
    rf_pump: 'Extremer Kurssprung', rf_dump: 'Kurs abgestürzt', rf_few: 'Sehr wenige Händler', rf_unlocked: 'Liquidität nicht gesperrt', rf_locked: 'Liquidität gesperrt',
    rf_none: 'Keine Warnzeichen gefunden.', risk_note: 'Automatische Hinweise aus On-Chain-Zahlen – keine Garantie und keine Anlageberatung. Prüfe immer selbst.',
    watch_add: 'Zur Watchlist hinzugefügt', watch_rm: 'Aus Watchlist entfernt', watch_empty: 'Deine Watchlist ist leer.\nTippe bei einem Pool auf ☆.',
    watch_limit: 'Die Free-Watchlist fasst %1 Tokens. Pro: unbegrenzt Listen und Tokens.', new_list: 'Neue Liste', list_name: 'Name der Liste', my_list: 'Meine Watchlist',
    export: 'Export', edit: 'Bearbeiten', done: 'Fertig', delete_list: 'Liste löschen', refresh: 'Aktualisieren', updated: 'Stand %1',
    new_pools: 'Neue Pools', hide_high: 'Hohes Risiko ausblenden', new_sub: 'Frisch gestartete Pools mit automatischem Rug- & Risiko-Check.',
    whales: 'Wal-Trades', whale_min: 'Mindestens', whale_sub: 'Große Käufe und Verkäufe in deinen Watchlist-Pools, live.', whale_empty: 'Füge Pools zur Watchlist hinzu – ihre großen Trades erscheinen hier.',
    whale_none: 'Zuletzt keine Trades über %1.', whale_notify: 'Bei Wal-Trades benachrichtigen',
    alerts: 'Preis-Alarme', alerts_sub: 'Benachrichtigung, sobald ein Preis dein Ziel erreicht – auch wenn die App zu ist.', alerts_empty: 'Noch keine Alarme.\nÖffne einen Pool und tippe auf „Alarm“.',
    check_now: 'Jetzt prüfen', bg_note: 'Wird im Hintergrund etwa alle 15 Minuten geprüft, bei offener App jede Minute.', a_active: 'Aktiv', a_hit: 'Erreicht: %1 um %2', a_paused: 'Pausiert',
    a_above: 'Preis über', a_below: 'Preis unter', a_up: 'Steigt um %', a_down: 'Fällt um %', set_alert: 'Alarm setzen', save: 'Speichern', cancel: 'Abbrechen', close: 'Schließen',
    alert_saved: 'Alarm gespeichert', alert_value: 'Ziel', alert_now: 'Jetzt: %1', alerts_checked: 'Geprüft – %1 ausgelöst',
    a_alert: 'Alarm', a_copy: 'Adresse', a_web: 'Browser', a_share: 'Teilen', copied: 'Kopiert',
    pro_title: 'PoolHawk Pro', pro_lead: 'Einmalig %1 – kein Abo.', pro_active: 'Pro ist aktiv', licensed_to: 'Lizenziert für %1',
    f_alerts: 'Preis-Alarme mit Benachrichtigung', f_new: 'Neue-Pools-Scanner mit Rug- & Risiko-Check', f_lists: 'Unbegrenzte Watchlists & Tokens + CSV-Export',
    f_whales: 'Wal-Tracker: große Käufe & Verkäufe live', f_tf: 'Minuten-Charts (1m · 5m · 15m)', f_risk: 'Risiko-Check für jeden Pool',
    pro_how: 'Bezahle %1 per Krypto an eine dieser Adressen und schicke dann deinen Geräte-Code an %2. Du bekommst einen Lizenzschlüssel für dieses Handy.',
    device_code: 'Dein Geräte-Code', tap_copy: 'Antippen zum Kopieren', request_mail: 'Pro per E-Mail anfragen', key_ph: 'Lizenzschlüssel einfügen (SSW1-…)', activate: 'Freischalten',
    act_ok: 'Pro freigeschaltet – viel Spaß beim Jagen! 🦅', act_bad: 'Dieser Schlüssel ist ungültig.', act_dev: 'Dieser Schlüssel gilt für ein anderes Gerät.',
    locked_title: '%1 ist eine Pro-Funktion', unlock: 'Pro freischalten', pro_only: 'Pro',
    settings: 'Einstellungen', language: 'Sprache', about: 'Info', version: 'Version', data_src: 'Marktdaten: GeckoTerminal API', disclaimer: 'PoolHawk zeigt öffentliche Marktdaten. Nichts in der App ist Anlageberatung.',
    mail_subject: 'PoolHawk Pro', mail_body: 'Hallo, ich möchte PoolHawk Pro.\n\nMein Geräte-Code: %1\nBezahlt mit: \nTransaktions-ID: \n',
    ago_s: '%1s', ago_m: '%1m', ago_h: '%1h', ago_d: '%1T', just_now: 'jetzt', min_tf: 'Minuten-Charts sind Pro',
  },
};

/* ---------- storage ---------- */
const store = {
  load(k, def) {
    try {
      const s = H ? H.load(k) : localStorage.getItem('ph_' + k);
      return s ? JSON.parse(s) : def;
    } catch (e) { return def; }
  },
  save(k, v) {
    const s = JSON.stringify(v);
    if (H) H.save(k, s); else localStorage.setItem('ph_' + k, s);
  },
};

const settings = Object.assign({lang: (navigator.language || 'en').slice(0, 2) === 'de' ? 'de' : 'en', net: 'all', sort: 'hot', list: 0, newNet: 'all', hideHigh: false}, store.load('settings', {}));
const saveSettings = () => store.save('settings', settings);
function t(k, ...a) {
  let s = (T[settings.lang] || T.en)[k] || T.en[k] || k;
  a.forEach((v, i) => { s = s.split('%' + (i + 1)).join(v); });
  return s;
}

let info = {pro: false, code: '—', price: '$9.99', email: 'eltanque81@gmx.de', pay: [], to: '', version: '1.0'};
function refreshPro() {
  if (H) { try { info = JSON.parse(H.proInfo()); } catch (e) { /* keep defaults */ } }
  const b = $('#proBtn');
  b.textContent = info.pro ? 'PRO ✓' : 'PRO';
  b.classList.toggle('active', !!info.pro);
  document.querySelectorAll('.tabs .pl').forEach(e => e.remove());
}
const isPro = () => !!info.pro;

/* ---------- API ---------- */
let reqId = 0;
const pending = {};
window.hawkCb = (id, ok, body) => {
  const p = pending[id];
  if (!p) return;
  delete pending[id];
  if (ok) { try { p.res(JSON.parse(body)); } catch (e) { p.rej(new Error('parse')); } } else p.rej(new Error(body === '429' ? 'rate' : 'net'));
};
function api(path) {
  if (H) return new Promise((res, rej) => { const id = ++reqId; pending[id] = {res, rej}; H.get(id, path); });
  return fetch('https://api.geckoterminal.com/api/v2' + path, {headers: {Accept: 'application/json;version=20230302'}})
    .then(r => { if (r.status === 429) throw new Error('rate'); if (!r.ok) throw new Error('net'); return r.json(); });
}
async function apiRetry(path) {
  try { return await api(path); } catch (e) {
    if (e.message !== 'rate') throw e;
    await new Promise(r => setTimeout(r, 4000));
    return api(path);
  }
}

const NETS = [['all', null], ['solana', 'SOL'], ['eth', 'ETH'], ['bsc', 'BSC'], ['base', 'BASE'], ['arbitrum', 'ARB'], ['polygon_pos', 'POL'], ['avax', 'AVAX'], ['ton', 'TON'], ['sui-network', 'SUI'], ['tron', 'TRX']];
const NET_SHORT = Object.fromEntries(NETS.filter(n => n[1]));
const netShort = n => NET_SHORT[n] || String(n || '').slice(0, 4).toUpperCase();
const INC = 'include=base_token,quote_token,dex';

function netOf(d) {
  const r = d.relationships || {};
  if (r.network && r.network.data) return r.network.data.id;
  const id = d.id || '';
  const known = NETS.map(n => n[0]).filter(n => n !== 'all').sort((a, b) => b.length - a.length).find(n => id.startsWith(n + '_'));
  return known || id.split('_')[0];
}
function parsePools(res) {
  const inc = {};
  (res.included || []).forEach(x => { inc[x.type + ':' + x.id] = x.attributes || {}; });
  const arr = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
  return arr.map(d => {
    const a = d.attributes || {}, r = d.relationships || {};
    const rid = k => (r[k] && r[k].data && r[k].data.id) || '';
    const bt = inc['token:' + rid('base_token')] || {}, qt = inc['token:' + rid('quote_token')] || {}, dx = inc['dex:' + rid('dex')] || {};
    const parts = String(a.name || '').split(' / ');
    const num = v => (v == null || v === '' ? null : +v);
    const pc = a.price_change_percentage || {}, vol = a.volume_usd || {};
    const p = {
      net: netOf(d), addr: a.address, name: a.name, sym: bt.symbol || parts[0] || '?', quote: qt.symbol || (parts[1] || '').split(' ')[0],
      img: bt.image_url && !/missing/.test(bt.image_url) ? bt.image_url : '', dex: dx.name || rid('dex').replace(/[-_]/g, ' '),
      price: num(a.base_token_price_usd), ch: {m5: num(pc.m5), h1: num(pc.h1), h6: num(pc.h6), h24: num(pc.h24)},
      vol: {h1: num(vol.h1), h24: num(vol.h24)}, liq: num(a.reserve_in_usd), fdv: num(a.fdv_usd), mcap: num(a.market_cap_usd),
      tx: a.transactions || {}, created: a.pool_created_at ? Date.parse(a.pool_created_at) : null,
      locked: num(a.locked_liquidity_percentage), token: bt.address || rid('base_token').replace(/^[^_]+_/, ''),
    };
    poolCache[key(p)] = Object.assign(poolCache[key(p)] || {}, p);
    return p;
  }).filter(p => p.addr);
}
const poolCache = {};
const key = p => p.net + '|' + String(p.addr).toLowerCase();

/* ---------- formatting ---------- */
const SUB = '₀₁₂₃₄₅₆₇₈₉';
function fmtPrice(p) {
  if (p == null || isNaN(p)) return '—';
  if (p >= 1000) return '$' + p.toLocaleString('en-US', {maximumFractionDigits: 2});
  if (p >= 1) return '$' + p.toFixed(p >= 100 ? 2 : 4);
  if (p >= 0.001) return '$' + p.toFixed(5).replace(/0+$/, '').replace(/\.$/, '');
  if (p <= 0) return '$0';
  const m = p.toFixed(20).match(/^0\.(0+)(\d{4})/);
  if (!m) return '$' + p.toExponential(3);
  const z = String(m[1].length).split('').map(d => SUB[d]).join('');
  return '$0.0' + z + m[2].replace(/0+$/, '');
}
function fmtUsd(v) {
  if (v == null || isNaN(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
}
function fmtPct(v) {
  if (v == null || isNaN(v)) return '<span class="dim">—</span>';
  const c = v >= 0 ? 'up' : 'down';
  const s = Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2);
  return `<span class="${c}">${v >= 0 ? '+' : ''}${s}%</span>`;
}
const pctClass = v => (v == null ? '' : v >= 0 ? 'up' : 'down');
function ago(ts) {
  if (!ts) return '—';
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 5) return t('just_now');
  if (s < 60) return t('ago_s', Math.floor(s));
  if (s < 3600) return t('ago_m', Math.floor(s / 60));
  if (s < 86400) return t('ago_h', Math.floor(s / 3600));
  return t('ago_d', Math.floor(s / 86400));
}
const shortAddr = a => (a && a.length > 12 ? a.slice(0, 6) + '…' + a.slice(-4) : a || '');
const clock = () => new Date().toLocaleTimeString(settings.lang, {hour: '2-digit', minute: '2-digit'});

function avatar(p) {
  const letter = esc((p.sym || '?').slice(0, 1).toUpperCase());
  const img = p.img ? `<img src="${esc(p.img)}" loading="lazy" onerror="this.outerHTML='<div class=ph>${letter}</div>'">` : `<div class="ph">${letter}</div>`;
  return `<div class="av">${img}<span class="nb">${esc(netShort(p.net))}</span></div>`;
}
function poolRow(p, i, extra = '') {
  const tx = p.tx.h24 || {};
  const age = p.created ? ' · ' + ago(p.created) : '';
  return `<div class="row" data-k="${esc(key(p))}">
    ${i != null ? `<div class="rank">${i + 1}</div>` : ''}${avatar(p)}
    <div class="mid"><div class="nm"><b>${esc(p.sym)}</b><span>/${esc(p.quote)}</span>${extra}</div>
      <div class="sub">${esc(p.dex)}${age} · ${t('liq')} ${fmtUsd(p.liq)} · ${t('vol24')} ${fmtUsd(p.vol.h24)}</div></div>
    <div class="rt"><div class="px num">${fmtPrice(p.price)}</div><div class="pc num ${pctClass(p.ch.h24)}">${fmtPct(p.ch.h24)}</div></div>
  </div>`;
}
const skeleton = n => `<div class="list">${'<div class="skel"></div>'.repeat(n)}</div>`;
function errorBox(e, again) {
  const id = 'r' + Math.random().toString(36).slice(2);
  setTimeout(() => { const b = document.getElementById(id); if (b) b.onclick = again; });
  return `<div class="empty"><div class="big">📡</div>${esc(e && e.message === 'rate' ? t('rate') : t('offline'))}<br><br><button class="btn small amber" id="${id}">${t('retry')}</button></div>`;
}
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.tm);
  toast.tm = setTimeout(() => el.classList.remove('show'), 2200);
}
function copy(text) {
  if (H) H.copy(text); else if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  toast(t('copied'));
}
function bindRows(root) {
  root.querySelectorAll('.row[data-k]').forEach(r => {
    r.addEventListener('click', ev => {
      if (ev.target.closest('.x-btn')) return;
      const p = poolCache[r.dataset.k];
      if (p) openPool(p);
    });
  });
}

/* ---------- risk check (Pro) ---------- */
function riskOf(p) {
  let s = 0;
  const f = [];
  const add = (pts, k) => { s += pts; f.push([pts, k]); };
  const tx = (p.tx && p.tx.h24) || {};
  const buys = tx.buys || 0, sells = tx.sells || 0, traders = (tx.buyers || 0) + (tx.sellers || 0);
  if (p.liq != null) { if (p.liq < 10000) add(3, 'rf_liq_tiny'); else if (p.liq < 50000) add(1, 'rf_liq_low'); }
  if (p.created) { const h = (Date.now() - p.created) / 3.6e6; if (h < 1) add(2, 'rf_new'); else if (h < 24) add(1, 'rf_young'); }
  if (p.fdv && p.liq && p.fdv / p.liq > 50) add(2, 'rf_fdv');
  if (buys >= 10 && sells === 0) add(3, 'rf_nosell');
  else if (buys >= 20 && sells / buys < 0.2) add(2, 'rf_fewsell');
  if ((p.ch.h1 != null && p.ch.h1 > 300) || (p.ch.h24 != null && p.ch.h24 > 1000)) add(2, 'rf_pump');
  if (p.ch.h24 != null && p.ch.h24 < -80) add(2, 'rf_dump');
  if (traders > 0 && traders < 15) add(1, 'rf_few');
  if (p.locked != null) { if (p.locked < 50) add(1, 'rf_unlocked'); else if (p.locked >= 90) add(-1, 'rf_locked'); }
  s = Math.max(0, s);
  const level = s >= 6 ? 'high' : s >= 3 ? 'med' : 'low';
  return {score: s, level, flags: f};
}
const riskBadge = r => `<span class="risk ${r.level}">${t('r_' + r.level)}</span>`;

/* ---------- views ---------- */
let tab = 'trending', timer = null, searchQ = '';
const view = $('#view');
function setTimer(fn, ms) { clearInterval(timer); timer = fn ? setInterval(() => { if (!document.hidden && $('#sheet').hidden) fn(); }, ms) : null; }

function lockedView(titleKey, subKey, previewHtml) {
  return `<div class="locked"><div class="preview">${previewHtml}</div><div class="over">
    <span class="badge-pro">PRO</span><h3>${esc(t('locked_title', t(titleKey)))}</h3><p>${esc(t(subKey))}</p>
    <button class="cta" data-unlock>${t('unlock')}</button></div></div>`;
}
function fakeRows(n) {
  const syms = ['HAWK', 'MOON', 'PEPE2', 'ZETA', 'BLAZE', 'NOVA', 'KRILL'];
  let h = '<div class="list">';
  for (let i = 0; i < n; i++) {
    h += `<div class="row"><div class="av"><div class="ph">${syms[i % 7][0]}</div></div><div class="mid"><div class="nm"><b>${syms[i % 7]}</b><span>/SOL</span><span class="risk ${['low', 'med', 'high'][i % 3]}">${t(['r_low', 'r_med', 'r_high'][i % 3])}</span></div><div class="sub">Raydium · 12m · Liq $48K</div></div><div class="rt"><div class="px num">$0.00${i + 3}21</div><div class="pc up num">+${(i + 1) * 37}%</div></div></div>`;
  }
  return h + '</div>';
}

function chips(items, current, cls = '') {
  return `<div class="chips">${items.map(([v, label, lock]) => `<button class="chip ${cls} ${v === current ? 'on' : ''}" data-v="${esc(v)}">${esc(label)}${lock ? '<span class="lock">🔒</span>' : ''}</button>`).join('')}</div>`;
}
const netChips = cur => chips(NETS.map(([n, s]) => [n, s || t('all')]), cur);

async function showTrending() {
  setTimer(null);
  const sorts = [['hot', '🔥 ' + t('hot')], ['volume', t('volume')], ['gainers', t('gainers')], ['losers', t('losers')]];
  view.innerHTML = netChips(settings.net) + chips(sorts, settings.sort, 'ghost') +
    `<div class="sec-head"><h2>${t('trending_pools')}</h2><span class="live">LIVE</span></div><div id="tl">${skeleton(8)}</div>`;
  const [c1, c2] = view.querySelectorAll('.chips');
  c1.onclick = e => { const b = e.target.closest('.chip'); if (b) { settings.net = b.dataset.v; saveSettings(); showTrending(); } };
  c2.onclick = e => { const b = e.target.closest('.chip'); if (b) { settings.sort = b.dataset.v; saveSettings(); showTrending(); } };
  const load = async () => {
    const path = settings.net === 'all' ? `/networks/trending_pools?${INC},network&page=1` : `/networks/${settings.net}/trending_pools?${INC}&page=1`;
    const box = $('#tl');
    try {
      let pools = parsePools(await apiRetry(path));
      if (settings.sort === 'volume') pools.sort((a, b) => (b.vol.h24 || 0) - (a.vol.h24 || 0));
      if (settings.sort === 'gainers') pools.sort((a, b) => (b.ch.h24 || -1e9) - (a.ch.h24 || -1e9));
      if (settings.sort === 'losers') pools.sort((a, b) => (a.ch.h24 || 1e9) - (b.ch.h24 || 1e9));
      if (!box.isConnected) return;
      box.innerHTML = pools.length ? `<div class="list">${pools.map((p, i) => poolRow(p, i)).join('')}</div><div class="foot">${t('updated', clock())} · ${t('data_src')}</div>` : `<div class="empty">${t('no_results')}</div>`;
      bindRows(box);
    } catch (e) { if (box.isConnected && !box.querySelector('.row')) box.innerHTML = errorBox(e, load); }
  };
  await load();
  setTimer(load, 45000);
}

async function showNew() {
  setTimer(null);
  if (!isPro()) { view.innerHTML = lockedView('new_pools', 'new_sub', fakeRows(7)); return; }
  view.innerHTML = netChips(settings.newNet) +
    `<div class="sec-head"><h2>${t('new_pools')}</h2><button class="link" id="hh">${settings.hideHigh ? '☑' : '☐'} ${t('hide_high')}</button></div><div id="nl">${skeleton(8)}</div>`;
  view.querySelector('.chips').onclick = e => { const b = e.target.closest('.chip'); if (b) { settings.newNet = b.dataset.v; saveSettings(); showNew(); } };
  $('#hh').onclick = () => { settings.hideHigh = !settings.hideHigh; saveSettings(); showNew(); };
  const load = async () => {
    const path = settings.newNet === 'all' ? `/networks/new_pools?${INC},network&page=1` : `/networks/${settings.newNet}/new_pools?${INC}&page=1`;
    const box = $('#nl');
    try {
      let pools = parsePools(await apiRetry(path)).map(p => Object.assign(p, {risk: riskOf(p)}));
      if (settings.hideHigh) pools = pools.filter(p => p.risk.level !== 'high');
      if (!box.isConnected) return;
      box.innerHTML = pools.length ? `<div class="list">${pools.map(p => {
        const fl = p.risk.flags.filter(f => f[0] > 0).slice(0, 3).map(f => `<span class="flag">${esc(t(f[1]))}</span>`).join('');
        return poolRow(p, null, riskBadge(p.risk)).replace('</div>\n    <div class="rt">', (fl ? `<div class="flags">${fl}</div>` : '') + '</div>\n    <div class="rt">');
      }).join('')}</div><div class="foot">${t('updated', clock())} · ${esc(t('risk_note'))}</div>` : `<div class="empty">${t('no_results')}</div>`;
      bindRows(box);
    } catch (e) { if (box.isConnected && !box.querySelector('.row')) box.innerHTML = errorBox(e, load); }
  };
  await load();
  setTimer(load, 30000);
}

/* watchlists */
const FREE_LIMIT = 5;
function lists() {
  let l = store.load('lists', null);
  if (!Array.isArray(l) || !l.length) l = [{id: 'l1', name: '', items: []}];
  return l;
}
const saveLists = l => store.save('lists', l);
const curList = l => l[Math.min(settings.list, l.length - 1)] || l[0];
function inWatch(p) { return lists().some(l => l.items.some(i => key(i) === key(p))); }
function toggleWatch(p) {
  const l = lists(), cur = curList(l);
  const k = key(p);
  const found = l.find(x => x.items.some(i => key(i) === k));
  if (found) { found.items = found.items.filter(i => key(i) !== k); saveLists(l); toast(t('watch_rm')); return false; }
  const total = l.reduce((n, x) => n + x.items.length, 0);
  if (!isPro() && total >= FREE_LIMIT) { showUnlock(t('watch_limit', FREE_LIMIT)); return false; }
  cur.items.push({net: p.net, addr: p.addr, sym: p.sym, quote: p.quote, name: p.name, img: p.img});
  saveLists(l);
  toast(t('watch_add'));
  return true;
}
async function refreshPrices(items) {
  const byNet = {};
  items.forEach(i => { (byNet[i.net] = byNet[i.net] || []).push(i.addr); });
  const out = [];
  for (const [net, addrs] of Object.entries(byNet)) {
    for (let i = 0; i < addrs.length; i += 30) {
      const res = await apiRetry(`/networks/${net}/pools/multi/${addrs.slice(i, i + 30).join(',')}?${INC}`);
      res.data = (res.data || []).map(d => Object.assign(d, {relationships: Object.assign(d.relationships || {}, {network: {data: {id: net}}})}));
      out.push(...parsePools(res));
    }
  }
  return out;
}
let editMode = false;
async function showWatch() {
  setTimer(null);
  const l = lists(), cur = curList(l);
  const listChips = l.map((x, i) => [String(i), x.name || t('my_list')]);
  if (isPro()) listChips.push(['add', '＋ ' + t('new_list')]);
  view.innerHTML = (l.length > 1 || isPro() ? chips(listChips, String(Math.min(settings.list, l.length - 1)), 'ghost') : '') +
    `<div class="sec-head"><h2>${esc(cur.name || t('my_list'))} · ${cur.items.length}${isPro() ? '' : '/' + FREE_LIMIT}</h2>
     <span><button class="link" id="wEdit">${editMode ? t('done') : t('edit')}</button> &nbsp; <button class="link" id="wExp">${t('export')}${isPro() ? '' : ' 🔒'}</button></span></div><div id="wl"></div>`;
  const ch = view.querySelector('.chips');
  if (ch) ch.onclick = e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    if (b.dataset.v === 'add') return newListDialog();
    settings.list = +b.dataset.v; saveSettings(); editMode = false; showWatch();
  };
  $('#wEdit').onclick = () => { editMode = !editMode; showWatch(); };
  $('#wExp').onclick = () => exportLists();
  const box = $('#wl');
  if (!cur.items.length) {
    box.innerHTML = `<div class="empty"><div class="big">☆</div>${esc(t('watch_empty')).replace('\n', '<br>')}</div>`;
    if (editMode && l.length > 1) box.innerHTML += `<div class="empty"><button class="btn small" id="delL">${t('delete_list')}</button></div>`;
    const d = $('#delL'); if (d) d.onclick = () => { l.splice(l.indexOf(cur), 1); saveLists(l); settings.list = 0; saveSettings(); editMode = false; showWatch(); };
    return;
  }
  const render = pools => {
    const map = {};
    pools.forEach(p => { map[key(p)] = p; });
    box.innerHTML = `<div class="list">${cur.items.map(i => {
      const p = map[key(i)] || poolCache[key(i)] || Object.assign({ch: {}, vol: {}, tx: {}}, i);
      poolCache[key(p)] = poolCache[key(p)] || p;
      let h = poolRow(p, null);
      if (editMode) h = h.replace('<div class="rt">', `<button class="x-btn" data-rm="${esc(key(i))}">✕</button><div class="rt" style="display:none">`);
      return h;
    }).join('')}</div><div class="foot">${t('updated', clock())}</div>`;
    bindRows(box);
    box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
      const ll = lists(), c = curList(ll);
      c.items = c.items.filter(i => key(i) !== b.dataset.rm);
      saveLists(ll); showWatch();
    });
  };
  render([]);
  if (editMode) return;
  const load = async () => {
    try { const pools = await refreshPrices(curList(lists()).items); if (box.isConnected && !editMode) render(pools); } catch (e) { /* keep last prices */ }
  };
  await load();
  setTimer(load, 30000);
}
function newListDialog() {
  openModal(`<h3>${t('new_list')}</h3><input class="inp" id="ln" maxlength="24" placeholder="${esc(t('list_name'))}" style="margin-top:12px">
    <div class="row-btns"><button class="btn" data-close>${t('cancel')}</button><button class="cta" id="lnOk">${t('save')}</button></div>`);
  $('#ln').focus();
  $('#lnOk').onclick = () => {
    const l = lists();
    l.push({id: 'l' + Date.now(), name: $('#ln').value.trim() || t('new_list') + ' ' + (l.length + 1), items: []});
    saveLists(l); settings.list = l.length - 1; saveSettings(); closeModal(); showWatch();
  };
}
function exportLists() {
  if (!isPro()) return showUnlock();
  const rows = [['list', 'symbol', 'quote', 'network', 'pool_address', 'price_usd', 'change_24h_pct', 'liquidity_usd', 'volume_24h_usd', 'url']];
  lists().forEach(l => l.items.forEach(i => {
    const p = poolCache[key(i)] || i;
    rows.push([l.name || t('my_list'), i.sym, i.quote, i.net, i.addr, p.price ?? '', p.ch && p.ch.h24 != null ? p.ch.h24 : '', p.liq ?? '', p.vol && p.vol.h24 != null ? p.vol.h24 : '', `https://www.geckoterminal.com/${i.net}/pools/${i.addr}`]);
  }));
  const csv = rows.map(r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',')).join('\n');
  if (H) H.share('PoolHawk watchlists.csv', csv); else copy(csv);
}

/* whales */
async function showWhales() {
  setTimer(null);
  if (!isPro()) {
    view.innerHTML = lockedView('whales', 'whale_sub', `<div class="card">${[1, 2, 3, 4, 5, 6].map(i => `<div class="trade"><span class="k ${i % 3 ? 'up' : 'down'}">${i % 3 ? t('buy') : t('sell')}</span><span class="w">0x8f3a…${i}c2d · HAWK</span><span class="v num">$${i * 23}.4K</span><span class="a">${i}m</span></div>`).join('')}</div>`);
    return;
  }
  const w = store.load('whale', {min: 10000, notify: false});
  const mins = [[5000, '$5K'], [10000, '$10K'], [50000, '$50K'], [100000, '$100K']];
  const items = [];
  lists().forEach(l => l.items.forEach(i => { if (items.length < 6 && !items.some(x => key(x) === key(i))) items.push(i); }));
  view.innerHTML = `<div class="sec-head"><h2>${t('whales')}</h2><span class="live">LIVE</span></div>
    <div class="chips"><span class="chip" style="background:none;border:0;padding-left:2px">${t('whale_min')}</span>${mins.map(([v, l]) => `<button class="chip ghost ${w.min === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="card" style="padding:4px 14px"><div class="set-row" style="border:0"><span>🐋 ${t('whale_notify')}</span><button class="switch ${w.notify ? 'on' : ''}" id="wn"></button></div></div>
    <div id="wh"></div>`;
  view.querySelector('.chips').onclick = e => { const b = e.target.closest('.chip[data-v]'); if (b) { const x = store.load('whale', {}); x.min = +b.dataset.v; store.save('whale', x); showWhales(); } };
  $('#wn').onclick = () => { const x = store.load('whale', {min: 10000}); x.notify = !x.notify; store.save('whale', x); if (x.notify && H) H.askNotify(); $('#wn').classList.toggle('on', x.notify); };
  const box = $('#wh');
  if (!items.length) { box.innerHTML = `<div class="empty"><div class="big">🐋</div>${esc(t('whale_empty'))}</div>`; return; }
  box.innerHTML = skeleton(5);
  const load = async () => {
    const all = [];
    for (const i of items) {
      try {
        const res = await apiRetry(`/networks/${i.net}/pools/${i.addr}/trades?trade_volume_in_usd_greater_than=${w.min}`);
        (res.data || []).slice(0, 25).forEach(d => all.push(Object.assign({pool: i}, d.attributes)));
      } catch (e) { /* skip this pool */ }
    }
    all.sort((a, b) => Date.parse(b.block_timestamp) - Date.parse(a.block_timestamp));
    if (!box.isConnected) return;
    box.innerHTML = all.length ? `<div class="card">${all.slice(0, 60).map(tr => tradeRow(tr, true)).join('')}</div><div class="foot">${t('updated', clock())}</div>`
      : `<div class="empty">${t('whale_none', fmtUsd(w.min))}</div>`;
    box.querySelectorAll('.trade[data-k]').forEach(r => r.onclick = () => { const p = poolCache[r.dataset.k]; if (p) openPool(p); else openPool(items.find(i => key(i) === r.dataset.k)); });
  };
  await load();
  setTimer(load, 40000);
}
function tradeRow(tr, withPool) {
  const buy = tr.kind === 'buy';
  const k = withPool ? key(tr.pool) : '';
  return `<div class="trade" ${k ? `data-k="${esc(k)}"` : ''}><span class="k ${buy ? 'up' : 'down'}">${buy ? t('buy') : t('sell')}</span>
    <span class="w">${esc(shortAddr(tr.tx_from_address))}${withPool ? ' · <b style="color:var(--text)">' + esc(tr.pool.sym) + '</b>' : ''}</span>
    <span class="v num ${buy ? 'up' : 'down'}">${fmtUsd(+tr.volume_in_usd)}</span><span class="a">${ago(Date.parse(tr.block_timestamp))}</span></div>`;
}

/* alerts */
const loadAlerts = () => store.load('alerts', []);
function condText(a) {
  if (a.kind === 'above') return t('a_above') + ' ' + fmtPrice(a.value);
  if (a.kind === 'below') return t('a_below') + ' ' + fmtPrice(a.value);
  return (a.kind === 'up' ? t('a_up') : t('a_down')).replace('%', a.value + '%') + ' (' + fmtPrice(a.ref) + ')';
}
function showAlerts() {
  setTimer(null);
  if (!isPro()) {
    view.innerHTML = lockedView('alerts', 'alerts_sub', `<div class="list">${['HAWK › $0.0042', 'SOL › $250', 'PEPE ‹ $0.0₅9', 'ETH ‹ $3,000'].map(x => `<div class="alert-row"><div class="mid"><b>🔔 ${x}</b><div class="sub">${t('a_active')}</div></div><span class="switch on"></span></div>`).join('')}</div>`);
    return;
  }
  const al = loadAlerts();
  view.innerHTML = `<div class="sec-head"><h2>${t('alerts')} · ${al.length}</h2><button class="link" id="chk">${t('check_now')}</button></div>
    ${al.length ? `<div class="list">${al.map(a => `<div class="alert-row" data-id="${esc(a.id)}">
      <div class="mid" data-open><b>${esc(a.name)}</b><div class="sub">${esc(condText(a))}</div>
      <div class="sub">${a.hit ? `<span class="hit">✓ ${esc(t('a_hit', fmtPrice(a.hitPrice), new Date(a.hitAt).toLocaleString(settings.lang, {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})))}</span>` : a.on === false ? t('a_paused') : '<span class="up">● ' + t('a_active') + '</span>'}</div></div>
      ${a.hit ? `<button class="btn small" data-re>↻</button>` : `<button class="switch ${a.on === false ? '' : 'on'}" data-tog></button>`}
      <button class="x-btn" data-del>✕</button></div>`).join('')}</div>` : `<div class="empty"><div class="big">🔔</div>${esc(t('alerts_empty')).replace('\n', '<br>')}</div>`}
    <div class="foot">${esc(t('bg_note'))}</div>`;
  $('#chk').onclick = () => { if (H) { $('#chk').innerHTML = '<span class="spin"></span>'; H.checkAlerts(); } };
  view.querySelectorAll('.alert-row').forEach(r => {
    const id = r.dataset.id;
    const upd = fn => { const l = loadAlerts(); const a = l.find(x => x.id === id); if (a) fn(a, l); store.save('alerts', l.filter(Boolean)); showAlerts(); };
    const tog = r.querySelector('[data-tog]'); if (tog) tog.onclick = () => upd(a => { a.on = a.on === false; });
    const re = r.querySelector('[data-re]'); if (re) re.onclick = () => upd(a => { a.hit = false; a.on = true; if (a.hitPrice && (a.kind === 'up' || a.kind === 'down')) a.ref = a.hitPrice; });
    r.querySelector('[data-del]').onclick = () => upd((a, l) => { l.splice(l.indexOf(a), 1); });
    r.querySelector('[data-open]').onclick = () => { const a = loadAlerts().find(x => x.id === id); if (a) openPool({net: a.net, addr: a.addr, sym: a.sym}); };
  });
}
window.hawkAlertsChecked = n => { toast(t('alerts_checked', n)); if (tab === 'alerts' && $('#sheet').hidden) showAlerts(); };
setInterval(() => { if (H && isPro() && !document.hidden && loadAlerts().some(a => a.on !== false && !a.hit)) H.checkAlerts(); }, 60000);

function alertDialog(p) {
  if (!isPro()) return showUnlock();
  let kind = 'above';
  const def = k => (k === 'above' ? +(p.price * 1.1).toPrecision(4) : k === 'below' ? +(p.price * 0.9).toPrecision(4) : 10);
  openModal(`<div class="grabber"></div><h3>🔔 ${t('set_alert')} · ${esc(p.sym)}</h3><p>${t('alert_now', fmtPrice(p.price))}</p>
    <div class="seg">${['above', 'below', 'up', 'down'].map(k => `<button data-k="${k}" class="${k === kind ? 'on' : ''}">${t('a_' + k)}</button>`).join('')}</div>
    <label class="dim" style="font-size:12px">${t('alert_value')}</label>
    <input class="inp num" id="av" type="number" inputmode="decimal" step="any" value="${def(kind)}" style="margin-top:4px">
    <div class="row-btns"><button class="btn" data-close>${t('cancel')}</button><button class="cta" id="aOk">${t('save')}</button></div>`);
  $('.seg').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    kind = b.dataset.k;
    document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b));
    $('#av').value = def(kind);
  };
  $('#aOk').onclick = () => {
    const v = parseFloat($('#av').value);
    if (!(v > 0)) return;
    const l = loadAlerts();
    l.unshift({id: 'a' + Date.now(), net: p.net, addr: p.addr, name: p.sym + '/' + p.quote, sym: p.sym, kind, value: v, ref: p.price, on: true, hit: false, created: Date.now()});
    store.save('alerts', l);
    if (H) H.askNotify();
    closeModal();
    toast(t('alert_saved'));
  };
}

/* ---------- search ---------- */
const qEl = $('#q');
let qTimer;
qEl.addEventListener('input', () => {
  clearTimeout(qTimer);
  $('#qClear').hidden = !qEl.value;
  qTimer = setTimeout(() => {
    const q = qEl.value.trim();
    if (q.length >= 2) doSearch(q); else if (searchQ) { searchQ = ''; go(tab); }
  }, 450);
});
$('#qClear').onclick = () => { qEl.value = ''; $('#qClear').hidden = true; searchQ = ''; go(tab); };
async function doSearch(q) {
  searchQ = q;
  setTimer(null);
  view.innerHTML = `<div class="sec-head"><h2>${esc(t('results', q))}</h2></div><div id="sr">${skeleton(5)}</div>`;
  const box = $('#sr');
  try {
    const pools = parsePools(await apiRetry(`/search/pools?query=${encodeURIComponent(q)}&${INC},network`));
    if (searchQ !== q || !box.isConnected) return;
    box.innerHTML = pools.length ? `<div class="list">${pools.map(p => poolRow(p, null)).join('')}</div>` : `<div class="empty"><div class="big">🔍</div>${t('no_results')}</div>`;
    bindRows(box);
  } catch (e) { if (box.isConnected) box.innerHTML = errorBox(e, () => doSearch(q)); }
}

/* ---------- pool detail ---------- */
const sheet = $('#sheet');
let cur = null, curTf = '1h', sheetTimer = null;
const TFS = [['1m', 'minute', 1, true], ['5m', 'minute', 5, true], ['15m', 'minute', 15, true], ['1h', 'hour', 1], ['4h', 'hour', 4], ['1D', 'day', 1]];
const ICON = {
  star: '<svg viewBox="0 0 24 24"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9 2.9-6Z"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15.4 4.6 8 12l7.4 7.4-1.4 1.4L5.2 12 14 3.2l1.4 1.4Z"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M12 22a2.5 2.5 0 0 0 2.4-2h-4.8a2.5 2.5 0 0 0 2.4 2Zm7-6V11a7 7 0 0 0-5.5-6.8V3a1.5 1.5 0 0 0-3 0v1.2A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><path d="M16 1H6a2 2 0 0 0-2 2v13h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16h-9V7h9v14Z"/></svg>',
  web: '<svg viewBox="0 0 24 24"><path d="M14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7ZM19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7Z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.8-3.5a3 3 0 0 0 0-1.4l6.8-3.5A3 3 0 1 0 15 7l-6.8 3.5a3 3 0 1 0 0 3L15 17a3 3 0 1 0 3-1Z"/></svg>',
};
function openPool(p) {
  if (!p || !p.addr) return;
  cur = Object.assign({ch: {}, vol: {}, tx: {}}, poolCache[key(p)] || {}, p);
  if (TFS.find(x => x[0] === curTf)[3] && !isPro()) curTf = '1h';
  sheet.hidden = false;
  sheet.scrollTop = 0;
  renderPool();
  loadPool();
  clearInterval(sheetTimer);
  sheetTimer = setInterval(() => { if (!sheet.hidden && !document.hidden) loadPool(true); }, 30000);
}
function closePool() { sheet.hidden = true; clearInterval(sheetTimer); cur = null; if (tab === 'watch' && !searchQ) showWatch(); }
window.hawkOpen = (net, addr) => openPool({net, addr});

function renderPool() {
  const p = cur;
  const tx = p.tx.h24 || {};
  const b = tx.buys || 0, s = tx.sells || 0, share = b + s ? (b / (b + s)) * 100 : 50;
  const r = riskOf(p);
  const riskHtml = isPro()
    ? `<div class="risk-big"><span class="risk ${r.level}" style="font-size:13px;margin:0">${t('r_' + r.level)}</span><div class="meter"><i style="left:calc(${Math.min(100, r.score / 10 * 100)}% - 2px)"></i></div><b class="num">${r.score}/10</b></div>
       <ul class="reasons">${r.flags.filter(f => f[0] !== 0).map(f => `<li>${esc(t(f[1]))}</li>`).join('') || `<li>${t('rf_none')}</li>`}</ul><div class="note">${esc(t('risk_note'))}</div>`
    : `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span class="dim" style="font-size:13px">${esc(t('f_risk'))}</span><button class="btn small amber" data-unlock>🔒 ${t('unlock')}</button></div>`;
  sheet.innerHTML = `
    <div class="sh-top"><button class="icon-btn" id="shBack">${ICON.back}</button>${avatar(p)}
      <div class="t"><div class="nm"><b>${esc(p.sym || '…')}</b><span>/${esc(p.quote || '')}</span></div><div class="sub">${esc(p.dex || '')} · ${esc(netShort(p.net))}</div></div>
      <button class="star ${inWatch(p) ? 'on' : ''}" id="shStar">${ICON.star}</button></div>
    <div class="hero"><span class="price num">${fmtPrice(p.price)}</span><span class="chg num">${fmtPct(p.ch.h24)}</span></div>
    <div class="periods">${[['5M', 'm5'], ['1H', 'h1'], ['6H', 'h6'], ['24H', 'h24']].map(([l, k]) => `<div class="period"><small>${l}</small><span class="num">${fmtPct(p.ch[k])}</span></div>`).join('')}</div>
    <div class="chart-box"><div class="tfs">${TFS.map(([l, , , pr]) => `<button class="tf ${l === curTf ? 'on' : ''}" data-tf="${l}">${l}${pr && !isPro() ? '<span class="lock">🔒</span>' : ''}</button>`).join('')}</div><canvas id="cv"></canvas></div>
    <div class="grid">
      <div class="stat"><small>${t('liquidity')}</small><b class="num">${fmtUsd(p.liq)}</b></div>
      <div class="stat"><small>${t('vol24')}</small><b class="num">${fmtUsd(p.vol.h24)}</b></div>
      <div class="stat"><small>${t('fdv')}</small><b class="num">${fmtUsd(p.fdv)}</b></div>
      <div class="stat"><small>${t('mcap')}</small><b class="num">${fmtUsd(p.mcap)}</b></div>
      <div class="stat"><small>${t('created')}</small><b class="num">${p.created ? ago(p.created) : '—'}</b></div>
      <div class="stat"><small>${t('buyers')} / ${t('sellers')}</small><b class="num">${tx.buyers ?? '—'} / ${tx.sellers ?? '—'}</b></div>
    </div>
    <div class="card"><h4>${t('txns24')}<span class="num" style="color:var(--text)">${(b + s).toLocaleString()}</span></h4>
      <div class="bar"><i style="width:${share}%"></i></div>
      <div class="bar-l"><span class="up num">${t('buys')} ${b.toLocaleString()}</span><span class="down num">${t('sells')} ${s.toLocaleString()}</span></div></div>
    <div class="card"><h4>${t('risk')} ${isPro() ? '' : '<span class="badge-pro" style="font-size:9px;padding:2px 7px">PRO</span>'}</h4>${riskHtml}</div>
    <div class="card"><h4>${t('trades')}<span class="live">LIVE</span></h4><div id="trd"><span class="spin"></span></div></div>
    <div class="foot">${esc(p.addr || '')}<br>${t('data_src')} · ${esc(t('disclaimer'))}</div>
    <div class="actions">
      <button class="act ${isPro() ? 'hot' : ''}" id="aAlert">${ICON.bell}${t('a_alert')}${isPro() ? '' : ' 🔒'}</button>
      <button class="act" id="aCopy">${ICON.copy}${t('a_copy')}</button>
      <button class="act" id="aWeb">${ICON.web}${t('a_web')}</button>
      <button class="act" id="aShare">${ICON.share}${t('a_share')}</button></div>`;
  $('#shBack').onclick = closePool;
  $('#shStar').onclick = () => { toggleWatch(cur); $('#shStar').classList.toggle('on', inWatch(cur)); };
  $('.tfs').onclick = e => {
    const b2 = e.target.closest('.tf'); if (!b2) return;
    const tf = TFS.find(x => x[0] === b2.dataset.tf);
    if (tf[3] && !isPro()) return showUnlock(t('min_tf'));
    curTf = tf[0];
    document.querySelectorAll('.tf').forEach(x => x.classList.toggle('on', x === b2));
    loadChart();
  };
  $('#aAlert').onclick = () => alertDialog(cur);
  $('#aCopy').onclick = () => copy(cur.token || cur.addr);
  const url = () => `https://www.geckoterminal.com/${cur.net}/pools/${cur.addr}`;
  $('#aWeb').onclick = () => { if (H) H.open(url()); else window.open(url()); };
  $('#aShare').onclick = () => { const txt = `${cur.sym}/${cur.quote} ${fmtPrice(cur.price)} (${cur.ch.h24 != null ? (cur.ch.h24 >= 0 ? '+' : '') + cur.ch.h24.toFixed(2) + '%' : ''} 24h)\n${url()}\n— via PoolHawk 🦅`; if (H) H.share('PoolHawk', txt); else copy(txt); };
  if (lastCandles && lastCandles.k === key(p) + curTf) drawChart(lastCandles.c); else drawChart(null);
}
let lastCandles = null;
async function loadPool(quiet) {
  const p = cur;
  if (!p) return;
  try {
    const res = await apiRetry(`/networks/${p.net}/pools/${p.addr}?${INC}`);
    res.data && (res.data.relationships = Object.assign(res.data.relationships || {}, {network: {data: {id: p.net}}}));
    const fresh = parsePools(res)[0];
    if (fresh && cur && key(cur) === key(fresh)) {
      const y = sheet.scrollTop;
      cur = Object.assign(cur, fresh);
      renderPool();
      sheet.scrollTop = y;
    }
  } catch (e) { if (!quiet) toast(e.message === 'rate' ? t('rate') : t('offline')); }
  loadChart();
  loadTrades();
}
async function loadChart() {
  const p = cur;
  if (!p) return;
  const tf = TFS.find(x => x[0] === curTf);
  try {
    const res = await apiRetry(`/networks/${p.net}/pools/${p.addr}/ohlcv/${tf[1]}?aggregate=${tf[2]}&limit=120&currency=usd`);
    const list = ((res.data && res.data.attributes && res.data.attributes.ohlcv_list) || []).slice().reverse();
    if (!cur || key(cur) !== key(p) || curTf !== tf[0]) return;
    lastCandles = {k: key(p) + tf[0], c: list};
    drawChart(list);
  } catch (e) { drawChart([]); }
}
async function loadTrades() {
  const p = cur;
  if (!p) return;
  try {
    const res = await apiRetry(`/networks/${p.net}/pools/${p.addr}/trades`);
    const box = $('#trd');
    if (!box || !cur || key(cur) !== key(p)) return;
    const list = (res.data || []).slice(0, 15).map(d => d.attributes);
    box.innerHTML = list.length ? list.map(tr => tradeRow(tr, false)).join('') : `<span class="dim">—</span>`;
  } catch (e) { const box = $('#trd'); if (box) box.innerHTML = '<span class="dim">—</span>'; }
}

/* candlestick chart on a canvas */
function drawChart(c) {
  const cv = $('#cv');
  if (!cv) return;
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, Hh = cv.clientHeight;
  cv.width = W * dpr; cv.height = Hh * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  g.clearRect(0, 0, W, Hh);
  g.font = '10px Roboto Mono, monospace';
  if (!c || !c.length) {
    g.fillStyle = '#566079'; g.textAlign = 'center';
    g.fillText(c ? '—' : '···', W / 2, Hh / 2);
    return;
  }
  const padR = 62, padT = 10, volH = Hh * 0.18, chartH = Hh - padT - volH - 18;
  const cw = (W - padR - 4) / c.length;
  let lo = Infinity, hi = -Infinity, vmax = 0;
  c.forEach(k => { lo = Math.min(lo, k[3]); hi = Math.max(hi, k[2]); vmax = Math.max(vmax, k[5]); });
  if (hi === lo) { hi *= 1.01; lo *= 0.99; }
  const y = v => padT + (hi - v) / (hi - lo) * chartH;
  g.strokeStyle = 'rgba(255,255,255,.05)'; g.fillStyle = '#566079'; g.textAlign = 'left';
  for (let i = 0; i <= 4; i++) {
    const v = hi - (hi - lo) * i / 4, yy = y(v);
    g.beginPath(); g.moveTo(0, yy); g.lineTo(W - padR, yy); g.stroke();
    g.fillText(fmtPrice(v).replace('$', ''), W - padR + 6, yy + 3);
  }
  c.forEach((k, i) => {
    const x = 2 + i * cw + cw / 2, up = k[4] >= k[1];
    const col = up ? '#18E08B' : '#FF4D6A';
    g.fillStyle = up ? 'rgba(24,224,139,.22)' : 'rgba(255,77,106,.22)';
    const vh = vmax ? k[5] / vmax * volH : 0;
    g.fillRect(x - cw * 0.35, Hh - 18 - vh, Math.max(1, cw * 0.7), vh);
    g.strokeStyle = col; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y(k[2])); g.lineTo(x, y(k[3])); g.stroke();
    g.fillStyle = col;
    const top = y(Math.max(k[1], k[4])), bh = Math.max(1, Math.abs(y(k[1]) - y(k[4])));
    g.fillRect(x - cw * 0.34, top, Math.max(1, cw * 0.68), bh);
  });
  const last = c[c.length - 1][4], ly = y(last);
  g.setLineDash([3, 3]); g.strokeStyle = '#FFB020'; g.beginPath(); g.moveTo(0, ly); g.lineTo(W - padR, ly); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#FFB020'; g.fillRect(W - padR + 1, ly - 8, padR - 2, 16);
  g.fillStyle = '#1a0f00'; g.fillText(fmtPrice(last).replace('$', ''), W - padR + 5, ly + 3.5);
  const fmtT = ts => { const d = new Date(ts * 1000); return curTf === '1D' ? d.toLocaleDateString(settings.lang, {day: '2-digit', month: '2-digit'}) : d.toLocaleTimeString(settings.lang, {hour: '2-digit', minute: '2-digit'}); };
  g.fillStyle = '#566079'; g.textAlign = 'center';
  [0.15, 0.5, 0.85].forEach(f => { const i = Math.floor(c.length * f); g.fillText(fmtT(c[i][0]), 2 + i * cw + cw / 2, Hh - 4); });
  // touch crosshair
  const touch = ev => {
    const rect = cv.getBoundingClientRect(), pt = ev.touches ? ev.touches[0] : ev;
    const i = Math.max(0, Math.min(c.length - 1, Math.floor((pt.clientX - rect.left - 2) / cw)));
    drawChart(c);
    const k = c[i], x = 2 + i * cw + cw / 2, gg = cv.getContext('2d');
    gg.save(); gg.scale(1, 1);
    gg.strokeStyle = 'rgba(255,255,255,.35)'; gg.setLineDash([2, 3]);
    gg.beginPath(); gg.moveTo(x, padT); gg.lineTo(x, Hh - 18); gg.stroke(); gg.setLineDash([]);
    const txt = [`${fmtT(k[0])}`, `O ${fmtPrice(k[1])}`, `H ${fmtPrice(k[2])}`, `L ${fmtPrice(k[3])}`, `C ${fmtPrice(k[4])}`, `V ${fmtUsd(k[5])}`];
    const bx = x > W / 2 ? 8 : W - padR - 118;
    gg.fillStyle = 'rgba(17,23,38,.94)'; gg.strokeStyle = '#26304A';
    gg.fillRect(bx, padT, 110, 84); gg.strokeRect(bx, padT, 110, 84);
    gg.fillStyle = '#E9EDF5'; gg.textAlign = 'left';
    txt.forEach((s2, j) => gg.fillText(s2, bx + 8, padT + 14 + j * 12.5));
    gg.restore();
  };
  cv.ontouchstart = cv.ontouchmove = cv.onmousemove = touch;
  cv.ontouchend = cv.onmouseleave = () => drawChart(c);
}

/* ---------- modal, Pro, settings ---------- */
const modal = $('#modal');
function openModal(html) {
  modal.innerHTML = `<div class="dlg">${html}</div>`;
  modal.hidden = false;
  modal.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
}
function closeModal() { modal.hidden = true; modal.innerHTML = ''; }
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('click', e => { if (e.target.closest('[data-unlock]')) showUnlock(); });

function showUnlock(reason) {
  refreshPro();
  const feats = [['🔔', 'f_alerts'], ['🛰️', 'f_new'], ['⭐', 'f_lists'], ['🐋', 'f_whales'], ['🕯️', 'f_tf'], ['🛡️', 'f_risk']];
  if (isPro()) {
    openModal(`<div class="grabber"></div><span class="badge-pro">PRO</span><h3 style="margin-top:10px">✓ ${t('pro_active')}</h3>
      ${info.to ? `<p>${esc(t('licensed_to', info.to))}</p>` : ''}<ul class="feat">${feats.map(([i, k]) => `<li><span>${i}</span><span>${t(k)}</span></li>`).join('')}</ul>
      <button class="btn" data-close style="width:100%">${t('close')}</button>`);
    return;
  }
  openModal(`<div class="grabber"></div><span class="badge-pro">PRO</span>
    <h3 style="margin-top:10px">${t('pro_title')}</h3>
    ${reason ? `<p style="color:var(--amber)">${esc(reason)}</p>` : ''}
    <p>${esc(t('pro_lead', info.price))}</p>
    <ul class="feat">${feats.map(([i, k]) => `<li><span>${i}</span><span>${t(k)}</span></li>`).join('')}</ul>
    <p>${esc(t('pro_how', info.price, info.email))}</p>
    ${(info.pay || []).map(([n, a]) => `<button class="pay" data-copy="${esc(a)}"><small>${esc(n)}</small><span>${esc(a)}</span></button>`).join('')}
    <p style="margin-bottom:4px">${t('device_code')} · <span style="font-size:12px">${t('tap_copy')}</span></p>
    <button class="code" data-copy="${esc(info.code)}">${esc(info.code)}</button>
    <button class="btn amber" id="mail" style="width:100%">✉️ ${t('request_mail')}</button>
    <textarea id="lk" placeholder="${esc(t('key_ph'))}" style="margin-top:12px"></textarea>
    <div class="msg" id="lkMsg"></div>
    <div class="row-btns"><button class="btn" data-close>${t('cancel')}</button><button class="cta" id="lkOk">${t('activate')}</button></div>`);
  modal.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copy(b.dataset.copy));
  $('#mail').onclick = () => {
    const u = `mailto:${info.email}?subject=${encodeURIComponent(t('mail_subject'))}&body=${encodeURIComponent(t('mail_body', info.code))}`;
    if (H) H.open(u); else location.href = u;
  };
  $('#lkOk').onclick = () => {
    const k = $('#lk').value.trim();
    const st = H ? H.activate(k) : 1;
    const m = $('#lkMsg');
    if (st === 0) {
      m.innerHTML = `<span class="up">${t('act_ok')}</span>`;
      refreshPro();
      setTimeout(() => { closeModal(); go(tab); if (cur) renderPool(); }, 1200);
    } else m.innerHTML = `<span class="down">${st === 2 ? t('act_dev') : t('act_bad')}</span>`;
  };
}

function showSettings() {
  refreshPro();
  openModal(`<div class="grabber"></div><h3>${t('settings')}</h3>
    <div class="set-row"><span>${t('language')}</span><div class="seg" style="margin:0;width:150px"><button data-l="en" class="${settings.lang === 'en' ? 'on' : ''}">English</button><button data-l="de" class="${settings.lang === 'de' ? 'on' : ''}">Deutsch</button></div></div>
    <div class="set-row"><span>PoolHawk Pro</span>${isPro() ? `<span class="up">✓ ${t('pro_active')}</span>` : `<button class="btn small amber" data-unlock>${t('unlock')}</button>`}</div>
    <div class="set-row"><span>${t('device_code')}</span><button class="num" style="color:var(--amber);font-size:13px" data-copy="${esc(info.code)}">${esc(info.code)}</button></div>
    <div class="set-row"><span>${t('version')}</span><span class="dim">${esc(info.version)}</span></div>
    <p style="margin-top:14px">${t('data_src')}<br>${esc(t('disclaimer'))}</p>
    <button class="btn" data-close style="width:100%">${t('close')}</button>`);
  modal.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { settings.lang = b.dataset.l; saveSettings(); applyLang(); closeModal(); showSettings(); go(tab); if (cur) renderPool(); });
  modal.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copy(b.dataset.copy));
}

/* ---------- navigation ---------- */
function applyLang() {
  document.documentElement.lang = settings.lang;
  document.querySelectorAll('[data-t]').forEach(e => { e.textContent = t(e.dataset.t); });
  qEl.placeholder = t('search');
}
function go(name) {
  tab = name;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  if (searchQ) return doSearch(searchQ);
  window.scrollTo(0, 0);
  ({trending: showTrending, new: showNew, watch: showWatch, whales: showWhales, alerts: showAlerts})[name]();
}
document.querySelector('.tabs').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (searchQ) { qEl.value = ''; $('#qClear').hidden = true; searchQ = ''; }
  editMode = false;
  go(b.dataset.tab);
};
$('#proBtn').onclick = () => showUnlock();
$('#setBtn').onclick = showSettings;
window.hawkBack = () => {
  if (!modal.hidden) { closeModal(); return true; }
  if (!sheet.hidden) { closePool(); return true; }
  if (searchQ) { qEl.value = ''; $('#qClear').hidden = true; searchQ = ''; go(tab); return true; }
  if (tab !== 'trending') { go('trending'); return true; }
  return false;
};

applyLang();
refreshPro();
go('trending');
