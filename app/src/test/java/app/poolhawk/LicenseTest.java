package app.poolhawk;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.Base64;
import org.junit.Test;

/** Builds license keys exactly like the seller's make_license.py and checks that only the right ones pass. */
public class LicenseTest {
    private static final byte[] DIGEST_INFO = License.hex("3031300d060960864801650304020105000420");
    private static final KeyPair KEYS = keys();
    private static final String N = ((RSAPublicKey) KEYS.getPublic()).getModulus().toString(16);
    private static final byte[] MASTER = License.sha256("test master key".getBytes(StandardCharsets.UTF_8));
    private static final String KEY_HASH = License.toHex(License.sha256(MASTER));

    private static KeyPair keys() {
        try {
            KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");
            g.initialize(2048);
            return g.generateKeyPair();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static String b64(byte[] b) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    private static String make(KeyPair signer, String to, String deviceCode) {
        String id = "0a1b2c3d";
        byte[] pad = License.sha256(("wrap|" + deviceCode.replace("-", "") + "|" + id).getBytes(StandardCharsets.UTF_8));
        byte[] w = MASTER.clone();
        for (int i = 0; i < w.length; i++) w[i] ^= pad[i];
        byte[] payload = ("{\"v\":2,\"to\":\"" + to + "\",\"id\":\"" + id + "\",\"issued\":\"2026-11-15\",\"w\":[\"" + License.toHex(w) + "\"]}").getBytes(StandardCharsets.UTF_8);
        RSAPrivateKey priv = (RSAPrivateKey) signer.getPrivate();
        int size = (priv.getModulus().bitLength() + 7) / 8;
        byte[] digest = License.sha256(payload);
        byte[] em = new byte[size];
        em[1] = 1;
        int tail = DIGEST_INFO.length + digest.length;
        for (int i = 2; i < size - tail - 1; i++) em[i] = (byte) 0xFF;
        System.arraycopy(DIGEST_INFO, 0, em, size - tail, DIGEST_INFO.length);
        System.arraycopy(digest, 0, em, size - digest.length, digest.length);
        byte[] sig = License.fixed(new BigInteger(1, em).modPow(priv.getPrivateExponent(), priv.getModulus()), size);
        return "SSW1-" + b64(payload) + "." + b64(sig);
    }

    private final String code = License.deviceCode("a1b2c3d4e5f60718");

    @Test
    public void deviceCodeHasDesktopFormat() {
        assertTrue(code, code.matches("([0-9A-F]{5}-){3}[0-9A-F]{5}"));
        assertEquals(code, License.deviceCode("a1b2c3d4e5f60718"));
        assertTrue(!code.equals(License.deviceCode("ffffffffffffffff")));
    }

    @Test
    public void keyForThisDeviceUnlocks() {
        License.Result r = License.check(make(KEYS, "Max \\\"Test\\\" <max@example.com>", code), code, N, KEY_HASH);
        assertEquals(License.OK, r.status);
        assertEquals("Max \"Test\" <max@example.com>", r.licensedTo);
        String spaced = make(KEYS, "x", code).replaceAll("(.{40})", "$1\n ");
        assertEquals(License.OK, License.check(spaced, code, N, KEY_HASH).status);
    }

    @Test
    public void keyForAnotherDeviceIsRefused() {
        String other = License.deviceCode("another-phone");
        assertEquals(License.WRONG_DEVICE, License.check(make(KEYS, "x", other), code, N, KEY_HASH).status);
    }

    @Test
    public void forgedAndBrokenKeysAreRefused() {
        assertEquals(License.INVALID, License.check(make(keys(), "x", code), code, N, KEY_HASH).status);
        String good = make(KEYS, "x", code);
        String[] p = good.substring(5).split("\\.");
        byte[] payload = Base64.getUrlDecoder().decode(p[0]);
        payload[10] ^= 1;
        assertEquals(License.INVALID, License.check("SSW1-" + b64(payload) + "." + p[1], code, N, KEY_HASH).status);
        for (String bad : new String[] {"", null, "SSW1-abc.def", "hello", "SSW1-" + p[0], "XXX1-" + good.substring(5)}) {
            assertEquals(License.INVALID, License.check(bad, code, N, KEY_HASH).status);
        }
    }

    @Test
    public void builtInPublicKeyRejectsForeignKeys() {
        assertEquals(License.INVALID, License.check(make(KEYS, "x", code), code).status);
    }
}
