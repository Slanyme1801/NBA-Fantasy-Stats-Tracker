import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {encryptResponse} from '../tools/highlightly-quarantine.mjs';
import {auditCapturedResponse,inspectCounterFailures,TARGET_GAME} from '../tools/highlightly-quarantine-audit.mjs';
import {statisticNames} from '../tools/highlightly.mjs';import {stats} from './fixtures.mjs';
const game={id:TARGET_GAME,home:{id:10},away:{id:20},finalScores:[20,20]};
const body=()=>[10,20].map((id,i)=>({team:{id},boxScores:[{player:{id:101+i,name:'NEVER_DISCLOSE'},statistics:[...Object.entries(statisticNames).map(([k,name])=>({name,value:stats()[k]})),{name:'Total Minutes Played',value:30},{name:'Total Offensive Rebounds',value:2},{name:'Total Defensive Rebounds',value:4}]}]}));
const key='SYNTHETIC_PRIVATE_KEY';
const archive=(b,extra={})=>encryptResponse({key,endpoint:`/box-score/${TARGET_GAME}`,status:200,fetchedAt:'2026-11-13T08:56:59.740Z',bodyBytes:Buffer.from(JSON.stringify(b)),...extra});
test('offline audit validates a complete encrypted fixture without exposing the key, names or raw body',()=>{
 const report=auditCapturedResponse(archive(body()),{key,game});assert.equal(report.parserAccepted,true);assert.deepEqual(report.counterFailures,[]);
 assert.doesNotMatch(JSON.stringify(report),/PRIVATE_KEY|NEVER_DISCLOSE|bodyBytes|ciphertext|Total Points Scored/);
});
test('counter diagnostics identify missing, fractional and string fields without exposing raw values',()=>{
 const b=body();b[0].boxScores[0].statistics[0].value='NEVER_DISCLOSE';b[0].boxScores[0].statistics[1].value=-1;b[0].boxScores[0].statistics[2].value=1.5;b[0].boxScores[0].statistics.pop();
 const report=auditCapturedResponse(archive(b),{key,game});assert.equal(report.parserAccepted,false);assert.equal(report.counterFailures.length,1);
 assert.deepEqual(report.counterFailures[0].invalid.map(x=>x.kind),['other-string','negative-number','fractional-number','absent']);assert.doesNotMatch(JSON.stringify(report),/NEVER_DISCLOSE|PRIVATE_KEY|minutesZero|positiveRequired|presentRequiredAllZero|requiredPresent/);
});
test('incomplete all-zero rows are distinguished from positive activity but not repaired by diagnostic',()=>{
 const b=body();b[0].boxScores.push({player:{id:103},statistics:[{name:'Total Minutes Played',value:0}]});const before=structuredClone(b),r=inspectCounterFailures(b);
 assert.equal(r[0].minutesZero,true);assert.equal(r[0].presentRequiredAllZero,true);assert.equal(r[0].positiveRequired,0);assert.deepEqual(b,before);
});
test('wrong key, endpoint, status, capture or game cannot be audited',()=>{
 for(const extra of [{endpoint:'/box-score/2'},{status:500},{capture:{complete:false,reason:'stream-incomplete'}}])assert.throws(()=>auditCapturedResponse(archive(body(),extra),{key,game}));
 assert.throws(()=>auditCapturedResponse(archive(body()),{key:'wrong',game}));assert.throws(()=>auditCapturedResponse(archive(body()),{key,game:{...game,id:2}}));
});
test('audit workflow is read-only and never runs the provider client or uploads decrypted data',async()=>{
 const w=await fs.readFile('.github/workflows/highlightly-quarantine-audit.yml','utf8'),s=await fs.readFile('tools/highlightly-quarantine-audit.mjs','utf8');
 assert.match(w,/contents: read/);assert.match(w,/persist-credentials: false/);assert.doesNotMatch(w,/contents: write|upload-artifact|git push|highlightly-season-runner/);
 assert.doesNotMatch(s,/writeFile|makeHighlightlyClient|child_process|https?:\/\//);assert.match(s,/Network prohibited/);
});
