// SYNTHETIC ONLY: no network, real identities or provider records.
import test from 'node:test';
import assert from 'node:assert/strict';
import {runSeasonBackfill,seedSeasonInventory} from '../tools/highlightly-backfill.mjs';
import {verifiedSchedule,easternMatchTime} from '../tools/highlightly-schedule.mjs';
import {PROVIDER,statisticNames,makeHighlightlyClient} from '../tools/highlightly.mjs';
import {runHighlightlyBatch} from '../tools/highlightly-private.mjs';
import {publicHighlightlySnapshot} from '../tools/highlightly-public.mjs';
import {stats,player} from './fixtures.mjs';
const time='2026-11-20T20:00:00.000Z',day='2026-11-01';
const proof={source:'SYNTHETIC verified schedule',verifiedAt:time};
const identities=()=>({provider:PROVIDER,season:'2026-27',players:[player(1),player(2)]});
const match=(id=1,date=day)=>({id,league:'NBA',season:2027,date:`${date}T20:00:00Z`,state:{description:'Finished',score:{homeTeam:[5,5,5,5],awayTeam:[5,5,5,5]}},homeTeam:{id:10,abbreviation:'SYN'},awayTeam:{id:20,abbreviation:'TST'}});
const page=(data=[match()],offset=0,total=data.length)=>({data,plan:{tier:'BASIC',message:'All data available with current plan.'},pagination:{totalCount:total,offset,limit:100}});
const box=()=>[10,20].map((id,i)=>({team:{id},boxScores:[{player:{id:101+i},statistics:[...Object.entries(statisticNames).map(([k,name])=>({name,value:stats()[k]})),{name:'Total Minutes Played',value:30},{name:'Total Offensive Rebounds',value:2},{name:'Total Defensive Rebounds',value:4}]}]}));
const memoryCache=()=>{const entries=new Map();return {entries,get:async key=>structuredClone(entries.get(key)||null),put:async(key,value)=>entries.set(key,structuredClone(value))};};
const schedule=()=>({season:'2026-27',seasonStart:{date:'2026-10-20',...proof},games:[{dateET:day,timeET:'15:00',home:'SYN',away:'TST',type:'regular',...proof}]});
const options=(extra={})=>({client:async endpoint=>endpoint==='/matches'?page():box(),cache:memoryCache(),identities:identities(),schedule:schedule(),now:()=>Date.parse(time),maxCorrectionGames:0,...extra});
const quota=()=>Object.assign(Error('SYNTHETIC exhausted quota'),{code:'HIGHLIGHTLY_BUDGET'});
const seeded=(games=[match()])=>seedSeasonInventory([page(games)],{now:time});
async function prior22(){return runHighlightlyBatch({client:async endpoint=>endpoint==='/matches'?page(Array.from({length:22},(_,i)=>match(i+1))):box(),cache:memoryCache(),identities:identities(),types:{provider:PROVIDER,season:'2026-27',games:Array.from({length:22},(_,i)=>({id:i+1,type:'regular',...proof}))},startDate:day,endDate:day,now:()=>Date.parse(time)});}

