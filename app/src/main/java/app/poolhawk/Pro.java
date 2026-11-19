package app.poolhawk;

import android.content.Context;
import android.content.SharedPreferences;
import android.provider.Settings;

/** Free / Pro and saved data. Pro is unlocked with a license key that the seller issues for this phone's device code. */
final class Pro {
    static final String SELLER_EMAIL = "eltanque81@gmx.de";
    static final String PRICE = "$9.99";
    static final String[][] PAY = {
        {"BTC (Bitcoin)", "bc1qwslmfzxdzy36sup5ncfxr20culuv9y7v9j9lk7"},
        {"ETH (Ethereum)", "0x7F8d0743D2e796501a9197A1B4c44eCe1863E1d6"},
        {"BNB (BNB Smart Chain)", "0x7F8d0743D2e796501a9197A1B4c44eCe1863E1d6"},
    };
    private static final String PREFS = "poolhawk";

    private static boolean active;
    private static String licensedTo = "";

    private Pro() {}

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean isActive() {
        return active;
    }

    static String licensedTo() {
        return licensedTo;
    }

    static String deviceCode(Context c) {
        String id = Settings.Secure.getString(c.getContentResolver(), Settings.Secure.ANDROID_ID);
        return License.deviceCode(id == null ? "unknown" : id);
    }

    /** Re-checks the stored key on every start; a key copied from another phone does not pass. */
    static void init(Context c) {
        String key = prefs(c).getString("license", "");
        License.Result r = License.check(key, deviceCode(c));
        active = r.status == License.OK;
        licensedTo = active ? r.licensedTo : "";
    }

    static int activate(Context c, String key) {
        License.Result r = License.check(key, deviceCode(c));
        if (r.status == License.OK) {
            prefs(c).edit().putString("license", key.replaceAll("\\s+", "")).apply();
            active = true;
            licensedTo = r.licensedTo;
        }
        return r.status;
    }

    static synchronized String load(Context c, String key) {
        return prefs(c).getString("data_" + key, "");
    }

    static synchronized void save(Context c, String key, String value) {
        prefs(c).edit().putString("data_" + key, value).commit();
    }
}
