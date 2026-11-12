const user=JSON.parse(sessionStorage.getItem("user")||"null");
if(!user)location.href="login.html";
const ic=p=>`<svg viewBox="0 0 24 24">${p}</svg>`;
const NAV=[["index.html","Dashboard",'<path d="M3 12l9-8 9 8M5 10v10h14V10"/>'],
["employees.html","Employees",'<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 4a4 4 0 010 8M22 21c0-3-2-5-4-5.5"/>'],
["attendance.html","Attendance",'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M9 15l2 2 4-4"/>'],
["leave.html","Leave",'<path d="M5 21V4h12l-2 4 2 4H5"/>'],
["payroll.html","Payroll",'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>'],
["reports.html","Reports",'<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"/>'],
["analytics.html","Analytics",'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>']];
const here=location.pathname.split("/").pop()||"index.html";
const navEl=document.getElementById("nav");
if(navEl&&user){const items=user.role==="ADMIN"?NAV:NAV.filter(n=>n[0]==="attendance.html"||n[0]==="leave.html");
navEl.innerHTML=items.map(n=>`<a href="${n[0]}" class="${n[0]===here?"active":""}">${ic(n[2])}${n[1]}</a>`).join("");
document.getElementById("uname").textContent=user.name||user.username;
document.getElementById("av").textContent=(user.name||user.username||"U")[0].toUpperCase();

if (user.role === "ADMIN") {
  const userDiv = document.querySelector(".top .user");
  if (userDiv && !document.getElementById("btnDelAdmin")) {
    const delBtn = document.createElement("button");
    delBtn.id = "btnDelAdmin";
    delBtn.className = "btn ghost btn-danger-ghost";
    delBtn.title = "Delete administrator account and allow a new admin to register";
    delBtn.textContent = "Delete Admin Account";
    delBtn.onclick = deleteAdminAccount;
    const signOutBtn = userDiv.querySelector("button");
    userDiv.insertBefore(delBtn, signOutBtn);
  }
}
}
async function deleteAdminAccount() {
  const ok = confirm("⚠️ Are you sure you want to delete this administrator account?\n\nOnce deleted, you will be logged out, and a new administrator can create an account using the registration page.");
  if (!ok) return;
  try {
    await api("/delete-admin", {
      method: "POST",
      body: JSON.stringify({ username: user.username })
    });
    sessionStorage.clear();
    alert("Administrator account has been deleted.\nA new administrator can now register.");
    location.href = "register.html";
  } catch (err) {
    toast(err.message, "bad");
  }
}
function logout(){sessionStorage.clear();location.href="login.html"}
async function api(path,opts={}){const r=await fetch("/api"+path,{headers:{"Content-Type":"application/json"},...opts});
const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Request failed");return d}
function showError(m){const e=document.getElementById("err");e.textContent=m;e.style.display="block"}
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=n=>"₹"+Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
function toast(m,t){const e=document.createElement("div");e.className="toast "+(t||"");e.textContent=m;document.body.appendChild(e);setTimeout(()=>e.remove(),3200)}
function table(id,cols,rows,empty){$(id).innerHTML=rows.length?`<table><thead><tr>${cols.map(c=>`<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${typeof c[1]==="function"?c[1](r):esc(r[c[1]])}</td>`).join("")}</tr>`).join("")}</tbody></table>`:`<p class="empty">${empty||"No records found."}</p>`}
const badge=s=>`<span class="badge ${String(s).replace(" ","")}">${esc(s)}</span>`;
async function fillEmployees(id,all){const e=await api("/employees");$(id).innerHTML=(all?`<option value="">${all}</option>`:"")+e.map(x=>`<option value="${x.id}">${x.id} – ${esc(x.name)}</option>`).join("")}
const today=()=>new Date().toISOString().slice(0,10);
