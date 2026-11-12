// Synthetic encrypted replay through the real validator; no fetch, secrets, or publication.
import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {encryptResponse,makeQuarantineReplayClient} from '../tools/highlightly-quarantine.mjs';
import {runSeasonBackfill} from '../tools/highlightly-backfill.mjs';
import {statisticNames} from '../tools/highlightly.mjs';
import {migrateHighlightlySeason} from '../assets/core.mjs';
import {stats,fixture} from './fixtures.mjs';
const key='SYNTHETIC-REPLAY-KEY-NOT-A-REAL-CREDENTIAL',now='2026-11-20T12:00:00.000Z';
const params={league:'NBA',season:2027,timezone:'America/New_York',limit:100,offset:0};
const raw={id:1547577,league:'NBA',season:2027,date:'2026-11-01T20:00:00Z',state:{description:'Finished',score:{homeTeam:[5,5,5,5],awayTeam:[5,5,5,5]}},homeTeam:{id:10,abbreviation:'SYN'},awayTeam:{id:20,abbreviation:'TST'}};
const page={data:[raw],plan:{tier:'BASIC',message:'All data available with current plan.'},pagination:{offset:0,limit:100,totalCount:1}};
const box=()=>[10,20].map((id,i)=>({team:{id},boxScores:[{player:{id:i?45941252:47043992,name:'Synthetic Player'},statistics:[...Object.entries(statisticNames).map(([counter,name])=>({name,value:stats({stl:i?3:1})[counter]})),{name:'Total Minutes Played',value:30},{name:'Total Offensive Rebounds',value:2},{name:'Total Defensive Rebounds',value:4}]}]}));
const archive=(endpoint,body,requestParams={})=>encryptResponse({key,endpoint,params:requestParams,status:200,fetchedAt:now,bodyBytes:Buffer.from(JSON.stringify(body))});
function options(client,previous){const entries=new Map();return {client,previous,now:()=>Date.parse(now),cache:{get:async k=>entries.get(k),put:async(k,v)=>entries.set(k,v)},identities:{provider:'Highlightly',season:'2026-27',players:previous.players},schedule:{season:'2026-27',seasonStart:{date:'2026-10-20',source:'SYNTHETIC verified date',verifiedAt:now},games:[{dateET:'2026-11-01',timeET:'15:00',home:'SYN',away:'TST',type:'regular',source:'SYNTHETIC exact schedule',verifiedAt:now}]},maxCorrectionGames:0};}
function previous(){const s=fixture();s.provider='Highlightly';s.publicationPolicy='private-only-rights-unverified';s.scope={startDate:'2026-11-14',endDate:'2026-11-14',timeZone:'America/New_York',completeSeason:false};s.games.forEach(g=>g.provider='Highlightly');s.lines.forEach(l=>l.provider='Highlightly');return migrateHighlightlySeason(s);}
test('encrypted official-conflict replay remains quarantined and never edits quota or existing verified lines',async()=>{
 const cwd=process.cwd(),directory=await fs.mkdtemp(path.join(os.tmpdir(),'synthetic-replay-'));
 try{process.chdir(directory);await fs.mkdir('.local');const ledger=JSON.stringify({provider:'Highlightly',dayUTC:'2026-11-20',requests:[Date.parse(now)],blocked:true,serverRemaining:0});await fs.writeFile('.local/highlightly-request-ledger.json',ledger);
  const saved=previous(),client=makeQuarantineReplayClient({key,records:[archive('/matches',page,params),archive('/box-score/1547577',box())]});
  const result=await runSeasonBackfill(options(client,saved));assert.deepEqual(result.snapshot.lines,saved.lines);assert.equal(result.snapshot.games.find(g=>g.id===1547577).statsState,'missing');assert.equal(result.snapshot.games.find(g=>g.id===1547577).refreshIssue.sourceErrorCode,'official-reference-mismatch');assert.equal(await fs.readFile('.local/highlightly-request-ledger.json','utf8'),ledger);assert.equal(result.snapshot.publicationPolicy,'private-only-rights-unverified');await assert.rejects(fs.stat('data/manifest.json'),{code:'ENOENT'});
 }finally{process.chdir(cwd);await fs.rm(directory,{recursive:true,force:true});}
});
test('encrypted valid but statistically malformed box replays only into explicit source failure',async()=>{
 const b=box();b[0].boxScores[0].statistics.find(s=>s.name==='Total Points Scored').value=999;
 const saved=previous(),client=makeQuarantineReplayClient({key,records:[archive('/matches',page,params),archive('/box-score/1547577',b)]});
 const result=await runSeasonBackfill(options(client,saved));assert.deepEqual(result.snapshot.lines,saved.lines);assert.equal(result.snapshot.games.find(g=>g.id===1547577).refreshIssue.sourceErrorCode,'points-mismatch');
});
