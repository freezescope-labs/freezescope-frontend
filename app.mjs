const $=id=>document.getElementById(id);let bundle,result,selected=0,keyIndex=0;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
async function api(path,body){const r=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
function status(t){$('status').textContent=t}async function run(action){try{await action()}catch(e){status(e.message)}}
async function analyze(){result=await api('/compare',bundle);render()}
function render(){
 $('baseline').replaceChildren(el('p',bundle.snapshot.provenance),el('p',`Ledger ${bundle.snapshot.ledger} · protocol ${bundle.snapshot.protocolVersion}`),el('p',`${bundle.snapshot.frozenKeys.length} frozen keys · ${bundle.snapshot.bypassHashes.length} bypass hashes`));
 const keys=$('keys');keys.replaceChildren();const select=el('select');select.setAttribute('aria-label','Candidate freeze key');Object.entries(bundle.labels).forEach(([x,label],i)=>{const o=el('option',label);o.value=String(i);select.append(o)});select.value=String(keyIndex);select.onchange=()=>run(async()=>{keyIndex=Number(select.value);bundle.proposal.freeze=[];$('freeze').checked=false;await analyze()});keys.append(select);
 const raw=Object.keys(bundle.labels)[keyIndex];if(raw)keys.append(el('code',raw));$('freeze').checked=bundle.proposal.freeze.includes(raw);
 $('cards').replaceChildren();result.transactions.forEach((r,i)=>{const b=el('button',undefined,'card'+(i===selected?' selected':''));b.append(el('strong',r.id),el('div'));b.append(el('span',r.before.verdict,'badge '+r.before.verdict),el('span','→'),el('span',r.after.verdict,'badge '+r.after.verdict));b.onclick=()=>{selected=i;render()};$('cards').append(b)});
 const r=result.transactions[selected]?.after,d=$('details');d.replaceChildren();if(!r)return;d.append(el('p',`Transaction content hash${r.isFeeBump?' · outer fee-bump':''}`),el('code',r.contentHash));
 for(const a of r.accesses){const row=el('div',undefined,'evidence');row.append(el('strong',(a.frozen?'FROZEN · ':'')+a.type),el('p',a.reason),el('code',a.id));d.append(row)}
 for(const u of [...r.unknown,...r.applyTime])d.append(el('p',u.reason,'badge INCOMPLETE'));
 status(`${bundle.envelopes.length} transactions reviewed · ${bundle.snapshot.provenance} · local counterfactual only`);
}
$('teaching').onclick=()=>run(async()=>{bundle=await api('/teaching');selected=0;keyIndex=1;await analyze()});
$('freeze').onchange=()=>run(async()=>{if(!bundle)throw Error('Open a case first');bundle.proposal.freeze=$('freeze').checked?[Object.keys(bundle.labels)[keyIndex]]:[];await analyze()});
$('bypass').onclick=()=>run(async()=>{if(!result)throw Error('Open a case first');const h=result.transactions[selected].after.contentHash,a=bundle.proposal.addBypass;bundle.proposal.addBypass=a.includes(h)?a.filter(x=>x!==h):[...a,h];await analyze()});
$('live').onclick=()=>run(async()=>{if(!bundle)bundle=await api('/teaching');bundle.snapshot=await api('/snapshot',{});await analyze()});
$('specimen').onclick=()=>run(async()=>{if(!bundle)bundle=await api('/teaching');const s=await api('/specimen',{});bundle.envelopes=s.envelopes;bundle.labels={};const ev=await fetch('/evidence').then(r=>r.json());bundle.labels=ev.labels;keyIndex=0;selected=0;bundle.proposal={freeze:[],unfreeze:[],addBypass:[],removeBypass:[]};await analyze()});
$('import').onchange=()=>run(async()=>{const f=$('import').files[0];if(f.size>1048576)throw Error('Bundle limit 1 MiB');const b=JSON.parse(await f.text());bundle=b.bundle||b;selected=0;keyIndex=0;await analyze()});
$('export').onclick=()=>run(async()=>{if(!bundle)throw Error('Open a case first');const u=URL.createObjectURL(new Blob([JSON.stringify({bundle,result},null,2)],{type:'application/json'})),a=el('a');a.href=u;a.download='freezescope-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});
