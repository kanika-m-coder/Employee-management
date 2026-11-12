(async()=>{try{
const d=await api("/dashboard");
document.getElementById("title").textContent="Dashboard – attendance as of "+d.date;
const set=(i,v)=>document.getElementById(i).textContent=v;
set("total",d.totalEmployees);set("present",d.present);set("absent",d.absent);set("leave",d.onLeave);
set("payroll","₹"+Number(d.monthlyPayroll).toLocaleString("en-IN"));
const opt={maintainAspectRatio:false,plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:true,grid:{color:"#E2E8F0"}},x:{grid:{display:false}}}};
new Chart(document.getElementById("dept"),{type:"bar",data:{labels:d.byDepartment.map(x=>x.department),datasets:[
{label:"Present",data:d.byDepartment.map(x=>x.present),backgroundColor:"#2563EB",borderRadius:4},
{label:"Absent",data:d.byDepartment.map(x=>x.absent),backgroundColor:"#DC2626",borderRadius:4}]},options:opt});
new Chart(document.getElementById("month"),{type:"line",data:{labels:d.monthly.map(x=>x.month),datasets:[
{label:"Present",data:d.monthly.map(x=>x.present),borderColor:"#2563EB",tension:.3},
{label:"Absent",data:d.monthly.map(x=>x.absent),borderColor:"#DC2626",tension:.3}]},options:opt});
}catch(e){showError(e.message==="Failed to fetch"?"Cannot reach the Java backend. Start the server (Stage 2) to load live data.":e.message)}})();
