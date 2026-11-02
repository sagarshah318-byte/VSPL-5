import {json,currentUser,isAdmin} from "../../lib/auth.js";
export async function onRequestGet({request,env}) {
 const u=await currentUser(request,env); if(!await isAdmin(u,env)) return json({error:"Forbidden"},403);
 const {results=[]}=await env.DB.prepare("SELECT id,github_id,github_login,email,status,requested_at,decided_at,expires_at FROM access_requests ORDER BY requested_at DESC LIMIT 100").all();
 return json({requests:results});
}