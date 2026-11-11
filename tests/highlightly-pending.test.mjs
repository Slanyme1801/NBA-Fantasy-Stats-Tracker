// Synthetic normalized pending boxes only: no network, fabricated NBA assignments or private cache uploads.
import test from 'node:test';import assert from 'node:assert/strict';
import {emptyPending,normalizePendingBox,publicPendingBoxes,pendingBody} from '../tools/highlightly-pending.mjs';
import {runSeasonBackfill,seedSeasonInventory} from '../tools/highlightly-backfill.mjs';
import {publicRefreshIssue} from '../tools/highlightly-public.mjs';
import {statisticNames,normalizeMatch,PROVIDER} from '../tools/highlightly.mjs';
import {player,stats} from './fixtures.mjs';
const now='2026-11-20T09:00:00.000Z';
const match=()=>({id:1,league:'NBA',season:2027,date:'2026-11-01T20:00:00Z',state:{description:'Finished',score:{homeTeam:[5,5,5,5],awayTeam:[5,5,5,5]}},homeTeam:{id:10,abbreviation:'SYN'},awayTeam:{id:20,abbreviation:'TST'}});
const page=()=>({data:[match()],plan:{tier:'BASIC',message:'All data available with current plan.'},pagination:{offset:0,limit:100,totalCount:1}});
const box=()=>[10,20].map((id,i)=>({team:{id},boxScores:[{player:{id:101+i,name:`Synthetic Player`},statistics:[...Object.entries(statisticNames).map(([k,name])=>({name,value:stats()[k]})),{name:'Total Minutes Played',value:30},{name:'Total Offensive Rebounds',value:2},{name:'Total Defensive Rebounds',value:4}]}]}));
const cache=()=>{const data=new Map();return {get:async k=>data.get(k),put:async(k,v)=>data.set(k,v)};};
const opts=extra=>({now:()=>Date.parse(now),cache:cache(),client:async()=>box(),identities:{provider:PROVIDER,season:'2026-27',players:[player(1),player(2)]},inventoryState:seedSeasonInventory([page()],{now}),schedule:{season:'2026-27',seasonStart:{date:'2026-10-20',source:'SYNTHETIC',verifiedAt:now},games:[{dateET:'2026-11-01',timeET:'15:00',home:'SYN',away:'TST',type:'regular',source:'SYNTHETIC',verifiedAt:now}]},maxCorrectionGames:0,...extra});
const pending=()=>({...emptyPending(),games:[normalizePendingBox(box(),normalizeMatch(match(),new Map()),now)]});
test('pending state projects strict normalized counters without raw fields or NBA assignment',()=>{
 const s=pending();s.raw='SECRET';s.games[0].rawResponse='SECRET';s.games[0].players[0].raw='SECRET';s.games[0].players[0].stats.raw='SECRET';s.games[0].game.raw='SECRET';
 const p=publicPendingBoxes(s,now);assert.equal(JSON.stringify(p).includes('SECRET'),false);assert.equal(JSON.stringify(p).includes('nbaId'),false);assert.equal(p.games[0].players[0].stats.pts,20);assert.equal(p.games[0].players[0].stats.oreb,2);
 assert.deepEqual(pendingBody(p.games[0],normalizeMatch(match(),new Map())),box());
});
test('invalid pending counters, dates, team IDs, duplicate players, NBA IDs and final scores fail closed',()=>{
 for(const mutate of [s=>s.games[0].players[0].stats.pts++,s=>s.games[0].players[0].stats.reb++,s=>s.games[0].players[0].teamId=99,s=>s.games[0].players[0].nbaId=1,s=>s.games[0].players[0].providerId=102,s=>s.games[0].fetchedAt='2099-01-01T00:00:00.000Z',s=>s.games[0].game.finalScores[0]++,s=>s.games.push(s.games[0]),s=>s.provider='other']){const s=pending();mutate(s);assert.throws(()=>publicPendingBoxes(s,now));}
 const entry=pending().games[0];for(const mutate of [g=>g.start='2026-11-02T20:00:00Z',g=>g.home.id=30,g=>g.finalScores[0]++]){const g=normalizeMatch(match(),new Map());mutate(g);assert.throws(()=>pendingBody(entry,g),/changed/);}
});
test('fresh worker resolves legacy pending whole box without NBA mapping, provider or private cache',async()=>{
 const events=[];const second=await runSeasonBackfill(opts({identities:{provider:PROVIDER,season:'2026-27',players:[]},pendingState:pending(),client:async()=>{throw Error('Provider forbidden');},saveProgress:async s=>events.push(['progress',s.lines.length]),savePending:async s=>events.push(['pending',s.games.length])}));
 assert.equal(second.snapshot.lines.length,2);assert.equal(second.snapshot.lines[0].nbaId,null);assert.equal(second.snapshot.games[0].statsState,'available');assert.equal(second.pendingState.games.length,0);assert.ok(events.findIndex(e=>e[0]==='progress'&&e[1]===2)<events.findIndex(e=>e[0]==='pending'&&e[1]===0));
});
test('zero budget and incomplete new-day inventory still resolves retained normalized pending box',async()=>{
 let calls=0;const second=await runSeasonBackfill(opts({pendingState:pending(),inventoryState:null,now:()=>Date.parse(now)+86400000,client:async()=>{calls++;throw Object.assign(Error('Quota zero'),{code:'HIGHLIGHTLY_BUDGET'});}}));
 assert.equal(calls,1);assert.equal(second.snapshot.lines.length,2);assert.equal(second.snapshot.backfillProgress.budgetExhausted,true);assert.equal(second.snapshot.backfillProgress.inventoryComplete,false);
});
test('failed pending purge stops before another provider call and retains fully saved snapshot',async()=>{
 const progress=[];await assert.rejects(runSeasonBackfill(opts({pendingState:pending(),client:async()=>{throw Error('No provider call');},savePending:async()=>{throw Error('SYNTHETIC persistence failed');},saveProgress:async s=>progress.push(s)})),/persistence failed/);assert.equal(progress.at(-1).lines.length,2);
});
test('source error code is stable allowlisted and free text remains excluded',async()=>{
 const result=await runSeasonBackfill(opts({client:async()=>[]}));const issue=result.snapshot.games[0].refreshIssue;
 assert.equal(issue.sourceErrorCode,'team-count');const projected=publicRefreshIssue(issue);assert.equal(projected.sourceErrorCode,'team-count');assert.equal(projected.reason,undefined);assert.throws(()=>publicRefreshIssue({...issue,sourceErrorCode:'SECRET upstream exception'}),/source error code/);
});
function reviewedBox(hartSteals=3){
 const b=box();b[0].boxScores[0].player={id:47043992,name:'Karl-Anthony Towns'};b[0].boxScores[0].statistics.find(s=>s.name==='Total Steals').value=0;
 const zero={player:{id:37927457,name:'Jordan Clarkson'},statistics:b[0].boxScores[0].statistics.map(s=>({...s,value:0}))};b[0].boxScores.push(zero);
 b[1].boxScores[0].player={id:45941252,name:'Josh Hart'};b[1].boxScores[0].statistics.find(s=>s.name==='Total Steals').value=hartSteals;return b;
}
const reviewedIds=includeHart=>({provider:PROVIDER,season:'2026-27',players:[{...player(1626157),providerId:47043992},{...player(203903),providerId:37927457},...(includeHart?[{...player(1628404),providerId:45941252}]:[])]});
test('legacy pending official reference uses reviewed provider IDs without requiring general NBA mapping',async()=>{
 const raw={...match(),id:1547577},inventoryState=seedSeasonInventory([{...page(),data:[raw]}],{now});
 const stored={...emptyPending(),games:[normalizePendingBox(reviewedBox(),normalizeMatch(raw,new Map()),now)]};
 const next=await runSeasonBackfill(opts({inventoryState,identities:{provider:PROVIDER,season:'2026-27',players:[]},pendingState:stored,client:async()=>{throw Error('No provider call');}}));
 assert.equal(next.snapshot.games[0].statsState,'available');assert.equal(next.snapshot.lines.length,3);assert.equal(next.pendingState.games.length,0);assert.equal(next.snapshot.lines[0].nbaId,null);
});
test('legacy pending cannot bypass official Hart counter mismatch even without NBA mapping',async()=>{
 const raw={...match(),id:1547577},inventoryState=seedSeasonInventory([{...page(),data:[raw]}],{now});
 const stored={...emptyPending(),games:[normalizePendingBox(reviewedBox(2),normalizeMatch(raw,new Map()),now)]};
 const next=await runSeasonBackfill(opts({inventoryState,identities:{provider:PROVIDER,season:'2026-27',players:[]},pendingState:stored,client:async()=>{throw Error('No provider call');}}));
 assert.equal(next.snapshot.lines.length,0);assert.equal(next.snapshot.games[0].refreshIssue.sourceErrorCode,'official-reference-mismatch');assert.equal(next.pendingState.games.length,0);
});
test('pending box is not purged if the resolved whole-game checkpoint fails',async()=>{
 const saved=pending();let purges=0;await assert.rejects(runSeasonBackfill(opts({pendingState:saved,client:async()=>{throw Error('No provider call');},saveProgress:async s=>{if(s.lines.length)throw Error('SYNTHETIC checkpoint failed');},savePending:async()=>purges++})),/checkpoint failed/);assert.equal(purges,0);assert.equal(saved.games.length,1);
});

