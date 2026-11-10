// Server/local only. Never import this module into the public application.
import {COUNTERS, SEASON, emptySeason, validateIdentityMap, validateSeason} from '../assets/core.mjs';
import {classifications} from './provider.mjs';
export const PROVIDER='Highlightly';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const id=n=>Number.isSafeInteger(n)&&n>0;
const count=n=>Number.isSafeInteger(n)&&n>=0;
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
export function normalizeBoxScore(body,game,players,now){
  check(Array.isArray(body)&&body.length===2,'Expected two box-score teams');
  const teamIds=new Set(),playerIds=new Set(),lines=[];
  for(const team of body){
    check([game.home.id,game.away.id].includes(team.team?.id)&&!teamIds.has(team.team.id)&&Array.isArray(team.boxScores)&&team.boxScores.length>0,'Invalid or duplicate box-score team');teamIds.add(team.team.id);
    for(const raw of team.boxScores){
      check(id(raw.player?.id)&&!playerIds.has(raw.player.id),'Invalid or duplicate player');playerIds.add(raw.player.id);
      const person=players.find(p=>p.providerId===raw.player.id);
      check(person,'Unmapped Highlightly player ID; verified NBA identity required');
      check(Array.isArray(raw.statistics),'Missing statistics array');
      const values=new Map();
      for(const s of raw.statistics){check(typeof s.name==='string'&&!values.has(s.name),'Duplicate statistic');values.set(s.name,s.value);}
      let stats=null,seconds=null,participation='missing';
      if(values.size){
        stats=Object.fromEntries(COUNTERS.map(k=>[k,values.get(statisticNames[k])]));
        const minutes=values.get('Total Minutes Played'),off=values.get('Total Offensive Rebounds'),def=values.get('Total Defensive Rebounds');
        check(COUNTERS.every(k=>count(stats[k]))&&count(minutes)&&count(off)&&count(def),'Missing or invalid raw counter');
        check(stats.reb===off+def,'Rebounds do not reconcile');
        check(stats.fgm<=stats.fga&&stats.fg3m<=stats.fg3a&&stats.fg3m<=stats.fgm&&stats.fg3a<=stats.fga&&stats.ftm<=stats.fta&&stats.fgm-stats.fg3m<=stats.fga-stats.fg3a,'Invalid shooting counters');
        check(stats.pts===2*stats.fgm+stats.fg3m+stats.ftm,'Points do not reconcile');
        if(minutes>0||COUNTERS.some(k=>stats[k]>0)){participation='played';seconds=minutes*60;}else stats=null;
      }
      lines.push({gameId:game.id,nbaId:person.nbaId,providerId:person.providerId,teamId:team.team.id,participation,seconds,minutesPrecision:'rounded-whole-minute',stats,comment:null,updatedAt:now,provider:PROVIDER});
    }
    const total=lines.filter(l=>l.teamId===team.team.id).reduce((n,l)=>n+(l.stats?.pts||0),0);
    check(total===game.finalScores[team.team.id===game.home.id?0:1],'Box-score points do not reconcile with final score');
  }
  return lines;
}
export function makeHighlightlyClient({key,fetcher=fetch,maxRequests=20,dailyLimit=90,intervalMs=6100,ledger,saveLedger,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=()=>Date.now()}){
  check(typeof key==='string'&&key.length>0,'HIGHLIGHTLY_API_KEY is absent. No connection attempted.');
  check(id(maxRequests)&&maxRequests<=100&&id(dailyLimit)&&dailyLimit<=100&&Number.isFinite(intervalMs)&&intervalMs>=6100,'Invalid request limits');
  check(ledger?.provider===PROVIDER&&Array.isArray(ledger.requests)&&ledger.requests.every(t=>Number.isSafeInteger(t)&&t>=0)&&typeof saveLedger==='function','Invalid quota ledger');
  let used=0,last=null,busy=false,remaining=Infinity;
  return async(endpoint,params={})=>{
    check(!busy,'Concurrent requests are prohibited');busy=true;
    try{
      check(endpoint==='/matches'||/^\/box-score\/[1-9]\d*$/.test(endpoint),'Unsupported Highlightly endpoint');
      if(endpoint==='/matches'){
        check(Object.keys(params).sort().join(',')==='date,league,limit,offset,season,timezone'&&params.league==='NBA'&&params.season===2027&&params.timezone==='America/New_York'&&params.limit===100&&count(params.offset),'Invalid matches parameters');datesInRange(params.date,params.date);
      }else check(Object.keys(params).length===0,'Box-score parameters are prohibited');
      if(last!==null)await sleep(Math.max(0,intervalMs-(now()-last)));
      ledger.requests=ledger.requests.filter(t=>t>now()-86400000);
      check(used<maxRequests&&ledger.requests.length<dailyLimit&&remaining>0,'Highlightly request budget reached');
      ledger.requests.push(now());used++;await saveLedger(ledger);last=now();
      const url=new URL(endpoint,'https://nba.highlightly.net');for(const [k,v]of Object.entries(params))url.searchParams.set(k,String(v));
      let response;try{response=await fetcher(url,{headers:{'x-rapidapi-key':key},redirect:'error',signal:AbortSignal.timeout(25000)});}catch{throw new Error('Highlightly network/timeout failure; no automatic retry');}
      for(const name of ['x-ratelimit-requests-limit','x-ratelimit-requests-remaining']){
        const value=response.headers?.get(name);
        if(value!==null&&value!==undefined){
          if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))){remaining=0;throw new Error('Invalid Highlightly quota header');}
          if(name.endsWith('-remaining'))remaining=Number(value);
          else if(Number(value)===0)remaining=0;
        }
      }
      // Persist server-account consumption conservatively, including calls by other clients.
      if(Number.isFinite(remaining)){
        const limitValue=response.headers?.get('x-ratelimit-requests-limit');
        const limit=limitValue==null?100:Number(limitValue);
        if(remaining>limit){remaining=0;throw new Error('Inconsistent Highlightly quota headers');}
        const consumed=Math.max(0,Math.min(100,limit)-remaining);
        while(ledger.requests.length<consumed)ledger.requests.push(now());
        await saveLedger(ledger);
      }
      check(response.ok,'Highlightly HTTP request failed; no automatic retry');
      let body;try{body=await response.json();}catch{throw new Error('Invalid Highlightly JSON');}
      return endpoint==='/matches'?parseMatches(body,params.offset):body;
    }finally{busy=false;}
  };
}
export async function collectHighlightly({client,identities,types,startDate,endDate,now=new Date().toISOString(),knownIds=[]}){
  check(identities?.provider===PROVIDER&&types?.provider===PROVIDER,'Explicit Highlightly mapping namespace required');validateIdentityMap(identities);const map=classifications(types);
  const dates=datesInRange(startDate,endDate),games=[],seen=new Set();
  for(const date of dates){let offset=0,total;
    do{const result=parseMatches(await client('/matches',{league:'NBA',season:2027,date,timezone:'America/New_York',limit:100,offset}),offset);
      check(total===undefined||total===result.pagination.totalCount,'Schedule changed during pagination');total=result.pagination.totalCount;
      for(const raw of result.data){check(!seen.has(raw.id),'Duplicate match');seen.add(raw.id);const g=normalizeMatch(raw,map);
        const localDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(g.start));check(localDay===date,'Match outside requested local date');games.push(g);}
      offset+=result.data.length;
    }while(offset<total);
  }
  const lines=[];
  for(const game of games.filter(g=>g.status==='finished'&&g.type!=='unknown')){lines.push(...normalizeBoxScore(await client(`/box-score/${game.id}`),game,identities.players,now));game.statsState='available';}
  const used=new Set(lines.map(l=>l.nbaId));
  return validateSeason({...emptySeason(),provider:PROVIDER,publicationPolicy:'private-only-rights-unverified',minutesPrecision:'rounded-whole-minute',scope:{startDate,endDate,timeZone:'America/New_York',completeSeason:false},connection:'connected',updatedAt:now,coverageCheckedAt:now,players:identities.players.filter(p=>used.has(p.nbaId)),games,lines},knownIds);
}
