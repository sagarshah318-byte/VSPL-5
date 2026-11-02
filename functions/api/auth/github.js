import {json,redirect} from "../../lib/auth.js";
export async function onRequestGet({request,env}) {
  if(!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET || !env.DB) return json({error:"Access system is not configured yet."},503);
  const state=crypto.randomUUID();
  const url=new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id",env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri",new URL("/api/auth/callback",request.url).toString());
  url.searchParams.set("scope","read:user user:email");
  url.searchParams.set("state",state);
  return redirect(url.toString(),{ "Set-Cookie": "vspl_oauth_state="+state+"; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600" });
}