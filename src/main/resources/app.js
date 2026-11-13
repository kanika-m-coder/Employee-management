const $=id=>document.getElementById(id),money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2}),today=new Date().toISOString().slice(0,10);
$("todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
$("signOut").onclick=async()=>{await fetch("/api/auth/logout",{method:"POST"});location.replace("/login.html");};
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>showView(b.dataset.view));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>showView(b.dataset.go));
document.querySelectorAll("[data-hide]").forEach(b=>b.onclick=()=>$(b.dataset.hide).classList.add("hidden"));
function showView(name){document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));$(name+"View").classList.remove("hidden");document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===name));$("pageTitle").textContent=({overview:"Overview",employees:"Employees",attendance:"Attendance",leaves:"Leave requests",payroll:"Payroll"})[name];loadAll();}
function notify(s){$("message").textContent=s;$("message").classList.remove("hidden");setTimeout(()=>$("message").classList.add("hidden"),3000);}
async function api(path,opt={}){let r=await fetch("/api/"+path,{headers:{"Content-Type":"application/json"},...opt}),d=await r.json();if(!r.ok)throw Error(d.error||"Request failed");return d;}
function data(f){return Object.fromEntries(new FormData(f).entries());}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function who(n,c){return `<b class="person">${esc(n)}</b><small class="sub">${esc(c)}</small>`;}
function pill(s){return `<span class="pill ${s==="PENDING"?"pending":(["ABSENT","REJECTED"].includes(s)?"bad":"")}">${esc(s)}</span>`;}
let employees=[];
async function loadAll(){try{
const [sum,emp]=await Promise.all([api("summary"),api("employees")]);employees=emp;
$("statEmployees").textContent=sum.employees;$("statPresent").textContent=sum.presentToday;$("statLeaves").textContent=sum.pendingLeaves;$("statPayroll").textContent=money(sum.monthlyPayroll);
document.querySelectorAll(".employee-select").forEach(sel=>{let old=sel.value;sel.innerHTML='<option value="">Select employee</option>'+emp.map(e=>`<option value="${e.employee_id}">${esc(e.employee_code)} — ${esc(e.full_name)}</option>`).join("");sel.value=old;});
$("recentEmployees").innerHTML=emp.slice(0,5).map(e=>`<tr><td>${who(e.full_name,e.employee_code)}</td><td>${esc(e.department)}</td><td>${esc(e.designation)}</td><td>${esc(e.date_joined)}</td><td>${pill(e.employment_status)}</td></tr>`).join("")||'<tr><td colspan="5" class="empty">No employee records yet.</td></tr>';
$("employeeRows").innerHTML=emp.map(e=>`<tr><td>${who(e.full_name,e.employee_code)}</td><td>${esc(e.department)}</td><td>${esc(e.designation)}</td><td>${money(e.basic_salary)}</td><td>${esc(e.date_joined)}</td><td><button class="action danger" onclick="removeEmployee(${e.employee_id})">Remove</button></td></tr>`).join("")||'<tr><td colspan="6" class="empty">No employees found.</td></tr>';
let [a,l,p]=await Promise.all([api("attendance"),api("leaves"),api("payroll")]);
$("attendanceRows").innerHTML=a.map(v=>`<tr><td>${who(v.full_name,v.employee_code)}</td><td>${esc(v.attendance_date)}</td><td>${esc(v.check_in||"—")}</td><td>${esc(v.check_out||"—")}</td><td>${pill(v.attendance_status)}</td></tr>`).join("")||'<tr><td colspan="5" class="empty">No attendance records.</td></tr>';
$("leaveRows").innerHTML=l.map(v=>`<tr><td>${who(v.full_name,v.employee_code)}</td><td>${esc(v.start_date)} – ${esc(v.end_date)}</td><td>${esc(v.leave_type)}</td><td>${esc(v.reason||"—")}</td><td>${pill(v.leave_status)} ${v.leave_status==="PENDING"?`<button class="action" onclick="updateLeave(${v.leave_id},'APPROVED')">Approve</button><button class="action danger" onclick="updateLeave(${v.leave_id},'REJECTED')">Reject</button>`:""}</td></tr>`).join("")||'<tr><td colspan="5" class="empty">No leave requests.</td></tr>';
$("payrollRows").innerHTML=p.map(v=>`<tr><td>${who(v.full_name,v.employee_code)}</td><td>${esc(v.pay_month)}</td><td>${money(v.basic_salary)}</td><td>${money(v.allowance)}</td><td>${money(v.deduction)}</td><td><b>${money(v.net_salary)}</b></td></tr>`).join("")||'<tr><td colspan="6" class="empty">No payroll records.</td></tr>';
}catch(e){notify(e.message);}}
window.removeEmployee=async id=>{if(!confirm("Remove this employee and related records?"))return;try{await api("employees?id="+id,{method:"DELETE"});notify("Employee removed.");loadAll();}catch(e){notify(e.message);}};
window.updateLeave=async(id,status)=>{try{await api("leaves",{method:"PUT",body:JSON.stringify({leave_id:id,leave_status:status})});notify("Leave status updated.");loadAll();}catch(e){notify(e.message);}};
[["showEmployeeForm","employeeForm"],["showAttendanceForm","attendanceForm"],["showLeaveForm","leaveForm"],["showPayrollForm","payrollForm"]].forEach(([button,form])=>$(button).onclick=()=>$(form).classList.remove("hidden"));
$("employeeForm").onsubmit=async e=>{e.preventDefault();try{await api("employees",{method:"POST",body:JSON.stringify(data(e.target))});e.target.reset();e.target.classList.add("hidden");notify("Employee saved.");loadAll();}catch(x){notify(x.message);}};
$("attendanceForm").onsubmit=async e=>{e.preventDefault();try{await api("attendance",{method:"POST",body:JSON.stringify(data(e.target))});e.target.reset();e.target.classList.add("hidden");notify("Attendance saved.");loadAll();}catch(x){notify(x.message);}};
$("leaveForm").onsubmit=async e=>{e.preventDefault();try{await api("leaves",{method:"POST",body:JSON.stringify(data(e.target))});e.target.reset();e.target.classList.add("hidden");notify("Leave request submitted.");loadAll();}catch(x){notify(x.message);}};
$("payrollForm").onsubmit=async e=>{e.preventDefault();try{await api("payroll",{method:"POST",body:JSON.stringify(data(e.target))});e.target.reset();e.target.classList.add("hidden");notify("Payroll saved.");loadAll();}catch(x){notify(x.message);}};
$("attendanceForm").elements.attendance_date.value=today;loadAll();
