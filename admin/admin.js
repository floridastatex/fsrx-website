const $=id=>document.getElementById(id);
const roster=$("roster"),form=$("staff-form"),message=$("form-message");
let members=[];
const val=id=>$(id).value.trim();

function notify(t,error=false){
  message.textContent=t;
  message.classList.toggle("error",error);
}
function safe(s){
  return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function imageUrl(value){
  if(!value)return "";
  try{
    const url=new URL(value);
    return ["http:","https:"].includes(url.protocol)?url.href:"";
  }catch{return "";}
}
async function api(url,options={}){
  const r=await fetch(url,{...options,headers:{"content-type":"application/json",...(options.headers||{})}});
  const data=await r.json().catch(()=>({error:"Unexpected server response"}));
  if(!r.ok)throw new Error(data.error||"Request failed");
  return data;
}
function draw(){
  $("roster-count").textContent=members.length+" listed";
  if(!members.length){
    roster.innerHTML='<div class="empty">No staff members yet. Add your first member.</div>';
    return;
  }
  roster.innerHTML=members.map(m=>{
    const avatar=imageUrl(m.discord_avatar)||"https://cdn.discordapp.com/embed/avatars/0.png";
    return '<div class="roster-item"><img src="'+safe(avatar)+'" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'"><div class="roster-info"><strong>'+safe(m.discord_display_name)+'</strong><span>'+safe(m.rank)+' · '+safe(m.discord_username||"No Discord username")+'</span></div><div class="roster-actions"><button class="secondary-btn" data-edit="'+safe(m.id)+'" type="button">Edit</button><button class="danger-btn" data-delete="'+safe(m.id)+'" type="button">Delete</button></div></div>';
  }).join("");
}
async function load(){
  try{
    const d=await api("/api/admin/staff");
    members=d.staff||[];
    draw();
  }catch(e){
    roster.innerHTML='<div class="empty">'+safe(e.message)+'. Confirm Cloudflare Access and the D1 binding are configured.</div>';
    notify(e.message,true);
  }
}
function updatePreview(inputId,imageId,statusId){
  const input=$(inputId),img=$(imageId),status=$(statusId);
  const url=imageUrl(input.value.trim());
  img.hidden=true;
  img.onload=()=>{
    img.hidden=false;
    status.textContent="Preview loaded. Animated GIFs will animate here.";
  };
  img.onerror=()=>{
    img.hidden=true;
    status.textContent="That image could not be loaded. Check that the URL points directly to an image.";
  };
  if(!input.value.trim()){
    img.removeAttribute("src");
    status.textContent="Paste an image URL to preview.";
    return;
  }
  if(!url){
    img.removeAttribute("src");
    status.textContent="Enter a valid http:// or https:// image URL.";
    return;
  }
  img.src=url;
}
function refreshPreviews(){
  updatePreview("discord-avatar","discord-avatar-preview","discord-avatar-preview-status");
  updatePreview("discord-banner","discord-banner-preview","discord-banner-preview-status");
}
function reset(){
  form.reset();
  $("staff-id").value="";
  $("form-title").textContent="Add a staff member";
  $("save-btn").textContent="Save member";
  refreshPreviews();
  notify("");
}
function edit(id){
  const m=members.find(x=>String(x.id)===String(id));
  if(!m)return;
  $("staff-id").value=m.id;
  const values={
    "discord-display-name":m.discord_display_name,
    "discord-username":m.discord_username,
    "rank":m.rank,
    "discord-avatar":m.discord_avatar,
    "discord-banner":m.discord_banner,
    "roblox-display-name":m.roblox_display_name,
    "roblox-username":m.roblox_username,
    "roblox-id":m.roblox_id,
    "roblox-avatar":m.roblox_avatar,
    "tags":(m.tags||[]).join(", ")
  };
  Object.entries(values).forEach(([k,v])=>$(k).value=v||"");
  refreshPreviews();
  $("form-title").textContent="Edit staff member";
  $("save-btn").textContent="Update member";
  notify("");
  window.scrollTo({top:0,behavior:"smooth"});
}
roster.addEventListener("click",async e=>{
  const eb=e.target.closest("[data-edit]"),db=e.target.closest("[data-delete]");
  if(eb){edit(eb.dataset.edit);return;}
  if(db){
    const m=members.find(x=>String(x.id)===db.dataset.delete);
    if(!m||!confirm("Remove "+m.discord_display_name+" from the public staff page?"))return;
    try{
      await api("/api/admin/staff",{method:"DELETE",body:JSON.stringify({id:m.id})});
      notify("Staff member removed.");
      await load();
    }catch(err){notify(err.message,true);}
  }
});
$("add-staff").addEventListener("click",()=>{reset();$("discord-display-name").focus();});
$("cancel-edit").addEventListener("click",reset);
$("discord-avatar").addEventListener("input",()=>updatePreview("discord-avatar","discord-avatar-preview","discord-avatar-preview-status"));
$("discord-banner").addEventListener("input",()=>updatePreview("discord-banner","discord-banner-preview","discord-banner-preview-status"));

form.addEventListener("submit",async e=>{
  e.preventDefault();
  const id=$("staff-id").value;
  const avatar=val("discord-avatar"),banner=val("discord-banner");
  if((avatar&&!imageUrl(avatar))||(banner&&!imageUrl(banner))){
    notify("Please use valid http:// or https:// image URLs for the Discord picture and banner.",true);
    return;
  }
  const payload={
    discord_display_name:val("discord-display-name"),
    discord_username:val("discord-username"),
    rank:val("rank"),
    discord_avatar:avatar,
    discord_banner:banner,
    roblox_display_name:val("roblox-display-name"),
    roblox_username:val("roblox-username"),
    roblox_id:val("roblox-id"),
    roblox_avatar:val("roblox-avatar"),
    tags:val("tags").split(",").map(x=>x.trim()).filter(Boolean)
  };
  try{
    $("save-btn").disabled=true;
    await api("/api/admin/staff",{method:id?"PUT":"POST",body:JSON.stringify(id?{...payload,id}:payload)});
    notify(id?"Staff member updated.":"Staff member added.");
    reset();
    await load();
  }catch(err){notify(err.message,true);}
  finally{$("save-btn").disabled=false;}
});
refreshPreviews();
load();