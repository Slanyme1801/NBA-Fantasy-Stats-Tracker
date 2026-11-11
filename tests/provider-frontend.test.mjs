import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../assets/core.mjs';
import {fixture,game,line,player} from './fixtures.mjs';
import {loadCurrent} from '../assets/loader.mjs';
import {checksum} from '../tools/files.mjs';
const history=JSON.parse(await fs.readFile(new URL('../data/history-v1.json',import.meta.url),'utf8'));
function sample(mapped=false){
 const d=fixture();d.schemaVersion=2;d.provider='Highlightly';d.positions.entries=[];
 d.players=[{...player(1),nbaId:mapped?2544:null,providerId:101,playerKey:'highlightly:101',name:mapped?'LeBron James':'Unmapped Alpha'},{...player(2),nbaId:null,providerId:102,playerKey:'highlightly:102',name:'Empty Beta'}];
 d.games=[game(1,'2026-10-25T01:00:00Z')];
 d.lines=[{...line(1,1),nbaId:mapped?2544:null,providerId:101,playerKey:'highlightly:101'},{...line(1,2),nbaId:null,providerId:102,playerKey:'highlightly:102',participation:'missing',stats:null,seconds:null}];
 return d;
}
async function app(data,{ui=false}={}){
 const stored=new Map(),nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',innerHTML:'',textContent:'',hidden:false,checked:false,type:'text',isConnected:true,classList:{toggle(){},remove(){}},focus(){},addEventListener(){},setAttribute(){},appendChild(){},insertAdjacentHTML(_where,html){this.innerHTML+=html;},querySelector:selector=>node(id+selector),querySelectorAll:()=>[],matches:()=>true});return nodes.get(id);};
 const win={__DATASET:structuredClone(history),FantasyCore:core,CurrentLoad:{data,state:'fresh'},addEventListener(){},dispatchEvent(){},scrollTo(){},scrollY:0,AppUpdates:{render(){}}};
 const context=vm.createContext({window:win,document:{getElementById:node,createElement:()=>node('new'),querySelectorAll:()=>[],activeElement:null,body:{prepend(){}}},navigator:{onLine:true},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},URL,URLSearchParams,Event,location:{href:'https://test.local/project/'},setTimeout,clearTimeout});
 for(const file of ['legacy.js','adapter.js',...(ui?['app.js','companion.js']:[])])vm.runInContext(await fs.readFile(new URL('../assets/'+file,import.meta.url),'utf8'),context);
 const api=async path=>{const res=await win.AppApi(path);if(!res.ok)throw Error((await res.json()).detail);return JSON.parse(JSON.stringify(await res.json()));};
 if(ui)await vm.runInContext('loadMeta()',context);
 return {api,context,node,win,run:code=>vm.runInContext(code,context)};
}
test('unmapped played profile, search, rankings use stable provider IDs; empty stays unavailable',async()=>{
 const {api}=await app(sample());
 const found=(await api('/api/search?q=unmapped')).results;assert.equal(found.length,1);assert.equal(found[0].player_id,'highlightly:101');assert.equal(found[0].position,null);assert.match(found[0].identity_label,/NBA identity link pending/);
 const p=await api('/api/player/highlightly%3A101');assert.equal(p.seasons.at(-1).gp,1);assert.equal(p.summary.total_gp,0);assert.equal(p.historical_position,null);assert.equal(p.last_team,'TST');assert.equal(p.team_as_of,'2026-10-25T01:00:00Z');
 const empty=await api('/api/player/highlightly:102');assert.equal(empty.seasons.at(-1).gp,0);assert.equal(empty.seasons.at(-1).fpts_per_game,null);assert.equal(empty.seasons.at(-1).aggregate.missing,1);
 const rows=(await api('/api/leaderboard?season=2026-27')).results;assert.equal(rows.length,1);assert.equal(rows[0].player_id,'highlightly:101');assert.equal((await api('/api/leaderboard?season=2026-27&position=PG')).results.length,0);
});
test('mapping enriches old provider route with historical profile and never duplicates search or meta',async()=>{
 const before=await app(sample()),after=await app(sample(true));
 const p=await after.api('/api/player/highlightly:101');assert.equal(p.player_id,2544);assert.equal(p.player_key,'highlightly:101');assert.ok(p.summary.total_gp>0);assert.equal(p.seasons.at(-1).gp,1);assert.equal(p.seasons.length,6);
 assert.deepEqual(await after.api('/api/player/2544'),p);
 const rows=(await after.api('/api/search?q=lebron')).results;assert.equal(rows.filter(r=>r.player_id===2544).length,1);
 assert.equal((await before.api('/api/meta')).players,(await after.api('/api/meta')).players+1);
 assert.equal((await after.api('/api/player/201939')).player_id,201939);
});
test('provider routes and inline arguments reject injection and round-trip safe IDs',async()=>{
 const {api,win}=await app(sample());assert.equal(win.PlayerIdentity.inlineArg('highlightly:101'),'&quot;highlightly:101&quot;');assert.equal(win.PlayerIdentity.path('highlightly:101'),'highlightly%3A101');
 for(const id of ['highlightly:1);alert(1)//','__proto__','-1','1e3','highlightly:0']){assert.equal(win.PlayerIdentity.canonical(id),null);assert.equal(win.PlayerIdentity.inlineArg(id),'null');await assert.rejects(api('/api/player/'+encodeURIComponent(id)));}
});
test('profile, rankings, comparison and trades render quoted string IDs and missing samples',async()=>{
 const a=await app(sample(),{ui:true});await a.run("openPlayer('highlightly:101')");assert.match(a.node('currentProfile').innerHTML,/Historique des matchs · 1 enregistrements/);assert.match(a.node('view').innerHTML,/Unmapped Alpha/);
 assert.match(a.node('currentProfile').innerHTML,/2 lignes de joueur attendent une liaison à l’historique NBA ; les statistiques disponibles sont incluses/);assert.doesNotMatch(a.node('currentProfile').innerHTML,/await verified player identities/);
 await a.run("openPlayer('highlightly:102')");assert.match(a.node('currentProfile').innerHTML,/Un échantillon vide ne signifie pas une performance nulle/);
 a.run("go('board')");a.node('fSeason').value='2026-27';await a.run('loadBoard()');assert.match(a.node('boardTable').innerHTML,/openPlayer\(&quot;highlightly:101&quot;\)/);
 await a.run("addComparePlayer('highlightly:101');");await a.run("addComparePlayer('highlightly:102');");assert.match(a.node('compareChips').innerHTML,/removeComparePlayer\(&quot;highlightly:101&quot;\)/);assert.match(a.node('compareBody').innerHTML,/Unmapped Alpha/);
 a.run("removeComparePlayer('highlightly:101')");assert.doesNotMatch(a.node('compareChips').innerHTML,/Unmapped Alpha/);
 a.run("go('trades');tradeState.period='season';addTrade('left','highlightly:101');addTrade('right','highlightly:102')");await a.run('updateTrades()');assert.match(a.node('tradePlayers-left').innerHTML,/removeTrade\('left',&quot;highlightly:101&quot;\)/);assert.match(a.node('tradeSummary').innerHTML,/indisponible ne signifie pas zéro/);
});
test('refresh draft canonicalizes aliases after mapping and removes duplicate selections',async()=>{
 const a=await app(sample(true),{ui:true});
 await a.win.FantasySession.restore({page:'trades',compare:['highlightly:101',2544,'highlightly:102'],trade:{left:['highlightly:101',2544],right:[2544,'highlightly:102'],period:'season',replacement:28.5}});
 const saved=a.win.FantasySession.capture();assert.deepEqual(Array.from(saved.compare),[2544,'highlightly:102']);assert.deepEqual(Array.from(saved.trade.left),[2544]);assert.deepEqual(Array.from(saved.trade.right),['highlightly:102']);
 await a.win.FantasySession.restore({page:'player',playerId:'highlightly:101'});assert.equal(a.win.FantasySession.capture().playerId,2544);
});
test('schema2 cache never overwrites schema1 fallback used by older apps',async()=>{
 const maps=new Map(),storage={open:async name=>{if(!maps.has(name))maps.set(name,new Map());return {put:async(k,v)=>maps.get(name).set(String(k),v.clone()),match:async k=>maps.get(name).get(String(k))?.clone()};}};
 const base='https://test.local/project/',key=base+'data/last-verified',old=fixture();await (await storage.open('nbafs-verified-v2')).put(key,new Response(JSON.stringify(old)));
 const d=sample(),bytes=Buffer.from(JSON.stringify(d)),manifest={schemaVersion:1,file:'data/releases/test.json',sha256:checksum(bytes),updatedAt:d.updatedAt};
 const loaded=await loadCurrent({base,cacheStorage:storage,fetcher:async url=>new Response(String(url).endsWith('manifest.json')?JSON.stringify(manifest):bytes)});
 assert.equal(loaded.state,'fresh');assert.equal(loaded.data.schemaVersion,2);assert.equal((await maps.get('nbafs-verified-v2').get(key).clone().json()).schemaVersion,1);
 assert.equal((await loadCurrent({base,cacheStorage:storage,fetcher:async()=>{throw Error('offline');}})).data.schemaVersion,2);
 maps.get('nbafs-verified-v3').clear();assert.equal((await loadCurrent({base,cacheStorage:storage,fetcher:async()=>{throw Error('offline');}})).data.schemaVersion,1);
});
test('similar-player buttons retain provider keys and never invent positional eligibility',async()=>{
 const d=sample();d.lines[1]={...line(1,2),nbaId:null,providerId:102,playerKey:'highlightly:102'};
 const a=await app(d,{ui:true});await a.run("openPlayer('highlightly:101')");
 a.node('similarPeriod').value='season';a.node('similarMode').value='fpts';a.node('similarTolerance').value='5';a.node('similarMin').value='1';a.run('renderSimilar()');
 assert.match(a.node('similarResults').innerHTML,/openPlayer\(&quot;highlightly:102&quot;\)/);
 a.node('similarMode').value='positions';a.run('renderSimilar()');assert.match(a.node('similarResults').innerHTML,/Éligibilité ESPN vérifiée manquante/);
});
