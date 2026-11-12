let tab="emp";$("mo").value=today().slice(0,7);
const pct=x=>x.attendancePct==null?"–":x.attendancePct+"%";
async function load(){try{const[y,m]=$("mo").value.split("-").map(Number),p=n=>String(n).padStart(2,"0"),qs=`from=${y}-${p(m)}-01&to=${y}-${p(m)}-${new Date(y,m,0).getDate()}`;
if(tab==="pay"){table("tb",[["Employee",x=>x.empId+" – "+esc(x.name)],["Department","department"],["Working days","workingDays"],["Absent","absentDays"],["Basic",x=>fmt(x.basic)],["HRA",x=>fmt(x.hra)],["DA",x=>fmt(x.da)],["PF",x=>fmt(x.pf)],["Absence ded.",x=>fmt(x.absenceDeduction)],["Net",x=>"<b>"+fmt(x.net)+"</b>"]],await api(`/payroll?month=${m}&year=${y}`),"No payroll for this month.")}
else if(tab==="emp"){table("tb",[["Employee",x=>x.empId+" – "+esc(x.name)],["Department","department"],["Present","present"],["Half days","halfDays"],["On leave","onLeave"],["Absent","absent"],["Hours","hours"],["Attendance",pct]],await api("/reports/employee?"+qs))}
else{table("tb",[["Department","department"],["Employees","employees"],["Present","present"],["Half days","halfDays"],["On leave","onLeave"],["Absent","absent"],["Attendance",pct]],await api("/reports/department?"+qs))}}catch(e){showError(e.message)}}
document.querySelectorAll(".tabs2 .btn").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tabs2 .btn").forEach(x=>x.className="btn ghost");b.className="btn on";tab=b.dataset.t;load()});
$("mo").onchange=load;load();
