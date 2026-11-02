import {json,approvedUser} from "../lib/auth.js";
const REPO="sagarshah318-byte/VSPL-5-Live-Data", PATH="state.json", BRANCH="main";
export async function onRequestGet({env}) {
 const h={Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
 const r=await fetch("https://api.github.com/repos/"+REPO+"/contents/"+PATH+"?ref="+BRANCH,{headers:h});
 if(!r.ok) return json({error:"Live score data unavailable"},502);
 const d=await r.json();
 const raw=Uint8Array.from(atob(d.content.replace(/\n/g,"")),c=>c.charCodeAt(0));
 const decoded=new TextDecoder().decode(raw);
 return new Response(decoded,{headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","ETag":d.sha}});
}
export async function onRequestPost({request,env}) {
 const user=await approvedUser(request,env);
 if(!user) return json({error:"Scoring access is not approved or has expired."},403);
 if(!env.SCORE_GITHUB_TOKEN) return json({error:"Server score token is not configured."},503);
 const payload=await request.json().catch(()=>null);
 if(!payload || typeof payload!=="object" || !Array.isArray(payload.H) || !Array.isArray(payload.T)) return json({error:"Invalid score data."},400);
 const h={Authorization:"Bearer "+env.SCORE_GITHUB_TOKEN,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
 const url="https://api.github.com/repos/"+REPO+"/contents/"+PATH;
 const g=await fetch(url+"?ref="+BRANCH,{headers:h});
 if(!g.ok) return json({error:"Could not read current live score state."},502);
 const current=await g.json();
 const bytes=new TextEncoder().encode(JSON.stringify(payload));
 let binary=""; for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
 const put=await fetch(url,{method:"PUT",headers:h,body:JSON.stringify({message:"VSPL-5 score update",content:btoa(binary),branch:BRANCH,sha:current.sha})});
 if(!put.ok) return json({error:put.status===409||put.status===422?"Score changed elsewhere. Refresh before scoring again.":"Could not save score update."},put.status===409||put.status===422?409:502);
 return json({ok:true,sha:(await put.json()).content.sha});
}