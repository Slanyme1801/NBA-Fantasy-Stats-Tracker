// Synthetic isolated-workspace checks. No provider network, real Git command or remote publication.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {publicInventory,persistGitCheckpoint,runHostedBackfill,publishCheckpoint,CHECKPOINT,INVENTORY,PENDING} from '../tools/highlightly-season-runner.mjs';
import {runnerInputs,resumeSnapshot} from '../tools/highlightly-actions.mjs';
import {seedSeasonInventory} from '../tools/highlightly-backfill.mjs';
import {publicHighlightlySnapshot} from '../tools/highlightly-public.mjs';
import {statisticNames} from '../tools/highlightly.mjs';
import {checksum} from '../tools/files.mjs';
import {fixture,stats} from './fixtures.mjs';
const now='2026-11-20T09:00:00.000Z';
const authorization={provider:'Highlightly',season:'2026-27',publicationAllowed:true,publicDatasetAllowed:true,approvedBy:'repository-owner',publicScope:'normalized-fantasy-stats',confirmedAt:now,source:'SYNTHETIC test owner attestation'};
function snapshot(){const s=fixture();s.provider='Highlightly';s.scope={startDate:'2026-11-14',endDate:'2026-11-14',timeZone:'America/New_York',completeSeason:false};s.games.forEach(g=>g.provider='Highlightly');s.lines.forEach(l=>l.provider='Highlightly');return publicHighlightlySnapshot(s,authorization);}
const match=(id=2)=>({id,league:'NBA',season:2027,date:'2026-11-01T20:00:00Z',state:{description:'Finished',score:{homeTeam:[5,5,5,5],awayTeam:[5,5,5,5]}},homeTeam:{id:10,abbreviation:'SYN'},awayTeam:{id:20,abbreviation:'TST'}});
const page=(data=[match()])=>({data,plan:{tier:'BASIC',message:'All data available with current plan.'},pagination:{offset:0,limit:100,totalCount:data.length}});
const box=()=>[10,20].map((id,i)=>({team:{id},boxScores:[{player:{id:101+i},statistics:[...Object.entries(statisticNames).map(([k,name])=>({name,value:stats()[k]})),{name:'Total Minutes Played',value:30},{name:'Total Offensive Rebounds',value:2},{name:'Total Defensive Rebounds',value:4}]}]}));
const write=async(file,data)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(data),{mode:0o600});};
async function isolated(fn){const prior=process.cwd(),oldId=process.env.GITHUB_RUN_ID,dir=await fs.mkdtemp(path.join(os.tmpdir(),'synthetic-highlightly-runner-'));try{process.chdir(dir);process.env.GITHUB_RUN_ID='123';await fn();}finally{process.chdir(prior);if(oldId===undefined)delete process.env.GITHUB_RUN_ID;else process.env.GITHUB_RUN_ID=oldId;await fs.rm(dir,{recursive:true,force:true});}}
async function setup(){const current=snapshot(),inputs=runnerInputs(current);await write('.github/highlightly-quota.json',{dayUTC:now.slice(0,10),runId:'123',reservedRequests:90});for(const [name,value]of Object.entries({'publication':authorization,'candidate':inputs.candidate,'identities':inputs.identities,'game-types':inputs.types,'request-ledger':{provider:'Highlightly',requests:[]}}))await write(`.local/highlightly-${name}.json`,value);await write('config/highlightly-schedule.verified.json',{season:'2026-27',seasonStart:{date:'2026-10-20',source:'SYNTHETIC',verifiedAt:now},games:[{dateET:'2026-11-01',timeET:'15:00',home:'SYN',away:'TST',type:'regular',source:'SYNTHETIC',verifiedAt:now}]});return current;}

