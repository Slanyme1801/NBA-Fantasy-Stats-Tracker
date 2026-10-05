import {COUNTERS,SEASON,GAME_TYPES,replaceGameLines,validateIdentityMap,validateSeason} from '../assets/core.mjs';
const fields={pts:'points',fg3m:'tpm',fgm:'fgm',fga:'fga',ftm:'ftm',fta:'fta',reb:'totReb',ast:'assists',stl:'steals',blk:'blocks',tov:'turnovers',fg3a:'tpa'};
const statusNames={1:'scheduled',2:'live',3:'finished',4:'postponed',5:'delayed',6:'canceled'};
export function envelope(body) {
  if(!body || (body.errors && Object.keys(body.errors).length)) throw new Error('Provider returned an API error; no data published');
  if(!Array.isArray(body.response) || body.results!==body.response.length) throw new Error('Invalid provider response envelope');
  return body.response;
}
export function parseSeconds(value) {
  if(value===null || value===undefined || value==='') return null;
  if(typeof value==='number' && Number.isFinite(value) && value>=0) return Math.round(value*60);
  if(/^\d+(?::[0-5]\d)?$/.test(String(value))) {
    const [m,s='0']=String(value).split(':'); return Number(m)*60+Number(s);
  }
  return null;
}
function count(value) {
  if(value===null || value===undefined || value==='') return null;
  const number=typeof value==='number' ? value : /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(number) && number>=0 ? number : null;
}
export function normalizeLine(raw,game,map,now) {
  const person=map.find(p=>p.providerId===raw.player?.id);
  if(!person) throw new Error(`Unmapped provider player ID ${raw.player?.id ?? 'missing'}; add a verified identity mapping`);
  if(raw.game?.id!==game.id) throw new Error('Provider returned a different game');
  const seconds=parseSeconds(raw.min), stats=Object.fromEntries(COUNTERS.map(k=>[k,count(raw[fields[k]])]));
  const complete=COUNTERS.every(k=>stats[k]!==null);
  const comment=typeof raw.comment==='string' ? raw.comment : null;
  const positive=COUNTERS.some(k=>stats[k]>0);
  const explicitDnp=/\bDNP\b|did not play|did not dress|inactive|not with team/i.test(comment||'');
  const participation=complete && seconds!==null && (seconds>0 || positive) ? 'played' : explicitDnp && !positive && !(seconds>0) ? 'dnp' : 'missing';
  return {gameId:game.id,nbaId:person.nbaId,providerId:person.providerId,teamId:raw.team?.id,participation,seconds:participation==='played'?seconds:null,stats:participation==='played'?stats:null,comment,updatedAt:now};
}
export function classifications(document) {
  if(document?.season!==SEASON || !Array.isArray(document.games)) throw new Error('Invalid game classifications');
  const result=new Map();
  for(const g of document.games) {
    if(!Number.isSafeInteger(g.id)||g.id<=0||result.has(g.id)||!GAME_TYPES.includes(g.type)||g.type==='unknown'||typeof g.source!=='string'||!g.source.trim()||!Number.isFinite(Date.parse(g.verifiedAt))) throw new Error('Each game classification requires a unique ID, type, source and verification date');
    result.set(g.id,g);
  }
  return result;
}
export function normalizeGame(raw,types,old) {
  if(raw.season!==2026 || raw.league!=='standard') throw new Error('Provider returned a different season or league');
  const classification=types.get(raw.id);
  if(!statusNames[raw.status?.short]) throw new Error('Unknown provider game status');
  return {id:raw.id,season:SEASON,league:'standard',start:new Date(raw.date?.start).toISOString(),stage:raw.stage??null,
    status:statusNames[raw.status.short],type:classification?.type||'unknown',classification:classification?{source:classification.source,verifiedAt:classification.verifiedAt}:null,
    home:{id:raw.teams?.home?.id,code:raw.teams?.home?.code||raw.teams?.home?.name},away:{id:raw.teams?.visitors?.id,code:raw.teams?.visitors?.code||raw.teams?.visitors?.name},statsState:old?.statsState||'not-fetched'};
}
export async function collectSeason({client,previous,identities,types,correctionDays=7,now=new Date().toISOString(),knownIds=[]}) {
  validateIdentityMap(identities);
  const classificationMap=classifications(types);
  const leagues=await client('/leagues'),seasons=await client('/seasons');
  if(!leagues.includes('standard')||!seasons.includes(2026)) throw new Error('API-NBA 2026 standard scope is not available');
  const schedule=await client('/games',{league:'standard',season:2026});
  // A suddenly empty schedule must never erase an existing valid snapshot.
  if(!schedule.length && previous.games.length) throw new Error('Unexpected empty schedule; previous snapshot retained');
  const old=new Map(previous.games.map(g=>[g.id,g]));
  const games=schedule.map(g=>normalizeGame(g,classificationMap,old.get(g.id)));
  if(new Set(games.map(g=>g.id)).size!==games.length) throw new Error('Duplicate game in provider schedule');
  const ids=new Set(games.map(g=>g.id));
  let lines=previous.lines.filter(r=>ids.has(r.gameId));
  const cutoff=new Date(now);cutoff.setUTCDate(cutoff.getUTCDate()-correctionDays);cutoff.setUTCHours(0,0,0,0);
  for(const game of games.filter(g=>g.status==='finished' && g.type!=='unknown' && (g.statsState!=='available'||new Date(g.start)>=cutoff))) {
    const raw=await client('/players/statistics',{game:game.id});
    if(!raw.length && lines.some(r=>r.gameId===game.id)) throw new Error(`Unexpected empty correction for game ${game.id}; previous snapshot retained`);
    const incoming=raw.map(r=>normalizeLine(r,game,identities.players,now));
    lines=replaceGameLines(lines,game.id,incoming);
    game.statsState=raw.length?'available':'missing';
  }
  const used=new Set(lines.map(r=>r.nbaId));
  const players=identities.players.filter(p=>used.has(p.nbaId));
  const result={...previous,schemaVersion:1,season:SEASON,provider:'API-NBA / API-Sports',connection:'connected',updatedAt:now,coverageCheckedAt:now,players,games,lines};
  return validateSeason(result,knownIds);
}

