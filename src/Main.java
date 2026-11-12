import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.regex.*;

public class Main {
  static final Properties C = new Properties();
  static { try (InputStream in = new FileInputStream("config.properties")) { C.load(in); } catch (IOException e) { } }
  static String cfg(String k, String d) { String v = C.getProperty(k); return v == null || v.trim().isEmpty() ? d : v.trim(); }
  static final String OK = "{\"ok\":true}";

  static Connection db() throws SQLException {
    String url = "jdbc:mysql://" + cfg("db.host", "localhost") + ":" + cfg("db.port", "3306") + "/" + cfg("db.name", "payroll_db")
        + "?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
    return DriverManager.getConnection(url, cfg("db.user", "root"), C.getProperty("db.pass", ""));
  }
  static String esc(String s) { return s.replace("\\", "\\\\").replace("\"", "\\\"").replaceAll("\\p{Cntrl}", " "); }
  static PreparedStatement prep(Connection c, String sql, Object[] p) throws SQLException {
    PreparedStatement s = c.prepareStatement(sql); for (int i = 0; i < p.length; i++) s.setObject(i + 1, p[i]); return s;
  }
  static String json(String sql, Object... p) throws SQLException {
    try (Connection c = db(); PreparedStatement s = prep(c, sql, p); ResultSet r = s.executeQuery()) {
      ResultSetMetaData m = r.getMetaData(); StringBuilder b = new StringBuilder("[");
      while (r.next()) {
        if (b.length() > 1) b.append(',');
        b.append('{');
        for (int i = 1; i <= m.getColumnCount(); i++) {
          if (i > 1) b.append(',');
          Object v = r.getObject(i);
          b.append('"').append(m.getColumnLabel(i)).append("\":")
           .append(v == null ? "null" : v instanceof Number ? v.toString() : "\"" + esc(v.toString()) + "\"");
        }
        b.append('}');
      }
      return b.append(']').toString();
    }
  }
  static int exec(String sql, Object... p) throws SQLException { try (Connection c = db(); PreparedStatement s = prep(c, sql, p)) { return s.executeUpdate(); } }
  static String one(String sql, Object... p) throws SQLException {
    try (Connection c = db(); PreparedStatement s = prep(c, sql, p); ResultSet r = s.executeQuery()) { return r.next() && r.getString(1) != null ? r.getString(1) : ""; }
  }
  static double num(String sql, Object... p) throws SQLException { String v = one(sql, p); return v.isEmpty() ? 0 : Double.parseDouble(v); }
  static List<String> col(String sql) throws SQLException {
    List<String> l = new ArrayList<>();
    try (Connection c = db(); Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) { while (r.next()) l.add(r.getString(1)); }
    return l;
  }
  static double r2(double v) { return Math.round(v * 100) / 100.0; }

