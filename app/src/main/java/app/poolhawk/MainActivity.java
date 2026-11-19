package app.poolhawk;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

/** One screen: the PoolHawk web UI (assets/web) with a small native bridge for data, Pro, storage and sharing. */
public class MainActivity extends Activity {
    private WebView web;
    private boolean loaded;
    private String[] pendingOpen;
    private final ExecutorService pool = Executors.newFixedThreadPool(3);

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Pro.init(this);
        Watcher.schedule(this);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#05070D"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);
        web.addJavascriptInterface(new Bridge(), "Hawk");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("file".equals(u.getScheme())) return false;
                openExternal(u);
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                loaded = true;
                if (pendingOpen != null) openPool(pendingOpen[0], pendingOpen[1]);
                pendingOpen = null;
            }
        });
        setContentView(web);
        handle(getIntent());
        web.loadUrl("file:///android_asset/web/index.html");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handle(intent);
    }

    private void handle(Intent i) {
        if (i == null || i.getStringExtra("net") == null) return;
        String net = i.getStringExtra("net"), addr = i.getStringExtra("addr");
        if (loaded) openPool(net, addr);
        else pendingOpen = new String[] {net, addr};
    }

    private void openPool(String net, String addr) {
        web.evaluateJavascript("window.hawkOpen&&hawkOpen(" + JSONObject.quote(net) + "," + JSONObject.quote(addr) + ")", null);
    }

    private void openExternal(Uri u) {
        String scheme = u.getScheme();
        if (!"https".equals(scheme) && !"mailto".equals(scheme)) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (Exception e) {
            Toast.makeText(this, u.toString(), Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.hawkBack?hawkBack():false", v -> {
            if (!"true".equals(v)) MainActivity.super.onBackPressed();
        });
    }

    @Override
    protected void onDestroy() {
        pool.shutdownNow();
        super.onDestroy();
    }

    private void js(String code) {
        web.post(() -> web.evaluateJavascript(code, null));
    }

    /** Methods the web UI can call as window.Hawk.*. */
    final class Bridge {
        @JavascriptInterface
        public void get(final int id, final String path) {
            pool.execute(() -> {
                String ok = "false", body;
                try {
                    body = Api.get(path);
                    ok = "true";
                } catch (Api.HttpError e) {
                    body = String.valueOf(e.code);
                } catch (Exception e) {
                    body = "0";
                }
                js("window.hawkCb&&hawkCb(" + id + "," + ok + "," + JSONObject.quote(body) + ")");
            });
        }

        @JavascriptInterface
        public String load(String key) {
            return Pro.load(MainActivity.this, key);
        }

        @JavascriptInterface
        public void save(String key, String value) {
            Pro.save(MainActivity.this, key, value);
        }

        @JavascriptInterface
        public boolean isPro() {
            return Pro.isActive();
        }

        @JavascriptInterface
        public String proInfo() {
            try {
                JSONObject o = new JSONObject();
                o.put("pro", Pro.isActive());
                o.put("to", Pro.licensedTo());
                o.put("code", Pro.deviceCode(MainActivity.this));
                o.put("price", Pro.PRICE);
                o.put("email", Pro.SELLER_EMAIL);
                JSONArray pay = new JSONArray();
                for (String[] p : Pro.PAY) pay.put(new JSONArray().put(p[0]).put(p[1]));
                o.put("pay", pay);
                o.put("version", BuildConfig.VERSION_NAME);
                return o.toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        @JavascriptInterface
        public int activate(String key) {
            int r = Pro.activate(MainActivity.this, key == null ? "" : key);
            if (r == License.OK) Watcher.schedule(MainActivity.this);
            return r;
        }

        @JavascriptInterface
        public void checkAlerts() {
            pool.execute(() -> {
                int n = Watcher.run(MainActivity.this);
                js("window.hawkAlertsChecked&&hawkAlertsChecked(" + n + ")");
            });
        }

        @JavascriptInterface
        public void askNotify() {
            if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                runOnUiThread(() -> requestPermissions(new String[] {Manifest.permission.POST_NOTIFICATIONS}, 1));
            }
        }

        @JavascriptInterface
        public void copy(String text) {
            runOnUiThread(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("PoolHawk", text));
            });
        }

        @JavascriptInterface
        public void share(String title, String text) {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain")
                    .putExtra(Intent.EXTRA_SUBJECT, title).putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(i, title));
            });
        }

        @JavascriptInterface
        public void open(String url) {
            runOnUiThread(() -> openExternal(Uri.parse(url)));
        }

        @JavascriptInterface
        public void toast(String text) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, text, Toast.LENGTH_SHORT).show());
        }
    }
}
