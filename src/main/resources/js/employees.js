let rows = [];

async function load() {
  try {
    rows = await api("/employees?q=" + encodeURIComponent($("q").value) + "&dept=" + $("fd").value);
    table("tb", [
      ["ID", r => `<span style="font-weight:700;color:var(--secondary-navy);font-size:12.5px;background:var(--bg-primary);padding:3px 8px;border-radius:6px;border:1px solid var(--border)">#${r.id}</span>`],
      ["Employee", r => `
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:30px;height:30px;border-radius:50%;background:rgba(22,199,217,0.15);color:#0b7285;display:grid;place-items:center;font-weight:700;font-size:12px;border:1px solid rgba(22,199,217,0.3)">
            ${esc((r.name || "E")[0].toUpperCase())}
          </div>
          <div>
            <div style="font-weight:600;color:var(--text-primary)">${esc(r.name)}</div>
          </div>
        </div>
      `],
      ["Department", "department"],
      ["Designation", r => `<span style="color:var(--text-secondary);font-size:13px">${esc(r.designation)}</span>`],
      ["Basic Salary", r => `<b style="color:var(--secondary-navy)">${fmt(r.salary)}</b>`],
      ["Joined Date", "joinDate"],
      ["Actions", r => `
        <div class="action-cell">
          <button type="button" class="btn-sm edit-btn" onclick="edit(${r.id})" title="Edit Employee">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button type="button" class="btn-sm del-btn" onclick="del(${r.id})" title="Delete Employee">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            Delete
          </button>
        </div>
      `]
    ], rows);
  } catch (e) {
    showError(e.message);
  }
}

function edit(id) {
  const r = rows.find(x => x.id == id);
  if (!r) return;
  $("id").value = r.id;
  $("name").value = r.name;
  $("dept").value = r.deptId;
  $("des").value = r.designation;
  $("sal").value = r.salary;
  $("jd").value = r.joinDate;
  $("ft").innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--primary-accent)" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    Edit Employee #${id}
  `;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function del(id) {
  if (!confirm("⚠️ Delete employee #" + id + " and all their attendance, leave and payroll records?")) return;
  try {
    await api("/employees/" + id, { method: "DELETE" });
    toast("Employee deleted successfully");
    load();
  } catch (e) {
    toast(e.message, "bad");
  }
}

function reset() {
  $("f").reset();
  $("id").value = "";
  $("ft").innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--primary-accent)" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
    Add New Employee
  `;
}

$("f").onsubmit = async e => {
  e.preventDefault();
  const id = $("id").value;
  try {
    await api("/employees" + (id ? "/" + id : ""), {
      method: id ? "PUT" : "POST",
      body: JSON.stringify({
        name: $("name").value,
        deptId: $("dept").value,
        designation: $("des").value,
        salary: $("sal").value,
        joinDate: $("jd").value
      })
    });
    toast(id ? "Employee updated successfully" : "Employee registered successfully");
    reset();
    load();
  } catch (x) {
    toast(x.message, "bad");
  }
};

$("rs").onclick = reset;
$("q").oninput = load;
$("fd").onchange = load;

(async () => {
  const d = await api("/departments");
  $("dept").innerHTML = d.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join("");
  $("fd").innerHTML = '<option value="">All Departments</option>' + $("dept").innerHTML;
  load();
})().catch(e => showError(e.message));
