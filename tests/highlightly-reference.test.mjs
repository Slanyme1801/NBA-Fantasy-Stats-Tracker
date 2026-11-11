// Synthetic evidence only. No provider request or external publication.
import test from 'node:test';import assert from 'node:assert/strict';
import {checkOfficialReference,missingIdentityObservations} from '../tools/highlightly-reference.mjs';
import {publicRefreshIssue} from '../tools/highlightly-public.mjs';
const time='2026-11-11T12:00:00.000Z',game={id:1547577,home:{id:10},away:{id:20}};
const people=()=>({players:[{nbaId:1626157,providerId:47043992},{nbaId:203903,providerId:37927457},{nbaId:1628404,providerId:45941252}]});
const body=()=>[{team:{id:10},boxScores:[{player:{id:47043992,name:'Karl-Anthony Towns'},statistics:[{name:'Total Steals',value:0}]},{player:{id:37927457,name:'Jordan Clarkson'},statistics:[{name:'Successful Field Goals',value:0},{name:'Total Field Goals',value:0}]},{player:{id:45941252,name:'Josh Hart'},statistics:[{name:'Total Steals',value:3}]}]}];
test('official comparison uses independently verified IDs and exact received counters',()=>{
 assert.equal(checkOfficialReference(body(),game,people(),time).status,'verified');
 const changed=body();changed[0].boxScores[0].statistics[0].value=1;const before=structuredClone(changed);assert.equal(checkOfficialReference(changed,game,people(),time).status,'mismatch');assert.deepEqual(changed,before);
});
test('reviewed Hart provider ID works without global NBA mapping; conflicting mapping still blocks',()=>{
 const ids=people();ids.players.pop();const r=checkOfficialReference(body(),game,ids,time);assert.equal(r.status,'verified');assert.equal(r.checks.find(c=>c.nbaId===1628404).providerId,45941252);
 const wrong=body();wrong[0].boxScores[0].statistics[0].value=1;assert.equal(checkOfficialReference(wrong,game,ids,time).status,'mismatch');
 const swapped=people();swapped.players[0].providerId=999;assert.equal(checkOfficialReference(body(),game,swapped,time).status,'unverifiable');
 assert.equal(checkOfficialReference([],game,people(),time).status,'unverifiable');
 assert.equal(checkOfficialReference(body(),{...game,id:2},people(),time),null);
});
test('unknown player diagnostics are normalized, bounded and do not copy arbitrary payloads',()=>{
 const ids=people();ids.players.pop();const b=body();b[0].boxScores[2].secret='SYNTHETIC SECRET';const observed=missingIdentityObservations(b,game,ids,time);
 assert.deepEqual(observed,[{gameId:1547577,teamId:10,providerId:45941252,name:'Josh Hart',fetchedAt:time}]);
 b[0].boxScores[2].player.name='https://secret.invalid/?token=abc';assert.equal(missingIdentityObservations(b,game,ids,time)[0].name,null);
 b[0].boxScores[2].player.name='A'.repeat(101);assert.equal(missingIdentityObservations(b,game,ids,time)[0].name,null);
});
test('public diagnostic projection allowlists evidence and rejects malformed fields',()=>{
 const ids=people();ids.players.pop();const issue={code:'source-data-error',attemptedAt:time,preservedPreviousBoxScore:false,reason:'PRIVATE',identityObservations:missingIdentityObservations(body(),game,ids,time),officialReference:checkOfficialReference(body(),game,ids,time)};
 issue.identityObservations[0].rawCache='PRIVATE';issue.officialReference.rawCache='PRIVATE';issue.officialReference.checks[0].rawCache='PRIVATE';assert.equal(JSON.stringify(publicRefreshIssue(issue)).includes('PRIVATE'),false);
 const bad=structuredClone(issue);bad.identityObservations[0].name='Bearer token=abc';assert.throws(()=>publicRefreshIssue(bad),/identity observation/);
 const badReference=structuredClone(issue);badReference.officialReference.source='https://evil.invalid';assert.throws(()=>publicRefreshIssue(badReference),/official reference/);
});
test('a conflicting NBA assignment to a reviewed provider ID is rejected without name matching',()=>{
 const ids=people();ids.players.find(p=>p.providerId===45941252).nbaId=99999;assert.equal(checkOfficialReference(body(),game,ids,time).status,'unverifiable');
});
