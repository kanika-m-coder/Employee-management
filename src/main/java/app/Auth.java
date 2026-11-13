package app;

import com.sun.net.httpserver.HttpExchange;
import java.security.*;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.sql.*;

final class Auth {
    private static final String COOKIE = "STAFFDESK_SESSION";
    private static final int ITERATIONS = 120_000;
    private static final int KEY_LENGTH = 256;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Map<String, UserSession> SESSIONS = new ConcurrentHashMap<>();

    static final class UserSession {
        final String role;
        final int employeeId;

        UserSession(String role, int employeeId) {
            this.role = role;
            this.employeeId = employeeId;
        }
    }

    private Auth() {}

    static boolean hasAdmin() throws SQLException {
        try (Connection c = Database.getConnection(); Statement s = c.createStatement();
             ResultSet r = s.executeQuery("SELECT 1 FROM admin_accounts WHERE admin_id=1")) {
            return r.next();
        }
    }

    static String registerAdmin(String name, String email, char[] password) throws Exception {
        validatePassword(password);
        String sql = "INSERT INTO admin_accounts(admin_id,full_name,email,password_hash) VALUES(1,?,?,?)";
        try (Connection c = Database.getConnection(); PreparedStatement p = c.prepareStatement(sql)) {
            p.setString(1, name);
            p.setString(2, email);
            p.setString(3, hash(password));
            p.executeUpdate();
        } catch (SQLIntegrityConstraintViolationException e) {
            throw new IllegalStateException("Admin registration is closed or this email is already in use.");
        }
        return "ADMIN";
    }

    static UserSession authenticateAdmin(String email, char[] password) throws SQLException, GeneralSecurityException {
        try (Connection c = Database.getConnection(); PreparedStatement p = c.prepareStatement(
                "SELECT password_hash FROM admin_accounts WHERE admin_id=1 AND email=?")) {
            p.setString(1, email);
            try (ResultSet r = p.executeQuery()) {
                if (r.next() && verify(password, r.getString(1))) return new UserSession("ADMIN", 0);
            }
        }
        return null;
    }

    static UserSession authenticateEmployee(String code, char[] password) throws SQLException, GeneralSecurityException {
        try (Connection c = Database.getConnection(); PreparedStatement p = c.prepareStatement(
                "SELECT employee_id,password_hash FROM employees WHERE employee_code=? AND employment_status='ACTIVE'")) {
            p.setString(1, code);
            try (ResultSet r = p.executeQuery()) {
                if (r.next()) {
                    String encoded = r.getString("password_hash");
                    if (encoded != null && verify(password, encoded)) {
                        return new UserSession("EMPLOYEE", r.getInt("employee_id"));
                    }
                }
            }
        }
        return null;
    }

    static UserSession session(HttpExchange exchange) {
        String header = exchange.getRequestHeaders().getFirst("Cookie");
        if (header == null) return null;
        for (String part : header.split(";")) {
            String[] pair = part.trim().split("=", 2);
            if (pair.length == 2 && pair[0].equals(COOKIE)) return SESSIONS.get(pair[1]);
        }
        return null;
    }

    static void startSession(HttpExchange exchange, UserSession session) {
        String token = java.util.UUID.randomUUID().toString();
        SESSIONS.put(token, session);
        exchange.getResponseHeaders().add("Set-Cookie", COOKIE + "=" + token + "; Path=/; HttpOnly; SameSite=Lax");
    }

    static void endSession(HttpExchange exchange) {
        String header = exchange.getRequestHeaders().getFirst("Cookie");
        if (header != null) {
            for (String part : header.split(";")) {
                String[] pair = part.trim().split("=", 2);
                if (pair.length == 2 && pair[0].equals(COOKIE)) SESSIONS.remove(pair[1]);
            }
        }
        exchange.getResponseHeaders().add("Set-Cookie", COOKIE + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    }

    static void validatePassword(char[] password) {
        if (password == null || password.length < 8 || password.length > 128) {
            throw new IllegalArgumentException("Password must be between 8 and 128 characters.");
        }
    }

    static String passwordHash(char[] password) throws GeneralSecurityException {
        validatePassword(password);
        return hash(password);
    }

    private static String hash(char[] password) throws GeneralSecurityException {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        PBEKeySpec spec = new PBEKeySpec(password, salt, ITERATIONS, KEY_LENGTH);
        try {
            byte[] derived = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            return ITERATIONS + ":" + Base64.getEncoder().encodeToString(salt) + ":" +
                Base64.getEncoder().encodeToString(derived);
        } finally {
            spec.clearPassword();
        }
    }

    private static boolean verify(char[] password, String encoded) throws GeneralSecurityException {
        String[] parts = encoded.split(":", 3);
        if (parts.length != 3) return false;
        try {
            int iterations = Integer.parseInt(parts[0]);
            byte[] salt = Base64.getDecoder().decode(parts[1]);
            byte[] expected = Base64.getDecoder().decode(parts[2]);
            PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, expected.length * 8);
            try {
                byte[] actual = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                    .generateSecret(spec).getEncoded();
                return MessageDigest.isEqual(expected, actual);
            } finally {
                spec.clearPassword();
            }
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
