package app.poolhawk;

import java.time.Instant;
import org.json.JSONObject;

/** Same rug/risk heuristic as the web UI (riskOf in app.js), used by the background new-pool alert. */
final class Risk {
    static final int LOW = 0, MEDIUM = 1, HIGH = 2;

    private Risk() {}

    private static double num(JSONObject o, String k) {
        if (o == null || o.isNull(k)) return Double.NaN;
        try {
            return Double.parseDouble(o.optString(k));
        } catch (Exception e) {
            return Double.NaN;
        }
    }

    /** Score from GeckoTerminal pool attributes; 0–2 low, 3–5 medium, 6+ high. */
    static int score(JSONObject a, long now) {
        int s = 0;
        double liq = num(a, "reserve_in_usd"), fdv = num(a, "fdv_usd"), locked = num(a, "locked_liquidity_percentage");
        JSONObject pc = a.optJSONObject("price_change_percentage");
        double h1 = num(pc, "h1"), h24 = num(pc, "h24");
        JSONObject tx = a.optJSONObject("transactions");
        JSONObject d = tx == null ? null : tx.optJSONObject("h24");
        int buys = d == null ? 0 : d.optInt("buys"), sells = d == null ? 0 : d.optInt("sells");
        int traders = d == null ? 0 : d.optInt("buyers") + d.optInt("sellers");
        if (!Double.isNaN(liq)) s += liq < 10_000 ? 3 : liq < 50_000 ? 1 : 0;
        String created = a.optString("pool_created_at", "");
        if (!created.isEmpty() && !"null".equals(created)) {
            try {
                double hours = (now - Instant.parse(created).toEpochMilli()) / 3.6e6;
                s += hours < 1 ? 2 : hours < 24 ? 1 : 0;
            } catch (Exception ignored) {
            }
        }
        if (!Double.isNaN(fdv) && !Double.isNaN(liq) && liq > 0 && fdv / liq > 50) s += 2;
        if (buys >= 10 && sells == 0) s += 3;
        else if (buys >= 20 && sells / (double) buys < 0.2) s += 2;
        if ((!Double.isNaN(h1) && h1 > 300) || (!Double.isNaN(h24) && h24 > 1000)) s += 2;
        if (!Double.isNaN(h24) && h24 < -80) s += 2;
        if (traders > 0 && traders < 15) s += 1;
        if (!Double.isNaN(locked)) s += locked < 50 ? 1 : locked >= 90 ? -1 : 0;
        return Math.max(0, s);
    }

    static int level(int score) {
        return score >= 6 ? HIGH : score >= 3 ? MEDIUM : LOW;
    }

    /** True if liquidity fell by at least dropPct percent since the last check. */
    static boolean rugPulled(double before, double now, double dropPct) {
        return before >= 1000 && now >= 0 && now <= before * (1 - dropPct / 100.0);
    }

    /** True if the last hour's volume is at least factor times the average hour of the last 24h. */
    static boolean volumeSpike(double h1, double h24, double factor) {
        if (!(h1 >= 5000) || !(h24 > 0)) return false;
        double avg = h24 / 24.0;
        return h1 >= avg * factor;
    }
}