test('22 verified prior games survive an empty inventory without losing lines or players',async()=>{
 const previous=await prior22(),before=structuredClone(previous);
 const {snapshot:s}=await runSeasonBackfill(options({previous,client:async()=>page([])}));
 assert.deepEqual(s.games,previous.games);assert.deepEqual(s.lines,previous.lines);assert.deepEqual(s.players,previous.players);assert.deepEqual(previous,before);
 assert.equal(s.backfillProgress.inventoryComplete,true);assert.equal(s.backfillProgress.verifiedRegularBoxScores,22);assert.equal(s.scope.completeSeason,false);
});
test('quota saves a partial inventory and all 22 old games; resume fetches only next page and new box',async()=>{
 const previous=await prior22(),cache=memoryCache();let state,progress;const calls=[];
 const first=await runSeasonBackfill(options({previous,cache,saveState:async s=>{state=structuredClone(s);},saveProgress:async s=>{progress=structuredClone(s);},client:async(endpoint,params)=>{calls.push([endpoint,params.offset]);if(params.offset===0)return page([match(23)],0,2);throw quota();}}));
 assert.equal(first.snapshot.backfillProgress.inventoryComplete,false);assert.equal(first.snapshot.backfillProgress.budgetExhausted,true);assert.equal(first.snapshot.lines.length,44);assert.equal(state.offset,1);
 const resumed=[];const second=await runSeasonBackfill(options({previous:progress,cache,inventoryState:state,client:async(endpoint,params)=>{resumed.push([endpoint,params.offset]);return endpoint==='/matches'?page([match(24)],1,2):box();}}));
 assert.deepEqual(resumed,[['/matches',1],['/box-score/23',undefined],['/box-score/24',undefined]]);assert.equal(second.snapshot.games.length,24);assert.equal(second.snapshot.lines.length,48);assert.equal(second.snapshot.backfillProgress.inventoryComplete,true);
});
test('quota during boxes preserves successful whole game and resumes without redundant downloads',async()=>{
 const cache=memoryCache(),inventoryState=seeded([match(1),match(2)]);let progress;
 const first=await runSeasonBackfill(options({cache,inventoryState,saveProgress:async s=>{progress=structuredClone(s);},client:async endpoint=>{if(endpoint==='/box-score/2')throw quota();return box();}}));
 assert.equal(first.snapshot.lines.length,2);assert.equal(first.snapshot.games.find(g=>g.id===2).refreshIssue.code,'request-budget');
 const calls=[];const second=await runSeasonBackfill(options({cache,inventoryState,previous:progress,client:async e=>{calls.push(e);return box();}}));
 assert.deepEqual(calls,['/box-score/2']);assert.equal(second.snapshot.lines.length,4);
 await runSeasonBackfill(options({cache,inventoryState,previous:second.snapshot,client:async()=>{throw Error('No repeated call');}}));
});
test('crash after paid box cache write replays cache without redownloading',async()=>{
 const cache=memoryCache(),inventoryState=seeded();let progress;
 await assert.rejects(runSeasonBackfill(options({cache,inventoryState,saveProgress:async s=>{if(s.lines.length)throw Error('SYNTHETIC process cut');progress=structuredClone(s);}})),/process cut/);
 const result=await runSeasonBackfill(options({cache,inventoryState,previous:progress,client:async()=>{throw Error('Must reuse cache');}}));assert.equal(result.snapshot.lines.length,2);
});
test('crash between inventory cache and state persistence reuses page',async()=>{
 const cache=memoryCache();await assert.rejects(runSeasonBackfill(options({cache,saveState:async()=>{throw Error('SYNTHETIC state write cut');}})),/state write cut/);
 const calls=[];const result=await runSeasonBackfill(options({cache,client:async e=>{calls.push(e);return box();}}));assert.deepEqual(calls,['/box-score/1']);assert.equal(result.inventoryState.complete,true);
});
test('inventory includes only finished games; unknown type never fetches box score',async()=>{
 const scheduled=match(2);scheduled.state={description:'Scheduled'};const unknown=match(3,'2026-11-02');
 const result=await runSeasonBackfill(options({inventoryState:seeded([match(1),scheduled,unknown])}));
 assert.equal(result.snapshot.games.length,2);assert.equal(result.snapshot.backfillProgress.unclassifiedGames,1);assert.equal(result.snapshot.lines.length,2);
});
test('unknown NBA identity imports immediately and future mapping enriches without paid calls',async()=>{
 const cache=memoryCache(),inventoryState=seeded(),ids=identities();ids.players.pop();
 const first=await runSeasonBackfill(options({cache,inventoryState,identities:ids}));assert.equal(first.snapshot.lines.length,2);assert.equal(first.snapshot.games[0].statsState,'available');assert.equal(first.snapshot.lines[1].nbaId,null);assert.equal(first.snapshot.lines[1].playerKey,'highlightly:102');
 const second=await runSeasonBackfill(options({cache,inventoryState,identities:ids,previous:first.snapshot,client:async()=>{throw Error('No repeated paid call');}}));assert.equal(second.snapshot.lines.length,2);
 const repaired=await runSeasonBackfill(options({cache,inventoryState,previous:second.snapshot,client:async()=>{throw Error('No fetch to enrich identity');}}));assert.equal(repaired.snapshot.lines.length,2);assert.equal(repaired.snapshot.lines[1].nbaId,2);assert.deepEqual(repaired.snapshot.lines[1].stats,first.snapshot.lines[1].stats);
});
test('malformed source game is explicit; other games continue; no retry same UTC day',async()=>{
 const inventoryState=seeded([match(1),match(2)]),cache=memoryCache(),calls=[];
 const first=await runSeasonBackfill(options({cache,inventoryState,client:async e=>{calls.push(e);return e==='/box-score/1'?[]:box();}}));
 assert.equal(first.snapshot.games[0].refreshIssue.code,'source-data-error');assert.equal(first.snapshot.lines.length,2);assert.equal(first.snapshot.backfillProgress.sourceFailureGames,1);
 await runSeasonBackfill(options({cache,inventoryState,previous:first.snapshot,client:async()=>{throw Error('No same-day retry');}}));assert.equal(calls.length,2);
 const next=[];const result=await runSeasonBackfill(options({cache,previous:first.snapshot,now:()=>Date.parse(time)+86400000,client:async e=>{next.push(e);return e==='/matches'?page([match(1),match(2)]):box();}}));
 assert.deepEqual(next,['/matches','/box-score/1']);assert.equal(result.snapshot.lines.length,4);
});
test('recent invalid correction preserves old entire box score and score',async()=>{
 const recent=match(1,'2026-11-19'),s=schedule();s.games[0].dateET='2026-11-19';
 const inventoryState=seeded([recent]);const first=await runSeasonBackfill(options({inventoryState,schedule:s}));
 const old=structuredClone(first.snapshot);delete old.games[0].boxScoreCheckedAt;
 const second=await runSeasonBackfill(options({previous:old,inventoryState,schedule:s,maxCorrectionGames:1,client:async()=>[]}));
 assert.deepEqual(second.snapshot.lines,old.lines);assert.deepEqual(second.snapshot.games[0].finalScores,old.games[0].finalScores);assert.equal(second.snapshot.games[0].refreshIssue.preservedPreviousBoxScore,true);
});
test('corrupt inventory, changed totals, duplicate IDs and identity conflicts fail closed',async()=>{
 for(const mutate of [s=>s.offset++,s=>{s.offset=0;s.seenIds=[];},s=>s.seenIds.push(1)]){
  const s=seeded();mutate(s);await assert.rejects(runSeasonBackfill(options({inventoryState:s,client:async()=>{throw Error('Must not reach network');}})),/checkpoint|cursor/);
 }
 assert.throws(()=>seedSeasonInventory([page([match(1),match(1)])],{now:time}),/duplicate/);
 const incomplete=seedSeasonInventory([page([match(1)],0,2)],{now:time});
 await assert.rejects(runSeasonBackfill(options({inventoryState:incomplete,client:async()=>page([match(2)],1,3)})),/changed during pagination/);
 const previous=await prior22(),ids=identities();ids.players[0].providerId=999;
 await assert.rejects(runSeasonBackfill(options({previous,identities:ids,client:async()=>{throw Error('Must not reach network');}})),/identity collision/);
});
test('exact verified schedule requires matching ET date, minute, away/home; DST is handled',()=>{
 const classify=verifiedSchedule(schedule()),raw=match();assert.equal(classify(raw).type,'regular');
 for(const changed of [{...raw,date:'2026-11-01T20:01:00Z'},{...raw,date:'2026-11-02T20:00:00Z'},{...raw,homeTeam:raw.awayTeam,awayTeam:raw.homeTeam}])assert.equal(classify(changed),null);
 assert.deepEqual(easternMatchTime('2026-11-01T05:30:00Z'),{dateET:'2026-11-01',timeET:'01:30'});assert.deepEqual(easternMatchTime('2026-11-01T06:30:00Z'),{dateET:'2026-11-01',timeET:'01:30'});
 for(const changes of [{dateET:'2026-02-30'},{timeET:'24:00'},{type:'unknown'},{source:''}]){const s=schedule();Object.assign(s.games[0],changes);assert.throws(()=>verifiedSchedule(s));}
 const s=schedule();s.games.push({...s.games[0]});assert.throws(()=>verifiedSchedule(s),/Duplicate/);
});
test('UTC quota survives client restart and resets next day, with no real network',async()=>{
 let clock=Date.parse(time),fetches=0;let ledger={provider:PROVIDER,requests:[]},saved;
 const client=()=>makeHighlightlyClient({key:'SYNTHETIC',ledger,dailyLimit:1,now:()=>clock,sleep:async ms=>{clock+=ms;},saveLedger:async s=>{saved=structuredClone(s);},fetcher:async()=>{fetches++;assert.ok(saved);return new Response(JSON.stringify(box()));}});
 await client()('/box-score/1');ledger=structuredClone(saved);await assert.rejects(client()('/box-score/2'),e=>e.code==='HIGHLIGHTLY_BUDGET');assert.equal(fetches,1);
 clock=Date.parse('2026-11-21T00:00:00Z');await client()('/box-score/2');assert.equal(fetches,2);assert.equal(saved.dayUTC,'2026-11-21');assert.equal(saved.requests.length,1);
});

