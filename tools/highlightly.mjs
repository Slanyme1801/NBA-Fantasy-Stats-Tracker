// Server/local only. Never import this module into the public application.
import {COUNTERS, SEASON, emptySeason, validateIdentityMap, validateSeason, validateProviderRegistry} from '../assets/core.mjs';
import {checkOfficialReference} from './highlightly-reference.mjs';
import {checkOfficialParticipation,hasVerifiedDidNotPlay} from './highlightly-participation-reference.mjs';
import {classifications} from './provider.mjs';
export const PROVIDER='Highlightly';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const id=n=>Number.isSafeInteger(n)&&n>0;
const count=n=>Number.isSafeInteger(n)&&n>=0;
export const explicitDidNotPlay=value=>typeof value==='string'&&/^(?:DNP(?:\s*[-–]\s*Coach['’]s Decision)?|Did Not Play)$/i.test(value.trim());
export const statisticNames={pts:'Total Points Scored',fgm:'Successful Field Goals',fga:'Total Field Goals',fg3m:'Successful 3PT Field Goals',fg3a:'Total 3PT Field Goals',ftm:'Successful Free Throws',fta:'Total Free Throws',reb:'Total Rebounds',ast:'Total Assists',tov:'Total Turnovers',stl:'Total Steals',blk:'Total Blocks'};
export function datesInRange(start,end){
  const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
  check(valid(start)&&valid(end)&&start<=end&&start>='2026-07-01'&&end<='2027-06-30','Invalid 2026-27 date interval');
  const days=(Date.parse(end)-Date.parse(start))/86400000+1;
  check(days<=31,'Date interval exceeds 31 days');
  return Array.from({length:days},(_,i)=>new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10));
}
export function parseMatches(body,offset=0){
  check(body&&Array.isArray(body.data)&&body.plan?.tier==='BASIC'&&body.plan?.message==='All data available with current plan.','Unsupported or restricted Highlightly envelope');
  const p=body.pagination;
  check(p&&count(p.totalCount)&&p.offset===offset&&p.limit===100&&body.data.length<=100&&offset+body.data.length<=p.totalCount&&(body.data.length>0||p.totalCount===0),'Invalid Highlightly pagination');
  return body;
}
export function normalizeMatch(raw,types){
  check(id(raw?.id)&&raw.league==='NBA'&&raw.season===2027,'Invalid Highlightly match scope');
  const status={Finished:'finished',Scheduled:'scheduled'}[raw.state?.description];
  check(status,'Unverified Highlightly match status');
  check(typeof raw.date==='string'&&/^\d{4}-\d\d-\d\dT.*Z$/.test(raw.date)&&Number.isFinite(Date.parse(raw.date)),'Invalid match timestamp');
  const classification=types.get(raw.id);
  const teams=['homeTeam','awayTeam'].map(k=>{const t=raw[k];check(id(t?.id)&&typeof t.abbreviation==='string'&&t.abbreviation.length>0,'Invalid match team');return {id:t.id,code:t.abbreviation};});
  check(teams[0].id!==teams[1].id,'Duplicate match team');
  const scores=status==='finished'?['homeTeam','awayTeam'].map(k=>{const q=raw.state.score?.[k];check(Array.isArray(q)&&q.length>=4&&q.every(count),'Invalid final team scores');return q.reduce((a,b)=>a+b,0);}):null;
  return {id:raw.id,season:SEASON,league:'standard',start:raw.date,status,type:classification?.type||'unknown',classification:classification?{source:classification.source,verifiedAt:classification.verifiedAt}:null,home:teams[0],away:teams[1],statsState:'not-fetched',provider:PROVIDER,finalScores:scores};
}
export function parseBoxScore(body,game){
  check(Array.isArray(body)&&body.length===2,'Expected two box-score teams');
  const teamIds=new Set(),playerIds=new Set(),lines=[];
  for(const team of body){
    check([game.home.id,game.away.id].includes(team.team?.id)&&!teamIds.has(team.team.id)&&Array.isArray(team.boxScores)&&team.boxScores.length>0,'Invalid or duplicate box-score team');teamIds.add(team.team.id);
    for(const raw of team.boxScores){
      check(id(raw.player?.id)&&!playerIds.has(raw.player.id),'Invalid or duplicate player');playerIds.add(raw.player.id);
      check(Array.isArray(raw.statistics),'Missing statistics array');
      const values=new Map();
      for(const s of raw.statistics){check(typeof s.name==='string'&&!values.has(s.name),'Duplicate statistic');values.set(s.name,s.value);}
      let stats=null,seconds=null,participation='missing';
      if(values.size){
        stats=Object.fromEntries(COUNTERS.map(k=>[k,values.get(statisticNames[k])]));
        const minutes=values.get('Total Minutes Played'),off=values.get('Total Offensive Rebounds'),def=values.get('Total Defensive Rebounds');
        const verifiedDnp=hasVerifiedDidNotPlay(game,raw.player.id,team.team.id);
        const didNotPlay=explicitDidNotPlay(minutes)||(verifiedDnp&&(minutes===0||typeof minutes==='string'));
        check(COUNTERS.every(k=>count(stats[k]))&&(count(minutes)||didNotPlay)&&count(off)&&count(def),'Missing or invalid raw counter');
        check(stats.reb===off+def,'Rebounds do not reconcile');
        check(stats.fgm<=stats.fga&&stats.fg3m<=stats.fg3a&&stats.fg3m<=stats.fgm&&stats.fg3a<=stats.fga&&stats.ftm<=stats.fta&&stats.fgm-stats.fg3m<=stats.fga-stats.fg3a,'Invalid shooting counters');
        check(stats.pts===2*stats.fgm+stats.fg3m+stats.ftm,'Points do not reconcile');
        if(verifiedDnp)check(didNotPlay&&COUNTERS.every(k=>stats[k]===0)&&off===0&&def===0,'Official DNP conflicts with activity');
        if(didNotPlay){
          check(COUNTERS.every(k=>stats[k]===0)&&off===0&&def===0,'DNP marker conflicts with activity');
          participation='dnp';stats=null;
        }else if(minutes>0||COUNTERS.some(k=>stats[k]>0)){participation='played';seconds=minutes*60;}else stats=null;
      }
      lines.push({gameId:game.id,providerId:raw.player.id,teamId:team.team.id,participation,seconds,minutesPrecision:'rounded-whole-minute',stats,comment:null,provider:PROVIDER});
    }
    const total=lines.filter(l=>l.teamId===team.team.id).reduce((n,l)=>n+(l.stats?.pts||0),0);
    check(total===game.finalScores[team.team.id===game.home.id?0:1],'Box-score points do not reconcile with final score');
  }
  return lines;
}
export function normalizeBoxScore(body,game,players,now){
  return parseBoxScore(body,game).map(line=>{
    const person=players.find(p=>p.providerId===line.providerId);
    return {...line,playerKey:`highlightly:${line.providerId}`,nbaId:person?.nbaId??null,updatedAt:now};
  });
}
// Provider IDs remain the only observation key. A label never establishes an NBA mapping.
export function providerPlayers(body,game,knownPlayers,now){
  parseBoxScore(body,game);
  const players=body.flatMap(team=>team.boxScores.map(row=>{
    const prior=knownPlayers.find(p=>p.providerId===row.player.id);
    const observed=row.player.name;
    const name=typeof observed==='string'&&observed.trim()&&observed.length<=100&&/^[\p{L}\p{M} .,'’\-]+$/u.test(observed)?observed:`Highlightly ${row.player.id}`;
    return prior?{...prior,playerKey:`highlightly:${prior.providerId}`,nbaId:prior.nbaId??null}:{playerKey:`highlightly:${row.player.id}`,providerId:row.player.id,nbaId:null,name,source:`Highlightly observed box score ${game.id}`,verifiedAt:now};
  }));
  validateProviderRegistry({provider:PROVIDER,season:SEASON,players});return players;
}
// Read the complete response before interpretation, with an explicit memory bound.
// Native fetch exposes a stream; json-only fallback exists solely for injected test clients.
export const MAX_HIGHLIGHTLY_RESPONSE_BYTES=8*1024*1024;
async function completeResponseBytes(response){
  const chunks=[];let size=0,reason=null;
  const append=value=>{const bytes=Buffer.from(value),remaining=MAX_HIGHLIGHTLY_RESPONSE_BYTES-size;chunks.push(bytes.subarray(0,remaining));size+=Math.min(remaining,bytes.length);if(bytes.length>remaining)reason='response-too-large';};
  if(response.body?.getReader){
    const reader=response.body.getReader();
    try{while(true){const {done,value}=await reader.read();if(done)break;append(value);if(reason){await reader.cancel().catch(()=>{});break;}}}catch{reason='stream-incomplete';}finally{reader.releaseLock();}
  }else{
    try{if(typeof response.arrayBuffer==='function')append(await response.arrayBuffer());
    else if(typeof response.text==='function')append(Buffer.from(await response.text(),'utf8'));
    else append(Buffer.from(JSON.stringify(await response.json()),'utf8'));}catch{reason='stream-incomplete';}
  }
  return {bodyBytes:Buffer.concat(chunks,size),capture:{complete:reason===null,reason}};
}
export function makeHighlightlyClient({key,fetcher=fetch,maxRequests=20,dailyLimit=90,intervalMs=6100,ledger,saveLedger,archiveResponse=null,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=()=>Date.now()}){
  check(archiveResponse===null||typeof archiveResponse==='function','Invalid response archive callback');
  check(typeof key==='string'&&key.length>0,'HIGHLIGHTLY_API_KEY is absent. No connection attempted.');
  check(id(maxRequests)&&maxRequests<=100&&id(dailyLimit)&&dailyLimit<=100&&Number.isFinite(intervalMs)&&intervalMs>=6100,'Invalid request limits');
  const dayOf=t=>new Date(t).toISOString().slice(0,10);
  const readClock=()=>{const t=now();check(Number.isSafeInteger(t)&&t>=0&&t<=8640000000000000,'Invalid quota clock');return t;};
  const initial=readClock(),today=dayOf(initial);
  check(ledger?.provider===PROVIDER&&Array.isArray(ledger.requests)&&ledger.requests.every(t=>Number.isSafeInteger(t)&&t>=0&&t<=initial)&&typeof saveLedger==='function','Invalid quota ledger');
  const previousRequest=ledger.requests.length?Math.max(...ledger.requests):null;
  // Old timestamp ledgers are migrated by UTC calendar day, never by a rolling window.
  if(ledger.dayUTC!==undefined){
    check(typeof ledger.dayUTC==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(ledger.dayUTC)&&Number.isFinite(Date.parse(`${ledger.dayUTC}T00:00:00Z`))&&dayOf(Date.parse(`${ledger.dayUTC}T00:00:00Z`))===ledger.dayUTC&&ledger.dayUTC<=today,'Invalid quota ledger day');
    check(ledger.requests.every(t=>dayOf(t)===ledger.dayUTC),'Inconsistent quota ledger day');
  }else check(ledger.serverLimit===undefined&&ledger.serverRemaining===undefined&&ledger.blocked===undefined,'Invalid legacy quota ledger');
  check(ledger.serverLimit===undefined||(Number.isSafeInteger(ledger.serverLimit)&&ledger.serverLimit>=0&&ledger.serverLimit<=100),'Invalid quota ledger limit');
  check(ledger.serverRemaining===undefined||(Number.isSafeInteger(ledger.serverRemaining)&&ledger.serverRemaining>=0&&ledger.serverRemaining<=(ledger.serverLimit??100)),'Invalid quota ledger remaining');
  check(ledger.blocked===undefined||typeof ledger.blocked==='boolean','Invalid quota ledger block');
  if(ledger.dayUTC!==today){
    ledger.requests=ledger.requests.filter(t=>dayOf(t)===today);
    ledger.dayUTC=today;delete ledger.serverLimit;delete ledger.serverRemaining;delete ledger.blocked;
  }
  let used=0,last=previousRequest,busy=false,persistenceFailed=false,lastClock=initial;
  const syncDay=()=>{
    const t=readClock();check(t>=lastClock,'Quota clock moved backwards');lastClock=t;
    if(dayOf(t)!==ledger.dayUTC){ledger.dayUTC=dayOf(t);ledger.requests=[];delete ledger.serverLimit;delete ledger.serverRemaining;delete ledger.blocked;}
    return t;
  };
  const persist=async()=>{try{await saveLedger(ledger);}catch{persistenceFailed=true;throw new Error('Highlightly quota ledger persistence failed; no further requests');}};
  return async(endpoint,params={})=>{
    check(!busy,'Concurrent requests are prohibited');busy=true;
    try{
      check(endpoint==='/matches'||/^\/box-score\/[1-9]\d*$/.test(endpoint),'Unsupported Highlightly endpoint');
      if(endpoint==='/matches'){
        check(['date,league,limit,offset,season,timezone','league,limit,offset,season,timezone'].includes(Object.keys(params).sort().join(','))&&params.league==='NBA'&&params.season===2027&&params.timezone==='America/New_York'&&params.limit===100&&count(params.offset),'Invalid matches parameters');if(Object.hasOwn(params,'date'))datesInRange(params.date,params.date);
      }else check(Object.keys(params).length===0,'Box-score parameters are prohibited');
      check(!persistenceFailed,'Highlightly quota ledger persistence failed; no further requests');
      if(last!==null)await sleep(Math.max(0,intervalMs-(readClock()-last)));
      const started=syncDay(),requestDay=ledger.dayUTC;
      if(!(used<maxRequests&&!ledger.blocked&&ledger.requests.length<Math.min(dailyLimit,ledger.serverLimit??100)&&(ledger.serverRemaining??Infinity)>0)){const error=new Error('Highlightly request budget reached');error.code='HIGHLIGHTLY_BUDGET';throw error;}
      ledger.requests.push(started);used++;if(ledger.serverRemaining!==undefined)ledger.serverRemaining--;
      await persist();last=readClock();
      const url=new URL(endpoint,'https://nba.highlightly.net');for(const [k,v]of Object.entries(params))url.searchParams.set(k,String(v));
      let response;try{response=await fetcher(url,{headers:{'x-rapidapi-key':key},redirect:'error',signal:AbortSignal.timeout(25000)});}catch{
        if(dayOf(syncDay())!==requestDay){ledger.blocked=true;await persist();}
        throw new Error('Highlightly network/timeout failure; no automatic retry');
      }
      const captured=await completeResponseBytes(response),responseBytes=captured.bodyBytes;
      const quotaHeaders={};let quotaHeadersTruncated=false;
      for(const name of ['x-ratelimit-requests-limit','x-ratelimit-requests-remaining']){
        const value=response.headers?.get(name);if(value!==null&&value!==undefined){const text=String(value);quotaHeaders[name]=text.slice(0,16384);if(text.length>16384)quotaHeadersTruncated=true;}
      }
      if(archiveResponse){
        try{await archiveResponse({endpoint,params:structuredClone(params),status:response.status??(response.ok?200:500),fetchedAt:new Date(readClock()).toISOString(),bodyBytes:responseBytes,quotaHeaders,quotaHeadersTruncated,capture:captured.capture});}
        catch{persistenceFailed=true;throw new Error('Highlightly response archive failed; no further requests');}
      }
      if(!captured.capture.complete){persistenceFailed=true;throw new Error('Incomplete or oversized Highlightly response; stopped without automatic retry');}
      const received=syncDay();
      // A response spanning midnight does not identify which day's counters it describes.
      if(ledger.dayUTC!==requestDay){ledger.blocked=true;await persist();throw new Error('Highlightly quota day changed during request; budget blocked conservatively');}
      const headers={};
      for(const name of ['x-ratelimit-requests-limit','x-ratelimit-requests-remaining']){
        const value=response.headers?.get(name);
        if(value!==null&&value!==undefined){
          if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))){ledger.blocked=true;await persist();throw new Error('Invalid Highlightly quota header');}
          headers[name.endsWith('-remaining')?'remaining':'limit']=Number(value);
        }
      }
      const reportedLimit=headers.limit??ledger.serverLimit??100;
      if(headers.remaining!==undefined&&headers.remaining>reportedLimit){ledger.blocked=true;await persist();throw new Error('Inconsistent Highlightly quota headers');}
      if(headers.limit!==undefined)ledger.serverLimit=Math.min(ledger.serverLimit??100,headers.limit,100);
      if(ledger.serverRemaining!==undefined)ledger.serverRemaining=Math.min(ledger.serverRemaining,ledger.serverLimit??100);
      if(headers.remaining!==undefined){
        ledger.serverRemaining=Math.min(ledger.serverRemaining??100,headers.remaining,ledger.serverLimit??100);
        const consumed=Math.min(100,Math.max(0,reportedLimit-headers.remaining));
        while(ledger.requests.length<consumed)ledger.requests.push(received);
      }
      if(response.status===429)ledger.blocked=true;
      if(Object.keys(headers).length||response.status===429)await persist();
      check(response.ok,'Highlightly HTTP request failed; no automatic retry');
      let body;try{body=JSON.parse(responseBytes.toString('utf8'));}catch{throw new Error('Invalid Highlightly JSON');}
      return endpoint==='/matches'?parseMatches(body,params.offset):body;
    }finally{busy=false;}
  };
}
export async function collectHighlightly({client,identities,types,startDate,endDate,now=new Date().toISOString(),knownIds=[],load=null,onGame=async()=>{},unmappedPolicy='error'}){
  check(['error','skip-game'].includes(unmappedPolicy),'Invalid unmapped-player policy');
  const request=load|| (async(endpoint,params,validate)=>{const body=await client(endpoint,params);validate(body);return body;});
  check(identities?.provider===PROVIDER&&types?.provider===PROVIDER,'Explicit Highlightly mapping namespace required');validateIdentityMap(identities);const map=classifications(types);
  const dates=datesInRange(startDate,endDate),games=[],seen=new Set();
  for(const date of dates){let offset=0,total;
    do{const params={league:'NBA',season:2027,date,timezone:'America/New_York',limit:100,offset};
      const result=await request('/matches',params,body=>{
        parseMatches(body,offset);
        check(new Set(body.data.map(g=>g.id)).size===body.data.length,'Duplicate match');
        for(const raw of body.data){const game=normalizeMatch(raw,new Map());check(localMatchDay(game)===date,'Match outside requested local date');}
      },{date});
      check(total===undefined||total===result.pagination.totalCount,'Schedule changed during pagination');total=result.pagination.totalCount;
      for(const raw of result.data){check(!seen.has(raw.id),'Duplicate match');seen.add(raw.id);const g=normalizeMatch(raw,map);
        check(localMatchDay(g)===date,'Match outside requested local date');games.push(g);}
      offset+=result.data.length;
    }while(offset<total);
  }
  const lines=[],registry=new Map(identities.players.map(p=>[p.providerId,{...p,playerKey:`highlightly:${p.providerId}`} ]));
  for(const game of games.filter(g=>g.status==='finished'&&g.type!=='unknown')){
    const body=await request(`/box-score/${game.id}`,{},body=>parseBoxScore(body,game),{date:localMatchDay(game),game});
    const rawLines=parseBoxScore(body,game);
    const participationReference=checkOfficialParticipation(rawLines,game,now),officialReference=checkOfficialReference(body,game,identities,now);
    if(participationReference||officialReference&&officialReference.status!=='verified'){
      game.statsState='missing';game.refreshIssue={code:'source-data-error',sourceErrorCode:participationReference?(participationReference.reviewKind==='documented-roster-event'?'official-participation-review':'official-participation-conflict'):`official-reference-${officialReference.status}`,attemptedAt:now,preservedPreviousBoxScore:false,...(participationReference?{participationReference}:{officialReference})};continue;
    }
    for(const person of providerPlayers(body,game,[...registry.values()],now))registry.set(person.providerId,person);
    lines.push(...normalizeBoxScore(body,game,[...registry.values()],now));game.statsState='available';await onGame(game.id);
  }
  const used=new Set(lines.map(l=>l.providerId));
  return validateSeason({...emptySeason(),schemaVersion:2,provider:PROVIDER,publicationPolicy:'private-only-rights-unverified',minutesPrecision:'rounded-whole-minute',scope:{startDate,endDate,timeZone:'America/New_York',completeSeason:false},connection:'connected',updatedAt:now,coverageCheckedAt:now,players:[...registry.values()].filter(p=>used.has(p.providerId)),games,lines},knownIds);
}

export const localMatchDay=game=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(game.start));
