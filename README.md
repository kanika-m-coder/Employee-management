# Employee Attendance and Payroll Management System

A conventional academic project using **Core Java, JDBC, MySQL/SQL, Python, HTML, CSS and JavaScript**.

This version deliberately does not use Spring Boot, Maven, Gradle, Flask or Django. The backend uses Java's built-in HTTP server and JDBC.

## Requirements
- Windows 10/11
- JDK 17 or later
- MySQL Server / MySQL Workbench
- Python 3.10+ (for analysis)
- VS Code

## 1. Set up MySQL
Open `database/schema.sql` in MySQL Workbench and execute it. It creates the `employee_payroll` database, tables and a few demonstration employees.

The Java app connects to localhost:3306 and database `employee_payroll`, using `root` by default for the username. The launcher securely prompts for the MySQL password if `DB_PASSWORD` is not set; enter the password configured for your MySQL account (or press Enter only if that account has no password). You can also set `DB_USER` and `DB_PASSWORD` in PowerShell before starting the app. If MySQL is still starting, the app retries transient connection failures for up to about eight seconds before showing a setup hint.

## 2. Start the website
Open the project folder in VS Code. In PowerShell run:

```powershell
.\scripts\run.ps1
```

The first run downloads MySQL Connector/J automatically into the ignored `lib` folder. Later runs reuse it. If script execution is blocked:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run.ps1
```

Open http://localhost:8080. Keep the terminal open while using the application. Press Ctrl+C to stop it.

## 3. Sign in
- On the first visit, choose **Register the administrator account** and create the single administrator account. Additional admin registrations are blocked.
- The administrator can create employee accounts by setting an initial password when adding an employee.
- Employees sign in with their employee code and password, and can view their attendance, leave requests, and payroll and submit leave requests.
- Passwords are stored as salted PBKDF2 hashes. Existing demonstration employee records do not have login passwords; create new employee records to provision sign-ins.

## 4. Run Python analysis
```powershell
py -m pip install -r python\requirements.txt
$env:DB_USER="root"
$env:DB_PASSWORD="your_mysql_password"
py python\analyze_attendance.py
```
Reports are saved in `python/output/`.

## Included modules
- Employee registration, directory and removal
- Attendance entry and history
- Leave request creation and approval/rejection
- Monthly payroll record generation
- Summary figures on the overview page
- Python CSV summaries and attendance chart

Payroll formula used in this sample: **net salary = basic salary + allowance - deduction**.

## Academic project note
This is a learning/demo project, not a production HR system. It includes basic role-based login for administrators and employees, but sessions are stored in memory and the application is not production-hardened. It does not include audit trails or deployment hardening. Review attendance rules and payroll calculations with your faculty before submission. Use sample data only.
