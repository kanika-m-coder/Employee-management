const form=document.getElementById("registerForm"),message=document.getElementById("authMessage");
async function checkRegistration(){
  try{
    const response=await fetch("/api/auth/session"),data=await response.json();
    if(data.authenticated){location.replace(data.role==="ADMIN"?"/index.html":"/employee.html");return;}
    if(data.adminRegistered){location.replace("/login.html");}
  }catch{
    message.textContent="Could not connect to StaffDesk. Please try again.";
    message.classList.remove("hidden");
    form.querySelector("button").disabled=true;
  }
}
form.onsubmit=async event=>{
  event.preventDefault();message.classList.add("hidden");
  const payload=Object.fromEntries(new FormData(form).entries());
  try{
    const response=await fetch("/api/auth/register-admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||"Registration failed.");
    location.replace("/index.html");
  }catch(error){message.textContent=error.message;message.classList.remove("hidden");}
};
checkRegistration();
