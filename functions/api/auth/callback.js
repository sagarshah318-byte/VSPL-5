import {cookie,json,redirect,sha256} from "../../_middleware.js";
export async function onRequestGet({request,env}) {
  const u=new URL(request.url),code=u.searchParams.get("code"),state=u.searchParams.get("state");
  if(!code || !state || state!==cookie(request,"vspl_oauth_state")) return json({error:"Sign-in expired. Please try again."},400);
  const tokenRes=await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json"},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code})});
  const tokenData=await tokenRes.json(); if(!tokenData.access_token) return json({error:"GitHub sign-in failed."},401);
  const headers={Authorization:"Bearer "+tokenData.access_token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
  const [ur,er]=await Promise.all([fetch("https://api.github.com/user",{headers}),fetch("https://api.github.com/user/emails",{headers})]);
  if(!ur.ok || !er.ok) return json({error:"Could not verify GitHub account."},401);
  const user=await ur.json(), emails=await er.json();
  const verified=(emails||[]).find(e=>e.primary && e.verified);
  if(!verified) return json({error:"Your GitHub account needs a verified primary email."},403);
  const email=verified.email.toLowerCase(), now=Math.floor(Date.now()/1000);
  const admin=email===(env.ADMIN_EMAIL||"sagar.shah318@gmail.com").toLowerCase();
  await env.DB.prepare("INSERT INTO users(github_id,github_login,email,email_verified,role,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(github_id) DO UPDATE SET github_login=excluded.github_login,email=excluded.email,email_verified=1,role=CASE WHEN excluded.email=? THEN 'admin' ELSE users.role END").bind(String(user.id),user.login,email,1,admin?"admin":"requester",now,(env.ADMIN_EMAIL||"sagar.shah318@gmail.com").toLowerCase()).run();
  if(admin) await env.DB.prepare("INSERT INTO access_requests(id,github_id,github_login,email,status,requested_at,decided_at,decided_by,expires_at) VALUES(?,?,?,?, 'approved',?,?,?,?) ON CONFLICT(id) DO NOTHING").bind("admin-"+user.id,String(user.id),user.login,email,now,now,email,now+315360000).run();
  else {
    const existing=await env.DB.prepare("SELECT id,status,expires_at FROM access_requests WHERE github_id=? ORDER BY requested_at DESC LIMIT 1").bind(String(user.id)).first();
    if(!existing || existing.status!=="approved" || existing.expires_at<=now) {
      await env.DB.prepare("INSERT INTO access_requests(id,github_id,github_login,email,status,requested_at) VALUES(?,?,?,?,'pending',?)").bind(crypto.randomUUID(),String(user.id),user.login,email,now).run();
    }
  }
  const session=crypto.randomUUID()+crypto.randomUUID(), hash=await sha256(session), expires=now+604800;
  await env.DB.prepare("INSERT INTO sessions(token_hash,github_id,created_at,expires_at) VALUES(?,?,?,?)").bind(hash,String(user.id),now,expires).run();
  const dest=admin?"/scorer.html?admin=1":"/scorer.html";
  return redirect(new URL(dest,request.url).toString(),{"Set-Cookie":"vspl_session="+session+"; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800","Set-Cookie-2":"vspl_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"});
}