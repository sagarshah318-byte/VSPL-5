import {json,currentUser,isAdmin} from "../../lib/auth.js";
export async function onRequestPost({request,env}) {
 const u=await currentUser(request,env); if(!await isAdmin(u,env)) return json({error:"Forbidden"},403);
 const body=await request.json().catch(()=>null); if(!body || !body.id || !["approve","reject","revoke"].includes(body.action)) return json({error:"Invalid request"},400);
 const row=await env.DB.prepare("SELECT * FROM access_requests WHERE id=?").bind(body.id).first(); if(!row) return json({error:"Request not found"},404);
 const now=Math.floor(Date.now()/1000);
 if(body.action==="approve") await env.DB.prepare("UPDATE access_requests SET status='approved',decided_at=?,decided_by=?,expires_at=? WHERE id=?").bind(now,u.email,now+604800,row.id).run();
 else await env.DB.prepare("UPDATE access_requests SET status=?,decided_at=?,decided_by=?,expires_at=NULL WHERE id=?").bind(body.action==="reject"?"rejected":"revoked",now,u.email,row.id).run();
 if(body.action==="revoke") await env.DB.prepare("UPDATE sessions SET revoked_at=? WHERE github_id=? AND revoked_at IS NULL").bind(now,row.github_id).run();
 return json({ok:true});
}