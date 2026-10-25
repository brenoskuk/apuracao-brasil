import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {areas,accept,validate} from '../results.js';

const data = JSON.parse(await fs.readFile(new URL('../data/snapshot.json',import.meta.url),'utf8'));
const sample = () => structuredClone(data.results.sp);

test('all 29 bundled geographic files match election and numeric invariants',()=>{
  for(const area of areas)assert.equal(validate(data.results[area],area),data.results[area]);
});
test('older snapshots are rejected; newer official corrections may reduce counts',()=>{
  const previous=sample(),older=sample(),newer=sample();
  previous.hg='20:30:00';older.hg='19:00:00';newer.hg='20:31:00';
  assert.throws(()=>accept(previous,older,'sp'),/Older/);
  // Original source counts in newer are lower than these synthetic previous counts.
  const candidate=previous.carg[0].agr.flatMap(a=>a.par.flatMap(p=>p.cand)).find(c=>c.n==='13');
  candidate.vap=String(+candidate.vap+1);previous.v.vv=String(+previous.v.vv+1);
  assert.equal(accept(previous,newer,'sp'),newer);
});
test('wrong geography, simulation, malformed numbers and vote status are rejected',()=>{
  assert.throws(()=>validate(sample(),'rj'));
  const simulation=sample();simulation.f='s';assert.throws(()=>validate(simulation,'sp'));
  const bad=sample();bad.v.vv='NaN';assert.throws(()=>validate(bad,'sp'));
  const inconsistent=sample();inconsistent.e.esnt='1';assert.throws(()=>validate(inconsistent,'sp'));
  const changed=sample();changed.carg[0].agr.flatMap(a=>a.par.flatMap(p=>p.cand))[0].dvt='Anulado';
  assert.throws(()=>validate(changed,'sp'));
});
test('client math preserves counted votes, applies swing only to remaining votes, and handles fallback',async()=>{
  const src=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
  const slider={value:'0'};
  const context=vm.createContext({areas,accept,Intl,Date,Math,Set,Number,String,JSON,Promise,AbortSignal,document:{querySelector(){return slider;}}});
  const code=src.replace(/^import[^\n]*\n/,'').split("$('#refresh').addEventListener")[0];
  vm.runInContext(code,context);
  const run=s=>vm.runInContext(s,context);
  context.example=sample();
  run(`shapes=[];results={zz:example};baseline={};`);
  const initial=run('project()');
  const counted=run('normalized(example)');
  assert.equal(initial.a,counted.a+initial.remaining*counted.share);
  assert.equal(initial.b,counted.b+initial.remaining*(1-counted.share));
  slider.value='10';const shifted=run('project()');
  assert.ok(Math.abs((shifted.a-initial.a)-initial.remaining*.1)<1e-7);
  assert.ok(Math.abs((shifted.b-initial.b)+initial.remaining*.1)<1e-7);
  context.complete=sample();context.complete.e.esnt='0';
  run('results={zz:complete}');const final=run('project()');
  assert.equal(final.a,counted.a);assert.equal(final.b,counted.b);
  context.empty=sample();
  for(const c of context.empty.carg[0].agr.flatMap(a=>a.par.flatMap(p=>p.cand)))c.vap='0';
  context.empty.e.est='0';context.empty.v.vv='0';
  run('results={zz:empty};baseline={zz:example}');
  assert.equal(run('project().fallback'),1);
  run('baseline={}');assert.equal(run('project().missing'),1);
});
test('client retains newer saved data when published snapshot regresses',async()=>{
  const src=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
  const context=vm.createContext({areas,accept,Intl,Date,Math,Set,Number,String,JSON,Promise,AbortSignal});
  vm.runInContext(src.replace(/^import[^\n]*\n/,'').split("$('#refresh').addEventListener")[0],context);
  context.first=structuredClone(data);context.next=structuredClone(data);
  context.first.results.sp.hg='20:30:00';context.next.results.sp.hg='19:00:00';
  vm.runInContext('applySnapshot(first);applySnapshot(next)',context);
  assert.equal(vm.runInContext('results.sp.hg',context),'20:30:00');
  assert.equal(vm.runInContext('failed.has("sp")',context),true);
});

async function liveContext(fetch){
  const src=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
  const elements=new Map();
  const document={querySelector(selector){if(!elements.has(selector))elements.set(selector,{style:{},firstElementChild:{}});return elements.get(selector);}};
  const context=vm.createContext({areas:['br','sp'],accept,Intl,Date,Math,Set,Number,String,JSON,Promise,AbortSignal,document,fetch,localStorage:{setItem(){}}});
  vm.runInContext(src.replace(/^import[^\n]*\n/,'').split("$('#refresh').addEventListener")[0],context);
  vm.runInContext('render=()=>{}',context);
  return context;
}
test('live refresh fetches TSE directly and changes the source mode without a GitHub request',async()=>{
  const urls=[];
  const context=await liveContext(async(url,options)=>{
    urls.push(url);
    assert.equal(options.mode,'cors');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');
    const uf=url.includes('/dados/br/')?'br':'sp';
    return{ok:true,json:async()=>structuredClone(data.results[uf])};
  });
  await vm.runInContext('refresh()',context);
  assert.equal(urls.length,2);assert.ok(urls.every(url=>url.startsWith('https://resultados.tse.jus.br/')));
  assert.equal(vm.runInContext('sourceMode',context),'live');
  assert.equal(vm.runInContext('failed.size',context),0);
  assert.equal(vm.runInContext('refreshInterval',context),30000);
});
test('failed direct access falls back to the saved snapshot and identifies the fallback',async()=>{
  const urls=[];
  const context=await liveContext(async(url)=>{
    urls.push(url);
    if(url.startsWith('https://'))throw Error('Network blocked');
    return{ok:true,json:async()=>structuredClone(data)};
  });
  await vm.runInContext('refresh()',context);
  assert.equal(vm.runInContext('sourceMode',context),'snapshot');
  assert.equal(vm.runInContext('results.br.hg',context),data.results.br.hg);
  assert.ok(urls.some(url=>url.startsWith('./data/snapshot.json')));
});
test('partial live failures retain previous geographic data and remain marked',async()=>{
  const context=await liveContext(async(url)=>{
    if(url.includes('/dados/sp/'))throw Error('Temporary timeout');
    return{ok:true,json:async()=>structuredClone(data.results.br)};
  });
  context.seed=structuredClone(data);
  vm.runInContext('applySnapshot(seed)',context);
  await vm.runInContext('refresh()',context);
  assert.equal(vm.runInContext('sourceMode',context),'live');
  assert.equal(vm.runInContext('failed.has("sp")',context),true);
  assert.equal(vm.runInContext('results.sp.hg',context),data.results.sp.hg);
});
