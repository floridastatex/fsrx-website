const grid=document.getElementById("staff-grid");
const count=document.getElementById("staff-count");
const empty=document.getElementById("empty-state");
document.getElementById("year").textContent=new Date().getFullYear();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function card(s){
 const avatar=s.discord_avatar||"https://cdn.discordapp.com/embed/avatars/0.png";
 const banner=s.discord_banner?'url("'+s.discord_banner.replace(/["\\]/g,"")+'")':"";
 const roblox=s.roblox_avatar||"https://tr.rbxcdn.com/30DAY-AvatarHeadshot-Png/150/150/AvatarHeadshot/Webp/noFilter";
 const tags=(Array.isArray(s.tags)?s.tags:[]).map(t=>'<span class="staff-tag '+(String(t).toLowerCase()==="verified"?"verified":"")+'">'+esc(t)+'</span>').join("");
 const profile=s.roblox_id?"https://www.roblox.com/users/"+encodeURIComponent(s.roblox_id)+"/profile":s.roblox_username?"https://www.roblox.com/search/users?keyword="+encodeURIComponent(s.roblox_username):"#";
 return '<article class="staff-card"><div class="staff-banner" style="'+(banner?"background-image:"+banner:"")+'"></div><div class="staff-main"><img class="staff-avatar" src="'+esc(avatar)+'" alt="" loading="lazy" onerror="this.src=\\'https://cdn.discordapp.com/embed/avatars/0.png\\'"><div class="staff-name-row"><div><div class="staff-name">'+esc(s.discord_display_name||s.discord_username||"Staff Member")+'</div><div class="staff-rank">'+esc(s.rank||"Staff Member")+'</div><div class="staff-handle">'+(s.discord_username?"@"+esc(s.discord_username):"")+'</div></div></div><div class="staff-tags">'+tags+'</div><div class="staff-divider"></div><div class="roblox-label">ROBLOX PROFILE</div><div class="roblox-row"><img class="roblox-avatar" src="'+esc(roblox)+'" alt="" loading="lazy" onerror="this.style.visibility=\\'hidden\\'"><div class="roblox-info"><div class="roblox-display">'+esc(s.roblox_display_name||s.roblox_username||"Not provided")+'</div><div class="roblox-username">'+(s.roblox_username?"@"+esc(s.roblox_username):"Roblox account not linked")+'</div></div>'+(s.roblox_username?'<a class="roblox-link" href="'+esc(profile)+'" target="_blank" rel="noopener">PROFILE ↗</a>':"")+'</div></div></article>';
}
async function load(){
 try{const r=await fetch("/api/staff",{headers:{accept:"application/json"}});if(!r.ok)throw new Error("Request failed");const data=await r.json();const staff=Array.isArray(data.staff)?data.staff:[];count.textContent=staff.length+" team member"+(staff.length===1?"":"s");if(!staff.length){grid.innerHTML="";empty.hidden=false;return}grid.innerHTML=staff.map(card).join("")}
 catch(e){count.textContent="";grid.innerHTML='<div class="loading-card"><p>We could not load the staff directory right now. Please refresh the page.</p></div>'}
}
load();