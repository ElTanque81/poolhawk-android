/* PoolHawk for PC/Mac browsers: implements the same window.Hawk bridge the Android app provides natively,
   so the shared app.js runs unchanged. Data: GeckoTerminal, GoPlus, Jupiter. Wallets: Phantom, Solflare & co.
   through the Wallet Standard (keys never leave the wallet). Pro: same license keys as the Android app. */
'use strict';
(function () {
  const LS = 'phw_';
  const lsGet = k => { try { return localStorage.getItem(LS + k) || ''; } catch (e) { return ''; } };
  const lsSet = (k, v) => { try { localStorage.setItem(LS + k, v); } catch (e) { /* private mode */ } };
  const cb = (id, ok, body) => setTimeout(() => window.hawkCb && window.hawkCb(id, ok, typeof body === 'string' ? body : JSON.stringify(body)), 0);

  /* ---------- SHA-256 (sync, for the license check) ---------- */
  function sha256(bytes) {
    const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
    m.set(bytes); m[l] = 0x80;
    const dv = new DataView(m.buffer); dv.setUint32(n - 4, l * 8); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
    const w = new Uint32Array(64), r = (x, s) => (x >>> s) | (x << (32 - s));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32), od = new DataView(out.buffer);
    H.forEach((v, i) => od.setUint32(i * 4, v));
    return out;
  }
  const enc = s => new TextEncoder().encode(s);
  const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  const unhex = s => new Uint8Array(s.match(/../g).map(h => parseInt(h, 16)));
  const b64url = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
  const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  /* ---------- license: identical check to License.java ---------- */
  const N = BigInt('0xc843d7dfa651b24d753cb005491b8cec89f47e1d117732b043ea5156b47dc96f0e8aee94966226f7b8eb9d183d3b82fd17f1e63d7335315151d497e13356635d9dfb23cb4e016daefd802f427060d01342902d17bdb4c08ee3910f5daaedaaec2992b73478808a382cbfb7740debbbacf7c91c846d6445af68591153b6f1d6a4ba2142cc1391470fafc1a12e8920ab3a42064467f7da3c0846282004804a37267322287718fc46e6699b6741c75e4a64a1f72679c7f6d960ed2397089e1149b2927a1e546603a9cca2e827d93bcb483d46619c81d6eeb9fa003738f3a602176e29cb414f9efd6a87e07858c2f55747059a47891eec44054f8498c4710ccc8ec5');
  const KEY_HASH = unhex('85762458f6207282327f908b1582a9f27f91ab24ed4834fde55507f8054e2e4b');
  const DIGEST_INFO = unhex('3031300d060960864801650304020105000420');
  function modpow(b, e, m) { let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; } return r; }
  function checkLicense(key, code) {
    try {
      const k = (key || '').replace(/\s+/g, '');
      if (!k.startsWith('SSW1-')) return {status: 1, to: ''};
      const parts = k.slice(5).split('.');
      if (parts.length !== 2) return {status: 1, to: ''};
      const payload = b64url(parts[0]), sig = b64url(parts[1]);
      const size = 256;
      let em = modpow(BigInt('0x' + (hex(sig) || '0')), 65537n, N).toString(16).padStart(size * 2, '0');
      const digest = sha256(payload), want = new Uint8Array(size), tail = DIGEST_INFO.length + 32;
      want[1] = 1; want.fill(0xff, 2, size - tail - 1); want.set(DIGEST_INFO, size - tail); want.set(digest, size - 32);
      if (em !== hex(want)) return {status: 1, to: ''};
      let json = new TextDecoder().decode(payload);
      let to = '';
      const mt = json.match(/"to":"((?:[^"\\]|\\.)*)"/);
      if (mt) { try { to = JSON.parse('"' + mt[1] + '"'); } catch (e) { to = mt[1]; } json = json.replace(mt[0], ''); }
      const mi = json.match(/"id":"([0-9a-f]{1,32})"/), mw = json.match(/"w":\[([^\]]*)\]/);
      if (!mi || !mw) return {status: 1, to: ''};
      const pad = sha256(enc('wrap|' + code.replace(/-/g, '').toUpperCase() + '|' + mi[1]));
      for (const w of (mw[1].match(/[0-9a-f]{64}/g) || [])) {
        const master = unhex(w).map((x, i) => x ^ pad[i]);
        if (eq(sha256(master), KEY_HASH)) return {status: 0, to};
      }
      return {status: 2, to};
    } catch (e) { return {status: 1, to: ''}; }
  }
  function deviceCode() {
    let id = lsGet('device');
    if (!id) { id = hex(crypto.getRandomValues(new Uint8Array(16))); lsSet('device', id); }
    const h = hex(sha256(enc('poolhawk-web|' + id))).slice(0, 20).toUpperCase();
    return [h.slice(0, 5), h.slice(5, 10), h.slice(10, 15), h.slice(15, 20)].join('-');
  }
  let pro = checkLicense(lsGet('license'), deviceCode());

  /* ---------- networking ---------- */
  const GT = 'https://api.geckoterminal.com/api/v2';
  async function gt(path) {
    const opt = {headers: {Accept: 'application/json;version=20230302'}};
    let r;
    try { r = await fetch(GT + path, opt); } catch (e) { r = await fetch('/api/gt' + path, opt); }
    if (r.status === 429) { const e = new Error('429'); e.code = 429; throw e; }
    if (!r.ok) throw new Error(String(r.status));
    return r.text();
  }
  async function jsonFetch(url, init) {
    const r = await fetch(url, init);
    const t = await r.text();
    if (r.status === 429) throw new Error('429');
    if (!r.ok && !t) throw new Error(String(r.status));
    return t;
  }

  /* ---------- Wallet Standard (Phantom, Solflare, Backpack, ...) ---------- */
  const wallets = [];
  const reg = w => { if (w && w.features && (w.features['solana:signTransaction'] || w.features['solana:signAndSendTransaction']) && !wallets.includes(w)) wallets.push(w); };
  const api = {register: (...ws) => { ws.forEach(reg); return () => {}; }};
  window.addEventListener('wallet-standard:register-wallet', e => { try { e.detail(api); } catch (x) { /* ignore */ } });
  try { window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', {detail: api})); } catch (e) { /* ignore */ }
  let active = null, account = null;
  const A58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function b58(bytes) { let n = BigInt('0x' + (hex(bytes) || '0')), s = ''; while (n > 0n) { s = A58[Number(n % 58n)] + s; n /= 58n; } for (const x of bytes) { if (x) break; s = '1' + s; } return s; }
  const toB64 = u8 => btoa(String.fromCharCode.apply(null, Array.from(u8)));
  const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  function pickWallet() {
    return new Promise((res, rej) => {
      if (!wallets.length) return rej(new Error('nowallet'));
      const last = lsGet('wallet_name'), keep = wallets.find(w => w.name === last);
      if (wallets.length === 1 || keep) return res(keep || wallets[0]);
      const o = document.createElement('div');
      o.className = 'modal';
      o.style.zIndex = 90;
      o.innerHTML = `<div class="dlg" style="max-width:380px"><h3>👛 Wallet</h3><p></p>${wallets.map((w, i) => `<button class="pay" data-i="${i}" style="display:flex;align-items:center;gap:12px"><img src="${w.icon}" width="28" height="28" style="border-radius:8px"><span style="font-family:inherit;font-size:15px;font-weight:700">${w.name.replace(/</g, '')}</span></button>`).join('')}<button class="btn" data-x style="width:100%">✕</button></div>`;
      document.body.appendChild(o);
      o.onclick = e => {
        const b = e.target.closest('[data-i]');
        if (b) { o.remove(); return res(wallets[+b.dataset.i]); }
        if (e.target === o || e.target.closest('[data-x]')) { o.remove(); rej(new Error('cancel')); }
      };
    });
  }
  async function connect() {
    const w = await pickWallet();
    const r = await w.features['standard:connect'].connect();
    const acc = (r && r.accounts && r.accounts[0]) || w.accounts[0];
    if (!acc) throw new Error('cancel');
    active = w; account = acc;
    lsSet('wallet_name', w.name);
    lsSet('wallet_addr', acc.address);
    return {ok: true, address: acc.address, label: w.name};
  }
  async function ensureWallet() { if (!active || !account) await connect(); }
  async function swap(inputMint, outputMint, amount) {
    await ensureWallet();
    const addr = account.address;
    const order = JSON.parse(await jsonFetch(`https://api.jup.ag/swap/v2/order?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&taker=${addr}`));
    if (!order.transaction) return {ok: false, error: order.errorMessage || order.error || 'noroute', address: addr};
    const tx = fromB64(order.transaction), chain = 'solana:mainnet';
    if (active.features['solana:signTransaction']) {
      const [out] = await active.features['solana:signTransaction'].signTransaction({account, transaction: tx, chain});
      const res = JSON.parse(await jsonFetch('https://api.jup.ag/swap/v2/execute', {method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({signedTransaction: toB64(out.signedTransaction), requestId: order.requestId})}));
      const ok = /success/i.test(res.status || '');
      return {ok, signature: res.signature, error: ok ? '' : (res.error || res.status), address: addr};
    }
    const [sent] = await active.features['solana:signAndSendTransaction'].signAndSendTransaction({account, transaction: tx, chain});
    return {ok: true, signature: b58(sent.signature), address: addr};
  }
  async function balances(address, mint) {
    const rpc = body => jsonFetch('https://api.mainnet-beta.solana.com', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}).then(JSON.parse);
    const out = {};
    const b = await rpc({jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address]});
    out.lamports = b.result ? b.result.value : 0;
    for (const prog of ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb']) {
      const r = await rpc({jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner', params: [address, {mint}, {encoding: 'jsonParsed'}]});
      const v = r.result && r.result.value;
      if (v && v.length) { const ta = v[0].account.data.parsed.info.tokenAmount; return Object.assign(out, {amount: ta.amount, decimals: ta.decimals, ui: ta.uiAmount}); }
      if (prog) break; // getTokenAccountsByOwner with a mint filter already covers both programs
    }
    out.amount = '0';
    return out;
  }

  /* ---------- alerts while the tab is open (port of Watcher.java) ---------- */
  const loadJ = (k, d) => { try { return JSON.parse(lsGet('data_' + k)) || d; } catch (e) { return d; } };
  const saveJ = (k, v) => lsSet('data_' + k, JSON.stringify(v));
  const fmtP = p => p >= 1000 ? '$' + p.toLocaleString('en-US', {maximumFractionDigits: 2}) : p >= 1 ? '$' + p.toFixed(4) : '$' + p.toPrecision(4);
  const fmtU = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + Math.round(v);
  const de = () => (loadJ('settings', {}).lang || (navigator.language || '').slice(0, 2)) === 'de';
  async function event(kind, title, text, net, addr) {
    const ev = loadJ('events', []);
    ev.unshift({t: Date.now(), kind, title, text, net, addr});
    saveJ('events', ev.slice(0, 50));
    try { if (window.Notification && Notification.permission === 'granted') new Notification(title, {body: text, icon: 'poolhawk-logo.png', tag: kind + addr + Date.now()}); } catch (e) { /* ignore */ }
    const tg = (loadJ('smart', {}) || {}).tg;
    if ((pro.status === 0 || kind === 'price') && tg && tg.on && tg.token && tg.chat) {
      try {
        await fetch('/api/tg', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token: tg.token, method: 'sendMessage',
          params: {chat_id: tg.chat, disable_web_page_preview: true, text: `🦅 PoolHawk\n${title}\n${text}\nhttps://www.geckoterminal.com/${net}/pools/${addr}`}})});
      } catch (e) { /* offline */ }
    }
  }
  const trig = (k, v, ref, p) => p > 0 && (k === 'above' ? p >= v : k === 'below' ? p <= v : k === 'up' ? ref > 0 && p >= ref * (1 + v / 100) : k === 'down' ? ref > 0 && p <= ref * (1 - v / 100) : false);
  async function multi(net, addrs) {
    const out = {};
    for (let i = 0; i < addrs.length; i += 30) {
      try { (JSON.parse(await gt(`/networks/${net}/pools/multi/${addrs.slice(i, i + 30).join(',')}`)).data || []).forEach(d => { out[net + '/' + d.attributes.address.toLowerCase()] = d.attributes; }); } catch (e) { /* skip */ }
    }
    return out;
  }
  let running = false;
  async function runWatcher() {
    if (running) return 0;
    running = true;
    let sent = 0;
    try {
      const D = de();
      const al = loadJ('alerts', []), byNet = {};
      al.filter(a => a.on !== false && !a.hit).forEach(a => { (byNet[a.net] = byNet[a.net] || []).includes(a.addr) || byNet[a.net].push(a.addr); });
      const px = {};
      for (const [net, addrs] of Object.entries(byNet)) Object.assign(px, await multi(net, addrs));
      const hits = {};
      for (const a of al) {
        if (a.on === false || a.hit) continue;
        const at = px[a.net + '/' + String(a.addr).toLowerCase()], p = at ? +at.base_token_price_usd : 0;
        if (at && trig(a.kind, +a.value, +a.ref, p)) {
          hits[a.id] = p;
          const cond = a.kind === 'above' ? (D ? 'über ' : 'above ') + fmtP(+a.value) : a.kind === 'below' ? (D ? 'unter ' : 'below ') + fmtP(+a.value) : (a.kind === 'up' ? '+' : '-') + a.value + '%';
          await event('price', `🔔 ${a.name} ${cond}`, (D ? 'Preis jetzt ' : 'Price now ') + fmtP(p), a.net, a.addr); sent++;
        }
      }
      if (Object.keys(hits).length) { const f = loadJ('alerts', []); f.forEach(a => { if (hits[a.id] != null) Object.assign(a, {hit: true, hitAt: Date.now(), hitPrice: hits[a.id]}); }); saveJ('alerts', f); }
      if (pro.status !== 0) return sent;

      const items = [];
      (loadJ('lists', []) || []).forEach(l => (l.items || []).forEach(i => { if (items.length < 60 && !items.some(x => x.net === i.net && x.addr === i.addr)) items.push(i); }));
      const cfg = loadJ('smart', {}), snap = loadJ('snap', {}), wnet = {};
      items.forEach(i => { (wnet[i.net] = wnet[i.net] || []).push(i.addr); });
      const attrs = {};
      if (items.length && ((cfg.rug && cfg.rug.on) || (cfg.spike && cfg.spike.on))) for (const [net, addrs] of Object.entries(wnet)) Object.assign(attrs, await multi(net, addrs));
      for (const i of items) {
        const k = i.net + '/' + String(i.addr).toLowerCase(), at = attrs[k];
        if (!at) continue;
        const prev = snap[k] || {}, liq = +at.reserve_in_usd, name = i.sym + (i.quote ? '/' + i.quote : '');
        if (cfg.rug && cfg.rug.on && prev.liq >= 1000 && liq <= prev.liq * (1 - (cfg.rug.drop || 30) / 100)) {
          await event('rug', `🚨 ${name}: ${D ? 'Liquidität' : 'liquidity'} -${Math.round(100 * (1 - liq / prev.liq))}%`, `${fmtU(prev.liq)} → ${fmtU(liq)} · ${D ? 'möglicher Rug Pull' : 'possible rug pull'}`, i.net, i.addr); sent++;
        }
        const h1 = +((at.volume_usd || {}).h1 || 0), h24 = +((at.volume_usd || {}).h24 || 0);
        if (cfg.spike && cfg.spike.on && Date.now() - (prev.spikeAt || 0) > 6 * 3600e3 && h1 >= 5000 && h24 > 0 && h1 >= h24 / 24 * (cfg.spike.factor || 5)) {
          await event('spike', `📈 ${name}: ${D ? 'Volumen' : 'volume'} ${(h1 / (h24 / 24)).toFixed(1)}×`, `${D ? 'Letzte Stunde' : 'Last hour'} ${fmtU(h1)}`, i.net, i.addr); prev.spikeAt = Date.now(); sent++;
        }
        if (!isNaN(liq)) prev.liq = liq;
        snap[k] = prev;
      }
      saveJ('snap', snap);
      const np = cfg.newp;
      if (np && np.on && window.parsePools && window.riskOf) {
        const net = np.net || 'all', first = !np.seen || np.seenNet !== net, seen = new Set(np.seen || []);
        try {
          const res = JSON.parse(await gt(net === 'all' ? '/networks/new_pools?include=base_token,quote_token,dex,network&page=1' : `/networks/${net}/new_pools?include=base_token,quote_token,dex&page=1`));
          if (net !== 'all') (res.data || []).forEach(d => { d.relationships = Object.assign(d.relationships || {}, {network: {data: {id: net}}}); });
          let shown = 0;
          for (const p of window.parsePools(res)) {
            const id = p.net + '_' + p.addr;
            if (seen.has(id)) continue;
            seen.add(id);
            if (first) continue;
            const r = window.riskOf(p), lvl = {low: 0, med: 1, high: 2}[r.level];
            if (p.liq == null || p.liq < (np.minLiq || 20000) || lvl > (np.maxRisk || 0) || shown >= 4) continue;
            await event('new', `🛰️ ${D ? 'Neuer Pool' : 'New pool'}: ${p.name}`, `Liq ${fmtU(p.liq)} · ${D ? 'Risiko' : 'risk'} ${r.level} · ${p.net.toUpperCase()}`, p.net, p.addr); shown++; sent++;
          }
          const f = loadJ('smart', {}); if (f.newp) { f.newp.seen = Array.from(seen).slice(-300); f.newp.seenNet = net; saveJ('smart', f); }
        } catch (e) { /* offline */ }
      }
      const wh = loadJ('whale', {});
      if (wh.notify) {
        wh.seen = wh.seen || {};
        for (const i of items.slice(0, 6)) {
          try {
            const k = i.net + '/' + String(i.addr).toLowerCase(), last = wh.seen[k] || 0;
            const data = JSON.parse(await gt(`/networks/${i.net}/pools/${i.addr}/trades?trade_volume_in_usd_greater_than=${Math.round(wh.min || 10000)}`)).data || [];
            let newest = last, shown = 0;
            for (const d of data) {
              const a = d.attributes, ts = Date.parse(a.block_timestamp);
              newest = Math.max(newest, ts);
              if (!last || ts <= last || shown >= 3) continue;
              await event('whale', `🐋 ${i.sym}: ${a.kind === 'buy' ? (D ? 'Kauf' : 'Buy') : (D ? 'Verkauf' : 'Sell')} ${fmtU(+a.volume_in_usd)}`, 'Wallet ' + String(a.tx_from_address).slice(0, 6) + '…', i.net, i.addr); shown++; sent++;
            }
            wh.seen[k] = newest || Date.now();
          } catch (e) { /* skip */ }
        }
        const f = loadJ('whale', {}); f.seen = wh.seen; saveJ('whale', f);
      }
    } finally { running = false; }
    return sent;
  }

  /* ---------- the bridge ---------- */
  window.Hawk = {
    platform: 'web',
    get(id, path) { gt(path).then(t => cb(id, true, t), e => cb(id, false, e.code === 429 ? '429' : '0')); },
    load: k => lsGet('data_' + k) || (k.startsWith('wallet_') ? lsGet(k) : ''),
    save: (k, v) => lsSet('data_' + k, v),
    isPro: () => pro.status === 0,
    proInfo: () => JSON.stringify({pro: pro.status === 0, to: pro.status === 0 ? pro.to : '', code: deviceCode(), price: '$4.99', email: 'eltanque81@gmx.de', version: 'Web 1.5',
      pay: [['BTC (Bitcoin)', 'bc1qwslmfzxdzy36sup5ncfxr20culuv9y7v9j9lk7'], ['ETH (Ethereum)', '0x7F8d0743D2e796501a9197A1B4c44eCe1863E1d6'], ['BNB (BNB Smart Chain)', '0x7F8d0743D2e796501a9197A1B4c44eCe1863E1d6']]}),
    activate(key) { const r = checkLicense(key, deviceCode()); if (r.status === 0) { lsSet('license', key.replace(/\s+/g, '')); pro = r; } return r.status; },
    checkAlerts() { runWatcher().then(n => window.hawkAlertsChecked && window.hawkAlertsChecked(n), () => {}); },
    askNotify() { try { if (window.Notification && Notification.permission === 'default') Notification.requestPermission(); } catch (e) { /* ignore */ } },
    copy(text) { try { navigator.clipboard.writeText(text); } catch (e) { /* ignore */ } },
    share(title, text) {
      if (/\.csv$/i.test(title)) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], {type: 'text/csv'})); a.download = title; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      } else if (navigator.share) navigator.share({title, text}).catch(() => {});
      else { this.copy(text); if (window.toast) window.toast('📋'); }
    },
    open(url) { if (/^(https|mailto):/i.test(url)) window.open(url, '_blank', 'noopener'); },
    toast() {},
    widget() {},
    goplus(id, url) {
      if (!/^https:\/\/api\.gopluslabs\.io\/api\/v1\//.test(url)) return cb(id, false, '0');
      jsonFetch(url).catch(() => jsonFetch('/api/goplus/' + url.slice('https://api.gopluslabs.io/api/v1/'.length))).then(t => cb(id, true, t), () => cb(id, false, '0'));
    },
    telegram(id, what, token, chat) {
      fetch('/api/tg', {method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(what === 'updates' ? {token, method: 'getUpdates', params: {}} : {token, method: 'sendMessage', params: {chat_id: chat, text: '🦅 PoolHawk: Telegram alerts are on. / Telegram-Alarme sind aktiv.'}})})
        .then(r => r.ok ? r.text().then(t => cb(id, true, t)) : cb(id, false, String(r.status)), () => cb(id, false, '0'));
    },
    wallet(id, what, a, b, c) {
      const run = {
        available: async () => wallets.length > 0,
        connect,
        balances: () => balances(a, b),
        quote: () => jsonFetch(`https://api.jup.ag/swap/v2/order?inputMint=${a}&outputMint=${b}&amount=${c}`).then(JSON.parse),
        swap: () => swap(a, b, c),
        forget: async () => { active = null; account = null; lsSet('wallet_addr', ''); lsSet('wallet_name', ''); return true; },
      }[what];
      if (!run) return cb(id, false, 'what');
      run().then(r => cb(id, true, r), e => {
        const m = (e && (e.message || e.name)) || 'error';
        cb(id, false, /nowallet/.test(m) ? 'nowallet' : /reject|denied|cancel|declin/i.test(m) ? 'cancel: ' + m : m);
      });
    },
  };
})();