test('season start limits new work without deleting prior verified pre-start games',async()=>{
 const previous=await prior22(),s=schedule();s.seasonStart.date='2026-11-02';
 const result=await runSeasonBackfill(options({previous,schedule:s,inventoryState:seeded(),client:async()=>{throw Error('No out-of-window requests');}}));
 assert.deepEqual(result.snapshot.games,previous.games);assert.deepEqual(result.snapshot.lines,previous.lines);assert.equal(result.snapshot.backfillProgress.outsideDateScopeFinished,1);
});
test('malformed inventory cannot replace the previous snapshot or advance state',async()=>{
 const previous=await prior22(),before=structuredClone(previous);let saves=0;
 for(const broken of [{...page(),pagination:{totalCount:1,offset:8,limit:100}},page([{...match(),date:'invalid'}]),page([match(1),match(1)])]){
  await assert.rejects(runSeasonBackfill(options({previous,client:async()=>broken,saveState:async()=>{saves++;},saveProgress:async()=>{saves++;}})));
 }
 assert.equal(saves,0);assert.deepEqual(previous,before);
});

test('public checkpoint round trip retains skip metadata and progress without raw data or redundant requests',async()=>{
 const inventoryState=seeded([match(1),match(2),match(3)]);
 const first=await runSeasonBackfill(options({inventoryState,client:async endpoint=>{
  if(endpoint==='/box-score/2'){const b=box();b[0].boxScores[0].player.id=999;return b;}
  return endpoint==='/box-score/3'?[]:box();
 }}));
 first.snapshot.rawSecret='SYNTHETIC raw sentinel';first.snapshot.games[0].rawPayload={secret:'SYNTHETIC'};
 const authorization={provider:PROVIDER,season:'2026-27',publicationAllowed:true,publicDatasetAllowed:true,approvedBy:'repository-owner',publicScope:'normalized-fantasy-stats',confirmedAt:time,source:'SYNTHETIC test authorization only'};
 const projected=JSON.parse(JSON.stringify(publicHighlightlySnapshot(first.snapshot,authorization)));
 assert.equal(projected.rawSecret,undefined);assert.equal(projected.games[0].rawPayload,undefined);assert.equal(projected.games[2].refreshIssue.reason,undefined);
 assert.equal(projected.games[0].boxScoreCheckedAt,time);assert.equal(projected.lines.find(l=>l.providerId===999).nbaId,null);assert.equal(projected.lines.find(l=>l.providerId===999).playerKey,'highlightly:999');assert.deepEqual(projected.backfillProgress,first.snapshot.backfillProgress);
 const previous={...projected,publicationPolicy:'private-only-rights-unverified'};
 const resumed=await runSeasonBackfill(options({previous,inventoryState,client:async()=>{throw Error('No repeat even on fresh worker with empty cache');}}));
 assert.deepEqual(resumed.snapshot.lines,projected.lines);assert.equal(resumed.snapshot.backfillProgress.sourceFailureGames,1);assert.equal(resumed.snapshot.backfillProgress.unmappedGames,0);
});
test('provider game ID cannot silently change teams even when old validated box is preserved',async()=>{
 const previous=await prior22(),changed=match(1);changed.homeTeam.id=30;let calls=0;
 await assert.rejects(runSeasonBackfill(options({previous,inventoryState:seeded([changed]),client:async()=>{calls++;return box();}})),/Game team identity collision/);assert.equal(calls,0);
});
test('source retry allowance is bounded and new backlog is attempted before source retries',async()=>{
 const games=[1,2,3,4].map(id=>match(id)),first=await runSeasonBackfill(options({inventoryState:seeded(games),client:async()=>[]}));
 const calls=[];const result=await runSeasonBackfill(options({previous:first.snapshot,maxSourceRetriesPerRun:2,now:()=>Date.parse(time)+86400000,client:async e=>{calls.push(e);return e==='/matches'?page([...games,match(5)]):box();}}));
 assert.deepEqual(calls,['/matches','/box-score/5','/box-score/1','/box-score/2']);assert.equal(result.snapshot.backfillProgress.sourceFailureGames,2);assert.equal(result.snapshot.lines.length,6);
});
test('reviewed Knicks game stays blocked when official Hart identity cannot be verified and reports normalized evidence',async()=>{
 const inventoryState=seeded([match(1547577)]),b=box();b[0].boxScores[0].player={id:999,name:'Josh Hart',rawSecret:'MUST NOT COPY'};
 const previous=await prior22(),result=await runSeasonBackfill(options({previous,inventoryState,client:async()=>b}));
 const g=result.snapshot.games.find(g=>g.id===1547577);assert.equal(g.statsState,'missing');assert.equal(g.refreshIssue.officialReference.status,'unverifiable');assert.equal(result.snapshot.lines.length,previous.lines.length);
 assert.equal(g.refreshIssue.identityObservations[0].providerId,999);assert.equal(g.refreshIssue.identityObservations[0].name,'Josh Hart');assert.equal(JSON.stringify(g.refreshIssue).includes('MUST NOT COPY'),false);
 assert.equal(result.snapshot.players.some(p=>p.providerId===999),false);
 assert.equal(g.refreshIssue.code,'source-data-error');await runSeasonBackfill(options({previous:result.snapshot,inventoryState,client:async()=>{throw Error('No repeated blocked reference request');}}));
});
