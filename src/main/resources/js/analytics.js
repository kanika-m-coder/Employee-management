const names = [
  ["employee_attendance", "Employee Attendance Overview"],
  ["monthly_pattern", "Monthly Attendance Trends & Pattern"],
  ["department_comparison", "Departmental Comparative Attendance"],
  ["absenteeism", "Workforce Absenteeism Breakdown"],
  ["payroll_monthly", "Monthly Payroll Expenditure Trend"],
  ["status_distribution", "Overall Status Proportion Distribution"]
];

async function show() {
  try {
    const r = await fetch("/charts/insights.json?t=" + Date.now());
    if (!r.ok) throw 0;
    const d = await r.json();
    $("gen").textContent = "Last generated: " + d.generated;
    $("ins").innerHTML = d.insights.map(i => `
      <li style="margin-bottom:6px">
        <span>${esc(i)}</span>
      </li>
    `).join("");
    $("imgs").innerHTML = names.map(n => `
      <div>
        <h3>${n[1]}</h3>
        <img src="/charts/${n[0]}.png?t=${Date.now()}" alt="${n[1]}" onerror="this.parentElement.style.display='none'">
      </div>
    `).join("");
  } catch (e) {
    $("ins").innerHTML = "<li>No analysis generated yet. Click 'Refresh Analysis' to run Python intelligence on live database records.</li>";
  }
}

$("run").onclick = async () => {
  const btn = $("run");
  btn.disabled = true;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
    Analyzing...
  `;
  try {
    await api("/analytics/run", { method: "POST", body: "{}" });
    toast("Analysis updated successfully");
    await show();
  } catch (e) {
    toast(e.message, "bad");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
      Refresh Analysis
    `;
  }
};

show();
