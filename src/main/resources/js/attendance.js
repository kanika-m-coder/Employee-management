const admin = user.role === "ADMIN";

async function load() {
  try {
    const emp = admin ? $("fe").value : user.empId;
    const r = await api(`/attendance?emp=${emp}&from=${$("from").value}&to=${$("to").value}`);
    
    // Status distribution chips
    $("sm").innerHTML = ["Present", "Absent", "Half Day", "On Leave"].map(s => {
      const count = r.filter(x => x.status === s).length;
      return `<div class="chip">${badge(s)} <b>${count}</b></div>`;
    }).join("");

    table("tb", [
      ["Date", r => `<span style="font-weight:500;color:var(--secondary-navy)">${r.date}</span>`],
      ["Employee", x => `
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:700;color:var(--secondary-navy);font-size:12px;background:var(--bg-primary);padding:2px 6px;border-radius:4px;border:1px solid var(--border)">#${x.empId}</span>
          <span style="font-weight:600;color:var(--text-primary)">${esc(x.name)}</span>
        </div>
      `],
      ["Department", "department"],
      ["Status", x => badge(x.status)],
      ["Hours Logged", x => `<span style="font-weight:600;color:var(--text-secondary)">${x.hours != null ? x.hours + ' hrs' : '8 hrs'}</span>`]
    ], r);
  } catch (e) {
    showError(e.message);
  }
}

$("f").onsubmit = async e => {
  e.preventDefault();
  try {
    await api("/attendance", {
      method: "POST",
      body: JSON.stringify({
        empId: $("emp").value,
        date: $("date").value,
        status: $("st").value
      })
    });
    toast("Attendance record saved");
    load();
  } catch (x) {
    toast(x.message, "bad");
  }
};

["fe", "from", "to"].forEach(i => $(i).onchange = load);
$("date").value = today();

if (admin) {
  fillEmployees("emp");
  fillEmployees("fe", "All Employees").then(load);
} else {
  $("fcard").style.display = "none";
  $("fe").style.display = "none";
  load();
}
