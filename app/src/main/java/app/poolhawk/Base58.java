package app.poolhawk;

import java.math.BigInteger;

/** Base58 (Bitcoin alphabet), used for Solana addresses and signatures. */
final class Base58 {
    private static final String A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

    private Base58() {}

    static String encode(byte[] in) {
        BigInteger n = new BigInteger(1, in);
        StringBuilder sb = new StringBuilder();
        BigInteger b58 = BigInteger.valueOf(58);
        while (n.signum() > 0) {
            BigInteger[] qr = n.divideAndRemainder(b58);
            sb.append(A.charAt(qr[1].intValue()));
            n = qr[0];
        }
        for (byte x : in) {
            if (x != 0) break;
            sb.append('1');
        }
        return sb.reverse().toString();
    }
}
