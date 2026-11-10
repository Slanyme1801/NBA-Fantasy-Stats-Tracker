// Private disk cache/checkpoints only. Nothing in this module is browser-facing.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {PROVIDER,datesInRange,localMatchDay,collectHighlightly} from './highlightly.mjs';
import {validateSeason,validateIdentityMap,SEASON} from '../assets/core.mjs';
const requireValue=(ok,message)=>{if(!ok)throw new Error(message);};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
async function rejectSymlink(file){try{const s=await fs.lstat(file);requireValue(!s.isSymbolicLink(),'Private path must not be a symbolic link');}catch(e){if(e.code!=='ENOENT')throw e;}}
export async function privateDirectory(directory){
  const relative=path.relative(process.cwd(),path.resolve(directory));
  requireValue(relative==='.local'||relative.startsWith(`.local${path.sep}`),'Private storage must stay inside .local');
  let current=process.cwd();
  for(const part of relative.split(path.sep)){current=path.join(current,part);await rejectSymlink(current);await fs.mkdir(current,{recursive:true,mode:0o700});}
}
export async function atomicPrivateJSON(file,value){
  await privateDirectory(path.dirname(file));await rejectSymlink(file);
  const temp=`${file}.${randomUUID()}.tmp`;let handle;
  try{handle=await fs.open(temp,'wx',0o600);await handle.writeFile(JSON.stringify(value,null,2)+'\n');await handle.sync();await handle.close();handle=null;await fs.rename(temp,file);}
  finally{if(handle)await handle.close();await fs.unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
export async function readPrivateJSON(file){
  await privateDirectory(path.dirname(file));await rejectSymlink(file);
  return JSON.parse(await fs.readFile(file,'utf8'));
}
export function makeDiskCache(directory='.local/highlightly-cache'){
  const file=key=>{requireValue(/^[a-f0-9]{64}$/.test(key),'Invalid cache key');return path.join(directory,`${key}.json`);};
  return {
    async get(key){try{return await readPrivateJSON(file(key));}catch(e){if(e.code==='ENOENT')return null;throw e;}},
    async put(key,value){await atomicPrivateJSON(file(key),value);}
  };
}
export function makeCachedLoader({client,cache,now=()=>Date.now(),refreshFrom=null,refreshId=null,onRequest=async()=>{}}){
  requireValue((refreshFrom===null&&refreshId===null)||(typeof refreshId==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(refreshId)&&datesInRange(refreshFrom,refreshFrom).length===1),'Refresh requires a valid date and explicit revision ID');
  return async(endpoint,params,validate,{date}={})=>{
    const revision=refreshFrom&&date>=refreshFrom?refreshId:null;
    const key=digest({provider:PROVIDER,endpoint,params}),record=await cache.get(key);
    if(record){
      requireValue(record.version===1&&record.provider===PROVIDER&&record.key===key&&iso(record.fetchedAt)&&Date.parse(record.fetchedAt)<=now()&&record.checksum===digest(record.body),'Corrupt private cache; review the affected entry');
      // Integrity is always checked; context validation is required only for reuse.
      // An explicit new refresh may legitimately replace an old final score.
    }
    // Final box scores and historical all-final schedules stay until explicit refresh.
    // Recent/unfinished schedules expire after 5 minutes, so scheduled games cannot freeze.
    const reusable=record&&(!revision||record.refreshRevision===revision)&&(endpoint.startsWith('/box-score/')||
      (date<new Date(now()-7*86400000).toISOString().slice(0,10)&&record.body.data.length>0&&record.body.data.every(g=>g.state?.description==='Finished'))||
      now()-Date.parse(record.fetchedAt)<5*60000);
    if(reusable){validate(record.body);await onRequest({key,endpoint,date,fetchedAt:record.fetchedAt,reused:true});return record.body;}
    const body=await client(endpoint,params);validate(body);
    const fetchedAt=new Date(now()).toISOString();
    await cache.put(key,{version:1,provider:PROVIDER,key,fetchedAt,refreshRevision:revision,checksum:digest(body),body});
    await onRequest({key,endpoint,date,fetchedAt,reused:false});return body;
  };
}
function validatePrivate(snapshot){
  requireValue(snapshot?.provider===PROVIDER&&snapshot.publicationPolicy==='private-only-rights-unverified'&&snapshot.scope?.completeSeason===false,'Private Highlightly namespace and partial coverage required');
  datesInRange(snapshot.scope.startDate,snapshot.scope.startDate);datesInRange(snapshot.scope.endDate,snapshot.scope.endDate);
  requireValue(snapshot.scope.startDate<=snapshot.scope.endDate&&snapshot.scope.timeZone==='America/New_York','Invalid private snapshot scope');
  requireValue(snapshot.games?.every(g=>g.provider===PROVIDER)&&snapshot.lines?.every(l=>l.provider===PROVIDER),'Mixed provider namespace');
  validateSeason(snapshot);return snapshot;
}
function coverageOf(snapshot){
  if(snapshot.coverage){requireValue(Array.isArray(snapshot.coverage)&&snapshot.coverage.length>0,'Invalid coverage intervals');return snapshot.coverage;}
  return [{startDate:snapshot.scope.startDate,endDate:snapshot.scope.endDate,normalizedAt:snapshot.updatedAt,requests:[],legacyProvenance:true}];
}
export function mergeHighlightly(previous,incoming){
  validatePrivate(incoming);
  const coverage=coverageOf(incoming);
  for(const c of coverage){datesInRange(c.startDate,c.endDate);requireValue(iso(c.normalizedAt)&&Array.isArray(c.requests),'Invalid coverage provenance');}
  if(!previous)return {...incoming,coverage};
  validatePrivate(previous);requireValue(previous.season===incoming.season&&incoming.season===SEASON,'Different season');
  requireValue(Date.parse(incoming.updatedAt)>=Date.parse(previous.updatedAt),'Older batch cannot replace newer snapshot');
  const players=new Map(previous.players.map(p=>[p.nbaId,p])),providerIds=new Map(previous.players.map(p=>[p.providerId,p.nbaId]));
  for(const p of incoming.players){
    const old=players.get(p.nbaId);
    requireValue((!old||old.providerId===p.providerId)&&(!providerIds.has(p.providerId)||providerIds.get(p.providerId)===p.nbaId),'NBA/Highlightly identity collision');
    requireValue(!old||Date.parse(p.verifiedAt)>=Date.parse(old.verifiedAt),'Older identity provenance');
    players.set(p.nbaId,p);providerIds.set(p.providerId,p.nbaId);
  }
  validateIdentityMap({season:SEASON,players:[...players.values()]});
  const games=new Map(previous.games.map(g=>[g.id,g])),replaced=new Set();
  for(const game of incoming.games){
    const old=games.get(game.id);
    requireValue(!old||(old.home.id===game.home.id&&old.away.id===game.away.id),'Game team identity collision');
    requireValue(!old||old.status!=='finished'||game.status==='finished','Finished match cannot regress to unfinished');
    requireValue(!old||old.type==='unknown'||game.type!=='unknown','Known classification cannot be removed by an absent mapping');
    requireValue(!old?.classification||!game.classification||Date.parse(game.classification.verifiedAt)>=Date.parse(old.classification.verifiedAt),'Older classification provenance');
    const unmappedGap=game.statsState==='missing'&&game.refreshIssue?.code==='unmapped-players'&&Number.isSafeInteger(game.refreshIssue.unmappedPlayerCount)&&game.refreshIssue.unmappedPlayerCount>0&&iso(game.refreshIssue.attemptedAt)&&!incoming.lines.some(l=>l.gameId===game.id);
    requireValue(game.type==='unknown'||game.status!=='finished'||game.statsState==='available'||unmappedGap,'Classified finished match must have validated box score or explicit unmapped gap');
    if(unmappedGap&&old?.statsState==='available'){
      // Preserve the entire older verified box and its matching score, never mix it with a correction.
      games.set(game.id,{...old,type:game.type,classification:game.classification,refreshIssue:{...game.refreshIssue,preservedPreviousBoxScore:true}});
    }else{games.set(game.id,game);replaced.add(game.id);}
  }
  const absentFinished=previous.games.filter(g=>g.status==='finished'&&!incoming.games.some(incomingGame=>incomingGame.id===g.id)&&localMatchDay(g)>=incoming.scope.startDate&&localMatchDay(g)<=incoming.scope.endDate).map(g=>g.id);
  const lines=[...previous.lines.filter(l=>!replaced.has(l.gameId)),...incoming.lines];
  const allCoverage=[...coverageOf(previous),...coverage.map(c=>({...c,preservedAbsentFinishedGameIds:absentFinished}))];
  for(const c of allCoverage){datesInRange(c.startDate,c.endDate);requireValue(iso(c.normalizedAt)&&Array.isArray(c.requests),'Invalid coverage provenance');}
  const result={...incoming,positions:previous.positions,players:[...players.values()],games:[...games.values()].sort((a,b)=>a.start.localeCompare(b.start)||a.id-b.id),lines,coverage:allCoverage,
    scope:{startDate:allCoverage.map(c=>c.startDate).sort()[0],endDate:allCoverage.map(c=>c.endDate).sort().at(-1),timeZone:'America/New_York',completeSeason:false,mayHaveGaps:true}};
  return validatePrivate(result);
}
export async function runHighlightlyBatch({client,cache,previous=null,identities,types,startDate,endDate,refreshFrom=null,refreshId=null,now=()=>Date.now(),saveCheckpoint=async()=>{},unmappedPolicy='error'}){
  datesInRange(startDate,endDate);
  // Reject corrupt prior state before spending any request budget.
  if(previous){validatePrivate(previous);for(const c of coverageOf(previous)){datesInRange(c.startDate,c.endDate);requireValue(iso(c.normalizedAt)&&Array.isArray(c.requests),'Invalid coverage provenance');}}
  const checkpoint={version:1,provider:PROVIDER,season:SEASON,startDate,endDate,refreshFrom,refreshId,status:'active',startedAt:new Date(now()).toISOString(),requests:[],completedGameIds:[]};
  await saveCheckpoint(checkpoint);
  const load=makeCachedLoader({client,cache,now,refreshFrom,refreshId,onRequest:async request=>{checkpoint.requests.push(request);await saveCheckpoint(checkpoint);}});
  try{
    const batch=await collectHighlightly({client,load,identities,types,startDate,endDate,unmappedPolicy,now:new Date(now()).toISOString(),onGame:async id=>{checkpoint.completedGameIds.push(id);await saveCheckpoint(checkpoint);}});
    checkpoint.unmappedGameIds=batch.games.filter(g=>g.refreshIssue?.code==='unmapped-players').map(g=>g.id);
    batch.coverage=[{startDate,endDate,normalizedAt:batch.updatedAt,refreshId,requests:checkpoint.requests}];
    const result=mergeHighlightly(previous,batch);
    checkpoint.status='validated';await saveCheckpoint(checkpoint);return result;
  }catch(error){checkpoint.status='interrupted';checkpoint.stoppedAt=new Date(now()).toISOString();await saveCheckpoint(checkpoint);throw error;}
}
