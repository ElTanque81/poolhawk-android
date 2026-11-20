# PoolHawk for Android

Real-time DEX tracker with alerts straight to Telegram: trending pools, new launches, live charts, watchlists, whale trades and price alerts across Solana, Ethereum, BSC, Base, Arbitrum, Polygon, Avalanche, TON, Sui and Tron.

Market data comes from the free public [GeckoTerminal API](https://www.geckoterminal.com/dex-api). No account, no tracking: watchlists and alerts stay on the phone.

## Free

Everything you expect from a DEX tracker, without limits:

- Trending pools per network, sortable by hot, volume, gainers and losers
- New pools with an automatic rug & risk check
- Search by token, pair or contract address
- Pool page: price, 5m/1h/6h/24h change, candlestick charts from 1 minute to 1 day, liquidity, FDV, buys vs. sells, latest trades, risk check
- Unlimited watchlists with CSV export
- Price alerts (above, below, rises by %, falls by %) with notifications, also when the app is closed, and in Telegram through your own bot
- Security scan via the free GoPlus Security API (honeypot, buy/sell tax, mint and freeze authority, owner privileges, locked liquidity, top-holder share): 3 scans a day

## Trading

Every pool page has a **Trade** button. PoolHawk never holds keys or funds.

- Solana, inside PoolHawk: buy or sell with SOL. Quotes and routing come from the Jupiter Swap API V2 (keyless), which also routes pump.fun tokens. The user's wallet app (Phantom, Solflare or any other wallet that supports the Solana Mobile Wallet Adapter) approves and signs; the signed transaction is landed through Jupiter's `/execute`. Balances come from the public Solana RPC. No fee is added.
- Solana, in another app: Jupiter swap inside Phantom, the token on pump.fun inside Phantom, or Jupiter in the browser
- Ethereum, Base, Arbitrum, Polygon, Avalanche: Uniswap inside MetaMask (Phantom for Ethereum, Base and Polygon) or in the browser
- BNB Chain: PancakeSwap inside MetaMask or in the browser
- A warning is shown first when the risk check or the security scan found serious red flags

## Pro ($4.99 one-time)

What other DEX trackers don't do:

- Rug alarm: notification when liquidity in a watchlist pool suddenly drops (20, 30 or 50 %)
- New-pool alerts with your own filter (network, minimum liquidity, maximum risk)
- Volume-spike alerts when a token trades far above its normal hourly volume
- Rug, new-pool, volume-spike and whale alerts in Telegram too, plus an in-app alert history
- Whale tracker: big buys and sells in watchlist pools, with optional notifications
- Home-screen widget with the first five watchlist tokens
- Unlimited security scans

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
