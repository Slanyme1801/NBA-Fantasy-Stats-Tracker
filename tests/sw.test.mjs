import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs/promises';
import {renderWorker} from '../tools/pages.mjs';
const template=await fs.readFile('sw.js','utf8'),scope='https://test.local/project/',prefix='nbafs-shell-v3:'+scope+':';
function setup({legacy=false,version='release-a',fail='',maps=new Map()}={}){
  const events={},requests=[],deleted=[];let offline=false,skipped=0,claimed=0;
  if(legacy)maps.set('nbafs-shell-v1',new Map([[scope,new Response('old')],['https://test.local/other/',new Response('other app')]]));
  const caches={keys:async()=>[...maps.keys()],delete:async k=>{deleted.push(k);return maps.delete(k);},open:async key=>{
    if(!maps.has(key))maps.set(key,new Map());const map=maps.get(key),url=req=>typeof req==='string'?req:req.url;
    return {put:async(req,res)=>map.set(url(req),res.clone()),match:async req=>map.get(url(req))?.clone(),keys:async()=>[...map.keys()].map(url=>({url})),delete:async req=>map.delete(url(req))};
  }};
  const self={registration:{scope},skipWaiting:async()=>{skipped++;},clients:{claim:async()=>{claimed++;},matchAll:()=>{throw new Error('Must not forcibly navigate legacy clients');}},addEventListener:(name,fn)=>events[name]=fn};
  vm.runInNewContext(renderWorker(template,version),{self,caches,URL,Response,AbortSignal,fetch:async(url,opts)=>{requests.push({url:String(url),opts});if(offline||fail&&String(url).includes(fail))throw new Error('offline');return new Response(version+' '+new URL(url).pathname);}});
  return {maps,requests,deleted,get skipped(){return skipped;},get claimed(){return claimed;},offline:()=>{offline=true;},
    run:async(name,detail={})=>{let promise;events[name]({...detail,waitUntil:p=>promise=p});await promise;},
    fetch:async(url)=>{let response;events.fetch({request:{method:'GET',url},respondWith:p=>response=p});return response?await response:null;}};
}
test('Pages injects a different application version for every commit',()=>{const a=renderWorker(template,'abc123'),b=renderWorker(template,'def456');assert.notEqual(a,b);assert.doesNotMatch(a,/---|\{\{ site/);assert.throws(()=>renderWorker(template,"bad'code"));});
test('legacy migration activates without forcing open tabs and only removes this scope',async()=>{const s=setup({legacy:true});s.maps.set('nbafs-verified-v2',new Map());await s.run('install');assert.equal(s.skipped,1);await s.run('activate');assert.equal(s.claimed,1);assert.equal(s.maps.get('nbafs-shell-v1').has(scope),false);assert.equal(s.maps.get('nbafs-shell-v1').size,1);assert.ok(s.maps.has('nbafs-verified-v2'));});
test('new generations wait for a matching acknowledgement from their scope',async()=>{const s=setup();await s.run('install');assert.equal(s.skipped,0);for(const [version,url] of [['wrong',scope],['release-a','https://test.local/other/']])await s.run('message',{data:{type:'ACTIVATE_APP_UPDATE',version},source:{url}});assert.equal(s.skipped,0);await s.run('message',{data:{type:'ACTIVATE_APP_UPDATE',version:'release-a'},source:{url:scope}});assert.equal(s.skipped,1);});
test('failed installation retains the last complete release and removes the partial cache',async()=>{const maps=new Map([[prefix+'previous',new Map()]]),s=setup({maps,fail:'assets/boot.mjs'});await assert.rejects(s.run('install'));assert.ok(maps.has(prefix+'previous'));assert.ok(!maps.has(prefix+'release-a'));assert.equal(s.skipped,0);});
test('a complete generation serves the Pages subpath and modules offline',async()=>{const s=setup();await s.run('install');assert.ok(s.requests.every(r=>r.url.includes('app-version=release-a')&&r.opts.cache==='reload'));s.offline();assert.match(await (await s.fetch(scope)).text(),/^release-a/);assert.match(await (await s.fetch(scope+'assets/updates.mjs')).text(),/^release-a/);});
test('activation retains the current and previous complete generations, and unrelated caches',async()=>{const maps=new Map([[prefix+'old',new Map()],[prefix+'previous',new Map()],['other-app',new Map()]]),s=setup({maps});await s.run('install');await s.run('activate');assert.deepEqual([...maps.keys()],[prefix+'previous','other-app',prefix+'release-a']);});
test('data manifests, release responses, private paths and external origins bypass the shell cache',async()=>{const s=setup();for(const url of [scope+'data/manifest.json',scope+'data/releases/release.json',scope+'.local/report.json','https://other.local/project/'])assert.equal(await s.fetch(url),null);});