  static Map<String, String> body(HttpExchange x) throws IOException {
    String t = new String(x.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
    Map<String, String> m = new HashMap<>();
    Matcher k = Pattern.compile("\"(\\w+)\"\\s*:\\s*(?:\"((?:[^\"\\\\]|\\\\.)*)\"|([^,}\\s]+))").matcher(t);
    while (k.find()) m.put(k.group(1), k.group(2) != null ? k.group(2).replace("\\\"", "\"").replace("\\\\", "\\") : k.group(3));
    return m;
  }
  static Map<String, String> qp(URI u) {
    Map<String, String> m = new HashMap<>(); String q = u.getRawQuery();
    if (q != null) for (String kv : q.split("&")) { String[] a = kv.split("=", 2); m.put(a[0], a.length > 1 ? URLDecoder.decode(a[1], StandardCharsets.UTF_8) : ""); }
    return m;
  }
  static String g(Map<String, String> m, String k) { String v = m.get(k); return v == null ? "" : v.trim(); }
  static void need(Map<String, String> b, String... ks) { for (String k : ks) if (g(b, k).isEmpty()) throw new IllegalArgumentException("Please fill in the required field: " + k); }

  public static void main(String[] a) throws Exception {
    int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
    HttpServer s = HttpServer.create(new InetSocketAddress(port), 0);
    s.createContext("/", Main::handle);
    s.start();
    System.out.println("AttendPay running at http://localhost:" + port);
  }
  static void send(HttpExchange x, int code, String type, byte[] data) throws IOException {
    x.getResponseHeaders().set("Content-Type", type.startsWith("image") ? type : type + "; charset=utf-8");
    x.sendResponseHeaders(code, data.length);
    try (OutputStream o = x.getResponseBody()) { o.write(data); }
  }
  static void handle(HttpExchange x) throws IOException {
    String p = x.getRequestURI().getPath(); String J = "application/json";
    try {
      if (p.startsWith("/api/")) send(x, 200, J, route(x.getRequestMethod(), p.substring(5), x).getBytes(StandardCharsets.UTF_8));
      else file(x, p);
    } catch (IllegalArgumentException | DateTimeException e) {
      send(x, 400, J, ("{\"error\":\"" + esc(String.valueOf(e.getMessage())) + "\"}").getBytes(StandardCharsets.UTF_8));
    } catch (SQLIntegrityConstraintViolationException e) {
      send(x, 400, J, "{\"error\":\"This record already exists or is linked to other records.\"}".getBytes());
    } catch (Exception e) {
      e.printStackTrace();
      send(x, 500, J, ("{\"error\":\"Server error: " + esc(String.valueOf(e.getMessage())) + "\"}").getBytes(StandardCharsets.UTF_8));
    }
  }
  static void file(HttpExchange x, String p) throws IOException {
    if (p.equals("/")) p = "/login.html";
    Path root = Paths.get("web").toAbsolutePath().normalize(), f = root.resolve("." + p).normalize();
    if (!f.startsWith(root) || !Files.isRegularFile(f)) { send(x, 404, "text/plain", "Not found".getBytes()); return; }
    String n = f.toString();
    String t = n.endsWith(".html") ? "text/html" : n.endsWith(".css") ? "text/css" : n.endsWith(".js") ? "text/javascript"
        : n.endsWith(".png") ? "image/png" : n.endsWith(".json") ? "application/json" : "application/octet-stream";
    send(x, 200, t, Files.readAllBytes(f));
  }

  static String route(String m, String p, HttpExchange x) throws Exception {
    Map<String, String> q = qp(x.getRequestURI());
    Map<String, String> b = (m.equals("POST") || m.equals("PUT")) ? body(x) : q;
    String[] s = p.split("/");
    switch (s[0]) {
      case "admin-status": {
        long count = (long) num("SELECT COUNT(*) FROM users WHERE role='ADMIN'");
        return "{\"exists\":" + (count > 0) + ",\"count\":" + count + "}";
      }
      case "register": {
        if (!m.equals("POST")) throw new IllegalArgumentException("Method not allowed");
        long count = (long) num("SELECT COUNT(*) FROM users WHERE role='ADMIN'");
        if (count > 0) {
          throw new IllegalArgumentException("Only one admin can access. An admin account is already registered.");
        }
        need(b, "username", "password");
        String u = g(b, "username"), pass = g(b, "password");
        if (u.length() < 3) throw new IllegalArgumentException("Username must be at least 3 characters");
        if (pass.length() < 4) throw new IllegalArgumentException("Password must be at least 4 characters");
        exec("INSERT INTO users(username,password,role,emp_id) VALUES(?,?,'ADMIN',NULL)", u, pass);
        return OK;
      }
      case "delete-admin": {
        need(b, "username");
        String u = g(b, "username");
        int deleted = exec("DELETE FROM users WHERE username=? AND role='ADMIN'", u);
        if (deleted == 0) throw new IllegalArgumentException("Admin account not found or already deleted");
        return OK;
      }
      case "login": {
        String r = json("SELECT u.role, u.username, COALESCE(e.emp_name,'Administrator') name, u.emp_id empId FROM users u LEFT JOIN employees e ON e.emp_id=u.emp_id WHERE u.username=? AND u.password=? AND u.role=?",
            g(b, "username"), g(b, "password"), g(b, "role"));
        if (r.equals("[]")) throw new IllegalArgumentException("Invalid username or password");
        return r.substring(1, r.length() - 1);
      }
      case "dashboard": return dashboard();
      case "departments": return json("SELECT dept_id id, dept_name name FROM departments ORDER BY dept_name");
      case "rules": return json("SELECT hra_percent hra, da_percent da, pf_percent pf FROM salary_rules");
      case "employees": return employees(m, s, b);
      case "attendance": return attendance(m, b);
      case "leave": return leave(m, s, b);
      case "payroll": return payroll(m, s, b);
      case "reports": return reports(s[1], b);
      case "analytics": {
        ProcessBuilder pb = new ProcessBuilder(cfg("python.cmd", System.getProperty("os.name").toLowerCase().contains("win") ? "python" : "python3"), "python/analysis.py");
        pb.redirectErrorStream(true);
        Process pr = pb.start();
        String o = new String(pr.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        if (pr.waitFor() != 0) throw new IllegalArgumentException("Python analysis failed. Install pandas, matplotlib and mysql-connector-python. " + o.substring(Math.max(0, o.length() - 300)));
        return OK;
      }
      default: throw new IllegalArgumentException("Unknown endpoint");
    }
  }

  static String dashboard() throws Exception {
    String d = one("SELECT MAX(att_date) FROM attendance"); if (d.isEmpty()) d = "1970-01-01";
    String pr = "SELECT SUM(%s) FROM attendance WHERE att_date=?";
    String sm = "SUM(a.status IN ('Present','Half Day')) present, SUM(a.status='Absent') absent";
    return "{\"date\":\"" + d + "\",\"totalEmployees\":" + (long) num("SELECT COUNT(*) FROM employees")
      + ",\"present\":" + (long) num(String.format(pr, "status IN ('Present','Half Day')"), d)
      + ",\"absent\":" + (long) num(String.format(pr, "status='Absent'"), d)
      + ",\"onLeave\":" + (long) num(String.format(pr, "status='On Leave'"), d)
      + ",\"monthlyPayroll\":" + String.format("%.2f", num("SELECT COALESCE(SUM(net_salary),0) FROM payroll WHERE pay_year*100+pay_month=(SELECT MAX(pay_year*100+pay_month) FROM payroll)"))
      + ",\"byDepartment\":" + json("SELECT d.dept_name department, " + sm + " FROM attendance a JOIN employees e ON e.emp_id=a.emp_id JOIN departments d ON d.dept_id=e.dept_id GROUP BY d.dept_name ORDER BY d.dept_name")
      + ",\"monthly\":" + json("SELECT DATE_FORMAT(a.att_date,'%Y-%m') `month`, " + sm + " FROM attendance a GROUP BY `month` ORDER BY `month`") + "}";
  }

  static String employees(String m, String[] s, Map<String, String> b) throws Exception {
    if (m.equals("GET")) {
      String q = "%" + g(b, "q") + "%", d = g(b, "dept");
      return json("SELECT e.emp_id id, e.emp_name name, e.dept_id deptId, d.dept_name department, e.designation, e.basic_salary salary, e.join_date joinDate FROM employees e JOIN departments d ON d.dept_id=e.dept_id WHERE (e.emp_name LIKE ? OR CAST(e.emp_id AS CHAR) LIKE ?) AND (?='' OR e.dept_id=?) ORDER BY e.emp_id", q, q, d, d);
    }
    if (m.equals("DELETE")) { exec("DELETE FROM employees WHERE emp_id=?", s[1]); return OK; }
    need(b, "name", "deptId", "designation", "salary", "joinDate");
    if (Double.parseDouble(g(b, "salary")) <= 0) throw new IllegalArgumentException("Basic salary must be greater than zero");
    Object[] v = { g(b, "name"), g(b, "deptId"), g(b, "designation"), g(b, "salary"), g(b, "joinDate") };
    if (m.equals("POST")) {
      exec("INSERT INTO employees(emp_name,dept_id,designation,basic_salary,join_date) VALUES(?,?,?,?,?)", v);
      exec("INSERT INTO users(username,password,role,emp_id) SELECT CAST(MAX(emp_id) AS CHAR),'emp123','EMPLOYEE',MAX(emp_id) FROM employees");
    } else {
      exec("UPDATE employees SET emp_name=?,dept_id=?,designation=?,basic_salary=?,join_date=? WHERE emp_id=?", v[0], v[1], v[2], v[3], v[4], s[1]);
    }
    return OK;
  }

  static void mark(String emp, LocalDate d, String st) throws SQLException {
    double h = st.equals("Present") ? 8 : st.equals("Half Day") ? 4 : 0;
    exec("INSERT INTO attendance(emp_id,att_date,status,working_hours) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),working_hours=VALUES(working_hours)", emp, d.toString(), st, h);
  }
  static String attendance(String m, Map<String, String> b) throws Exception {
    if (m.equals("GET")) {
      String e = g(b, "emp"), f = g(b, "from"), t = g(b, "to");
      return json("SELECT a.att_date date, e.emp_id empId, e.emp_name name, d.dept_name department, a.status, a.working_hours hours FROM attendance a JOIN employees e ON e.emp_id=a.emp_id JOIN departments d ON d.dept_id=e.dept_id WHERE (?='' OR a.emp_id=?) AND (?='' OR a.att_date>=?) AND (?='' OR a.att_date<=?) ORDER BY a.att_date DESC, e.emp_id LIMIT 1000", e, e, f, f, t, t);
    }
    need(b, "empId", "date", "status");
    mark(g(b, "empId"), LocalDate.parse(g(b, "date")), g(b, "status"));
    return OK;
  }

  static String leave(String m, String[] s, Map<String, String> b) throws Exception {
    if (m.equals("GET")) {
      if (s.length > 1) return json("SELECT e.emp_id empId, e.emp_name name, COALESCE(SUM(a.status='Absent'),0) absent, COALESCE(SUM(a.status='Half Day'),0) halfDays, COALESCE(SUM(a.status='On Leave'),0) onLeave FROM employees e LEFT JOIN attendance a ON a.emp_id=e.emp_id GROUP BY e.emp_id, e.emp_name ORDER BY absent DESC");
      String e = g(b, "emp");
      return json("SELECT l.leave_id id, e.emp_id empId, e.emp_name name, l.leave_type type, l.start_date startDate, l.end_date endDate, l.total_days days, l.reason, l.status FROM leave_records l JOIN employees e ON e.emp_id=l.emp_id WHERE (?='' OR l.emp_id=?) ORDER BY l.start_date DESC", e, e);
    }
    if (m.equals("DELETE")) { exec("DELETE FROM leave_records WHERE leave_id=?", s[1]); return OK; }
    need(b, "empId", "type", "startDate", "endDate");
    LocalDate a = LocalDate.parse(g(b, "startDate")), z = LocalDate.parse(g(b, "endDate"));
    if (z.isBefore(a)) throw new IllegalArgumentException("End date cannot be before the start date");
    String st = g(b, "status").isEmpty() ? "Approved" : g(b, "status"), emp = g(b, "empId"), type = g(b, "type");
    int days = 0;
    for (LocalDate d = a; !d.isAfter(z); d = d.plusDays(1)) {
      if (d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY) continue;
      days++;
      if (st.equals("Approved")) mark(emp, d, type.equals("Loss of Pay") ? "Absent" : "On Leave");
    }
    if (days == 0) throw new IllegalArgumentException("The selected dates fall only on weekends");
    exec("INSERT INTO leave_records(emp_id,leave_type,start_date,end_date,total_days,reason,status) VALUES(?,?,?,?,?,?,?)", emp, type, a.toString(), z.toString(), days, g(b, "reason"), st);
    return OK;
  }

  static final String PAYSQL = "SELECT e.emp_id empId, e.emp_name name, d.dept_name department, p.working_days workingDays, p.days_present daysPresent, p.paid_leave_days paidLeave, p.absent_days absentDays, p.basic, p.hra, p.da, p.pf_deduction pf, p.absence_deduction absenceDeduction, p.net_salary net FROM payroll p JOIN employees e ON e.emp_id=p.emp_id JOIN departments d ON d.dept_id=e.dept_id WHERE p.pay_month=? AND p.pay_year=? ORDER BY e.emp_id";
  static String payroll(String m, String[] s, Map<String, String> b) throws Exception {
    need(b, "month", "year");
    int mo = Integer.parseInt(g(b, "month")), yr = Integer.parseInt(g(b, "year"));
    if (m.equals("GET")) return json(PAYSQL, mo, yr);
    if (s.length > 1 && s[1].equals("all")) {
      int n = 0;
      for (String id : col("SELECT emp_id FROM employees")) { try { calc(id, mo, yr); n++; } catch (IllegalArgumentException e) { } }
      if (n == 0) throw new IllegalArgumentException("No attendance has been recorded for this month");
      return "{\"generated\":" + n + "}";
    }
    need(b, "empId");
    calc(g(b, "empId"), mo, yr);
    return OK;
  }
  static double cnt(String emp, String st, String f, String t) throws SQLException {
    return num("SELECT COUNT(*) FROM attendance WHERE emp_id=? AND status=? AND att_date BETWEEN ? AND ?", emp, st, f, t);
  }
  static void calc(String emp, int mo, int yr) throws Exception {
    YearMonth ym = YearMonth.of(yr, mo); int wd = 0;
    for (int d = 1; d <= ym.lengthOfMonth(); d++) { DayOfWeek w = ym.atDay(d).getDayOfWeek(); if (w != DayOfWeek.SATURDAY && w != DayOfWeek.SUNDAY) wd++; }
    double basic = num("SELECT basic_salary FROM employees WHERE emp_id=?", emp);
    if (basic == 0) throw new IllegalArgumentException("Employee not found");
    String f = ym.atDay(1).toString(), t = ym.atEndOfMonth().toString();
    double pr = cnt(emp, "Present", f, t), hd = cnt(emp, "Half Day", f, t), ol = cnt(emp, "On Leave", f, t), ab = cnt(emp, "Absent", f, t);
    if (pr + hd + ol + ab == 0) throw new IllegalArgumentException("No attendance recorded for this month");
    double hra = r2(basic * num("SELECT hra_percent FROM salary_rules WHERE rule_id=1") / 100);
    double da = r2(basic * num("SELECT da_percent FROM salary_rules WHERE rule_id=1") / 100);
    double pf = r2(basic * num("SELECT pf_percent FROM salary_rules WHERE rule_id=1") / 100);
    double absDays = ab + hd * 0.5, ded = r2(basic / wd * absDays), net = r2(basic + hra + da - pf - ded);
    exec("INSERT INTO payroll(emp_id,pay_month,pay_year,working_days,days_present,paid_leave_days,absent_days,basic,hra,da,pf_deduction,absence_deduction,net_salary) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE working_days=VALUES(working_days),days_present=VALUES(days_present),paid_leave_days=VALUES(paid_leave_days),absent_days=VALUES(absent_days),basic=VALUES(basic),hra=VALUES(hra),da=VALUES(da),pf_deduction=VALUES(pf_deduction),absence_deduction=VALUES(absence_deduction),net_salary=VALUES(net_salary),generated_on=NOW()",
        emp, mo, yr, wd, pr + hd * 0.5, ol, absDays, basic, hra, da, pf, ded, net);
  }

  static String reports(String kind, Map<String, String> b) throws Exception {
    need(b, "from", "to");
    String f = g(b, "from"), t = g(b, "to");
    String cols = "COALESCE(SUM(a.status='Present'),0) present, COALESCE(SUM(a.status='Half Day'),0) halfDays, COALESCE(SUM(a.status='On Leave'),0) onLeave, COALESCE(SUM(a.status='Absent'),0) absent, ROUND(100*SUM(a.status IN ('Present','Half Day'))/NULLIF(COUNT(a.att_date),0),1) attendancePct";
    if (kind.equals("employee"))
      return json("SELECT e.emp_id empId, e.emp_name name, d.dept_name department, " + cols + ", COALESCE(SUM(a.working_hours),0) hours FROM employees e JOIN departments d ON d.dept_id=e.dept_id LEFT JOIN attendance a ON a.emp_id=e.emp_id AND a.att_date BETWEEN ? AND ? GROUP BY e.emp_id, e.emp_name, d.dept_name ORDER BY e.emp_id", f, t);
    return json("SELECT d.dept_name department, COUNT(DISTINCT e.emp_id) employees, " + cols + " FROM departments d LEFT JOIN employees e ON e.dept_id=d.dept_id LEFT JOIN attendance a ON a.emp_id=e.emp_id AND a.att_date BETWEEN ? AND ? GROUP BY d.dept_id, d.dept_name ORDER BY d.dept_name", f, t);
  }
}
