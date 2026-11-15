const HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:HEADERS})}
function accessEmail(request){
 const token=request.headers.get("cf-access-jwt-assertion");if(!token)return null;
 try{const part=token.split(".")[1];const normalized=part.replace(/-/g,"+").replace(/_/g,"/");const payload=JSON.parse(atob(normalized));return String(payload.email||"").toLowerCase()}catch{return null}
}
function authorized(request,env){
 const email=accessEmail(request);
 const header=(request.headers.get("cf-access-authenticated-user-email")||"").toLowerCase();
 const allowed=(env.ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 return Boolean(email&&header&&email===header&&allowed.includes(email));
}
function clean(value,max=500){return typeof value==="string"?value.trim().slice(0,max):""}
function validUrl(value){if(!value)return true;try{return new URL(value).protocol==="https:"}catch{return false}}
function parse(body){
 const p={discord_display_name:clean(body.discord_display_name,80),discord_username:clean(body.discord_username,80),rank:clean(body.rank,100),discord_avatar:clean(body.discord_avatar,500),discord_banner:clean(body.discord_banner,500),roblox_display_name:clean(body.roblox_display_name,80),roblox_username:clean(body.roblox_username,80),roblox_id:clean(body.roblox_id,24),roblox_avatar:clean(body.roblox_avatar,500),tags:Array.isArray(body.tags)?body.tags.slice(0,12).map(x=>clean(x,32)).filter(Boolean):[]};
 if(!p.discord_display_name||!p.rank)throw new Error("Discord display name and staff rank are required.");
 for(const key of ["discord_avatar","discord_banner","roblox_avatar"])if(!validUrl(p[key]))throw new Error("Profile image links must use HTTPS.");
 if(p.roblox_id&&!/^\d+$/.test(p.roblox_id))throw new Error("Roblox user ID must contain numbers only.");
 return p;
}
export async function onRequest({request,env}){
 if(!authorized(request,env))return reply({error:"Access denied. Sign in through your authorized Cloudflare Access account."},403);
 if(!env.FSRX_DB)return reply({error:"The FSRX_DB D1 binding is not configured."},503);
 try{
  if(request.method==="GET"){
   const {results}=await env.FSRX_DB.prepare("SELECT * FROM staff_members ORDER BY sort_order ASC,created_at ASC").all();
   return reply({staff:(results||[]).map(row=>({...row,tags:parseTags(row.tags)}))});
  }
  if(request.method==="POST"){
   const p=parse(await request.json());
   const result=await env.FSRX_DB.prepare("INSERT INTO staff_members (discord_display_name,discord_username,rank,discord_avatar,discord_banner,roblox_display_name,roblox_username,roblox_id,roblox_avatar,tags) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(p.discord_display_name,p.discord_username,p.rank,p.discord_avatar,p.discord_banner,p.roblox_display_name,p.roblox_username,p.roblox_id,p.roblox_avatar,JSON.stringify(p.tags)).run();
   return reply({ok:true,id:result.meta?.last_row_id},201);
  }
  if(request.method==="PUT"){
   const body=await request.json(),id=Number(body.id);
   if(!Number.isInteger(id)||id<1)return reply({error:"A valid staff member ID is required."},400);
   const p=parse(body);
   const result=await env.FSRX_DB.prepare("UPDATE staff_members SET discord_display_name=?,discord_username=?,rank=?,discord_avatar=?,discord_banner=?,roblox_display_name=?,roblox_username=?,roblox_id=?,roblox_avatar=?,tags=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(p.discord_display_name,p.discord_username,p.rank,p.discord_avatar,p.discord_banner,p.roblox_display_name,p.roblox_username,p.roblox_id,p.roblox_avatar,JSON.stringify(p.tags),id).run();
   if(!result.meta?.changes)return reply({error:"Staff member not found."},404);
   return reply({ok:true});
  }
  if(request.method==="DELETE"){
   const body=await request.json(),id=Number(body.id);
   if(!Number.isInteger(id)||id<1)return reply({error:"A valid staff member ID is required."},400);
   const result=await env.FSRX_DB.prepare("DELETE FROM staff_members WHERE id=?").bind(id).run();
   if(!result.meta?.changes)return reply({error:"Staff member not found."},404);
   return reply({ok:true});
  }
  return reply({error:"Method not allowed."},405);
 }catch(error){return reply({error:error instanceof Error?error.message:"Unexpected server error."},400)}
}
function parseTags(value){try{const tags=JSON.parse(value||"[]");return Array.isArray(tags)?tags:[]}catch{return []}}