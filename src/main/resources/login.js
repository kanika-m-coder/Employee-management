const form=document.getElementById("loginForm"),message=document.getElementById("authMessage");
const identity=form.elements[1],registerPrompt=document.getElementById("registerPrompt");
const password=document.getElementById("password"),passwordToggle=document.getElementById("passwordToggle");
passwordToggle.onclick=()=>{
  const visible=password.type==="password";
  password.type=visible?"text":"password";
  passwordToggle.setAttribute("aria-label",visible?"Hide password":"Show password");
  passwordToggle.title=visible?"Hide password":"Show password";
  passwordToggle.setAttribute("aria-pressed",String(visible));
};
function setRole(role){
  form.elements.role.value=role;
  document.querySelectorAll(".auth-tab").forEach(tab=>tab.classList.toggle("active",tab.dataset.role===role));
  const employee=role==="EMPLOYEE";
  document.getElementById("identityLabel").firstChild.textContent=employee?"Employee code":"Email address";
  identity.name=employee?"employee_code":"email";
  identity.type=employee?"text":"email";
  identity.autocomplete=employee?"username":"username";
  identity.placeholder=employee?"e.g. EMP001":"";
  registerPrompt.classList.toggle("hidden",employee||registerPrompt.dataset.registered!=="false");
}
document.querySelectorAll(".auth-tab").forEach(tab=>tab.onclick=()=>setRole(tab.dataset.role));
async function checkSession(){
  try{
    const response=await fetch("/api/auth/session"),data=await response.json();
    registerPrompt.dataset.registered=String(data.adminRegistered);
    if(data.authenticated)location.replace(data.role==="ADMIN"?"/index.html":"/employee.html");
    else {registerPrompt.classList.toggle("hidden",data.adminRegistered);setRole("ADMIN");}
  }catch{message.textContent="Could not connect to StaffDesk. Please try again.";message.classList.remove("hidden");}
}
form.onsubmit=async event=>{
  event.preventDefault();message.classList.add("hidden");
  const payload=Object.fromEntries(new FormData(form).entries());
  try{
    const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||"Sign in failed.");
    location.replace(data.role==="ADMIN"?"/index.html":"/employee.html");
  }catch(error){message.textContent=error.message;message.classList.remove("hidden");}
};
checkSession();
