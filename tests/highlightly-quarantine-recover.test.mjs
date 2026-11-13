// Synthetic response only. The provider archive is never decrypted by local tests.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {fixture,stats,player,game,now} from './fixtures.mjs';
import {migrateHighlightlySeason,aggregate} from '../assets/core.mjs';
import {statisticNames} from '../tools/highlightly.mjs';
import {publicHighlightlySnapshot} from '../tools/highlightly-public.mjs';
import {recoverReviewedGame,checkSynchronizedCheckpoint} from '../tools/highlightly-quarantine-recover.mjs';
const authorization={provider:'Highlightly',season:'2026-27',publicationAllowed:true,publicDatasetAllowed:true,approvedBy:'repository-owner',publicScope:'normalized-fantasy-stats',confirmedAt:now,source:'SYNTHETIC authorization'};
const current=()=>{
 const d=fixture();d.provider='Highlightly';d.scope={startDate:'2026-10-20',endDate:'2026-11-15',timeZone:'America/New_York',completeSeason:false};d.games.forEach(g=>g.provider='Highlightly');d.lines.forEach(l=>l.provider='Highlightly');
 d.players.push({...player(1642359),providerId:78180812});
 d.games.push({...game(1547577,'2026-10-23T23:00:00Z'),provider:'Highlightly',home:{id:2,code:'BOS'},away:{id:26,code:'NY'},finalScores:[107,103],statsState:'missing',refreshIssue:{code:'source-data-error',sourceErrorCode:'counter-invalid',attemptedAt:now,preservedPreviousBoxScore:false}});
 return publicHighlightlySnapshot(migrateHighlightlySeason(d),authorization);
};
const row=(id,s={},minutes=0)=>({player:{id,name:'Synthetic Label'},statistics:[...Object.entries(statisticNames).map(([k,name])=>({name,value:s[k]??0})),{name:'Total Minutes Played',value:minutes},{name:'Total Offensive Rebounds',value:s.reb?2:0},{name:'Total Defensive Rebounds',value:s.reb?4:0}]});
const body=()=>[{team:{id:2},boxScores:[row(101,stats({pts:107,fgm:40,fga:50,fg3m:17,fg3a:20,ftm:10,fta:10}),30)]},{team:{id:26},boxScores:[row(102,stats({pts:103,fgm:40,fga:50,fg3m:13,fg3a:20,ftm:10,fta:10}),30),row(47043992),row(45941252,{stl:3},1),row(37927457),row(78180812,{},'SYNTHETIC_UNRECOGNIZED_LABEL')]}];
const options=()=>({body:body(),fetchedAt:'2026-11-13T08:57:04.004Z',now:'2026-11-20T12:00:00Z'});
test('offline recovery adds exactly the reviewed game, retains old data and gives confirmed DNP zero games played',()=>{
 const d=current(),before=structuredClone(d),r=recoverReviewedGame(d,options());assert.deepEqual(d,before);assert.equal(r.snapshot.games.find(g=>g.id===1547577).statsState,'available');assert.equal(r.addedLines,6);
 assert.deepEqual(r.snapshot.lines.slice(0,d.lines.length),d.lines);assert.deepEqual(r.snapshot.games[0],d.games[0]);assert.equal(r.snapshot.coverageCheckedAt,d.coverageCheckedAt);
 const dadiet=r.snapshot.lines.find(l=>l.providerId===78180812);assert.equal(dadiet.participation,'dnp');assert.equal(dadiet.stats,null);assert.equal(aggregate(r.snapshot,1642359,{asOf:'2026-11-20'}).gp,0);
});
test('offline recovery refuses bad official counters, activity contradictions, partial old rows and repeat publication',()=>{
 const d=current();for(const mutate of [b=>b[1].boxScores.find(r=>r.player.id===45941252).statistics.find(s=>s.name==='Total Steals').value=2,b=>b[1].boxScores.at(-1).statistics.find(s=>s.name==='Total Assists').value=1]){const o=options();mutate(o.body);assert.throws(()=>recoverReviewedGame(d,o));}
 const recovered=recoverReviewedGame(d,options()).snapshot;assert.throws(()=>recoverReviewedGame(recovered,options()),/Only the reviewed/);
 const partial=current();partial.lines.push({...partial.lines[0],gameId:1547577,teamId:2});assert.throws(()=>recoverReviewedGame(partial,options()),/Only the reviewed/);
});
test('recovery refuses future timestamps and leaves the caller untouched after failed validation',()=>{
 const d=current(),before=structuredClone(d);assert.throws(()=>recoverReviewedGame(d,{...options(),fetchedAt:'2026-11-21T00:00:00Z'}),/chronology/);assert.deepEqual(d,before);
});
test('recovery never overwrites unpublished checkpoint progress',()=>{
 const d=current();assert.doesNotThrow(()=>checkSynchronizedCheckpoint(d,structuredClone(d)));
 const next=structuredClone(d);next.updatedAt='2026-11-21T00:00:00Z';assert.throws(()=>checkSynchronizedCheckpoint(d,next),/Unpublished checkpoint differs/);
 const changed=structuredClone(d);changed.games.at(-1).refreshIssue.sourceErrorCode='changed';assert.throws(()=>checkSynchronizedCheckpoint(d,changed),/Unpublished checkpoint differs/);
});
test('workflow serializes with daily import, never invokes provider client, and only stages public data',async()=>{
 const w=await fs.readFile('.github/workflows/highlightly-quarantine-recover.yml','utf8'),s=await fs.readFile('tools/highlightly-quarantine-recover.mjs','utf8');
 assert.match(w,/group: highlightly-daily-publication/);assert.match(w,/cancel-in-progress: false/);assert.doesNotMatch(w,/highlightly-actions.mjs reserve|highlightly-season-runner|upload-artifact|--force|git add -- \.github\/highlightly-quota/);
 assert.doesNotMatch(s,/makeHighlightlyClient|recoverQuarantinedResponse|bodyBase64|privateDiagnostic/);assert.match(s,/Provider network prohibited/);assert.match(s,/Quota changed during offline recovery/);
});
