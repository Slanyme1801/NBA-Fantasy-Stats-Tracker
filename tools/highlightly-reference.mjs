// Reviewed official evidence, deliberately independent of provider names and statistics.
import {statisticNames} from './highlightly.mjs';
export const OFFICIAL_REFERENCE={gameId:1547577,nbaGameId:'0022600008',source:'https://www.nba.com/game/0022600008/box-score',verifiedAt:'2026-11-11T04:43:30.341019+00:00'};
const expectations=[{nbaId:1626157,providerId:47043992,stat:'stl',expected:0},{nbaId:1628404,providerId:null,stat:'stl',expected:3},{nbaId:203903,providerId:37927457,stat:'fgm',expected:0},{nbaId:203903,providerId:37927457,stat:'fga',expected:0}];
const id=n=>Number.isSafeInteger(n)&&n>0;
// Observed labels are evidence for human review only, never identity assignments.
export function missingIdentityObservations(body,game,identities,fetchedAt){
 const known=new Set(identities.players.map(p=>p.providerId)),result=[],seen=new Set();
 for(const team of Array.isArray(body)?body:[]){
  if(![game.home.id,game.away.id].includes(team?.team?.id)||!Array.isArray(team.boxScores))continue;
  for(const row of team.boxScores){const providerId=row?.player?.id;if(!id(providerId)||known.has(providerId)||seen.has(providerId))continue;seen.add(providerId);
   const label=row.player.name;const name=typeof label==='string'&&label.length<=100&&/^[\p{L}\p{M} .,'’\-]+$/u.test(label)?label:null;
   result.push({gameId:game.id,teamId:team.team.id,providerId,name,fetchedAt});
  }
 }
 return result.slice(0,100);
}
export function checkOfficialReference(body,game,identities,checkedAt){
 if(game.id!==OFFICIAL_REFERENCE.gameId)return null;
 const checks=expectations.map(e=>{
  const person=identities.players.find(p=>p.nbaId===e.nbaId),providerId=person?.providerId??null;
  const rows=(Array.isArray(body)?body:[]).flatMap(t=>Array.isArray(t?.boxScores)?t.boxScores:[]).filter(r=>r?.player?.id===providerId);
  const values=rows.length===1&&Array.isArray(rows[0].statistics)?rows[0].statistics.filter(s=>s?.name===statisticNames[e.stat]):[];
  const observed=values.length===1&&Number.isSafeInteger(values[0].value)&&values[0].value>=0?values[0].value:null;
  const verifiedIdentity=providerId!==null&&(!e.providerId||providerId===e.providerId);
  return {nbaId:e.nbaId,providerId,stat:e.stat,expected:e.expected,observed,status:!verifiedIdentity||observed===null?'unverifiable':observed===e.expected?'verified':'mismatch'};
 });
 return {...OFFICIAL_REFERENCE,checkedAt,status:checks.some(c=>c.status==='mismatch')?'mismatch':checks.some(c=>c.status==='unverifiable')?'unverifiable':'verified',checks};
}
