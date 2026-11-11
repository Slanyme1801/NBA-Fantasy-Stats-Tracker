// Durable, strictly normalized provider-ID boxes. Never contains raw responses or NBA assignments.
import {SEASON,COUNTERS,emptySeason,validateSeason} from '../assets/core.mjs';
import {PROVIDER,parseBoxScore,statisticNames} from './highlightly.mjs';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const pick=(x,keys)=>Object.fromEntries(keys.map(k=>[k,x[k]]));
const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT.*Z$/.test(x)&&Number.isFinite(Date.parse(x));
const label=x=>typeof x==='string'&&x.length<=100&&/^[\p{L}\p{M} .,'’\-]+$/u.test(x)?x:null;
const extra={minutes:'Total Minutes Played',oreb:'Total Offensive Rebounds',dreb:'Total Defensive Rebounds'};
const names={...statisticNames,...extra};
export const emptyPending=()=>({version:1,provider:PROVIDER,season:SEASON,games:[]});
const normalizedGame=g=>({...pick(g,['id','season','league','start','status','provider','finalScores']),home:pick(g.home,['id','code']),away:pick(g.away,['id','code']),type:'unknown',classification:null,statsState:'not-fetched'});
function bodyFor(entry){return [entry.game.home.id,entry.game.away.id].map(teamId=>({team:{id:teamId},boxScores:entry.players.filter(p=>p.teamId===teamId).map(p=>({player:{id:p.providerId,name:p.name},statistics:p.stats===null?[]:Object.entries(names).map(([key,name])=>({name,value:p.stats[key]}))}))}));}
export function normalizePendingBox(body,game,fetchedAt){
 parseBoxScore(body,game);
 return {game:normalizedGame(game),fetchedAt,players:body.flatMap(team=>team.boxScores.map(row=>{
  const values=new Map(row.statistics.map(s=>[s.name,s.value]));
  return {providerId:row.player.id,teamId:team.team.id,name:label(row.player.name),stats:values.size?Object.fromEntries(Object.entries(names).map(([key,name])=>[key,values.get(name)])):null};
 }))};
}
export function publicPendingBoxes(state,now=new Date().toISOString()){
 check(state?.version===1&&state.provider===PROVIDER&&state.season===SEASON&&Array.isArray(state.games)&&state.games.length<=2000,'Invalid normalized pending state');
 const seen=new Set();
 const games=state.games.map(entry=>{
  check(entry?.game&&iso(entry.fetchedAt)&&Date.parse(entry.fetchedAt)<=Date.parse(now)&&Array.isArray(entry.players)&&entry.players.length>0&&entry.players.length<=100,'Invalid normalized pending box');
  const game=normalizedGame(entry.game);
  check(game.provider===PROVIDER&&game.status==='finished'&&!seen.has(game.id),'Invalid or duplicate pending game');seen.add(game.id);
  validateSeason({...emptySeason(),provider:PROVIDER,connection:'connected',updatedAt:now,coverageCheckedAt:now,games:[game]});
  const players=entry.players.map(p=>{
   check(p&&[game.home.id,game.away.id].includes(p.teamId)&&(p.name===null||label(p.name)===p.name)&&!Object.hasOwn(p,'nbaId'),'Invalid pending player identity');
   if(p.stats!==null)check(p.stats&&[...COUNTERS,...Object.keys(extra)].every(k=>Number.isSafeInteger(p.stats[k])&&p.stats[k]>=0),'Invalid normalized pending counters');
   return {...pick(p,['providerId','teamId','name']),stats:p.stats===null?null:pick(p.stats,[...COUNTERS,...Object.keys(extra)])};
  });
  const projected={game,fetchedAt:entry.fetchedAt,players};parseBoxScore(bodyFor(projected),game);return projected;
 });
 return {...emptyPending(),games};
}
export function pendingBody(entry,game){
 check(entry.game.id===game.id&&entry.game.start===game.start&&entry.game.home.id===game.home.id&&entry.game.away.id===game.away.id&&JSON.stringify(entry.game.finalScores)===JSON.stringify(game.finalScores),'Pending box match identity or score changed; review required');
 return bodyFor(entry);
}
