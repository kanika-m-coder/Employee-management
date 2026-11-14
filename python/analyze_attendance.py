'''Generate simple attendance reports from the project MySQL database.'''
import os
from pathlib import Path
import pandas as pd
import mysql.connector
import matplotlib.pyplot as plt

OUT = Path(__file__).resolve().parent / "output"
OUT.mkdir(exist_ok=True)
db = mysql.connector.connect(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "3306")),
    database=os.getenv("DB_NAME", "employee_payroll"),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", "root"),
)
try:
    sql = '''
        SELECT e.employee_code, e.full_name, e.department,
               a.attendance_date, a.attendance_status
        FROM attendance a
        JOIN employees e ON e.employee_id = a.employee_id
        ORDER BY a.attendance_date, e.employee_code
    '''
    records = pd.read_sql(sql, db)
finally:
    db.close()

if records.empty:
    print("No attendance data found. Add attendance records in the website first.")
else:
    totals = (records.groupby(["employee_code", "full_name", "department", "attendance_status"])
              .size().unstack(fill_value=0).reset_index())
    totals.to_csv(OUT / "attendance_summary.csv", index=False)
    daily = records.groupby(["attendance_date", "attendance_status"]).size().unstack(fill_value=0)
    daily.to_csv(OUT / "daily_attendance.csv")
    present = records[records.attendance_status == "PRESENT"].groupby("full_name").size()
    if not present.empty:
        plt.figure(figsize=(9, 5))
        present.sort_values(ascending=False).plot(kind="bar")
        plt.title("Present Days by Employee")
        plt.xlabel("Employee")
        plt.ylabel("Number of Present Days")
        plt.tight_layout()
        plt.savefig(OUT / "present_days_chart.png", dpi=150)
        plt.close()
    print("Reports created in:", OUT)
