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
        if (!Pro.isActive()) {
            js.cancel(JOB_ID);
            return;
        }
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
        if (!Pro.isActive()) return 0;
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
                notify(c, "alerts", "🔔 " + a.optString("name") + " " + cond,
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
                        notify(c, "whales", "🐋 " + p[2] + ": " + (buy ? (de ? "Kauf " : "Buy ") : (de ? "Verkauf " : "Sell ")) + fmtUsd(usd),
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
        return sent;
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