function cooperOptions(date='2026-10-30',missingStats=false){
 const raw={...match(),date:`${date}T20:00:00Z`},b=box();b[0].boxScores[0].player={id:76588322,name:'Carson Cooper'};
 if(missingStats){b[0].boxScores[0].statistics=[];raw.state={description:'Finished',score:{homeTeam:[0,0,0,0],awayTeam:[5,5,5,5]}};}
 const args=opts({inventoryState:seedSeasonInventory([{...page(),data:[raw]}],{now}),identities:{provider:PROVIDER,season:'2026-27',players:[{...player(1643721),providerId:76588322},player(2)]},client:async()=>b});
 args.schedule.games[0]={...args.schedule.games[0],dateET:date,timeET:date<'2026-11-01'?'16:00':'15:00'};
 return {args,raw,b};
}
test('official Cooper debut blocks entire earlier box without converting played to DNP',async()=>{
 const {args,b}=cooperOptions(),before=structuredClone(b);const result=await runSeasonBackfill(args);
 assert.equal(result.snapshot.lines.length,0);assert.equal(result.snapshot.games[0].statsState,'missing');const issue=result.snapshot.games[0].refreshIssue;
 assert.equal(issue.sourceErrorCode,'official-participation-conflict');assert.equal(issue.participationReference.gameDateET,'2026-10-30');assert.equal(issue.participationReference.firstAppearanceET,'2026-10-31');assert.equal(issue.participationReference.observedParticipation,'played');assert.deepEqual(b,before);assert.equal(result.pendingState.games.length,0);
 assert.equal(publicRefreshIssue(issue).sourceErrorCode,'official-participation-conflict');assert.equal(publicRefreshIssue(issue).participationReference.providerId,76588322);
});
test('official Cooper debut permits missing statistics before debut and played on or after debut',async()=>{
 for(const [date,missing]of [['2026-10-30',true],['2026-10-31',false],['2026-11-01',false]]){
  const result=await runSeasonBackfill(cooperOptions(date,missing).args);assert.equal(result.snapshot.games[0].statsState,'available');assert.equal(result.snapshot.games[0].refreshIssue,undefined);assert.equal(result.snapshot.lines[0].participation,missing?'missing':'played');
 }
});
test('durable pending replay cannot bypass official Cooper participation conflict',async()=>{
 const {args,raw,b}=cooperOptions();const stored={...emptyPending(),games:[normalizePendingBox(b,normalizeMatch(raw,new Map()),now)]};
 const result=await runSeasonBackfill({...args,pendingState:stored,client:async()=>{throw Error('No provider call');}});
 assert.equal(result.snapshot.lines.length,0);assert.equal(result.snapshot.games[0].refreshIssue.sourceErrorCode,'official-participation-conflict');assert.equal(result.pendingState.games.length,0);
});
test('provider-primary checkpoint retains actual fetchedAt with advancing paid-response clock',async()=>{
 let clock=Date.parse(now);const result=await runSeasonBackfill(opts({now:()=>clock,identities:{provider:PROVIDER,season:'2026-27',players:[]},client:async()=>{clock+=6100;return box();}}));
 assert.equal(result.snapshot.games[0].boxScoreCheckedAt,new Date(clock).toISOString());assert.equal(result.snapshot.updatedAt,now);assert.equal(result.snapshot.lines.length,2);assert.equal(result.pendingState.games.length,0);
});
test('crash after saving pending correction before issue checkpoint preserves newer pending and older verified box',async()=>{
 const original=await runSeasonBackfill(opts());const b=box();b[0].boxScores[0].player={id:999,name:'Synthetic Corrected Player'};
 let clock=Date.parse(now)+6100,durable;const pendingCorrection={...emptyPending(),games:[normalizePendingBox(b,normalizeMatch(match(),new Map()),new Date(clock).toISOString())]};
 // Reproduce the durable state after paid correction save succeeded but checkpoint save did not.
 await assert.rejects(runSeasonBackfill(opts({previous:original.snapshot,pendingState:pendingCorrection,now:()=>clock,client:async()=>{throw Error('No provider call');},saveProgress:async s=>{if(s.lines.some(l=>l.providerId===999))throw Error('SYNTHETIC issue checkpoint interrupted');},savePending:async s=>{durable=s;}})),/checkpoint interrupted/);
 assert.equal(durable,undefined);clock+=6100;
 const recovered=await runSeasonBackfill(opts({previous:original.snapshot,pendingState:pendingCorrection,now:()=>clock,client:async()=>{throw Error('No provider call');}}));
 assert.equal(recovered.snapshot.lines.length,original.snapshot.lines.length);assert.equal(recovered.snapshot.lines[0].providerId,999);assert.equal(recovered.snapshot.lines[0].nbaId,null);assert.equal(recovered.snapshot.games[0].statsState,'available');assert.equal(recovered.snapshot.games[0].refreshIssue,undefined);assert.equal(recovered.pendingState.games.length,0);
});
