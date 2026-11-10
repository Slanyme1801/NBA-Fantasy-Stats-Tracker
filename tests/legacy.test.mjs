import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';import {execFileSync} from 'node:child_process';import * as core from '../assets/core.mjs';
const history=JSON.parse(await fs.readFile('data/history-v1.json','utf8'));
async function app(data=core.emptySeason()){
  const stored=new Map(),fetch=()=>{throw new Error('native fetch should not be replaced or called for local queries');};
  const context=vm.createContext({window:{__DATASET:structuredClone(history),FantasyCore:core,CurrentLoad:{data},fetch},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},URL,location:{href:'https://test.local/project/'}});
  for(const file of ['assets/legacy.js','assets/adapter.js'])vm.runInContext(await fs.readFile(file,'utf8'),context);
  return {api:async(p,o)=>JSON.parse(JSON.stringify(await (await context.window.AppApi(p,o)).json())),context,fetch};
}
test('all historical data exactly matches original commit, not just counts',()=>{const source=execFileSync('git',['show','181bded7d09c21992bd2068a6fa38298f015a1ab:index.html'],{encoding:'utf8',maxBuffer:1000000});const original=JSON.parse(source.match(/window\.__DATASET=(.*?);<\/script>/s)[1]);assert.deepEqual(history,original);});
test('native fetch remains unchanged and search/profile preserve NBA IDs',async()=>{const {api,context,fetch}=await app();assert.equal(context.window.fetch,fetch);const found=await api('/api/search?q=lebron');assert.equal(found.results[0].player_id,2544);const p=await api('/api/player/2544');assert.equal(p.seasons.length,6);assert.equal(p.seasons[5].played,false);assert.equal(p.seasons[5].note,'Not connected');assert.equal(p.summary.seasons_played,5);});
test('all five historical seasons remain filterable and 2026-27 is empty',async()=>{const {api}=await app();for(const season of history.seasons){const {results}=await api('/api/leaderboard?season='+season);assert.ok(results.length>0);assert.ok(results.every(r=>r.season===season));const r=results[0],p=await api('/api/player/'+r.player_id),s=p.seasons.find(s=>s.season===season);assert.equal(r.total_fpts,s.total_fpts);}assert.deepEqual((await api('/api/leaderboard?season=2026-27')).results,[]);});
test('custom scoring persists locally, updates profiles and rejects non-finite input',async()=>{const {api}=await app(),before=await api('/api/player/2544');await api('/api/scoring',{method:'PUT',body:JSON.stringify({weights:{...core.DEFAULT_SCORING,pts:2}})});const after=await api('/api/player/2544');assert.ok(after.seasons[0].fpts_per_game>before.seasons[0].fpts_per_game);assert.equal((await api('/api/meta')).scoring_name,'Custom scoring');await assert.rejects(api('/api/scoring',{method:'PUT',body:JSON.stringify({weights:{...core.DEFAULT_SCORING,pts:null}})}));});
test('search and profile prefer latest verified imported team and never infer ESPN from historical position',async()=>{
  const {fixture,player,game,line}=await import('./fixtures.mjs');const d=fixture();const nbaId=2544;
  d.players=[player(nbaId)];d.games=[game(1,'2026-11-01T20:00:00Z',{home:{id:10,code:'OLD'}}),game(2,'2026-11-08T20:00:00Z',{home:{id:10,code:'NEW'}}),game(3,'2026-11-09T20:00:00Z',{home:{id:10,code:'UNVERIFIED'},statsState:'missing'})];
  d.lines=[line(1,nbaId),line(2,nbaId),line(3,nbaId)];d.positions.entries=[];
  const {api}=await app(d);const p=await api('/api/player/'+nbaId);const found=(await api('/api/search?q=lebron')).results.find(r=>r.player_id===nbaId);
  for(const result of [p,found]){assert.equal(result.last_team,'NEW');assert.equal(result.position,null);assert.equal(result.team_basis,'latest-verified-import');assert.match(result.identity_label,/Historical position:/);assert.match(result.identity_label,/ESPN not imported/);assert.match(result.identity_label,/Latest imported team: NEW \(2026-11-08 UTC\)/);}
});
test('without current data labels historical metadata; verified ESPN is shown distinctly',async()=>{
  const {api}=await app();const p=await api('/api/player/2544');assert.equal(p.team_basis,'historical');assert.match(p.identity_label,/Historical team:/);assert.equal(p.position,null);
  const d=core.emptySeason();d.positions={season:core.SEASON,source:'ESPN synthetic',importedAt:'2026-11-10T00:00:00Z',entries:[{nbaId:2544,espnId:1,positions:['SF','PF'],source:'ESPN synthetic',observedAt:'2026-11-10T00:00:00Z'}]};const imported=await app(d);const q=await imported.api('/api/player/2544');assert.equal(q.position,'SF/PF');assert.match(q.identity_label,/ESPN 2026-27: SF\/PF/);
});
