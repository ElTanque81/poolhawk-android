package app.poolhawk;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import com.solana.mobilewalletadapter.clientlib.protocol.MobileWalletAdapterClient;
import com.solana.mobilewalletadapter.clientlib.protocol.MobileWalletAdapterClient.AuthorizationResult;
import com.solana.mobilewalletadapter.clientlib.scenario.LocalAssociationIntentCreator;
import com.solana.mobilewalletadapter.clientlib.scenario.LocalAssociationScenario;
import com.solana.mobilewalletadapter.clientlib.scenario.Scenario;
import java.util.Arrays;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * In-app swaps on Solana. The user's own wallet app (Phantom, Solflare, ...) is asked through the
 * Mobile Wallet Adapter to approve and sign; PoolHawk never sees a private key. Quotes and routing come
 * from Jupiter (which also routes pump.fun tokens). No fee is added.
 */
final class Wallet {
    static final String SOL = "So11111111111111111111111111111111111111112";
    private static final String CHAIN = "solana:mainnet";
    private static final Uri IDENTITY = Uri.parse("https://eltanque.netlify.app");
    private static final Uri ICON = Uri.parse("poolhawk-logo.png");

    private Wallet() {}

    static boolean available(Activity a) {
        return LocalAssociationIntentCreator.isWalletEndpointAvailable(a.getPackageManager());
    }

    interface Op {
        JSONObject run(MobileWalletAdapterClient c, String address) throws Exception;
    }

    /** Opens the wallet, authorizes PoolHawk and runs op inside the session. */
    static JSONObject session(Activity act, Op op) throws Exception {
        if (!available(act)) throw new IllegalStateException("nowallet");
        LocalAssociationScenario sc = new LocalAssociationScenario(Scenario.DEFAULT_CLIENT_TIMEOUT_MS);
        Intent intent = LocalAssociationIntentCreator.createAssociationIntent(null, sc.getPort(), sc.getSession());
        AtomicReference<Exception> fail = new AtomicReference<>();
        CountDownLatch started = new CountDownLatch(1);
        act.runOnUiThread(() -> {
            try {
                act.startActivity(intent);
            } catch (ActivityNotFoundException e) {
                fail.set(new IllegalStateException("nowallet"));
            }
            started.countDown();
        });
        started.await(5, TimeUnit.SECONDS);
        if (fail.get() != null) throw fail.get();
        try {
            MobileWalletAdapterClient client = sc.start().get(90, TimeUnit.SECONDS);
            String token = Pro.load(act, "wallet_token");
            AuthorizationResult auth;
            try {
                auth = client.authorize(IDENTITY, ICON, "PoolHawk", CHAIN, token.isEmpty() ? null : token, null, null, null).get();
            } catch (Exception e) {
                if (token.isEmpty()) throw e;
                auth = client.authorize(IDENTITY, ICON, "PoolHawk", CHAIN, null, null, null, null).get();
            }
            String address = Base58.encode(auth.publicKey);
            Pro.save(act, "wallet_token", auth.authToken == null ? "" : auth.authToken);
            Pro.save(act, "wallet_addr", address);
            Pro.save(act, "wallet_label", auth.accountLabel == null ? "" : auth.accountLabel);
            JSONObject out = op.run(client, address);
            out.put("address", address);
            out.put("label", auth.accountLabel == null ? "" : auth.accountLabel);
            return out;
        } finally {
            try {
                sc.close().get(5, TimeUnit.SECONDS);
            } catch (Exception ignored) {
            }
        }
    }

    static JSONObject connect(Activity act) throws Exception {
        return session(act, (c, address) -> new JSONObject().put("ok", true));
    }

    /** Gets a Jupiter order for this wallet, lets the wallet sign it and lands it through Jupiter. */
    static JSONObject swap(Activity act, String inputMint, String outputMint, String amount) throws Exception {
        return session(act, (client, address) -> {
            JSONObject order = new JSONObject(Api.jupOrder(inputMint, outputMint, amount, address));
            String txB64 = order.optString("transaction", "");
            if (txB64.isEmpty() || "null".equals(txB64)) {
                String err = order.optString("errorMessage", order.optString("error", "noroute"));
                return new JSONObject().put("ok", false).put("error", err.isEmpty() ? "noroute" : err);
            }
            byte[] tx = Base64.decode(txB64, Base64.DEFAULT);
            boolean canSign = false;
            try {
                MobileWalletAdapterClient.GetCapabilitiesResult caps = client.getCapabilities().get(20, TimeUnit.SECONDS);
                canSign = caps.supportedOptionalFeatures != null
                    && Arrays.asList(caps.supportedOptionalFeatures).contains("solana:signTransactions");
            } catch (Exception ignored) {
            }
            if (canSign) {
                @SuppressWarnings("deprecation")
                MobileWalletAdapterClient.SignPayloadsResult signed = client.signTransactions(new byte[][] {tx}).get(120, TimeUnit.SECONDS);
                JSONObject body = new JSONObject()
                    .put("signedTransaction", Base64.encodeToString(signed.signedPayloads[0], Base64.NO_WRAP))
                    .put("requestId", order.optString("requestId"));
                JSONObject res = new JSONObject(Api.jupExecute(body.toString()));
                boolean ok = "Success".equalsIgnoreCase(res.optString("status"));
                return new JSONObject().put("ok", ok).put("signature", res.optString("signature"))
                    .put("out", res.optString("outputAmountResult", order.optString("outAmount")))
                    .put("error", ok ? "" : res.optString("error", res.optString("status")));
            }
            MobileWalletAdapterClient.SignAndSendTransactionsResult sent =
                client.signAndSendTransactions(new byte[][] {tx}, null, null, null, null, null).get(120, TimeUnit.SECONDS);
            return new JSONObject().put("ok", true).put("signature", Base58.encode(sent.signatures[0]))
                .put("out", order.optString("outAmount")).put("error", "");
        });
    }

    /** SOL balance and the balance of one token for an address, from the public Solana RPC. */
    static JSONObject balances(String address, String mint) throws Exception {
        JSONObject out = new JSONObject();
        JSONObject bal = new JSONObject(Api.rpc("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getBalance\",\"params\":[\"" + address + "\"]}"));
        out.put("lamports", bal.optJSONObject("result") == null ? 0 : bal.getJSONObject("result").optLong("value"));
        if (mint != null && !mint.isEmpty()) {
            for (String prog : new String[] {"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"}) {
                JSONObject r = new JSONObject(Api.rpc("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getTokenAccountsByOwner\",\"params\":[\""
                    + address + "\",{\"mint\":\"" + mint + "\"},{\"encoding\":\"jsonParsed\"}]}"));
                JSONObject res = r.optJSONObject("result");
                JSONArray v = res == null ? null : res.optJSONArray("value");
                for (int i = 0; v != null && i < v.length(); i++) {
                    JSONObject ta = v.getJSONObject(i).getJSONObject("account").getJSONObject("data").getJSONObject("parsed")
                        .getJSONObject("info").getJSONObject("tokenAmount");
                    out.put("amount", ta.optString("amount", "0"));
                    out.put("decimals", ta.optInt("decimals"));
                    out.put("ui", ta.optDouble("uiAmount", 0));
                    return out;
                }
            }
            out.put("amount", "0");
        }
        return out;
    }
}
