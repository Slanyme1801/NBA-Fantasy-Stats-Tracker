import vm from 'node:vm';import os from 'node:os';import path from 'node:path';
import {publishLocal} from '../tools/publish.mjs';
import {runnerInputs} from '../tools/highlightly-actions.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {fixture,now as fixtureTime} from './fixtures.mjs';
import {collectionFreshness} from '../assets/core.mjs';
import {healthProblems,checkLive} from '../tools/tracker-health.mjs';
import {recoveryCandidate} from '../tools/tracker-recover-publication.mjs';
import {publicHighlightlySnapshot} from '../tools/highlightly-public.mjs';
import {checksum} from '../tools/files.mjs';
const clock=new Date('2026-11-16T18:00:00Z');
function snapshot(){const d=fixture();d.provider='Highlightly';d.scope={startDate:'2026-11-14',endDate:'2026-11-15',timeZone:'America/New_York',completeSeason:false};d.games.forEach(g=>g.provider='Highlightly');d.lines.forEach(l=>l.provider='Highlightly');const s=publicHighlightlySnapshot(d,{provider:'Highlightly',season:'2026-27',publicationAllowed:true,publicDatasetAllowed:true,approvedBy:'repository-owner',publicScope:'normalized-fantasy-stats',confirmedAt:fixtureTime,source:'SYNTHETIC attestation'});s.backfillProgress={inventoryOffset:1,completedGamesSeen:1,outsideDateScopeFinished:0,regularGamesSeen:1,verifiedRegularBoxScores:1,verifiedBoxScores:1,inventoryTotal:1,budgetExhausted:false,attemptedAt:fixtureTime,inventoryComplete:true,inventoryDayUTC:'2026-11-16',pendingGames:0,sourceFailureGames:0,unmappedGames:0,unclassifiedGames:0};return s;}
test('collection freshness relies on inventory and coverage, not successful network or last game',()=>{
 const s=snapshot();assert.equal(collectionFreshness(s,clock).state,'current');assert.deepEqual(healthProblems(s,{now:clock}),[]);
 s.scope.endDate='2026-11-14';assert.deepEqual(healthProblems(s,{now:clock}),[]); // last game can predate current inventory
 s.games=[];s.lines=[];s.backfillProgress.verifiedBoxScores=0;s.backfillProgress.verifiedRegularBoxScores=0;assert.equal(collectionFreshness(s,clock).state,'current');assert.deepEqual(healthProblems(s,{now:clock}),[]); // no-game day
 s.updatedAt='2026-11-16T17:59:00Z';s.backfillProgress.inventoryDayUTC='2026-11-14';assert.equal(collectionFreshness(s,clock).state,'stale');assert.ok(healthProblems(s,{now:clock}).length);
});
test('deadline, midnight, future day and incomplete fresh attempt cannot give false healthy',()=>{
 const s=snapshot();s.backfillProgress.inventoryDayUTC='2026-11-15';
 assert.equal(collectionFreshness(s,new Date('2026-11-16T15:59:00Z')).state,'current');
 assert.equal(collectionFreshness(s,new Date('2026-11-16T16:00:00Z')).state,'stale');
 assert.equal(collectionFreshness(s,new Date('2026-11-16T00:00:00Z')).state,'current');
 s.backfillProgress.inventoryDayUTC='2026-11-17';assert.equal(collectionFreshness(s,clock).state,'stale');
 s.backfillProgress.inventoryDayUTC='2026-11-16';s.backfillProgress.inventoryComplete=false;assert.equal(collectionFreshness(s,clock).state,'incomplete');
 for(const field of ['pendingGames','sourceFailureGames','unmappedGames','unclassifiedGames']){const bad=snapshot();bad.backfillProgress[field]=1;assert.equal(collectionFreshness(bad,clock).state,'incomplete');assert.ok(healthProblems(bad,{now:clock}).length);}
});
test('offline recovery selects only a strictly newer complete non-regressing retained checkpoint',()=>{
 const current=snapshot(),next=structuredClone(current);next.updatedAt='2026-11-16T12:00:00Z';
 assert.ok(recoveryCandidate(current,next,{now:clock}));assert.equal(recoveryCandidate(current,current,{now:clock}),null);
 const older=structuredClone(current);older.updatedAt='2026-11-14T12:00:00Z';assert.equal(recoveryCandidate(current,older,{now:clock}),null);
 for(const mutate of [s=>s.backfillProgress.pendingGames=1,s=>s.backfillProgress.inventoryDayUTC='2026-11-14',s=>{s.games=[];s.lines=[];},s=>{s.lines=s.lines.slice(1);},s=>s.games[0].start='2026-11-15T02:00:00Z']){const bad=structuredClone(next);mutate(bad);assert.throws(()=>recoveryCandidate(current,bad,{now:clock}));}
});
test('live monitor validates exact manifest and content hash with no provider request',async()=>{
 const s=snapshot(),bytes=Buffer.from(JSON.stringify(s)),manifest={file:'data/releases/test.json',sha256:checksum(bytes),updatedAt:s.updatedAt};const seen=[];
 await checkLive(manifest,{fetcher:async url=>{seen.push(url.href);return new Response(url.pathname.endsWith('/manifest.json')?JSON.stringify(manifest):bytes);}});
 assert.equal(seen.length,2);assert.ok(seen.every(x=>x.startsWith('https://slanyme1801.github.io/')));
 for(const fetcher of [async()=>new Response('bad',{status:503}),async()=>new Response(JSON.stringify({...manifest,sha256:'bad'})),async url=>new Response(url.pathname.endsWith('/manifest.json')?JSON.stringify(manifest):'corrupt')])await assert.rejects(checkLive(manifest,{fetcher}));
});
test('independent workflow shares collector lock and has no provider secret, call, quota deletion or notification subscription',async()=>{
 const w=await fs.readFile('.github/workflows/tracker-health.yml','utf8');assert.match(w,/group: highlightly-daily-publication/);assert.match(w,/workflow_run:/);assert.match(w,/cron: '37 11,18/);assert.match(w,/if: always\(\)/);assert.match(w,/if: always\(\) && steps.verified.outcome == 'success'/);assert.doesNotMatch(w,/HIGHLIGHTLY_API_KEY|secrets\.|issues:|actions: write|reserve|rm /);
 const ui=await fs.readFile('assets/companion.js','utf8');assert.match(ui,/statusPanel\(true\)\+collectionNotice\(currentData\)/);
 const r=await fs.readFile('tools/tracker-recover-publication.mjs','utf8');assert.doesNotMatch(r,/makeHighlightlyClient|decryptRecord|highlightly-quota|fetch\(/);
});

test('offline publication preserves previous manifest and quota; rejects future and ambiguous checkpoints',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tracker-recovery-test-'));
 try{
  const current=snapshot(),next=structuredClone(current);next.updatedAt='2026-11-16T12:00:00Z';
  const authorization=runnerInputs(current).authorization;
  await fs.mkdir(path.join(root,'.github'));await fs.writeFile(path.join(root,'.github/highlightly-quota.json'),'SYNTHETIC DO NOT CHANGE');
  const original=await publishLocal(current,{root,publicationAuthorization:authorization});
  const chosen=recoveryCandidate(current,next,{now:clock});
  const result=await publishLocal(chosen.checkpoint,{root,publicationAuthorization:chosen.authorization});
  assert.notEqual(result.sha256,original.sha256);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root,'data/manifest.previous.json'))),original);
  assert.equal(await fs.readFile(path.join(root,'.github/highlightly-quota.json'),'utf8'),'SYNTHETIC DO NOT CHANGE');
  const future=structuredClone(next);future.updatedAt='2026-11-17T12:00:00Z';assert.throws(()=>recoveryCandidate(current,future,{now:clock}));
  const ambiguous=structuredClone(current);ambiguous.lines[0].stats.ast=6;assert.equal(recoveryCandidate(current,ambiguous,{now:clock}),null);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('data-page notice renders stale and incomplete warnings without claiming exhaustive freshness',async()=>{
 const source=await fs.readFile('assets/companion.js','utf8');const fn=source.slice(source.indexOf('function collectionNotice'),source.indexOf('function statusPanel'));
 for(const state of ['stale','incomplete','current']){
  const context={C:{collectionFreshness:()=>({state,inventoryDay:'2026-11-16'})},esc:x=>String(x)};vm.createContext(context);
  const html=vm.runInContext(fn+';collectionNotice({})',context);
  assert.match(html,/role="status"/);assert.match(html,/Cela ne garantit pas les matchs absents du fournisseur/);
  assert.match(html,state==='stale'?/Collecte ancienne/:state==='incomplete'?/couverture incomplète/:/périmètre contrôlé/);
 }
 assert.equal((source.match(/collectionNotice\(currentData\)/g)||[]).length,1);
});
