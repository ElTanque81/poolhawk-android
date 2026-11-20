package app.poolhawk;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import java.text.DateFormat;
import java.util.Date;
import org.json.JSONArray;
import org.json.JSONObject;

/** Home-screen widget (Pro): the first five watchlist tokens with price and 24h change. */
public class WatchWidget extends AppWidgetProvider {
    private static final int[] ROW = {R.id.w_row0, R.id.w_row1, R.id.w_row2, R.id.w_row3, R.id.w_row4};
    private static final int[] SYM = {R.id.w_sym0, R.id.w_sym1, R.id.w_sym2, R.id.w_sym3, R.id.w_sym4};
    private static final int[] PX = {R.id.w_px0, R.id.w_px1, R.id.w_px2, R.id.w_px3, R.id.w_px4};
    private static final int[] CH = {R.id.w_ch0, R.id.w_ch1, R.id.w_ch2, R.id.w_ch3, R.id.w_ch4};

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        Pro.init(c);
        draw(c, m, ids);
        if (Pro.isActive()) new Thread(() -> Watcher.run(c.getApplicationContext())).start();
    }

    static void refresh(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        if (m == null) return;
        int[] ids = m.getAppWidgetIds(new ComponentName(c, WatchWidget.class));
        if (ids != null && ids.length > 0) draw(c, m, ids);
    }

    private static void draw(Context c, AppWidgetManager m, int[] ids) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_watch);
        Intent open = new Intent(c, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        boolean de = Pro.load(c, "settings").contains("\"lang\":\"de\"");
        JSONArray rows = new JSONArray();
        long t = 0;
        try {
            JSONObject w = new JSONObject(Pro.load(c, "widget").isEmpty() ? "{}" : Pro.load(c, "widget"));
            rows = w.optJSONArray("rows") == null ? rows : w.optJSONArray("rows");
            t = w.optLong("t");
        } catch (Exception ignored) {
        }
        String msg = null;
        if (!Pro.isActive()) msg = de ? "Widget ist eine Pro-Funktion. Tippen zum Freischalten." : "The widget is a Pro feature. Tap to unlock.";
        else if (rows.length() == 0) msg = de ? "Füge Tokens zu deiner Watchlist hinzu." : "Add tokens to your watchlist.";
        v.setTextViewText(R.id.w_msg, msg == null ? "" : msg);
        v.setViewVisibility(R.id.w_msg, msg == null ? View.GONE : View.VISIBLE);
        v.setTextViewText(R.id.w_time, t > 0 && msg == null ? DateFormat.getTimeInstance(DateFormat.SHORT).format(new Date(t)) : "");
        for (int i = 0; i < ROW.length; i++) {
            JSONObject r = msg == null ? rows.optJSONObject(i) : null;
            v.setViewVisibility(ROW[i], r == null ? View.GONE : View.VISIBLE);
            if (r == null) continue;
            double ch = r.optDouble("ch", Double.NaN);
            v.setTextViewText(SYM[i], r.optString("sym"));
            v.setTextViewText(PX[i], Watcher.fmtPrice(r.optDouble("price", 0)));
            v.setTextViewText(CH[i], Double.isNaN(ch) ? "—" : String.format(java.util.Locale.US, "%+.2f%%", ch));
            v.setTextColor(CH[i], Double.isNaN(ch) ? 0xFF8590A6 : ch >= 0 ? 0xFF18E08B : 0xFFFF4D6A);
        }
        m.updateAppWidget(ids, v);
    }
}
