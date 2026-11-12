# AttendPay – Employee Attendance and Payroll Management Analysis System
Scenario 13 · Register No. 43 · Java + MySQL + Python (pandas, matplotlib) + HTML/CSS/JS

## 1. Requirements
JDK 17+ · MySQL 8 · Python 3.9+ · VS Code with "Extension Pack for Java"

## 2. Setup
1. Download `mysql-connector-j-8.4.0.jar` from https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/8.4.0/ and put it in `lib/`.
2. Create the database (enter your MySQL password when asked):
   `mysql -u root -p < database/schema.sql` then `mysql -u root -p < database/sample_data.sql`
3. Edit `config.properties` with your MySQL user and password. On Mac/Linux, remove `#` from `python.cmd=python3`.
4. `pip install -r python/requirements.txt`

## 3. Run
Open the folder in VS Code and run from the terminal in the project root:

    java -cp "lib/*" src/Main.java

(or use Run and Debug > "Run AttendPay server"). Then open http://localhost:8080

## 4. Login
Admin: `admin` / `admin123` · Employee: Employee ID (e.g. `101`) / `emp123`

## Salary rules
HRA 20%, DA 10%, PF 12% of basic (table `salary_rules`). Per-day pay = basic ÷ weekdays in the month. Absent = full-day deduction, half day = 0.5, approved paid leave = no deduction. Approved leave is written into attendance (Loss of Pay is marked Absent).
In Payroll, choose "All employees" and a month (Aug–Nov 2026 has sample attendance) to generate payroll for the dashboard and charts.
