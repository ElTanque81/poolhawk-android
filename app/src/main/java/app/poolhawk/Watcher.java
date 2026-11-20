package app.poolhawk;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Pro: checks price alerts and big trades ("whales") in watchlist pools, in the background and while the app is open.
 * Alerts live under the key "alerts", whale settings under "whale"; the web UI edits them, this class marks hits.
 */
final class Watcher {
    private static final int JOB_ID = 4711;
    private static int notifyId = 100;

    private Watcher() {}

    static void schedule(Context c) {
        JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null) return;
        for (JobInfo j : js.getAllPendingJobs()) if (j.getId() == JOB_ID) return;
        js.schedule(new JobInfo.Builder(JOB_ID, new ComponentName(c, AlertJob.class))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
            .setPeriodic(15 * 60 * 1000L)
            .setPersisted(true)
            .build());
    }

    private static JSONArray array(String s) {
        try {
            return new JSONArray(s == null || s.isEmpty() ? "[]" : s);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    private static JSONObject object(String s) {
        try {
            return new JSONObject(s == null || s.isEmpty() ? "{}" : s);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static String key(String net, String addr) {
        return net + "/" + addr.toLowerCase(Locale.ROOT);
    }

    /** True if the alert's condition holds at this price. Pure logic, unit-tested. */
    static boolean triggered(String kind, double value, double ref, double price) {
        if (price <= 0) return false;
        switch (kind) {
            case "above": return price >= value;
            case "below": return price <= value;
            case "up": return ref > 0 && price >= ref * (1 + value / 100.0);
            case "down": return ref > 0 && price <= ref * (1 - value / 100.0);
            default: return false;
        }
    }

    static String fmtPrice(double p) {
        if (p >= 1000) return String.format(Locale.US, "$%,.2f", p);
        if (p >= 1) return String.format(Locale.US, "$%.4f", p);
        if (p >= 0.0001) return String.format(Locale.US, "$%.6f", p);
        return String.format(Locale.US, "$%.3e", p);
    }

    static String fmtUsd(double v) {
        if (v >= 1e6) return String.format(Locale.US, "$%.2fM", v / 1e6);
        if (v >= 1e3) return String.format(Locale.US, "$%.1fK", v / 1e3);
        return String.format(Locale.US, "$%.0f", v);
    }

    /** Runs one check. Returns how many notifications were sent. */
    static synchronized int run(Context c) {
        boolean de = "de".equals(object(Pro.load(c, "settings")).optString("lang", Locale.getDefault().getLanguage()));
        int sent = 0;

        // 1) price alerts
        JSONArray alerts = array(Pro.load(c, "alerts"));
        Map<String, List<String>> byNet = new LinkedHashMap<>();
        for (int i = 0; i < alerts.length(); i++) {
            JSONObject a = alerts.optJSONObject(i);
            if (a == null || !a.optBoolean("on", true) || a.optBoolean("hit")) continue;
            String net = a.optString("net"), addr = a.optString("addr");
            List<String> l = byNet.computeIfAbsent(net, k -> new ArrayList<>());
            if (!l.contains(addr) && l.size() < 30) l.add(addr);
        }
        Map<String, Double> prices = new HashMap<>();
        for (Map.Entry<String, List<String>> e : byNet.entrySet()) {
            try {
                JSONObject res = new JSONObject(Api.get("/networks/" + e.getKey() + "/pools/multi/" + String.join(",", e.getValue())));
                JSONArray data = res.optJSONArray("data");
                for (int i = 0; data != null && i < data.length(); i++) {
                    JSONObject at = data.getJSONObject(i).getJSONObject("attributes");
                    prices.put(key(e.getKey(), at.optString("address")), at.optDouble("base_token_price_usd", 0));
                }
            } catch (Exception ignored) {
                // offline or rate limit: try again next round
            }
        }
        Map<String, Double> hits = new HashMap<>();
        for (int i = 0; i < alerts.length(); i++) {
            JSONObject a = alerts.optJSONObject(i);
            if (a == null || !a.optBoolean("on", true) || a.optBoolean("hit")) continue;
            Double p = prices.get(key(a.optString("net"), a.optString("addr")));
            if (p == null) continue;
            String kind = a.optString("kind");
            double v = a.optDouble("value", 0);
            if (triggered(kind, v, a.optDouble("ref", 0), p)) {
                hits.put(a.optString("id"), p);
                String cond;
                switch (kind) {
                    case "above": cond = (de ? "über " : "above ") + fmtPrice(v); break;
                    case "below": cond = (de ? "unter " : "below ") + fmtPrice(v); break;
                    case "up": cond = "+" + trim(v) + "%"; break;
                    default: cond = "-" + trim(v) + "%"; break;
                }
                event(c, "price", "alerts", "🔔 " + a.optString("name") + " " + cond,
                    (de ? "Preis jetzt " : "Price now ") + fmtPrice(p), a.optString("net"), a.optString("addr"));
                sent++;
            }
        }
        if (!hits.isEmpty()) {
            JSONArray fresh = array(Pro.load(c, "alerts"));
            for (int i = 0; i < fresh.length(); i++) {
                JSONObject a = fresh.optJSONObject(i);
                if (a == null || !hits.containsKey(a.optString("id"))) continue;
                try {
                    a.put("hit", true);
                    a.put("hitAt", System.currentTimeMillis());
                    a.put("hitPrice", hits.get(a.optString("id")));
                } catch (Exception ignored) {
                }
            }
            Pro.save(c, "alerts", fresh.toString());
        }

        // everything below is Pro: whale trades, smart alerts, widget
        if (!Pro.isActive()) return sent;

        // 2) whale trades in watchlist pools
        JSONObject whale = object(Pro.load(c, "whale"));
        if (whale.optBoolean("notify")) {
            double min = whale.optDouble("min", 10000);
            JSONObject seen = whale.optJSONObject("seen");
            if (seen == null) seen = new JSONObject();
            List<String[]> pools = new ArrayList<>();
            JSONArray lists = array(Pro.load(c, "lists"));
            for (int i = 0; i < lists.length() && pools.size() < 6; i++) {
                JSONArray items = lists.optJSONObject(i) == null ? null : lists.optJSONObject(i).optJSONArray("items");
                for (int j = 0; items != null && j < items.length() && pools.size() < 6; j++) {
                    JSONObject it = items.optJSONObject(j);
                    if (it == null) continue;
                    String[] p = {it.optString("net"), it.optString("addr"), it.optString("sym", it.optString("name"))};
                    boolean dup = false;
                    for (String[] q : pools) dup |= key(q[0], q[1]).equals(key(p[0], p[1]));
                    if (!dup) pools.add(p);
                }
            }
            for (String[] p : pools) {
                try {
                    JSONObject res = new JSONObject(Api.get("/networks/" + p[0] + "/pools/" + p[1]
                        + "/trades?trade_volume_in_usd_greater_than=" + (long) min));
                    JSONArray data = res.optJSONArray("data");
                    String k = key(p[0], p[1]);
                    long lastSeen = seen.optLong(k, 0), newest = lastSeen;
                    int shown = 0;
                    for (int i = 0; data != null && i < data.length(); i++) {
                        JSONObject at = data.getJSONObject(i).getJSONObject("attributes");
                        long ts = Instant.parse(at.optString("block_timestamp")).toEpochMilli();
                        newest = Math.max(newest, ts);
                        if (lastSeen == 0 || ts <= lastSeen || shown >= 3) continue;
                        boolean buy = "buy".equals(at.optString("kind"));
                        double usd = at.optDouble("volume_in_usd", 0);
                        event(c, "whale", "whales", "🐋 " + p[2] + ": " + (buy ? (de ? "Kauf " : "Buy ") : (de ? "Verkauf " : "Sell ")) + fmtUsd(usd),
                            (de ? "Wallet " : "Wallet ") + shortAddr(at.optString("tx_from_address")), p[0], p[1]);
                        shown++;
                        sent++;
                    }
                    seen.put(k, newest == 0 ? System.currentTimeMillis() : newest);
                } catch (Exception ignored) {
                }
            }
            JSONObject fresh = object(Pro.load(c, "whale"));
            try {
                fresh.put("seen", seen);
            } catch (Exception ignored) {
            }
            Pro.save(c, "whale", fresh.toString());
        }
        // 3) smart alerts: rug, volume spike, new pools; plus the home-screen widget
        sent += smart(c, de);
        return sent;
    }

    static List<String[]> watchItems(Context c, int max) {
        List<String[]> pools = new ArrayList<>();
        JSONArray lists = array(Pro.load(c, "lists"));
        for (int i = 0; i < lists.length() && pools.size() < max; i++) {
            JSONArray items = lists.optJSONObject(i) == null ? null : lists.optJSONObject(i).optJSONArray("items");
            for (int j = 0; items != null && j < items.length() && pools.size() < max; j++) {
                JSONObject it = items.optJSONObject(j);
                if (it == null) continue;
                String[] p = {it.optString("net"), it.optString("addr"), it.optString("sym", "?"), it.optString("quote", "")};
                boolean dup = false;
                for (String[] q : pools) dup |= key(q[0], q[1]).equals(key(p[0], p[1]));
                if (!dup) pools.add(p);
            }
        }
        return pools;
    }

    private static double d(JSONObject o, String k) {
        if (o == null || o.isNull(k)) return Double.NaN;
        try {
            return Double.parseDouble(o.optString(k));
        } catch (Exception e) {
            return Double.NaN;
        }
    }

    private static int smart(Context c, boolean de) {
        int sent = 0;
        long now = System.currentTimeMillis();
        JSONObject cfg = object(Pro.load(c, "smart"));
        JSONObject rug = cfg.optJSONObject("rug"), spike = cfg.optJSONObject("spike"), np = cfg.optJSONObject("newp");
        boolean rugOn = rug != null && rug.optBoolean("on"), spikeOn = spike != null && spike.optBoolean("on");
        JSONObject snap = object(Pro.load(c, "snap"));

        // watchlist pools: one multi call per network
        List<String[]> items = watchItems(c, 60);
        Map<String, List<String[]>> byNet = new LinkedHashMap<>();
        for (String[] it : items) byNet.computeIfAbsent(it[0], k -> new ArrayList<>()).add(it);
        Map<String, JSONObject> attrs = new HashMap<>();
        for (Map.Entry<String, List<String[]>> e : byNet.entrySet()) {
            List<String> addrs = new ArrayList<>();
            for (String[] it : e.getValue()) if (addrs.size() < 30) addrs.add(it[1]);
            try {
                JSONObject res = new JSONObject(Api.get("/networks/" + e.getKey() + "/pools/multi/" + String.join(",", addrs)));
                JSONArray data = res.optJSONArray("data");
                for (int i = 0; data != null && i < data.length(); i++) {
                    JSONObject at = data.getJSONObject(i).getJSONObject("attributes");
                    attrs.put(key(e.getKey(), at.optString("address")), at);
                }
            } catch (Exception ignored) {
            }
        }
        JSONArray rows = new JSONArray();
        for (String[] it : items) {
            String k = key(it[0], it[1]);
            JSONObject at = attrs.get(k);
            if (at == null) continue;
            String name = it[2] + (it[3].isEmpty() ? "" : "/" + it[3]);
            double liq = d(at, "reserve_in_usd");
            JSONObject vol = at.optJSONObject("volume_usd");
            JSONObject prev = snap.optJSONObject(k);
            if (prev == null) prev = new JSONObject();
            try {
                if (rugOn && !Double.isNaN(liq) && prev.has("liq")
                    && Risk.rugPulled(prev.optDouble("liq"), liq, rug.optDouble("drop", 30))) {
                    double drop = 100 * (1 - liq / prev.optDouble("liq"));
                    event(c, "rug", "alerts", "🚨 " + name + (de ? ": Liquidität -" : ": liquidity -") + Math.round(drop) + "%",
                        fmtUsd(prev.optDouble("liq")) + " → " + fmtUsd(liq) + (de ? " · möglicher Rug Pull" : " · possible rug pull"), it[0], it[1]);
                    sent++;
                }
                double h1 = d(vol, "h1"), h24 = d(vol, "h24");
                if (spikeOn && now - prev.optLong("spikeAt", 0) > 6 * 3600_000L
                    && Risk.volumeSpike(h1, h24, spike.optDouble("factor", 5))) {
                    double x = h1 / (h24 / 24.0);
                    event(c, "spike", "alerts", "📈 " + name + (de ? ": Volumen " : ": volume ") + String.format(Locale.US, "%.1f×", x),
                        (de ? "Letzte Stunde " : "Last hour ") + fmtUsd(h1) + (de ? " · Ø " : " · avg ") + fmtUsd(h24 / 24.0), it[0], it[1]);
                    prev.put("spikeAt", now);
                    sent++;
                }
                if (!Double.isNaN(liq)) prev.put("liq", liq);
                snap.put(k, prev);
            } catch (Exception ignored) {
            }
            if (rows.length() < 5) {
                try {
                    JSONObject pc = at.optJSONObject("price_change_percentage");
                    rows.put(new JSONObject().put("sym", it[2]).put("price", d(at, "base_token_price_usd")).put("ch", d(pc, "h24")));
                } catch (Exception ignored) {
                }
            }
        }

        // new pools matching the user's filter
        if (np != null && np.optBoolean("on")) {
            String net = np.optString("net", "all");
            double minLiq = np.optDouble("minLiq", 20000);
            int maxRisk = np.optInt("maxRisk", Risk.LOW);
            JSONArray seenArr = np.optJSONArray("seen");
            java.util.LinkedHashSet<String> seen = new java.util.LinkedHashSet<>();
            for (int i = 0; seenArr != null && i < seenArr.length(); i++) seen.add(seenArr.optString(i));
            boolean first = seenArr == null || !net.equals(np.optString("seenNet", ""));
            try {
                String path = "all".equals(net) ? "/networks/new_pools?include=base_token,network&page=1"
                    : "/networks/" + net + "/new_pools?include=base_token&page=1";
                JSONObject res = new JSONObject(Api.get(path));
                JSONArray data = res.optJSONArray("data");
                int shown = 0;
                for (int i = 0; data != null && i < data.length(); i++) {
                    JSONObject dd = data.getJSONObject(i), at = dd.getJSONObject("attributes");
                    String id = dd.optString("id");
                    if (seen.contains(id)) continue;
                    seen.add(id);
                    if (first) continue;
                    double liq = d(at, "reserve_in_usd");
                    int sc = Risk.score(at, now);
                    if (Double.isNaN(liq) || liq < minLiq || Risk.level(sc) > maxRisk || shown >= 4) continue;
                    String pnet = "all".equals(net) ? netOf(dd) : net;
                    String lvl = de ? new String[] {"niedrig", "mittel", "hoch"}[Risk.level(sc)] : new String[] {"low", "medium", "high"}[Risk.level(sc)];
                    event(c, "new", "alerts", "🛰️ " + (de ? "Neuer Pool: " : "New pool: ") + at.optString("name"),
                        "Liq " + fmtUsd(liq) + " · " + (de ? "Risiko " : "risk ") + lvl + " · " + pnet.toUpperCase(Locale.ROOT), pnet, at.optString("address"));
                    shown++;
                    sent++;
                }
                JSONArray keep = new JSONArray();
                List<String> all = new ArrayList<>(seen);
                for (int i = Math.max(0, all.size() - 300); i < all.size(); i++) keep.put(all.get(i));
                JSONObject fresh = object(Pro.load(c, "smart"));
                JSONObject fnp = fresh.optJSONObject("newp");
                if (fnp != null) {
                    fnp.put("seen", keep);
                    fnp.put("seenNet", net);
                    Pro.save(c, "smart", fresh.toString());
                }
            } catch (Exception ignored) {
            }
        }
        Pro.save(c, "snap", snap.toString());
        if (rows.length() > 0) {
            try {
                Pro.save(c, "widget", new JSONObject().put("t", now).put("rows", rows).toString());
            } catch (Exception ignored) {
            }
        }
        WatchWidget.refresh(c);
        return sent;
    }

    private static String netOf(JSONObject d) {
        JSONObject r = d.optJSONObject("relationships");
        JSONObject n = r == null ? null : r.optJSONObject("network");
        JSONObject nd = n == null ? null : n.optJSONObject("data");
        if (nd != null) return nd.optString("id");
        String id = d.optString("id");
        int u = id.lastIndexOf('_');
        return u > 0 ? id.substring(0, u) : id;
    }

    /** Records an alert in the in-app history, shows a notification and forwards it to Telegram if set up (Free: price alerts only). */
    static void event(Context c, String kind, String channel, String title, String text, String net, String addr) {
        JSONArray ev = array(Pro.load(c, "events"));
        JSONArray out = new JSONArray();
        try {
            out.put(new JSONObject().put("t", System.currentTimeMillis()).put("kind", kind).put("title", title)
                .put("text", text).put("net", net).put("addr", addr));
        } catch (Exception ignored) {
        }
        for (int i = 0; i < ev.length() && out.length() < 50; i++) out.put(ev.opt(i));
        Pro.save(c, "events", out.toString());
        notify(c, channel, title, text, net, addr);
        JSONObject tg = object(Pro.load(c, "smart")).optJSONObject("tg");
        if ((Pro.isActive() || "price".equals(kind)) && tg != null && tg.optBoolean("on") && !tg.optString("token").isEmpty() && !tg.optString("chat").isEmpty()) {
            try {
                String link = "https://www.geckoterminal.com/" + net + "/pools/" + addr;
                Api.telegram(tg.optString("token"), "sendMessage", "chat_id=" + enc(tg.optString("chat"))
                    + "&disable_web_page_preview=true&text=" + enc("🦅 PoolHawk\n" + title + "\n" + text + "\n" + link));
            } catch (Exception ignored) {
            }
        }
    }

    static String enc(String s) {
        try {
            return java.net.URLEncoder.encode(s, "UTF-8");
        } catch (Exception e) {
            return "";
        }
    }

    private static String trim(double v) {
        return v == Math.floor(v) ? String.valueOf((long) v) : String.valueOf(v);
    }

    static String shortAddr(String a) {
        return a == null || a.length() < 12 ? String.valueOf(a) : a.substring(0, 6) + "…" + a.substring(a.length() - 4);
    }

    private static void notify(Context c, String channel, String title, String text, String net, String addr) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 33
            && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        nm.createNotificationChannel(new NotificationChannel("alerts", "Price alerts", NotificationManager.IMPORTANCE_HIGH));
        nm.createNotificationChannel(new NotificationChannel("whales", "Whale trades", NotificationManager.IMPORTANCE_DEFAULT));
        Intent open = new Intent(c, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra("net", net).putExtra("addr", addr);
        int id = notifyId++;
        PendingIntent pi = PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        nm.notify(id, new Notification.Builder(c, channel)
            .setSmallIcon(R.drawable.ic_stat_hawk)
            .setColor(0xFFFFB020)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build());
    }
}
