const $=id=>document.getElementById(id);
const roster=$("roster"),form=$("staff-form"),message=$("form-message");
let members=[];
const val=id=>$(id).value.trim();
function notify(t,error=false){message.textContent=t;message.classList.toggle("error",error)}
function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function api(url,options={}){const r=await fetch(url,{...options,headers:{"content-type":"application/json",...(options.headers||{})}});const data=await r.json().catch(()=>({error:"Unexpected server response"}));if(!r.ok)throw new Error(data.error||"Request failed");return data}
function draw(){
 $("roster-count").textContent=members.length+" listed";
 if(!members.length){roster.innerHTML='<div class="empty">No staff members yet. Add your first member.</div>';return}
 roster.innerHTML=members.map(m=>'<div class="roster-item"><img src="'+safe(m.discord_avatar||"https://cdn.discordapp.com/embed/avatars/0.png")+'" alt=""><div class="roster-info"><strong>'+safe(m.discord_display_name)+'</strong><span>'+safe(m.rank)+' · '+safe(m.discord_username||"No Discord username")+'</span></div><div class="roster-actions"><button class="secondary-btn" data-edit="'+m.id+'">Edit</button><button class="danger-btn" data-delete="'+m.id+'">Delete</button></div></div>').join("");
}
async function load(){try{const d=await api("/api/admin/staff");members=d.staff||[];draw()}catch(e){roster.innerHTML='<div class="empty">'+safe(e.message)+'. Confirm Cloudflare Access and the D1 binding are configured.</div>';notify(e.message,true)}}
function reset(){form.reset();$("staff-id").value="";$("form-title").textContent="Add a staff member";$("save-btn").textContent="Save member";notify("")}
function edit(id){
 const m=members.find(x=>String(x.id)===String(id));if(!m)return;
 $("staff-id").value=m.id;
 const values={"discord-display-name":m.discord_display_name,"discord-username":m.discord_username,"rank":m.rank,"discord-avatar":m.discord_avatar,"discord-banner":m.discord_banner,"roblox-display-name":m.roblox_display_name,"roblox-username":m.roblox_username,"roblox-id":m.roblox_id,"roblox-avatar":m.roblox_avatar,"tags":(m.tags||[]).join(", ")};
 Object.entries(values).forEach(([k,v])=>$(k).value=v||"");
 $("form-title").textContent="Edit staff member";$("save-btn").textContent="Update member";notify("");window.scrollTo({top:0,behavior:"smooth"});
}
roster.addEventListener("click",async e=>{
 const eb=e.target.closest("[data-edit]"),db=e.target.closest("[data-delete]");
 if(eb){edit(eb.dataset.edit);return}
 if(db){const m=members.find(x=>String(x.id)===db.dataset.delete);if(!m||!confirm("Remove "+m.discord_display_name+" from the public staff page?"))return;try{await api("/api/admin/staff",{method:"DELETE",body:JSON.stringify({id:m.id})});notify("Staff member removed.");await load()}catch(err){notify(err.message,true)}}
});
$("add-staff").addEventListener("click",()=>{reset();$("discord-display-name").focus()});
$("cancel-edit").addEventListener("click",reset);
form.addEventListener("submit",async e=>{
 e.preventDefault();const id=$("staff-id").value;
 const payload={discord_display_name:val("discord-display-name"),discord_username:val("discord-username"),rank:val("rank"),discord_avatar:val("discord-avatar"),discord_banner:val("discord-banner"),roblox_display_name:val("roblox-display-name"),roblox_username:val("roblox-username"),roblox_id:val("roblox-id"),roblox_avatar:val("roblox-avatar"),tags:val("tags").split(",").map(x=>x.trim()).filter(Boolean)};
 try{$("save-btn").disabled=true;await api("/api/admin/staff",{method:id?"PUT":"POST",body:JSON.stringify(id?{...payload,id}:payload)});notify(id?"Staff member updated.":"Staff member added.");reset();await load()}
 catch(err){notify(err.message,true)}finally{$("save-btn").disabled=false}
});
load();