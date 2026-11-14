let tab = "emp";
$("mo").value = today().slice(0, 7) || "2026-10";

const pct = x => x.attendancePct == null ? "–" : `<span class="badge ${x.attendancePct >= 90 ? 'Approved' : x.attendancePct >= 80 ? 'Pending' : 'Rejected'}">${x.attendancePct}%</span>`;

async function load() {
  try {
    const [y, m] = $("mo").value.split("-").map(Number);
    const p = n => String(n).padStart(2, "0");
    const qs = `from=${y}-${p(m)}-01&to=${y}-${p(m)}-${new Date(y, m, 0).getDate()}`;

    if (tab === "pay") {
      table("tb", [
        ["Employee", x => `
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:700;color:var(--secondary-navy);font-size:12px;background:var(--bg-primary);padding:2px 6px;border-radius:4px;border:1px solid var(--border)">#${x.empId}</span>
            <span style="font-weight:600;color:var(--text-primary)">${esc(x.name)}</span>
          </div>
        `],
        ["Department", "department"],
        ["Working Days", "workingDays"],
        ["Absent Deducted", x => x.absentDays > 0 ? `<span style="color:var(--status-absent);font-weight:600">${x.absentDays} d</span>` : "0"],
        ["Basic", x => fmt(x.basic)],
        ["HRA", x => fmt(x.hra)],
        ["DA", x => fmt(x.da)],
        ["PF", x => fmt(x.pf)],
        ["Absence Deduction", x => `<span style="color:var(--status-absent)">${fmt(x.absenceDeduction)}</span>`],
        ["Net Payout", x => `<b style="color:var(--secondary-navy);font-size:14px">${fmt(x.net)}</b>`]
      ], await api(`/payroll?month=${m}&year=${y}`), "No payroll generated for this month yet.");
    } else if (tab === "emp") {
      table("tb", [
        ["Employee", x => `
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:700;color:var(--secondary-navy);font-size:12px;background:var(--bg-primary);padding:2px 6px;border-radius:4px;border:1px solid var(--border)">#${x.empId}</span>
            <span style="font-weight:600;color:var(--text-primary)">${esc(x.name)}</span>
          </div>
        `],
        ["Department", "department"],
        ["Present Days", x => `<span style="color:var(--status-present);font-weight:600">${x.present}</span>`],
        ["Half Days", x => x.halfDays ? `<span style="color:var(--status-pending);font-weight:600">${x.halfDays}</span>` : "0"],
        ["On Leave", x => `<span style="color:var(--primary-accent);font-weight:600">${x.onLeave}</span>`],
        ["Absent", x => x.absent ? `<span style="color:var(--status-absent);font-weight:600">${x.absent}</span>` : "0"],
        ["Hours", x => `${x.hours || 0} hrs`],
        ["Attendance %", pct]
      ], await api("/reports/employee?" + qs));
    } else {
      table("tb", [
        ["Department", "department"],
        ["Total Employees", "employees"],
        ["Present", x => `<span style="color:var(--status-present);font-weight:600">${x.present}</span>`],
        ["Half Days", x => x.halfDays ? `<span style="color:var(--status-pending);font-weight:600">${x.halfDays}</span>` : "0"],
        ["On Leave", x => `<span style="color:var(--primary-accent);font-weight:600">${x.onLeave}</span>`],
        ["Absent", x => x.absent ? `<span style="color:var(--status-absent);font-weight:600">${x.absent}</span>` : "0"],
        ["Attendance Rate", pct]
      ], await api("/reports/department?" + qs));
    }
  } catch (e) {
    showError(e.message);
  }
}

document.querySelectorAll(".tabs2 .btn").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".tabs2 .btn").forEach(x => x.className = "btn ghost");
    b.className = "btn on";
    tab = b.dataset.t;
    load();
  };
});

$("mo").onchange = load;
load();
