const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 10000;
const USER = process.env.DASH_USER || 'lauren';
const PASS_SHA256 = process.env.DASH_PASS_SHA256 || '';
const SHEET_URL = process.env.SHEET_URL || '';
const NOTION_URL = process.env.NOTION_URL || '';

function parseData() {
  try {
    return JSON.parse(process.env.DASH_DATA_JSON || '{}');
  } catch {
    return {};
  }
}
function safeEqual(a,b){
  const A=Buffer.from(a||''); const B=Buffer.from(b||'');
  if(A.length!==B.length) return false;
  return crypto.timingSafeEqual(A,B);
}
function authed(req){
  if(!PASS_SHA256) return true;
  const h=req.headers.authorization||'';
  if(!h.startsWith('Basic ')) return false;
  try{
    const [u,p='']=Buffer.from(h.slice(6),'base64').toString('utf8').split(':');
    const ph=crypto.createHash('sha256').update(p).digest('hex');
    return safeEqual(u,USER) && safeEqual(ph,PASS_SHA256);
  }catch{return false;}
}
function esc(s=''){
  return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function card(title,value,sub){
  return `<div class="metric"><div class="metric-label">${esc(title)}</div><div class="metric-value">${esc(value)}</div><div class="metric-sub">${esc(sub||'')}</div></div>`;
}
function badge(stage=''){
  const c=stage.toLowerCase().includes('interview')?'interview':stage.toLowerCase().includes('applied')?'applied':'neutral';
  return `<span class="badge ${c}">${esc(stage)}</span>`;
}
function row(item,kind){
  const pay=item.compensation||item.pay||'';
  const date=item.followUp||item.applied||'';
  const note=item.nextStep||item.why||'';
  const href=item.notion||item.link||'';
  return `<tr>
    <td><div class="name">${esc(item.name)}</div><div class="muted">${esc(item.location||'')}</div></td>
    <td>${kind==='pipeline'?badge(item.stage||''):esc(item.priority||item.freshness||'')}</td>
    <td>${esc(pay)}</td>
    <td>${esc(date)}</td>
    <td class="next">${esc(note)}</td>
    <td>${href?`<a class="open" href="${esc(href)}" target="_blank" rel="noreferrer">Open ↗</a>`:''}</td>
  </tr>`;
}
function section(id,title,sub,items,kind){
  return `<section id="${id}" class="panel">
    <div class="panel-head"><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div><span class="count">${items.length}</span></div>
    <div class="table-wrap"><table><thead><tr><th>Opportunity</th><th>${kind==='pipeline'?'Stage':'Priority'}</th><th>Pay</th><th>${kind==='pipeline'?'Date':'Freshness'}</th><th>Next move</th><th></th></tr></thead>
    <tbody>${items.map(x=>row(x,kind)).join('')}</tbody></table></div>
  </section>`;
}
function page(data){
  const pipeline=data.pipeline||[], holiday=data.holiday||[], civic=data.civic||[];
  const interviewing=pipeline.filter(x=>(x.stage||'').toLowerCase().includes('interview')).length;
  const applied=pipeline.filter(x=>(x.stage||'').toLowerCase().includes('applied')).length;
  const today=(data.syncedAt||'');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lauren Job Cockpit</title>
<style>
:root{--ink:#17171b;--muted:#6f6f78;--line:#e8e8ed;--paper:#fbfbfd;--card:#fff;--accent:#5f4bb6;--green:#237a57;--amber:#9b6400}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.wrap{max-width:1240px;margin:0 auto;padding:28px 20px 56px}.top{display:flex;gap:20px;justify-content:space-between;align-items:flex-start;margin-bottom:22px}
.kicker{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}h1{font-size:34px;line-height:1.05;margin:5px 0 8px}p{margin:0;color:var(--muted)}
.actions{display:flex;gap:9px;flex-wrap:wrap}.btn{background:#fff;border:1px solid var(--line);border-radius:999px;padding:10px 13px;text-decoration:none;color:var(--ink);font-weight:700;font-size:13px}.btn:hover{border-color:#bdbdc7}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0 26px}.metric{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px}.metric-label{font-size:12px;color:var(--muted);font-weight:700}.metric-value{font-size:30px;font-weight:850;margin:3px 0}.metric-sub{font-size:12px;color:var(--muted)}
.nav{display:flex;gap:8px;overflow:auto;padding:2px 0 14px;position:sticky;top:0;background:rgba(251,251,253,.94);backdrop-filter:blur(10px);z-index:3}.nav a{white-space:nowrap;text-decoration:none;color:var(--ink);font-size:13px;font-weight:750;padding:8px 11px;border:1px solid var(--line);border-radius:999px;background:#fff}
.panel{background:#fff;border:1px solid var(--line);border-radius:20px;margin:14px 0 20px;overflow:hidden}.panel-head{display:flex;justify-content:space-between;gap:12px;padding:18px 18px 13px;border-bottom:1px solid var(--line)}h2{font-size:19px;margin:0 0 3px}.panel-head p{font-size:13px}.count{align-self:center;background:#f0eefb;color:var(--accent);font-weight:800;border-radius:999px;padding:6px 10px}
.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;min-width:920px}th,td{text-align:left;padding:13px 16px;border-bottom:1px solid var(--line);vertical-align:top;font-size:13px}th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:#fcfcfe}.name{font-weight:800}.muted{font-size:11px;color:var(--muted);margin-top:3px}.next{max-width:360px}.badge{display:inline-block;padding:5px 8px;border-radius:999px;font-weight:800;font-size:11px}.badge.applied{background:#eef3ff;color:#3156a6}.badge.interview{background:#ebf8f1;color:var(--green)}.badge.neutral{background:#f1f1f3}.open{font-weight:800;text-decoration:none;color:var(--accent)}
.foot{color:var(--muted);font-size:12px;margin-top:24px}.statusline{background:#17171b;color:#fff;border-radius:16px;padding:15px 17px;margin-bottom:18px}.statusline strong{color:#d5cfff}
@media(max-width:760px){.top{display:block}.actions{margin-top:14px}.metrics{grid-template-columns:repeat(2,1fr)}h1{font-size:29px}.wrap{padding:20px 14px 42px}}
</style></head>
<body><div class="wrap">
<div class="top"><div><div class="kicker">Lauren Bush · Job Search HQ</div><h1>Holiday + Next Gig Cockpit</h1><p>One bookmark for applications, bridge money, and the next Community Rising-style gig.</p></div>
<div class="actions">${SHEET_URL?`<a class="btn" href="${esc(SHEET_URL)}" target="_blank">Google Sheet ↗</a>`:''}${NOTION_URL?`<a class="btn" href="${esc(NOTION_URL)}" target="_blank">Notion HQ ↗</a>`:''}</div></div>
<div class="statusline">Last reconciled: <strong>${esc(today||'not set')}</strong>. Canonical truth lives in Notion; this dashboard is the review layer.</div>
<div class="metrics">
${card('Recent pipeline',pipeline.length,'confirmed / tracked')}
${card('Applied',applied,'awaiting movement')}
${card('Interviewing',interviewing,'active interviews')}
${card('Target bench',holiday.length+civic.length,'holiday + civic leads')}
</div>
<div class="nav"><a href="#pipeline">Current pipeline</a><a href="#holiday">Holiday targets</a><a href="#civic">Next civic gig</a></div>
${section('pipeline','Current pipeline','Recent applications reconciled across chat, Gmail, and Notion.',pipeline,'pipeline')}
${section('holiday','Holiday targets','Bridge-income leads. Verify the posting is live before applying.',holiday,'target')}
${section('civic','Next Community Rising-style gig','Saved field, outreach, and civic leads. Reverify stale campaign dates.',civic,'target')}
<div class="foot">Private application data such as phone number, email, résumés, and Gmail message bodies are intentionally excluded from this dashboard.</div>
</div></body></html>`;
}
const server=http.createServer((req,res)=>{
  if(req.url==='/health'){res.writeHead(200,{'content-type':'text/plain'});return res.end('ok');}
  if(!authed(req)){
    res.writeHead(401,{'WWW-Authenticate':'Basic realm="Lauren Job Cockpit"','content-type':'text/plain'});
    return res.end('Login required');
  }
  const data=parseData();
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  res.end(page(data));
});
server.listen(PORT,'0.0.0.0',()=>console.log('Job cockpit listening on '+PORT));
