package app.poolhawk;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Checks Pro license keys. Keys are created by the seller with make_license.py, the same tool as for
 * SecretSweep: they are signed with the seller's private key and locked to one device code. PoolHawk device
 * codes differ from SecretSweep's, so a key issued for one app never unlocks the other.
 * This class only holds the public key, so it can verify keys but never create them. Pure Java, unit-tested.
 */
final class License {
    /** Seller's public RSA modulus (hex). */
    static final String PUBKEY_N = "c843d7dfa651b24d753cb005491b8cec89f47e1d117732b043ea5156b47dc96f0e8aee94966226f7b8eb9d183d3b82fd17f1e63d7335315151d497e13356635d9dfb23cb4e016daefd802f427060d01342902d17bdb4c08ee3910f5daaedaaec2992b73478808a382cbfb7740debbbacf7c91c846d6445af68591153b6f1d6a4ba2142cc1391470fafc1a12e8920ab3a42064467f7da3c0846282004804a37267322287718fc46e6699b6741c75e4a64a1f72679c7f6d960ed2397089e1149b2927a1e546603a9cca2e827d93bcb483d46619c81d6eeb9fa003738f3a602176e29cb414f9efd6a87e07858c2f55747059a47891eec44054f8498c4710ccc8ec5";
    /** SHA-256 of the value that a license must unlock with this device's code. */
    static final String KEY_HASH = "85762458f6207282327f908b1582a9f27f91ab24ed4834fde55507f8054e2e4b";

    static final int OK = 0;
    static final int INVALID = 1;
    static final int WRONG_DEVICE = 2;

    static final class Result {
        final int status;
        final String licensedTo;

        Result(int status, String licensedTo) {
            this.status = status;
            this.licensedTo = licensedTo;
        }
    }

    private static final byte[] DIGEST_INFO = hex("3031300d060960864801650304020105000420");
    private static final Pattern TO = Pattern.compile("\"to\":\"((?:[^\"\\\\]|\\\\.)*)\"");
    private static final Pattern ID = Pattern.compile("\"id\":\"([0-9a-f]{1,32})\"");
    private static final Pattern WRAPPED = Pattern.compile("\"w\":\\[([^\\]]*)\\]");
    private static final Pattern HEX64 = Pattern.compile("[0-9a-f]{64}");

    private License() {}

    static Result check(String key, String deviceCode) {
        return check(key, deviceCode, PUBKEY_N, KEY_HASH);
    }

    static Result check(String key, String deviceCode, String modulusHex, String keyHashHex) {
        try {
            String k = key == null ? "" : key.replaceAll("\\s+", "");
            if (!k.startsWith("SSW1-")) return new Result(INVALID, "");
            String[] parts = k.substring(5).split("\\.");
            if (parts.length != 2) return new Result(INVALID, "");
            byte[] payload = Base64.getUrlDecoder().decode(parts[0]);
            byte[] sig = Base64.getUrlDecoder().decode(parts[1]);
            BigInteger n = new BigInteger(modulusHex, 16);
            int size = (n.bitLength() + 7) / 8;
            byte[] em = fixed(new BigInteger(1, sig).modPow(BigInteger.valueOf(65537), n), size);
            byte[] want = new byte[size];
            byte[] digest = sha256(payload);
            int tail = DIGEST_INFO.length + digest.length;
            want[1] = 1;
            Arrays.fill(want, 2, size - tail - 1, (byte) 0xFF);
            System.arraycopy(DIGEST_INFO, 0, want, size - tail, DIGEST_INFO.length);
            System.arraycopy(digest, 0, want, size - digest.length, digest.length);
            if (!MessageDigest.isEqual(em, want)) return new Result(INVALID, "");

            // The signature is genuine. Now: was this key issued for this device?
            String json = new String(payload, StandardCharsets.UTF_8);
            String to = "";
            Matcher mt = TO.matcher(json);
            if (mt.find()) {
                to = unescape(mt.group(1));
                json = json.substring(0, mt.start()) + json.substring(mt.end());
            }
            Matcher mi = ID.matcher(json);
            Matcher mw = WRAPPED.matcher(json);
            if (!mi.find() || !mw.find()) return new Result(INVALID, "");
            String code = deviceCode.replace("-", "").toUpperCase(Locale.ROOT);
            byte[] pad = sha256(("wrap|" + code + "|" + mi.group(1)).getBytes(StandardCharsets.UTF_8));
            List<String> wrapped = new ArrayList<>();
            Matcher mh = HEX64.matcher(mw.group(1));
            while (mh.find()) wrapped.add(mh.group());
            byte[] expected = hex(keyHashHex);
            for (String w : wrapped) {
                byte[] master = hex(w);
                for (int i = 0; i < master.length; i++) master[i] ^= pad[i];
                if (MessageDigest.isEqual(sha256(master), expected)) return new Result(OK, to);
            }
            return new Result(WRONG_DEVICE, to);
        } catch (Exception e) {
            return new Result(INVALID, "");
        }
    }

    /** Anonymous, stable code for one phone, in the format the seller's license tool expects. */
    static String deviceCode(String androidId) {
        String h = toHex(sha256(("poolhawk-android|" + androidId).getBytes(StandardCharsets.UTF_8))).substring(0, 20).toUpperCase(Locale.ROOT);
        return h.substring(0, 5) + "-" + h.substring(5, 10) + "-" + h.substring(10, 15) + "-" + h.substring(15, 20);
    }

    private static String unescape(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c != '\\' || i + 1 >= s.length()) {
                sb.append(c);
                continue;
            }
            char e = s.charAt(++i);
            if (e == 'u' && i + 4 < s.length()) {
                sb.append((char) Integer.parseInt(s.substring(i + 1, i + 5), 16));
                i += 4;
            } else if (e == 'n' || e == 't' || e == 'r') {
                sb.append(' ');
            } else {
                sb.append(e);
            }
        }
        return sb.toString();
    }

    static byte[] sha256(byte[] in) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(in);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    static byte[] fixed(BigInteger v, int len) {
        byte[] raw = v.toByteArray();
        byte[] out = new byte[len];
        int copy = Math.min(len, raw.length);
        System.arraycopy(raw, raw.length - copy, out, len - copy, copy);
        return out;
    }

    static byte[] hex(String s) {
        byte[] out = new byte[s.length() / 2];
        for (int i = 0; i < out.length; i++) out[i] = (byte) Integer.parseInt(s.substring(2 * i, 2 * i + 2), 16);
        return out;
    }

    static String toHex(byte[] b) {
        StringBuilder sb = new StringBuilder();
        for (byte x : b) sb.append(String.format("%02x", x));
        return sb.toString();
    }
}
