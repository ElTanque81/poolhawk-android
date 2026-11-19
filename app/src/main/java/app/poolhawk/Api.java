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
            c.setRequestProperty("User-Agent", "PoolHawk/1.0 (Android)");
            int code = c.getResponseCode();
            if (code != 200) throw new HttpError(code);
            String body;
            try (InputStream in = c.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[16384];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    if (out.size() > 8_000_000) throw new IOException("too big");
                }
                body = out.toString(StandardCharsets.UTF_8.name());
            }
            synchronized (CACHE) {
                CACHE.put(path, new Object[] {System.currentTimeMillis(), body});
            }
            return body;
        } finally {
            c.disconnect();
        }
    }
}
