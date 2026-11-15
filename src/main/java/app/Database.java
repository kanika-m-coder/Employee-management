package app;
import java.sql.*;

public final class Database {
    private static final int STARTUP_ATTEMPTS = 5;
    private static final long RETRY_DELAY_MILLIS = 2000;
    private static final String URL = System.getenv().getOrDefault("DB_URL",
        "jdbc:mysql://localhost:3306/employee_payroll?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC");
    private static final String USER = System.getenv().getOrDefault("DB_USER", "root");
    private static final String PASSWORD = System.getenv().getOrDefault("DB_PASSWORD", "kani@24");
    private Database() {}

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }

    public static void initializeWithRetry() throws SQLException {
        for (int attempt = 1; ; attempt++) {
            try {
                initializeAuthSchema();
                return;
            } catch (SQLException e) {
                if (!isConnectionFailure(e) || attempt >= STARTUP_ATTEMPTS) {
                    throw e;
                }
                System.err.println("MySQL is not ready; retrying startup (" + (attempt + 1) + "/"
                    + STARTUP_ATTEMPTS + ")...");
                try {
                    Thread.sleep(RETRY_DELAY_MILLIS);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    e.addSuppressed(interrupted);
                    throw e;
                }
            }
        }
    }

    public static boolean isConnectionFailure(SQLException e) {
        for (SQLException current = e; current != null; current = current.getNextException()) {
            String state = current.getSQLState();
            if (state != null && state.startsWith("08")) {
                return true;
            }
        }
        return false;
    }

    public static void initializeAuthSchema() throws SQLException {
        try (Connection c = getConnection(); Statement s = c.createStatement()) {
            s.executeUpdate("CREATE TABLE IF NOT EXISTS admin_accounts (" +
                "admin_id TINYINT NOT NULL PRIMARY KEY," +
                "full_name VARCHAR(100) NOT NULL," +
                "email VARCHAR(120) NOT NULL UNIQUE," +
                "password_hash VARCHAR(255) NOT NULL," +
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
            boolean hasPasswordHash = false;
            try (ResultSet columns = c.getMetaData().getColumns(c.getCatalog(), null, "employees", "password_hash")) {
                hasPasswordHash = columns.next();
            }
            if (!hasPasswordHash) {
                s.executeUpdate("ALTER TABLE employees ADD COLUMN password_hash VARCHAR(255) NULL");
            }
        }
    }
}
