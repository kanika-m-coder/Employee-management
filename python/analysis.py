"""Reads attendance and payroll from MySQL, preprocesses with pandas, saves charts + insights for the website."""
import json, os
from datetime import datetime
import pandas as pd, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import mysql.connector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "web", "charts")
cfg = {"db.host": "localhost", "db.port": "3306", "db.name": "payroll_db", "db.user": "root", "db.pass": ""}
cp = os.path.join(ROOT, "config.properties")
if os.path.exists(cp):
    for line in open(cp, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1); cfg[k.strip()] = v.strip()
con = mysql.connector.connect(host=cfg["db.host"], port=int(cfg["db.port"]), user=cfg["db.user"], password=cfg["db.pass"], database=cfg["db.name"])

def q(sql):
    cur = con.cursor(); cur.execute(sql)
    df = pd.DataFrame(cur.fetchall(), columns=[c[0] for c in cur.description]); cur.close(); return df

att = q("SELECT a.emp_id,e.emp_name,d.dept_name,a.att_date,a.status,a.working_hours FROM attendance a JOIN employees e ON e.emp_id=a.emp_id JOIN departments d ON d.dept_id=e.dept_id")
pay = q("SELECT p.pay_month,p.pay_year,p.net_salary,d.dept_name FROM payroll p JOIN employees e ON e.emp_id=p.emp_id JOIN departments d ON d.dept_id=e.dept_id")

# ---- preprocessing ----
att = att.dropna(subset=["status", "att_date"]).drop_duplicates(["emp_id", "att_date"])
att["att_date"] = pd.to_datetime(att["att_date"])
att["working_hours"] = att["working_hours"].astype(float)
att["month"] = att["att_date"].dt.to_period("M").astype(str)
att["weekday"] = att["att_date"].dt.day_name()
att["attended"] = att["status"].isin(["Present", "Half Day"]).astype(int)
pay["net_salary"] = pay["net_salary"].astype(float)

NAVY, BLUE, RED, AMBER, GREEN = "#172554", "#2563EB", "#DC2626", "#D97706", "#16A34A"
def chart(name, draw, size=(7, 4)):
    f, ax = plt.subplots(figsize=size); draw(ax)
    ax.spines[["top", "right"]].set_visible(False); f.tight_layout()
    f.savefig(os.path.join(OUT, name + ".png"), dpi=110); plt.close(f)

os.makedirs(OUT, exist_ok=True)
insights = []
if att.empty:
    insights.append("No attendance records found. Record attendance first.")
else:
    pct = (att.groupby("emp_name")["attended"].mean() * 100).sort_values()
    chart("employee_attendance", lambda ax: (ax.barh(pct.index, pct.values, color=BLUE), ax.set_xlabel("Attendance %"), ax.set_title("Employee attendance rate")))
    mon = att.groupby(["month", "status"]).size().unstack(fill_value=0)
    chart("monthly_pattern", lambda ax: (mon.plot(ax=ax, marker="o"), ax.set_title("Monthly attendance pattern"), ax.set_xlabel(""), ax.set_ylabel("Days")))
    dep = (att.groupby("dept_name")["attended"].mean() * 100).sort_values(ascending=False)
    chart("department_comparison", lambda ax: (ax.bar(dep.index, dep.values, color=NAVY), ax.set_ylabel("Attendance %"), ax.set_title("Department attendance comparison"), plt.setp(ax.get_xticklabels(), rotation=20)))
    ab = (att["status"] == "Absent").groupby(att["emp_name"]).sum().sort_values()
    chart("absenteeism", lambda ax: (ax.barh(ab.index, ab.values, color=RED), ax.set_xlabel("Absent days"), ax.set_title("Employee absenteeism")))
    st = att["status"].value_counts()
    cmap = {"Present": GREEN, "Absent": RED, "Half Day": AMBER, "On Leave": BLUE}
    chart("status_distribution", lambda ax: (ax.pie(st.values, labels=st.index, autopct="%1.0f%%", colors=[cmap.get(s, "grey") for s in st.index]), ax.set_title("Attendance status distribution")), (5, 4))
    def payroll_draw(ax):
        if pay.empty:
            ax.text(0.5, 0.5, "No payroll generated yet", ha="center", va="center"); ax.axis("off"); return
        p = pay.groupby(["pay_year", "pay_month"])["net_salary"].sum()
        ax.bar([f"{y}-{m:02d}" for y, m in p.index], p.values, color=BLUE); ax.set_ylabel("Net payroll (INR)"); ax.set_title("Monthly payroll")
    chart("payroll_monthly", payroll_draw)
    # ---- insights ----
    insights.append(f"Overall attendance rate is {att['attended'].mean()*100:.1f}% across {att['emp_id'].nunique()} employees.")
    insights.append(f"{dep.index[0]} has the best attendance ({dep.iloc[0]:.1f}%); {dep.index[-1]} has the lowest ({dep.iloc[-1]:.1f}%).")
    insights.append(f"{ab.index[-1]} has the most absences ({int(ab.iloc[-1])} days).")
    wk = att[att["status"] == "Absent"]["weekday"].value_counts()
    if not wk.empty: insights.append(f"{wk.index[0]} is the weekday with the most absences ({int(wk.iloc[0])}).")
    insights.append(f"Average working hours per recorded day: {att['working_hours'].mean():.1f}.")
    if not pay.empty:
        last = pay.groupby(["pay_year", "pay_month"])["net_salary"].sum().iloc[-1]
        insights.append(f"Latest monthly payroll total: INR {last:,.2f}.")
with open(os.path.join(OUT, "insights.json"), "w", encoding="utf-8") as fh:
    json.dump({"insights": insights, "generated": datetime.now().strftime("%Y-%m-%d %H:%M")}, fh)
print("Analysis complete")
