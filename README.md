# AttendPay – Modern Enterprise Employee Attendance & Payroll Management SaaS

A comprehensive Employee Attendance, Leave Management, and Payroll Analysis Platform built with modern web technologies, Core Java, JDBC, MySQL, and Python data visualization.

---

## 🚀 Live Cloud Deployment (Vercel)

The frontend is live and deployed on Vercel:
👉 **[https://employeeee-management.vercel.app](https://employeeee-management.vercel.app)**

### Demo Login Credentials:
- **Administrator Portal:**
  - Username: `admin`
  - Password: `admin123`
- **Employee Portal:**
  - Employee Code / ID: `101` (or `EMP001`)
  - Password: `emp123`

---

## 💻 Local Setup & Execution

### Requirements
- JDK 17+
- MySQL 8.0+ / MariaDB
- Python 3.9+ (for analysis & charts)
- MySQL Connector/J in `lib/`

### 1. Database Setup
```bash
mysql -u root -p < database/schema.sql
```

### 2. Run Local Server
Using PowerShell:
```powershell
.\scripts\run.ps1
```
Or with `run.bat` / Core Java:
```cmd
java -cp "lib/*" src/Main.java
```
Then visit **http://localhost:8080** in your browser.

---

## 🎨 Enterprise SaaS Features
- **Modern Dashboard:** Real-time statistics, monthly attendance trend charts, status distributions, and department breakdowns.
- **Dark Midnight Sidebar:** Intuitive navigation with Lucide icons and active states.
- **Attendance & Leave Management:** Complete leave requests, approvals, and daily attendance logs.
- **Automated Payroll Engine:** Accurate statutory deductions, allowances, HRA/DA calculation, and itemized payslips.
- **Analytics & Reports:** Python-powered attendance distribution and monthly payroll pattern visual charts.
