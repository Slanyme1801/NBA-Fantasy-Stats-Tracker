// Synthetic tests: never run hosted setup or access a real provider/private workspace.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {reserveDailyBudget,runnerInputs,resumeSnapshot} from '../tools/highlightly-actions.mjs';import {migrateHighlightlySeason} from '../assets/core.mjs';import {fixture,now,player} from './fixtures.mjs';import {publicHighlightlySnapshot} from '../tools/highlightly-public.mjs';
const options={now:new Date('2026-11-20T09:00:00Z'),runId:'123'};
const snapshot=()=>{const d=fixture();d.provider='Highlightly';d.scope={startDate:'2026-11-14',endDate:'2026-11-14',timeZone:'America/New_York',completeSeason:false};d.games.forEach(g=>g.provider='Highlightly');d.lines.forEach(l=>l.provider='Highlightly');return publicHighlightlySnapshot(d,{provider:'Highlightly',season:'2026-27',publicationAllowed:true,publicDatasetAllowed:true,approvedBy:'repository-owner',publicScope:'normalized-fantasy-stats',confirmedAt:now,source:'SYNTHETIC owner attestation'});};
test('durable reservation blocks every second attempt on same UTC day including retry after failure',()=>{const r=reserveDailyBudget(null,options);assert.equal(r.reservedRequests,90);assert.throws(()=>reserveDailyBudget(r,options),/already reserved/);assert.throws(()=>reserveDailyBudget(r,{...options,runId:'124'}),/already reserved/);assert.equal(reserveDailyBudget(r,{...options,now:new Date('2026-11-21T09:00:00Z')}).dayUTC,'2026-11-21');});
test('malformed, future and incomplete reservation state fails closed',()=>{const r=reserveDailyBudget(null,options);for(const bad of [{...r,dayUTC:'invalid'},{...r,dayUTC:'2026-11-21'},{...r,reservedRequests:0},{...r,provider:'other'},{}])assert.throws(()=>reserveDailyBudget(bad,options));});
test('fresh hosted inputs reconstruct only verified identities and classifications from public data',()=>{const d=snapshot();d.games[0].type='unknown';d.games[0].classification=null;const r=runnerInputs(d);assert.equal(r.identities.players.length,3);assert.deepEqual(r.types.games,[]);assert.equal(r.candidate.publicationPolicy,'private-only-rights-unverified');assert.equal(r.authorization.refreshSchedule,undefined);assert.throws(()=>runnerInputs({...d,provider:'API-Sports'}));});
test('workflow reserves and pushes budget before provider use; explicitly rebuilds Pages without artifacts',async()=>{const s=await fs.readFile('.github/workflows/highlightly-daily.yml','utf8');assert.match(s,/cron: '17 9 \* \* \*'/);assert.match(s,/cancel-in-progress: false/);assert.match(s,/vars.HIGHLIGHTLY_DAILY_ENABLED == 'true'/);assert.ok(s.indexOf('node tools/highlightly-git-push.mjs')<s.indexOf('run: node tools/highlightly-season-runner.mjs'));assert.match(s,/pages: write/);assert.match(s,/gh api --method POST "repos\/\$REPOSITORY\/pages\/builds"/);assert.match(s,/\[ "\$commit" = "\$EXPECTED_COMMIT" \]/);assert.doesNotMatch(s,/upload-artifact|actions\/cache|git add (?:-A|\.)/);assert.match(s,/git add -- data\/manifest.json data\/manifest.previous.json data\/releases\//);});

test('hosted run refuses last UTC hour so its forty-five-minute timeout cannot cross midnight',()=>{assert.throws(()=>reserveDailyBudget(null,{...options,now:new Date('2026-11-20T23:01:00Z')}),/before 23:00/);});
test('commissioning reservation prevents refresh on November 10 and permits November 11',async()=>{const seeded=reserveDailyBudget(null,{now:new Date('2026-11-10T00:00:00Z'),runId:'0'});assert.throws(()=>reserveDailyBudget(seeded,{now:new Date('2026-11-10T10:00:00Z'),runId:'987'}),/already reserved/);assert.equal(reserveDailyBudget(seeded,{now:new Date('2026-11-11T09:00:00Z'),runId:'988'}).dayUTC,'2026-11-11');});
test('validation-only dispatch defaults safe and skips all provider or publication mutation steps',async()=>{const s=await fs.readFile('.github/workflows/highlightly-daily.yml','utf8');assert.match(s,/validation_only:[\s\S]*?type: boolean\s+default: true/);for(const name of ['Check provider secret only for a data refresh','Commit full UTC budget reservation before any provider call','Reconstruct private inputs on the fresh runner','Backfill missing season games and refresh recent corrections'])assert.ok(s.includes(`- name: ${name}\n${name==='Reconstruct private inputs on the fresh runner'?'        id: prepare\n':''}        if: github.event_name != 'workflow_dispatch' || !inputs.validation_only`));assert.match(s,/EXPECTED_COMMIT: \$\{\{ steps.target.outputs.commit \}\}/);});

test('durable normalized checkpoint resumes without removing already verified public games',()=>{const current=snapshot(),next=structuredClone(current);assert.equal(resumeSnapshot(current,null),current);assert.equal(resumeSnapshot(current,next),next);next.games=[];next.lines=[];assert.throws(()=>resumeSnapshot(current,next),/remove/);});
test('workflow publishes durable partial progress even when collection fails after prepare',async()=>{const s=await fs.readFile('.github/workflows/highlightly-daily.yml','utf8');assert.match(s,/name: Validate and push only normalized public files\n        if: always\(\) && steps.prepare.outcome == 'success'/);assert.match(s,/node tools\/highlightly-season-runner.mjs publish/);});

test('verified hosted scheduling metadata uses the deployed off-hour cron without inventing activation',()=>{const d=snapshot();d.refreshSchedule={configured:true,verified:true,description:'Prior verified schedule'};assert.match(runnerInputs(d).authorization.refreshSchedule.description,/09:17 UTC/);d.refreshSchedule.verified=false;assert.equal(runnerInputs(d).authorization.refreshSchedule,undefined);});

test('optional verified identity supplement preserves absent behavior and all existing mappings',()=>{
 const current=migrateHighlightlySeason(snapshot()),before=structuredClone(current);
 assert.deepEqual(runnerInputs(current).identities.players,current.players);
 assert.deepEqual(runnerInputs(current,null).identities.players,current.players);
 const additional={...player(4),name:current.players[0].name,extra:'must not be copied'};
 const supplemental={provider:'Highlightly',season:'2026-27',players:[{...current.players[0],source:'SYNTHETIC alternate provenance'},additional]};
 const inputs=runnerInputs(current,supplemental);
 assert.equal(inputs.identities.players.length,4);assert.deepEqual(inputs.identities.players.slice(0,3),current.players);
 assert.equal(inputs.identities.players[3].nbaId,4);assert.equal(inputs.identities.players[3].extra,undefined);
 assert.deepEqual(current,before);assert.equal(inputs.candidate.players.length,4);assert.deepEqual(inputs.candidate.players.slice(0,3),current.players);
});
test('verified identity supplement rejects wrong namespace, invalid provenance, duplicates and both collision directions',()=>{
 const current=snapshot(),document={provider:'Highlightly',season:'2026-27',players:[player(4)]};
 for(const bad of [{...document,provider:'other'},{...document,season:'2025-26'},{...document,players:[{...player(4),source:''}]},{...document,players:[player(4),player(4)]},{...document,players:[{...player(4),nbaId:1}]},{...document,players:[{...player(4),providerId:101}]}])assert.throws(()=>runnerInputs(current,bad));
});
test('prepare reads only the optional reviewed identity file and fails closed for non-missing read errors',async()=>{
 const source=await fs.readFile('tools/highlightly-actions.mjs','utf8');
 assert.ok(source.includes("readJSON('config/highlightly-identities.verified.json').catch(e=>{if(e.code==='ENOENT')return null;throw e;})"));
 assert.ok(source.includes('runnerInputs(resumeSnapshot(await published(),checkpoint),verifiedIdentities)'));
});

test('committed identity supplement validates against the currently published identity namespace',async()=>{
 const extra=JSON.parse(await fs.readFile('config/highlightly-identities.verified.json','utf8'));
 const manifest=JSON.parse(await fs.readFile('data/manifest.json','utf8'));
 const current=JSON.parse(await fs.readFile(manifest.file,'utf8'));
 const r=runnerInputs(current,extra);
 // The complete provider registry includes players whose NBA link is still
 // unknown. Only the verified subset belongs in the NBA identity map.
 assert.ok(r.candidate.players.length>=current.players.length);
 assert.deepEqual(r.identities.players,r.candidate.players.filter(p=>p.nbaId!=null));
 for(const p of current.players){
  const retained=r.candidate.players.find(x=>x.providerId===p.providerId);
  assert.ok(retained);assert.equal(retained.playerKey,`highlightly:${p.providerId}`);
  if(p.nbaId!=null)assert.equal(retained.nbaId,p.nbaId);
 }
 assert.deepEqual(JSON.parse(JSON.stringify(r.candidate.games)),current.games);
 assert.deepEqual(r.candidate.lines.map(({nbaId,...line})=>line),current.lines.map(({nbaId,...line})=>line));
});

test('provider-only identities and their statistics survive hosted preparation without invented NBA links',()=>{
 for(const unknownCount of [1,3]){
  const current=migrateHighlightlySeason(snapshot()),unknownIds=new Set(current.players.slice(0,unknownCount).map(p=>p.providerId));
  for(const p of current.players)if(unknownIds.has(p.providerId))p.nbaId=null;
  for(const line of current.lines)if(unknownIds.has(line.providerId))line.nbaId=null;
  current.positions.entries=current.positions.entries.filter(p=>current.players.some(x=>x.nbaId===p.nbaId));
  const before=structuredClone(current),extra={provider:'Highlightly',season:'2026-27',players:[{...player(4),name:current.players[0].name}]};
  for(const supplement of [null,extra]){
   const r=runnerInputs(current,supplement);
   assert.deepEqual(r.candidate.players.slice(0,current.players.length),current.players);
   assert.deepEqual(r.candidate.lines,current.lines);assert.deepEqual(r.candidate.games,current.games);
   assert.deepEqual(r.identities.players,r.candidate.players.filter(p=>p.nbaId!=null));
   for(const id of unknownIds)assert.equal(r.identities.players.some(p=>p.providerId===id),false);
   assert.equal(new Set(r.candidate.players.map(p=>p.providerId)).size,r.candidate.players.length);
   assert.deepEqual(current,before);
  }
 }
});

test('runner upgrades provider-only identities and all existing lines without rekeying or name joins',()=>{
 const current=migrateHighlightlySeason(snapshot());const unknown=current.players[0];unknown.nbaId=null;current.positions.entries=current.positions.entries.filter(p=>p.nbaId!==1);current.lines.filter(l=>l.providerId===unknown.providerId).forEach(l=>l.nbaId=null);
 const before=structuredClone(current),extra={provider:'Highlightly',season:'2026-27',players:[{...player(1),name:'Different reviewed label'}]};
 const result=runnerInputs(current,extra);assert.equal(result.candidate.players.length,current.players.length);assert.equal(result.candidate.players[0].playerKey,unknown.playerKey);assert.equal(result.candidate.lines.find(l=>l.providerId===101).nbaId,1);assert.deepEqual(result.candidate.lines[0].stats,current.lines[0].stats);assert.deepEqual(current,before);
 assert.equal(runnerInputs(current).identities.players.some(p=>p.providerId===101),false);
 const collision={...extra,players:[{...player(1),nbaId:2}]};assert.throws(()=>runnerInputs(current,collision),/collision/);
});
