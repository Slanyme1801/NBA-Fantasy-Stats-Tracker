// SYNTHETIC TEST DATA ONLY. No provider records or real identities.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {randomUUID} from 'node:crypto';
import {PROVIDER,statisticNames} from '../tools/highlightly.mjs';
import {runHighlightlyBatch,makeDiskCache,makeCachedLoader,mergeHighlightly,atomicPrivateJSON,readPrivateJSON} from '../tools/highlightly-private.mjs';
import {stats,player} from './fixtures.mjs';import {aggregate} from '../assets/core.mjs';
const now='2026-11-20T20:00:00Z',day='2026-11-01';
const identities=()=>({provider:PROVIDER,season:'2026-27',players:[player(1),player(2),player(3)]});
const types=()=>({provider:PROVIDER,season:'2026-27',games:[1,2].map(id=>({id,type:'regular',source:'SYNTHETIC verification',verifiedAt:'2026-11-01T00:00:00Z'}))});
const match=(id=1,date=day)=>({id,league:'NBA',season:2027,date:`${date}T20:00:00Z`,state:{description:'Finished',score:{homeTeam:[5,5,5,5],awayTeam:[5,5,5,5]}},homeTeam:{id:10,abbreviation:'SYN'},awayTeam:{id:20,abbreviation:'TST'}});
const envelope=(data=[match()])=>({data,plan:{tier:'BASIC',message:'All data available with current plan.'},pagination:{totalCount:data.length,offset:0,limit:100}});
const box=()=>[10,20].map((id,i)=>({team:{id},boxScores:[{player:{id:101+i},statistics:[...Object.entries(statisticNames).map(([k,name])=>({name,value:stats()[k]})),{name:'Total Minutes Played',value:30},{name:'Total Offensive Rebounds',value:2},{name:'Total Defensive Rebounds',value:4}]}]}));
const memoryCache=()=>{const entries=new Map();return {entries,get:async key=>structuredClone(entries.get(key)||null),put:async(key,value)=>entries.set(key,structuredClone(value))};};
const options=extra=>({client:async endpoint=>endpoint==='/matches'?envelope():box(),cache:memoryCache(),identities:identities(),types:types(),startDate:day,endDate:day,now:()=>Date.parse(now),...extra});
test('resume after quota interruption reuses schedule and successful box score, with explicit checkpoint',async()=>{
  const cache=memoryCache(),calls=[],checkpoints=[];
  const client=async endpoint=>{calls.push(endpoint);if(endpoint==='/matches')return envelope([match(1),match(2)]);if(endpoint==='/box-score/2')throw Error('budget');return box();};
  await assert.rejects(runHighlightlyBatch(options({client,cache,saveCheckpoint:async c=>checkpoints.push(structuredClone(c))})),/budget/);
  assert.equal(checkpoints.at(-1).status,'interrupted');assert.deepEqual(checkpoints.at(-1).completedGameIds,[1]);
  const resumed=[];const result=await runHighlightlyBatch(options({cache,client:async endpoint=>{resumed.push(endpoint);return box();}}));
  assert.deepEqual(resumed,['/box-score/2']);assert.equal(result.games.length,2);assert.equal(result.lines.length,4);
});
test('missing identity does not cause another paid download after mapping is repaired',async()=>{
  const cache=memoryCache();await assert.rejects(runHighlightlyBatch(options({cache,identities:{...identities(),players:[]}})),/Unmapped/);
  const result=await runHighlightlyBatch(options({cache,client:async()=>{throw Error('No fetch expected');}}));assert.equal(result.lines.length,2);
});
test('disk cache survives client restart and writes are private; invalid JSON fails closed',async()=>{
  const directory=`.local/highlightly-test-${randomUUID()}`;
  try{await runHighlightlyBatch(options({cache:makeDiskCache(directory)}));
    const result=await runHighlightlyBatch(options({cache:makeDiskCache(directory),client:async()=>{throw Error('No fetch expected');}}));assert.equal(result.games.length,1);
    const files=await fs.readdir(directory);for(const f of files)assert.equal((await fs.stat(`${directory}/${f}`)).mode&0o777,0o600);
    await fs.writeFile(`${directory}/${files[0]}`,'invalid');await assert.rejects(runHighlightlyBatch(options({cache:makeDiskCache(directory)})));
  }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('cache checksum, future timestamp and invalid raw payload fail closed without network',async()=>{
  for(const mutate of [r=>r.body.data=[],r=>r.fetchedAt='2029-01-01T00:00:00Z',r=>r.checksum='wrong']){
    const cache=memoryCache();await runHighlightlyBatch(options({cache}));const key=[...cache.entries.keys()][0];mutate(cache.entries.get(key));
    await assert.rejects(runHighlightlyBatch(options({cache,client:async()=>{throw Error('Must not fetch');}})),/Corrupt/);
  }
});
test('explicit refresh is resumable, replaces all game lines, and future baseline keeps corrected cache',async()=>{
  const cache=memoryCache(),first=await runHighlightlyBatch(options({cache}));
  let calls=0;const corrected=box();corrected[0].boxScores[0].player.id=103;
  const refresh={cache,previous:first,refreshFrom:day,refreshId:'review-1',client:async endpoint=>{calls++;return endpoint==='/matches'?envelope():corrected;}};
  const second=await runHighlightlyBatch(options(refresh));assert.equal(calls,2);assert.deepEqual(second.lines.map(l=>l.nbaId),[3,2]);assert.equal(second.lines.length,2);
  const third=await runHighlightlyBatch(options({...refresh,previous:second,client:async()=>{throw Error('No refresh repeated');}}));assert.equal(third.lines.length,2);
  const normal=await runHighlightlyBatch(options({cache,previous:third,client:async()=>{throw Error('No old baseline refetch');}}));assert.deepEqual(normal.lines.map(l=>l.nbaId),[3,2]);
});
test('recent or unfinished schedule expires, historical finished box stays cached',async()=>{
  const cache=memoryCache();let time=Date.parse('2026-11-01T21:00:00Z'),calls=0;
  const args=options({cache,now:()=>time,client:async endpoint=>{calls++;return endpoint==='/matches'?envelope():box();}});
  await runHighlightlyBatch(args);assert.equal(calls,2);time+=6*60000;await runHighlightlyBatch(args);assert.equal(calls,3);
  const oldScheduled=match();oldScheduled.state={description:'Scheduled'};const other=memoryCache();let loads=0;
  const loader=makeCachedLoader({cache:other,now:()=>time,client:async()=>{loads++;return envelope([oldScheduled]);}});
  await loader('/matches',{},()=>{},{date:day});time+=6*60000;await loader('/matches',{},()=>{},{date:day});assert.equal(loads,2);
});
test('merge preserves other batches and absent finished games with explicit coverage warnings',async()=>{
  const first=await runHighlightlyBatch(options());const second=await runHighlightlyBatch(options({startDate:'2026-11-02',endDate:'2026-11-02',client:async endpoint=>endpoint==='/matches'?envelope([match(2,'2026-11-02')]):box()}));
  const merged=mergeHighlightly(first,second);assert.equal(merged.games.length,2);assert.equal(merged.lines.length,4);assert.equal(merged.scope.completeSeason,false);assert.equal(merged.coverage.length,2);
  const empty=await runHighlightlyBatch(options({client:async()=>envelope([])}));const retained=mergeHighlightly(merged,empty);assert.equal(retained.games.length,2);assert.deepEqual(retained.coverage.at(-1).preservedAbsentFinishedGameIds,[1]);
});
test('identity collisions, provider mixing and finished status regressions are rejected',async()=>{
  const first=await runHighlightlyBatch(options());
  for(const mutate of [s=>s.provider='API-Sports',s=>s.games[0].provider='API-Sports',s=>{s.players[0].providerId=999;s.lines[0].providerId=999;},s=>{s.players[0].nbaId=999;s.lines[0].nbaId=999;},s=>s.games[0].status='scheduled']){
    const changed=structuredClone(first);mutate(changed);assert.throws(()=>mergeHighlightly(first,changed));
  }
});
test('absent classification cannot remove a known classification; older classifications rejected',async()=>{
  const first=await runHighlightlyBatch(options());const unknown=await runHighlightlyBatch(options({types:{...types(),games:[]}}));assert.throws(()=>mergeHighlightly(first,unknown),/Known classification/);assert.equal(aggregate(first,1,{asOf:now}).gp,1);
  const changed=structuredClone(first);changed.games[0].classification.verifiedAt='2026-10-01T00:00:00Z';assert.throws(()=>mergeHighlightly(first,changed),/Older classification/);
});
test('invalid corrected response never replaces candidate on disk',async()=>{
  const directory=`.local/highlightly-test-${randomUUID()}`,file=`${directory}/candidate.json`;try{
    const first=await runHighlightlyBatch(options());await atomicPrivateJSON(file,first);const bytes=await fs.readFile(file,'utf8');
    const invalid=box();invalid[0].boxScores[0].statistics[0].value=999;
    await assert.rejects(runHighlightlyBatch(options({previous:first,client:async endpoint=>endpoint==='/matches'?envelope():invalid})),/Points/);
    assert.equal(await fs.readFile(file,'utf8'),bytes);assert.deepEqual(await readPrivateJSON(file),first);
  }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('interruption after cache persistence but before checkpoint update does not redownload',async()=>{
  const cache=memoryCache();let saves=0;
  await assert.rejects(runHighlightlyBatch(options({cache,saveCheckpoint:async()=>{if(++saves===2)throw Error('synthetic interruption');}})),/interruption/);
  const calls=[];const resumed=await runHighlightlyBatch(options({cache,client:async endpoint=>{calls.push(endpoint);return box();}}));assert.deepEqual(calls,['/box-score/1']);assert.equal(resumed.games.length,1);
});
test('private writer rejects paths outside .local and symlink targets',async()=>{
  await assert.rejects(atomicPrivateJSON('data/should-never-exist.json',{}),/inside .local/);
  const directory=`.local/highlightly-test-${randomUUID()}`;try{
    await atomicPrivateJSON(`${directory}/original.json`,{safe:true});await fs.symlink('original.json',`${directory}/link.json`);
    await assert.rejects(atomicPrivateJSON(`${directory}/link.json`,{safe:false}),/symbolic link/);
    assert.deepEqual(await readPrivateJSON(`${directory}/original.json`),{safe:true});
  }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('merging a new batch preserves existing separately imported ESPN positions',async()=>{
  const first=await runHighlightlyBatch(options());first.positions={season:'2026-27',source:'SYNTHETIC ESPN import',importedAt:now,entries:[{nbaId:1,espnId:123,positions:['PG'],source:'SYNTHETIC ESPN',observedAt:now}]};
  const next=await runHighlightlyBatch(options());const merged=mergeHighlightly(first,next);assert.deepEqual(merged.positions,first.positions);
});

test('explicit refresh replaces old box score when corrected final score changes',async()=>{
  const cache=memoryCache(),first=await runHighlightlyBatch(options({cache}));
  const correctedMatch=match();correctedMatch.state.score.homeTeam[0]=7;
  const correctedBox=box();const values=correctedBox[0].boxScores[0].statistics;
  values.find(s=>s.name==='Total Points Scored').value=22;
  values.find(s=>s.name==='Successful Field Goals').value=8;
  const corrected=await runHighlightlyBatch(options({cache,previous:first,refreshFrom:day,refreshId:'score-correction',client:async endpoint=>endpoint==='/matches'?envelope([correctedMatch]):correctedBox}));
  assert.equal(corrected.lines[0].stats.pts,22);assert.equal(corrected.games[0].finalScores[0],22);assert.equal(corrected.lines.length,2);
});
test('empty historical calendar expires rather than being retained indefinitely',async()=>{
  let time=Date.parse(now),calls=0;const loader=makeCachedLoader({cache:memoryCache(),now:()=>time,client:async()=>{calls++;return envelope([]);}});
  await loader('/matches',{},()=>{},{date:day});time+=6*60000;await loader('/matches',{},()=>{},{date:day});assert.equal(calls,2);
});
test('corrupt previous snapshot and coverage are rejected before any network call',async()=>{
  const first=await runHighlightlyBatch(options());
  for(const mutate of [s=>s.lines[0].stats.pts=999,s=>s.provider='other',s=>s.coverage[0].startDate='invalid']){
    const prior=structuredClone(first);mutate(prior);let calls=0;
    await assert.rejects(runHighlightlyBatch(options({previous:prior,client:async()=>{calls++;throw Error('Must not fetch');}})));assert.equal(calls,0);
  }
});
