import {SEASON,GAME_TYPES} from '../assets/core.mjs';
const requireValue=(ok,message)=>{if(!ok)throw new Error(message);};
const id=n=>Number.isSafeInteger(n)&&n>0;
const provenance=x=>typeof x.source==='string'&&x.source.trim()&&typeof x.verifiedAt==='string'&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(x.verifiedAt)&&Number.isFinite(Date.parse(x.verifiedAt));
export function easternMatchTime(start){
  requireValue(typeof start==='string'&&Number.isFinite(Date.parse(start)),'Invalid match time');
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(start)).map(p=>[p.type,p.value]));
  return {dateET:`${parts.year}-${parts.month}-${parts.day}`,timeET:`${parts.hour}:${parts.minute}`};
}
export function verifiedSchedule(document){
  requireValue(document?.season===SEASON&&(document.teams===undefined||Array.isArray(document.teams))&&Array.isArray(document.games),'Explicit verified schedule and team map required');
  const teams=new Map(),codes=new Set(),games=new Map();
  for(const t of document.teams||[]){requireValue(id(t.providerId)&&!teams.has(t.providerId)&&typeof t.code==='string'&&/^[A-Z0-9]{2,8}$/.test(t.code)&&!codes.has(t.code)&&provenance(t),'Team map requires unique provider ID/code and provenance');teams.set(t.providerId,t.code);codes.add(t.code);}
  for(const supplied of document.games){
    const g={...supplied,source:supplied.source||(supplied.primarySource?.url?supplied.primarySource.url+(supplied.playedVerification?.verified===true?`; ${supplied.playedVerification.source}`:''):undefined),verifiedAt:supplied.verifiedAt||document.verifiedAt||document.preparedAt};
    requireValue(/^\d{4}-\d{2}-\d{2}$/.test(g.dateET)&&Number.isFinite(Date.parse(g.dateET))&&new Date(g.dateET).toISOString().slice(0,10)===g.dateET&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(g.timeET)&&(document.teams?codes.has(g.home)&&codes.has(g.away):/^[A-Z0-9]{2,8}$/.test(g.home)&&/^[A-Z0-9]{2,8}$/.test(g.away))&&g.home!==g.away&&GAME_TYPES.includes(g.type??'regular')&&g.type!=='unknown'&&provenance(g),'Each schedule row needs exact ET date/time, mapped teams, type and provenance');
    const key=[g.dateET,g.timeET,g.away,g.home].join('|');requireValue(!games.has(key),'Duplicate schedule evidence');games.set(key,g);
  }
  return raw=>{
    const home=document.teams?teams.get(raw.homeTeam?.id):raw.homeTeam?.abbreviation,away=document.teams?teams.get(raw.awayTeam?.id):raw.awayTeam?.abbreviation;if(!home||!away)return null;
    requireValue(id(raw.homeTeam?.id)&&id(raw.awayTeam?.id),'Invalid observed provider teams');
    if(!document.teams)for(const t of [raw.homeTeam,raw.awayTeam]){requireValue(!teams.has(t.id)||teams.get(t.id)===t.abbreviation,'Provider team code changed');teams.set(t.id,t.abbreviation);}
    const {dateET,timeET}=easternMatchTime(raw.date),row=games.get([dateET,timeET,away,home].join('|'));
    return row?{id:raw.id,type:row.type??'regular',source:row.source,verifiedAt:row.verifiedAt}:null;
  };
}
