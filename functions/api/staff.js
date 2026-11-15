export async function onRequestGet({env}) {
 try {
  const {results}=await env.FSRX_DB.prepare("SELECT id,discord_display_name,discord_username,rank,discord_avatar,discord_banner,roblox_display_name,roblox_username,roblox_id,roblox_avatar,tags FROM staff_members ORDER BY sort_order ASC,created_at ASC").all();
  return Response.json({staff:(results||[]).map(row=>({...row,tags:parseTags(row.tags)}))},{headers:{"Cache-Control":"public, max-age=60, s-maxage=60"}});
 } catch(error) {
  return Response.json({error:"Staff directory is temporarily unavailable."},{status:500});
 }
}
function parseTags(value){try{const tags=JSON.parse(value||"[]");return Array.isArray(tags)?tags:[]}catch{return []}}