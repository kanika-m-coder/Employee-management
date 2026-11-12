let rows = [];
let allEmployees = [];

// Default month to current month or October 2026 if today is in sample range
$("mo").value = today().slice(0, 7) || "2026-10";

const ym = () => {
  const [y, m] = $("mo").value.split("-");
  return { year: parseInt(y, 10), month: parseInt(m, 10) };
};

// Calculate total weekdays (Monday–Friday) in any month
function calculateWorkingDays(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  let wd = 0;
  for (let d = 1; d <= lastDay; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0 && day !== 6) wd++;
  }
  return wd;
}

// Format month name e.g. "October 2026"
function getMonthLabel(year, month) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

// Itemized Payslip & Calculation Breakdown Viewer
function show(id) {
  const r = rows.find(x => x.empId == id);
  if (!r) return;

  const bdc = $("bdc");
  bdc.style.display = "block";
  $("bdt").textContent = `${r.name} (${r.empId})`;
  $("bdSub").textContent = `${r.department} Department · Pay Period: ${getMonthLabel(ym().year, ym().month)}`;

  const gross = r.basic + r.hra + r.da;
  const totDeduct = r.pf + r.absenceDeduction;
  const perDayRate = r.workingDays > 0 ? (r.basic / r.workingDays) : 0;

  // Attendance chips
  const chip = (lbl, val, cls) => `<div class="chip ${cls || ""}"><b>${val}</b> <small style="color:#64748b">${lbl}</small></div>`;
  $("bdAttChips").innerHTML = 
    chip("Month Weekdays", r.workingDays) +
    chip("Days Present", r.daysPresent, "ok") +
    chip("Paid Leaves", r.paidLeave) +
    chip("Absent Days (Deducted)", r.absentDays, r.absentDays > 0 ? "bad" : "");

  // Earnings
  $("slBasic").textContent = fmt(r.basic);
  $("slHra").textContent = "+ " + fmt(r.hra);
  $("slDa").textContent = "+ " + fmt(r.da);
  $("slGross").textContent = fmt(gross);

  // Deductions
  $("slRate").textContent = `${fmt(perDayRate)} / day`;
  $("slAbsLabel").textContent = `Absence Deduction (${r.absentDays} day${r.absentDays === 1 ? "" : "s"} × ${fmt(perDayRate)})`;
  $("slAbsDeduct").textContent = r.absenceDeduction > 0 ? "− " + fmt(r.absenceDeduction) : "₹0.00 (No absence)";
  $("slPf").textContent = "− " + fmt(r.pf);
  $("slTotDeduct").textContent = "− " + fmt(totDeduct);

  // Net Salary
  $("slNet").textContent = fmt(r.net);

  // Step-by-step verified formula explanation
  $("bdFormula").innerHTML = `
    <strong>📐 Mathematical Calculation Formula & Substitution:</strong><br>
    • <b>Gross Earnings:</b> Basic (${fmt(r.basic)}) + HRA 20% (${fmt(r.hra)}) + DA 10% (${fmt(r.da)}) = <b>${fmt(gross)}</b><br>
    • <b>Per-Day Rate:</b> Basic (${fmt(r.basic)}) ÷ ${r.workingDays} working days = <b>${fmt(perDayRate)} / day</b><br>
    • <b>Absence Deduction:</b> ${r.absentDays} absent days × ${fmt(perDayRate)} = <b>${fmt(r.absenceDeduction)}</b><br>
    • <b>Statutory PF Deduction:</b> 12% of Basic = <b>${fmt(r.pf)}</b><br>
    • <b>Net Take-Home:</b> Gross (${fmt(gross)}) − Total Deductions (${fmt(totDeduct)}) = <b style="color:#1e3a8a">${fmt(r.net)}</b>
  `;

  bdc.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// 1. Analyze All Employees Attendance before calculating
async function analyzeMonth() {
  const { year, month } = ym();
  const lastDay = new Date(year, month, 0).getDate();
  const pad = n => String(n).padStart(2, "0");
  const from = `${year}-${pad(month)}-01`;
  const to = `${year}-${pad(month)}-${pad(lastDay)}`;
  const workingDays = calculateWorkingDays(year, month);

  try {
    const data = await api(`/reports/employee?from=${from}&to=${to}`);
    $("analysisCard").style.display = "block";
    $("analysisMonthTitle").textContent = `${getMonthLabel(year, month)} (${workingDays} Working Days)`;

    if (!data.length) {
      $("analysisChips").innerHTML = `<span style="color:#dc2626">No attendance records found for this month yet.</span>`;
      $("analysisTable").innerHTML = `<p class="empty">Please record attendance for ${getMonthLabel(year, month)} before processing payroll.</p>`;
      return;
    }

    const avgAtt = (data.reduce((a, x) => a + (x.attendancePct || 0), 0) / data.length).toFixed(1);
    const totPres = data.reduce((a, x) => a + (x.present || 0), 0);
    const totAbs = data.reduce((a, x) => a + (x.absent || 0), 0);

    $("analysisChips").innerHTML = `
      <div class="chip"><b>${data.length}</b> <small style="color:#64748b">Employees Analyzed</small></div>
      <div class="chip"><b>${workingDays}</b> <small style="color:#64748b">Weekday Working Days</small></div>
      <div class="chip ok"><b>${avgAtt}%</b> <small style="color:#64748b">Average Attendance</small></div>
      <div class="chip"><b>${totPres}</b> <small style="color:#16a34a">Total Days Present</small></div>
      <div class="chip ${totAbs > 0 ? "bad" : ""}"><b>${totAbs}</b> <small style="color:#dc2626">Total Days Absent</small></div>
    `;

    table("analysisTable", [
      ["Employee", x => `${x.empId} – <b>${esc(x.name)}</b>`],
      ["Department", "department"],
      ["Present", x => `<span style="color:#16a34a;font-weight:600">${x.present} days</span>`],
      ["Half Days", x => x.halfDays ? `<span style="color:#d97706;font-weight:600">${x.halfDays} (0.5×)</span>` : "0"],
      ["Paid Leaves", x => `<span style="color:#2563eb">${x.onLeave || 0}</span>`],
      ["Absent", x => x.absent ? `<span style="color:#dc2626;font-weight:600">${x.absent} days</span>` : "0"],
      ["Attendance %", x => `<span class="badge ${x.attendancePct >= 80 ? "Approved" : "Pending"}">${x.attendancePct}%</span>`],
      ["Status", x => x.absent > 0 || x.halfDays > 0 ? `<span class="badge Pending">Deduction Applies</span>` : `<span class="badge Approved">Full Salary</span>`]
    ], data, "No attendance records available for this month.");

    toast(`Attendance analysis complete for ${data.length} employees.`);
    $("analysisCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    showError("Failed to analyze attendance: " + err.message);
  }
}

// 2. Load and refresh payroll records
async function load() {
  try {
    const { year, month } = ym();
    const workingDays = calculateWorkingDays(year, month);
    $("mWd").textContent = workingDays;

    rows = await api(`/payroll?month=${month}&year=${year}`);
    const totalNet = rows.reduce((a, x) => a + x.net, 0);

    $("tot").textContent = `Total Monthly Payout: ${fmt(totalNet)} (${rows.length} records)`;
    $("mNet").textContent = fmt(totalNet);

    table("tb", [
      ["Employee", x => `<b>${x.empId}</b> – ${esc(x.name)}`],
      ["Department", "department"],
      ["Days Present", x => `<span style="color:#16a34a;font-weight:600">${x.daysPresent}</span>`],
      ["Absent Deducted", x => x.absentDays > 0 ? `<span style="color:#dc2626;font-weight:600">${x.absentDays} d</span>` : "0"],
      ["Basic Salary", x => fmt(x.basic)],
      ["Gross Pay (Basic+HRA+DA)", x => fmt(x.basic + x.hra + x.da)],
      ["Total Deductions (PF+Abs)", x => `<span style="color:#dc2626">−${fmt(x.pf + x.absenceDeduction)}</span>`],
      ["Net Salary", x => `<span style="font-size:14.5px;font-weight:700;color:#1e40af">${fmt(x.net)}</span>`],
      ["Action", x => `<button class="lnk" style="padding:4px 8px;border-radius:6px;background:#eff6ff" onclick="show(${x.empId})">View Payslip</button>`]
    ], rows, "No payroll generated for this month yet. Use the buttons above to analyze attendance and calculate salary.");

  } catch (e) {
    showError(e.message);
  }
}

// Form Submission: Calculate Salary
$("f").onsubmit = async e => {
  e.preventDefault();
  const emp = $("emp").value;
  const { year, month } = ym();
  const calcBtn = $("btnCalc");
  calcBtn.disabled = true;
  calcBtn.textContent = "Calculating...";

  try {
    const res = await api(emp ? "/payroll/calculate" : "/payroll/all", {
      method: "POST",
      body: JSON.stringify({ empId: emp, month, year })
    });

    const msg = emp ? "Salary calculated successfully." : `Successfully generated payroll for ${res.generated || "all"} employees!`;
    toast(msg);
    await load();
    if (emp) show(emp);
  } catch (x) {
    toast(x.message, "bad");
  } finally {
    calcBtn.disabled = false;
    calcBtn.textContent = "⚡ 2. Calculate & Generate Salary";
  }
};

$("btnAnalyze").onclick = analyzeMonth;
$("mo").onchange = () => {
  load();
  if ($("analysisCard").style.display !== "none") {
    analyzeMonth();
  }
};

// Initial Load
api("/rules").then(r => {
  if (r && r[0]) {
    $("rules").textContent = `Active Statutory Rules: HRA ${r[0].hra}%, DA ${r[0].da}%, PF ${r[0].pf}% of Basic. Per-day rate = Basic ÷ Weekdays in month. Full absent day = 1.0 day deduction; half day = 0.5 day deduction; approved paid leaves = 0 deduction.`;
  }
});

fillEmployees("emp", "All Employees").then(async () => {
  try {
    const empList = await api("/employees");
    $("mEmp").textContent = empList.length;
  } catch (_) {}
  load();
}).catch(e => showError(e.message));
