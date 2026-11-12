const admin=user.role==="ADMIN";
async function load(){try{const r=await api("/leave?emp="+(admin?"":user.empId));
table("tb",[["Employee",x=>x.empId+" – "+esc(x.name)],["Type","type"],["From","startDate"],["To","endDate"],["Working days","days"],["Reason","reason"],["Status",x=>badge(x.status)],[admin?"":"",x=>admin?`<button class="lnk bad" onclick="del(${x.id})">Delete</button>`:""]],r);
if(admin)table("sm",[["Employee",x=>x.empId+" – "+esc(x.name)],["Absent days","absent"],["Half days","halfDays"],["On leave days","onLeave"]],await api("/leave/summary"))}catch(e){showError(e.message)}}
async function del(id){if(!confirm("Delete this leave record? Attendance already marked is not changed."))return;try{await api("/leave/"+id,{method:"DELETE"});toast("Leave deleted");load()}catch(e){toast(e.message,"bad")}}
$("f").onsubmit=async e=>{e.preventDefault();try{await api("/leave",{method:"POST",body:JSON.stringify({empId:$("emp").value,type:$("type").value,startDate:$("sd").value,endDate:$("ed").value,status:$("stt").value,reason:$("rs").value})});toast("Leave saved");$("f").reset();load()}catch(x){toast(x.message,"bad")}};
if(admin)fillEmployees("emp");else{$("fcard").style.display="none";$("scard").style.display="none"}load();
