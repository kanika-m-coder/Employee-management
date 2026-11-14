const $=id=>document.getElementById(id);
function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function pill(status){return `<span class="pill ${status==="PENDING"?"pending":(["ABSENT","REJECTED"].includes(status)?"bad":"")}">${esc(status)}</span>`;}
function notify(text){$("message").textContent=text;$("message").classList.remove("hidden");setTimeout(()=>$("message").classList.add("hidden"),3000);}
async function loadPortal(){
  const response=await fetch("/api/employee/portal"),data=await response.json();
  if(response.status===401){location.replace("/login.html");return;}
  if(!response.ok)throw Error(data.error||"Unable to load employee details.");
  $("employeeName").textContent=`Hello, ${data.employee.full_name}`;
  $("employeeDetails").textContent=`${data.employee.employee_code} · ${data.employee.department} · ${data.employee.designation}`;
  $("attendanceRows").innerHTML=data.attendance.map(v=>`<tr><td>${esc(v.attendance_date)}</td><td>${esc(v.check_in||"—")}</td><td>${esc(v.check_out||"—")}</td><td>${pill(v.attendance_status)}</td></tr>`).join("")||'<tr><td colspan="4" class="empty">No attendance records.</td></tr>';
  $("leaveRows").innerHTML=data.leaves.map(v=>`<tr><td>${esc(v.start_date)} – ${esc(v.end_date)}</td><td>${esc(v.leave_type)}</td><td>${esc(v.reason||"—")}</td><td>${pill(v.leave_status)}</td></tr>`).join("")||'<tr><td colspan="4" class="empty">No leave requests.</td></tr>';
  $("payrollRows").innerHTML=data.payroll.map(v=>`<tr><td>${esc(v.pay_month)}</td><td>${money(v.basic_salary)}</td><td>${money(v.allowance)}</td><td>${money(v.deduction)}</td><td><b>${money(v.net_salary)}</b></td></tr>`).join("")||'<tr><td colspan="5" class="empty">No payroll records.</td></tr>';
}
function money(value){return "₹"+Number(value||0).toLocaleString("en-IN",{maximumFractionDigits:2});}
$("leaveForm").onsubmit=async event=>{
  event.preventDefault();
  try{
    const response=await fetch("/api/employee/leaves",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(event.target).entries()))});
    const data=await response.json();if(!response.ok)throw Error(data.error||"Could not submit leave request.");
    event.target.reset();notify("Leave request submitted.");await loadPortal();
  }catch(error){notify(error.message);}
};
$("logout").onclick=async()=>{await fetch("/api/auth/logout",{method:"POST"});location.replace("/login.html");};
loadPortal().catch(error=>notify(error.message));
