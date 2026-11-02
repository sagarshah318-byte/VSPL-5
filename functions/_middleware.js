const enc = new TextEncoder();
async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,"0")).join("");
}
function cookie(req, name) {
  const raw = req.headers.get("Cookie") || "";
  const m = raw.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}
function json(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), {status, headers: {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
}
function redirect(url, headers={}) { return new Response(null,{status:302,headers:{Location:url,...headers}}); }
function safeEqual(a,b) {
  if(!a || !b || a.length!==b.length) return false;
  let x=0; for(let i=0;i<a.length;i++) x |= a.charCodeAt(i)^b.charCodeAt(i); return x===0;
}
async function currentUser(req, env) {
  const raw=cookie(req,"vspl_session"); if(!raw) return null;
  const hash=await sha256(raw), now=Math.floor(Date.now()/1000);
  const row=await env.DB.prepare("SELECT s.github_id,s.expires_at,u.github_login,u.email,u.role FROM sessions s JOIN users u ON u.github_id=s.github_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?").bind(hash,now).first();
  if(!row) return null;
  if(row.role!=="admin") {
    const approved=await env.DB.prepare("SELECT expires_at FROM access_requests WHERE github_id=? AND status='approved' ORDER BY decided_at DESC LIMIT 1").bind(row.github_id).first();
    if(!approved || approved.expires_at<=now) return null;
  }
  return row;
}
async function isAdmin(user,env) {
  return !!user && user.email.toLowerCase()===(env.ADMIN_EMAIL||"sagar.shah318@gmail.com").toLowerCase() && user.role==="admin";
}
async function requireUser(req,env) {
  const u=await currentUser(req,env); return u || null;
}
export {sha256,cookie,json,redirect,safeEqual,currentUser,isAdmin,requireUser};