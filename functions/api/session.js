import {json,currentUser,isAdmin} from "../lib/auth.js";
export async function onRequestGet({request,env}) {
  const u=await currentUser(request,env);
  if(!u) return json({authenticated:false});
  const admin=await isAdmin(u,env), now=Math.floor(Date.now()/1000);
  const req=await env.DB.prepare("SELECT status,expires_at FROM access_requests WHERE github_id=? ORDER BY requested_at DESC LIMIT 1").bind(u.github_id).first();
  return json({authenticated:true,admin,login:u.github_login,email:u.email,status:admin?"approved":req?.status||"pending",expires_at:req?.expires_at||null,can_score:admin || (!!req && req.status==="approved" && req.expires_at>now)});
}