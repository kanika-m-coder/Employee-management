const admin=user.role==="ADMIN";
async function load(){try{const emp=admin?$("fe").value:user.empId;const r=await api(`/attendance?emp=${emp}&from=${$("from").value}&to=${$("to").value}`);
$("sm").innerHTML=["Present","Absent","Half Day","On Leave"].map(s=>`<div class="chip">${badge(s)} <b>${r.filter(x=>x.status===s).length}</b></div>`).join("");
table("tb",[["Date","date"],["Employee",x=>x.empId+" – "+esc(x.name)],["Department","department"],["Status",x=>badge(x.status)],["Hours","hours"]],r)}catch(e){showError(e.message)}}
$("f").onsubmit=async e=>{e.preventDefault();try{await api("/attendance",{method:"POST",body:JSON.stringify({empId:$("emp").value,date:$("date").value,status:$("st").value})});toast("Attendance saved");load()}catch(x){toast(x.message,"bad")}};
["fe","from","to"].forEach(i=>$(i).onchange=load);$("date").value=today();
if(admin){fillEmployees("emp");fillEmployees("fe","All employees").then(load)}else{$("fcard").style.display="none";$("fe").style.display="none";load()}
