# PoolHawk for Android

Real-time DEX tracker: trending pools, new launches, live charts, watchlists, whale trades and price alerts across Solana, Ethereum, BSC, Base, Arbitrum, Polygon, Avalanche, TON, Sui and Tron.

Market data comes from the free public [GeckoTerminal API](https://www.geckoterminal.com/dex-api). No account, no tracking: watchlists and alerts stay on the phone.

## Free

- Trending pools per network, sortable by hot, volume, gainers and losers
- Search by token, pair or contract address
- Pool page: price, 5m/1h/6h/24h change, candlestick chart (1h, 4h, 1D), liquidity, FDV, buys vs. sells, latest trades
- One watchlist with up to 5 tokens

## Pro

- Rug alarm: notification when liquidity in a watchlist pool suddenly drops (20, 30 or 50 %)
- New-pool alerts with your own filter (network, minimum liquidity, maximum risk)
- Volume-spike alerts when a token trades far above its normal hourly volume
- Price alerts (above, below, rises by %, falls by %) with notifications, also when the app is closed
- Every alert can also go to Telegram through your own bot, and all alerts are kept in an in-app history
- Security scan for each token via the free GoPlus Security API: honeypot, buy/sell tax, mint and freeze authority, owner privileges, locked liquidity, top-holder share
- Home-screen widget with the first five watchlist tokens
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

A native Android shell (`MainActivity`) shows the web UI from `app/src/main/assets/web` and offers a small bridge for API calls, storage, the license check, sharing and notifications. `Watcher` checks price alerts, whale trades and the smart alerts (rug, volume spike, new pools), forwards them to Telegram and refreshes the widget (`WatchWidget`); `AlertJob` runs it in the background every 15 minutes, and the app runs it every minute while it is open. `Risk` is the Java copy of the risk heuristic. Network access is limited to the GeckoTerminal API, the GoPlus API and the Telegram Bot API. API calls are rate-limited and cached to stay within the free API limits.

## Build

Every push to `main` builds the APK with GitHub Actions (see `.github/workflows/build.yml`). The newest APK is on the `builds` branch and in the run's artifacts (`PoolHawk-apk`).

Locally: Android SDK 34 and JDK 17, then `gradle assembleRelease`.

## Tests

`gradle testReleaseUnitTest` runs the license and alert tests in `app/src/test`.

To preview the UI in a desktop browser with generated data, copy `app/src/main/assets/web` to a folder, add `test/mock.js` before `app.js` in `index.html`, and open it (`?pro=1` shows the Pro version).
