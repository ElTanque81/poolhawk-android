# PoolHawk for Android

Real-time DEX tracker: trending pools, new launches, live charts, watchlists, whale trades and price alerts across Solana, Ethereum, BSC, Base, Arbitrum, Polygon, Avalanche, TON, Sui and Tron.

Market data comes from the free public [GeckoTerminal API](https://www.geckoterminal.com/dex-api). No account, no tracking: watchlists and alerts stay on the phone.

## Free

- Trending pools per network, sortable by hot, volume, gainers and losers
- Search by token, pair or contract address
- Pool page: price, 5m/1h/6h/24h change, candlestick chart (1h, 4h, 1D), liquidity, FDV, buys vs. sells, latest trades
- One watchlist with up to 5 tokens

## Pro

- Price alerts (above, below, rises by %, falls by %) with notifications, also when the app is closed
- New-pool scanner with an automatic rug & risk check
- Unlimited watchlists and tokens, CSV export
- Whale tracker: big buys and sells in watchlist pools, with optional notifications
- Minute charts (1m, 5m, 15m)
- Risk check on every pool

The risk check gives hints from on-chain numbers (liquidity, age, FDV vs. liquidity, buy/sell ratio, price spikes, locked liquidity). It is not a guarantee and not financial advice.

## Languages

English and German, switchable in the settings. All texts are in `app/src/main/assets/web/app.js`.

## Free and Pro

Pro is unlocked with a license key bound to one device code. Keys are made with the same seller tool as for SecretSweep and SpyCheck (`make_license.py`): enter the PoolHawk device code the customer sends. PoolHawk device codes differ from the other apps' codes, so a key never unlocks another app.

## How it is built

A native Android shell (`MainActivity`) shows the web UI from `app/src/main/assets/web` and offers a small bridge for API calls, storage, the license check, sharing and notifications. `Watcher` checks alerts and whale trades; `AlertJob` runs it in the background every 15 minutes. API calls are rate-limited and cached to stay within the free API limits.

## Build

Every push to `main` builds the APK with GitHub Actions (see `.github/workflows/build.yml`). The newest APK is on the `builds` branch and in the run's artifacts (`PoolHawk-apk`).

Locally: Android SDK 34 and JDK 17, then `gradle assembleRelease`.

## Tests

`gradle testReleaseUnitTest` runs the license and alert tests in `app/src/test`.

To preview the UI in a desktop browser with generated data, copy `app/src/main/assets/web` to a folder, add `test/mock.js` before `app.js` in `index.html`, and open it (`?pro=1` shows the Pro version).
