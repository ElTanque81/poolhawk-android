package app.poolhawk;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Talks to the public GeckoTerminal API (free, no key). Only paths below the API base are allowed.
 * The free API allows about 30 calls per minute, so calls are spaced out and answers are cached briefly.
 */
final class Api {
    static final String BASE = "https://api.geckoterminal.com/api/v2";
    private static final long CACHE_MS = 15_000;
    private static final long GAP_MS = 2_100;
    private static final int BURST = 4;
    private static double tokens = BURST;
    private static final Map<String, Object[]> CACHE = new LinkedHashMap<String, Object[]>(64, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Object[]> e) {
            return size() > 80;
        }
    };
    private static long last;

    static final class HttpError extends IOException {
        final int code;

        HttpError(int code) {
            super("HTTP " + code);
            this.code = code;
        }
    }

    private Api() {}

    static boolean validPath(String path) {
        return path != null && path.startsWith("/") && !path.contains("://") && !path.contains("..")
            && !path.contains("\\") && path.length() < 2000 && path.matches("[A-Za-z0-9/_\\-.,?=&%:]+");
    }

    /** Security data from GoPlus (free, no key). Only this host is allowed. */
    static final String GOPLUS = "https://api.gopluslabs.io/api/v1/";

    static boolean validGoPlus(String url) {
        return url != null && url.startsWith(GOPLUS) && !url.contains("..") && url.length() < 600
            && url.matches("[A-Za-z0-9/_\\-.,?=&%:]+");
    }

    static String goPlus(String url) throws IOException {
        if (!validGoPlus(url)) throw new IOException("bad url");
        return fetch(url, "GET", null);
    }

    static final String JUP = "https://api.jup.ag/swap/v2";
    static final String RPC = "https://api.mainnet-beta.solana.com";

    /** Jupiter Swap API V2 (keyless): quote/order. */
    static String jupOrder(String inputMint, String outputMint, String amount, String taker) throws IOException {
        if (!inputMint.matches("[1-9A-HJ-NP-Za-km-z]{32,44}") || !outputMint.matches("[1-9A-HJ-NP-Za-km-z]{32,44}")
            || !amount.matches("[0-9]{1,20}") || (taker != null && !taker.matches("[1-9A-HJ-NP-Za-km-z]{32,44}"))) {
            throw new IOException("bad order");
        }
        return fetchJson(JUP + "/order?inputMint=" + inputMint + "&outputMint=" + outputMint + "&amount=" + amount
            + (taker == null ? "" : "&taker=" + taker), null);
    }

    static String jupExecute(String body) throws IOException {
        return fetchJson(JUP + "/execute", body);
    }

    static String rpc(String body) throws IOException {
        return fetchJson(RPC, body);
    }

    private static String fetchJson(String url, String json) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            c.setConnectTimeout(15_000);
            c.setReadTimeout(30_000);
            c.setRequestProperty("Accept", "application/json");
            c.setRequestProperty("User-Agent", "PoolHawk/1.5 (Android)");
            if (json != null) {
                c.setRequestMethod("POST");
                c.setDoOutput(true);
                c.setRequestProperty("Content-Type", "application/json");
                c.getOutputStream().write(json.getBytes(StandardCharsets.UTF_8));
            }
            int code = c.getResponseCode();
            InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
            String body = in == null ? "" : read(in);
            if (code == 429) throw new HttpError(429);
            if (code >= 400 && body.isEmpty()) throw new HttpError(code);
            return body;
        } finally {
            c.disconnect();
        }
    }

    /** Sends a Telegram message through the user's own bot. */
    static String telegram(String token, String method, String form) throws IOException {
        if (token == null || !token.matches("[0-9]{5,15}:[A-Za-z0-9_\\-]{20,60}")) throw new IOException("bad token");
        if (!method.matches("[A-Za-z]{3,20}")) throw new IOException("bad method");
        return fetch("https://api.telegram.org/bot" + token + "/" + method, form == null ? "GET" : "POST", form);
    }

    private static String fetch(String url, String method, String form) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            c.setConnectTimeout(15_000);
            c.setReadTimeout(20_000);
            c.setRequestMethod(method);
            c.setRequestProperty("Accept", "application/json");
            c.setRequestProperty("User-Agent", "PoolHawk/1.1 (Android)");
            if (form != null) {
                c.setDoOutput(true);
                c.setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
                c.getOutputStream().write(form.getBytes(StandardCharsets.UTF_8));
            }
            int code = c.getResponseCode();
            if (code != 200) throw new HttpError(code);
            return read(c.getInputStream());
        } finally {
            c.disconnect();
        }
    }

    private static String read(InputStream in0) throws IOException {
        try (InputStream in = in0) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                if (out.size() > 8_000_000) throw new IOException("too big");
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    static String get(String path) throws IOException {
        if (!validPath(path)) throw new IOException("bad path");
        synchronized (CACHE) {
            Object[] hit = CACHE.get(path);
            if (hit != null && System.currentTimeMillis() - (Long) hit[0] < CACHE_MS) return (String) hit[1];
        }
        // token bucket: short bursts are fine, on average about one call every 2 seconds
        synchronized (Api.class) {
            long now = System.currentTimeMillis();
            if (last > 0) tokens = Math.min(BURST, tokens + (now - last) / (double) GAP_MS);
            last = now;
            if (tokens < 1) {
                long wait = (long) ((1 - tokens) * GAP_MS);
                try {
                    Thread.sleep(wait);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                last = System.currentTimeMillis();
                tokens = 1;
            }
            tokens -= 1;
        }
        HttpURLConnection c = (HttpURLConnection) new URL(BASE + path).openConnection();
        try {
            c.setConnectTimeout(15_000);
            c.setReadTimeout(20_000);
            c.setRequestProperty("Accept", "application/json;version=20230302");
            c.setRequestProperty("User-Agent", "PoolHawk/1.1 (Android)");
            int code = c.getResponseCode();
            if (code != 200) throw new HttpError(code);
            String body = read(c.getInputStream());
            synchronized (CACHE) {
                CACHE.put(path, new Object[] {System.currentTimeMillis(), body});
            }
            return body;
        } finally {
            c.disconnect();
        }
    }
}
