let rows=[];
async function load(){try{rows=await api("/employees?q="+encodeURIComponent($("q").value)+"&dept="+$("fd").value);
table("tb",[
  ["ID","id"],
  ["Name","name"],
  ["Department","department"],
  ["Designation","designation"],
  ["Basic salary",r=>fmt(r.salary)],
  ["Joined","joinDate"],
  ["Actions",r=>`<div class="action-cell">
    <button type="button" class="btn-sm edit-btn" onclick="edit(${r.id})">
      <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit
    </button>
    <button type="button" class="btn-sm del-btn" onclick="del(${r.id})">
      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
      Delete
    </button>
  </div>`]
],rows)}catch(e){showError(e.message)}}
function edit(id){const r=rows.find(x=>x.id==id);$("id").value=r.id;$("name").value=r.name;$("dept").value=r.deptId;$("des").value=r.designation;$("sal").value=r.salary;$("jd").value=r.joinDate;$("ft").textContent="Edit employee "+id;scrollTo(0,0)}
async function del(id){if(!confirm("Delete employee "+id+" and all their attendance, leave and payroll records?"))return;try{await api("/employees/"+id,{method:"DELETE"});toast("Employee deleted");load()}catch(e){toast(e.message,"bad")}}
function reset(){$("f").reset();$("id").value="";$("ft").textContent="Add employee"}
$("f").onsubmit=async e=>{e.preventDefault();const id=$("id").value;
try{await api("/employees"+(id?"/"+id:""),{method:id?"PUT":"POST",body:JSON.stringify({name:$("name").value,deptId:$("dept").value,designation:$("des").value,salary:$("sal").value,joinDate:$("jd").value})});toast(id?"Employee updated":"Employee added");reset();load()}catch(x){toast(x.message,"bad")}};
$("rs").onclick=reset;$("q").oninput=load;$("fd").onchange=load;
(async()=>{const d=await api("/departments");$("dept").innerHTML=d.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");$("fd").innerHTML='<option value="">All departments</option>'+$("dept").innerHTML;load()})().catch(e=>showError(e.message));
