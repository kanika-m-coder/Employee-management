const admin = user.role === "ADMIN";

async function load() {
  try {
    const r = await api("/leave?emp=" + (admin ? "" : user.empId));
    
    table("tb", [
      ["Employee", x => `
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:700;color:var(--secondary-navy);font-size:12px;background:var(--bg-primary);padding:2px 6px;border-radius:4px;border:1px solid var(--border)">#${x.empId}</span>
          <span style="font-weight:600;color:var(--text-primary)">${esc(x.name)}</span>
        </div>
      `],
      ["Leave Type", r => `<span style="font-weight:600;color:var(--secondary-navy)">${esc(r.type)}</span>`],
      ["Start Date", "startDate"],
      ["End Date", "endDate"],
      ["Working Days", r => `<b>${r.days}</b> days`],
      ["Reason", r => `<span style="color:var(--text-secondary)">${esc(r.reason || "–")}</span>`],
      ["Status", x => badge(x.status)],
      [admin ? "Actions" : "", x => admin ? `
        <button type="button" class="btn-sm del-btn" onclick="del(${x.id})" title="Delete Leave Request">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Delete
        </button>
      ` : ""]
    ], r);

    if (admin) {
      const summaryData = await api("/leave/summary");
      table("sm", [
        ["Employee", x => `
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:700;color:var(--secondary-navy);font-size:12px;background:var(--bg-primary);padding:2px 6px;border-radius:4px;border:1px solid var(--border)">#${x.empId}</span>
            <span style="font-weight:600;color:var(--text-primary)">${esc(x.name)}</span>
          </div>
        `],
        ["Absent Days", x => `<span style="color:var(--status-absent);font-weight:700">${x.absent}</span>`],
        ["Half Days", x => `<span style="color:var(--status-pending);font-weight:600">${x.halfDays}</span>`],
        ["On Leave Days", x => `<span style="color:var(--primary-accent);font-weight:600">${x.onLeave}</span>`]
      ], summaryData);
    }
  } catch (e) {
    showError(e.message);
  }
}

async function del(id) {
  if (!confirm("⚠️ Delete this leave record? Attendance already marked is not changed.")) return;
  try {
    await api("/leave/" + id, { method: "DELETE" });
    toast("Leave record removed");
    load();
  } catch (e) {
    toast(e.message, "bad");
  }
}

$("f").onsubmit = async e => {
  e.preventDefault();
  try {
    await api("/leave", {
      method: "POST",
      body: JSON.stringify({
        empId: $("emp").value,
        type: $("type").value,
        startDate: $("sd").value,
        endDate: $("ed").value,
        status: $("stt").value,
        reason: $("rs").value
      })
    });
    toast("Leave record submitted successfully");
    $("f").reset();
    load();
  } catch (x) {
    toast(x.message, "bad");
  }
};

if (admin) {
  fillEmployees("emp");
} else {
  $("fcard").style.display = "none";
  $("scard").style.display = "none";
}

load();
