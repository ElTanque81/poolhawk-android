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
}
