package app.poolhawk;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class WatcherTest {
    @Test
    public void aboveAndBelow() {
        assertTrue(Watcher.triggered("above", 2.0, 0, 2.0));
        assertFalse(Watcher.triggered("above", 2.0, 0, 1.99));
        assertTrue(Watcher.triggered("below", 0.5, 0, 0.49));
        assertFalse(Watcher.triggered("below", 0.5, 0, 0.51));
    }

    @Test
    public void percentMoves() {
        assertTrue(Watcher.triggered("up", 10, 1.0, 1.1));
        assertFalse(Watcher.triggered("up", 10, 1.0, 1.09));
        assertTrue(Watcher.triggered("down", 20, 1.0, 0.8));
        assertFalse(Watcher.triggered("down", 20, 1.0, 0.81));
        assertFalse(Watcher.triggered("up", 10, 0, 5));
    }

    @Test
    public void noPriceNeverTriggers() {
        assertFalse(Watcher.triggered("below", 1, 0, 0));
        assertFalse(Watcher.triggered("nonsense", 1, 1, 1));
    }

    @Test
    public void onlyApiPathsAreAllowed() {
        assertTrue(Api.validPath("/networks/eth/trending_pools?include=base_token,quote_token,dex&page=1"));
        assertFalse(Api.validPath("https://evil.example/x"));
        assertFalse(Api.validPath("/networks/../../x"));
        assertFalse(Api.validPath("networks/eth"));
        assertFalse(Api.validPath("/search/pools?query=<script>"));
    }

    @Test
    public void rugAndSpike() {
        assertTrue(Risk.rugPulled(100000, 60000, 30));
        assertFalse(Risk.rugPulled(100000, 80000, 30));
        assertFalse(Risk.rugPulled(500, 0, 30));
        assertTrue(Risk.volumeSpike(50000, 240000, 5));
        assertFalse(Risk.volumeSpike(20000, 240000, 5));
        assertFalse(Risk.volumeSpike(4000, 4000, 5));
    }

    @Test
    public void riskScore() throws Exception {
        long now = java.time.Instant.parse("2026-11-20T12:00:00Z").toEpochMilli();
        org.json.JSONObject rug = new org.json.JSONObject("{\"reserve_in_usd\":\"4000\",\"fdv_usd\":\"900000\",\"pool_created_at\":\"2026-11-20T11:30:00Z\","
            + "\"transactions\":{\"h24\":{\"buys\":40,\"sells\":0,\"buyers\":30,\"sellers\":0}}}");
        org.json.JSONObject ok = new org.json.JSONObject("{\"reserve_in_usd\":\"5000000\",\"fdv_usd\":\"40000000\",\"pool_created_at\":\"2025-01-01T00:00:00Z\","
            + "\"transactions\":{\"h24\":{\"buys\":4000,\"sells\":3500,\"buyers\":900,\"sellers\":800}}}");
        org.junit.Assert.assertEquals(Risk.HIGH, Risk.level(Risk.score(rug, now)));
        org.junit.Assert.assertEquals(Risk.LOW, Risk.level(Risk.score(ok, now)));
    }

    @Test
    public void goPlusAndTelegramAreLocked() {
        assertTrue(Api.validGoPlus("https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses=0xabc"));
        assertFalse(Api.validGoPlus("https://evil.example/api/v1/"));
        assertFalse(Api.validGoPlus("https://api.gopluslabs.io/api/v1/../x"));
    }
}
