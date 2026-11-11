// Independent synthetic safety tests. No provider/network calls or production mutations.
import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregate,validateSeason,validateIdentityMap,validateProviderRegistry,migrateHighlightlySeason,findPlayer} from '../assets/core.mjs';
import {providerPlayers,normalizeBoxScore,statisticNames} from '../tools/highlightly.mjs';
import {mergeHighlightly} from '../tools/highlightly-private.mjs';
import {fixture,stats,now} from './fixtures.mjs';
const key=id=>`highlightly:${id}`;
function legacy(){const s=fixture();s.provider='Highlightly';s.publicationPolicy='private-only-rights-unverified';s.scope={startDate:'2026-11-14',endDate:'2026-11-14',timeZone:'America/New_York',completeSeason:false};for(const g of s.games){g.provider='Highlightly';g.finalScores=[60,0];}for(const l of s.lines)l.provider='Highlightly';return s;}
function onlyProvider(){const s=migrateHighlightlySeason(legacy());s.positions.entries=[];for(const p of s.players)p.nbaId=null;for(const l of s.lines)l.nbaId=null;return validateSeason(s);}
function rawBox(){return [10,20].map((id,i)=>({team:{id},boxScores:[{player:{id:101+i,name:'Same Name'},statistics:[...Object.entries(statisticNames).map(([k,name])=>({name,value:stats()[k]})),{name:'Total Minutes Played',value:30},{name:'Total Offensive Rebounds',value:2},{name:'Total Defensive Rebounds',value:4}]}]}));}
const rawGame=()=>({...legacy().games[0],finalScores:[20,20]});
test('provider-first safety: nullable NBA IDs preserve distinct namesakes and independently counted games',()=>{
 const s=onlyProvider();s.players.forEach(p=>p.name='Same Name');assert.doesNotThrow(()=>validateSeason(s));
 assert.equal(findPlayer(s,key(101)).providerId,101);assert.equal(aggregate(s,key(101),{asOf:now}).gp,1);assert.equal(aggregate(s,key(102),{asOf:now}).gp,1);
 assert.equal(aggregate(s,key(999),{asOf:now}).gp,0);
 const b=rawBox(),known=[{...legacy().players[0],name:'Same Name'}];const players=providerPlayers(b,rawGame(),known,now);
 assert.equal(players[0].nbaId,1);assert.equal(players[1].nbaId,null);assert.equal(players[1].playerKey,key(102));
});
test('provider-first safety: empty provider statistics remain missing with GP zero',()=>{
 const b=rawBox();b[0].boxScores.push({player:{id:999,name:'Inactive Name'},statistics:[]});
 const ps=providerPlayers(b,rawGame(),[],now),ls=normalizeBoxScore(b,rawGame(),ps,now);
 const s=onlyProvider();s.players=ps;s.lines=ls;s.games=[rawGame()];validateSeason(s);
 assert.equal(ls.find(l=>l.providerId===999).participation,'missing');assert.equal(ls.find(l=>l.providerId===999).stats,null);
 const a=aggregate(s,key(999),{asOf:now});assert.equal(a.gp,0);assert.equal(a.dnp,0);assert.equal(a.missing,1);assert.equal(a.totalFpts,null);
});
test('provider-first safety: strict mapping remains separate from nullable registry',()=>{
 const s=onlyProvider();assert.doesNotThrow(()=>validateProviderRegistry(s));assert.throws(()=>validateIdentityMap({season:s.season,players:s.players}));
 for(const mutate of [p=>p.playerKey='nba:101',p=>p.playerKey='highlightly:0101',p=>p.providerId=0,p=>p.nbaId='1',p=>p.nbaId=0,p=>p.source='']){const bad=structuredClone(s);mutate(bad.players[0]);assert.throws(()=>validateSeason(bad));}
});
test('provider-first safety: duplicate provider/NBA IDs and duplicate game rows fail closed',()=>{
 for(const mutate of [s=>s.players.push({...s.players[0]}),s=>{s.players[0].nbaId=1;s.players[1].nbaId=1;},s=>s.lines.push({...s.lines[0]}),s=>s.lines[0].playerKey=key(102),s=>s.lines[0].nbaId=999]){const s=onlyProvider();mutate(s);assert.throws(()=>validateSeason(s));}
});
test('provider-first safety: migration is pure, idempotent and preserves counters, ESPN history and provenance',()=>{
 const before=legacy(),copy=structuredClone(before),after=migrateHighlightlySeason(before);
 assert.deepEqual(before,copy);assert.equal(after.schemaVersion,2);assert.deepEqual(after.positions,before.positions);assert.deepEqual(after.games,before.games);
 for(let i=0;i<before.lines.length;i++){assert.deepEqual(after.lines[i],{...before.lines[i],playerKey:key(before.lines[i].providerId)});assert.equal(after.players[i].nbaId,before.players[i].nbaId);}
 assert.deepEqual(migrateHighlightlySeason(after),after);assert.deepEqual(aggregate(after,key(101),{asOf:now}),aggregate(before,1,{asOf:now}));
});
test('provider-first safety: later verified mapping enriches retained lines without refetch or name joining',()=>{
 const before=onlyProvider(),copy=structuredClone(before),incoming=migrateHighlightlySeason(legacy());incoming.games=[];incoming.lines=[];
 const merged=mergeHighlightly(before,incoming);assert.deepEqual(before,copy);assert.equal(merged.lines.length,3);assert.equal(merged.lines[0].nbaId,1);assert.equal(merged.lines[0].playerKey,key(101));
 assert.deepEqual(merged.lines[0].stats,before.lines[0].stats);assert.deepEqual(aggregate(merged,key(101),{asOf:now}),aggregate(merged,1,{asOf:now}));
 const collision=structuredClone(incoming);collision.players[0].nbaId=2;collision.players[1].nbaId=1;assert.throws(()=>mergeHighlightly(merged,collision));
});
test('provider-first safety: absent mappings cannot erase a verified identity or retained ESPN positions',()=>{
 const before=migrateHighlightlySeason(legacy()),incoming=onlyProvider();incoming.games=[];incoming.lines=[];
 const merged=mergeHighlightly(before,incoming);assert.equal(merged.players[0].nbaId,1);assert.deepEqual(merged.positions,before.positions);assert.equal(merged.lines[0].nbaId,1);
});
test('provider-first safety: failed correction preserves complete old box and matching final score',()=>{
 const before=onlyProvider(),incoming=structuredClone(before);incoming.lines=[];incoming.games[0].statsState='missing';incoming.games[0].finalScores=[99,98];incoming.games[0].refreshIssue={code:'source-data-error',attemptedAt:now,preservedPreviousBoxScore:false};
 const merged=mergeHighlightly(before,incoming);assert.deepEqual(merged.lines,before.lines);assert.deepEqual(merged.games[0].finalScores,before.games[0].finalScores);assert.equal(merged.games[0].refreshIssue.preservedPreviousBoxScore,true);
});
test('provider-first safety: valid correction replaces whole game, including deleted provider rows',()=>{
 const before=onlyProvider(),incoming=structuredClone(before);incoming.lines=incoming.lines.slice(0,1);incoming.games[0].finalScores=[20,0];
 const merged=mergeHighlightly(before,incoming);assert.equal(merged.lines.length,1);assert.equal(aggregate(merged,key(102),{asOf:now}).gp,0);assert.deepEqual(merged.games[0].finalScores,[20,0]);
});
test('provider-first safety: malicious observed labels never become identity or executable aliases',()=>{
 const b=rawBox();b[0].boxScores[0].player.name='<img src=x onerror=alert(1)>';
 const ps=providerPlayers(b,rawGame(),[],now);assert.equal(ps[0].nbaId,null);assert.equal(ps[0].playerKey,key(101));assert.ok(!ps[0].name.includes('<'));
 const s=onlyProvider();s.players[0].aliases=['<script>alert(1)</script>'];assert.throws(()=>validateSeason(s));
});