export function makeClient({key,fetcher=fetch,intervalMs=6100,maxRequests=90,dailyLimit=100,ledger,saveLedger=async()=>{},sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=()=>Date.now()}) {
  if(!key) throw new Error('API_SPORTS_KEY is absent. No connection attempted.');
  if(ledger.requests!==undefined && (!Number.isSafeInteger(ledger.requests)||ledger.requests<0)) throw new Error('Invalid local quota ledger; review before collection');
  let lastRequest=null,runCount=0,dailyRemaining=Infinity,minuteRemaining=Infinity;
  return async (endpoint,params={})=>{
    if(!['/leagues','/seasons','/games','/players/statistics'].includes(endpoint)) throw new Error('Unsupported endpoint');
    for(let attempt=0;attempt<3;attempt++) {
      const day=new Date(now()).toISOString().slice(0,10);
      if(ledger.day!==day){ledger.day=day;ledger.requests=0;}
      if(runCount>=maxRequests||ledger.requests>=dailyLimit||dailyRemaining<=0) throw new Error('Request budget reached; candidate not published');
      if(lastRequest!==null) await sleep(Math.max(0,(minuteRemaining<=0?61000:intervalMs)-(now()-lastRequest)));
      ledger.requests++;runCount++;await saveLedger(ledger);lastRequest=now();
      const url=new URL(endpoint,'https://v2.nba.api-sports.io');
      for(const [k,v] of Object.entries(params)) url.searchParams.set(k,String(v));
      let response;
      try {response=await fetcher(url,{headers:{'x-apisports-key':key},signal:AbortSignal.timeout(25000)});}
      catch {if(attempt<2){await sleep(1500*(attempt+1));continue;}throw new Error('API-NBA network/timeout failure; previous data retained');}
      const headerNumber=name=>response.headers.get(name)===null?Infinity:Number(response.headers.get(name));
      dailyRemaining=headerNumber('x-ratelimit-requests-remaining');minuteRemaining=headerNumber('x-ratelimit-remaining');
      if((response.status===429||response.status>=500)&&attempt<2){await sleep(response.status===429?61000:2000*(attempt+1));continue;}
      if(!response.ok) throw new Error(`API-NBA HTTP ${response.status}; previous data retained`);
      return envelope(await response.json());
    }
  };
}
