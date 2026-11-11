// Synthetic participation only; reference tuples were independently checked against dated official sources.
import test from 'node:test';import assert from 'node:assert/strict';
import {DOCUMENTED_PARTICIPATION_REVIEWS} from '../tools/highlightly-participation-reviews.mjs';
import {checkOfficialParticipation} from '../tools/highlightly-participation-reference.mjs';
import {publicRefreshIssue} from '../tools/highlightly-public.mjs';
import {runSeasonBackfill,seedSeasonInventory} from '../tools/highlightly-backfill.mjs';
import {emptyPending,normalizePendingBox} from '../tools/highlightly-pending.mjs';
import {normalizeMatch,statisticNames} from '../tools/highlightly.mjs';
import {stats} from './fixtures.mjs';
const now='2026-11-20T09:00:00.000Z';
test('all 12 documented tuples require review only for played, never globally by player or team',()=>{
 assert.equal(DOCUMENTED_PARTICIPATION_REVIEWS.length,12);assert.equal(new Set(DOCUMENTED_PARTICIPATION_REVIEWS.map(e=>e.providerId)).size,7);
 for(const e of DOCUMENTED_PARTICIPATION_REVIEWS){
  const game={id:e.gameId,start:`${e.reviewedDateET}T20:00:00Z`},line={providerId:e.providerId,teamId:e.reviewedTeamId,participation:'played'};
  const result=checkOfficialParticipation([line],game,now);assert.equal(result.status,'review-required');assert.equal(result.providerId,e.providerId);assert.equal(result.source,e.source);
  assert.equal(checkOfficialParticipation([{...line,participation:'missing'}],game,now),null);assert.equal(checkOfficialParticipation([{...line,participation:'dnp'}],game,now),null);
  assert.equal(checkOfficialParticipation([line],{...game,id:9999999},now),null);assert.equal(checkOfficialParticipation([{...line,providerId:9999999}],game,now),null);
 }
});
test('intent notices remain distinct and public projection cannot invent sources or transmit free-form data',()=>{
 for(const id of [65955512,76595117])assert.equal(DOCUMENTED_PARTICIPATION_REVIEWS.find(e=>e.providerId===id).eventType,'announced-intent-to-waive');
 const e=DOCUMENTED_PARTICIPATION_REVIEWS[0],reference=checkOfficialParticipation([{providerId:e.providerId,teamId:e.reviewedTeamId,participation:'played'}],{id:e.gameId,start:`${e.reviewedDateET}T20:00:00Z`},now);
 reference.rawResponse='PRIVATE';const issue={code:'source-data-error',sourceErrorCode:'official-participation-review',attemptedAt:now,preservedPreviousBoxScore:false,participationReference:reference};
 const projected=publicRefreshIssue(issue);assert.equal(projected.participationReference.status,'review-required');assert.equal(JSON.stringify(projected).includes('PRIVATE'),false);
 assert.throws(()=>publicRefreshIssue({...issue,participationReference:{...reference,source:'https://unverified.invalid'}}),/participation review/);
});
const match=()=>({id:1547583,league:'NBA',season:2027,date:'2026-10-23T20:00:00Z',state:{description:'Finished',score:{homeTeam:[5,5,5,5],awayTeam:[5,5,5,5]}},homeTeam:{id:39,abbreviation:'MIL'},awayTeam:{id:20,abbreviation:'SYN'}});
const box=(providerId=65958167,empty=false)=>[39,20].map((id,i)=>({team:{id},boxScores:[{player:{id:i?102:providerId,name:'Synthetic Player'},statistics:empty&&!i?[]:[...Object.entries(statisticNames).map(([key,name])=>({name,value:stats()[key]})),{name:'Total Minutes Played',value:30},{name:'Total Offensive Rebounds',value:2},{name:'Total Defensive Rebounds',value:4}]}]}));
function options(raw=match(),extra={}){const page={data:[raw],plan:{tier:'BASIC',message:'All data available with current plan.'},pagination:{offset:0,limit:100,totalCount:1}};const entries=new Map();return {cache:{get:async key=>entries.get(key),put:async(key,value)=>entries.set(key,value)},now:()=>Date.parse(now),inventoryState:seedSeasonInventory([page],{now}),identities:{provider:'Highlightly',season:'2026-27',players:[]},schedule:{season:'2026-27',seasonStart:{date:'2026-10-20',source:'SYNTHETIC',verifiedAt:now},games:[{dateET:'2026-10-23',timeET:'16:00',home:'MIL',away:'SYN',type:'regular',source:'SYNTHETIC',verifiedAt:now}]},client:async()=>box(),maxCorrectionGames:0,...extra};}
test('targeted played tuple blocks whole new box, while absent stats import as missing without NBA mapping',async()=>{
 const blocked=await runSeasonBackfill(options());assert.equal(blocked.snapshot.lines.length,0);assert.equal(blocked.snapshot.games[0].refreshIssue.sourceErrorCode,'official-participation-review');
 const raw=match();raw.state.score.homeTeam=[0,0,0,0];const missing=await runSeasonBackfill(options(raw,{client:async()=>box(65958167,true)}));assert.equal(missing.snapshot.games[0].statsState,'available');assert.equal(missing.snapshot.lines[0].participation,'missing');assert.equal(missing.snapshot.lines[0].stats,null);assert.equal(missing.snapshot.lines[0].nbaId,null);
});
test('pending replay cannot bypass targeted review and preserves previously validated complete box',async()=>{
 const raw=match(),previous=(await runSeasonBackfill(options(raw,{client:async()=>box(101)}))).snapshot;
 const pendingState={...emptyPending(),games:[normalizePendingBox(box(),normalizeMatch(raw,new Map()),'2026-11-20T09:00:06.100Z')]};
 const result=await runSeasonBackfill(options(raw,{previous,pendingState,now:()=>Date.parse(now)+12200,client:async()=>{throw Error('No provider call');}}));
 assert.deepEqual(result.snapshot.lines,previous.lines);assert.equal(result.snapshot.games[0].statsState,'available');assert.equal(result.snapshot.games[0].refreshIssue.sourceErrorCode,'official-participation-review');assert.equal(result.snapshot.games[0].refreshIssue.preservedPreviousBoxScore,true);assert.equal(result.pendingState.games.length,0);
});