test('provider-first safety: adapter escapes provider aliases and preserves canonical historical NBA access',async()=>{
 const vm=await import('node:vm'),fs=await import('node:fs/promises'),core=await import('../assets/core.mjs');
 const source=await fs.readFile(new URL('../assets/adapter.js',import.meta.url),'utf8');
 const data=onlyProvider(),window={FantasyCore:core,CurrentLoad:{data},__DATASET:{players:[]},LegacyApi:async()=>({ok:true,json:async()=>({})})};
 vm.runInNewContext(source,{window,URL});const identity=window.PlayerIdentity;
 assert.equal(identity.canonical('highlightly:101'),'highlightly:101');assert.equal(identity.inlineArg('highlightly:101'),'&quot;highlightly:101&quot;');
 assert.equal(identity.path('highlightly:101'),'highlightly%3A101');
 assert.equal(identity.html('<img src="x" onerror="x">'), '&lt;img src=&quot;x&quot; onerror=&quot;x&quot;&gt;');
 for(const bad of ['highlightly:101\');alert(1)//','highlightly:01','highlightly:-1','highlightly:0','highlightly:9007199254740992','nba:1'])assert.equal(identity.canonical(bad),null);
 data.players[0].nbaId=1;assert.equal(identity.canonical('highlightly:101'),1);assert.equal(identity.inlineArg('highlightly:101'),'1');assert.equal(identity.canonical(1),1);
});
