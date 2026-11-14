package app;

import com.sun.net.httpserver.*;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.util.*;

public class Main {
    private static final int PORT=8080;
    private static final Path WEB=Paths.get("src/main/resources");

    public static void main(String[] args) throws Exception {
        try(Connection ignored=Database.getConnection()){System.out.println("MySQL connection successful.");}
        Database.initializeAuthSchema();
        HttpServer server=HttpServer.create(new InetSocketAddress(PORT),0);
        server.createContext("/api/auth",Main::auth);
        server.createContext("/api/employee",Main::employeePortal);
        server.createContext("/api/employees",Main::employees);
        server.createContext("/api/attendance",Main::attendance);
        server.createContext("/api/leaves",Main::leaves);
        server.createContext("/api/payroll",Main::payroll);
        server.createContext("/api/summary",Main::summary);
        server.createContext("/",Main::staticFiles);
        server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool());
        server.start();
        System.out.println("Open http://localhost:"+PORT);
    }

    private static void auth(HttpExchange x)throws IOException {
        try {
            String path=x.getRequestURI().getPath(),method=x.getRequestMethod();
            if(path.equals("/api/auth/session")&&method.equals("GET")){
                Auth.UserSession session=Auth.session(x);
                send(x,200,row("authenticated",session!=null,"role",session==null?null:session.role,
                    "adminRegistered",Auth.hasAdmin()));return;
            }
            if(path.equals("/api/auth/logout")&&method.equals("POST")){
                Auth.endSession(x);send(x,200,row("message","Signed out"));return;
            }
            if(path.equals("/api/auth/register-admin")&&method.equals("POST")){
                Map<String,Object>b=body(x);String name=str(b,"full_name").trim(),email=str(b,"email").trim().toLowerCase(Locale.ROOT);
                char[] password=str(b,"password").toCharArray();
                if(name.isBlank()||email.isBlank()){send(x,400,row("error","Name and email are required."));return;}
                if(Auth.hasAdmin()){send(x,409,row("error","An administrator is already registered."));return;}
                try{Auth.registerAdmin(name,email,password);}finally{Arrays.fill(password,'\0');}
                Auth.startSession(x,new Auth.UserSession("ADMIN",0));
                send(x,201,row("role","ADMIN","message","Administrator registered"));return;
            }
            if(path.equals("/api/auth/login")&&method.equals("POST")){
                Map<String,Object>b=body(x);String role=str(b,"role").toUpperCase(Locale.ROOT);
                char[] password=str(b,"password").toCharArray();
                Auth.UserSession session;
                try{
                    if(role.equals("ADMIN")){
                        session=Auth.authenticateAdmin(str(b,"email").trim().toLowerCase(Locale.ROOT),password);
                    }else if(role.equals("EMPLOYEE")){
                        session=Auth.authenticateEmployee(str(b,"employee_code").trim(),password);
                    }else{send(x,400,row("error","Choose a valid account type."));return;}
                }finally{Arrays.fill(password,'\0');}
                if(session==null){send(x,401,row("error","Invalid login details."));return;}
                Auth.startSession(x,session);send(x,200,row("role",session.role));return;
            }
            send(x,405,row("error","Method not allowed"));
        }catch(IllegalStateException|IllegalArgumentException e){send(x,409,row("error",e.getMessage()));}
        catch(Exception e){fail(x,e);}
    }

    private static void employeePortal(HttpExchange x)throws IOException {
        try{
            Auth.UserSession session=Auth.session(x);
            if(session==null){send(x,401,row("error","Please sign in."));return;}
            if(!session.role.equals("EMPLOYEE")){send(x,403,row("error","Employee access required."));return;}
            if(x.getRequestURI().getPath().equals("/api/employee/portal")&&x.getRequestMethod().equals("GET")){
                Map<String,Object> employee;
                try(Connection c=Database.getConnection();PreparedStatement p=c.prepareStatement(
                    "SELECT employee_code,full_name,department,designation FROM employees WHERE employee_id=?")){
                    p.setInt(1,session.employeeId);
                    try(ResultSet r=p.executeQuery()){
                        if(!r.next()){send(x,401,row("error","Employee account not found."));return;}
                        employee=row("employee_code",r.getString("employee_code"),"full_name",r.getString("full_name"),
                            "department",r.getString("department"),"designation",r.getString("designation"));
                    }
                }
                List<Map<String,Object>> attendance=new ArrayList<>(),leaves=new ArrayList<>(),payroll=new ArrayList<>();
                try(Connection c=Database.getConnection()){
                    try(PreparedStatement p=c.prepareStatement("SELECT attendance_date,check_in,check_out,attendance_status FROM attendance WHERE employee_id=? ORDER BY attendance_date DESC")){
                        p.setInt(1,session.employeeId);try(ResultSet r=p.executeQuery()){while(r.next())attendance.add(row(
                            "attendance_date",r.getString("attendance_date"),"check_in",r.getString("check_in"),
                            "check_out",r.getString("check_out"),"attendance_status",r.getString("attendance_status")));}
                    }
                    try(PreparedStatement p=c.prepareStatement("SELECT start_date,end_date,leave_type,reason,leave_status FROM leave_requests WHERE employee_id=? ORDER BY requested_at DESC")){
                        p.setInt(1,session.employeeId);try(ResultSet r=p.executeQuery()){while(r.next())leaves.add(row(
                            "start_date",r.getString("start_date"),"end_date",r.getString("end_date"),"leave_type",r.getString("leave_type"),
                            "reason",r.getString("reason"),"leave_status",r.getString("leave_status")));}
                    }
                    try(PreparedStatement p=c.prepareStatement("SELECT pay_month,basic_salary,allowance,deduction,net_salary FROM payroll WHERE employee_id=? ORDER BY pay_month DESC")){
                        p.setInt(1,session.employeeId);try(ResultSet r=p.executeQuery()){while(r.next())payroll.add(row(
                            "pay_month",r.getString("pay_month"),"basic_salary",r.getBigDecimal("basic_salary"),
                            "allowance",r.getBigDecimal("allowance"),"deduction",r.getBigDecimal("deduction"),
                            "net_salary",r.getBigDecimal("net_salary")));}
                    }
                }
                send(x,200,row("employee",employee,"attendance",attendance,"leaves",leaves,"payroll",payroll));return;
            }
            if(x.getRequestURI().getPath().equals("/api/employee/leaves")&&x.getRequestMethod().equals("POST")){
                Map<String,Object>b=body(x);
                try(Connection c=Database.getConnection();PreparedStatement p=c.prepareStatement(
                    "INSERT INTO leave_requests(employee_id,start_date,end_date,leave_type,reason) VALUES(?,?,?,?,?)")){
                    p.setInt(1,session.employeeId);p.setString(2,str(b,"start_date"));p.setString(3,str(b,"end_date"));
                    p.setString(4,str(b,"leave_type"));p.setString(5,str(b,"reason"));p.executeUpdate();
                }
                send(x,201,row("message","Leave request submitted"));return;
            }
            send(x,405,row("error","Method not allowed"));
        }catch(Exception e){fail(x,e);}
    }

    private static void employees(HttpExchange x)throws IOException {
        try {
            if(!requireRole(x,"ADMIN"))return;
            String method=x.getRequestMethod();
            if(method.equals("GET")){
                List<Map<String,Object>> rows=new ArrayList<>();
                try(Connection c=Database.getConnection();Statement s=c.createStatement();
                    ResultSet r=s.executeQuery("SELECT * FROM employees ORDER BY employee_id DESC")){
                    while(r.next())rows.add(row("employee_id",r.getInt("employee_id"),"employee_code",r.getString("employee_code"),
                        "full_name",r.getString("full_name"),"department",r.getString("department"),"designation",r.getString("designation"),
                        "email",r.getString("email"),"phone",r.getString("phone"),"basic_salary",r.getBigDecimal("basic_salary"),
                        "date_joined",r.getString("date_joined"),"employment_status",r.getString("employment_status")));
                }send(x,200,rows);return;
            }
            if(method.equals("POST")){
                Map<String,Object>b=body(x);char[] password=str(b,"password").toCharArray();
                String passwordHash;
                try{passwordHash=Auth.passwordHash(password);}finally{Arrays.fill(password,'\0');}
                String sql="INSERT INTO employees(employee_code,full_name,department,designation,email,phone,basic_salary,date_joined,password_hash) VALUES(?,?,?,?,?,?,?,?,?)";
                try(Connection c=Database.getConnection();PreparedStatement p=c.prepareStatement(sql)){
                    p.setString(1,str(b,"employee_code"));p.setString(2,str(b,"full_name"));p.setString(3,str(b,"department"));
                    p.setString(4,str(b,"designation"));p.setString(5,str(b,"email"));p.setString(6,str(b,"phone"));
                    p.setDouble(7,num(b,"basic_salary"));p.setString(8,str(b,"date_joined"));p.setString(9,passwordHash);p.executeUpdate();
                }send(x,201,row("message","Employee added"));return;
            }
            if(method.equals("DELETE")){
                int id=Integer.parseInt(query(x,"id"));
                try(Connection c=Database.getConnection();PreparedStatement p=c.prepareStatement("DELETE FROM employees WHERE employee_id=?")){
                    p.setInt(1,id);int n=p.executeUpdate();send(x,n==0?404:200,row("message",n==0?"Employee not found":"Employee removed"));
                }return;
            }
            send(x,405,row("error","Method not allowed"));
        }catch(Exception e){fail(x,e);}
    }

    private static void attendance(HttpExchange x)throws IOException {
        try{
            if(!requireRole(x,"ADMIN"))return;
            if(x.getRequestMethod().equals("GET")){
                List<Map<String,Object>> rows=new ArrayList<>();
                String sql="SELECT a.*,e.employee_code,e.full_name FROM attendance a JOIN employees e ON e.employee_id=a.employee_id ORDER BY attendance_date DESC";
                try(Connection c=Database.getConnection();Statement s=c.createStatement();ResultSet r=s.executeQuery(sql)){
                    while(r.next())rows.add(row("attendance_id",r.getInt("attendance_id"),"employee_id",r.getInt("employee_id"),
                        "employee_code",r.getString("employee_code"),"full_name",r.getString("full_name"),"attendance_date",r.getString("attendance_date"),
                        "check_in",r.getString("check_in"),"check_out",r.getString("check_out"),"attendance_status",r.getString("attendance_status")));
                }send(x,200,rows);return;
            }
            if(x.getRequestMethod().equals("POST")){
                Map<String,Object>b=body(x);
                String sql="INSERT INTO attendance(employee_id,attendance_date,check_in,check_out,attendance_status,remarks) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE check_in=VALUES(check_in),check_out=VALUES(check_out),attendance_status=VALUES(attendance_status),remarks=VALUES(remarks)";
                try(Connection c=Database.getConnection();PreparedStatement p=c.prepareStatement(sql)){
                    p.setInt(1,(int)num(b,"employee_id"));p.setString(2,str(b,"attendance_date"));
                    p.setString(3,blankNull(str(b,"check_in")));p.setString(4,blankNull(str(b,"check_out")));
                    p.setString(5,str(b,"attendance_status"));p.setString(6,str(b,"remarks"));p.executeUpdate();
                }send(x,201,row("message","Attendance saved"));return;
            }send(x,405,row("error","Method not allowed"));
        }catch(Exception e){fail(x,e);}
    }

    private static void leaves(HttpExchange x)throws IOException {
        try{
            if(!requireRole(x,"ADMIN"))return;
            if(x.getRequestMethod().equals("GET")){
                List<Map<String,Object>> rows=new ArrayList<>();
                String sql="SELECT l.*,e.employee_code,e.full_name FROM leave_requests l JOIN employees e ON e.employee_id=l.employee_id ORDER BY requested_at DESC";
                try(Connection c=Database.getConnection();Statement s=c.createStatement();ResultSet r=s.executeQuery(sql)){
                    while(r.next())rows.add(row("leave_id",r.getInt("leave_id"),"employee_id",r.getInt("employee_id"),
                        "employee_code",r.getString("employee_code"),"full_name",r.getString("full_name"),"start_date",r.getString("start_date"),
                        "end_date",r.getString("end_date"),"leave_type",r.getString("leave_type"),"reason",r.getString("reason"),
                        "leave_status",r.getString("leave_status")));
                }send(x,200,rows);return;
            }
            if(x.getRequestMethod().equals("POST")){
                Map<String,Object>b=body(x);
                try(Connection c=Database.getConnection();PreparedStatement p=c.prepareStatement(
                    "INSERT INTO leave_requests(employee_id,start_date,end_date,leave_type,reason) VALUES(?,?,?,?,?)")){
                    p.setInt(1,(int)num(b,"employee_id"));p.setString(2,str(b,"start_date"));p.setString(3,str(b,"end_date"));
                    p.setString(4,str(b,"leave_type"));p.setString(5,str(b,"reason"));p.executeUpdate();
                }send(x,201,row("message","Leave request added"));return;
            }
            if(x.getRequestMethod().equals("PUT")){
                Map<String,Object>b=body(x);
                try(Connection c=Database.getConnection();PreparedStatement p=c.prepareStatement("UPDATE leave_requests SET leave_status=? WHERE leave_id=?")){
                    p.setString(1,str(b,"leave_status"));p.setInt(2,(int)num(b,"leave_id"));p.executeUpdate();
                }send(x,200,row("message","Leave status updated"));return;
            }send(x,405,row("error","Method not allowed"));
        }catch(Exception e){fail(x,e);}
    }

    private static void payroll(HttpExchange x)throws IOException {
        try{
            if(!requireRole(x,"ADMIN"))return;
            if(x.getRequestMethod().equals("GET")){
                List<Map<String,Object>> rows=new ArrayList<>();
                String sql="SELECT p.*,e.employee_code,e.full_name FROM payroll p JOIN employees e ON e.employee_id=p.employee_id ORDER BY pay_month DESC";
                try(Connection c=Database.getConnection();Statement s=c.createStatement();ResultSet r=s.executeQuery(sql)){
                    while(r.next())rows.add(row("payroll_id",r.getInt("payroll_id"),"employee_id",r.getInt("employee_id"),
                        "employee_code",r.getString("employee_code"),"full_name",r.getString("full_name"),"pay_month",r.getString("pay_month"),
                        "basic_salary",r.getBigDecimal("basic_salary"),"allowance",r.getBigDecimal("allowance"),
                        "deduction",r.getBigDecimal("deduction"),"net_salary",r.getBigDecimal("net_salary")));
                }send(x,200,rows);return;
            }
            if(x.getRequestMethod().equals("POST")){
                Map<String,Object>b=body(x);double basic=num(b,"basic_salary"),allow=num(b,"allowance"),deduct=num(b,"deduction");
                String sql="INSERT INTO payroll(employee_id,pay_month,basic_salary,allowance,deduction,net_salary) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE basic_salary=VALUES(basic_salary),allowance=VALUES(allowance),deduction=VALUES(deduction),net_salary=VALUES(net_salary)";
                try(Connection c=Database.getConnection();PreparedStatement p=c.prepareStatement(sql)){
                    p.setInt(1,(int)num(b,"employee_id"));p.setString(2,str(b,"pay_month"));p.setDouble(3,basic);
                    p.setDouble(4,allow);p.setDouble(5,deduct);p.setDouble(6,basic+allow-deduct);p.executeUpdate();
                }send(x,201,row("message","Payroll saved","net_salary",basic+allow-deduct));return;
            }send(x,405,row("error","Method not allowed"));
        }catch(Exception e){fail(x,e);}
    }

    private static void summary(HttpExchange x)throws IOException{
        if(!requireRole(x,"ADMIN"))return;
        try(Connection c=Database.getConnection();Statement s=c.createStatement()){
            Map<String,Object> m=row("employees",scalar(s,"SELECT COUNT(*) FROM employees WHERE employment_status='ACTIVE'"),
                "presentToday",scalar(s,"SELECT COUNT(*) FROM attendance WHERE attendance_date=CURDATE() AND attendance_status='PRESENT'"),
                "pendingLeaves",scalar(s,"SELECT COUNT(*) FROM leave_requests WHERE leave_status='PENDING'"),
                "monthlyPayroll",scalar(s,"SELECT COALESCE(SUM(net_salary),0) FROM payroll WHERE pay_month=DATE_FORMAT(CURDATE(),'%Y-%m')"));
            send(x,200,m);
        }catch(Exception e){fail(x,e);}
    }
    private static long scalar(Statement s,String sql)throws SQLException{try(ResultSet r=s.executeQuery(sql)){r.next();return r.getLong(1);}}
    private static Map<String,Object> body(HttpExchange x)throws IOException{return Json.object(new String(x.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));}
    private static void send(HttpExchange x,int status,Object data)throws IOException{
        byte[] b=Json.write(data).getBytes(StandardCharsets.UTF_8);x.getResponseHeaders().set("Content-Type","application/json; charset=UTF-8");
        x.sendResponseHeaders(status,b.length);try(OutputStream o=x.getResponseBody()){o.write(b);}
    }
    private static Map<String,Object> row(Object...p){Map<String,Object>m=new LinkedHashMap<>();for(int i=0;i<p.length;i+=2)m.put((String)p[i],p[i+1]);return m;}
    private static String str(Map<String,Object>m,String k){Object v=m.get(k);return v==null?"":String.valueOf(v);}
    private static double num(Map<String,Object>m,String k){Object v=m.get(k);return v instanceof Number?((Number)v).doubleValue():Double.parseDouble(String.valueOf(v));}
    private static String blankNull(String s){return s.isBlank()?null:s;}
    private static boolean requireRole(HttpExchange x,String role)throws IOException{
        Auth.UserSession session=Auth.session(x);
        if(session==null){send(x,401,row("error","Please sign in."));return false;}
        if(!session.role.equals(role)){send(x,403,row("error","Access denied."));return false;}
        return true;
    }
    private static String query(HttpExchange x,String key){String q=x.getRequestURI().getRawQuery();if(q!=null)for(String pair:q.split("&")){String[]a=pair.split("=",2);if(a[0].equals(key)&&a.length>1)return a[1];}return "";}
    private static void fail(HttpExchange x,Exception e)throws IOException{e.printStackTrace();send(x,400,row("error",e.getMessage()==null?"Request failed":e.getMessage()));}
    private static void staticFiles(HttpExchange x)throws IOException{
        String path=x.getRequestURI().getPath();
        if(path.equals("/")){
            Auth.UserSession session=Auth.session(x);
            redirect(x,session==null?"/login.html":session.role.equals("ADMIN")?"/index.html":"/employee.html");return;
        }
        Auth.UserSession session=Auth.session(x);
        if(path.equals("/index.html")&&(session==null||!session.role.equals("ADMIN"))){redirect(x,"/login.html");return;}
        if(path.equals("/employee.html")&&(session==null||!session.role.equals("EMPLOYEE"))){redirect(x,"/login.html");return;}
        Path file=WEB.resolve(path.substring(1)).normalize();
        if(!file.startsWith(WEB)||!Files.exists(file)||Files.isDirectory(file)){byte[]b="Not found".getBytes();x.sendResponseHeaders(404,b.length);try(OutputStream o=x.getResponseBody()){o.write(b);}return;}
        String type=path.endsWith(".css")?"text/css":path.endsWith(".js")?"application/javascript":"text/html";
        byte[]b=Files.readAllBytes(file);x.getResponseHeaders().set("Content-Type",type+"; charset=UTF-8");
        x.sendResponseHeaders(200,b.length);try(OutputStream o=x.getResponseBody()){o.write(b);}
    }
    private static void redirect(HttpExchange x,String location)throws IOException{
        x.getResponseHeaders().set("Location",location);x.sendResponseHeaders(303,-1);x.close();
    }
}
