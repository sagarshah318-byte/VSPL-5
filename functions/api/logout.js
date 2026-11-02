import {json,cookie,sha256} from "../_middleware.js";
export async function onRequestPost({request,env}) {
 const raw=cookie(request,"vspl_session");
 if(raw) await env.DB.prepare("UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL").bind(Math.floor(Date.now()/1000),await sha256(raw)).run();
 return json({ok:true},200,{"Set-Cookie":"vspl_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"});
}