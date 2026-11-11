// Bounded season inventory + verified whole-game backfill. No raw data in durable progress.
import {createHash} from 'node:crypto';
import {SEASON,emptySeason,validateIdentityMap,validateSeason} from '../assets/core.mjs';
import {PROVIDER,parseMatches,normalizeMatch,parseBoxScore,normalizeBoxScore,localMatchDay,datesInRange} from './highlightly.mjs';
import {makeCachedLoader,mergeHighlightly,validatePrivate} from './highlightly-private.mjs';
import {verifiedSchedule} from './highlightly-schedule.mjs';
import {emptyPending,publicPendingBoxes,normalizePendingBox,pendingBody} from './highlightly-pending.mjs';
import {checkOfficialParticipation} from './highlightly-participation-reference.mjs';
import {sourceErrorCode} from './highlightly-source-errors.mjs';
import {classifications} from './provider.mjs';
import {missingIdentityObservations,checkOfficialReference} from './highlightly-reference.mjs';
const requireValue=(ok,message)=>{if(!ok)throw new Error(message);};
const count=n=>Number.isSafeInteger(n)&&n>=0;
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const budgetError=error=>error?.code==='HIGHLIGHTLY_BUDGET';
function intervals(start,end,now,requests){
  const result=[];for(let first=Date.parse(start);first<=Date.parse(end);first+=31*86400000){result.push({startDate:new Date(first).toISOString().slice(0,10),endDate:new Date(Math.min(first+30*86400000,Date.parse(end))).toISOString().slice(0,10),normalizedAt:now,requests});}return result;
}
export function validateInventoryState(state,now=new Date().toISOString()){
  requireValue(state?.version===1&&state.provider===PROVIDER&&state.season===SEASON&&/^\d{4}-\d\d-\d\d$/.test(state.dayUTC)&&Number.isFinite(Date.parse(state.dayUTC))&&new Date(state.dayUTC).toISOString().slice(0,10)===state.dayUTC&&state.dayUTC<=now.slice(0,10)&&count(state.offset)&&(state.total===null||count(state.total))&&Array.isArray(state.seenIds)&&new Set(state.seenIds).size===state.seenIds.length&&state.seenIds.every(id=>Number.isSafeInteger(id)&&id>0)&&state.offset===state.seenIds.length&&Array.isArray(state.games)&&typeof state.complete==='boolean','Invalid inventory checkpoint');
  requireValue(state.total===null?state.offset===0:state.offset<=state.total,'Invalid inventory cursor');
  requireValue(!state.complete||state.offset===state.total,'Incomplete inventory cursor marked complete');
  validateSeason({...emptySeason(),provider:PROVIDER,connection:'connected',updatedAt:now,coverageCheckedAt:now,games:state.games});
  requireValue(state.games.every(g=>g.provider===PROVIDER&&g.status==='finished'&&state.seenIds.includes(g.id)&&g.statsState==='not-fetched'),'Invalid normalized inventory checkpoint');
}
export function seedSeasonInventory(pages,{now=new Date().toISOString()}={}){
  requireValue(Array.isArray(pages)&&pages.length>0,'Previously fetched inventory pages are required');
  const state={version:1,provider:PROVIDER,season:SEASON,dayUTC:now.slice(0,10),offset:0,total:null,seenIds:[],games:[],complete:false};
  for(const page of pages){
    parseMatches(page,state.offset);requireValue(state.total===null||state.total===page.pagination.totalCount,'Inventory page total changed');state.total=page.pagination.totalCount;
    for(const raw of page.data){requireValue(Number.isSafeInteger(raw?.id)&&raw.id>0&&!state.seenIds.includes(raw.id)&&raw.league==='NBA'&&raw.season===2027,'Invalid or duplicate inventory match');state.seenIds.push(raw.id);if(raw.state?.description==='Finished')state.games.push(normalizeMatch(raw,new Map()));}
    state.offset+=page.data.length;state.complete=state.offset===state.total;
  }
  validateInventoryState(state,now);return state;
}
export async function runSeasonBackfill({client,cache,previous=null,identities,schedule,types=null,seasonStart=null,inventoryState=null,pendingState=null,savePending=async()=>{},saveState=async()=>{},saveProgress=async()=>{},now=()=>Date.now(),maxCorrectionGames=6,correctionDays=3,maxSourceRetriesPerRun=3}){
  const timestamp=new Date(now()).toISOString(),dayUTC=timestamp.slice(0,10);
  requireValue(Number.isInteger(maxCorrectionGames)&&maxCorrectionGames>=0&&maxCorrectionGames<=10&&Number.isInteger(correctionDays)&&correctionDays>=1&&correctionDays<=7&&Number.isInteger(maxSourceRetriesPerRun)&&maxSourceRetriesPerRun>=0&&maxSourceRetriesPerRun<=10,'Invalid correction budget');
  seasonStart=seasonStart||schedule?.seasonStart;
  requireValue(seasonStart&&typeof seasonStart.source==='string'&&seasonStart.source.trim()&&typeof seasonStart.verifiedAt==='string'&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(seasonStart.verifiedAt)&&Number.isFinite(Date.parse(seasonStart.verifiedAt)),'Verified official season start is required');
  datesInRange(seasonStart.date,seasonStart.date);requireValue(seasonStart.date<=dayUTC,'Official season has not started');
  // Keep every previously verified game, even outside the current backfill window.
  // Season-start evidence limits new work; it must not silently delete older data.
  if(previous)validatePrivate(previous);
  requireValue(identities?.provider===PROVIDER,'Explicit Highlightly identity namespace required');validateIdentityMap(identities);
  for(const p of identities.players){const same=previous?.players.find(old=>old.nbaId===p.nbaId||old.providerId===p.providerId);requireValue(!same||(same.nbaId===p.nbaId&&same.providerId===p.providerId),'NBA/Highlightly identity collision');}
  const typeDocument=types||{provider:PROVIDER,season:SEASON,games:(previous?.games||[]).filter(g=>g.type!=='unknown').map(g=>({id:g.id,type:g.type,source:g.classification.source,verifiedAt:g.classification.verifiedAt}))};
  requireValue(typeDocument.provider===PROVIDER,'Explicit Highlightly classification namespace required');
  const explicitTypes=classifications(typeDocument),classify=verifiedSchedule(schedule),identityRevision=digest(identities.players.map(p=>[p.providerId,p.nbaId]).sort((a,b)=>a[0]-b[0]));
  const pending=publicPendingBoxes(pendingState||emptyPending(),timestamp);
  const savePendingState=async()=>savePending(publicPendingBoxes(pending,new Date(now()).toISOString()));
  if(inventoryState)validateInventoryState(inventoryState,timestamp);
  let state=inventoryState?.dayUTC===dayUTC?structuredClone(inventoryState):{version:1,provider:PROVIDER,season:SEASON,dayUTC,offset:0,total:null,seenIds:[],games:[],complete:false};
  const receipts=[],load=makeCachedLoader({client,cache,now,refreshFrom:'2026-07-01',refreshId:`inventory-${dayUTC}`,onRequest:async r=>receipts.push(r)});
  let budgetExhausted=false;
  while(!state.complete){
    const params={league:'NBA',season:2027,timezone:'America/New_York',limit:100,offset:state.offset};
    let page;
    try{page=await load('/matches',params,body=>{
      parseMatches(body,state.offset);
      requireValue(state.total===null||state.total===body.pagination.totalCount,'Inventory changed during pagination; start a new reviewed inventory cycle');
      const seen=new Set(state.seenIds);
      for(const raw of body.data){requireValue(Number.isSafeInteger(raw?.id)&&raw.id>0&&!seen.has(raw.id)&&raw.league==='NBA'&&raw.season===2027,'Invalid or duplicate season inventory match');seen.add(raw.id);
        if(raw.state?.description==='Finished')normalizeMatch(raw,new Map());
      }
    },{date:dayUTC});}catch(error){if(!budgetError(error))throw error;budgetExhausted=true;break;}
    const next=structuredClone(state);next.total=page.pagination.totalCount;
    for(const raw of page.data){next.seenIds.push(raw.id);if(raw.state?.description==='Finished')next.games.push(normalizeMatch(raw,new Map()));}
    next.offset+=page.data.length;next.complete=next.offset===next.total;validateInventoryState(next,timestamp);await saveState(next);state=next;
  }
  const oldGames=new Map((previous?.games||[]).map(g=>[g.id,g]));
  const staleCompleted=pending.games.filter(entry=>oldGames.get(entry.game.id)?.statsState==='available'&&!oldGames.get(entry.game.id)?.refreshIssue&&Number.isFinite(Date.parse(oldGames.get(entry.game.id)?.boxScoreCheckedAt))&&Date.parse(oldGames.get(entry.game.id).boxScoreCheckedAt)>=Date.parse(entry.fetchedAt));
  if(staleCompleted.length){pending.games=pending.games.filter(entry=>!staleCompleted.includes(entry));await savePendingState();}
  const observedGames=[...state.games,...pending.games.filter(entry=>!state.games.some(g=>g.id===entry.game.id)).map(entry=>entry.game)];
  const outsideDateScopeFinished=observedGames.filter(g=>localMatchDay(g)<seasonStart.date).length;
  const inventory=observedGames.filter(g=>localMatchDay(g)>=seasonStart.date).map(raw=>{
    const explicit=explicitTypes.get(raw.id)||classify({id:raw.id,date:raw.start,homeTeam:{id:raw.home.id,abbreviation:raw.home.code},awayTeam:{id:raw.away.id,abbreviation:raw.away.code}}),old=oldGames.get(raw.id);
    requireValue(!old||(old.home.id===raw.home.id&&old.away.id===raw.away.id),'Game team identity collision');
    let type=explicit?.type||old?.type||'unknown',classification=explicit?{source:explicit.source,verifiedAt:explicit.verifiedAt}:old?.classification||null;
    if(old?.type===type&&old.classification&&classification&&Date.parse(old.classification.verifiedAt)>Date.parse(classification.verifiedAt))classification=old.classification;
    return {...raw,type,classification};
  });
  const cutoff=new Date(now()-correctionDays*86400000).toISOString().slice(0,10),attemptedToday=g=>oldGames.get(g.id)?.boxScoreCheckedAt?.slice(0,10)===dayUTC;
  const blockedSameIdentity=g=>oldGames.get(g.id)?.refreshIssue?.code==='unmapped-players'&&oldGames.get(g.id).refreshIssue.identityRevision===identityRevision;
  const blockedSourceToday=g=>oldGames.get(g.id)?.refreshIssue?.code==='source-data-error'&&oldGames.get(g.id).refreshIssue.attemptedAt?.slice(0,10)===dayUTC;
  const eligible=inventory.filter(g=>g.type!=='unknown');
  const corrections=eligible.filter(g=>oldGames.get(g.id)?.statsState==='available'&&localMatchDay(g)>=cutoff&&!attemptedToday(g)&&!blockedSameIdentity(g)&&!blockedSourceToday(g)&&oldGames.get(g.id)?.refreshIssue?.code!=='source-data-error').sort((a,b)=>a.start.localeCompare(b.start)||a.id-b.id).slice(0,maxCorrectionGames);
  const backlog=eligible.filter(g=>(oldGames.get(g.id)?.statsState!=='available'||pending.games.some(entry=>entry.game.id===g.id)||['unmapped-players','source-data-error'].includes(oldGames.get(g.id)?.refreshIssue?.code))&&!blockedSameIdentity(g)&&!blockedSourceToday(g)&&!corrections.some(c=>c.id===g.id)&&oldGames.get(g.id)?.refreshIssue?.code!=='source-data-error').sort((a,b)=>a.start.localeCompare(b.start)||a.id-b.id);
  const sourceRetries=eligible.filter(g=>oldGames.get(g.id)?.refreshIssue?.code==='source-data-error'&&!blockedSourceToday(g)).sort((a,b)=>a.start.localeCompare(b.start)||a.id-b.id).slice(0,maxSourceRetriesPerRun);
  const queue=[...corrections,...backlog,...sourceRetries],incoming=new Map(),lines=[];
  for(const game of inventory){const old=oldGames.get(game.id);
    if(old?.statsState==='available'){incoming.set(game.id,{...old,type:game.type,classification:game.classification});lines.push(...previous.lines.filter(l=>l.gameId===game.id));}
    else if(blockedSameIdentity(game)||old?.refreshIssue?.code==='source-data-error'){incoming.set(game.id,{...game,statsState:'missing',refreshIssue:old.refreshIssue,boxScoreCheckedAt:old.boxScoreCheckedAt});}
    else incoming.set(game.id,game.type==='unknown'?game:{...game,statsState:'missing',refreshIssue:{code:'backfill-pending',attemptedAt:timestamp,preservedPreviousBoxScore:false}});
  }
  const start=seasonStart.date;
  const end=[start,inventory.length?inventory.map(localMatchDay).sort().at(-1):previous?.scope.endDate||dayUTC].sort().at(-1);
  const snapshot=()=>{
    const used=new Set(lines.map(l=>l.nbaId));const allPeople=new Map([...(previous?.players||[]).map(p=>[p.nbaId,p]),...identities.players.map(p=>[p.nbaId,p])]);
    const batch={...emptySeason(),provider:PROVIDER,publicationPolicy:'private-only-rights-unverified',minutesPrecision:'rounded-whole-minute',connection:'connected',updatedAt:timestamp,coverageCheckedAt:timestamp,scope:{startDate:start,endDate:end,timeZone:'America/New_York',completeSeason:false},coverage:intervals(start,end,timestamp,receipts),players:[...allPeople.values()].filter(p=>used.has(p.nbaId)),games:[...incoming.values()],lines};
    const merged=mergeHighlightly(previous,batch);
    merged.backfillProgress={inventoryComplete:state.complete,inventoryOffset:state.offset,inventoryTotal:state.total,inventoryDayUTC:state.dayUTC,completedGamesSeen:inventory.length,outsideDateScopeFinished,regularGamesSeen:inventory.filter(g=>g.type==='regular').length,verifiedRegularBoxScores:merged.games.filter(g=>g.type==='regular'&&g.statsState==='available').length,verifiedBoxScores:merged.games.filter(g=>g.statsState==='available').length,sourceFailureGames:merged.games.filter(g=>g.refreshIssue?.code==='source-data-error').length,unmappedGames:merged.games.filter(g=>g.refreshIssue?.code==='unmapped-players').length,unclassifiedGames:merged.games.filter(g=>g.type==='unknown').length,pendingGames:merged.games.filter(g=>g.status==='finished'&&g.type!=='unknown'&&g.statsState!=='available').length,budgetExhausted,attemptedAt:timestamp};
    return validatePrivate(merged);
  };
  await saveProgress(snapshot());
  for(const game of queue){
    const savedBox=pending.games.find(entry=>entry.game.id===game.id);
    if(budgetExhausted&&!savedBox)continue;
    const correction=corrections.some(g=>g.id===game.id),revision=correction?`correction-${dayUTC}`:oldGames.get(game.id)?.refreshIssue?.code==='source-data-error'?`source-retry-${dayUTC}`:null;
    const boxLoad=makeCachedLoader({client,cache,now,refreshFrom:revision?'2026-07-01':null,refreshId:revision,onRequest:async r=>receipts.push(r)});
    let body,observations=[],sourceReference=null;
    try{body=savedBox?pendingBody(savedBox,game):await boxLoad(`/box-score/${game.id}`,{},body=>{
      observations=missingIdentityObservations(body,game,identities,timestamp);
      sourceReference=checkOfficialReference(body,game,identities,timestamp);
      try{return parseBoxScore(body,game);}catch(error){
        const allowed=['Expected two box-score teams','Invalid or duplicate box-score team','Invalid or duplicate player','Missing statistics array','Duplicate statistic','Missing or invalid raw counter','Rebounds do not reconcile','Invalid shooting counters','Points do not reconcile','Box-score points do not reconcile with final score'];
        const failure=new Error(allowed.includes(error.message)?error.message:'Malformed box-score structure');failure.code='HIGHLIGHTLY_SOURCE_DATA';throw failure;
      }
    },{date:localMatchDay(game)});}catch(error){
      if(budgetError(error)){budgetExhausted=true;continue;}
      if(error.code!=='HIGHLIGHTLY_SOURCE_DATA')throw error;
      const old=oldGames.get(game.id),preserved=old?.statsState==='available';
      incoming.set(game.id,{...(preserved?old:game),type:game.type,classification:game.classification,statsState:preserved?'available':'missing',refreshIssue:{code:'source-data-error',sourceErrorCode:sourceErrorCode(error.message),identityObservations:observations,...(sourceReference?{officialReference:sourceReference}:{}),reason:error.message,attemptedAt:timestamp,retryAfterUTC:new Date(Date.parse(dayUTC)+86400000).toISOString().slice(0,10),preservedPreviousBoxScore:preserved}});
      await saveProgress(snapshot());continue;
    }
    if(savedBox)receipts.push({endpoint:`/box-score/${game.id}`,date:localMatchDay(game),fetchedAt:savedBox.fetchedAt,reused:true,normalizedPending:true});
    const rawLines=parseBoxScore(body,game),missing=rawLines.filter(l=>!identities.players.some(p=>p.providerId===l.providerId));
    const checkedAt=savedBox?.fetchedAt||receipts.at(-1)?.fetchedAt||timestamp;
    observations=missingIdentityObservations(body,game,identities,checkedAt);
    const participationReference=checkOfficialParticipation(rawLines,game,timestamp);
    if(participationReference){
      const old=oldGames.get(game.id),preserved=old?.statsState==='available';
      incoming.set(game.id,{...(preserved?old:game),type:game.type,classification:game.classification,statsState:preserved?'available':'missing',boxScoreCheckedAt:checkedAt,refreshIssue:{code:'source-data-error',sourceErrorCode:'official-participation-conflict',attemptedAt:timestamp,preservedPreviousBoxScore:preserved,identityObservations:observations,participationReference}});
      await saveProgress(snapshot());
      if(savedBox){pending.games=pending.games.filter(entry=>entry.game.id!==game.id);await savePendingState();}
      continue;
    }
    const officialReference=checkOfficialReference(body,game,identities,timestamp);
    if(missing.length&&officialReference?.status!=='mismatch'&&!savedBox){
      pending.games.push(normalizePendingBox(body,game,checkedAt));await savePendingState();
    }
    if(officialReference&&officialReference.status!=='verified'){
      const old=oldGames.get(game.id),preserved=old?.statsState==='available',identityBlocked=officialReference.status==='unverifiable'&&missing.length>0;
      incoming.set(game.id,{...(preserved?old:game),type:game.type,classification:game.classification,statsState:preserved?'available':'missing',boxScoreCheckedAt:checkedAt,refreshIssue:{code:identityBlocked?'unmapped-players':'source-data-error',...(identityBlocked?{unmappedPlayerCount:missing.length,identityRevision}:{sourceErrorCode:`official-reference-${officialReference.status}`}),attemptedAt:timestamp,preservedPreviousBoxScore:preserved,identityObservations:observations,officialReference}});
      await saveProgress(snapshot());
      if(savedBox&&officialReference.status==='mismatch'){pending.games=pending.games.filter(entry=>entry.game.id!==game.id);await savePendingState();}
      continue;
    }
    if(missing.length){
      const old=oldGames.get(game.id),preserved=old?.statsState==='available';
      incoming.set(game.id,{...(preserved?old:game),type:game.type,classification:game.classification,statsState:preserved?'available':'missing',boxScoreCheckedAt:checkedAt,refreshIssue:{code:'unmapped-players',identityObservations:observations,unmappedPlayerCount:missing.length,attemptedAt:timestamp,preservedPreviousBoxScore:preserved,identityRevision}});
    }else{
      const normalized=normalizeBoxScore(body,game,identities.players,timestamp);
      for(let i=lines.length-1;i>=0;i--)if(lines[i].gameId===game.id)lines.splice(i,1);
      lines.push(...normalized);incoming.set(game.id,{...game,statsState:'available',boxScoreCheckedAt:checkedAt});
    }
    await saveProgress(snapshot());
    if(!missing.length&&savedBox){pending.games=pending.games.filter(entry=>entry.game.id!==game.id);await savePendingState();}
  }
  if(budgetExhausted)for(const [id,g]of incoming)if(g.refreshIssue?.code==='backfill-pending')incoming.set(id,{...g,refreshIssue:{...g.refreshIssue,code:'request-budget'}});
  const result=snapshot();await saveProgress(result);return {snapshot:result,inventoryState:state,pendingState:publicPendingBoxes(pending,new Date(now()).toISOString())};
}