test('public inventory projection removes arbitrary fields at state/game/team levels',()=>{
 const state=seedSeasonInventory([page()],{now});state.raw='PRIVATE SENTINEL';state.games[0].rawResponse={secret:'PRIVATE SENTINEL'};state.games[0].home.raw='PRIVATE SENTINEL';
 const projected=publicInventory(state,now);assert.equal(JSON.stringify(projected).includes('PRIVATE SENTINEL'),false);assert.deepEqual(Object.keys(projected).sort(),['version','provider','season','dayUTC','offset','total','seenIds','complete','games'].sort());assert.equal(projected.games[0].classification,null);assert.equal(projected.games[0].statsState,'not-fetched');
});
test('Git checkpoint only stages allowlisted paths, validates index and commits before one push',()=>{
 const calls=[];persistGitCheckpoint([CHECKPOINT],{execute:(command,args)=>{calls.push([command,...args]);return {status:args.join(' ')==='diff --cached --quiet'?1:0,stdout:args.join(' ')==='diff --cached --name-only'?CHECKPOINT+'\n':''};}});
 assert.deepEqual(calls,[['git','add','--',CHECKPOINT],['git','diff','--cached','--quiet'],['git','diff','--cached','--name-only'],['git','commit','-m','Save verified Highlightly backfill progress'],['git','push','--porcelain','origin','HEAD:main']]);
 for(const paths of [[],['.local/private.json'],['data/manifest.json'],[CHECKPOINT,'--all']])assert.throws(()=>persistGitCheckpoint(paths,{execute:()=>{throw Error('Must not execute');}}),/Unapproved/);
 const denied=[];assert.throws(()=>persistGitCheckpoint([INVENTORY],{execute:(_,args)=>{denied.push(args);return {status:args.includes('--quiet')?1:0,stdout:'unexpected.txt\n'};}}),/Unexpected staged/);assert.equal(denied.some(args=>args[0]==='commit'),false);
});
test('uncertain or failed push stops immediately without automatic Git retry',()=>{
 for(const status of [1,null]){const calls=[];assert.throws(()=>persistGitCheckpoint([CHECKPOINT],{execute:(_,args)=>{calls.push(args);return {status:args[0]==='push'?status:args.includes('--quiet')?1:0,stdout:CHECKPOINT+'\n'};}}),/stop before spending/);assert.equal(calls.filter(args=>args[0]==='push').length,1);assert.equal(calls.at(-1)[0],'push');}
});
test('runner awaits durable inventory and whole-game checkpoint before next provider call',async()=>isolated(async()=>{
 await setup();const events=[];const result=await runHostedBackfill({hosted:true,archiveOverride:async()=>{},now:()=>Date.parse(now),clientOverride:async endpoint=>{events.push(endpoint);return endpoint==='/matches'?page([match(2),match(3)]):box();},persist:async paths=>{await new Promise(resolve=>setTimeout(resolve,1));events.push(paths[0]);}});
 assert.deepEqual(events,['/matches',INVENTORY,CHECKPOINT,'/box-score/2',CHECKPOINT,'/box-score/3',CHECKPOINT,CHECKPOINT]);assert.equal(result.snapshot.games.length,3);assert.equal(result.snapshot.lines.length,7);await assert.rejects(fs.stat('.local/highlightly.lock'),{code:'ENOENT'});
}));
test('runner persistence failure prevents next provider request and leaves recoverable normalized state',async()=>isolated(async()=>{
 await setup();const calls=[];let persists=0;
 await assert.rejects(runHostedBackfill({hosted:true,archiveOverride:async()=>{},now:()=>Date.parse(now),clientOverride:async endpoint=>{calls.push(endpoint);return endpoint==='/matches'?page([match(2),match(3)]):box();},persist:async()=>{if(++persists===3)throw Error('SYNTHETIC uncertain push');}}),/uncertain push/);
 assert.deepEqual(calls,['/matches','/box-score/2']);const durable=JSON.parse(await fs.readFile(CHECKPOINT,'utf8'));assert.equal(durable.games.find(g=>g.id===2).statsState,'available');assert.equal(durable.games.find(g=>g.id===3).statsState,'missing');assert.equal(durable.publicationPolicy,'authorized-public-normalized');await assert.rejects(publishCheckpoint({now:()=>Date.parse(now)}),{code:'ENOENT'});await assert.rejects(fs.stat('.local/highlightly.lock'),{code:'ENOENT'});
}));
test('fresh worker reconstructed from checkpoint skips completed game despite empty private cache',async()=>isolated(async()=>{
 const current=await setup();const result=await runHostedBackfill({hosted:true,archiveOverride:async()=>{},now:()=>Date.parse(now),clientOverride:async endpoint=>{if(endpoint==='/matches')return page([match(2),match(3)]);if(endpoint==='/box-score/3')throw Object.assign(Error('SYNTHETIC quota'),{code:'HIGHLIGHTLY_BUDGET'});return box();},persist:async()=>{}});
 const checkpoint=JSON.parse(await fs.readFile(CHECKPOINT,'utf8')),inputs=runnerInputs(resumeSnapshot(current,checkpoint));await fs.rm('.local',{recursive:true,force:true});await setup();await write('.local/highlightly-candidate.json',inputs.candidate);await write('.local/highlightly-identities.json',inputs.identities);await write('.local/highlightly-game-types.json',inputs.types);
 const calls=[];const resumed=await runHostedBackfill({hosted:true,archiveOverride:async()=>{},now:()=>Date.parse(now),clientOverride:async endpoint=>{calls.push(endpoint);return box();},persist:async()=>{}});assert.deepEqual(calls,['/box-score/3']);assert.equal(resumed.snapshot.games.length,3);assert.equal(resumed.snapshot.lines.length,result.snapshot.lines.length+2);
}));
test('publication of incomplete checkpoint retains prior verified games and rejects loss',async()=>isolated(async()=>{
 const current=await setup();const bytes=Buffer.from(JSON.stringify(current));await fs.mkdir('data/releases',{recursive:true});await fs.writeFile('data/releases/current.json',bytes);await write('data/manifest.json',{file:'data/releases/current.json',sha256:checksum(bytes)});
 await runHostedBackfill({hosted:true,archiveOverride:async()=>{},now:()=>Date.parse(now),clientOverride:async endpoint=>{if(endpoint==='/matches')return page();throw Object.assign(Error('SYNTHETIC quota'),{code:'HIGHLIGHTLY_BUDGET'});},persist:async()=>{}});
 const manifest=await publishCheckpoint({now:()=>Date.parse(now)}),released=JSON.parse(await fs.readFile(manifest.file,'utf8'));assert.equal(released.games.find(g=>g.id===1).statsState,'available');assert.equal(released.games.find(g=>g.id===2).statsState,'missing');assert.equal(released.scope.completeSeason,false);
 const bad=structuredClone(released);bad.games=bad.games.filter(g=>g.id!==1);bad.lines=bad.lines.filter(l=>l.gameId!==1);await write(CHECKPOINT,bad);await assert.rejects(publishCheckpoint({now:()=>Date.parse(now)}),/remove an already verified/);
}));

