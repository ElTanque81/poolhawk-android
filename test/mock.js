// Browser preview only: a fake window.Hawk bridge with generated market data (never shipped in the APK).
(function () {
  const params = new URLSearchParams(location.search);
  const PRO = params.get('pro') === '1';
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const SYMS = [['SOL', 'USDC', 'solana', 'Raydium', 182.4], ['WIF', 'SOL', 'solana', 'Orca', 2.31], ['PEPE', 'WETH', 'eth', 'Uniswap V3', 0.00001234], ['BONK', 'SOL', 'solana', 'Raydium', 0.0000271],
    ['BRETT', 'WETH', 'base', 'Aerodrome', 0.1432], ['CAKE', 'WBNB', 'bsc', 'PancakeSwap', 2.71], ['TOSHI', 'WETH', 'base', 'Uniswap V3', 0.000312], ['ARB', 'USDC', 'arbitrum', 'Camelot', 0.84],
    ['POPCAT', 'SOL', 'solana', 'Meteora', 1.12], ['MOG', 'WETH', 'eth', 'Uniswap V2', 0.0000019], ['TURBO', 'WETH', 'eth', 'Uniswap V3', 0.0081], ['GIGA', 'SOL', 'solana', 'Raydium', 0.042]];
  const NEWS = ['HAWK', 'NEOCAT', 'ZAPPY', 'RUGME', 'LUNARX', 'FROGG', 'MAXI', 'BLIP', 'ORBIT', 'KRILL'];
  const addr = i => '0x' + (i * 2654435761 >>> 0).toString(16).padStart(8, '0') + 'a3f9c1d2e4b5'.repeat(2) + i.toString(16).padStart(4, '0');
  function pool(i, s, fresh) {
    const [sym, q, net, dex, price] = s;
    const liq = fresh ? 3000 + rnd() * 90000 : 2e5 + rnd() * 4e7;
    const buys = Math.floor(rnd() * 4000) + 5, sells = fresh && i % 3 === 0 ? 0 : Math.floor(buys * (0.3 + rnd()));
    const a = addr(i + (fresh ? 500 : 0));
    return {
      data: {id: net + '_' + a, type: 'pool', attributes: {
        name: sym + ' / ' + q, address: a, base_token_price_usd: String(price * (0.9 + rnd() * 0.2)),
        fdv_usd: String(liq * (fresh ? 20 + rnd() * 120 : 5 + rnd() * 30)), market_cap_usd: null, reserve_in_usd: String(liq),
        pool_created_at: new Date(Date.now() - (fresh ? rnd() * 7.2e6 : 3e8 + rnd() * 3e10)).toISOString(),
        price_change_percentage: {m5: (rnd() - 0.45) * 4 + '', h1: (rnd() - 0.4) * (fresh ? 400 : 12) + '', h6: (rnd() - 0.4) * 30 + '', h24: (rnd() - 0.4) * (fresh ? 900 : 60) + ''},
        transactions: {h24: {buys, sells, buyers: Math.floor(buys * 0.6), sellers: Math.floor(sells * 0.6)}},
        volume_usd: {h1: String(liq * rnd() * 0.2), h24: String(liq * (0.5 + rnd() * 5))}, locked_liquidity_percentage: fresh ? String(Math.floor(rnd() * 100)) : null},
        relationships: {base_token: {data: {id: net + '_t' + i}}, quote_token: {data: {id: net + '_q' + q}}, dex: {data: {id: dex.toLowerCase().replace(/ /g, '-')}}, network: {data: {id: net}}}},
      inc: [{type: 'token', id: net + '_t' + i, attributes: {symbol: sym, name: sym, address: 'Tok' + a.slice(2), image_url: 'missing.png'}},
        {type: 'token', id: net + '_q' + q, attributes: {symbol: q}}, {type: 'dex', id: dex.toLowerCase().replace(/ /g, '-'), attributes: {name: dex}}],
    };
  }
  const pack = arr => ({data: arr.map(p => p.data), included: arr.flatMap(p => p.inc)});
  const TRENDING = SYMS.map((s, i) => pool(i, s, false));
  const NEW = NEWS.map((n, i) => pool(i, [n, i % 2 ? 'SOL' : 'WETH', i % 2 ? 'solana' : 'base', i % 2 ? 'Pump AMM' : 'Uniswap V4', 0.000042 * (i + 1)], true));
  const ALL = TRENDING.concat(NEW);
  function ohlcv(p) {
    let v = p * 0.8;
    const out = [], now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < 120; i++) {
      const o = v, c = o * (1 + (rnd() - 0.47) * 0.06), h = Math.max(o, c) * (1 + rnd() * 0.02), l = Math.min(o, c) * (1 - rnd() * 0.02);
      out.unshift([now - (119 - i) * 3600, o, h, l, c, 1e4 + rnd() * 2e5]);
      v = c;
    }
    return {data: {attributes: {ohlcv_list: out}}};
  }
  function trades(min) {
    const out = [];
    for (let i = 0; i < 20; i++) out.push({attributes: {block_timestamp: new Date(Date.now() - i * 95000 - rnd() * 60000).toISOString(), kind: rnd() > 0.45 ? 'buy' : 'sell',
      volume_in_usd: String((min || 50) * (1 + rnd() * 8)), tx_from_address: '0x' + Math.floor(rnd() * 1e16).toString(16) + 'beef' + i, tx_hash: '0x' + i}});
    return {data: out};
  }
  const find = a => ALL.find(p => p.data.attributes.address.toLowerCase() === a.toLowerCase());
  function route(path) {
    const u = new URL('http://x' + path);
    const p = u.pathname;
    if (p.endsWith('/trending_pools')) return pack(p.startsWith('/networks/trending') ? TRENDING : TRENDING.filter(x => p.includes('/' + x.data.relationships.network.data.id + '/')));
    if (p.endsWith('/new_pools')) return pack(NEW);
    if (p.startsWith('/search/pools')) { const q = (u.searchParams.get('query') || '').toLowerCase(); return pack(ALL.filter(x => x.data.attributes.name.toLowerCase().includes(q))); }
    let m = p.match(/\/pools\/multi\/(.+)$/);
    if (m) return pack(m[1].split(',').map(find).filter(Boolean));
    m = p.match(/\/pools\/([^/]+)\/ohlcv\//);
    if (m) return ohlcv(+find(m[1]).data.attributes.base_token_price_usd);
    m = p.match(/\/pools\/([^/]+)\/trades/);
    if (m) return trades(+u.searchParams.get('trade_volume_in_usd_greater_than'));
    m = p.match(/\/pools\/([^/]+)$/);
    if (m) { const x = find(m[1]); return {data: x.data, included: x.inc}; }
    return {data: []};
  }
  const mem = {};
  window.Hawk = {
    get(id, path) { setTimeout(() => window.hawkCb(id, true, JSON.stringify(route(path))), 150); },
    load: k => mem[k] || localStorage.getItem('m_' + k) || '',
    save: (k, v) => { mem[k] = v; localStorage.setItem('m_' + k, v); },
    isPro: () => PRO,
    proInfo: () => JSON.stringify({pro: PRO, to: PRO ? 'Max Mustermann' : '', code: '7F3A2-91C0D-4B8E1-A6D25', price: '$9.99', email: 'eltanque81@gmx.de', version: '1.0',
      pay: [['BTC (Bitcoin)', 'bc1qwslmfzxdzy36sup5ncfxr20culuv9y7v9j9lk7'], ['ETH (Ethereum)', '0x7F8d0743D2e796501a9197A1B4c44eCe1863E1d6'], ['BNB (BNB Smart Chain)', '0x7F8d0743D2e796501a9197A1B4c44eCe1863E1d6']]}),
    activate: () => 1, checkAlerts() { setTimeout(() => window.hawkAlertsChecked(0), 300); }, askNotify() {}, copy() {}, share() {}, open() {}, toast() {},
  };
})();
