const names=[["employee_attendance","Employee attendance"],["monthly_pattern","Monthly attendance pattern"],["department_comparison","Department comparison"],["absenteeism","Employee absenteeism"],["payroll_monthly","Monthly payroll"],["status_distribution","Status distribution"]];
async function show(){try{const r=await fetch("/charts/insights.json?t="+Date.now());if(!r.ok)throw 0;const d=await r.json();
$("gen").textContent="Last generated "+d.generated;$("ins").innerHTML=d.insights.map(i=>`<li>${esc(i)}</li>`).join("");
$("imgs").innerHTML=names.map(n=>`<div><h3>${n[1]}</h3><img src="/charts/${n[0]}.png?t=${Date.now()}" alt="${n[1]}" onerror="this.style.display='none'"></div>`).join("")}
catch(e){$("ins").innerHTML="<li>No analysis yet. Select Refresh analysis to generate charts from the database.</li>"}}
$("run").onclick=async()=>{$("run").disabled=true;$("run").textContent="Analysing…";try{await api("/analytics/run",{method:"POST",body:"{}"});toast("Analysis updated");show()}catch(e){toast(e.message,"bad")}$("run").disabled=false;$("run").textContent="Refresh analysis"};
show();
