import {areas, accept} from './results.js';
const $=s=>document.querySelector(s), fmt=new Intl.NumberFormat('en-US'), pct=n=>Number.isFinite(n)?n.toFixed(2)+'%':'—', num=v=>v===''||v==null?null:Number(String(v).replace(',','.')), compact=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(n):'—';
let shapes=[],results={},baseline={},previous={},failed=new Set(),selected='sp',mapMode='lead',busy=false,lastLive=null,nextAt=Date.now()+60000;
const normalized=j=>{if(!j)return null;const candidates=(j.carg||[]).flatMap(c=>(c.agr||[]).flatMap(a=>(a.par||[]).flatMap(p=>p.cand||[])));const a=candidates.find(c=>c.n==='13'),b=candidates.find(c=>c.n==='22');if(!a||!b)return null;const av=num(a.vap),bv=num(b.vap);return{a:av,b:bv,share:av+bv>0?av/(av+bv):null,sections:num(j.s?.st),totalSections:num(j.s?.ts),progress:num(j.s?.pstn),remaining:num(j.e?.esnt),electorateCounted:num(j.e?.est),valid:num(j.v?.vv),generation:j.dg+' '+j.hg,source:(j.dt&&j.ht)?j.dt+' '+j.ht:'Not started',idg:j.idg};};
function mix(hex1,hex2,t){const a=hex1.match(/\w\w/g).map(x=>parseInt(x,16)),b=hex2.match(/\w\w/g).map(x=>parseInt(x,16));return'#'+a.map((x,i)=>Math.round(x+(b[i]-x)*Math.max(0,Math.min(1,t))).toString(16).padStart(2,'0')).join('');}
function color(uf){const r=normalized(results[uf.toLowerCase()]);if(!r||r.share==null)return'#e7ebe3';if(mapMode==='progress')return mix('edf0e4','6c8c3a',(r.progress||0)/100);return mix('f0eee7',r.share>=.5?'d26251':'487eae',Math.min(1,Math.abs(r.share-.5)*4+.16));}
function shorttime(raw){return raw?.split(' ')[1]||'—';}
function areaStatus(uf){if(failed.has(uf))return' · refresh failed';if(sourceOld(results[uf]))return' · no recent generation';return'';}
function project(){const swing=num($('#swing').value)/100;let a=0,b=0,fallback=0,missing=0,remaining=0;for(const uf of [...shapes.map(s=>s.uf.toLowerCase()),'zz']){const r=normalized(results[uf]),prior=normalized(baseline[uf]);if(!r){missing++;continue;}const rate=r.electorateCounted>0&&r.valid!=null?r.valid/r.electorateCounted:prior?.electorateCounted>0?prior.valid/prior.electorateCounted:null;const share=r.share??prior?.share;if(rate==null||share==null||r.remaining==null){missing++;continue;}if(r.share==null)fallback++;const rem=Math.max(0,r.remaining)*Math.max(0,Math.min(1,rate));const s=Math.max(0,Math.min(1,share+swing));a+=r.a+rem*s;b+=r.b+rem*(1-s);remaining+=rem;}return{a,b,fallback,missing,remaining};}
function renderForecast(){const p=project();const swing=num($('#swing').value);$('#swing-value').textContent=swing===0?'Neutral · 0.0 pp':(swing>0?'+':'')+swing.toFixed(1)+' pp';if(p.missing||!p.a&&!p.b){$('#forecast-number').textContent='Incomplete';$('#forecast-caption').textContent='Waiting for '+p.missing+' geographic result files';$('#baseline-note').textContent='No national scenario is shown while geographic inputs are missing.';return;}const share=p.a/(p.a+p.b);$('#forecast-number').textContent=(p.a>=p.b?'Lula':'Bolsonaro')+' +'+(Math.abs(share-.5)*200).toFixed(1)+' pp';$('#forecast-caption').textContent='Scenario final national margin · not a win probability';$('#scenario-a').textContent='Lula '+pct(share*100);$('#scenario-b').textContent='Bolsonaro '+pct((1-share)*100);$('#scenario-a-bar').style.width=share*100+'%';$('#scenario-b-bar').style.width=(1-share)*100+'%';$('#baseline-note').textContent=compact(p.remaining)+' estimated valid votes remaining. '+p.fallback+' areas use a first-round finalist split. State-file snapshots may differ from the national count.';}
function renderNational(){const r=normalized(results.br);if(!r)return;$('#a-share').textContent=pct(r.share==null?null:r.share*100);$('#b-share').textContent=pct(r.share==null?null:(1-r.share)*100);$('#a-votes').textContent=fmt.format(r.a)+' votes';$('#b-votes').textContent=fmt.format(r.b)+' votes';$('#a-bar').style.width=(r.share||0)*100+'%';$('#b-bar').style.width=(r.share==null?0:1-r.share)*100+'%';$('#counted').textContent=pct(r.progress);$('#counted-meta').textContent=fmt.format(r.sections)+' of '+fmt.format(r.totalSections)+' sections';$('#counted-bar').style.width=(r.progress||0)+'%';$('#margin').textContent=compact(Math.abs(r.a-r.b));$('#margin-meta').textContent=(r.a===r.b?'Tied':(r.a>r.b?'Lula':'Bolsonaro')+' ahead')+' · counted votes';$('#updated').textContent='TSE generated '+r.generation+areaStatus('br');const prev=normalized(previous.br);if(prev){const da=r.a-prev.a,db=r.b-prev.b;$('#delta-a').textContent=(da>=0?'+':'')+fmt.format(da);$('#delta-b').textContent=(db>=0?'+':'')+fmt.format(db);$('#delta-time').textContent='TSE generation '+shorttime(prev.generation)+' → '+shorttime(r.generation);$('#delta-note').textContent=(da<0||db<0?'Negative changes may reflect corrections or an older cached response. ':'')+'Counted-vote margin changed '+(da-db>=0?'+':'')+fmt.format(da-db)+' toward Lula. Device-local comparison.';}}
function renderMap(){for(const s of shapes){const uf=s.uf.toLowerCase(),p=document.getElementById('state-'+uf);if(p){p.setAttribute('fill',color(uf));p.classList.toggle('selected',selected===uf);p.setAttribute('aria-pressed',String(selected===uf));}}$('#map-lead').classList.toggle('active',mapMode==='lead');$('#map-progress').classList.toggle('active',mapMode==='progress');$('#map-lead').setAttribute('aria-pressed',mapMode==='lead');$('#map-progress').setAttribute('aria-pressed',mapMode==='progress');$('#legend-left').textContent=mapMode==='lead'?'Lula lead':'0% totalized';$('#legend-right').textContent=mapMode==='lead'?'Bolsonaro lead':'100% totalized';$('#legend-gradient').style.background=mapMode==='lead'?'linear-gradient(90deg,#d26251,#f2e0dc,#e9ece4,#dce5ef,#487eae)':'linear-gradient(90deg,#edf0e4,#6c8c3a)';}
function renderDetail(){const s=shapes.find(s=>s.uf.toLowerCase()===selected),r=normalized(results[selected]);if(!s)return;const share=r?.share;$('#state-detail').innerHTML='<div class="detail-top"><span class="detail-title">'+s.name+' <span style="color:var(--muted);font-weight:400">/ '+s.uf+'</span></span><span class="detail-percent">'+pct(r?.progress)+' totalized</span></div><div class="detail-candidates"><span class="a">Lula <strong>'+(share==null?'—':pct(share*100))+'</strong></span><span class="b"><strong>'+(share==null?'—':pct((1-share)*100))+'</strong> Bolsonaro</span></div><div class="split-bar"><div style="background:var(--a);width:'+(share==null?0:share*100)+'%"></div><div style="background:var(--b);width:'+(share==null?0:(1-share)*100)+'%"></div></div><div class="detail-footer"><span>'+(r?fmt.format(r.a+r.b)+' candidate votes':'Waiting for results')+'</span><span>TSE totalization: '+(r?.source||'—')+areaStatus(selected)+'</span></div>';}
function renderTable(){const query=$('#search').value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),sort=$('#sort').value;const list=shapes.filter(s=>(s.name+' '+s.uf).toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(query)).sort((s,t)=>{const a=normalized(results[s.uf.toLowerCase()]),b=normalized(results[t.uf.toLowerCase()]);if(sort==='progress')return(b?.progress??-1)-(a?.progress??-1);if(sort==='remaining')return(b?.remaining??-1)-(a?.remaining??-1);if(sort==='margin')return Math.abs((b?.a||0)-(b?.b||0))-Math.abs((a?.a||0)-(a?.b||0));return s.name.localeCompare(t.name);});$('#state-rows').innerHTML=list.map(s=>{const uf=s.uf.toLowerCase(),r=normalized(results[uf]),prev=normalized(previous[uf]),margin=r?r.a-r.b:null,delta=r&&prev?margin-(prev.a-prev.b):null;return'<tr data-uf="'+uf+'" tabindex="0" aria-label="Show '+s.name+'"><td><span class="uf-badge">'+s.uf+'</span>'+s.name+(failed.has(uf)?' ⚠':'')+'</td><td class="a">'+(r?.share==null?'—':pct(r.share*100))+'</td><td class="b">'+(r?.share==null?'—':pct((1-r.share)*100))+'</td><td class="'+(margin>0?'a':margin<0?'b':'')+'">'+(margin==null?'—':(margin===0?'Tied':(margin>0?'Lula +':'Bolsonaro +')+compact(Math.abs(margin))))+'</td><td><span class="progress-cell"><span class="mini-bar"><i style="width:'+(r?.progress||0)+'%"></i></span>'+pct(r?.progress)+'</span></td><td>'+(r?.remaining==null?'—':fmt.format(r.remaining))+'</td><td class="'+(delta>0?'a':delta<0?'b':'')+'">'+(delta==null?'—':(delta>=0?'+':'')+fmt.format(delta))+'</td></tr>';}).join('')||'<tr><td colspan="7">No matching states</td></tr>';}
function render(){renderNational();renderMap();renderDetail();renderTable();renderForecast();}
function selectState(uf){selected=uf;renderMap();renderDetail();}
function mapGeometry(){const svg=$('#map');const xy=([lon,lat])=>[(lon+74)*14.1,(6-lat)*14.3];for(const s of shapes){const g=s.geometry,polys=g.type==='MultiPolygon'?g.coordinates:[g.coordinates];const path=polys.map(poly=>poly.map(ring=>ring.map((p,i)=>(i?'L':'M')+xy(p).map(n=>n.toFixed(1)).join(',')).join('')+'Z').join('')).join('');const el=document.createElementNS('http://www.w3.org/2000/svg','path');el.setAttribute('d',path);el.setAttribute('id','state-'+s.uf.toLowerCase());el.setAttribute('class','state');el.setAttribute('fill-rule','evenodd');el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',s.name);el.addEventListener('click',()=>selectState(s.uf.toLowerCase()));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectState(s.uf.toLowerCase());}});el.addEventListener('pointermove',e=>{const r=normalized(results[s.uf.toLowerCase()]),tip=$('#tooltip');tip.textContent=s.name+' · '+pct(r?.progress)+' totalized'+(r?.share!=null?' · '+(r.share>=.5?'Lula':'Bolsonaro')+' leads':' · no votes yet');tip.style.display='block';tip.style.left=Math.max(8,Math.min(e.clientX+12,innerWidth-300))+'px';tip.style.top=Math.max(8,e.clientY-48)+'px';});el.addEventListener('pointerleave',()=>$('#tooltip').style.display='none');svg.append(el);}
const centers={AC:[-70,-9.3],AM:[-64,-4],RO:[-63,-11],RR:[-61,2],PA:[-53,-4],AP:[-52,1.5],TO:[-48.2,-10],MA:[-45,-5.2],PI:[-42.8,-7.7],CE:[-39.5,-5.2],RN:[-36.5,-5.6],PB:[-36.5,-7.2],PE:[-38,-8.6],AL:[-36.5,-9.7],SE:[-37.3,-11],BA:[-42,-12.5],MT:[-56,-13],MS:[-55,-20],GO:[-49.5,-16],DF:[-47.6,-15.3],MG:[-44.5,-18],ES:[-40.3,-19.8],RJ:[-42.5,-22.3],SP:[-48.5,-22.2],PR:[-51.5,-24.5],SC:[-50,-27],RS:[-53,-30]};for(const[uf,coord]of Object.entries(centers)){const el=document.createElementNS('http://www.w3.org/2000/svg','text');const[x,y]=xy(coord);el.setAttribute('x',x);el.setAttribute('y',y);el.setAttribute('text-anchor','middle');el.setAttribute('class','map-label');el.textContent=uf;svg.append(el);}}

let metadata={receivedAt:{},changedAt:{}}, collectedAt=null, sourceMode='snapshot';
const refreshInterval=30000;
const storageKey='apuracao-pages-6258';
function sourceOld(j){
  if(j?.tf==='s')return false;
  const uf=Object.keys(results).find(k=>results[k]===j);
  const changed=metadata.changedAt?.[uf];
  return !changed || Date.now()-Date.parse(changed)>600000;
}
function applySnapshot(data){
  if(!data?.results)throw Error('Missing published results');
  previous={...results};
  const errors=new Set(Object.keys(data.errors||{}));
  for(const uf of areas){
    try{
      const incoming=accept(results[uf],data.results[uf],uf);
      results[uf]=incoming;
      for(const key of ['receivedAt','changedAt']){
        metadata[key]??={};
        if(data[key]?.[uf]&&(!metadata[key][uf]||data[key][uf]>metadata[key][uf]))metadata[key][uf]=data[key][uf];
      }
    }catch{errors.add(uf);}
  }
  failed=errors;
  if(data.checkedAt&&(!collectedAt||data.checkedAt>collectedAt))collectedAt=data.checkedAt;
}
function freshness(){
  const age=collectedAt?(Date.now()-Date.parse(collectedAt))/60000:Infinity;
  const quiet=areas.filter(uf=>sourceOld(results[uf])).length;
  const warning=sourceMode!=='live'||failed.size>0||age>10||quiet>0;
  const label=sourceMode==='offline'?'Offline · saved data':sourceMode==='live'?(failed.size?'Partial live update':age>10?'Live check delayed':quiet?'Live · source unchanged':'Live TSE · 30s checks'):!collectedAt?'Bundled snapshot':age>10?'Fallback snapshot delayed':'Fallback snapshot';
  $('#live-status').textContent=label;
  $('#live-status').style.color=warning?'#9b6a19':'#526b36';
  const checked=collectedAt?new Date(collectedAt).toLocaleString()+' (your time)':'not collected yet';
  $('#notice').firstElementChild.textContent=(sourceMode==='live'?'Last TSE check: ': 'Saved data collected: ')+checked+'. '+(sourceMode==='live'?'Checks TSE directly every 30 seconds while visible. TSE may publish less frequently.':'Direct TSE access is unavailable or has not completed. Showing the saved snapshot; retrying every 30 seconds.')+(failed.size?' '+failed.size+' areas retained their previous data.':'')+(quiet?' '+quiet+' areas have no recent observed generation or are bundled data.':'');
}
async function fetchLiveSnapshot(){
  const queue=[...areas], next={...results}, errors={}, receivedAt={...metadata.receivedAt}, changedAt={...metadata.changedAt};
  const signal=AbortSignal.timeout(12000);
  let successful=0;
  async function runner(){
    while(queue.length){
      const uf=queue.shift();
      try{
        const response=await fetch('https://resultados.tse.jus.br/oficial/ele2026/6258/dados/'+uf+'/'+uf+'-c0001-e006258-u.json',{mode:'cors',credentials:'omit',cache:'no-store',signal});
        if(!response.ok)throw Error('TSE HTTP '+response.status);
        const incoming=accept(results[uf],await response.json(),uf);
        const now=new Date().toISOString();
        if(!results[uf]||incoming.idg!==results[uf].idg||incoming.dg!==results[uf].dg||incoming.hg!==results[uf].hg)changedAt[uf]=now;
        changedAt[uf]??=now;
        next[uf]=incoming;receivedAt[uf]=now;successful++;
      }catch(error){errors[uf]=error.message;}
    }
  }
  await Promise.all(Array.from({length:4},runner));
  if(!successful)throw Error('Direct TSE access unavailable');
  return{results:next,checkedAt:new Date().toISOString(),receivedAt,changedAt,errors};
}
async function refresh(){
  if(busy)return;
  busy=true;nextAt=Date.now()+refreshInterval;$('#refresh').disabled=true;$('#refresh').textContent='↻ Fetching TSE';
  try{
    let snapshot;
    try{snapshot=await fetchLiveSnapshot();sourceMode='live';}
    catch{
      const response=await fetch('./data/snapshot.json?check='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error('Snapshot unavailable');
      snapshot=await response.json();sourceMode='snapshot';
    }
    applySnapshot(snapshot);
    try{localStorage.setItem(storageKey,JSON.stringify({results,checkedAt:collectedAt,...metadata,errors:Object.fromEntries([...failed].map(uf=>[uf,'Retained data']))}));}catch{}
    render();freshness();
  }catch{
    sourceMode='offline';freshness();
  }finally{
    $('#refresh').disabled=false;$('#refresh').textContent='↻ Refresh now';
    busy=false;
  }
}
async function init(){
  try{
    const read=async name=>{const response=await fetch('./data/'+name,{cache:'no-store'});if(!response.ok)throw Error('Missing '+name);return response.json();};
    const data=await Promise.all([read('shapes.json'),read('baseline.json'),read('snapshot.json')]);
    shapes=data[0];baseline=data[1];results={};metadata={receivedAt:{},changedAt:{}};
    try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved)applySnapshot(saved);}catch{}
    applySnapshot(data[2]);mapGeometry();render();freshness();
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&shapes.length&&!busy)refresh();});
    refresh();
    setInterval(()=>{if(!document.hidden&&!busy&&Date.now()>=nextAt)refresh();if(!busy)freshness();$('#next-update').textContent=document.hidden?'Paused while tab hidden':busy?'Fetching official TSE results…':'Next TSE check in '+Math.max(0,Math.ceil((nextAt-Date.now())/1000))+'s';},1000);
  }catch{
    $('#live-status').textContent='Unable to load';
    $('#notice').firstElementChild.textContent='The dashboard could not load. Use Refresh to try again.';
  }
}
$('#refresh').addEventListener('click',()=>shapes.length?refresh():init());$('#map-lead').addEventListener('click',()=>{mapMode='lead';renderMap();});$('#map-progress').addEventListener('click',()=>{mapMode='progress';renderMap();});$('#swing').addEventListener('input',renderForecast);$('#search').addEventListener('input',renderTable);$('#sort').addEventListener('change',renderTable);$('#state-rows').addEventListener('click',e=>{const row=e.target.closest('[data-uf]');if(row){selectState(row.dataset.uf);$('#state-detail').scrollIntoView({behavior:'smooth',block:'center'});}});$('#state-rows').addEventListener('keydown',e=>{if(e.key==='Enter'){const row=e.target.closest('[data-uf]');if(row)selectState(row.dataset.uf);}});$('#method-open').addEventListener('click',()=>$('#method').showModal());$('#method-close').addEventListener('click',()=>$('#method').close());init();