test('publication marker is bound to current run and day',async()=>isolated(async()=>{
 await setup();
 for(const ready of [{runId:'999',dayUTC:now.slice(0,10)},{runId:'123',dayUTC:'2026-11-19'}]){
  await write('.local/highlightly-checkpoint-ready.json',ready);await assert.rejects(publishCheckpoint({now:()=>Date.parse(now)}),/No successfully pushed checkpoint/);
 }
}));

test('provider-primary checkpoint survives fresh worker and gains NBA mapping without downloading again',async()=>isolated(async()=>{
 await setup();const events=[];const first=await runHostedBackfill({hosted:true,archiveOverride:async()=>{},now:()=>Date.parse(now),clientOverride:async endpoint=>{events.push(endpoint);if(endpoint==='/matches')return page();const b=box();b[0].boxScores[0].player={id:999,name:'Synthetic New Player'};return b;},persist:async paths=>{events.push(paths[0]);}});
 assert.equal(events.includes(PENDING),false);assert.equal(first.pendingState.games.length,0);assert.equal(first.snapshot.lines.find(l=>l.providerId===999).nbaId,null);
 const checkpoint=JSON.parse(await fs.readFile(CHECKPOINT,'utf8'));await fs.rm('.local',{recursive:true,force:true});await setup();const inputs=runnerInputs(checkpoint,{provider:'Highlightly',season:'2026-27',players:[{nbaId:9,providerId:999,name:'Synthetic New Player',source:'SYNTHETIC independently reviewed identity',verifiedAt:now}]});
 await write('.local/highlightly-candidate.json',inputs.candidate);await write('.local/highlightly-identities.json',inputs.identities);await write('.local/highlightly-game-types.json',inputs.types);
 const result=await runHostedBackfill({hosted:true,archiveOverride:async()=>{},now:()=>Date.parse(now),clientOverride:async()=>{throw Error('Provider forbidden');},persist:async()=>{}});
 assert.equal(result.snapshot.games.find(g=>g.id===2).statsState,'available');assert.equal(result.snapshot.lines.find(l=>l.providerId===999).nbaId,9);await assert.rejects(fs.stat(PENDING),{code:'ENOENT'});
}));
test('normalized pending path is explicitly permitted for durable Git checkpoints',()=>{
 const calls=[];persistGitCheckpoint([PENDING],{execute:(_,args)=>{calls.push(args);return {status:args.includes('--quiet')?1:0,stdout:PENDING+'\n'};}});assert.deepEqual(calls[0],['add','--',PENDING]);assert.deepEqual(calls.at(-1),['push','--porcelain','origin','HEAD:main']);
});
test('hosted execution cannot silently omit response archival even with an injected client',async()=>isolated(async()=>{
 await setup();const old=process.env.HIGHLIGHTLY_API_KEY;delete process.env.HIGHLIGHTLY_API_KEY;let calls=0;
 try{await assert.rejects(runHostedBackfill({hosted:true,now:()=>Date.parse(now),clientOverride:async()=>{calls++;return page();},persist:async()=>{}}));assert.equal(calls,0);}finally{if(old!==undefined)process.env.HIGHLIGHTLY_API_KEY=old;}
}));
test('hosted archives each complete response before inventory/source validation and checkpoint',async()=>isolated(async()=>{
 await setup();const key='SYNTHETIC QUARANTINE TEST KEY',old=process.env.HIGHLIGHTLY_API_KEY;process.env.HIGHLIGHTLY_API_KEY=key;
 const events=[];try{
  await runHostedBackfill({hosted:true,now:()=>Date.parse(now),clientOverride:async endpoint=>{events.push(endpoint);return endpoint==='/matches'?page():box();},persist:async paths=>events.push(paths[0])});
  assert.equal(events[0],'/matches');assert.match(events[1],/^\.github\/highlightly-quarantine\/[a-f0-9-]+\.json$/);assert.equal(events[2],INVENTORY);
  const boxIndex=events.indexOf('/box-score/2');assert.match(events[boxIndex+1],/^\.github\/highlightly-quarantine\/[a-f0-9-]+\.json$/);assert.equal(events[boxIndex+2],CHECKPOINT);
  const archiveFiles=await fs.readdir('.github/highlightly-quarantine');assert.equal(archiveFiles.length,2);for(const name of archiveFiles){const contents=await fs.readFile(`.github/highlightly-quarantine/${name}`,'utf8');assert.equal(contents.includes(key),false);assert.equal(contents.includes('Successful Field Goals'),false);}
 }finally{if(old===undefined)delete process.env.HIGHLIGHTLY_API_KEY;else process.env.HIGHLIGHTLY_API_KEY=old;}
}));
test('uncertain archive push clears publication marker and prevents next provider call',async()=>isolated(async()=>{
 await setup();const calls=[];await assert.rejects(runHostedBackfill({hosted:true,now:()=>Date.parse(now),clientOverride:async endpoint=>{calls.push(endpoint);return endpoint==='/matches'?page([match(2),match(3),match(4)]):box();},archiveOverride:async record=>{if(record.endpoint==='/box-score/3')throw Error('SYNTHETIC uncertain archive push');},persist:async()=>{}}),/uncertain archive push/);
 assert.deepEqual(calls,['/matches','/box-score/2','/box-score/3']);await assert.rejects(publishCheckpoint({now:()=>Date.parse(now)}),{code:'ENOENT'});
 const checkpoint=JSON.parse(await fs.readFile(CHECKPOINT,'utf8'));assert.equal(checkpoint.games.find(g=>g.id===2).statsState,'available');assert.equal(checkpoint.games.find(g=>g.id===3).statsState,'missing');
}));
test('confirmed archive preserves prior ready checkpoint when a later collection step fails',async()=>isolated(async()=>{
 await setup();const calls=[];await assert.rejects(runHostedBackfill({hosted:true,now:()=>Date.parse(now),clientOverride:async endpoint=>{calls.push(endpoint);if(endpoint==='/matches')return page([match(2),match(3)]);if(endpoint==='/box-score/3')throw Error('SYNTHETIC disconnected before response');return box();},archiveOverride:async()=>{},persist:async()=>{}}),/disconnected/);
 const marker=JSON.parse(await fs.readFile('.local/highlightly-checkpoint-ready.json','utf8'));assert.equal(marker.runId,'123');assert.equal(calls.length,3);
}));
